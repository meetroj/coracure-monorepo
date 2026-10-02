import * as db from '../mock/db';
import { caseSummaries } from '../mock/caseSummaries';
import { list as careHubItems } from '../mock/careHub';
import { history as sentHistory } from '../mock/manualNotifications';
import { patientRecords } from '../mock/patients';
import { consultationsList } from './consultationsList';

/**
 * The dashboard's numbers, computed from the same mock data the other screens
 * read, so a tile can never disagree with the list it opens.
 *
 * UI-only, like the rest of the panel: the real build would call the
 * governance dashboard endpoint plus a handful of count queries.
 */

const DAY = 86_400_000;
const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export type Activity = {
  id: string;
  at: string;
  kind: 'consultation' | 'alert' | 'complaint' | 'notification';
  text: string;
  /** Where clicking the row goes. */
  to: string;
};

export type DashboardOverview = {
  attention: {
    redFlags: number;
    documentsAwaiting: number;
    summariesNeedingAttention: number;
    openComplaints: number;
    pendingPayoutsInr: number;
    pendingPayoutCount: number;
  };
  doctors: { total: number; verified: number; awaitingReview: number; listed: number };
  patients: { total: number; active: number; joinedThisWeek: number };
  consultations: {
    today: number;
    upcoming: number;
    inProgress: number;
    completedAllTime: number;
    /** Count per day for the last 7 days, oldest first. */
    last7Days: { label: string; date: string; count: number }[];
    /** Previous 7 days' total, for the change figure. */
    previous7Days: number;
    byStatus: { status: string; count: number }[];
  };
  careHub: { published: number; inReview: number; drafts: number };
  notifications: { sentLast7Days: number; failedLast7Days: number };
  activity: Activity[];
};

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const dashboardOverview = {
  get: async (): Promise<DashboardOverview> => {
    const now = Date.now();
    const today = startOfDay(now);

    const { items: consults } = await consultationsList.list({});

    // ---- consultations
    const at = (c: { startsAt?: string | null }) => (c.startsAt ? new Date(c.startsAt).getTime() : 0);
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const dayStart = today - (6 - i) * DAY;
      const count = consults.filter((c) => at(c) >= dayStart && at(c) < dayStart + DAY).length;
      return { label: WEEKDAY[new Date(dayStart).getDay()], date: new Date(dayStart).toISOString().slice(0, 10), count };
    });
    const previous7Days = consults.filter((c) => at(c) >= today - 13 * DAY && at(c) < today - 6 * DAY).length;
    const statusCounts = new Map<string, number>();
    consults.forEach((c) => statusCounts.set(c.status, (statusCounts.get(c.status) ?? 0) + 1));

    // ---- people
    const patients = patientRecords();
    const verified = db.doctors.filter((d) => d.verificationStatus === 'verified');
    const awaitingReview = db.doctors.filter((d) =>
      (db.documents[d.id] ?? []).some((doc) => doc.status === 'pending'),
    );

    // ---- alerts, complaints, money
    const openAlerts = db.safetyAlerts.filter((a) => !a.closedAt);
    const redFlags = openAlerts.filter((a) => a.alertType === 'red_flag' && !a.acknowledgedAt).length;
    const openComplaints = db.complaints.filter((c) => c.status === 'open' || c.status === 'in_progress');
    const payouts = db.pendingPayouts;

    // ---- content and messages
    const items = careHubItems();
    const sentRecently = sentHistory.filter((h) => new Date(h.sentAt).getTime() >= now - 7 * DAY);

    // ---- recent activity, newest first
    const activity: Activity[] = [
      ...consults.slice(0, 6).map((c) => ({
        id: `c-${c.id}`,
        at: c.startsAt ?? new Date(now).toISOString(),
        kind: 'consultation' as const,
        text: `${c.referenceCode ?? c.id} · ${c.serviceName ?? 'Consultation'} with ${c.doctorName ?? 'a doctor'} is ${c.status.replace(/_/g, ' ')}`,
        to: `/consultations/${c.id}`,
      })),
      ...db.safetyAlerts.map((a) => ({
        id: `a-${a.id}`,
        at: a.raisedAt ?? new Date(now).toISOString(),
        kind: 'alert' as const,
        text: `${a.alertType === 'red_flag' ? 'Red-flag' : 'Follow-up'} alert${a.closedAt ? ' (closed)' : a.acknowledgedAt ? ' (acknowledged)' : ''}`,
        to: '/safety-alerts',
      })),
      ...db.complaints.map((c) => ({
        id: `p-${c.id}`,
        at: c.raisedAt ?? new Date(now).toISOString(),
        kind: 'complaint' as const,
        text: `Complaint: ${c.subject ?? 'No subject'}`,
        to: `/complaints/${c.id}`,
      })),
      ...sentHistory.slice(0, 4).map((h) => ({
        id: `n-${h.id}`,
        at: h.sentAt,
        kind: 'notification' as const,
        text: `${h.type === 'manual' ? 'Sent' : 'Automatic'} to ${h.audience === 'doctor' ? 'doctors' : 'patients'}: ${h.title}`,
        to: '/notifications?tab=history',
      })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8);

    return db.delay({
      attention: {
        redFlags,
        documentsAwaiting: awaitingReview.length,
        summariesNeedingAttention: caseSummaries.filter((s) => s.status === 'failed').length,
        openComplaints: openComplaints.length,
        pendingPayoutsInr: payouts.reduce((sum, p) => sum + (p.amountInr ?? 0), 0),
        pendingPayoutCount: payouts.length,
      },
      doctors: {
        total: db.doctors.length,
        verified: verified.length,
        awaitingReview: awaitingReview.length,
        listed: db.doctors.filter((d) => d.isListed).length,
      },
      patients: {
        total: patients.length,
        active: patients.filter((p) => p.status === 'active').length,
        joinedThisWeek: patients.filter((p) => new Date(p.joinedAt).getTime() >= now - 7 * DAY).length,
      },
      consultations: {
        today: last7Days[6].count,
        upcoming: consults.filter((c) => at(c) > now && (c.status === 'scheduled' || c.status === 'awaiting_doctor')).length,
        inProgress: statusCounts.get('in_progress') ?? 0,
        completedAllTime: (db.dashboard.completedCases as number | null | undefined) ?? statusCounts.get('completed') ?? 0,
        last7Days,
        previous7Days,
        byStatus: [...statusCounts.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
      },
      careHub: {
        published: items.filter((i) => i.status === 'published').length,
        inReview: items.filter((i) => i.status === 'in_review').length,
        drafts: items.filter((i) => i.status === 'draft').length,
      },
      notifications: {
        sentLast7Days: sentRecently.length,
        failedLast7Days: sentRecently.filter((h) => h.status === 'failed' || h.status === 'partial').length,
      },
      activity,
    });
  },
};
