import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { notificationTemplates, type NotificationTemplate } from '../../api/admin';
import { useMutation, useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { NotificationHistory } from './notifications/NotificationHistory';
import { SendNotification } from './notifications/SendNotification';
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
  SearchField,
  SelectField,
  StatusBadge,
  Table,
  Tabs,
  TextArea,
  TextField,
  may,
} from '../../ui';

/**
 * Notifications: the wording of every automatic notification (Templates),
 * manual sends to doctors or patients (Send notification) and what has gone
 * out (History). The tab lives in `?tab=`.
 */
/**
 * Template wording (§35, FR-16.3).
 *
 * Both apps take every notification's wording from here and hardcode none of
 * it, so this screen is the only place the copy exists.
 *
 * *** NO NOTIFICATION MAY NAME A DIAGNOSIS. *** That is a product invariant,
 * not a preference, and it is stated beside the editor because a well-meaning
 * edit is the likeliest way to break it. `reset` restores the shipped wording,
 * which is the undo for exactly that mistake.
 */
const TABS = [
  { id: 'templates', label: 'Templates' },
  { id: 'send', label: 'Send notification' },
  { id: 'history', label: 'History' },
] as const;

export function NotificationTemplates({ level }: { level: AdminLevel }) {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get('tab'))?.id ?? 'templates';

  return (
    <>
      <PageHeader
        title="Notifications"
        description="The wording of every automatic notification, manual sends to doctors and patients, and what has gone out."
      />
      <Tabs
        tabs={TABS}
        active={tab}
        onChange={(id) => setParams(id === 'templates' ? {} : { tab: id }, { replace: true })}
      />
      {tab === 'templates' && <TemplatesTab level={level} />}
      {tab === 'send' && <SendNotification />}
      {tab === 'history' && <NotificationHistory />}
    </>
  );
}

/**
 * Who each template goes to. The mock templates carry no audience, so it is
 * held here; unlisted codes are patient-facing.
 */
const AUDIENCE_OF: Record<string, string[]> = {
  consultation_reminder: ['patient', 'doctor'],
  provider_assigned: ['patient', 'doctor'],
};
const audienceOf = (code: string) => AUDIENCE_OF[code] ?? ['patient'];

function TemplatesTab({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const fetcher = useCallback(() => notificationTemplates.list(), []);
  const state = useResource<NotificationTemplate[]>(fetcher, []);
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [resetting, setResetting] = useState<NotificationTemplate | null>(null);
  const [audience, setAudience] = useState('');
  const [search, setSearch] = useState('');

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
      render: (t) => <span className="clamp">{t.body ?? '-'}</span>,
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
      <Notice tone="danger">
        No notification may name a diagnosis. A push arrives on a lock screen a stranger can read -
        this is a clinical-confidentiality rule, not a style preference.
      </Notice>

      <div className="filterBar filterBar--oneLine">
        <SelectField
          label="Audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          options={[
            { value: '', label: 'All' },
            { value: 'patient', label: 'Patient' },
            { value: 'doctor', label: 'Doctor' },
            { value: 'admin', label: 'Admin' },
          ]}
        />
        <SearchField value={search} onSearch={setSearch} placeholder="Search code or title" />
      </div>

      <Async
        state={state}
        resource="notification templates"
        empty={<EmptyState icon="bell" title="No templates registered" />}
      >
        {(all) => {
          const q = search.trim().toLowerCase();
          const rows = all.filter(
            (t) =>
              (!audience || audienceOf(t.code).includes(audience)) &&
              (!q || t.code.toLowerCase().includes(q) || (t.title ?? '').toLowerCase().includes(q)),
          );
          return rows.length === 0 ? (
            <EmptyState icon="bell" title="No templates match" />
          ) : (
            <Table
              caption="Notification templates"
              columns={columns}
              rows={rows}
              rowKey={(t) => t.code}
            />
          );
        }}
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
