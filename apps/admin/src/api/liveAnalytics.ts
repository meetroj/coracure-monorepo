import { LAB_SERVICES_ENABLED } from '../nav';
import { request } from './http';
import type { LiveSummary } from './liveDashboard';

/**
 * Analytics against the backend: `GET /admin/analytics/{overview,consultations,
 * providers,patients,financial,lab}`, with the few figures a page needs that
 * live on another report: `GET /admin/governance/dashboard` (follow-up),
 * `GET /admin/payments` (payment failures) and `GET /admin/dashboard/summary`
 * (registered patients, providers).
 *
 * Source of truth: `analytics.types.ts`, `LabAnalytics`, `QualityDashboard`,
 * `AnalyticsFilterDto`.
 *
 * *** THE BACKEND COUNTS; THE PANEL ADDS NOTHING BUT TOTALS OF WHAT IT WAS SENT. ***
 * A rate arrives as a FRACTION (0.0523 is 5.23%) and a share as a PERCENT
 * (`percent`, `percentOfRequested`, `changePercent` are already 0 to 100): the
 * two are formatted differently, and mixing them up is a wrong number on a
 * screen, so each has its own formatter below and a spec.
 *
 * What the backend does not report, the panel says it does not report: it is
 * never shown as 0.
 */

export type Kpi<T = number> = { value: T; previous: T; changePercent: number | null };

export type Envelope = {
  range: { from: string; to: string; granularity: string; timeZone: string };
  filters: { category: string | null; specialtyId: string | null; serviceType: string | null; ignored: string[] };
  definitions: Record<string, string>;
};

export type Overview = Envelope & {
  kpis: Record<
    | 'consultationsRequested'
    | 'consultationsCompleted'
    | 'consultationsCancelled'
    | 'newPatients'
    | 'newProvidersVerified'
    | 'revenueCollected'
    | 'refunds'
    | 'supportTicketsOpened'
    | 'complaintsOpened'
    | 'supportOpened',
    Kpi
  > & { averageRating: Kpi<number | null> };
  series: {
    consultations: { date: string; requested: number; completed: number }[];
    revenue: { date: string; collected: number }[];
  };
};

type KeyedRow = { key: string; requested: number; completed: number; percent: number };

export type Consultations = Envelope & {
  kpis: Record<'requested' | 'completed' | 'cancelled' | 'noShow', Kpi>;
  statusBreakdown: { status: string; count: number; percent: number }[];
  funnel: { stages: { key: string; label: string; count: number; percentOfRequested: number; percentOfPrevious: number }[] };
  series: { date: string; requested: number; completed: number; cancelled: number; noShow: number }[];
  byMode: KeyedRow[];
  byChannel: KeyedRow[];
  bySpecialty: { specialtyId: string | null; name: string; category: string | null; requested: number; completed: number; percent: number }[];
  byCategory: KeyedRow[];
  heatGrid: { weekdays: string[]; matrix: number[][]; total: number; max: number; timeZone: string; basis: string };
  duration: {
    plannedAverageMinutes: number | null;
    actual: { sampleSize: number; averageMinutes: number | null; medianMinutes: number | null; p90Minutes: number | null };
  };
  cancellations: {
    total: number;
    byParty: { party: string; count: number; percent: number }[];
    replacedByReschedule: number;
    topReasons: { reason: string; count: number }[];
    minimumGroupSize: number;
  };
  noShow: { count: number; attended: number; rate: number | null };
  reschedule: { count: number; requested: number; rate: number | null };
};

export type ProviderQuality = {
  doctorId: string;
  fullName: string;
  verificationStatus: string;
  category: string | null;
  specialty: { id: string; name: string } | null;
  offered: number;
  accepted: number;
  acceptanceRate: number | null;
  completed: number;
  noShow: number;
  attended: number;
  noShowRate: number | null;
  averageRating: number | null;
  ratingCount: number;
  complaints: number;
  summaryCompletion: number | null;
};

