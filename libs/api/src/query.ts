import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { ApiError } from './errors';

/**
 * A small typed query cache.
 *
 * The workspace had no data-fetching library and no state manager. Rather than
 * introduce one for what these screens actually need — a cache keyed by
 * endpoint, deduped concurrent fetches, the four render states, and
 * invalidation after a write — that much is implemented here in one file with
 * no dependencies. If the app later grows server-state needs this cannot serve
 * (pagination cursors everywhere, optimistic rollback, offline mutation
 * queues), swap it for TanStack Query behind the same hook signatures.
 *
 * What it deliberately does NOT do: retry on its own schedule, poll in the
 * background, or persist to disk. Clinical data should not be sitting in a
 * cache the user cannot see the age of.
 */

type Entry<T = unknown> = {
  data?: T;
  error?: unknown;
  /** Epoch ms of the last successful fetch. 0 means never. */
  updatedAt: number;
  /** The in-flight fetch, so N components asking at once make one request. */
  promise?: Promise<T>;
  fetching: boolean;
};

/**
 * *** EVERY ENTRY IS REPLACED, NEVER MUTATED. ***
 *
 * `useQuery` reads this through `useSyncExternalStore`, which compares
 * successive snapshots with `Object.is`. Mutating an entry in place leaves the
 * snapshot identity unchanged, so React concludes nothing happened and skips
 * the re-render — the fetch resolves, the data lands in the cache, and the
 * screen sits on its skeleton forever.
 *
 * So `setEntry` below is the ONLY way an entry changes, and it always writes a
 * fresh object.
 */
const cache = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

export type QueryKey = readonly (string | number | boolean | null | undefined)[];

export const keyOf = (key: QueryKey): string => key.filter((k) => k !== undefined).join('|');

const notify = (k: string) => listeners.get(k)?.forEach((fn) => fn());

const subscribe = (k: string, fn: () => void): (() => void) => {
  let set = listeners.get(k);
  if (!set) {
    set = new Set();
    listeners.set(k, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) listeners.delete(k);
  };
};

const entryOf = <T>(k: string): Entry<T> => {
  let e = cache.get(k) as Entry<T> | undefined;
  if (!e) {
    e = { updatedAt: 0, fetching: false };
    cache.set(k, e as Entry);
  }
  return e;
};

/** Writes a NEW entry object and notifies. See the note on `cache`. */
const setEntry = <T>(k: string, patch: Partial<Entry<T>>, silent = false): Entry<T> => {
  const next = { ...entryOf<T>(k), ...patch };
  cache.set(k, next as Entry);
  if (!silent) notify(k);
  return next;
};

/** Runs the fetch, deduping concurrent callers on the same key. */
const runFetch = <T>(k: string, fn: () => Promise<T>): Promise<T> => {
  const existing = entryOf<T>(k);
  if (existing.promise) return existing.promise;

  const promise = fn()
    .then((data) => {
      setEntry<T>(k, {
        data,
        error: undefined,
        updatedAt: Date.now(),
        promise: undefined,
        fetching: false,
      });
      return data;
    })
    .catch((error: unknown) => {
      setEntry<T>(k, { error, promise: undefined, fetching: false });
      throw error;
    });

  // The in-flight promise is recorded WITHOUT notifying separately, so a
  // subscriber sees one update for "started" rather than two.
  setEntry<T>(k, { fetching: true, promise });
  return promise;
};

/**
 * Drops cached data so the next render refetches.
 *
 * A prefix match, so `invalidate(['consultations'])` clears
 * `consultations|upcoming` and `consultations|past` together — a cancellation
 * invalidates both lists and the caller should not have to know the key shape.
 */
export const invalidate = (prefix: QueryKey): void => {
  const p = keyOf(prefix);
  for (const k of Array.from(cache.keys())) {
    if (k === p || k.startsWith(`${p}|`)) {
      setEntry(k, { updatedAt: 0 });
    }
  }
};

/** Wipes everything. Called on sign-out so no patient data outlives the session. */
export const clearQueryCache = (): void => {
  const keys = Array.from(cache.keys());
  cache.clear();
  keys.forEach(notify);
};

