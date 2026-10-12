import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { doctors } from '../api/admin';
import { LIVE } from '../api/live';
import type { CredentialQueueRow, VerificationStatus } from '../api/types';
import { useResource } from '../lib/useResource';
import { credentialQueue } from '../mock/db';
import type { AdminLevel } from '../nav';
import { Button, ErrorState, StatusBadge, TableSkeleton, skeletonColumns, type Column } from '../ui';
import { ListScreen, type ListTab } from './kit/ListScreen';
import { CATEGORY_LABEL, ProviderAvatar, VERIFICATION_LABEL, VerificationBadge } from './providers/provider';

/**
 * Verification (requirements §20, §21): every provider with their review
 * state, in the six spec statuses, oldest submission first - how long someone
 * has waited matters more than how many are in the list.
 *
 * Opening a row goes to that provider's review: Identity, Qualifications,
 * Professional registration, Experience and Signature, with Approve, Changes
 * required, Reject and Suspend at the top.
 */
const STATUS_ORDER: VerificationStatus[] = ['pending', 'under_review', 'changes_required', 'verified', 'rejected', 'suspended'];

const TABS: ListTab<CredentialQueueRow>[] = STATUS_ORDER.map((s) => ({
  id: s,
  label: VERIFICATION_LABEL[s],
  test: (r) => r.verificationStatus === s,
}));

const oldestFirst = (rows: CredentialQueueRow[]) =>
  [...rows].sort((a, b) => new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime());

/** Live: the whole roster from the backend, with its document counts. Fixtures otherwise. */
export function CredentialQueue({ level }: { level: AdminLevel }) {
  return LIVE ? <LiveQueue level={level} /> : <QueueView level={level} rows={oldestFirst(credentialQueue())} />;
}

function LiveQueue({ level }: { level: AdminLevel }) {
  const fetcher = useCallback(() => doctors.queue(), []);
  const state = useResource<CredentialQueueRow[]>(fetcher, []);
  // The tabs, search and their counts belong to the list, so it stays mounted
  // and only its body is the skeleton.
  if (state.error && !state.data)
    return <ErrorState error={state.error} onRetry={state.reload} resource="providers" />;
  return <QueueView level={level} rows={oldestFirst(state.data ?? [])} loading={state.data === null} />;
}

function QueueView({
  level: _level,
  rows,
  loading = false,
}: {
  level: AdminLevel;
  rows: CredentialQueueRow[];
  loading?: boolean;
}) {
  const navigate = useNavigate();
  const open = (r: CredentialQueueRow) => navigate(`/verification/${r.doctorId}`);

  const columns: Column<CredentialQueueRow>[] = [
    {
      key: 'name',
      header: 'Provider',
      render: (r) => (
        <span className="provCell">
          <ProviderAvatar name={r.fullName} photoUrl={r.photoUrl} />
          <span className="cellStack">
            <strong>{r.fullName}</strong>
            <small>
              {r.category ? CATEGORY_LABEL[r.category] : 'Doctor'} · {r.specialtyName ?? '-'}
            </small>
          </span>
        </span>
      ),
    },
    { key: 'status', header: 'Verification', render: (r) => <VerificationBadge status={r.verificationStatus} /> },
    {
      key: 'pending',
      header: 'Documents awaiting review',
      render: (r) =>
        r.pendingDocuments > 0 ? (
          <StatusBadge status="pending" label={`${r.pendingDocuments} document(s)`} />
        ) : (
          <span className="muted">None</span>
        ),
    },
    { key: 'since', header: 'Submitted', render: (r) => (r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '-') },
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

  return (
    <ListScreen
      caption="Provider verification"
      rows={rows}
      columns={columns}
      rowKey={(r) => r.doctorId}
      tabs={TABS}
      onOpen={open}
      search={(r) => `${r.fullName} ${r.specialtyName ?? ''}`}
      searchPlaceholder="Provider name or specialty"
      emptyIcon="check"
      empty={{ title: 'No providers yet' }}
      loading={loading}
      skeleton={
        <TableSkeleton
          columns={skeletonColumns(columns, { name: 'person', status: 'status', pending: 'status', since: 'date', actions: 'button' })}
        />
      }
    />
  );
}
