import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { support, type Complaint } from '../../api/admin';
import { useResource } from '../../lib/useResource';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Column,
  EmptyState,
  SelectField,
  StatusBadge,
  Table,
  TableSkeleton,
  humanise,
  skeletonColumns,
} from '../../ui';

/**
 * The complaint queue and patient feedback (§40, FR-18.8).
 *
 * Status filter is URL-backed so a working view survives Back and a refresh.
 */

const STATUSES = [
  { value: '', label: 'Any status' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
];

export function Complaints({ level: _level }: { level: AdminLevel }) {
  const [params, setParams] = useSearchParams();
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  return <ComplaintQueue status={params.get('status') ?? ''} onStatus={(st) => setParam('status', st)} />;
}

function ComplaintQueue({
  status,
  onStatus,
}: {
  status: string;
  onStatus: (s: string) => void;
}) {
  const navigate = useNavigate();
  const fetcher = useCallback(() => support.complaints({ status }), [status]);
  const state = useResource<Complaint[]>(fetcher, [status]);

  const columns: Column<Complaint>[] = [
    {
      key: 'subject',
      header: 'Complaint',
      render: (c) => (
        <span className="cellStack">
          <strong>{c.subject ?? humanise(c.category)}</strong>
          <small>{humanise(c.category)}</small>
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'raised',
      header: 'Raised',
      render: (c) => (c.raisedAt ? new Date(c.raisedAt).toLocaleDateString() : '-'),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (c) =>
        c.assignedAdminId ? <StatusBadge status="in_progress" label="Assigned" /> : (
          <span className="muted">Unassigned</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '110px',
      render: (c) => (
        <span className="rowActions">
          <Button size="sm" variant="secondary" onClick={() => navigate(`/support-tickets/${c.id}`)}>
            Open
          </Button>
        </span>
      ),
    },
  ];

  /** Unassigned and open first - the order a handler works in. */
  const ordered = (rows: Complaint[]) =>
    [...rows].sort((a, b) => {
      const rank = (c: Complaint) =>
        c.status === 'open' && !c.assignedAdminId ? 0 : c.status === 'in_progress' ? 1 : 2;
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return new Date(a.raisedAt ?? 0).getTime() - new Date(b.raisedAt ?? 0).getTime();
    });

  return (
    <>
      <div className="filterBar">
        <SelectField
          label="Status"
          options={STATUSES}
          value={status}
          onChange={(e) => onStatus(e.target.value)}
        />
      </div>

      <Async
        state={state}
        resource="complaints"
        skeleton={
          <TableSkeleton
            columns={skeletonColumns(columns, { subject: 'stack', status: 'status', raised: 'date', owner: 'status', actions: 'button' })}
            rows={6}
          />
        }
        empty={
          <EmptyState
            icon="note"
            title={status ? 'No complaints with that status' : 'No complaints'}
            description="Nothing has been raised by a patient."
          />
        }
      >
        {(rows) => (
          <Table
            caption="Complaints"
            columns={columns}
            rows={ordered(rows)}
            rowKey={(c) => c.id}
            onRowClick={(c) => navigate(`/support-tickets/${c.id}`)}
            hideChevron
          />
        )}
      </Async>
    </>
  );
}