export type Providers = Envelope & {
  counts: {
    total: number;
    byStatus: { status: string; count: number; percent: number }[];
    byCategory: { category: string; count: number; percent: number }[];
    listed: number;
    availableNow: number;
  };
  quality: { items: ProviderQuality[]; total: number; limit: number; offset: number; sort: string };
  ratingDistribution: { total: number; average: number | null; ratings: { rating: number; count: number; percent: number }[] };
  topByCompleted: ProviderQuality[];
};

export type Patients = Envelope & {
  kpis: Record<'registrations' | 'consultingPatients' | 'newPatientConsultations' | 'returningPatientConsultations', Kpi>;
  series: {
    registrations: { date: string; registrations: number }[];
    newVsReturning: { date: string; newPatientConsultations: number; returningPatientConsultations: number }[];
  };
  repeatPatients: { patientsWithConsultation: number; repeatPatients: number; rate: number | null };
  demographics: {
    base: number;
    asOf: string;
    age: { band: string; count: number; percent: number }[];
    gender: { gender: string; count: number; percent: number }[];
    region: { regionId: string | null; name: string; count: number; percent: number }[];
    language: { language: string; count: number; percent: number }[];
    status: { status: string; count: number; percent: number }[];
  };
};

type MoneyRow = { key: string; label: string; payments: number; amount: number; percent: number };

export type Financial = Envelope & {
  kpis: Record<
    | 'grossCollected'
    | 'refunds'
    | 'net'
    | 'convenienceFees'
    | 'gstCollected'
    | 'providerPayoutsPaid'
    | 'providerPayoutsPaidCount'
    | 'platformCommissionEarned',
    Kpi
  > & { averageBill: Kpi<number | null> };
  outstanding: { payoutsPending: { count: number; amount: number } };
  series: { date: string; collected: number; refunded: number; net: number }[];
  byMethod: MoneyRow[];
  bySpecialty: (MoneyRow & { specialtyId: string | null; category: string | null })[];
  byCategory: MoneyRow[];
  byMode: MoneyRow[];
  refundReasons: { reason: string; count: number; amount: number }[];
  minimumGroupSize: number;
};

export type Lab = {
  range: Envelope['range'];
  filters: Envelope['filters'];
  totals: { orders: number; completed: number; cancelled: number; revenueInr: number; refundsInr: number; netRevenueInr: number };
  series: { date: string; orders: number; completed: number; cancelled: number; revenueInr: number; refundsInr: number }[];
  byStatus: Record<string, number>;
  byPartner: { partnerId: string; code: string; name: string; orders: number; completed: number; averageTurnaroundHours: number | null }[];
  topTests: { code: string; name: string; orders: number }[];
  topPackages: { code: string; name: string; orders: number; valueInr: number }[];
  recollection: { ordersCollected: number; ordersRecollected: number; rate: number | null };
  allocation: { ordersAllocated: number; ordersFailed: number; failureRate: number | null };
  acceptance: { acceptedOffers: number; averageMinutes: number | null };
  averageTurnaroundHours: number | null;
};

/** `GET /admin/governance/dashboard`: only the follow-up block is read. */
export type FollowUpFigures = { active: number; completed: number; checkinsSubmitted: number };

/* ------------------------------- the filters ------------------------------- */

export type AnalyticsFilters = {
  /** Days back from now (7, 30, 90, 365), or `custom` with `from` and `to`. */
  range: string;
  /** `YYYY-MM-DD`, inclusive, when `range` is custom. */
  from: string;
  to: string;
  category: string;
  specialtyId: string;
  /** `consultation`, `lab`, or empty for both. */
  serviceType: string;
};

export const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom dates' },
];

const DAY = 86_400_000;
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

/** Whether a custom window can be asked for: both dates, in order. */
export function customProblem(f: Pick<AnalyticsFilters, 'range' | 'from' | 'to'>): string | null {
  if (f.range !== 'custom') return null;
  if (!dateOnly.test(f.from) || !dateOnly.test(f.to)) return 'Choose both dates.';
  if (f.from > f.to) return 'The first date must not be after the last.';
  return null;
}

