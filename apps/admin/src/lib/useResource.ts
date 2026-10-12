import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@coracure/api/errors';

import { request } from '../api/http';

/**
 * The one screen-data lifecycle: mount → fetch → loading → success/error →
 * mutate → refetch (§72). Every list and detail screen uses it, so no screen
 * re-implements loading flags, abort handling or retry.
 */

export type ResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  /** True only on the first load, so a refetch does not blank the screen. */
  initial: boolean;
  /**
   * True while `data` still belongs to the PREVIOUS key (a filter or an id
   * changed) and the new one is loading. A reload or a poll is not stale: the
   * same data is simply being refreshed.
   */
  stale: boolean;
  reload: () => void;
  /** Applies a local edit after a mutation, avoiding a full round trip. */
  setData: (next: T | null) => void;
};

/**
 * @param fetcher Must be stable or memoised - it is the effect's dependency.
 * @param deps    Anything the fetcher closes over (filters, ids, page).
 * @param enabled Skips the fetch entirely, for a tab that is not open yet.
 * @param resetOn The subset of `deps` that names WHICH data this is (a filter,
 *                an id). When one changes, the data on screen is another key's
 *                and `stale` is set, so a screen can show a body skeleton
 *                instead of a stale list. Defaults to every dep. Leave a paging
 *                dep (`limit`) out, so "show more" keeps the rows it has.
 */
export function useResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[] = [],
  enabled = true,
  resetOn: readonly unknown[] = deps,
): ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<ApiError | null>(null);
  const [initial, setInitial] = useState(true);
  const [stale, setStale] = useState(false);
  const [nonce, setNonce] = useState(0);
  const key = useRef(resetOn);
  // A ref as well as state: a reload that lands mid-switch must not forget it.
  const staleRef = useRef(false);

  // Held in a ref so changing the fetcher identity does not retrigger the
  // effect - `deps` is what declares a real change.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let live = true;

    const switched =
      key.current.length !== resetOn.length || key.current.some((v, i) => !Object.is(v, resetOn[i]));
    key.current = resetOn;
    if (switched && !staleRef.current) {
      staleRef.current = true;
      setStale(true);
    }

    setLoading(true);
    setError(null);

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        // A screen the admin has already navigated away from must not set
        // state, and a superseded fetch must not overwrite a newer one.
        if (!live) return;
        setData(result);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!live || controller.signal.aborted) return;
        // Another key's rows under this key's error would mislead: drop them.
        if (staleRef.current) setData(null);
        setError(
          ApiError.of(e) ??
            new ApiError({
              statusCode: 0,
              code: 'INTERNAL_ERROR',
              message: 'Something went wrong.',
            }),
        );
      })
      .finally(() => {
        if (!live) return;
        staleRef.current = false;
        setStale(false);
        setLoading(false);
        setInitial(false);
      });

    return () => {
      live = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, initial, stale, reload, setData };
}

/** Convenience for the common case: a plain GET with no query building. */
export function useGet<T>(path: string, enabled = true): ResourceState<T> {
  const fetcher = useCallback(() => request<T>(path), [path]);
  return useResource<T>(fetcher, [path], enabled);
}

/**
 * A single mutation with a guaranteed one-at-a-time guard.
 *
 * `busy` is what every submit button disables on, which is how §49's "never
 * allow multiple submissions from repeated clicks" is enforced in one place
 * rather than per form. The promise rejects as well as setting `error`, so a
 * caller can `await` it and still branch.
 */
export function useMutation<Args extends unknown[], R>(
  run: (...args: Args) => Promise<R>,
): {
  mutate: (...args: Args) => Promise<R>;
  busy: boolean;
  error: ApiError | null;
  reset: () => void;
} {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const runRef = useRef(run);
  runRef.current = run;

  const mutate = useCallback(async (...args: Args): Promise<R> => {
    // The click guard. A double-click cannot start a second request.
    if (inFlight.current) {
      throw new ApiError({
        statusCode: 0,
        code: 'CONFLICT',
        message: 'That action is already running.',
      });
    }
    inFlight.current = true;
    if (mounted.current) {
      setBusy(true);
      setError(null);
    }
    try {
      return await runRef.current(...args);
    } catch (e) {
      const api =
        ApiError.of(e) ??
        new ApiError({ statusCode: 0, code: 'INTERNAL_ERROR', message: 'Something went wrong.' });
      if (mounted.current) setError(api);
      throw api;
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);

  return { mutate, busy, error, reset };
}

/**
 * Polls while the tab is visible. Used by the safety-alert queue (§29), which
 * must not need a manual refresh - and must not keep hammering the backend
 * from a tab nobody is looking at.
 */
export function usePoll(reload: () => void, intervalMs: number, enabled = true): void {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer === null) timer = setInterval(() => reloadRef.current(), intervalMs);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}
