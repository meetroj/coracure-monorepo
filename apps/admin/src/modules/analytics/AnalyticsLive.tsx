import { useCallback, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  RANGES,
  analytics,
  changeLabel,
  customProblem,
  followUpCompletion,
  labReportsCompleted,
  percentLabel,
  providerCancellation,
  providerTotals,
  rateLabel,
  type AnalyticsFilters,
  type Consultations,
  type Envelope,
  type Financial,
  type FollowUpFigures,
  type Kpi,
  type Lab,
  type Overview,
  type Patients,
  type ProviderQuality,
  type Providers,
  type Soft,
} from '../../api/liveAnalytics';
import type { LiveSummary } from '../../api/liveDashboard';
import { specialties } from '../../api/liveProviders';
import { useResource } from '../../lib/useResource';
import { LAB_SERVICES_ENABLED, type AdminLevel } from '../../nav';
import { Async, Button, Card, Notice, SelectField, Table, TextField, humanise, type Column } from '../../ui';
import { inr } from '../kit/format';
import { Bars, Figure } from '../kit/Stat';

/**
 * Analytics against the real backend, laid out as the spec has it
 * (requirements section 71-77): the same pages, the same figures, in the same
 * order, under one filter bar - date range, provider category, specialty and
 * service type.
 *
 * Every number is counted by the backend for the window asked. A figure the
 * backend does not measure is shown as "Not reported" with the reason, never as
 * zero; a figure the viewer's role may not read says so.
 */

type Kind = 'overview' | 'consultations' | 'providers' | 'patients' | 'lab' | 'financial';

const CATEGORIES = [
  { value: '', label: 'All categories' },
  { value: 'medical', label: 'Medical' },
  { value: 'super_specialty', label: 'Super-specialty' },
  { value: 'paramedical', label: 'Paramedical' },
  { value: 'veterinary', label: 'Veterinary' },
];

const SERVICE_TYPES = [
  { value: '', label: 'All services' },
  { value: 'consultation', label: 'Consultations' },
  ...(LAB_SERVICES_ENABLED ? [{ value: 'lab', label: 'Lab Services' }] : []),
];

const num = (n: number | null | undefined) => (n === null || n === undefined ? '-' : n.toLocaleString('en-IN'));
const mins = (n: number | null | undefined) => (n === null || n === undefined ? '-' : `${n} min`);
const hours = (n: number | null | undefined) => (n === null || n === undefined ? '-' : `${n} h`);

/* --------------------------------- filters --------------------------------- */

function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters: AnalyticsFilters = {
    range: params.get('range') ?? '30',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    category: params.get('category') ?? '',
    specialtyId: params.get('specialty') ?? '',
    serviceType: params.get('service') ?? '',
  };
  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };
  const filtered = Boolean(
    filters.category || filters.specialtyId || filters.serviceType || filters.range !== '30',
  );
  return { filters, set, clear: () => setParams({}, { replace: true }), filtered };
}

