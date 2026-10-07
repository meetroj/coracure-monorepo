import { api } from '../http';

/**
 * The doctor's day (API_CONTRACT §7.5) and the two queues the dashboard leads
 * with.
 *
 * *** THE PATIENT BLOCK IS ONLY ON THE TREATING SIDE'S READS. *** It is absent
 * from a patient's own read of their own booking, and it never appears on a
 * Consult Now offer — a doctor who has been offered a request has not accepted
 * it, may decline, and is not treating anybody yet, so `OfferRecord` stays on
 * initials. The name rides on a record the backend already refuses to anyone
 * not party to the consultation, which is what makes carrying it safe.
 */

export type ConsultationStatus =
  | 'pending_payment'
  | 'scheduled'
  | 'awaiting_doctor'
  | 'in_progress'
  | 'awaiting_documentation'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'expired';

export type DoctorConsultation = {
  id: string;
  /** Human-quotable. What support and the doctor both use to name a case. */
  referenceCode: string;
  patientId: string;
  status: ConsultationStatus;
  mode: 'scheduled' | 'instant';
  channel: 'video' | 'audio';
  specialtyId: string;
  concernId: string | null;
  doctorId: string | null;
  scheduledStartAt: string | null;
  durationMinutes: number;
  holdExpiresAt: string | null;
  consultationFeeInr: number | null;
  cancelledAt: string | null;
  /** Who cancelled it. Null on a booking that was not cancelled. */
  cancelledByParty: 'patient' | 'doctor' | 'admin' | 'system' | null;
  cancellationReason: string | null;
  createdAt: string;
  intakeAnswers: Record<string, unknown> | null;
  paymentStatus: 'unpaid' | 'paid' | 'not_applicable';
  /** Present only on a doctor's or admin's read. Absent on the patient's own. */
  patient?: {
    id: string;
    fullName: string | null;
    initials: string | null;
    age: number | null;
    gender: 'male' | 'female' | 'other' | 'undisclosed';
    preferredLanguage: string;
  };
  /** Present only on a single-record read by a doctor or admin. */
  doctorContext?: {
    riskCategory: 'low' | 'moderate' | 'high' | null;
    totalPastConsultationsWithDoctor: number;
    hasCurrentTeleconsultationConsent: boolean;
    /** What the patient entered on their own profile. The assigned doctor only; absent on an admin's read. */
    patientHealth?: {
      /** `a_positive` … `o_negative`. */
      bloodGroup: string | null;
      heightCm: number | null;
      weightKg: number | null;
      allergies: string | null;
      medicalConditions: string | null;
      currentMedications: string | null;
    };
  };
};

/** The treating clinician's view of a patient. */
export type PatientCard = {
  id: string;
  fullName: string | null;
  initials: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'other' | 'undisclosed';
  preferredLanguage: string;
  /** Every language the patient consults in, in their order. Never empty. */
  languages: string[];
};

export type PendingDocumentation = {
  consultationId: string;
  referenceCode: string;
  scheduledStartAt: string | null;
  status: ConsultationStatus;
  startedAt: string | null;
  outstanding: { code: string; message: string }[];
};

export type SafetyAlert = {
  id: string;
  alertType: 'red_flag' | 'amber' | 'missed_checkin' | 'medication_side_effect' | 'followup_due';
  consultationId: string;
  patientId: string;
  patientInitials: string | null;
  patientName: string | null;
  patientAge: number | null;
  patientGender: string;
  checkinResponseId: string | null;
  reason: string | null;
  state: 'open' | 'acknowledged' | 'closed';
  acknowledgedAt: string | null;
  acknowledgedBy: { type: 'admin' | 'doctor'; id: string } | null;
  closedAt: string | null;
  closingNote: string | null;
  createdAt: string;
};

/**
 * `upcoming` is not "in the future" — it is everything still HOLDING TIME:
 * `pending_payment`, `scheduled` and `awaiting_doctor`. A consultation that
 * was held this morning and not yet written up is in the PAST list even though
 * it is the doctor's most urgent piece of work, which is why the dashboard
 * reads `pendingDocumentation` separately rather than filtering this one.
 */
export const listConsultations = (
  query: { upcoming?: boolean; limit?: number } = {},
): Promise<DoctorConsultation[]> =>
  api.get<DoctorConsultation[]>('/doctor/consultations', { query });

export const getConsultation = (consultationId: string): Promise<DoctorConsultation> =>
  api.get<DoctorConsultation>(`/doctor/consultations/${consultationId}`);

/** Refused unless a consultation ties this doctor to this patient. */
export const getPatientCard = (patientId: string): Promise<PatientCard> =>
  api.get<PatientCard>(`/patients/${patientId}/card`);

/**
 * Consultations held and not written up.
 *
 * *** NOT A BADGE. *** While this is non-empty the doctor cannot go
 * `available_now` — the backend refuses the presence change with
 * `DOCUMENTATION_OUTSTANDING`. A dashboard that shows it as a count beside the
 * others leaves a doctor pressing "Available" and being told no, with no idea
 * why.
 */
export const pendingDocumentation = (): Promise<PendingDocumentation[]> =>
  api.get<PendingDocumentation[]>('/doctor/pending-documentation');

export const listSafetyAlerts = (
  query: { openOnly?: boolean; alertType?: string; limit?: number } = {},
): Promise<SafetyAlert[]> => api.get<SafetyAlert[]>('/doctor/safety-alerts', { query });

export const getSafetyAlert = (alertId: string): Promise<SafetyAlert> =>
  api.get<SafetyAlert>(`/doctor/safety-alerts/${alertId}`);

/** Idempotent — acknowledging an already-acknowledged alert just returns it. */
export const acknowledgeSafetyAlert = (alertId: string): Promise<SafetyAlert> =>
  api.post<SafetyAlert>(`/doctor/safety-alerts/${alertId}/acknowledge`);

/** Refused with `ALERT_NOT_ACKNOWLEDGED` until the alert has been acknowledged first. */
export const closeSafetyAlert = (alertId: string, closingNote: string): Promise<SafetyAlert> =>
  api.post<SafetyAlert>(`/doctor/safety-alerts/${alertId}/close`, { closingNote });

export const unreadNotifications = (): Promise<{ unread: number }> =>
  api.get<{ unread: number }>('/me/notifications/unread-count');

/**
 * The concern taxonomy, for labelling a card.
 *
 * A consultation carries a `concernId` and nothing else, so without this every
 * appointment reads "General consultation". It is the shared catalogue route
 * (`@Roles('patient','doctor','admin')`) rather than a doctor-specific one —
 * it lives here because the doctor's day is the only thing in this app that
 * needs it, and it must go through the same session as the rest.
 */
export type Concern = {
  id: string;
  specialtyId: string;
  code: string;
  name: string;
  matchPhrases: string[];
  matchWeight: number;
  isActive: boolean;
};

export const listConcerns = (specialtyId?: string): Promise<Concern[]> =>
  api.get<Concern[]>('/concerns', { query: { specialtyId } });

/** The patient did not attend. Recorded against the consultation, not the person. */
export const markNoShow = (consultationId: string): Promise<DoctorConsultation> =>
  api.post<DoctorConsultation>(`/doctor/consultations/${consultationId}/no-show`);

/** A consultation this doctor cannot take. The reason is recorded. */
export const cancelConsultation = (
  consultationId: string,
  reason?: string,
): Promise<DoctorConsultation> =>
  api.post<DoctorConsultation>(
    `/doctor/consultations/${consultationId}/cancel`,
    reason ? { reason } : {},
  );
