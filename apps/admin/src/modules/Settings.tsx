import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import { config, type ConfigValue } from '../api/admin';
import { useMutation, useResource } from '../lib/useResource';
import { useToast } from '../lib/toast';
import type { AdminLevel } from '../nav';
import { Async, Button, Card, EmptyState, Notice, PageHeader, TextField } from '../ui';

/**
 * Platform settings (§39).
 *
 * *** RENDERED ENTIRELY FROM THE RESPONSE. *** The backend returns only keys a
 * module actually registered, each with what it is for, the shape expected,
 * whether YOUR level may edit it, and - where it has a dedicated screen -
 * `managedBy` naming that screen.
 *
 * So there is no local list of settings here, and no editor is offered for a
 * `managedBy` value. Two ways to change one value is how the two drift apart,
 * and the specialised screen validates things this one cannot.
 *
 * The audit entry (with before and after) IS the configuration history - there
 * is no versions table - which is why "history" links into the audit log
 * filtered to that key.
 */

/** Maps `managedBy` to the screen that owns the value, where we know it. */
const OWNER_ROUTE: Record<string, string> = {
  'notification-templates': '/notifications',
  notifications: '/notifications',
  'search-config': '/settings/general',
  search: '/settings/general',
  'allocation-policy': '/catalogue?tab=policy',
  allocation: '/catalogue?tab=policy',
  pathways: '/pathways',
  'followup-pathways': '/pathways',
};

export function Settings({ level }: { level: AdminLevel }) {
  const fetcher = useCallback(() => config.list(), []);
  const state = useResource<ConfigValue[]>(fetcher, []);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Values the platform reads at runtime. Only settings a module registered appear here."
      />

      <Notice tone="info">
        You are seeing the settings your role owns. Values shown as read-only either belong to a
        different permission level, or have a screen of their own that validates them properly.
      </Notice>

      <Async
        state={state}
        resource="settings"
        empty={<EmptyState icon="settings" title="No configurable settings" />}
      >
        {(values) => (
          <div className="stack">
            {values.map((value) => (
              <SettingRow key={value.key} setting={value} onSaved={state.reload} />
            ))}
          </div>
        )}
      </Async>
    </>
  );
}

function SettingRow({ setting, onSaved }: { setting: ConfigValue; onSaved: () => void }) {
  const toast = useToast();
  const isScalar = typeof setting.value !== 'object' || setting.value === null;
  const [text, setText] = useState(() =>
    isScalar ? String(setting.value ?? '') : JSON.stringify(setting.value, null, 2),
  );
  const [error, setError] = useState<string | null>(null);
  const save = useMutation(config.set);

  const ownerRoute = setting.managedBy ? OWNER_ROUTE[setting.managedBy] : undefined;

  /** Sends the value in the shape the reading module declared. */
  const parse = (): { ok: true; value: unknown } | { ok: false } => {
    if (!isScalar) {
      try {
        return { ok: true, value: JSON.parse(text) };
      } catch {
        return { ok: false };
      }
    }
    if (setting.shape === 'number' || typeof setting.value === 'number') {
      const n = Number(text);
      return Number.isFinite(n) ? { ok: true, value: n } : { ok: false };
    }
    if (setting.shape === 'boolean' || typeof setting.value === 'boolean') {
      return { ok: true, value: text === 'true' };
    }
    return { ok: true, value: text };
  };

  return (
    <Card title={setting.key}>
      {setting.description && <p className="muted">{setting.description}</p>}

      {/* A value with its own screen is never editable here. */}
      {setting.managedBy ? (
        <Notice tone="info">
          Managed by <strong>{setting.managedBy}</strong>, which validates it properly.{' '}
          {ownerRoute && <Link to={ownerRoute}>Open that screen</Link>}
        </Notice>
      ) : null}

      <TextField
        label="Value"
        value={text}
        error={error}
        disabled={!setting.editable || Boolean(setting.managedBy)}
        hint={setting.shape ? `Expected shape: ${setting.shape}` : undefined}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
      />

      <div className="row">
        {setting.editable && !setting.managedBy && (
          <Button
            variant="primary"
            size="sm"
            loading={save.busy}
            onClick={async () => {
              const parsed = parse();
              if (!parsed.ok) {
                setError(`That is not a valid ${setting.shape ?? 'value'}.`);
                return;
              }
              try {
                await save.mutate(setting.key, parsed.value);
                toast.success(`${setting.key} updated.`);
                onSaved();
              } catch (e) {
                toast.fromError(e);
              }
            }}
          >
            Save
          </Button>
        )}

        {!setting.editable && !setting.managedBy && (
          <span className="muted small">Read-only for your permission level.</span>
        )}

        {/* The audit entry IS the configuration history (§39). */}
        <Link to={`/settings/audit?entityType=app_config&entityId=${encodeURIComponent(setting.key)}`}>
          <Button variant="ghost" size="sm" icon="audit">
            History
          </Button>
        </Link>
      </div>
    </Card>
  );
}
