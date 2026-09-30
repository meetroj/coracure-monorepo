import { useCallback, useState } from 'react';

import { content, type ContentItem } from '../../api/admin';
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
  PermissionGate,
  StatusBadge,
  Table,
  TextArea,
  TextField,
  may,
} from '../../ui';

/**
 * Care Hub authoring (§34).
 *
 * draft → submit → in review → publish → archived.
 *
 * *** PUBLISH IS CLINICAL GOVERNANCE ONLY. *** A content editor writes and
 * submits; only clinical governance signs it off, because this is
 * patient-facing clinical content requiring clinician sign-off. The panel
 * models that as two people — a `content` admin never sees a Publish button at
 * all, rather than a disabled one.
 */
export function CareHub({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const fetcher = useCallback(() => content.items(), []);
  const state = useResource<ContentItem[]>(fetcher, []);
  const [composing, setComposing] = useState(false);
  const [publishing, setPublishing] = useState<ContentItem | null>(null);

  const submit = useMutation(content.submit);
  const publish = useMutation(content.publish);
  const archive = useMutation(content.archive);

  const canAuthor = may(level, ['content', 'clinical_governance']);
  const canPublish = may(level, ['clinical_governance']);

  const after = (message: string) => {
    toast.success(message);
    state.reload();
  };

  const columns: Column<ContentItem>[] = [
    {
      key: 'title',
      header: 'Item',
      render: (i) => (
        <span className="cellStack">
          <strong>{i.title}</strong>
          <small>{i.category ?? 'Uncategorised'}</small>
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
    {
      key: 'updated',
      header: 'Updated',
      render: (i) => (i.updatedAt ? new Date(i.updatedAt).toLocaleDateString() : '—'),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '230px',
      render: (i) => (
        <span className="rowActions">
          {canAuthor && i.status === 'draft' && (
            <Button
              size="sm"
              variant="secondary"
              loading={submit.busy}
              onClick={async () => {
                try {
                  await submit.mutate(i.id);
                  after('Sent for clinical review.');
                } catch (e) {
                  toast.fromError(e);
                }
              }}
            >
              Submit for review
            </Button>
          )}

          {/* Only clinical governance sees this, ever. */}
          <PermissionGate level={level} allow={['clinical_governance']}>
            {i.status === 'in_review' && (
              <Button size="sm" variant="success" onClick={() => setPublishing(i)}>
                Publish
              </Button>
            )}
          </PermissionGate>

          {canAuthor && i.status === 'published' && (
            <Button
              size="sm"
              variant="ghost"
              loading={archive.busy}
              onClick={async () => {
                try {
                  await archive.mutate(i.id);
                  after('Archived.');
                } catch (e) {
                  toast.fromError(e);
                }
              }}
            >
              Archive
            </Button>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Care Hub"
        description="Self-help resources, education and guides shown in the patient app."
        actions={
          <PermissionGate level={level} allow={['content', 'clinical_governance']}>
            <Button variant="primary" icon="plus" onClick={() => setComposing(true)}>
              New item
            </Button>
          </PermissionGate>
        }
      />

      <Notice tone="info">
        Writing and submitting is a content job; <strong>publishing is a clinical one</strong>. This
        is patient-facing clinical content and needs clinician sign-off, so the two are different
        people.
        {!canPublish && ' Your role can author and submit, but not publish.'}
      </Notice>

      <Async
        state={state}
        resource="Care Hub items"
        empty={
          <EmptyState
            icon="content"
            title="No Care Hub items yet"
            description="Nothing has been authored for the patient app."
          />
        }
      >
        {(rows) => <Table caption="Care Hub" columns={columns} rows={rows} rowKey={(i) => i.id} />}
      </Async>

      {composing && (
        <Compose
          onClose={() => setComposing(false)}
          onCreated={() => {
            setComposing(false);
            after('Draft created.');
          }}
        />
      )}

      <ConfirmDialog
        open={publishing !== null}
        busy={publish.busy}
        onClose={() => setPublishing(null)}
        variant="success"
        title={publishing ? `Publish “${publishing.title}”?` : 'Publish'}
        confirmLabel="Publish"
        consequence={
          <>
            This makes the item <strong>visible to every patient</strong> in the app immediately.
            You are signing it off as clinically accurate.
          </>
        }
        onConfirm={async () => {
          if (!publishing) return;
          try {
            await publish.mutate(publishing.id);
            after('Published.');
          } catch (e) {
            toast.fromError(e);
          }
          setPublishing(null);
        }}
      />
    </>
  );
}

function Compose({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [body, setBody] = useState('');
  const create = useMutation(content.create);

  return (
    <Modal
      open
      onClose={onClose}
      title="New Care Hub item"
      width={620}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={create.busy}
            disabled={!title.trim()}
            onClick={async () => {
              try {
                await create.mutate({
                  title: title.trim(),
                  ...(category.trim() ? { category: category.trim() } : {}),
                  ...(body.trim() ? { body: body.trim() } : {}),
                });
                onCreated();
              } catch (e) {
                toast.fromError(e);
              }
            }}
          >
            Save draft
          </Button>
        </>
      }
    >
      <TextField label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      <TextField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
      <TextArea label="Body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
    </Modal>
  );
}
