import { api } from '../http';

/**
 * Presence and Consult Now (API_CONTRACT §7.4).
 *
 * *** FOUR OF THE SEVEN STATES ARE THE DOCTOR'S; THREE ARE THE PLATFORM'S. ***
 * `request_pending`, `in_consultation` and `completing_notes` are set as things
 * happen. A provider who could set those by hand could sit in
 * `in_consultation` for ever and never be offered anything — which is not a
 * status, it is a way of hiding while still counting as part of the pool.
 */

export type DoctorPresence =
  | 'offline'
  | 'available_now'
  | 'request_pending'
  | 'in_consultation'
  | 'completing_notes'
  | 'paused'
  | 'scheduled_only';

/** The four a doctor may choose. The other three are the platform's. */
export const SELF_SETTABLE = ['offline', 'available_now', 'paused', 'scheduled_only'] as const;
export type SelfSettablePresence = (typeof SELF_SETTABLE)[number];

export type PresenceRecord = {
  doctorId: string;
  presence: DoctorPresence;
  /** True only in `available_now`, and only with nothing outstanding. */
  canReceiveInstant: boolean;
  /**
   * The consultation whose write-up is blocking them (FR-10.5). Non-null means
   * going `available_now` will be refused until it is finished — the app should
   * say which one rather than letting the doctor discover it from a 400.
   */
  blockedByConsultationId: string | null;
  /** An admin permission. A doctor cannot grant themselves instant consults. */
  allowInstantConsult: boolean;
};

export type InstantOffer = {
  id: string;
  consultationId: string;
  patientId: string;
  patientInitials: string | null;
  patientAge: number | null;
  patientGender: string;
  specialtyName: string;
  concernName: string | null;
  /** The first of the patient's languages. */
  preferredLanguage: string;
  /** Every language the patient consults in, in their order. Never empty. */
  languages: string[];
  paymentStatus: 'unpaid' | 'paid' | 'not_applicable';
  doctorId: string;
  /** Which attempt this is. Rising means the request is being re-routed. */
  attemptNumber: number;
  outcome: 'pending' | 'accepted' | 'declined' | 'timed_out' | 'superseded';
  offeredAt: string;
  /** The countdown. After this the offer moves to the next provider. */
  expiresAt: string;
};

export const getPresence = (): Promise<PresenceRecord> =>
  api.get<PresenceRecord>('/me/doctor/presence');

/**
 * Refused with `PRESENCE_NOT_SELF_SETTABLE` for a platform state, and with
 * `DOCUMENTATION_OUTSTANDING` when going available with a write-up unfinished.
 * The second is worth catching before the press: `blockedByConsultationId` on
 * the current record already says it is coming.
 */
export const setPresence = (presence: SelfSettablePresence): Promise<PresenceRecord> =>
  api.put<PresenceRecord>('/me/doctor/presence', { presence });

/** Requests waiting on this doctor right now. Safe to poll. */
export const openOffers = (): Promise<InstantOffer[]> =>
  api.get<InstantOffer[]>('/me/doctor/instant-requests');

/**
 * Takes the request.
 *
 * `OFFER_CLOSED` / `OFFER_NOT_FOUND` mean it timed out or went to somebody else
 * between the screen rendering and the tap — a race the countdown makes
 * likely, not an error to apologise for. Re-poll and show what is actually
 * waiting.
 */
export const acceptOffer = (consultationId: string): Promise<InstantOffer> =>
  api.post<InstantOffer>(`/me/doctor/instant-requests/${consultationId}/accept`);

/** `rerouted` says whether anybody else could be offered it. */
export const declineOffer = (consultationId: string): Promise<{ rerouted: boolean }> =>
  api.post<{ rerouted: boolean }>(`/me/doctor/instant-requests/${consultationId}/decline`);