function FilterBar() {
  const { filters, set, clear, filtered } = useFilters();
  const list = useResource(useCallback(() => specialties.list(), []), []);
  const problem = customProblem(filters);
  return (
    <Card title="Filters">
      <div className="formGrid">
        <SelectField label="Date range" value={filters.range} options={RANGES} onChange={(e) => set({ range: e.target.value, from: '', to: '' })} />
        {filters.range === 'custom' && (
          <>
            <TextField label="From" type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} />
            <TextField label="To" type="date" value={filters.to} error={problem ?? undefined} onChange={(e) => set({ to: e.target.value })} />
          </>
        )}
        <SelectField label="Provider category" value={filters.category} options={CATEGORIES} onChange={(e) => set({ category: e.target.value })} />
        <SelectField
          label="Specialty"
          value={filters.specialtyId}
          disabled={list.loading}
          options={[
            { value: '', label: list.loading ? 'Loading…' : 'All specialties' },
            ...(list.data ?? []).map((s) => ({ value: s.id, label: s.name })),
          ]}
          onChange={(e) => set({ specialty: e.target.value })}
        />
        <SelectField label="Service type" value={filters.serviceType} options={SERVICE_TYPES} onChange={(e) => set({ service: e.target.value })} />
      </div>
      {filtered && (
        <div className="formActions">
          <Button variant="ghost" onClick={clear}>
            Clear filters
          </Button>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------- primitives -------------------------------- */

const Section = ({ title, children, note }: { title: string; children: ReactNode; note?: string }) => (
  <Card title={title}>
    {note && <p className="muted small">{note}</p>}
    <div className="dcards">{children}</div>
  </Card>
);

/** A figure with how it moved against the window before it. */
function KpiFig({ label, k, money, suffix }: { label: string; k: Kpi<number | null>; money?: boolean; suffix?: string }) {
  const value = k.value;
  const shown = value === null ? '-' : money ? inr(value) : `${num(value)}${suffix ?? ''}`;
  const change = changeLabel(k);
  const before = k.previous === null ? null : money ? inr(k.previous) : num(k.previous);
  return <Figure label={label} value={shown} sub={change ? `${change} vs ${before} before` : before ? `${before} before` : undefined} />;
}

/** What the backend does not measure. Never a zero. */
const NotReported = ({ label, why }: { label: string; why: string }) => <Figure label={label} value="Not reported" sub={why} />;

/** What a secondary read could not give: refused for the role, or failed. */
function Unavailable({ label, s }: { label: string; s: Soft<unknown> }) {
  return <Figure label={label} value="Not available" sub={s.ok ? undefined : s.status === 403 ? 'Your role cannot read this.' : 'Could not be read.'} />;
}

function Header({ r }: { r: Envelope }) {
  const applied = r.filters.ignored;
  return (
    <>
      <p className="muted small">
        {new Date(r.range.from).toLocaleDateString()} to {new Date(r.range.to).toLocaleDateString()}, by {r.range.granularity}.
      </p>
      {applied.length > 0 && (
        <Notice tone="info">This report does not apply: {applied.map(humanise).join(', ').toLowerCase()}.</Notice>
      )}
    </>
  );
}

const series = (rows: { date: string }[], pick: (r: never) => number) =>
  rows.map((r) => ({ label: r.date, value: pick(r as never) }));

const LabOff = () => (
  <Figure label="Lab Services" value="Switched off" sub="No lab orders are taken, so there is nothing to count." />
);

/* ---------------------------- 72. Analytics overview ---------------------------- */

function OverviewBody({
  r,
  summary,
  lab,
}: {
  r: Overview;
  summary: Soft<LiveSummary>;
  lab: Soft<Lab> | null;
}) {
  const k = r.kpis;
  const s = summary.ok ? summary.data : null;
  return (
    <div className="stack">
      <Header r={r} />
      <Section title="Patients">
        {s?.patients ? <Figure label="Registered patients" value={num(s.patients.total)} /> : <Unavailable label="Registered patients" s={summary} />}
        <KpiFig label="New patients" k={k.newPatients} />
        {s?.patients ? (
          <Figure label="Returning patients" value={num(s.patients.returning)} sub="Patients who have come back" />
        ) : (
          <Unavailable label="Returning patients" s={summary} />
        )}
      </Section>

      <Section title="Providers">
        {s?.providers ? <Figure label="Providers" value={num(s.providers.total)} /> : <Unavailable label="Providers" s={summary} />}
        {s?.providers ? <Figure label="Active (verified and listed)" value={num(s.providers.listed)} /> : <Unavailable label="Active providers" s={summary} />}
        {s?.providers ? <Figure label="Available now" value={num(s.providers.availableNow)} /> : <Unavailable label="Available now" s={summary} />}
        <KpiFig label="Newly verified" k={k.newProvidersVerified} />
      </Section>

      <Section title="Consultations">
        <KpiFig label="Appointments requested" k={k.consultationsRequested} />
        <KpiFig label="Completed" k={k.consultationsCompleted} />
        <KpiFig label="Cancelled" k={k.consultationsCancelled} />
        <KpiFig label="Average rating" k={k.averageRating} />
      </Section>

      <Section title="Lab Services">
        {lab === null ? (
          <LabOff />
        ) : lab.ok ? (
          <>
            <Figure label="Lab orders" value={num(lab.data.totals.orders)} />
            <Figure label="Completed" value={num(lab.data.totals.completed)} />
            <Figure label="Cancelled" value={num(lab.data.totals.cancelled)} />
            <Figure label="Diagnostic revenue" value={inr(lab.data.totals.revenueInr)} />
          </>
        ) : (
          <Unavailable label="Lab Services" s={lab} />
        )}
      </Section>

      <Section title="Financial activity">
        <KpiFig label="Revenue collected" k={k.revenueCollected} money />
        <KpiFig label="Refunds" k={k.refunds} money />
        {s?.finance ? (
          <Figure label="Provider payouts still owed" value={inr(s.finance.payoutsPending.amountInr)} sub={`${num(s.finance.payoutsPending.count)} to transfer`} />
        ) : (
          <Unavailable label="Provider payouts still owed" s={summary} />
        )}
      </Section>

      <Section title="Support">
        <KpiFig label="Tickets opened" k={k.supportTicketsOpened} />
        <KpiFig label="Complaints opened" k={k.complaintsOpened} />
      </Section>

      <Card title="Appointments requested per day">
        <Bars rows={series(r.series.consultations, (x: { requested: number }) => x.requested)} />
      </Card>
      <Card title="Revenue collected per day">
        <Bars rows={series(r.series.revenue, (x: { collected: number }) => x.collected)} />
      </Card>
    </div>
  );
}

/* --------------------------- 73. Consultation analytics --------------------------- */

function ConsultationsBody({
  r,
  providers,
  patients,
  gov,
}: {
  r: Consultations;
  providers: Soft<Providers>;
  patients: Soft<Patients>;
  gov: Soft<{ followUp: FollowUpFigures }>;
}) {
  const heat = r.heatGrid;
  const totals = providers.ok ? providerTotals(providers.data.quality) : null;
  const follow = gov.ok ? followUpCompletion(gov.data.followUp) : null;
  return (
    <div className="stack">
      <Header r={r} />
      <Section title="Appointments">
        <KpiFig label="Total appointments" k={r.kpis.requested} />
        <KpiFig label="Completed consultations" k={r.kpis.completed} />
        <KpiFig label="Cancelled consultations" k={r.kpis.cancelled} />
        {totals ? (
          <Figure
            label="Appointment acceptance rate"
            value={rateLabel(totals.acceptanceRate)}
            sub={`${num(totals.accepted)} accepted of ${num(totals.offered)} offered${totals.complete ? '' : ` (top ${totals.providers} providers)`}`}
          />
        ) : (
          <Unavailable label="Appointment acceptance rate" s={providers} />
        )}
        {patients.ok ? (
          <Figure
            label="Repeat consultations"
            value={num(patients.data.kpis.returningPatientConsultations.value)}
            sub={`${rateLabel(patients.data.repeatPatients.rate)} of patients came back`}
          />
        ) : (
          <Unavailable label="Repeat consultations" s={patients} />
        )}
        {follow ? (
          <Figure
            label="Follow-up completion"
            value={rateLabel(follow.rate)}
            sub={`${num(follow.completed)} of ${num(follow.total)} follow-up plans completed`}
          />
        ) : (
          <Unavailable label="Follow-up completion" s={gov} />
        )}
      </Section>

      <Card title="Specialty-wise volume">
        <Bars rows={r.bySpecialty.map((s) => ({ label: `${s.name} (${percentLabel(s.percent)})`, value: s.requested }))} />
      </Card>
      <Card title="Provider-category volume">
        <Bars rows={r.byCategory.map((c) => ({ label: `${humanise(c.key)} (${percentLabel(c.percent)})`, value: c.requested }))} />
      </Card>

      <Section title="Consultation duration" note="Measured on calls that started and ended.">
        <Figure label="Average consultation duration" value={mins(r.duration.actual.averageMinutes)} sub={`${num(r.duration.actual.sampleSize)} calls measured`} />
        <Figure label="Median consultation duration" value={mins(r.duration.actual.medianMinutes)} />
        <Figure label="Slowest 10%" value={mins(r.duration.actual.p90Minutes)} />
        <Figure label="Planned length, average" value={mins(r.duration.plannedAverageMinutes)} />
      </Section>

      <h2 className="subhead">More detail</h2>
      <Card title="Where they stand now">
        <Bars rows={r.statusBreakdown.map((s) => ({ label: `${humanise(s.status)} (${percentLabel(s.percent)})`, value: s.count }))} />
      </Card>
      <Card title="Funnel">
        <Bars rows={r.funnel.stages.map((s) => ({ label: `${s.label} (${percentLabel(s.percentOfRequested)})`, value: s.count }))} />
      </Card>
      <Card title="By mode and channel">
        <Bars rows={[...r.byMode, ...r.byChannel].map((m) => ({ label: `${humanise(m.key)} (${percentLabel(m.percent)})`, value: m.requested }))} />
      </Card>
      <Section title="No-shows and rescheduling">
        <Figure label="No-show rate" value={rateLabel(r.noShow.rate)} sub={`${num(r.noShow.count)} of ${num(r.noShow.attended + r.noShow.count)}`} />
        <Figure label="Reschedule rate" value={rateLabel(r.reschedule.rate)} sub={`${num(r.reschedule.count)} of ${num(r.reschedule.requested)}`} />
      </Section>
      <Card title={`Cancellations (${num(r.cancellations.total)})`}>
        <Bars rows={r.cancellations.byParty.map((p) => ({ label: `${humanise(p.party)} (${percentLabel(p.percent)})`, value: p.count }))} />
        {r.cancellations.topReasons.length > 0 && (
          <>
            <h3 className="subhead">Top reasons</h3>
            <Bars rows={r.cancellations.topReasons.map((x) => ({ label: x.reason, value: x.count }))} />
          </>
        )}
        <p className="muted small">Groups under {r.cancellations.minimumGroupSize} are not broken out, so one patient cannot be recognised.</p>
      </Card>
      <Card title={`Busiest times (${heat.timeZone})`}>
        <p className="muted small">{heat.basis}</p>
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Day</th>
                {Array.from({ length: 24 }, (_, h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heat.matrix.map((row, d) => (
                <tr key={d}>
                  <th scope="row">{heat.weekdays[d]}</th>
                  {row.map((n, h) => (
                    <td key={h} style={{ opacity: heat.max > 0 ? 0.25 + (n / heat.max) * 0.75 : 0.25 }}>
                      {n || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ----------------------------- 74. Provider analytics ----------------------------- */

function ProvidersBody({
  r,
  consultations,
  gov,
}: {
  r: Providers;
  consultations: Soft<Consultations>;
  gov: Soft<{ followUp: FollowUpFigures }>;
}) {
  const t = providerTotals(r.quality);
  const cancelled = consultations.ok ? providerCancellation(consultations.data) : null;
  const scope = t.complete ? undefined : `Top ${t.providers} of ${num(r.quality.total)} providers`;
  const columns: Column<ProviderQuality>[] = [
    { key: 'name', header: 'Provider', render: (p) => <strong>{p.fullName}</strong> },
    { key: 'specialty', header: 'Specialty', render: (p) => p.specialty?.name ?? '-' },
    { key: 'offered', header: 'Offered', align: 'end', render: (p) => num(p.offered) },
    { key: 'accepted', header: 'Accepted', align: 'end', render: (p) => num(p.accepted) },
    { key: 'completed', header: 'Completed', align: 'end', render: (p) => num(p.completed) },
    { key: 'accept', header: 'Acceptance', align: 'end', render: (p) => rateLabel(p.acceptanceRate) },
    { key: 'noshow', header: 'No-show', align: 'end', render: (p) => rateLabel(p.noShowRate) },
    { key: 'rating', header: 'Rating', align: 'end', render: (p) => (p.averageRating !== null ? `${p.averageRating} (${p.ratingCount})` : '-') },
    { key: 'complaints', header: 'Complaints', align: 'end', render: (p) => num(p.complaints) },
    { key: 'summary', header: 'Summaries written', align: 'end', render: (p) => rateLabel(p.summaryCompletion) },
  ];
  return (
    <div className="stack">
      <Header r={r} />
      <Section title="Provider performance" note={scope}>
        <Figure label="Appointments offered" value={num(t.offered)} />
        <Figure label="Appointments accepted" value={num(t.accepted)} />
        <Figure label="Consultations completed" value={num(t.completed)} />
        <Figure label="Acceptance rate" value={rateLabel(t.acceptanceRate)} />
        {cancelled ? (
          <Figure
            label="Cancellation rate"
            value={rateLabel(cancelled.rate)}
            sub={`${num(cancelled.count)} cancelled by a provider, of all appointments`}
          />
        ) : (
          <Unavailable label="Cancellation rate" s={consultations} />
        )}
        <NotReported label="Average response time" why="The backend does not time how long a provider takes to answer an offer." />
        {gov.ok ? (
          <Figure
            label="Follow-ups reviewed"
            value="Not reported"
            sub={`${num(gov.data.followUp.checkinsSubmitted)} check-ins were submitted; the backend does not count how many a provider reviewed.`}
          />
        ) : (
          <NotReported label="Follow-ups reviewed" why="The backend does not count follow-up reviews per provider." />
        )}
        <Figure
          label="Ratings"
          value={r.ratingDistribution.average !== null ? `${r.ratingDistribution.average} / 5` : '-'}
          sub={`${num(r.ratingDistribution.total)} rated consultations`}
        />
        <Figure label="Complaints" value={num(t.complaints)} />
      </Section>

      <Card title="Providers on the platform">
        <div className="dcards">
          <Figure label="Providers" value={num(r.counts.total)} />
          <Figure label="Listed" value={num(r.counts.listed)} />
          <Figure label="Available now" value={num(r.counts.availableNow)} />
        </div>
        <h3 className="subhead">By verification status</h3>
        <Bars rows={r.counts.byStatus.map((s) => ({ label: `${humanise(s.status)} (${percentLabel(s.percent)})`, value: s.count }))} />
        <h3 className="subhead">By category</h3>
        <Bars rows={r.counts.byCategory.map((c) => ({ label: `${humanise(c.category)} (${percentLabel(c.percent)})`, value: c.count }))} />
      </Card>

      <Card title="Ratings">
        <Bars rows={r.ratingDistribution.ratings.map((x) => ({ label: `${x.rating} star (${percentLabel(x.percent)})`, value: x.count }))} />
      </Card>

      <Card title={`Provider by provider (${num(r.quality.total)})`}>
        {!t.complete && <Notice tone="warning">Showing the top {r.quality.items.length} of {num(r.quality.total)}.</Notice>}
        <Table caption="Provider quality" columns={columns} rows={r.quality.items} rowKey={(p) => p.doctorId} />
      </Card>
    </div>
  );
}

/* ----------------------------- 75. Patient analytics ----------------------------- */

function PatientsBody({ r, consultations }: { r: Patients; consultations: Soft<Consultations> }) {
  const d = r.demographics;
  return (
    <div className="stack">
      <Header r={r} />
      <Section title="Patients">
        <Figure label="Total registered patients" value={num(d.base)} sub={`as of ${new Date(d.asOf).toLocaleDateString()}`} />
        <KpiFig label="New patients" k={r.kpis.registrations} />
        <Figure
          label="Returning patients"
          value={num(r.repeatPatients.repeatPatients)}
          sub={`${rateLabel(r.repeatPatients.rate)} of ${num(r.repeatPatients.patientsWithConsultation)} who consulted`}
        />
        <KpiFig label="Repeat consultations" k={r.kpis.returningPatientConsultations} />
        <KpiFig label="First consultations" k={r.kpis.newPatientConsultations} />
        <KpiFig label="Patients who consulted" k={r.kpis.consultingPatients} />
      </Section>

      <Card title="Age distribution">
        <Bars rows={d.age.map((x) => ({ label: `${x.band} (${percentLabel(x.percent)})`, value: x.count }))} />
      </Card>
      <Card title="Gender distribution">
        <Bars rows={d.gender.map((x) => ({ label: `${humanise(x.gender)} (${percentLabel(x.percent)})`, value: x.count }))} />
      </Card>
      <Card title="Location distribution">
        <Bars rows={d.region.map((x) => ({ label: `${x.name} (${percentLabel(x.percent)})`, value: x.count }))} />
      </Card>
      <Card title="Specialty utilisation">
        {consultations.ok ? (
          <Bars rows={consultations.data.bySpecialty.map((s) => ({ label: `${s.name} (${percentLabel(s.percent)})`, value: s.requested }))} />
        ) : (
          <p className="muted">{consultations.status === 403 ? 'Your role cannot read the consultation report this comes from.' : 'Could not be read.'}</p>
        )}
      </Card>

      <h2 className="subhead">More detail</h2>
      <Card title="New patients over time">
        <Bars rows={series(r.series.registrations, (x: { registrations: number }) => x.registrations)} />
      </Card>
      <Card title="First and repeat consultations over time">
        <Bars rows={r.series.newVsReturning.map((x) => ({ label: x.date, value: x.newPatientConsultations + x.returningPatientConsultations }))} />
      </Card>
      <Card title="Language">
        <Bars rows={d.language.map((x) => ({ label: `${x.language} (${percentLabel(x.percent)})`, value: x.count }))} />
      </Card>
      <Card title="Account status">
        <Bars rows={d.status.map((x) => ({ label: `${humanise(x.status)} (${percentLabel(x.percent)})`, value: x.count }))} />
      </Card>
    </div>
  );
}

/* ------------------------------- 76. Lab analytics ------------------------------- */

function LabBody({ r }: { r: Lab }) {
  const refundedOrders = r.byStatus.refunded;
  return (
    <div className="stack">
      <Header r={{ range: r.range, filters: r.filters, definitions: {} }} />
      <Section title="Orders">
        <Figure label="Total lab orders" value={num(r.totals.orders)} />
        <Figure label="Completed orders" value={num(r.totals.completed)} />
        <Figure label="Cancelled orders" value={num(r.totals.cancelled)} />
        {refundedOrders !== undefined ? (
          <Figure label="Refunded orders" value={num(refundedOrders)} />
        ) : (
          <Figure label="Refunded orders" value={inr(r.totals.refundsInr)} sub="The backend reports the amount refunded, not a count of orders." />
        )}
      </Section>

      <Section title="Tests & packages" note="The backend lists the ten most frequently booked of each.">
        <NotReported label="Individual tests ordered" why="Only the most frequent tests are reported, not a total." />
        <NotReported label="Packages ordered" why="Only the most frequent packages are reported, not a total." />
      </Section>
      <Card title="Most frequently booked tests">
        <Bars rows={r.topTests.map((t) => ({ label: t.name, value: t.orders }))} />
      </Card>
      <Card title="Most frequently booked packages">
        <Bars rows={r.topPackages.map((t) => ({ label: t.name, value: t.orders }))} />
      </Card>

      <Card title="Lab partners">
        <h3 className="subhead">Partner-wise order volume</h3>
        <Bars rows={r.byPartner.map((p) => ({ label: `${p.name} (${num(p.completed)} completed, ${hours(p.averageTurnaroundHours)} turnaround)`, value: p.orders }))} />
        <div className="dcards">
          <Figure
            label="Offers accepted"
            value={num(r.acceptance.acceptedOffers)}
            sub={r.acceptance.averageMinutes !== null ? `Accepted in ${r.acceptance.averageMinutes} min on average` : undefined}
          />
          <NotReported label="Partner acceptance rate" why="The backend counts accepted offers, not the share of offers that were accepted." />
        </div>
      </Card>

      <Section title="Location">
        <NotReported label="Orders by PIN code / location" why="The lab report is not broken down by place." />
      </Section>

      <Section title="Collection">
        <Figure
          label="Recollection rate"
          value={rateLabel(r.recollection.rate)}
          sub={`${num(r.recollection.ordersRecollected)} of ${num(r.recollection.ordersCollected)} collected orders`}
        />
        <NotReported label="Collection completion rate" why="The backend does not report collections that were scheduled and not completed." />
      </Section>

      <Section title="Reports">
        <Figure label="Reports completed" value={num(labReportsCompleted(r))} />
        <Figure label="Average report turnaround time" value={hours(r.averageTurnaroundHours)} />
      </Section>

      <Card title="Orders per day">
        <Bars rows={series(r.series, (x: { orders: number }) => x.orders)} />
      </Card>
    </div>
  );
}

/* ---------------------------- 77. Financial analytics ---------------------------- */

function FinancialBody({
  r,
  monthly,
  failures,
  lab,
}: {
  r: Financial;
  monthly: Soft<Financial>;
  failures: Soft<{ count: number; amount: number | null }>;
  lab: Soft<Lab> | null;
}) {
  const k = r.kpis;
  const money = (rows: { label: string; amount: number; percent: number }[]) =>
    rows.map((m) => ({ label: `${m.label} (${percentLabel(m.percent)})`, value: Math.round(m.amount) }));
  return (
    <div className="stack">
      <Header r={r} />
      <Section title="Money">
        <KpiFig label="Gross consultation value" k={k.grossCollected} money />
        <KpiFig label="Platform commission" k={k.platformCommissionEarned} money />
        <KpiFig label="Patient platform fee" k={k.convenienceFees} money />
        <KpiFig label="Provider payouts" k={k.providerPayoutsPaid} money />
        {lab === null ? (
          <Figure label="Diagnostic revenue" value="Lab Services off" sub="No lab orders are taken." />
        ) : lab.ok ? (
          <Figure label="Diagnostic revenue" value={inr(lab.data.totals.revenueInr)} sub={`${inr(lab.data.totals.refundsInr)} refunded`} />
        ) : (
          <Unavailable label="Diagnostic revenue" s={lab} />
        )}
        <KpiFig label="Refunds" k={k.refunds} money />
        {failures.ok ? (
          <Figure label="Payment failures" value={num(failures.data.count)} sub="Payments that did not go through in the window" />
        ) : (
          <Unavailable label="Payment failures" s={failures} />
        )}
      </Section>

      <Card title="Monthly revenue trends">
        {monthly.ok ? (
          <>
            <Bars rows={monthly.data.series.map((m) => ({ label: m.date, value: Math.round(m.collected) }))} />
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Month</th>
                    <th scope="col">Collected</th>
                    <th scope="col">Refunded</th>
                    <th scope="col">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.data.series.map((m) => (
                    <tr key={m.date}>
                      <th scope="row">{m.date}</th>
                      <td>{inr(m.collected)}</td>
                      <td>{inr(m.refunded)}</td>
                      <td>{inr(m.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small">The last twelve months, whatever date range is chosen above.</p>
          </>
        ) : (
          <p className="muted">{monthly.status === 403 ? 'Your role cannot read this.' : 'Could not be read.'}</p>
        )}
      </Card>

      <h2 className="subhead">More detail</h2>
      <Section title="Net and what it is made of">
        <KpiFig label="Net collected" k={k.net} money />
        <KpiFig label="GST collected" k={k.gstCollected} money />
        <KpiFig label="Average bill" k={k.averageBill} money />
        <KpiFig label="Payouts paid, count" k={k.providerPayoutsPaidCount} />
        <Figure label="Payouts still owed" value={inr(r.outstanding.payoutsPending.amount)} sub={`${num(r.outstanding.payoutsPending.count)} to transfer`} />
      </Section>
      <Card title="Collected per day">
        <Bars rows={series(r.series, (x: { collected: number }) => x.collected)} />
      </Card>
      <Card title="By payment method">
        <Bars rows={money(r.byMethod)} />
      </Card>
      <Card title="By specialty">
        <Bars rows={money(r.bySpecialty)} />
      </Card>
      <Card title="By provider category">
        <Bars rows={money(r.byCategory)} />
      </Card>
      <Card title="By consultation mode">
        <Bars rows={money(r.byMode)} />
      </Card>
      {r.refundReasons.length > 0 && (
        <Card title="Why refunds were made">
          <Bars rows={r.refundReasons.map((x) => ({ label: `${x.reason} (${num(x.count)})`, value: Math.round(x.amount) }))} />
          <p className="muted small">Groups under {r.minimumGroupSize} are not broken out, so one patient cannot be recognised.</p>
        </Card>
      )}
    </div>
  );
}

/* --------------------------------- screens --------------------------------- */

function Screen({ kind }: { kind: Kind }) {
  const { filters } = useFilters();
  const key = [kind, filters.range, filters.from, filters.to, filters.category, filters.specialtyId, filters.serviceType];
  const fetcher = useCallback(
    (): Promise<unknown> => {
      const problem = customProblem(filters);
      if (problem) return Promise.reject(new Error(problem));
      switch (kind) {
        case 'overview':
          return analytics.overview(filters);
        case 'consultations':
          return analytics.consultations(filters);
        case 'providers':
          return analytics.providers(filters);
        case 'patients':
          return analytics.patients(filters);
        case 'lab':
          return analytics.lab(filters);
        case 'financial':
          return analytics.financial(filters);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    key,
  );
  const state = useResource<unknown>(fetcher, key);

  return (
    <div className="stack">
      <FilterBar />
      <Async state={state} resource="this report" skeletonRows={6}>
        {(data) => {
          switch (kind) {
            case 'overview': {
              const d = data as Awaited<ReturnType<typeof analytics.overview>>;
              return <OverviewBody r={d.report} summary={d.summary} lab={d.lab} />;
            }
            case 'consultations': {
              const d = data as Awaited<ReturnType<typeof analytics.consultations>>;
              return <ConsultationsBody r={d.report} providers={d.providers} patients={d.patients} gov={d.governanceDashboard} />;
            }
            case 'providers': {
              const d = data as Awaited<ReturnType<typeof analytics.providers>>;
              return <ProvidersBody r={d.report} consultations={d.consultations} gov={d.governanceDashboard} />;
            }
            case 'patients': {
              const d = data as Awaited<ReturnType<typeof analytics.patients>>;
              return <PatientsBody r={d.report} consultations={d.consultations} />;
            }
            case 'lab':
              return <LabBody r={data as Lab} />;
            case 'financial': {
              const d = data as Awaited<ReturnType<typeof analytics.financial>>;
              return <FinancialBody r={d.report} monthly={d.monthly} failures={d.failures} lab={d.lab} />;
            }
          }
        }}
      </Async>
    </div>
  );
}

export const analyticsPageLive = (kind: Kind) =>
  function AnalyticsLiveScreen({ level: _level }: { level: AdminLevel }) {
    return <Screen kind={kind} />;
  };
