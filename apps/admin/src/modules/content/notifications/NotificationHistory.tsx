import { useState } from 'react';

import { manualNotifications, type HistoryQuery, type SentNotification } from '../../../api/manualNotifications';
import { useResource } from '../../../lib/useResource';
import {
  Async,
  Button,
  Column,
  DefinitionList,
  EmptyState,
  Modal,
  SelectField,
  StatusBadge,
  Table,
  TextField,
} from '../../../ui';

const when = (iso: string) => new Date(iso).toLocaleString();
const audienceLabel = (a: string) => (a === 'doctor' ? 'Doctors' : 'Patients');

/** Every notification that went out — manual sends and automatic template ones. */
export function NotificationHistory() {
  const [query, setQuery] = useState<HistoryQuery>({ audience: '', type: '', status: '', since: '' });
  const [open, setOpen] = useState<SentNotification | null>(null);
  const state = useResource<SentNotification[]>(
    () => manualNotifications.history(query),
    [query.audience, query.type, query.status, query.since],
  );
  const set = (patch: HistoryQuery) => setQuery((q) => ({ ...q, ...patch }));

  const columns: Column<SentNotification>[] = [
    { key: 'at', header: 'Sent', render: (n) => when(n.sentAt) },
    { key: 'aud', header: 'Audience', render: (n) => audienceLabel(n.audience) },
    { key: 'count', header: 'Recipients', align: 'end', render: (n) => n.recipientCount },
    { key: 'title', header: 'Title', render: (n) => <strong>{n.title}</strong> },
    {
      key: 'type',
      header: 'Type',
      render: (n) =>
        n.type === 'manual' ? 'Manual' : (
          <span>
            Automatic: <code>{n.templateCode}</code>
          </span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (n) => (
        <StatusBadge
          status={n.status}
          tone={n.status === 'sent' ? 'positive' : n.status === 'failed' ? 'danger' : 'warning'}
          label={n.status === 'partial' ? 'Partially delivered' : undefined}
        />
      ),
    },
  ];

  return (
    <>
      <div className="filterBar filterBar--oneLine">
        <SelectField
          label="Audience"
          value={query.audience}
          onChange={(e) => set({ audience: e.target.value as HistoryQuery['audience'] })}
          options={[
            { value: '', label: 'All' },
            { value: 'doctor', label: 'Doctors' },
            { value: 'patient', label: 'Patients' },
          ]}
        />
        <SelectField
          label="Type"
          value={query.type}
          onChange={(e) => set({ type: e.target.value as HistoryQuery['type'] })}
          options={[
            { value: '', label: 'All' },
            { value: 'manual', label: 'Manual' },
            { value: 'automatic', label: 'Automatic' },
          ]}
        />
        <SelectField
          label="Status"
          value={query.status}
          onChange={(e) => set({ status: e.target.value as HistoryQuery['status'] })}
          options={[
            { value: '', label: 'All' },
            { value: 'sent', label: 'Sent' },
            { value: 'failed', label: 'Failed' },
            { value: 'partial', label: 'Partially delivered' },
          ]}
        />
        <TextField
          label="Sent since"
          type="date"
          value={query.since}
          onChange={(e) => set({ since: e.target.value })}
        />
      </div>

      <Async
        state={state}
        resource="notification history"
        empty={<EmptyState icon="bell" title="No notifications match" />}
      >
        {(rows) => (
          <Table
            caption="Sent notifications"
            columns={columns}
            rows={rows}
            rowKey={(n) => n.id}
            onRowClick={setOpen}
          />
        )}
      </Async>

      {open && (
        <Modal
          open
          onClose={() => setOpen(null)}
          title={open.title}
          footer={
            <Button variant="ghost" onClick={() => setOpen(null)}>
              Close
            </Button>
          }
        >
          <p>{open.body}</p>
          <DefinitionList
            items={[
              { label: 'Sent', value: when(open.sentAt) },
              { label: 'Audience', value: audienceLabel(open.audience) },
              { label: 'Type', value: open.type === 'manual' ? 'Manual' : `Automatic: ${open.templateCode}` },
              { label: 'Channels', value: open.channels.map((c) => (c === 'push' ? 'Push' : 'In-app')).join(', ') },
              { label: 'Opens', value: open.deepLink ?? 'None' },
              { label: 'Recipients', value: String(open.recipientCount) },
              { label: 'Delivered', value: String(open.delivered) },
              { label: 'Failed', value: String(open.failed) },
            ]}
          />
        </Modal>
      )}
    </>
  );
}
