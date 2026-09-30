import { useState } from 'react';

import { adminAccounts } from '../api/admin';
import { useMutation } from '../lib/useResource';
import { useToast } from '../lib/toast';
import { LEVELS, LEVEL_LABEL, type AdminLevel } from '../nav';
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
 * suspend, no password reset and no 2FA toggle endpoint — gap A-4. So this
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
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  const create = useMutation(adminAccounts.create);

  // Creating an account that can create accounts is super_admin only — the
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
        A-4) — including the per-account 2FA switch FR-1.10 describes. A super admin currently
        cannot see who the other admins are.
      </Notice>

      <Card title="Create an admin">
        <p className="muted">
          You set the password and hand it over — there is no invitation email. Who created the
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
            onChange={(e) => setPermissionLevel(e.target.value)}
            hint="Decides which sections and data this admin sees. It cannot be changed afterwards without a backend endpoint."
            options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))}
          />
        </div>

        <div className="formActions">
          <Button
            variant="primary"
            loading={create.busy}
            onClick={async () => {
              const found = validate();
              setErrors(found);
              if (Object.keys(found).length > 0) return;
              try {
                await create.mutate({
                  email: email.trim().toLowerCase(),
                  password,
                  fullName: fullName.trim(),
                  permissionLevel,
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
