import { describe, expect, it } from 'vitest';

import { bandsFromSummary, trendFromSummary, videoHealth, type LiveExtras, type LiveSummary } from './liveDashboard';

/**
 * `GET /admin/dashboard/summary` -> the spec's dashboard cards (section 3).
 * Pins which figure feeds which card, and what is left out when the backend
 * cannot count it.
 */

const summary = (over: Partial<LiveSummary> = {}): LiveSummary => ({
  generatedAt: '2026-10-12T10:00:00.000Z',
  timeZone: 'Asia/Kolkata',
  providers: {
    total: 20,
    byStatus: { pending: 3, under_review: 2, changes_required: 1, verified: 11, rejected: 2, suspended: 1 },
    listed: 9,
    availableNow: 4,
    documentsAwaitingReview: 7,
  },
  patients: { total: 300, byStatus: { pending: 20, active: 270, suspended: 10 }, newLast7Days: 12, newLast30Days: 55, withBookings: 140, returning: 61 },
  appointments: {
    byStatus: { pending_payment: 5, scheduled: 14, awaiting_doctor: 2, in_progress: 1, completed: 80, cancelled: 9, no_show: 0 },
    awaitingPayment: 5,
    awaitingDoctor: 2,
    today: 6,
    upcoming: 14,
    last7Days: [
      { date: '2026-10-06', requested: 3, completed: 2 },
      { date: '2026-10-07', requested: 0, completed: 0 },
      { date: '2026-10-08', requested: 5, completed: 4 },
      { date: '2026-10-09', requested: 1, completed: 1 },
      { date: '2026-10-10', requested: 2, completed: 2 },
      { date: '2026-10-11', requested: 4, completed: 3 },
      { date: '2026-10-12', requested: 6, completed: 1 },
    ],
  },
  support: { openComplaints: 3, complaintsInProgress: 2, openSafetyAlerts: 1, openTickets: 4, ticketsInProgress: 5, ticketsAwaitingUser: 2, urgentTickets: 1 },
  video: { lastReportAt: '2026-10-12T09:30:00.000Z', unreportedCalls: 2 },
  finance: {
    collectedToday: 4500,
    collectedLast30Days: 120000,
    refundedLast30Days: 8000,
    refundsDue: { count: 2, amountInr: 3000 },
    payoutsPending: { count: 6, amountInr: 21000 },
  },
  ...over,
});

const extras: LiveExtras = { clarificationsAwaiting: 4, followupsPending: 9 };

const card = (s: LiveSummary, label: string, e: LiveExtras = extras) =>
  bandsFromSummary(s, e).flatMap((b) => b.cards).find((c) => c.label === label);

describe('provider cards', () => {
  it('counts Pending verification as submitted plus under review, and says how many documents wait', () => {
    expect(card(summary(), 'Pending verification')).toMatchObject({ value: 5, sub: '7 document(s) to review', alarm: true });
  });

  it('shows Active as the listed providers and Inactive as everyone who is neither listed nor suspended', () => {
    expect(card(summary(), 'Active providers')?.value).toBe(9);
    expect(card(summary(), 'Suspended providers')?.value).toBe(1);
    expect(card(summary(), 'Inactive providers')?.value).toBe(10);
  });

  it('opens the verification queue with the status that matches the card', () => {
    expect(card(summary(), 'Changes required')).toMatchObject({ value: 1, to: '/verification?status=changes_required' });
  });
});

describe('patient and appointment cards', () => {
  it('uses the 30 day window for new registrations and mentions the 7 day one', () => {
    expect(card(summary(), 'New registrations')).toMatchObject({ value: 55, sub: '12 in the last 7 days' });
  });

  it('takes requests from bookings waiting on payment, and completed and cancelled from the status counts', () => {
    expect(card(summary(), 'Appointment requests')?.value).toBe(5);
    expect(card(summary(), 'Completed consultations')?.value).toBe(80);
    expect(card(summary(), 'Cancelled consultations')?.value).toBe(9);
  });

  it('adds the clarification and follow-up cards only when their figures could be read', () => {
    expect(card(summary(), 'Pending clarifications')?.value).toBe(4);
    expect(card(summary(), 'Pending follow-ups')?.value).toBe(9);
    const none = { clarificationsAwaiting: null, followupsPending: null };
    expect(card(summary(), 'Pending clarifications', none)).toBeUndefined();
    expect(card(summary(), 'Pending follow-ups', none)).toBeUndefined();
  });
});

