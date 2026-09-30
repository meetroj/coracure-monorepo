import { useCallback, useState } from 'react';

import { notificationTemplates, type NotificationTemplate } from '../../api/admin';
import { useMutation, useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Card,
  Column,
  ConfirmDialog,
  EmptyState,
  Modal,
  Notice,
  PageHeader,
  StatusBadge,
  Table,
  TextArea,
  TextField,
  may,
} from '../../ui';

/**
 * Notification copy (§35, FR-16.3).
 *
 * Both apps take every notification's wording from here and hardcode none of
 * it, so this screen is the only place the copy exists.
 *
 * *** NO NOTIFICATION MAY NAME A DIAGNOSIS. *** That is a product invariant,
 * not a preference, and it is stated beside the editor because a well-meaning
 * edit is the likeliest way to break it. `reset` restores the shipped wording,
 * which is the undo for exactly that mistake.
 */
export function NotificationTemplates({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const fetcher = useCallback(() => notificationTemplates.list(), []);
  const state = useResource<NotificationTemplate[]>(fetcher, []);
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [resetting, setResetting] = useState<NotificationTemplate | null>(null);

  const reset = useMutation(notificationTemplates.reset);
  const canEdit = may(level, ['content', 'clinical_governance']);

  const columns: Column<NotificationTemplate>[] = [
    {
      key: 'code',
      header: 'Notification',
      render: (t) => (
        <span className="cellStack">
          <strong>{t.title || t.code}</strong>
          <small>
            <code>{t.code}</code>
          </small>
        </span>
      ),
    },
    {
      key: 'body',
      header: 'Current wording',
      render: (t) => <span className="clamp">{t.body ?? '—'}</span>,
    },
    {
      key: 'customised',
      header: '',
      width: '110px',
      render: (t) =>
        t.isCustomised ? <StatusBadge status="in_review" label="Edited" /> : null,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '170px',
      render: (t) =>
        canEdit ? (
          <span className="rowActions">
            <Button size="sm" variant="secondary" icon="edit" onClick={() => setEditing(t)}>
              Edit
            </Button>
            {t.isCustomised && (
              <Button size="sm" variant="ghost" onClick={() => setResetting(t)}>
                Reset
              </Button>
            )}
          </span>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Notification copy"
        description="Every notification the platform sends. Both apps render what this returns."
      />

      <Notice tone="danger">
        No notification may name a diagnosis. A push arrives on a lock screen a stranger can read —
        this is a clinical-confidentiality rule, not a style preference.
      </Notice>

      <Async
        state={state}
        resource="notification templates"
        empty={<EmptyState icon="bell" title="No templates registered" />}
      >
        {(rows) => (
          <Table
            caption="Notification templates"
            columns={columns}
            rows={rows}
            rowKey={(t) => t.code}
          />
        )}
      </Async>

      {editing && (
        <EditTemplate
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast.success('Wording updated.');
            state.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={resetting !== null}
        busy={reset.busy}
        onClose={() => setResetting(null)}
        variant="secondary"
        title="Restore the shipped wording?"
        confirmLabel="Reset wording"
        consequence="Your edits to this notification are discarded and the original text comes back."
        onConfirm={async () => {
          if (!resetting) return;
          try {
            await reset.mutate(resetting.code);
            toast.success('Shipped wording restored.');
            state.reload();
          } catch (e) {
            toast.fromError(e);
          }
          setResetting(null);
        }}
      />
    </>
  );
}

function EditTemplate({
  template,
  onClose,
  onSaved,
}: {
  template: NotificationTemplate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(template.title ?? '');
  const [body, setBody] = useState(template.body ?? '');
  const update = useMutation(notificationTemplates.update);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${template.code}`}
      width={620}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={update.busy}
            onClick={async () => {
              try {
                await update.mutate(template.code, { title: title.trim(), body: body.trim() });
                onSaved();
              } catch (e) {
                // The modal stays open with the text intact (§50).
                toast.fromError(e);
              }
            }}
          >
            Save wording
          </Button>
        </>
      }
    >
      <Notice tone="danger">Must not name a diagnosis, a condition or a medication.</Notice>
      <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <TextArea
        label="Body"
        rows={5}
        value={body}
        hint="Plain language. Assume it will be read by someone other than the patient."
        onChange={(e) => setBody(e.target.value)}
      />
    </Modal>
  );
}
