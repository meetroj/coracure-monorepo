import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { doctors, type CredentialQueueRow } from '../api/admin';
import { useResource } from '../lib/useResource';
import type { AdminLevel } from '../nav';
import { Async, Button, Column, EmptyState, PageHeader, StatusBadge, Table } from '../ui';

/**
 * The credential queue (§17) — clinical governance's home screen.
 *
 * Every provider with documents awaiting a decision, oldest submission first,
 * because how long someone has been waiting matters more than how many are in
 * the list. Opening a row goes straight to that provider's Credentials tab.
 */
export function CredentialQueue({ level }: { level: AdminLevel }) {
  const navigate = useNavigate();
  const fetcher = useCallback(() => doctors.credentialQueue(), []);
  const state = useResource<CredentialQueueRow[]>(fetcher, []);

  const open = (row: CredentialQueueRow) =>
    navigate(`/providers/${row.doctorId}?tab=credentials`);

  const columns: Column<CredentialQueueRow>[] = [
    {
      key: 'name',
      header: 'Provider',
      render: (r) => (
        <span className="cellStack">
          <strong>{r.fullName}</strong>
          <small>{r.specialtyName ?? '—'}</small>
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
      render: (r) => (r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'),
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

  const sorted = (rows: CredentialQueueRow[]) =>
    [...rows].sort(
      (a, b) => new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime(),
    );

  return (
    <>
      <PageHeader
        title="Credential queue"
        description="Providers with documents awaiting a decision, longest wait first. Reviewing a document is separate from verifying the provider."
      />

      <Async
        state={state}
        resource="the credential queue"
        empty={
          <EmptyState
            icon="check"
            title="No pending credentials"
            description="Every submitted document has been reviewed."
          />
        }
      >
        {(rows) => (
          <Table
            caption="Credential queue"
            columns={columns}
            rows={sorted(rows)}
            rowKey={(r) => r.doctorId}
            onRowClick={open}
          />
        )}
      </Async>
    </>
  );
}
