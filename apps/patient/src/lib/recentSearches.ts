import { useCallback, useSyncExternalStore } from 'react';

/**
 * Recent searches — PT-09-03.
 *
 * *** THESE NEVER LEAVE THE DEVICE, AND THAT IS THE POINT. *** FR-5.11 keeps
 * recent searches on the device, and the backend deliberately has no endpoint
 * that returns them: an endpoint that did would mean the server had been keeping
 * them after all. `POST /v1/search` is a POST for the same reason — so what
 * somebody typed about their mental health does not land in access logs.
 *
 * So this store:
 *
 * - lives in memory only, and is gone when the process ends;
 * - is cleared on sign-out, so one patient's searches never reach the next;
 * - is clearable by the user, which PT-09-03 requires explicitly;
 * - drops anything that came back as a crisis, because re-surfacing "i want to
 *   die" as a tappable chip on the home screen would be a cruel thing to build.
 */

const MAX_RECENT = 6;

let recent: string[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((fn) => fn());

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const getRecentSearches = (): readonly string[] => recent;

/**
 * Records a search.
 *
 * `wasCrisis` is passed by the caller from the search RESPONSE, not judged
 * here — the app runs no crisis word list of its own.
 */
export const rememberSearch = (query: string, wasCrisis: boolean): void => {
  const trimmed = query.trim();
  if (!trimmed || wasCrisis) return;
  const next = [trimmed, ...recent.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())];
  recent = next.slice(0, MAX_RECENT);
  emit();
};

export const clearRecentSearches = (): void => {
  recent = [];
  emit();
};

/** Subscribes a screen to the list. */
export const useRecentSearches = (): {
  recent: readonly string[];
  clear: () => void;
} => {
  const value = useSyncExternalStore(subscribe, getRecentSearches, getRecentSearches);
  return { recent: value, clear: useCallback(() => clearRecentSearches(), []) };
};
