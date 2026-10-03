import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { doctors, type CredentialQueueRow } from '../api/admin';
import { useResource } from '../lib/useResource';
import type { AdminLevel } from '../nav';
import {
  Async,
  Button,
  Column,
  EmptyState,
  PageHeader,
  SearchField,
  SelectField,
  StatusBadge,
  Table,
} from '../ui';

/**
 * The credential queue (§17) - clinical governance's home screen.
 *
 * Every provider with documents awaiting a decision, oldest submission first,
 * because how long someone has been waiting matters more than how many are in
 * the list. Opening a row goes straight to that provider's Credentials tab.
 */
export function CredentialQueue({ level }: { level: AdminLevel }) {
  const navigate = useNavigate();
  const fetcher = useCallback(() => doctors.credentialQueue(), []);
  const state = useResource<CredentialQueueRow[]>(fetcher, []);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [order, setOrder] = useState<'oldest' | 'newest'>('oldest');

  const open = (row: CredentialQueueRow) =>
    navigate(`/credentials/${row.doctorId}?tab=credentials`);

  const columns: Column<CredentialQueueRow>[] = [
    {
      key: 'name',
      header: 'Doctor',
      render: (r) => (
        <span className="cellStack">
          <strong>{r.fullName}</strong>
          <small>{r.specialtyName ?? '-'}</small>
        </span>
      ),
    },
    {
      key: 'pending',
      header: 'Awaiting review',
      render: (r) => (
        <StatusBadge
          status={r.pendingDocuments > 0 ? 'pending' : 'approved'}
          label={r.pendingDocuments > 0 ? `${r.pendingDocuments} document(s)` : 'None'}
        />
      ),
    },
    {
      key: 'status',
      header: 'Verification',
      render: (r) => <StatusBadge status={r.verificationStatus} />,
    },
    {
      key: 'waiting',
      header: 'Waiting since',
      render: (r) => (r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '-'),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '110px',
      render: (r) => (
        <span className="rowActions">
          <Button size="sm" variant="secondary" onClick={() => open(r)}>
            Review
          </Button>
        </span>
      ),
    },
  ];

  const visible = (rows: CredentialQueueRow[]) => {
    const q = search.trim().toLowerCase();
    const dir = order === 'oldest' ? 1 : -1;
    return rows
      .filter((r) => !status || r.verificationStatus === status)
      .filter(
        (r) => !q || `${r.fullName} ${r.specialtyName ?? ''}`.toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          dir * (new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime()),
      );
  };

  return (
    <>
      <PageHeader
        title="Document verification"
        description="Doctors with documents awaiting a decision, longest wait first. Reviewing a document is separate from verifying the doctor."
      />

      <div className="filterBar">
        <SearchField value={search} onSearch={setSearch} placeholder="Doctor name or specialty" />
        <SelectField
          label="Verification"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: 'Any status' },
            { value: 'pending', label: 'Pending' },
            { value: 'under_review', label: 'Under review' },
          ]}
        />
        <SelectField
          label="Sort by"
          value={order}
          onChange={(e) => setOrder(e.target.value as 'oldest' | 'newest')}
          options={[
            { value: 'oldest', label: 'Longest waiting' },
            { value: 'newest', label: 'Newest first' },
          ]}
        />
      </div>

      <Async
        state={state}
        resource="the document verification queue"
        empty={
          <EmptyState
            icon="check"
            title="No pending credentials"
            description="Every submitted document has been reviewed."
          />
        }
      >
        {(rows) => {
          const shown = visible(rows);
          return shown.length === 0 ? (
            <EmptyState icon="search" title="No matches" description="Try a different search or status." />
          ) : (
            <Table
              caption="Document verification"
              columns={columns}
              rows={shown}
              rowKey={(r) => r.doctorId}
              onRowClick={open}
              hideChevron
            />
          );
        }}
      </Async>
    </>
  );
}
