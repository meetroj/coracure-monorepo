import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { API_BASE } from '../../api/http';
import { compliance, type AuditEntry } from '../../api/admin';
import { useResource } from '../../lib/useResource';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Column,
  EmptyState,
  PageHeader,
  SelectField,
  StatusBadge,
  Table,
  TextField,
  humanise,
} from '../../ui';

/**
 * The audit log (§41).
 *
 * Two things this screen must be honest about, because being quietly wrong
 * about either is worse than not having the screen:
 *
 *  1. *** THE ROWS YOU SEE DEPEND ON YOUR LEVEL. *** The backend narrows the
 *     entity types each level may read, so a content editor never sees the
 *     trail of a clinical record. If the screen implied it was showing the
 *     whole log, an admin would conclude an event did not happen.
 *
 *  2. *** SEARCHING THE LOG IS ITSELF AUDITED. *** Reading who saw what is a
 *     privileged act. Saying so changes how the feature gets used, which is
 *     the point of saying it.
 */

const ACTIONS = [
  { value: '', label: 'Any action' },
  { value: 'create', label: 'Create' },
  { value: 'read', label: 'Read' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'export', label: 'Export' },
  { value: 'login', label: 'Login' },
  { value: 'verify', label: 'Verify' },
  { value: 'webhook', label: 'Webhook' },
];

const ACTORS = [
  { value: '', label: 'Any actor' },
  { value: 'admin', label: 'Admin' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'patient', label: 'Patient' },
  { value: 'system', label: 'System' },
];

export function AuditLog({ level }: { level: AdminLevel }) {
  const [params, setParams] = useSearchParams();

  const q = {
    actorType: params.get('actorType') ?? '',
    action: params.get('action') ?? '',
    entityType: params.get('entityType') ?? '',
    entityId: params.get('entityId') ?? '',
    consultationId: params.get('consultationId') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
  };

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const fetcher = useCallback(
    () =>
      compliance.audit({
        actorType: q.actorType || undefined,
        action: q.action || undefined,
        entityType: q.entityType || undefined,
        entityId: q.entityId || undefined,
        consultationId: q.consultationId || undefined,
        from: q.from || undefined,
        to: q.to || undefined,
        limit: 200,
      }),
    [q.actorType, q.action, q.entityType, q.entityId, q.consultationId, q.from, q.to],
  );
  const state = useResource<AuditEntry[]>(fetcher, [
    q.actorType,
    q.action,
    q.entityType,
    q.entityId,
    q.consultationId,
    q.from,
    q.to,
  ]);

  const columns: Column<AuditEntry>[] = [
    {
      key: 'when',
      header: 'When',
      width: '190px',
      render: (e) => {
        const at = e.at ?? e.createdAt;
        return at ? new Date(at).toLocaleString() : '—';
      },
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (e) => (
        <span className="cellStack">
          <span>{e.actorType ? humanise(e.actorType) : '—'}</span>
          {e.actorId && <small>{e.actorId.slice(0, 8)}…</small>}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (e) => (e.action ? <StatusBadge status={e.action} tone="neutral" /> : '—'),
    },
    {
      key: 'entity',
      header: 'Entity',
      render: (e) => (
        <span className="cellStack">
          <span>{e.entityType ? humanise(e.entityType) : '—'}</span>
          {e.entityId && <small>{e.entityId.slice(0, 12)}…</small>}
        </span>
      ),
    },
  ];

  const exportHref = `${API_BASE}/admin/compliance/audit/export?${new URLSearchParams(
    Object.entries(q).filter(([, v]) => v) as [string, string][],
  ).toString()}`;

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Who did what, and when."
      />

      <div className="filterBar filterBar--oneLine">
        <SelectField
          label="Actor"
          options={ACTORS}
          value={q.actorType}
          onChange={(e) => setParam('actorType', e.target.value)}
        />
        <SelectField
          label="Action"
          options={ACTIONS}
          value={q.action}
          onChange={(e) => setParam('action', e.target.value)}
        />
        <TextField
          label="Entity type"
          value={q.entityType}
          onChange={(e) => setParam('entityType', e.target.value)}
        />
        <TextField
          label="From"
          type="date"
          value={q.from}
          onChange={(e) => setParam('from', e.target.value)}
        />
        <TextField
          label="To"
          type="date"
          value={q.to}
          onChange={(e) => setParam('to', e.target.value)}
        />
        <a href={exportHref} download>
          <Button variant="primary" icon="download">
            Export
          </Button>
        </a>
      </div>

      <Async
        state={state}
        resource="audit entries"
        empty={
          <EmptyState
            icon="audit"
            title="No matching entries"
            description="Either nothing matches these filters, or the matching entries are of a type your role cannot read."
          />
        }
      >
        {(rows) => (
          <Table
            caption="Audit log"
            columns={columns}
            rows={rows}
            rowKey={(e, ) => e.id ?? `${e.at ?? e.createdAt}-${e.action}-${e.entityId}`}
          />
        )}
      </Async>
    </>
  );
}
