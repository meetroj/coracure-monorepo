import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { patients, type PatientStatus, type PatientSummary } from '../../api/patients';
import { useResource } from '../../lib/useResource';
import type { AdminLevel } from '../../nav';
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
} from '../../ui';

/**
 * The patient directory.
 *
 * Search and filters live in the URL, like the provider list, so Back and
 * refresh keep them. The admin sees logistics only — never clinical content.
 */

const PAGE = 10;

const STATUSES = [
  { value: '', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending_deletion', label: 'Pending deletion' },
];

const COMPLAINT = [
  { value: '', label: 'Any' },
  { value: 'true', label: 'Has open complaint' },
];

const FOLLOW_UP = [
  { value: '', label: 'Any' },
  { value: 'true', label: 'Has active follow-up' },
];

const STATUS_TONE = {
  active: 'positive',
  inactive: 'neutral',
  pending_deletion: 'warning',
} as const;

export const PatientStatusBadge = ({ status }: { status: PatientStatus }) => (
  <StatusBadge status={status} tone={STATUS_TONE[status]} />
);

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

export function Patients(_props: { level: AdminLevel }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [limit, setLimit] = useState(PAGE);

  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const hasOpenComplaint = params.get('hasOpenComplaint') ?? '';
  const hasActiveFollowUp = params.get('hasActiveFollowUp') ?? '';

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setLimit(PAGE);
  };
  const clear = () => {
    setParams({}, { replace: true });
    setLimit(PAGE);
  };

  const fetcher = useCallback(
    () => patients.list({ search, status, hasOpenComplaint, hasActiveFollowUp, limit }),
    [search, status, hasOpenComplaint, hasActiveFollowUp, limit],
  );
  const state = useResource(fetcher, [search, status, hasOpenComplaint, hasActiveFollowUp, limit]);

  const filtered = Boolean(search || status || hasOpenComplaint || hasActiveFollowUp);

  const columns: Column<PatientSummary>[] = [
    {
      key: 'name',
      header: 'Patient',
      render: (p) => (
        <span className="row">
          <span className="avatar" aria-hidden="true">
            {initials(p.fullName)}
          </span>
          <span className="cellStack">
            {/* A real link, so the row is reachable and openable by keyboard. */}
            <Link
              to={`/patients/${p.id}`}
              onClick={(e) => e.stopPropagation()}
              style={{ fontWeight: 600 }}
            >
              {p.fullName}
            </Link>
            <small>{p.referenceCode}</small>
          </span>
        </span>
      ),
    },
    { key: 'mobile', header: 'Mobile', render: (p) => p.mobileNumber },
    { key: 'agegender', header: 'Age / gender', render: (p) => `${p.age} · ${p.gender}` },
    { key: 'region', header: 'Region', render: (p) => p.region },
    {
      key: 'count',
      header: 'Consultations',
      align: 'end',
      render: (p) => p.consultationCount,
    },
    {
      key: 'last',
      header: 'Last consultation',
      render: (p) =>
        p.lastConsultationAt ? (
          new Date(p.lastConsultationAt).toLocaleDateString()
        ) : (
          <span className="muted">None</span>
        ),
    },
    { key: 'status', header: 'Status', render: (p) => <PatientStatusBadge status={p.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Patients"
        description="Who is on the platform and where they stand. Logistics and status only — clinical content is not shown here."
      />

      <div className="filterBar">
        <SearchField
          value={search}
          onSearch={(next) => setParam('search', next)}
          placeholder="Name, mobile or patient ID"
        />
        <SelectField
          label="Status"
          options={STATUSES}
          value={status}
          onChange={(e) => setParam('status', e.target.value)}
        />
        <SelectField
          label="Complaints"
          options={COMPLAINT}
          value={hasOpenComplaint}
          onChange={(e) => setParam('hasOpenComplaint', e.target.value)}
        />
        <SelectField
          label="Follow-up"
          options={FOLLOW_UP}
          value={hasActiveFollowUp}
          onChange={(e) => setParam('hasActiveFollowUp', e.target.value)}
        />
        {filtered && (
          <Button variant="ghost" icon="close" onClick={clear}>
            Clear
          </Button>
        )}
      </div>

      <Async state={state} resource="patients">
        {({ rows, total }) =>
          rows.length === 0 ? (
            <EmptyState
              icon="users"
              title={filtered ? 'No patients match these filters' : 'No patients yet'}
              description={
                filtered ? 'Try a different name or number, or clear the filters.' : undefined
              }
              action={
                filtered ? (
                  <Button variant="secondary" onClick={clear}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <Table
                caption="Patients, most recently active first"
                columns={columns}
                rows={rows}
                rowKey={(p) => p.id}
                onRowClick={(p) => navigate(`/patients/${p.id}`)}
              />
              <div className="listFooter">
                <p className="muted">
                  Showing {rows.length} of {total}
                </p>
                {rows.length < total && (
                  <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                    Show more
                  </Button>
                )}
              </div>
            </>
          )
        }
      </Async>
    </>
  );
}
