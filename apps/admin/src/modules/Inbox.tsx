import { useCallback } from 'react';

import { inbox, type AdminNotification } from '../api/admin';
import { useMutation, useResource } from '../lib/useResource';
import { useToast } from '../lib/toast';
import type { AdminLevel } from '../nav';
import { Async, Button, Card, EmptyState, PageHeader, StatusBadge } from '../ui';

/**
 * This admin's own notifications, reached from the header bell.
 *
 * SRS 2.3 puts the admin panel in a desktop browser and gives admins no push
 * device, so in-panel is the only place these are read. It is this account's
 * inbox rather than a module, which is why it has no sidebar entry.
 */
export function Inbox({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const fetcher = useCallback(() => inbox.list(), []);
  const state = useResource<AdminNotification[]>(fetcher, []);

  const markRead = useMutation(inbox.markRead);
  const markAll = useMutation(inbox.markAllRead);

  const unread = (state.data ?? []).filter((n) => !n.readAt).length;

  return (
    <>
      <PageHeader
        title="Your notifications"
        back={{ to: '/', label: 'Back to the panel' }}
        description="Alerts addressed to your admin account."
        actions={
          unread > 0 && (
            <Button
              variant="secondary"
              icon="check"
              loading={markAll.busy}
              onClick={async () => {
                try {
                  await markAll.mutate();
                  toast.success('All marked as read.');
                  state.reload();
                } catch (e) {
                  toast.fromError(e);
                }
              }}
            >
              Mark all read
            </Button>
          )
        }
      />

      <Async
        state={state}
        resource="your notifications"
        empty={
          <EmptyState
            icon="bell"
            title="Nothing new"
            description="You have no notifications."
          />
        }
      >
        {(rows) => (
          <div className="stack">
            {rows.map((n) => (
              <Card key={n.id}>
                <div className="spread">
                  <div>
                    <div className="row">
                      <strong>{n.title ?? 'Notification'}</strong>
                      {!n.readAt && <StatusBadge status="open" label="Unread" />}
                    </div>
                    {n.body && <p className="muted">{n.body}</p>}
                    {n.createdAt && (
                      <p className="muted small">{new Date(n.createdAt).toLocaleString()}</p>
                    )}
                  </div>
                  {!n.readAt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await markRead.mutate(n.id);
                          state.reload();
                        } catch (e) {
                          toast.fromError(e);
                        }
                      }}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Async>
    </>
  );
}