/**
 * The query for a report. A preset is the last N days up to now (the backend
 * rounds it to platform days; `to` is exclusive, so a minute past now includes
 * the current day). A custom window is whole days, last day included.
 */
export function reportParams(f: AnalyticsFilters, now: Date = new Date()): Record<string, string | undefined> {
  let from: Date;
  let to: Date;
  if (f.range === 'custom' && customProblem(f) === null) {
    from = new Date(`${f.from}T00:00:00`);
    to = new Date(new Date(`${f.to}T00:00:00`).getTime() + DAY);
  } else {
    const days = Number(f.range);
    const span = Number.isFinite(days) && days > 0 ? days : 30;
    to = new Date(now.getTime() + 60_000);
    from = new Date(now.getTime() - span * DAY);
  }
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    category: f.category || undefined,
    specialtyId: f.specialtyId || undefined,
    serviceType: f.serviceType || undefined,
  };
}

/* ------------------------------ formatting --------------------------------- */

const round1 = (n: number) => Math.round(n * 10) / 10;

/** A FRACTION (0.0523) as a percentage: `5.2%`. Null is "not measured", never 0. */
export const rateLabel = (fraction: number | null | undefined): string =>
  fraction === null || fraction === undefined ? '-' : `${round1(fraction * 100)}%`;

/** A figure that is ALREADY a percentage (a share, a change): `33.3%`. */
export const percentLabel = (percent: number | null | undefined): string =>
  percent === null || percent === undefined ? '-' : `${round1(percent)}%`;

/** `+12%`, `-3%`, or nothing when there was nothing before to compare to. */
export function changeLabel(k: Pick<Kpi<unknown>, 'changePercent'>): string | null {
  if (k.changePercent === null || k.changePercent === undefined) return null;
  const r = round1(k.changePercent);
  return `${r > 0 ? '+' : ''}${r}%`;
}

/* ------------------------------ aggregation -------------------------------- */

export type ProviderTotals = {
  providers: number;
  offered: number;
  accepted: number;
  completed: number;
  noShow: number;
  attended: number;
  complaints: number;
  ratingCount: number;
  /** accepted / offered, as a fraction; null when nothing was offered. */
  acceptanceRate: number | null;
  noShowRate: number | null;
  /** False when the table holds fewer providers than there are: the totals are the page's. */
  complete: boolean;
};

/**
 * Totals across the quality table. Exact when the table holds every provider;
 * otherwise they are the top of the table and say so (`complete` false).
 */
export function providerTotals(q: Providers['quality']): ProviderTotals {
  const sum = (pick: (p: ProviderQuality) => number) => q.items.reduce((n, p) => n + pick(p), 0);
  const offered = sum((p) => p.offered);
  const accepted = sum((p) => p.accepted);
  const noShow = sum((p) => p.noShow);
  const attended = sum((p) => p.attended);
  return {
    providers: q.items.length,
    offered,
    accepted,
    completed: sum((p) => p.completed),
    noShow,
    attended,
    complaints: sum((p) => p.complaints),
    ratingCount: sum((p) => p.ratingCount),
    acceptanceRate: offered === 0 ? null : accepted / offered,
    noShowRate: attended === 0 ? null : noShow / attended,
    complete: q.total <= q.items.length,
  };
}

/** Provider-initiated cancellations out of every appointment requested. A fraction, or null. */
export function providerCancellation(c: Consultations): { count: number; rate: number | null } {
  const count = c.cancellations.byParty
    .filter((p) => /doctor|provider/i.test(p.party))
    .reduce((n, p) => n + p.count, 0);
  return { count, rate: c.kpis.requested.value === 0 ? null : count / c.kpis.requested.value };
}

