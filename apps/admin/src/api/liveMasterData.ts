import { request } from './http';

/**
 * Master data against the backend: `GET /admin/master-data`,
 * `GET /admin/master-data/:kind`, `POST /admin/master-data/:kind`,
 * `PATCH /admin/master-data/:kind/:code` and `PUT /admin/master-data/:kind/order`.
 *
 * Source of truth: `MasterDataKindInfo`, `MasterDataEntry`,
 * `CreateMasterDataItemDto`, `UpdateMasterDataItemDto`, `ReorderMasterDataDto`.
 *
 * Only the lists the backend marks `editable` can be changed (ticket categories
 * and lab test categories). The rest are defined by the platform, or are
 * managed where they live: specialties, concerns and regions are the service
 * catalogue.
 */

export type MasterKind = { kind: string; label: string; editable: boolean; managedBy: string | null; count: number };
export type MasterEntry = { code: string; label: string; isActive: boolean; sortOrder: number };
export type MasterList = { kind: string; editable: boolean; items: MasterEntry[] };

/** Lower-case letters, digits and underscores, at most 60: what the DTO accepts and what tickets refer to. */
export const MASTER_CODE = /^[a-z0-9_]{1,60}$/;

export function codeFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

export function createBody(label: string): { code: string; label: string } {
  const text = label.trim();
  if (!text) throw new Error('Enter a name.');
  if (text.length > 160) throw new Error('A name can be at most 160 characters.');
  const code = codeFromLabel(text);
  if (!MASTER_CODE.test(code)) throw new Error('Use a name with at least one letter or digit.');
  return { code, label: text };
}

/** A move is the whole list in its new order: the backend wants every code, once. */
export function movedCodes(items: readonly MasterEntry[], code: string, direction: -1 | 1): string[] | null {
  const i = items.findIndex((x) => x.code === code);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= items.length) return null;
  const next = items.map((x) => x.code);
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const kindPath = (kind: string) => `/admin/master-data/${encodeURIComponent(kind)}`;

export const masterData = {
  kinds: () => request<MasterKind[]>('/admin/master-data'),

  /** Switched-off entries included: this is the edit view. */
  list: (kind: string) => request<MasterList>(kindPath(kind), { query: { includeInactive: true } }),

  create: (kind: string, label: string) => request<MasterEntry>(kindPath(kind), { method: 'POST', body: createBody(label) }),

  rename: (kind: string, code: string, label: string) => {
    const text = label.trim();
    if (!text) return Promise.reject(new Error('Enter a name.'));
    return request<MasterEntry>(`${kindPath(kind)}/${encodeURIComponent(code)}`, { method: 'PATCH', body: { label: text } });
  },

  setActive: (kind: string, code: string, isActive: boolean) =>
    request<MasterEntry>(`${kindPath(kind)}/${encodeURIComponent(code)}`, { method: 'PATCH', body: { isActive } }),

  reorder: (kind: string, codes: string[]) =>
    request<MasterEntry[]>(`${kindPath(kind)}/order`, { method: 'PUT', body: { codes } }),
};
