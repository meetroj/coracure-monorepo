import { useCallback } from 'react';
import { Link } from 'react-router-dom';

import { governance, type PendingSummary } from '../api/admin';
import { useResource } from '../lib/useResource';
import type { AdminLevel } from '../nav';
import { Async, Column, EmptyState, PageHeader, StatusBadge, Table } from '../ui';

/**
 * Consultations held but not written up (§28).
 *
 * *** SORTED OLDEST FIRST, AND AGE IS THE COLUMN THAT MATTERS. *** The count
 * is not the metric — how long a record has been outstanding is, because the
 * follow-up is a phone call to a named person. The provider is shown for the
 * same reason.
 */

const ageLabel = (row: PendingSummary): { text: string; overdue: boolean } => {
  const hours =
    row.ageHours ??
    (row.completedAt
      ? Math.floor((Date.now() - new Date(row.completedAt).getTime()) / 3_600_000)
      : null);
  if (hours === null) return { text: '—', overdue: false };
  if (hours < 24) return { text: `${hours}h`, overdue: false };
  const days = Math.floor(hours / 24);
  return { text: `${days}d`, overdue: days >= 2 };
};

export function PendingSummaries({ level }: { level: AdminLevel }) {
  const fetcher = useCallback(() => governance.pendingSummaries(), []);
  const state = useResource<PendingSummary[]>(fetcher, []);

  const columns: Column<PendingSummary>[] = [
    {
      key: 'age',
      header: 'Outstanding',
      width: '130px',
      render: (r) => {
        const age = ageLabel(r);
        return (
          <StatusBadge
            status={age.overdue ? 'rejected' : 'pending'}
            label={age.text}
            tone={age.overdue ? 'danger' : 'warning'}
          />
        );
      },
    },
    {
      key: 'doctor',
      header: 'Provider',
      render: (r) =>
        r.doctorId ? (
          <Link to={`/providers/${r.doctorId}`}>{r.doctorName ?? r.doctorId}</Link>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      key: 'consultation',
      header: 'Consultation',
      render: (r) => (
        <Link to={`/consultations/${r.consultationId}`}>
          {r.consultationId.slice(0, 8)}…
        </Link>
      ),
    },
    {
      key: 'completed',
      header: 'Consultation ended',
      render: (r) => (r.completedAt ? new Date(r.completedAt).toLocaleString() : '—'),
    },
  ];

  // Oldest first — the whole point of the screen.
  const oldestFirst = (rows: PendingSummary[]) =>
    [...rows].sort(
      (a, b) => new Date(a.completedAt ?? 0).getTime() - new Date(b.completedAt ?? 0).getTime(),
    );

  return (
    <>
      <PageHeader
        title="Pending case summaries"
        description="Consultations that happened but have not been documented. Longest outstanding first — the provider is blocked from their next instant consult until it is written up."
      />

      <Async
        state={state}
        resource="pending summaries"
        empty={
          <EmptyState
            icon="check"
            title="Nothing outstanding"
            description="Every completed consultation has been written up."
          />
        }
      >
        {(rows) => (
          <Table
            caption="Pending case summaries"
            columns={columns}
            rows={oldestFirst(rows)}
            rowKey={(r) => r.consultationId}
          />
        )}
      </Async>
    </>
  );
}
