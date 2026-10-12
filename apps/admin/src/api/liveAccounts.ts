import { LEVELS, type AdminLevel } from '../nav';
import { request } from './http';

/**
 * Admin accounts: `GET/PATCH /admin/accounts`, `POST /admin/accounts/:id/(de)activate`,
 * `POST /auth/admin/accounts` and `PATCH /auth/admin/accounts/:id/two-factor`.
 * Every one of them is super admin only on the backend.
 *
 * Source of truth: `AdminAccountRow`, `UpdateAdminAccountDto`, `CreateAdminDto`,
 * `SetAdminTwoFactorDto`. Bodies are built field by field - the backend runs
 * `forbidNonWhitelisted`, so a spread form object is a hard 400.
 *
 * What the spec's Users table has that the backend does not: a mobile number and
 * a last-login time. Neither is on the account, so the live table has neither
 * column rather than an empty one.
 */

export type LiveAccount = {
  id: string;
  email: string;
  fullName: string;
  permissionLevel: AdminLevel;
  /** `suspended` is what the panel calls Inactive. */
  status: 'pending' | 'active' | 'suspended' | 'deleted';
  is2faEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LiveAccountPage = { items: LiveAccount[]; total: number; limit: number; offset: number };

/** Twelve characters is the backend's floor; it stores only an argon2id hash. */
export const MIN_PASSWORD = 12;

export type NewAccount = {
  fullName: string;
  email: string;
  password: string;
  permissionLevel: AdminLevel;
  is2faEnabled: boolean;
};

export function createAccountBody(input: NewAccount): Record<string, unknown> {
  return {
    email: input.email.trim().toLowerCase(),
    password: input.password,
    fullName: input.fullName.trim(),
    permissionLevel: input.permissionLevel,
    is2faEnabled: input.is2faEnabled,
  };
}

/** Only what changed: a PATCH that restates the current value is noise in the audit log. */
export function accountUpdateBody(
  before: Pick<LiveAccount, 'fullName' | 'permissionLevel'>,
  after: { fullName: string; permissionLevel: AdminLevel },
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const name = after.fullName.trim();
  if (name && name !== before.fullName) body.fullName = name;
  if (after.permissionLevel !== before.permissionLevel) body.permissionLevel = after.permissionLevel;
  return body;
}

export const isInactive = (a: Pick<LiveAccount, 'status'>): boolean => a.status === 'suspended';

/** Accounts whose level this panel does not know are shown, not dropped. */
export const knownLevel = (l: string): l is AdminLevel => (LEVELS as readonly string[]).includes(l);

export const accounts = {
  list: () => request<LiveAccountPage>('/admin/accounts', { query: { limit: 100 } }),

  create: (input: NewAccount) =>
    request<LiveAccount>('/auth/admin/accounts', { method: 'POST', body: createAccountBody(input) }),

  update: (id: string, before: LiveAccount, after: { fullName: string; permissionLevel: AdminLevel }) =>
    request<LiveAccount>(`/admin/accounts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: accountUpdateBody(before, after),
    }),

  deactivate: (id: string, reason?: string) =>
    request<LiveAccount>(`/admin/accounts/${encodeURIComponent(id)}/deactivate`, {
      method: 'POST',
      body: reason?.trim() ? { reason: reason.trim() } : {},
    }),

  activate: (id: string) =>
    request<LiveAccount>(`/admin/accounts/${encodeURIComponent(id)}/activate`, { method: 'POST', body: {} }),

  setTwoFactor: (id: string, on: boolean) =>
    request<unknown>(`/auth/admin/accounts/${encodeURIComponent(id)}/two-factor`, {
      method: 'PATCH',
      body: { is2faEnabled: on },
    }),
};
