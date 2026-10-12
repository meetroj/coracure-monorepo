import type { Bill, Consultation, ConsultationStatus } from './types';
import type { ConsultationsQuery, ListedConsultation } from './consultationsList';

/**
 * The backend's appointment shapes, and the two translations the panel needs.
 *
 * Source of truth: `AdminConsultationRow` / `AdminConsultationQuery` in
 * `src/booking/admin-consultations.service.ts` and `ConsultationRecord` in
 * `src/booking/booking.service.ts`. Pure functions, no network, so the contract
 * is pinned by a spec and a backend rename fails a test rather than a screen.
 */

/** The panel's appointment statuses - the backend's own `DISPLAY_STATUSES`, in the order they are offered. */
export const DISPLAY_STATUSES = [
  'requested',
  'allocated',
  'upcoming',
  'in_progress',
  'awaiting_documentation',
  'completed',
  'cancelled',
  'no_show',
  'expired',
  'rescheduled',
] as const;

type Money = {
  status: 'unpaid' | 'paid' | 'refund_pending' | 'refunded';
  amountInr: number;
  refundedAmountInr: number | null;
};

export type LiveRow = {
  id: string;
  referenceCode: string;
  status: ConsultationStatus;
  displayStatus: string;
  mode: 'scheduled' | 'instant';
  channel: string;
  scheduledStartAt: string | null;
  createdAt: string;
  durationMinutes: number;
  startedAt: string | null;
  endedAt: string | null;
  actualDurationMinutes: number | null;
  patient: { id: string; fullName: string | null };
  doctor: { id: string; fullName: string } | null;
  specialty: { id: string; name: string };
  paymentStatus: 'unpaid' | 'paid' | 'not_applicable';
  refundStatus: string;
  payment: Money | null;
};

export type LivePage = { items: LiveRow[]; total: number; limit: number; offset: number };

/** What `GET /admin/consultations/:id` answers (the patient-facing `ConsultationRecord`, plus a payment state). */
export type LiveRecord = {
  id: string;
  referenceCode: string;
  patientId: string;
  status: ConsultationStatus;
  mode: 'scheduled' | 'instant';
  channel: string;
  specialtyId: string;
  doctorId: string | null;
  scheduledStartAt: string | null;
  durationMinutes: number;
  startedAt: string | null;
  endedAt: string | null;
  consultationFeeInr: number | null;
  paymentStatus: 'unpaid' | 'paid' | 'not_applicable';
  /** Shared with the list row, so the two cannot describe one booking differently. */
  displayStatus?: string;
  payment?: Money | null;
  createdAt: string;
};

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` (a local day, as the date inputs give it) to the instant that day begins. */
const startOfDay = (day: string): Date => new Date(`${day}T00:00:00`);

/**
 * The query string for `GET /admin/consultations`.
 *
 * - `Accepted` is not a backend state (accepted and upcoming are one: a paid
 *   booking always already has its provider), so it asks for `upcoming`.
 * - `to` is an inclusive DAY in the panel and an exclusive INSTANT in the API, so
 *   it becomes the start of the following day.
 * - `limit` is clamped to the API's maximum of 100.
 */
export function liveQuery(q: ConsultationsQuery): Record<string, string | number> {
  const out: Record<string, string | number> = { sort: 'newest', limit: Math.min(Math.max(q.limit ?? 25, 1), 100), offset: 0 };
  const search = q.search?.trim();
  if (search) out.search = search;
  if (q.status) out.displayStatuses = q.status === 'accepted' ? 'upcoming' : q.status;
  if (q.mode) out.mode = q.mode;
  if (q.doctorId) out.doctorId = q.doctorId;
  if (q.from) out.from = startOfDay(q.from).toISOString();
  if (q.to) out.to = new Date(startOfDay(q.to).getTime() + DAY_MS).toISOString();
  return out;
}

/** The panel's four payment words, from the money the payment row actually shows. */
function paymentWord(money: Money | null, derived: LiveRow['paymentStatus']): ListedConsultation['paymentStatus'] {
  if (money) {
    if (money.status === 'refunded') return 'refunded';
    if (money.status === 'unpaid') return 'pending';
    return 'paid';
  }
  return derived === 'paid' ? 'paid' : derived === 'unpaid' ? 'pending' : 'not_applicable';
}

/** One list row, in the shape the list screen already renders. */
export function fromLiveRow(row: LiveRow): ListedConsultation {
  const startsAt = row.scheduledStartAt ?? row.startedAt ?? row.createdAt;
  return {
    id: row.id,
    referenceCode: row.referenceCode,
    status: row.status,
    displayStatus: row.displayStatus,
    mode: row.mode,
    startsAt,
    endsAt: row.endedAt,
    serviceId: row.specialty.id,
    serviceName: row.specialty.name,
    doctorId: row.doctor?.id ?? null,
    doctorName: row.doctor?.fullName ?? null,
    patientId: row.patient.id,
    // The list is a queue to skim; a patient with no name yet is shown as such, never as an id.
    patientName: row.patient.fullName ?? 'Unnamed patient',
    channel: row.channel === 'audio' ? 'audio' : 'video',
    paymentStatus: paymentWord(row.payment, row.paymentStatus),
    createdAt: row.createdAt,
    actualDurationMinutes: row.actualDurationMinutes,
  };
}

/** The detail screen's record. Names come from separate lookups; a failed lookup leaves `-`, never the id. */
export function fromLiveRecord(
  rec: LiveRecord,
  names: { patient?: string | null; doctor?: string | null; service?: string | null },
): Consultation & { channel: 'video' | 'audio' } {
  const startsAt = rec.scheduledStartAt ?? rec.startedAt ?? null;
  const plannedEnd =
    rec.scheduledStartAt && rec.durationMinutes
      ? new Date(new Date(rec.scheduledStartAt).getTime() + rec.durationMinutes * 60_000).toISOString()
      : null;
  return {
    id: rec.id,
    referenceCode: rec.referenceCode,
    status: rec.status,
    displayStatus: rec.displayStatus,
    mode: rec.mode,
    startsAt,
    // The call's real end when it has one, otherwise the planned end.
    endsAt: rec.endedAt ?? plannedEnd,
    serviceId: rec.specialtyId,
    serviceName: names.service ?? null,
    doctorId: rec.doctorId,
    doctorName: names.doctor ?? null,
    patientId: rec.patientId,
    patientName: names.patient ?? '-',
    channel: rec.channel === 'audio' ? 'audio' : 'video',
    paymentStatus: paymentWord(rec.payment ?? null, rec.paymentStatus),
    createdAt: rec.createdAt,
    actualDurationMinutes: minutesBetween(rec.startedAt, rec.endedAt),
  };
}

/** Whole minutes between two instants, or null when either is missing or the end is not after the start. */
export function minutesBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 60_000) : null;
}

/**
 * The admin read exposes what was charged and what went back, not the fee
 * breakdown (that lives on the patient's own bill), so the breakdown is left
 * empty rather than recomputed - the bill is frozen at checkout.
 */
export function billFromRecord(rec: LiveRecord): Bill {
  const money = rec.payment ?? null;
  return {
    status: money ? (money.status === 'unpaid' ? 'pending' : money.status) : 'pending',
    total: money?.amountInr ?? null,
    refundAmount: money?.refundedAmountInr ?? null,
  };
}
