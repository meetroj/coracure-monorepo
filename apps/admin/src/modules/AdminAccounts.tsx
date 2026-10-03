import { useState } from 'react';

import { adminAccounts } from '../api/admin';
import { useMutation } from '../lib/useResource';
import { useToast } from '../lib/toast';
import { GROUPS, LEVELS, LEVEL_LABEL, SECTIONS, canSee, type AdminLevel } from '../nav';
import {
  Button,
  Card,
  EmptyState,
  Notice,
  PageHeader,
  SelectField,
  TextField,
} from '../ui';

/**
 * Admin accounts (§44).
 *
 * *** THE BACKEND ONLY SUPPORTS CREATE. *** There is no list, no edit, no
 * suspend, no password reset and no 2FA toggle endpoint - gap A-4. So this
 * screen offers the one operation that exists and states plainly that the rest
 * does not, rather than rendering a table of nothing or faking CRUD against
 * local state.
 *
 * FR-1.10 says a super admin switches two-factor per account. That endpoint
 * does not exist yet either, which is why it is listed below as missing rather
 * than shown as a broken switch.
 */
export function AdminAccounts({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<string>('operations');
  const defaultsFor = (l: string) =>
    SECTIONS.filter((s) => canSee(l as AdminLevel, s)).map((s) => s.path);
  // Starts as the level's own sections; the super admin then ticks or unticks.
  const [allowed, setAllowed] = useState<string[]>(() => defaultsFor('operations'));
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  const create = useMutation(adminAccounts.create);

  // Creating an account that can create accounts is super_admin only - the
  // backend's `assertPermission(actor)` with no levels named.
  if (level !== 'super_admin') {
    return (
      <>
        <PageHeader title="Admin accounts" />
        <EmptyState
          icon="lock"
          title="Super admin only"
          description="Creating admin accounts is restricted to super admins."
        />
      </>
    );
  }

  const validate = () => {
    const next: typeof errors = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (fullName.trim().length < 2) next.fullName = 'Enter the person’s full name.';
    if (password.length < 12) next.password = 'Use at least 12 characters.';
    return next;
  };

  return (
    <>
      <PageHeader
        title="Admin accounts"
        description="Create another admin. There is no self sign-up for this panel."
      />

      <Notice tone="warning">
        The backend exposes <strong>only account creation</strong>. There is no endpoint to list,
        edit, suspend, reset a password or switch two-factor, so those cannot be offered here (gap
        A-4) - including the per-account 2FA switch FR-1.10 describes. A super admin currently
        cannot see who the other admins are.
      </Notice>

      <Card title="Create an admin">
        <p className="muted">
          You set the password and hand it over - there is no invitation email. Who created the
          account is this action&apos;s audit entry.
        </p>

        <div className="formGrid">
          <TextField
            label="Email address"
            required
            type="email"
            autoComplete="off"
            value={email}
            error={errors.email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Full name"
            required
            value={fullName}
            error={errors.fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <TextField
            label="Initial password"
            required
            type="text"
            autoComplete="new-password"
            value={password}
            error={errors.password}
            hint="At least 12 characters. Give it to them over a channel other than email."
            onChange={(e) => setPassword(e.target.value)}
          />
          <SelectField
            label="Permission level"
            value={permissionLevel}
            onChange={(e) => {
              setPermissionLevel(e.target.value);
              setAllowed(defaultsFor(e.target.value));
            }}
            hint="Decides which data this admin can act on. It cannot be changed afterwards without a backend endpoint."
            options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))}
          />
        </div>

        <fieldset className="permSet">
          <legend className="permSet__legend">Tabs this admin can open</legend>
          <div className="permSet__bar">
            <p className="muted">
              Pre-ticked from the role. Untick a tab to hide it. A tab marked <em>outside role</em>{' '}
              only shows the link; the server still answers 403 for its data.
            </p>
            <div className="permSet__tools">
              <span className="permSet__count" aria-live="polite">
                {allowed.length} of {SECTIONS.length} selected
              </span>
              <Button variant="ghost" size="sm" onClick={() => setAllowed(SECTIONS.map((s) => s.path))}>
                Select all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAllowed([])}>
                Clear
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAllowed(defaultsFor(permissionLevel))}>
                Reset to role
              </Button>
            </div>
          </div>

          {GROUPS.map((group) => {
            const items = SECTIONS.filter((s) => s.group === group);
            if (items.length === 0) return null;
            return (
              <div className="permGroup" key={group}>
                <h3 className="permGroup__title">{group}</h3>
                <div className="permGrid">
                  {items.map((s) => {
                    const on = allowed.includes(s.path);
                    const outside = on && !canSee(permissionLevel as AdminLevel, s);
                    return (
                      <label key={s.path} className={`permItem ${on ? 'isOn' : ''}`.trim()}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) =>
                            setAllowed((cur) =>
                              e.target.checked ? [...cur, s.path] : cur.filter((p) => p !== s.path),
                            )
                          }
                        />
                        <span className="permItem__label">{s.label}</span>
                        {outside && <span className="permItem__tag">outside role</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </fieldset>

        <div className="formActions">
          <Button
            variant="primary"
            loading={create.busy}
            onClick={async () => {
              const found = validate();
              setErrors(found);
              if (Object.keys(found).length > 0) return;
              if (allowed.length === 0) {
                toast.fromError(new Error('Tick at least one tab.'), 'Tick at least one tab.');
                return;
              }
              try {
                await create.mutate({
                  email: email.trim().toLowerCase(),
                  password,
                  fullName: fullName.trim(),
                  permissionLevel,
                  allowedSections: allowed,
                });
                toast.success(`${fullName.trim()} can now sign in.`);
                setEmail('');
                setFullName('');
                setPassword('');
              } catch (e) {
                toast.fromError(e, 'Could not create this admin account.');
              }
            }}
          >
            Create admin
          </Button>
        </div>
      </Card>
    </>
  );
}
