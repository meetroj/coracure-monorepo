import { useCallback, useEffect, useRef, useState } from 'react';

import { SKELETON_DELAY_MS, SKELETON_MIN_MS, STALE_AFTER_MS } from '../theme/skeleton';

/**
 * The loading contract every data-driven section uses.
 *
 * It exists because a skeleton is only half the problem — the other half is
 * deciding *when* one is honest. The rules encoded here:
 *
 *  - A fast response never flashes a skeleton (nothing shows before
 *    SKELETON_DELAY_MS).
 *  - A skeleton that does appear stays long enough to be read, never a blink
 *    (SKELETON_MIN_MS).
 *  - Cached data renders immediately and refreshes behind itself. The old
 *    content stays on screen; only a small refresh flag is raised.
 *  - Two components asking for the same key at once make one request.
 *  - An error clears the skeleton at once and offers `retry`, rather than
 *    leaving a placeholder that will never fill.
 */

type Entry<T> = { data: T; at: number };

const cache = new Map<string, Entry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

/** Test seam — drop everything between cases. */
export const __resetResourceCache = () => {
  cache.clear();
  inFlight.clear();
};

/** Prime the cache, e.g. from a list response before a detail screen opens. */
export const seedResource = <T,>(key: string, data: T) => {
  cache.set(key, { data, at: Date.now() });
};

/** One request per key, however many callers ask for it. */
const load = <T,>(key: string, fetcher: () => Promise<T>): Promise<T> => {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const p = fetcher()
    .then((data) => {
      cache.set(key, { data, at: Date.now() });
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, p);
  return p;
};

export type Resource<T> = {
  data: T | undefined;
  error: Error | undefined;
  /** Render the skeleton. Already gated by the delay and minimum rules. */
  showSkeleton: boolean;
  /** Data is on screen and a background refresh is running. */
  isRefreshing: boolean;
  /** Pull-to-refresh or a manual refresh control. Keeps current data visible. */
  refresh: () => void;
  /** After an error. Clears the error and loads again. */
  retry: () => void;
};

export const useResource = <T,>(
  key: string,
  fetcher: () => Promise<T>,
  options: { enabled?: boolean; staleAfter?: number } = {}
): Resource<T> => {
  const { enabled = true, staleAfter = STALE_AFTER_MS } = options;

  const cached = cache.get(key) as Entry<T> | undefined;
  const [data, setData] = useState<T | undefined>(cached?.data);
  const [error, setError] = useState<Error | undefined>();
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nonce, setNonce] = useState(0);

  // Latest fetcher without making it a dependency — an inline arrow would
  // otherwise restart the effect on every render.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // What is on screen right now. A refresh deletes the cache entry, so the
  // cache alone cannot answer "do we already have something to show?".
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!enabled) return;

    let alive = true;
    let delay: ReturnType<typeof setTimeout> | undefined;
    let shownAt = 0;

    const entry = cache.get(key) as Entry<T> | undefined;
    const fresh = entry !== undefined && Date.now() - entry.at < staleAfter;

    if (entry) {
      setData(entry.data);
      setError(undefined);
      // Cached content renders now; only go to the network if it has aged out.
      if (fresh && nonce === 0) return;
      setIsRefreshing(true);
    }

    // A skeleton is only ever correct when there is nothing to show. With data
    // already on screen — cached, or held through a refresh — it would cover
    // real content, so the timer is never armed.
    const canSkeleton = entry === undefined && dataRef.current === undefined;
    if (canSkeleton) {
      delay = setTimeout(() => {
        if (!alive) return;
        shownAt = Date.now();
        setShowSkeleton(true);
      }, SKELETON_DELAY_MS);
    }

    /** Stop the pending skeleton: the request is no longer outstanding. */
    const disarm = () => {
      if (delay) clearTimeout(delay);
      delay = undefined;
    };

    const settle = (apply: () => void) => {
      if (!alive) return;
      // If the response beat the delay the timer is still pending — cancel it,
      // or it will raise a skeleton over content that has already arrived.
      disarm();
      const wait = shownAt ? Math.max(0, SKELETON_MIN_MS - (Date.now() - shownAt)) : 0;
      if (wait === 0) {
        apply();
        return;
      }
      setTimeout(() => alive && apply(), wait);
    };

    load(key, fetcherRef.current)
      .then((next) =>
        settle(() => {
          setData(next);
          setError(undefined);
          setShowSkeleton(false);
          setIsRefreshing(false);
        })
      )
      .catch((e: Error) => {
        if (!alive) return;
        // An error removes the placeholder immediately — holding a skeleton
        // that will never fill is worse than showing the failure.
        disarm();
        setShowSkeleton(false);
        setIsRefreshing(false);
        setError(e instanceof Error ? e : new Error(String(e)));
      });

    return () => {
      alive = false;
      disarm();
    };
  }, [key, enabled, staleAfter, nonce]);

  const refresh = useCallback(() => {
    cache.delete(key);
    // Keep `data` in place: a refresh must not blank the screen.
    setIsRefreshing(true);
    setNonce((n) => n + 1);
  }, [key]);

  const retry = useCallback(() => {
    cache.delete(key);
    setError(undefined);
    setNonce((n) => n + 1);
  }, [key]);

  return { data, error, showSkeleton, isRefreshing, refresh, retry };
};
