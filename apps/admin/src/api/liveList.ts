import { request } from './http';

/**
 * The page envelope every admin list answers with, and a reader for all of it.
 *
 * The backend caps a page at 100 rows (`@Max(100)` on `limit`) and the panel's
 * lists filter and search in the browser, so a screen reads every page up to a
 * ceiling and says so when there are more. Twenty pages is two thousand rows.
 */
export type Page<T> = { items: T[]; total: number; limit: number; offset: number };

export const PAGE_SIZE = 100;
const MAX_PAGES = 20;

export type Everything<T> = {
  items: T[];
  /** The backend's count for the whole filtered set. */
  total: number;
  /** True when `total` is more than was read. */
  truncated: boolean;
};

type Query = Record<string, string | number | boolean | undefined>;

export async function listAll<T>(path: string, query: Query = {}): Promise<Everything<T>> {
  const items: T[] = [];
  let total = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const got = await request<Page<T>>(path, { query: { ...query, limit: PAGE_SIZE, offset: page * PAGE_SIZE } });
    total = got.total;
    items.push(...got.items);
    if (items.length >= got.total || got.items.length === 0) break;
  }
  return { items, total, truncated: total > items.length };
}

/** A decimal that came back as a string or a number, as a number; anything else 0. */
export const num = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? n : 0;
};
