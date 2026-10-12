import type { IconName } from '../ui/Icon';

/**
 * `GET /admin/dashboard/summary` and the cards the spec's Dashboard (section 3)
 * builds from it.
 *
 * Source of truth: `AdminDashboardSummary` in
 * `src/governance/admin-dashboard.service.ts`. Every section is nullable: a
 * section a role has no business with comes back `null`, and the panel then
 * draws no card for it rather than a zero.
 *
 * *** A CARD THE BACKEND CANNOT COUNT IS LEFT OUT, NOT SHOWN AS 0. *** The spec
 * asks for a "Resolved tickets" figure and the summary has none; a zero there
 * would read as "nothing was resolved". Pure and network-free so each rule is
 * pinned by a spec.
 */

type Status = 'pending' | 'under_review' | 'changes_required' | 'verified' | 'rejected' | 'suspended';

export type LiveSummary = {
  generatedAt: string;
  timeZone: string;
  providers: {
    total: number;
    byStatus: Record<Status, number>;
    listed: number;
    availableNow: number;
    documentsAwaitingReview: number;
  } | null;
  patients: {
    total: number;
    byStatus: Record<'pending' | 'active' | 'suspended', number>;
    newLast7Days: number;
    newLast30Days: number;
    withBookings: number;
    returning: number;
  } | null;
  appointments: {
    byStatus: Record<string, number>;
    awaitingPayment: number;
    awaitingDoctor: number;
    today: number;
    upcoming: number;
    last7Days: { date: string; requested: number; completed: number }[];
  } | null;
  support: {
    openComplaints: number;
    complaintsInProgress: number;
    openSafetyAlerts: number;
    openTickets: number;
    ticketsInProgress: number;
    ticketsAwaitingUser: number;
    urgentTickets: number;
  } | null;
  video: { lastReportAt: string | null; unreportedCalls: number } | null;
  finance: {
    collectedToday: number;
    collectedLast30Days: number;
    refundedLast30Days: number;
    refundsDue: { count: number; amountInr: number };
    payoutsPending: { count: number; amountInr: number };
  } | null;
};

/** Figures that live on other endpoints. `null` means "could not be read", which omits the card. */
export type LiveExtras = {
  /** Clarification cases waiting to be assigned to an expert (`GET /admin/governance/dashboard`). */
  clarificationsAwaiting: number | null;
  /** Follow-ups whose turn is the patient's or the provider's (`GET /admin/followups`). */
  followupsPending: number | null;
};

export type LiveCard = {
  /** The sidebar section the card opens, so a level that cannot reach it is not shown the card. */
  section: string;
  icon: IconName;
  label: string;
  value: string | number;
  sub?: string;
  to: string;
  alarm?: boolean;
  ok?: boolean;
};

export type LiveBand = { id: string; title: string; cards: LiveCard[] };

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const sum = (...n: number[]) => n.reduce((a, b) => a + b, 0);

