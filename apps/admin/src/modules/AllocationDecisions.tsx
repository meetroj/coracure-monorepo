import { useCallback } from 'react';
import { Link } from 'react-router-dom';

import { governance, type AllocationDecision } from '../api/admin';
import { useResource } from '../lib/useResource';
import type { AdminLevel } from '../nav';
import { Async, Column, EmptyState, Notice, PageHeader, Table } from '../ui';

/**
 * Who was assigned, and on what basis (FR-18.9).
 *
 * This is where every override reason from the consultation screen surfaces,
 * which is what makes the reason field there an audit answer rather than
 * paperwork.
 */
export function AllocationDecisions({ level }: { level: AdminLevel }) {
  const fetcher = useCallback(() => governance.allocationDecisions(), []);
  const state = useResource<AllocationDecision[]>(fetcher, []);

  const columns: Column<AllocationDecision>[] = [
    {
      key: 'when',
      header: 'Decided',
      render: (d) => (d.decidedAt ? new Date(d.decidedAt).toLocaleString() : '—'),
    },
    {
      key: 'consultation',
      header: 'Consultation',
      render: (d) => (
        <Link to={`/consultations/${d.consultationId}`}>{d.consultationId}</Link>
      ),
    },
    {
      key: 'provider',
      header: 'Assigned to',
      render: (d) =>
        d.doctorId ? (
          <Link to={`/providers/${d.doctorId}`}>{d.doctorName ?? d.doctorId}</Link>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      key: 'basis',
      header: 'Basis',
      render: (d) => (
        <span className="cellStack">
          <span>{d.overriddenByAdminId ? 'Admin override' : (d.basis ?? 'Automatic')}</span>
          {d.reason && <small>{d.reason}</small>}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Allocation decisions"
        description="Every assignment the platform made, and every one an admin changed — with the reason recorded at the time."
      />

      <Notice tone="info">
        An override with no reason cannot happen: the reason is required at the point of override,
        and it is the text shown here.
      </Notice>

      <Async
        state={state}
        resource="allocation decisions"
        empty={
          <EmptyState
            icon="route"
            title="No allocation decisions recorded"
            description="Nothing has been assigned yet."
          />
        }
      >
        {(rows) => (
          <Table
            caption="Allocation decisions"
            columns={columns}
            rows={rows}
            rowKey={(d) => `${d.consultationId}-${d.decidedAt ?? ''}`}
          />
        )}
      </Async>
    </>
  );
}
