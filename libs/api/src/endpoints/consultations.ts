import { api } from '../http';
import type { Consultation } from '../types';

/**
 * The patient's bookings (FR-4.6, FR-6.5).
 *
 * *** THERE IS NO ENDPOINT HERE THAT TAKES A PROVIDER, AND THERE MUST NOT BE. ***
 * The patient chooses a service and a time; the backend assigns. The only path
 * in the whole platform that names a provider is an admin override.
 */

export const listConsultations = (query: { upcoming?: boolean; limit?: number } = {}): Promise<
  Consultation[]
> =>
  api.get<Consultation[]>('/me/consultations', {
    query: { upcoming: query.upcoming, limit: query.limit },
  });

export const getConsultation = (consultationId: string): Promise<Consultation> =>
  api.get<Consultation>(`/me/consultations/${consultationId}`);

/**
 * Books a scheduled consultation.
 *
 * Returns `pending_payment` with a `holdExpiresAt` — that row IS the slot hold
 * and it expires, so the screen that calls this owns a visible countdown and an
 * expiry path. A free service comes back `scheduled` outright.
 *
 * Refusal with `NO_PROVIDER_AVAILABLE` is a designed outcome carrying the
 * soonest time the pool can cover, not an error toast.
 */
export const bookConsultation = (input: {
  specialtyId: string;
  startsAt: string;
  concernId?: string;
  intakeAnswers?: Record<string, unknown>;
}): Promise<Consultation> => {
  const body: Record<string, unknown> = {
    specialtyId: input.specialtyId,
    startsAt: input.startsAt,
  };
  if (input.concernId) body.concernId = input.concernId;
  if (input.intakeAnswers) body.intakeAnswers = input.intakeAnswers;
  return api.post<Consultation>('/me/consultations', body);
};

/** Consult Now. Created with no provider yet; M-13 offers and re-routes it. */
export const requestInstantConsultation = (input: {
  specialtyId: string;
  concernId?: string;
  intakeAnswers?: Record<string, unknown>;
}): Promise<Consultation> => {
  const body: Record<string, unknown> = { specialtyId: input.specialtyId };
  if (input.concernId) body.concernId = input.concernId;
  if (input.intakeAnswers) body.intakeAnswers = input.intakeAnswers;
  return api.post<Consultation>('/me/consultations/instant', body);
};

export const cancelConsultation = (consultationId: string, reason?: string): Promise<Consultation> =>
  api.post<Consultation>(
    `/me/consultations/${consultationId}/cancel`,
    reason ? { reason } : {},
  );

export const rescheduleConsultation = (
  consultationId: string,
  startsAt: string,
): Promise<Consultation> =>
  api.post<Consultation>(`/me/consultations/${consultationId}/reschedule`, { startsAt });

/** FR-4.4. The reason is required — a decline with none tells nobody anything. */
export const declineProvider = (consultationId: string, reason: string): Promise<Consultation> =>
  api.post<Consultation>(`/me/consultations/${consultationId}/decline-provider`, { reason });
