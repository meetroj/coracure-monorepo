import { request } from './http';
import { listAll, type Everything } from './liveList';
import type { AllocationDecision, SafetyAlert } from './types';

/**
 * Safety alerts and follow-ups against the backend: `/admin/safety-alerts`,
 * `/admin/followups`.
 *
 * Source of truth: `AlertRecord`, `CloseAlertDto`, `AdminFollowupRow`,
 * `AdminFollowupDetail`, `followup-state.ts`.
 *
 * What an admin can do here, and what not. Safety alerts are acknowledged and
 * closed from the panel. Follow-ups are READ-ONLY: the treating provider
 * reviews a check-in and recommends a consultation, and the backend gives an
 * admin no way to move one, so the panel shows whose turn it is and does not
 * offer buttons that would pretend to.
 */

/* ------------------------------ safety alerts ------------------------------ */

type LiveAlert = {
  id: string;
  alertType: SafetyAlert['alertType'];
  consultationId: string;
  patientInitials: string | null;
  patientAge: number | null;
  patientGender: string | null;
  reason: string | null;
  state: 'open' | 'acknowledged' | 'closed';
  acknowledgedAt: string | null;
  acknowledgedBy: { type: 'admin' | 'doctor'; id: string } | null;
  closedAt: string | null;
  closingNote: string | null;
  escalatedAt: string | null;
  createdAt: string;
};

const GENDER: Record<string, string> = { male: 'M', female: 'F', other: 'Other' };

