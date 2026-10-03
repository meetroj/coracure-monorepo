import { useCallback } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import {
  consultationsList,
  type ConsultationsPage,
  type ListedConsultation,
} from '../../api/consultationsList';
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
  TextField,
  humanise,
} from '../../ui';

/**
 * The consultation list (§23).
 *
 * Every filter lives in the URL, so Back and refresh keep them. The detail
 * screen reads the query we hand it through router state to link back here
 * with the same filters. The reference cell is a real link, which is what makes
 * a row reachable by keyboard; the row click is the mouse convenience on top.
 */

const PAGE = 15;

const STATUSES = [
  { value: '', label: 'Any status' },
  ...[
    'pending_payment',
    'scheduled',
    'awaiting_doctor',
    'in_progress',
    'awaiting_documentation',
    'completed',
    'cancelled',
    'no_show',
    'expired',
  ].map((value) => ({ value, label: humanise(value) })),
];

const MODES = [
  { value: '', label: 'Any mode' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'instant', label: 'Instant' },
];

const isoDay = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const CHIPS = [
  { label: 'Today', from: () => isoDay(0), to: () => isoDay(0) },
  { label: 'Next 7 days', from: () => isoDay(0), to: () => isoDay(7) },
  { label: 'Last 7 days', from: () => isoDay(-7), to: () => isoDay(0) },
  { label: 'All', from: () => '', to: () => '' },
];

const REFERENCE = /^CC-\d{4}-\d{5}$/i;

export function Consultations({ level: _level }: { level: AdminLevel }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const mode = params.get('mode') ?? '';
  const doctorId = params.get('doctorId') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const limit = Math.max(PAGE, Number(params.get('limit')) || PAGE);

  const setMany = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    // Any filter change starts paging over; `replace` keeps history clean.
    if (!('limit' in changes)) next.delete('limit');
    setParams(next, { replace: true });
  };

  const fetcher = useCallback(
    () => consultationsList.list({ search, status, mode, doctorId, from, to, limit }),
    [search, status, mode, doctorId, from, to, limit],
  );
  const state = useResource<ConsultationsPage>(fetcher, [search, status, mode, doctorId, from, to, limit]);

  const filtered = Boolean(search || status || mode || doctorId || from || to);
  const clear = () => setParams({}, { replace: true });

  // The query string rides along so the detail page can return to this view.
  const detailState = { fromList: location.search };
  const open = (c: ListedConsultation) =>
    navigate(`/consultations/${encodeURIComponent(c.id)}`, { state: detailState });

  /** Enter on an exact reference code jumps straight to it. */
  const jump = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const value = (e.target as HTMLInputElement).value?.trim();
    if (e.key !== 'Enter' || !value || !REFERENCE.test(value)) return;
    void consultationsList.list({ search: value }).then((page) => {
      const hit = page.items.find((c) => c.referenceCode?.toLowerCase() === value.toLowerCase());
      if (hit) open(hit);
    });
  };

  const columns: Column<ListedConsultation>[] = [
    {
      key: 'ref',
      header: 'Reference',
      render: (c) => (
        <Link
          to={`/consultations/${encodeURIComponent(c.id)}`}
          state={detailState}
          onClick={(e) => e.stopPropagation()}
        >
          <strong>{c.referenceCode ?? c.id}</strong>
        </Link>
      ),
    },
    { key: 'patient', header: 'Patient', render: (c) => c.patientName },
    { key: 'doctor', header: 'Doctor', render: (c) => c.doctorName ?? <span className="muted">Unassigned</span> },
    { key: 'service', header: 'Service', render: (c) => c.serviceName ?? '-' },
    {
      key: 'when',
      header: 'Scheduled',
      render: (c) => (c.startsAt ? new Date(c.startsAt).toLocaleString() : '-'),
    },
    {
      key: 'mode',
      header: 'Mode',
      render: (c) => (
        <span className="cellStack">
          <span>{c.mode ? humanise(c.mode) : '-'}</span>
          <small>{humanise(c.channel)}</small>
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    { key: 'payment', header: 'Payment', render: (c) => <StatusBadge status={c.paymentStatus} /> },
  ];

  return (
    <>
      <PageHeader
        title="Consultations"
        description="Every consultation, newest first. Open one to see its assignment, evidence and audit trail."
      />

      {/* Search gets a row of its own; the filters sit on the line below. */}
      <div className="filterBar filterBar--search">
        {/* Enter on a full reference code opens it directly. */}
        <div onKeyDown={jump}>
          <SearchField
            value={search}
            onSearch={(next) => setMany({ search: next })}
            placeholder="Reference, patient or doctor"
          />
        </div>
      </div>

      <div className="filterBar filterBar--oneLine">
        <SelectField
          label="Status"
          options={STATUSES}
          value={status}
          onChange={(e) => setMany({ status: e.target.value })}
        />
        <SelectField
          label="Mode"
          options={MODES}
          value={mode}
          onChange={(e) => setMany({ mode: e.target.value })}
        />
        <SelectField
          label="Doctor"
          options={[
            { value: '', label: 'Any doctor' },
            ...(state.data?.doctors ?? []).map((d) => ({ value: d.id, label: d.name })),
          ]}
          value={doctorId}
          onChange={(e) => setMany({ doctorId: e.target.value })}
        />
        <SelectField
          label="Quick range"
          options={[
            // Only present while the From/To dates match no preset.
            ...(CHIPS.some((c) => c.from() === from && c.to() === to)
              ? []
              : [{ value: 'custom', label: 'Custom dates' }]),
            ...CHIPS.map((c) => ({ value: c.label, label: c.label === 'All' ? 'All dates' : c.label })),
          ]}
          value={CHIPS.find((c) => c.from() === from && c.to() === to)?.label ?? 'custom'}
          onChange={(e) => {
            const chip = CHIPS.find((c) => c.label === e.target.value);
            if (chip) setMany({ from: chip.from(), to: chip.to() });
          }}
        />
        <TextField
          label="From"
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => setMany({ from: e.target.value })}
        />
        <TextField
          label="To"
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => setMany({ to: e.target.value })}
        />
        {filtered && (
          <Button variant="ghost" icon="close" onClick={clear}>
            Clear
          </Button>
        )}
      </div>

      <Async state={state} resource="consultations" skeletonRows={8}>
        {(page) =>
          page.items.length === 0 ? (
            <EmptyState
              icon="inbox"
              title={filtered ? 'No consultations match these filters' : 'No consultations yet'}
              description={
                filtered
                  ? 'Try a wider date range, another status, or clear the search.'
                  : 'Consultations appear here as patients book.'
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
                caption="Consultations"
                columns={columns}
                rows={page.items}
                rowKey={(c) => c.id}
                onRowClick={open}
              />
              <div className="listFooter">
                <p className="muted" role="status">
                Showing {page.items.length} of {page.matched}
                {filtered ? ` (${page.total} in total)` : ''}
              </p>
                {page.items.length < page.matched && (
                  <Button
                    variant="secondary"
                    onClick={() => setMany({ limit: String(limit + PAGE) })}
                  >
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
