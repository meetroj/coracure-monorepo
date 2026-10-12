import { Fragment } from 'react';

import { LIVE } from '../../api/live';
import { LEVELS, LEVEL_LABEL, SECTIONS, SPEC_ROLES, canSee, type AdminLevel } from '../../nav';
import { RolesLive } from './RolesLive';
import { roles } from '../../mock/ops/admin';
import { Button, Card } from '../../ui';
import { useToast } from '../../lib/toast';
import { useStore } from '../kit/store';

/**
 * Roles & Permissions (requirements §88, §89): the seven spec roles, and which
 * sections each may open. Permissions are configurable, so every cell is a
 * checkbox. Super Admin always has everything and cannot be edited.
 *
 * ponytail: the matrix is configuration state for the UI build. The sidebar
 * still gates on `nav.ts`; wire this into `canSee` when the backend stores
 * per-role permissions.
 */

// The spec's seven roles, in the spec's order (§88). Content Admin is a backend level the spec does not list.
const ORDER: readonly AdminLevel[] = SPEC_ROLES;

function FixtureRoles({ level: _level }: { level: AdminLevel }) {
  const toast = useToast();
  const rows = useStore(roles);
  const has = (role: AdminLevel, path: string) => role === 'super_admin' || (rows.find((r) => r.id === role)?.permissions.includes(path) ?? false);

  const toggle = (role: AdminLevel, path: string) => {
    const current = rows.find((r) => r.id === role);
    if (!current) return;
    roles.patch(role, {
      permissions: current.permissions.includes(path) ? current.permissions.filter((p) => p !== path) : [...current.permissions, path],
    });
  };

  const reset = () => {
    roles.replace(LEVELS.map((l) => ({ id: l, permissions: SECTIONS.filter((s) => canSee(l, s)).map((s) => s.path) })));
    toast.success('Permissions reset to the defaults.');
  };

  const groups = [...new Set(SECTIONS.map((s) => (s.sub ? `${s.group}: ${s.sub}` : s.group)))];

  return (
    <div className="stack">
      <Card
        title="Permissions"
        actions={
          <Button variant="ghost" onClick={reset}>
            Reset to defaults
          </Button>
        }
      >
        <div className="tableWrap">
          <div className="permGrid" role="table" aria-label="Role permissions">
            <div className="permGrid__head" style={{ textAlign: 'left' }}>Section</div>
            {ORDER.map((r) => (
              <div key={r} className="permGrid__head" role="columnheader">
                {LEVEL_LABEL[r]}
              </div>
            ))}
            {groups.map((g) => (
              <Fragment key={g}>
                <div className="permGrid__group">{g}</div>
                {SECTIONS.filter((s) => (s.sub ? `${s.group}: ${s.sub}` : s.group) === g).map((s) => (
                  <Fragment key={s.path}>
                    <div>{s.label}</div>
                    {ORDER.map((r) => (
                      <div key={r}>
                        <input
                          type="checkbox"
                          aria-label={`${LEVEL_LABEL[r]} may open ${s.label}`}
                          checked={has(r, s.path)}
                          disabled={r === 'super_admin'}
                          onChange={() => toggle(r, s.path)}
                        />
                      </div>
                    ))}
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Live against a configured backend, fixtures otherwise. */
export const Roles = LIVE ? RolesLive : FixtureRoles;