/** The masked identity the alert queue shows: initials, age and sex, never a name. */
export function patientRefOf(a: Pick<LiveAlert, 'patientInitials' | 'patientAge' | 'patientGender'>): string | null {
  const parts = [
    a.patientInitials,
    a.patientAge != null ? `${a.patientAge}` : null,
    a.patientGender ? (GENDER[a.patientGender] ?? null) : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export const alertFrom = (a: LiveAlert): SafetyAlert => ({
  id: a.id,
  alertType: a.alertType,
  consultationId: a.consultationId,
  patientRef: patientRefOf(a),
  raisedAt: a.createdAt,
  acknowledgedAt: a.acknowledgedAt,
  acknowledgedByAdminId: a.acknowledgedBy?.type === 'admin' ? a.acknowledgedBy.id : null,
  closedAt: a.closedAt,
  summary: a.closingNote && a.closedAt ? `${a.reason ?? 'Closed'} - ${a.closingNote}` : a.reason,
});

/** What was done: required, at most 2000 characters (`CloseAlertDto`). */
export function closeAlertBody(whatWasDone: string): { closingNote: string } {
  const text = whatWasDone.trim();
  if (!text) throw new Error('Say what was done about this alert.');
  if (text.length > 2000) throw new Error('That can be at most 2000 characters.');
  return { closingNote: text };
}

const alertPath = (id: string) => `/admin/safety-alerts/${encodeURIComponent(id)}`;

export const liveSafety = {
  /** Open red findings first and never capped, then the rest up to 200: the backend orders them. */
  list: async (): Promise<SafetyAlert[]> =>
    (await request<LiveAlert[]>('/admin/safety-alerts', { query: { openOnly: false, limit: 200 } })).map(alertFrom),

  acknowledge: async (id: string) => alertFrom(await request<LiveAlert>(`${alertPath(id)}/acknowledge`, { method: 'POST', body: {} })),

  close: async (id: string, whatWasDone: string) =>
    alertFrom(await request<LiveAlert>(`${alertPath(id)}/close`, { method: 'POST', body: closeAlertBody(whatWasDone) })),
};

/* -------------------------------- follow-ups ------------------------------- */

export const FOLLOWUP_STATES = [
  'patient_response_pending',
  'provider_review_pending',
  'reviewed',
  'consultation_recommended',
  'completed',
  'cancelled',
] as const;
export type FollowupState = (typeof FOLLOWUP_STATES)[number];

type LiveFollowupRow = {
  consultationId: string;
  referenceCode: string;
  patient: { id: string; fullName: string | null };
  doctor: { id: string; fullName: string } | null;
  pathway: { code: string; name: string; version: number } | null;
  startsOn: string | null;
  endsOn: string | null;
  followupStatus: 'active' | 'completed' | 'cancelled';
  followupState: FollowupState;
  latestCheckin: { date: string; status: 'green' | 'amber' | 'red'; reviewed: boolean } | null;
  openAlertCount: number;
};

type LiveCheckin = {
  id: string;
  date: string;
  status: 'green' | 'amber' | 'red';
  submittedAt: string;
  reviewed: boolean;
  reviewedAt: string | null;
  reviewedBy: { id: string; fullName: string } | null;
  consultationRecommended: boolean;
  reviewNote: string | null;
};

type LiveFollowupDetail = LiveFollowupRow & {
  durationDays: number | null;
  todayIsDay: number | null;
  checkins: LiveCheckin[];
  alerts: { id: string; alertType: string; state: 'open' | 'acknowledged' | 'closed'; reason: string | null; createdAt: string; closedAt: string | null; closingNote: string | null }[];
};

export type FollowupRow = {
  id: string;
  referenceCode: string;
  patientId: string;
  patientName: string;
  providerId: string | null;
  providerName: string;
  pathwayName: string;
  state: FollowupState;
  startsOn: string | null;
  endsOn: string | null;
  latestCheckin: LiveFollowupRow['latestCheckin'];
  openAlerts: number;
};

export type FollowupDetail = FollowupRow & {
  durationDays: number | null;
  todayIsDay: number | null;
  checkins: LiveCheckin[];
  alerts: LiveFollowupDetail['alerts'];
};

export const followupFrom = (r: LiveFollowupRow): FollowupRow => ({
  id: r.consultationId,
  referenceCode: r.referenceCode,
  patientId: r.patient.id,
  patientName: r.patient.fullName ?? 'Unnamed patient',
  providerId: r.doctor?.id ?? null,
  providerName: r.doctor?.fullName ?? 'Not assigned',
  pathwayName: r.pathway?.name ?? 'No pathway',
  state: r.followupState,
  startsOn: r.startsOn,
  endsOn: r.endsOn,
  latestCheckin: r.latestCheckin,
  openAlerts: r.openAlertCount,
});

export const followupDetailFrom = (d: LiveFollowupDetail): FollowupDetail => ({
  ...followupFrom(d),
  durationDays: d.durationDays,
  todayIsDay: d.todayIsDay,
  checkins: d.checkins,
  alerts: d.alerts,
});

export const followups = {
  list: (): Promise<Everything<FollowupRow>> =>
    listAll<LiveFollowupRow>('/admin/followups').then((r) => ({ ...r, items: r.items.map(followupFrom) })),

  get: async (consultationId: string) =>
    followupDetailFrom(await request<LiveFollowupDetail>(`/admin/followups/${encodeURIComponent(consultationId)}`)),
};

/* ------------------------- allocation decisions ---------------------------- */

type LiveDecision = { consultationId: string; at: string; actorType: string; basis: Record<string, unknown> | null };

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/**
 * A decision as the audit trail holds it. Four writers use one entity type, so
 * the basis is read from which keys are present, never assumed: an automatic
 * match names the language and region, a refusal says why nobody was found, an
 * override names the admin's reason, a decline is the patient's.
 */
export function decisionFrom(d: LiveDecision, names: ReadonlyMap<string, string> = new Map()): AllocationDecision {
  const b = d.basis ?? {};
  const doctorId = text(b.assignedDoctorId) ?? text(b.to) ?? text(b.declinedDoctorId);
  let basis: string;
  let reason: string | null = text(b.reason);
  if (b.refused === true) {
    basis = 'No provider available';
    const soonest = text(b.soonestAvailableAt);
    reason = [reason, soonest ? `Soonest cover: ${new Date(soonest).toLocaleString()}` : null].filter(Boolean).join('. ') || null;
  } else if (b.override === true) {
    basis = 'Admin override';
  } else if (text(b.declinedDoctorId)) {
    basis = 'Declined by the patient';
  } else if (b.chosenByPatient === true) {
    basis = 'Chosen by the patient';
  } else {
    const language = text(b.language);
    basis = language ? `Automatic: matched on language ${language}${b.regionRelaxed === true ? ', region relaxed' : ''}` : 'Automatic';
  }
  return {
    consultationId: d.consultationId,
    doctorId,
    doctorName: doctorId ? (names.get(doctorId) ?? null) : null,
    decidedAt: d.at,
    basis,
    // The backend sends who did it as a kind, not an id; only "was it an admin" is read.
    overriddenByAdminId: d.actorType === 'admin' ? 'admin' : null,
    reason,
  };
}

export const liveGovernance = {
  allocationDecisions: async (): Promise<AllocationDecision[]> => {
    const [rows, roster] = await Promise.all([
      request<LiveDecision[]>('/admin/governance/allocation-decisions', { query: { limit: 200 } }),
      // Names are a convenience: a roster this role cannot read leaves the id.
      listAll<{ id: string; fullName: string }>('/admin/doctors').catch(() => null),
    ]);
    const names = new Map((roster?.items ?? []).map((d) => [d.id, d.fullName]));
    return rows.map((r) => decisionFrom(r, names));
  },
};
