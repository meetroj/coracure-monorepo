import { useCallback, useState } from 'react';

import { compliance, type RetentionInfo } from '../../api/admin';
import { useMutation, useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Card,
  ConfirmDialog,
  DefinitionList,
  EmptyState,
  Notice,
  PageHeader,
} from '../../ui';

/**
 * Data retention (§43). **super_admin only** — `assertPermission(actor,
 * 'super_admin')` on the backend.
 *
 * *** THE SCOPE IS SHOWN BEFORE THE BUTTON, NOT AFTER. *** A retention sweep
 * destroys records permanently. The current window and what falls inside it
 * are on screen first; the action itself needs a typed phrase, because a
 * one-click irreversible bulk delete is how an accident happens.
 *
 * A scheduled system run does the same job routinely. This manual button
 * exists for the case where it did not.
 */
export function Retention({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const fetcher = useCallback(() => compliance.retention(), []);
  const state = useResource<RetentionInfo>(fetcher, []);
  const apply = useMutation(compliance.applyRetention);
  const [confirming, setConfirming] = useState(false);

  // Belt and braces: the route guard already hides this section, but the one
  // destructive bulk action in the panel should not rely on a single check.
  if (level !== 'super_admin') {
    return (
      <>
        <PageHeader title="Retention & data rights" />
        <EmptyState
          icon="lock"
          title="Super admin only"
          description="Applying data retention permanently destroys records, so it is restricted to super admins."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Retention & data rights"
        description="The retention window the platform enforces, and the manual sweep."
      />

      <Notice tone="danger">
        Applying retention <strong>permanently deletes</strong> every record past the window. It
        cannot be undone. A scheduled run does this routinely — use this only when it has not.
      </Notice>

      <Async state={state} resource="retention settings" skeletonRows={2}>
        {(info) => (
          <>
            <Card title="Current window">
              <DefinitionList
                items={[
                  {
                    label: 'Retention period',
                    value: info.retentionDays ? `${info.retentionDays} days` : null,
                  },
                  {
                    label: 'Records currently in scope',
                    value:
                      info.inScope === null || info.inScope === undefined ? null : (
                        <strong>{info.inScope.toLocaleString()}</strong>
                      ),
                  },
                  { label: 'What this covers', value: info.description },
                ]}
              />
            </Card>

            <Card title="Run the sweep">
              <p className="muted">
                Everything older than the window above is deleted.{' '}
                {info.inScope
                  ? `${info.inScope.toLocaleString()} record(s) would be destroyed right now.`
                  : 'Check the figure above before running this.'}
              </p>
              <div className="formActions">
                <Button variant="danger" icon="trash" onClick={() => setConfirming(true)}>
                  Apply retention
                </Button>
              </div>
            </Card>

            <ConfirmDialog
              open={confirming}
              busy={apply.busy}
              onClose={() => setConfirming(false)}
              variant="danger"
              title="Permanently delete records past the retention window?"
              confirmLabel="Apply retention"
              consequence={
                <>
                  <strong>
                    {info.inScope
                      ? `${info.inScope.toLocaleString()} record(s)`
                      : 'Every record past the window'}{' '}
                    will be destroyed.
                  </strong>{' '}
                  This is irreversible and there is no recovery from backup once it has run.
                </>
              }
              typeToConfirm="APPLY RETENTION"
              onConfirm={async () => {
                try {
                  const result = await apply.mutate();
                  toast.success(`Retention applied — ${result.deleted} record(s) deleted.`);
                  state.reload();
                } catch (e) {
                  toast.fromError(e);
                }
                setConfirming(false);
              }}
            />
          </>
        )}
      </Async>
    </>
  );
}
