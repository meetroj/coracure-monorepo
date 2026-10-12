import { useSyncExternalStore } from 'react';

/**
 * A tiny in-memory store for fixture-backed screens.
 *
 * The panel is a UI build (see `mock/db.ts`): there is no backend to write to,
 * so a screen that adds, edits or toggles a row writes here and every screen
 * reading the same store re-renders. Rows are replaced, never mutated, which
 * is what `useSyncExternalStore` needs to notice a change.
 *
 * ponytail: in-memory, resets on reload. Replace with `request(...)` calls
 * behind the same `all / upsert / patch / remove` shape when the endpoints exist.
 */
export type Store<T extends { id: string }> = {
  all: () => T[];
  get: (id: string) => T | undefined;
  upsert: (row: T) => void;
  patch: (id: string, change: Partial<T>) => void;
  remove: (id: string) => void;
  replace: (rows: T[]) => void;
  subscribe: (fn: () => void) => () => void;
};

export function createStore<T extends { id: string }>(seed: T[]): Store<T> {
  let rows = seed;
  const listeners = new Set<() => void>();
  const set = (next: T[]) => {
    rows = next;
    listeners.forEach((fn) => fn());
  };
  return {
    all: () => rows,
    get: (id) => rows.find((r) => r.id === id),
    upsert: (row) =>
      set(rows.some((r) => r.id === row.id) ? rows.map((r) => (r.id === row.id ? row : r)) : [...rows, row]),
    patch: (id, change) => set(rows.map((r) => (r.id === id ? { ...r, ...change } : r))),
    remove: (id) => set(rows.filter((r) => r.id !== id)),
    replace: set,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/** Re-renders the caller whenever the store changes. */
export const useStore = <T extends { id: string }>(store: Store<T>): T[] =>
  useSyncExternalStore(store.subscribe, store.all, store.all);

let counter = 5000;
/** Stable-looking ids for rows created in the UI. */
export const newId = (prefix: string): string => `${prefix}-${++counter}`;

export const daysAgo = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString();
export const hoursAgo = (n: number): string => new Date(Date.now() - n * 3_600_000).toISOString();
export const inDays = (n: number): string => new Date(Date.now() + n * 86_400_000).toISOString();