export function bandsFromSummary(s: LiveSummary, extras: LiveExtras): LiveBand[] {
  const bands: LiveBand[] = [];

  if (s.providers) {
    const p = s.providers;
    const suspended = p.byStatus.suspended ?? 0;
    const awaiting = sum(p.byStatus.pending ?? 0, p.byStatus.under_review ?? 0);
    bands.push({
      id: 'providers',
      title: 'Healthcare Providers',
      cards: [
        { section: 'providers', icon: 'providers', label: 'Total providers', value: p.total, to: '/providers' },
        // The backend's account status: verified and listed is Active.
        { section: 'providers', icon: 'check', label: 'Active providers', value: p.listed, to: '/providers?account=active', ok: true },
        { section: 'verification', icon: 'credentials', label: 'Pending verification', value: awaiting, sub: `${p.documentsAwaitingReview} document(s) to review`, to: '/verification?status=pending', alarm: awaiting > 0 },
        { section: 'verification', icon: 'edit', label: 'Changes required', value: p.byStatus.changes_required ?? 0, to: '/verification?status=changes_required' },
        { section: 'providers', icon: 'clock', label: 'Inactive providers', value: Math.max(0, p.total - p.listed - suspended), to: '/providers?account=inactive' },
        { section: 'providers', icon: 'alert', label: 'Suspended providers', value: suspended, to: '/providers?account=suspended' },
      ],
    });
  }

  if (s.patients) {
    const p = s.patients;
    bands.push({
      id: 'patients',
      title: 'Patients',
      cards: [
        { section: 'patients', icon: 'users', label: 'Total registered patients', value: p.total, to: '/patients' },
        { section: 'patients', icon: 'plus', label: 'New registrations', value: p.newLast30Days, sub: `${p.newLast7Days} in the last 7 days`, to: '/patients' },
        { section: 'patients', icon: 'refresh', label: 'Returning patients', value: p.returning, sub: 'Two or more bookings', to: '/patients' },
      ],
    });
  }

  if (s.appointments) {
    const a = s.appointments;
    const cards: LiveCard[] = [
      { section: 'appointments', icon: 'inbox', label: 'Appointment requests', value: a.awaitingPayment, sub: `${a.awaitingDoctor} paid, waiting for a provider`, to: '/appointments?status=requested' },
      { section: 'appointments', icon: 'calendar', label: 'Appointments today', value: a.today, to: '/appointments' },
      { section: 'appointments', icon: 'clock', label: 'Upcoming appointments', value: a.upcoming, to: '/appointments?status=upcoming' },
      { section: 'appointments', icon: 'check', label: 'Completed consultations', value: a.byStatus.completed ?? 0, to: '/appointments?status=completed', ok: true },
      { section: 'appointments', icon: 'close', label: 'Cancelled consultations', value: a.byStatus.cancelled ?? 0, to: '/appointments?status=cancelled' },
    ];
    if (extras.clarificationsAwaiting !== null) {
      cards.push({ section: 'clarifications', icon: 'clarify', label: 'Pending clarifications', value: extras.clarificationsAwaiting, to: '/clarifications', alarm: extras.clarificationsAwaiting > 0 });
    }
    if (extras.followupsPending !== null) {
      cards.push({ section: 'follow-ups', icon: 'pathway', label: 'Pending follow-ups', value: extras.followupsPending, to: '/follow-ups' });
    }
    bands.push({ id: 'consultations', title: 'Consultations', cards });
  }

  if (s.finance) {
    const f = s.finance;
    bands.push({
      id: 'finances',
      title: 'Finances',
      cards: [
        { section: 'patient-payments', icon: 'payments', label: 'Patient payments', value: rupees(f.collectedLast30Days), sub: `${rupees(f.collectedToday)} today · last 30 days`, to: '/patient-payments' },
        { section: 'provider-payouts', icon: 'clock', label: 'Provider payouts pending', value: rupees(f.payoutsPending.amountInr), sub: `${f.payoutsPending.count} to settle`, to: '/provider-payouts?status=pending', alarm: f.payoutsPending.count > 0 },
        { section: 'refunds', icon: 'refresh', label: 'Refunds pending', value: f.refundsDue.count, sub: rupees(f.refundsDue.amountInr), to: '/refunds', alarm: f.refundsDue.count > 0 },
        { section: 'analytics-financial', icon: 'chart', label: 'Revenue summary', value: rupees(f.collectedLast30Days - f.refundedLast30Days), sub: 'Collected minus refunded, last 30 days', to: '/analytics-financial' },
      ],
    });
  }

  if (s.support) {
    const t = s.support;
    const unresolved = sum(t.openTickets, t.ticketsInProgress, t.ticketsAwaitingUser);
    bands.push({
      id: 'support',
      title: 'Support',
      cards: [
        { section: 'support-tickets', icon: 'inbox', label: 'New support tickets', value: t.openTickets, sub: 'Nobody has picked up', to: '/support-tickets?status=new', alarm: t.openTickets > 0 },
        { section: 'support-tickets', icon: 'note', label: 'Open tickets', value: unresolved, sub: t.urgentTickets ? `${t.urgentTickets} urgent or high` : undefined, to: '/support-tickets', alarm: t.urgentTickets > 0 },
        { section: 'support-tickets', icon: 'refresh', label: 'In-progress tickets', value: t.ticketsInProgress, sub: `${t.ticketsAwaitingUser} waiting for the requester`, to: '/support-tickets?status=in_progress' },
        { section: 'support-tickets', icon: 'alert', label: 'Open complaints', value: t.openComplaints, sub: `${t.complaintsInProgress} in progress`, to: '/support-tickets?tab=complaints', alarm: t.openComplaints > 0 },
        { section: 'safety-alerts', icon: 'alert', label: 'Open safety alerts', value: t.openSafetyAlerts, to: '/safety-alerts', alarm: t.openSafetyAlerts > 0, ok: t.openSafetyAlerts === 0 },
      ],
    });
  }

  return bands;
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * The shape the existing trend and status cards draw. The summary has no "week
 * before", so `previous7Days` is 0, which is how those cards already say "no
 * comparison available" - they show the total and omit the percentage.
 */
export function trendFromSummary(s: LiveSummary): {
  last7Days: { label: string; date: string; count: number }[];
  previous7Days: number;
  byStatus: { status: string; count: number }[];
} | null {
  if (!s.appointments) return null;
  return {
    last7Days: s.appointments.last7Days.map((d) => ({
      // `date` is the platform's calendar day; parsing it at noon UTC keeps the weekday stable in any local zone.
      label: WEEKDAY[new Date(`${d.date}T12:00:00Z`).getUTCDay()],
      date: d.date,
      count: d.requested,
    })),
    previous7Days: 0,
    byStatus: Object.entries(s.appointments.byStatus)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({ status, count })),
  };
}

/** The video server's reporting: stale or never-heard-from is the warning the backend asks a screen to raise. */
export function videoHealth(
  video: LiveSummary['video'],
  now = Date.now(),
): { stale: boolean; text: string } | null {
  if (!video) return null;
  const hours = video.lastReportAt ? (now - new Date(video.lastReportAt).getTime()) / 3_600_000 : null;
  const stale = hours === null || hours > 24;
  const when = hours === null ? 'has never reported' : `last reported ${Math.max(0, Math.round(hours))} h ago`;
  return {
    stale,
    text: `The video server ${when}. ${video.unreportedCalls} booked call(s) in the last 30 days have nobody recorded as connected.`,
  };
}
