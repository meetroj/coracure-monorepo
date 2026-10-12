import { request } from './http';

/**
 * Roles and permissions against the backend: `GET /admin/roles` (read-only).
 *
 * *** THERE IS NO WRITE ENDPOINT, AND THAT IS THE ANSWER. *** Each handler on the
 * backend guards itself with a fixed list of levels, so a tickable cell would
 * change what a screen displays and nothing the server enforces. The matrix is
 * shown as it is, and the panel does not pretend to edit it.
 *
 * Source of truth: `AdminRoleView`, `AdminAreaAccess`.
 */

export type Access = 'none' | 'read' | 'write';

export type RoleView = {
  level: string;
  label: string;
  description: string;
  areas: { area: string; label: string; access: Access }[];
};

export type RolesMatrix = {
  editable: boolean;
  roles: RoleView[];
  areas: { area: string; label: string; note: string | null }[];
};

export const roles = {
  matrix: () => request<RolesMatrix>('/admin/roles'),
};

/** What one role may do in one area; an area a role has no row for is none. */
export const accessOf = (role: RoleView, area: string): Access => role.areas.find((a) => a.area === area)?.access ?? 'none';

export const ACCESS_LABEL: Record<Access, string> = { none: 'No access', read: 'Can read', write: 'Can change' };
