import { useCallback } from 'react';

import { ACCESS_LABEL, accessOf, roles, type RolesMatrix } from '../../api/liveRoles';
import { useResource } from '../../lib/useResource';
import { SPEC_ROLES, type AdminLevel } from '../../nav';
import { Async, Card, Notice, StatusBadge } from '../../ui';

/**
 * Roles & Permissions against the real backend (requirements section 88-89).
 *
 * Read-only on purpose: the backend fixes each role in code and every handler
 * guards itself with a fixed list of levels. A screen that let an admin tick a
 * different cell would change what is displayed and nothing the server enforces.
 * To change a role, the guards change, in a release.
 */
export function RolesLive({ level: _level }: { level: AdminLevel }) {
  const fetcher = useCallback(() => roles.matrix(), []);
  const state = useResource<RolesMatrix>(fetcher, []);

  return (
    <div className="stack">
      <Notice tone="info">
        These roles are fixed by the platform. Each screen&apos;s access is enforced on the server, so this table shows
        what each role can do and is not editable. A person&apos;s role is set under Users.
      </Notice>
      <Async state={state} resource="roles" skeletonRows={6}>
        {(all) => {
          // exactly the seven roles of §88, in the spec's order, whatever extra levels the server knows
          const m = { ...all, roles: SPEC_ROLES.flatMap((l) => all.roles.filter((r) => r.level === l)) };
          return (
          <Card title="What each role can reach">
            <div className="tableWrap">
              <table className="table">
                <caption className="srOnly">Role permissions</caption>
                <thead>
                  <tr>
                    <th scope="col">Area</th>
                    {m.roles.map((r) => (
                      <th scope="col" key={r.level} title={r.description}>
                        {r.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {m.areas.map((a) => (
                    <tr key={a.area}>
                      <th scope="row">
                        <span className="cellStack">
                          <span>{a.label}</span>
                          {a.note && <small>{a.note}</small>}
                        </span>
                      </th>
                      {m.roles.map((r) => {
                        const access = accessOf(r, a.area);
                        return (
                          <td key={r.level}>
                            <StatusBadge
                              status={access === 'write' ? 'verified' : access === 'read' ? 'info' : 'inactive'}
                              tone={access === 'write' ? 'positive' : access === 'read' ? 'info' : 'neutral'}
                              label={ACCESS_LABEL[access]}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          );
        }}
      </Async>
    </div>
  );
}