export type QueryResult<T> = {
  data: T | undefined;
  error: ApiError | null;
  /** No data yet AND a fetch is running — the skeleton state. */
  isLoading: boolean;
  /** A fetch is running, with or without data — the pull-to-refresh state. */
  isFetching: boolean;
  /** Settled with data. */
  isSuccess: boolean;
  isError: boolean;
  refetch: () => Promise<T | undefined>;
};

/**
 * Reads an endpoint.
 *
 * `staleTime` is how long a cached value is served without a refetch. It
 * defaults to 30s: long enough that moving between tabs does not re-hit the
 * API, short enough that a booking made on another device shows up quickly.
 */
export const useQuery = <T>(
  key: QueryKey,
  fn: () => Promise<T>,
  options: { enabled?: boolean; staleTime?: number } = {},
): QueryResult<T> => {
  const { enabled = true, staleTime = 30_000 } = options;
  const k = keyOf(key);

  // The fetcher usually closes over props and changes identity every render;
  // keeping it in a ref stops that from re-triggering the effect.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const entry = useSyncExternalStore(
    useCallback((cb) => subscribe(k, cb), [k]),
    useCallback(() => cache.get(k) as Entry<T> | undefined, [k]),
    useCallback(() => cache.get(k) as Entry<T> | undefined, [k]),
  );

  useEffect(() => {
    if (!enabled) return;
    const current = entryOf<T>(k);
    const fresh = current.updatedAt > 0 && Date.now() - current.updatedAt < staleTime;
    if (fresh || current.promise) return;
    // A rejected fetch is not retried automatically — the UI offers a retry.
    if (current.error && current.updatedAt === 0 && !current.fetching) {
      if (current.data !== undefined) return;
    }
    runFetch(k, fnRef.current).catch(() => undefined);
  }, [k, enabled, staleTime]);

  const refetch = useCallback(async () => {
    // Marked stale so a concurrent render does not decide it is fresh and skip.
    setEntry<T>(k, { updatedAt: 0 }, true);
    try {
      return await runFetch(k, fnRef.current);
    } catch {
      return undefined;
    }
  }, [k]);

  const data = entry?.data;
  const rawError = entry?.error;
  const error = ApiError.of(rawError);
  const isFetching = !!entry?.fetching;

  return {
    data,
    // A non-ApiError should never reach a screen, but if one does it must not
    // read as "no error" — wrap it rather than dropping it.
    error: rawError && !error ? new ApiError({ statusCode: 0, code: 'INTERNAL_ERROR', message: String(rawError) }) : error,
    isLoading: data === undefined && (isFetching || (!rawError && enabled)),
    isFetching,
    isSuccess: data !== undefined,
    isError: rawError !== undefined && data === undefined,
    refetch,
  };
};

export type MutationResult<TArgs, TData> = {
  mutate: (args: TArgs) => Promise<TData>;
  isPending: boolean;
  error: ApiError | null;
  reset: () => void;
};

/**
 * Writes.
 *
 * `mutate` resolves or rejects so a screen can `await` it and decide what to do
 * next — navigate, show a code-specific branch, or leave the form open. It does
 * not swallow the error, because the codes are the whole point: a booking
 * refused with `CONSENT_REQUIRED` routes into consent, not into a toast.
 */
export const useMutation = <TArgs, TData>(
  fn: (args: TArgs) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, args: TArgs) => void | Promise<void>;
    /** Query key prefixes to invalidate on success. */
    invalidates?: QueryKey[];
  } = {},
): MutationResult<TArgs, TData> => {
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fnRef = useRef(fn);
  fnRef.current = fn;

  const mutate = useCallback(async (args: TArgs) => {
    if (mounted.current) {
      setPending(true);
      setError(null);
    }
    try {
      const data = await fnRef.current(args);
      optionsRef.current.invalidates?.forEach(invalidate);
      await optionsRef.current.onSuccess?.(data, args);
      return data;
    } catch (e) {
      // Setting state after unmount is a no-op warning, not a crash — but the
      // rethrow still has to happen so the caller's `catch` runs.
      if (mounted.current) setError(ApiError.of(e));
      throw e;
    } finally {
      if (mounted.current) setPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    if (mounted.current) setError(null);
  }, []);

  return { mutate, isPending, error, reset };
};
