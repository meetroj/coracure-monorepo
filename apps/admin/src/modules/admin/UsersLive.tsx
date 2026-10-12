import { useCallback, useState } from 'react';

import { accounts, isInactive, MIN_PASSWORD, type LiveAccount } from '../../api/liveAccounts';
import { useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import { LEVEL_LABEL, SPEC_ROLES, type AdminLevel } from '../../nav';
import { Button, ErrorState, Notice, StatusBadge, TableSkeleton, skeletonColumns, type Column } from '../../ui';
import { fmtDate } from '../kit/format';
import { ListScreen, type ListFilter } from '../kit/ListScreen';
import { RecordForm, type FieldDef, type Values } from '../kit/RecordForm';

/**
 * Admin Users against the real backend (requirements section 87).
 *
 * Super admin only: the whole account controller is. A level that opens this
 * page by a typed URL gets the backend's 403 as an error panel, not data.
 *
 * Two safeguards live on the server and are shown as its own messages: you
 * cannot change or deactivate your own account (`CANNOT_CHANGE_OWN_ACCOUNT`),
 * and the last active super admin cannot be removed (`LAST_SUPER_ADMIN`).
 */

// the seven roles of §88, in the spec's order; a legacy `content` admin still shows its label in the table
const ROLE_OPTIONS = SPEC_ROLES.map((l) => ({ value: l, label: LEVEL_LABEL[l] }));

const CREATE: FieldDef[] = [
  { key: 'fullName', label: 'Name', required: true },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    validate: (v) => (/^\S+@\S+\.\S+$/.test(String(v)) ? null : 'Enter a valid email.'),
  },
  {
    key: 'password',
    label: 'Temporary password',
    type: 'password',
    required: true,
    hint: `At least ${MIN_PASSWORD} characters. Pass it on through another channel.`,
    validate: (v) => (String(v).length >= MIN_PASSWORD ? null : `Use at least ${MIN_PASSWORD} characters.`),
  },
  { key: 'permissionLevel', label: 'Role', type: 'select', required: true, options: ROLE_OPTIONS },
  { key: 'is2faEnabled', label: 'Require a one-time code at sign-in', type: 'bool' },
];

const EDIT: FieldDef[] = [
  { key: 'fullName', label: 'Name', required: true },
  { key: 'permissionLevel', label: 'Role', type: 'select', required: true, options: ROLE_OPTIONS },
];