/** Plans completed out of every plan started in the window, as a fraction. */
export function followUpCompletion(f: FollowUpFigures): { completed: number; total: number; rate: number | null } {
  const total = f.active + f.completed;
  return { completed: f.completed, total, rate: total === 0 ? null : f.completed / total };
}

/** Reports ready: uploaded or completed. A report is uploaded before the order is closed. */
export function labReportsCompleted(l: Pick<Lab, 'byStatus'>): number {
  return (l.byStatus.report_uploaded ?? 0) + (l.byStatus.completed ?? 0);
}

/* -------------------------------- requests --------------------------------- */

type Extra = Record<string, string | number | undefined>;

const get = <T>(name: string, f: AnalyticsFilters, extra: Extra = {}) =>
  request<T>(`/admin/analytics/${name}`, { query: { ...reportParams(f), ...extra } });

export type Soft<T> = { ok: true; data: T } | { ok: false; status: number | null };

/** A secondary read that may be refused or fail without taking the page with it. */
export async function soft<T>(p: Promise<T>): Promise<Soft<T>> {
  try {
    return { ok: true, data: await p };
  } catch (e) {
    return { ok: false, status: (e as { statusCode?: number } | null)?.statusCode ?? null };
  }
}

const governance = (f: AnalyticsFilters) => {
  const { from, to } = reportParams(f);
  return request<{ followUp: FollowUpFigures }>('/admin/governance/dashboard', { query: { from, to } });
};

/** Payments that failed in the window: a count and, when the backend sums it, an amount. */
const paymentFailures = async (f: AnalyticsFilters): Promise<{ count: number; amount: number | null }> => {
  const { from, to } = reportParams(f);
  const page = await request<{ total: number; summary?: { paidTotal: number } }>('/admin/payments', {
    query: { status: 'failed', from, to, limit: 1 },
  });
  return { count: page.total, amount: null };
};

/** Twelve calendar months ending now, bucketed by month. */
export const monthlyFilters = (f: AnalyticsFilters): AnalyticsFilters => ({ ...f, range: '365', from: '', to: '' });

/** Lab Services is off, so there is no lab report to read: `null` says so, which is not a failure. */
const labIfOn = (f: AnalyticsFilters): Promise<Soft<Lab> | null> =>
  LAB_SERVICES_ENABLED ? soft(get<Lab>('lab', f)) : Promise.resolve(null);

export const analytics = {
  overview: async (f: AnalyticsFilters) => {
    const [report, summary, lab] = await Promise.all([
      get<Overview>('overview', f),
      soft(request<LiveSummary>('/admin/dashboard/summary')),
      labIfOn(f),
    ]);
    return { report, summary, lab };
  },

  consultations: async (f: AnalyticsFilters) => {
    const [report, providers, patients, governanceDashboard] = await Promise.all([
      get<Consultations>('consultations', f),
      soft(get<Providers>('providers', f, { limit: 100, sort: 'completed' })),
      soft(get<Patients>('patients', f)),
      soft(governance(f)),
    ]);
    return { report, providers, patients, governanceDashboard };
  },

  providers: async (f: AnalyticsFilters, sort = 'completed') => {
    const [report, consultations, governanceDashboard] = await Promise.all([
      get<Providers>('providers', f, { limit: 100, sort }),
      soft(get<Consultations>('consultations', f)),
      soft(governance(f)),
    ]);
    return { report, consultations, governanceDashboard };
  },

  patients: async (f: AnalyticsFilters) => {
    const [report, consultations] = await Promise.all([get<Patients>('patients', f), soft(get<Consultations>('consultations', f))]);
    return { report, consultations };
  },

  financial: async (f: AnalyticsFilters) => {
    const [report, monthly, failures, lab] = await Promise.all([
      get<Financial>('financial', f),
      soft(get<Financial>('financial', monthlyFilters(f), { granularity: 'month' })),
      soft(paymentFailures(f)),
      labIfOn(f),
    ]);
    return { report, monthly, failures, lab };
  },

  lab: (f: AnalyticsFilters) => get<Lab>('lab', f),
};
