import { useState } from 'react';

import { useToast } from '../../lib/toast';
import { adminUsers, type AdminUser } from '../../mock/ops/admin';
import { LEVEL_LABEL, SPEC_ROLES, type AdminLevel } from '../../nav';
import { Button, StatusBadge, type Column } from '../../ui';
import { fmtDateTime } from '../kit/format';
import { ListScreen, type ListFilter } from '../kit/ListScreen';
import { RecordForm, type FieldDef, type Values } from '../kit/RecordForm';
import { newId, useStore } from '../kit/store';
import { LIVE } from '../../api/live';
import { UsersLive } from './UsersLive';

/**
 * Admin Users (requirements §87): add, edit, activate, deactivate and assign
 * or change a role. The role decides which sections the user can open.
 *
 * ponytail: a real build sends an invitation email rather than creating the
 * account here, and never lets the last Super Admin be deactivated - that guard
 * is included below because it is cheap and the failure locks everyone out.
 */

// the seven roles of §88, in the spec's order; a legacy `content` admin still shows its label in the table
const ROLE_OPTIONS = SPEC_ROLES.map((l) => ({ value: l, label: LEVEL_LABEL[l] }));

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'email', label: 'Email', type: 'email', required: true, validate: (v) => (/^\S+@\S+\.\S+$/.test(String(v)) ? null : 'Enter a valid email.') },
  { key: 'mobile', label: 'Mobile', required: true },
  { key: 'role', label: 'Role', type: 'select', required: true, options: ROLE_OPTIONS },
  { key: 'active', label: 'Active', type: 'bool' },
];

const ROLE_ONLY: FieldDef[] = [{ key: 'role', label: 'Role', type: 'select', required: true, options: ROLE_OPTIONS }];

function FixtureUsers({ level: _level }: { level: AdminLevel }) {
  const toast = useToast();
  const rows = useStore(adminUsers);
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);
  const [roleFor, setRoleFor] = useState<AdminUser | null>(null);

  const activeSupers = rows.filter((u) => u.role === 'super_admin' && u.active).length;
  const isLastSuper = (u: AdminUser) => u.role === 'super_admin' && u.active && activeSupers <= 1;

  const save = (v: Values) => {
    const base = editing && editing !== 'new' ? editing : null;
    const email = String(v.email).trim().toLowerCase();
    if (rows.some((u) => u.id !== base?.id && u.email === email)) {
      toast.error('Another user already has that email.');
      return;
    }
    const next: AdminUser = {
      id: base?.id ?? newId('au'),
      name: String(v.name).trim(),
      email,
      mobile: String(v.mobile).trim(),
      role: v.role as AdminLevel,
      active: Boolean(v.active),
      lastLogin: base?.lastLogin ?? null,
    };
    if (base && isLastSuper(base) && (!next.active || next.role !== 'super_admin')) {
      toast.error('That is the only active Super Admin. Make someone else a Super Admin first.');
      return;
    }
    adminUsers.upsert(next);
    toast.success(base ? `${next.name} updated.` : `${next.name} added.`);
    setEditing(null);
  };

  const filters: ListFilter<AdminUser>[] = [{ key: 'role', label: 'Role', options: ROLE_OPTIONS, test: (u, v) => u.role === v }];

  const columns: Column<AdminUser>[] = [
    { key: 'name', header: 'Name', render: (u) => <strong>{u.name}</strong> },
    { key: 'email', header: 'Email', render: (u) => u.email },
    { key: 'mobile', header: 'Mobile', render: (u) => u.mobile },
    { key: 'role', header: 'Role', render: (u) => LEVEL_LABEL[u.role] },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.active ? 'active' : 'inactive'} /> },
    { key: 'login', header: 'Last login', render: (u) => (u.lastLogin ? fmtDateTime(u.lastLogin) : <span className="muted">Never</span>) },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '320px',
      render: (u) => (
        <span className="rowActions">
          <Button size="sm" variant="secondary" onClick={() => setEditing(u)}>
            Edit
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setRoleFor(u)}>
            Change role
          </Button>
          <Button
            size="sm"
            variant={u.active ? 'ghost' : 'success'}
            onClick={() => {
              if (isLastSuper(u)) {
                toast.error('That is the only active Super Admin.');
                return;
              }
              adminUsers.patch(u.id, { active: !u.active });
              toast.success(`${u.name} ${u.active ? 'deactivated' : 'activated'}.`);
            }}
          >
            {u.active ? 'Deactivate' : 'Activate'}
          </Button>
        </span>
      ),
    },
  ];

  return (
    <>
      <ListScreen
        caption="Admin users"
        rows={rows}
        columns={columns}
        rowKey={(u) => u.id}
        search={(u) => `${u.name} ${u.email} ${u.mobile}`}
        searchPlaceholder="Name, email or mobile"
        filters={filters}
        tabs={[
          { id: 'active', label: 'Active', test: (u) => u.active },
          { id: 'inactive', label: 'Inactive', test: (u) => !u.active },
        ]}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setEditing('new')}>
            Add User
          </Button>
        }
        emptyIcon="users"
        empty={{ title: 'No admin users' }}
      />
      <RecordForm
        open={editing !== null}
        title={editing === 'new' ? 'Add User' : 'Edit User'}
        fields={FIELDS}
        initial={editing && editing !== 'new' ? { name: editing.name, email: editing.email, mobile: editing.mobile, role: editing.role, active: editing.active } : { active: true }}
        onClose={() => setEditing(null)}
        onSubmit={save}
      />
      <RecordForm
        open={roleFor !== null}
        title={roleFor ? `Change role for ${roleFor.name}` : 'Change role'}
        fields={ROLE_ONLY}
        initial={{ role: roleFor?.role ?? '' }}
        submitLabel="Assign role"
        onClose={() => setRoleFor(null)}
        onSubmit={(v) => {
          if (roleFor) {
            if (isLastSuper(roleFor) && v.role !== 'super_admin') {
              toast.error('That is the only active Super Admin.');
              return;
            }
            adminUsers.patch(roleFor.id, { role: v.role as AdminLevel });
            toast.success(`${roleFor.name} is now ${LEVEL_LABEL[v.role as AdminLevel]}.`);
          }
          setRoleFor(null);
        }}
      />
    </>
  );
}

/** Live against a configured backend, fixtures otherwise. Chosen once, at load. */
export const Users = LIVE ? UsersLive : FixtureUsers;