export function UsersLive({ level: _level }: { level: AdminLevel }) {
  const toast = useToast();
  const fetcher = useCallback(() => accounts.list(), []);
  const state = useResource(fetcher, []);
  const [editing, setEditing] = useState<LiveAccount | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (id: string, work: () => Promise<unknown>, ok: string) => {
    setBusyId(id);
    try {
      await work();
      toast.success(ok);
      state.reload();
    } catch (e) {
      toast.fromError(e);
    } finally {
      setBusyId(null);
    }
  };

  const columns: Column<LiveAccount>[] = [
    { key: 'name', header: 'Name', render: (a) => <strong>{a.fullName}</strong> },
    { key: 'email', header: 'Email', render: (a) => a.email },
    { key: 'role', header: 'Role', render: (a) => LEVEL_LABEL[a.permissionLevel] ?? a.permissionLevel },
    {
      key: 'mfa',
      header: 'Two-factor',
      render: (a) => <StatusBadge status={a.is2faEnabled ? 'active' : 'inactive'} label={a.is2faEnabled ? 'On' : 'Off'} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <StatusBadge status={isInactive(a) ? 'inactive' : 'active'} />,
    },
    { key: 'created', header: 'Added', render: (a) => fmtDate(a.createdAt) },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '380px',
      render: (a) => (
        <span className="rowActions">
          <Button size="sm" variant="secondary" disabled={busyId === a.id} onClick={() => setEditing(a)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={busyId === a.id}
            onClick={() =>
              run(a.id, () => accounts.setTwoFactor(a.id, !a.is2faEnabled), `Two-factor ${a.is2faEnabled ? 'off' : 'on'} for ${a.fullName}.`)
            }
          >
            {a.is2faEnabled ? 'Turn 2FA off' : 'Turn 2FA on'}
          </Button>
          <Button
            size="sm"
            variant={isInactive(a) ? 'success' : 'ghost'}
            disabled={busyId === a.id}
            onClick={() =>
              isInactive(a)
                ? run(a.id, () => accounts.activate(a.id), `${a.fullName} can sign in again.`)
                : run(a.id, () => accounts.deactivate(a.id), `${a.fullName} is deactivated.`)
            }
          >
            {isInactive(a) ? 'Activate' : 'Deactivate'}
          </Button>
        </span>
      ),
    },
  ];

  const filters: ListFilter<LiveAccount>[] = [
    { key: 'role', label: 'Role', options: ROLE_OPTIONS, test: (a, v) => a.permissionLevel === v },
  ];

  const submit = async (v: Values) => {
    try {
      if (editing === 'new') {
        await accounts.create({
          fullName: String(v.fullName),
          email: String(v.email),
          password: String(v.password),
          permissionLevel: v.permissionLevel as AdminLevel,
          is2faEnabled: Boolean(v.is2faEnabled),
        });
        toast.success(`${String(v.fullName).trim()} added.`);
      } else if (editing) {
        await accounts.update(editing.id, editing, {
          fullName: String(v.fullName),
          permissionLevel: v.permissionLevel as AdminLevel,
        });
        toast.success('Account updated.');
      }
      setEditing(null);
      state.reload();
    } catch (e) {
      toast.fromError(e);
    }
  };

  const page = state.data;

  return (
    <>
      {state.error && !page ? (
        <ErrorState error={state.error} onRetry={state.reload} resource="admin users" />
      ) : (
        <>
          {/* A reload after an action that failed leaves the last list up: say so, with a way to try again. */}
          {state.error && page && (
            <Notice tone="warning">
              Could not refresh the accounts. Showing what was loaded last.{' '}
              <Button size="sm" variant="ghost" onClick={state.reload}>
                Retry
              </Button>
            </Notice>
          )}
          {/* The tabs, search and Add User stay on screen while the accounts load; only the body is a skeleton. */}
          <ListScreen
            caption="Admin users"
            rows={page?.items ?? []}
            columns={columns}
            rowKey={(a) => a.id}
            search={(a) => `${a.fullName} ${a.email}`}
            searchPlaceholder="Name or email"
            filters={filters}
            tabs={[
              { id: 'active', label: 'Active', test: (a) => !isInactive(a) },
              { id: 'inactive', label: 'Inactive', test: (a) => isInactive(a) },
            ]}
            actions={
              <Button variant="primary" icon="plus" onClick={() => setEditing('new')}>
                Add User
              </Button>
            }
            emptyIcon="users"
            empty={{ title: 'No admin users' }}
            loading={page === null}
            skeleton={
              <TableSkeleton
                columns={skeletonColumns(columns, {
                  name: 'name',
                  email: 'email',
                  role: 'text',
                  mfa: 'status',
                  status: 'status',
                  created: 'date',
                  actions: 'button',
                })}
                rows={6}
              />
            }
          />
          {page && page.total > page.items.length && (
            <Notice tone="warning">
              Showing the first {page.items.length} of {page.total} accounts. Narrow it with search.
            </Notice>
          )}
        </>
      )}

      <RecordForm
        open={editing !== null}
        title={editing === 'new' ? 'Add User' : 'Edit User'}
        fields={editing === 'new' ? CREATE : EDIT}
        initial={
          editing && editing !== 'new'
            ? { fullName: editing.fullName, permissionLevel: editing.permissionLevel }
            : { permissionLevel: 'operations', is2faEnabled: false }
        }
        onClose={() => setEditing(null)}
        onSubmit={submit}
      />
    </>
  );
}
