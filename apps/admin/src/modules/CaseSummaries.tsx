import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { summaries, type CaseSummaryRow, type CaseSummaryStatus } from '../api/caseSummaries';
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
  type BadgeTone,
} from '../ui';

/**
 * Case summaries.
 *
 * Summaries are written automatically after each consultation, so this is a
 * browsable record of what was produced and whether it needs a person - not a
 * backlog of missing write-ups. Filters live in the URL so Back, refresh and a
 * pasted link all keep the view.
 *
 * *** THE LIST CARRIES NO CLINICAL CONTENT. *** The patient is initials and a
 * city, and the summary text is shown only when the record is marked as
 * shareable with admins - the platform's de-identification rule.
 */

const STATUS: Record<CaseSummaryStatus, { label: string; tone: BadgeTone }> = {
  generated: { label: 'Generated', tone: 'info' },
  reviewed: { label: 'Reviewed by doctor', tone: 'positive' },
  failed: { label: 'Needs attention', tone: 'danger' },
  awaiting: { label: 'Awaiting generation', tone: 'warning' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  ...(Object.keys(STATUS) as CaseSummaryStatus[]).map((v) => ({ value: v, label: STATUS[v].label })),
];

const RANGES = [
  { value: '', label: 'All time', hours: Infinity },
  { value: 'today', label: 'Today', hours: 24 },
  { value: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { value: '30d', label: 'Last 30 days', hours: 24 * 30 },
];

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '-');

const isFlagged = (r: CaseSummaryRow) => r.status === 'failed' || r.editedAfterGeneration;

const flagReason = (r: CaseSummaryRow) =>
  r.status === 'failed' ? 'Generation failed' : 'Edited after generation';

const StatusPill = ({ status }: { status: CaseSummaryStatus }) => (
  <StatusBadge status={status} label={STATUS[status].label} tone={STATUS[status].tone} />
);

export function CaseSummaries(_props: { level: AdminLevel }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const doctor = params.get('doctor') ?? '';
  const range = params.get('range') ?? '';
  const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest';

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const fetcher = useCallback(() => summaries.list(), []);
  const state = useResource<CaseSummaryRow[]>(fetcher, []);


  const all = useMemo(() => state.data ?? [], [state.data]);
  const doctorOptions = useMemo(() => {
    const seen = new Map<string, string>();
    all.forEach((r) => r.doctorId && seen.set(r.doctorId, r.doctorName ?? r.doctorId));
    return [
      { value: '', label: 'Any doctor' },
      ...[...seen].map(([value, label]) => ({ value, label })),
    ];
  }, [all]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const hours = RANGES.find((r) => r.value === range)?.hours ?? Infinity;
    const cutoff = Date.now() - hours * 3_600_000;
    const rows = all.filter(
      (r) =>
        (!status || r.status === status) &&
        (!doctor || r.doctorId === doctor) &&
        new Date(r.consultationAt).getTime() >= cutoff &&
        (!q ||
          r.referenceCode.toLowerCase().includes(q) ||
          (r.doctorName ?? '').toLowerCase().includes(q)),
    );
    const dir = sort === 'oldest' ? 1 : -1;
    return rows.sort(
      (a, b) => dir * (new Date(a.consultationAt).getTime() - new Date(b.consultationAt).getTime()),
    );
  }, [all, search, status, doctor, range, sort]);

  const filtered = Boolean(search || status || doctor || range);
  const clear = () => setParams({}, { replace: true });

  const columns: Column<CaseSummaryRow>[] = [
    {
      key: 'ref',
      header: 'Reference',
      render: (r) => (
        <span className="cellStack">
          <strong>{r.referenceCode}</strong>
          {isFlagged(r) && (
            <StatusBadge status="flagged" label={`Flagged: ${flagReason(r)}`} tone="warning" />
          )}
        </span>
      ),
    },
    {
      key: 'doctor',
      header: 'Doctor',
      render: (r) => (r.doctorName ? <span style={{ whiteSpace: 'nowrap' }}>{r.doctorName}</span> : <span className="muted">-</span>),
    },
    { key: 'patient', header: 'Patient', render: (r) => r.patientLabel },
    { key: 'service', header: 'Service', render: (r) => r.serviceName },
    { key: 'consulted', header: 'Consultation', render: (r) => when(r.consultationAt) },
    { key: 'generated', header: 'Generated', render: (r) => when(r.generatedAt) },
    { key: 'status', header: 'Status', render: (r) => <StatusPill status={r.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Case summaries"
        description="Summaries are written automatically after each consultation. Browse what was generated."
      />

      <div className="filterBar">
        <SearchField
          value={search}
          onSearch={(next) => setParam('search', next)}
          placeholder="Reference code or doctor"
        />
        <SelectField
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setParam('status', e.target.value)}
        />
        <SelectField
          label="Doctor"
          options={doctorOptions}
          value={doctor}
          onChange={(e) => setParam('doctor', e.target.value)}
        />
        <SelectField
          label="Sort"
          options={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
          ]}
          value={sort}
          onChange={(e) => setParam('sort', e.target.value === 'newest' ? '' : e.target.value)}
        />
        <SelectField
          label="Date"
          options={RANGES.map(({ value, label }) => ({ value, label }))}
          value={range}
          onChange={(e) => setParam('range', e.target.value)}
        />
        {filtered && (
          <Button variant="ghost" icon="close" onClick={clear}>
            Clear
          </Button>
        )}
      </div>

      <Async
        state={state}
        resource="case summaries"
        empty={
          <EmptyState
            icon="clipboard"
            title="No case summaries yet"
            description="Summaries appear here once consultations finish."
          />
        }
      >
        {() =>
          visible.length === 0 ? (
            <EmptyState
              icon="clipboard"
              title="No case summaries match these filters"
              description="Try a wider date range, or clear the filters."
              action={
                <Button variant="secondary" onClick={clear}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              <p className="muted" aria-live="polite">
                Showing {visible.length} of {all.length}
              </p>
              <Table
                caption="Case summaries"
                columns={columns}
                rows={visible}
                rowKey={(r) => r.id}
                onRowClick={(r) => navigate(`/case-summaries/${r.id}`)}
              />
            </>
          )
        }
      </Async>
    </>
  );
}