describe('finance and support cards', () => {
  it('shows what is owed to providers and what is owed back to patients', () => {
    expect(card(summary(), 'Provider payouts pending')).toMatchObject({ sub: '6 to settle', alarm: true });
    expect(card(summary(), 'Refunds pending')).toMatchObject({ value: 2, alarm: true });
  });

  it('calls revenue what it is: collected minus refunded over 30 days', () => {
    const c = card(summary(), 'Revenue summary');
    expect(String(c?.value)).toContain('1,12,000');
    expect(c?.sub).toMatch(/minus refunded/);
  });

  it('has no Resolved tickets card, because the summary cannot count one', () => {
    expect(card(summary(), 'Resolved tickets')).toBeUndefined();
  });

  it('counts New as unassigned and Open as everything not yet resolved', () => {
    expect(card(summary(), 'New support tickets')?.value).toBe(4);
    expect(card(summary(), 'Open tickets')).toMatchObject({ value: 11, sub: '1 urgent or high' });
  });
});

describe('sections a role may not see', () => {
  it('draws no band for a section the backend sent as null', () => {
    const bands = bandsFromSummary(summary({ finance: null, support: null }), extras).map((b) => b.id);
    expect(bands).toEqual(['providers', 'patients', 'consultations']);
  });

  it('draws nothing at all for a role that gets nothing', () => {
    expect(bandsFromSummary(summary({ providers: null, patients: null, appointments: null, finance: null, support: null }), extras)).toEqual([]);
  });
});

describe('trendFromSummary', () => {
  it('turns the seven days into labelled bars, requested bookings per day', () => {
    const t = trendFromSummary(summary());
    expect(t?.last7Days).toHaveLength(7);
    expect(t?.last7Days.map((d) => d.count)).toEqual([3, 0, 5, 1, 2, 4, 6]);
    // 2026-10-06 was a Tuesday.
    expect(t?.last7Days[0].label).toBe('Tue');
  });

  it('gives no week-before comparison, and lists only statuses that have bookings', () => {
    const t = trendFromSummary(summary());
    expect(t?.previous7Days).toBe(0);
    expect(t?.byStatus.map((s) => s.status)).not.toContain('no_show');
    expect(t?.byStatus.find((s) => s.status === 'completed')?.count).toBe(80);
  });

  it('is absent for a role without the appointments section', () => {
    expect(trendFromSummary(summary({ appointments: null }))).toBeNull();
  });
});

describe('videoHealth', () => {
  const now = new Date('2026-10-12T10:00:00.000Z').getTime();

  it('is fine when the video server reported recently', () => {
    const h = videoHealth({ lastReportAt: '2026-10-12T09:00:00.000Z', unreportedCalls: 2 }, now);
    expect(h?.stale).toBe(false);
    expect(h?.text).toMatch(/last reported 1 h ago/);
  });

  it('warns when it has been quiet for over a day, or has never reported', () => {
    expect(videoHealth({ lastReportAt: '2026-10-10T09:00:00.000Z', unreportedCalls: 40 }, now)?.stale).toBe(true);
    expect(videoHealth({ lastReportAt: null, unreportedCalls: 0 }, now)).toMatchObject({ stale: true });
    expect(videoHealth({ lastReportAt: null, unreportedCalls: 0 }, now)?.text).toMatch(/never reported/);
  });

  it('is absent when the role does not get the section', () => {
    expect(videoHealth(null, now)).toBeNull();
  });
});
