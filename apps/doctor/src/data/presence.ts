import { doctorPresenceApi } from '@coracure/api';
import type { DoctorPresence, InstantOffer, PresenceRecord, SelfSettablePresence } from '@coracure/api';

import type { LiveStatus, ManualStatus } from './doctor';

/**
 * The status control, against the backend's presence.
 *
 * The two models line up exactly — four manual states and three the platform
 * sets — which is worth a mapping table rather than a cast: the names differ
 * (`scheduledOnly` vs `scheduled_only`), and a mismatch would be a silent 400
 * on the one control a doctor uses every day.
 */

const TO_API: Record<ManualStatus, SelfSettablePresence> = {
  available: 'available_now',
  offline: 'offline',
  paused: 'paused',
  scheduledOnly: 'scheduled_only',
};

const FROM_API: Record<DoctorPresence, LiveStatus> = {
  available_now: 'available',
  offline: 'offline',
  paused: 'paused',
  scheduled_only: 'scheduledOnly',
  request_pending: 'requestPending',
  in_consultation: 'inConsultation',
  completing_notes: 'completingNotes',
};

export const toApiPresence = (status: ManualStatus): SelfSettablePresence => TO_API[status];
export const toLiveStatus = (presence: DoctorPresence): LiveStatus => FROM_API[presence] ?? 'offline';

/**
 * Why "Available Now" is unavailable, in words, BEFORE it is pressed.
 *
 * *** THE BACKEND REFUSES IT, SO THE SCREEN HAS TO EXPLAIN IT. *** Going
 * available with a write-up outstanding is a `DOCUMENTATION_OUTSTANDING` 400.
 * `blockedByConsultationId` is on the presence record already, so the doctor
 * can be told which consultation is holding them rather than pressing a button
 * and being told no.
 *
 * `allowInstantConsult` is the other one, and it is not theirs to fix: an
 * administrator grants it.
 */
export const availableBlockedBecause = (
  presence: PresenceRecord | undefined,
): string | null => {
  if (!presence) return null;
  if (presence.blockedByConsultationId) {
    return 'Finish the write-up from your last consultation before going available.';
  }
  if (!presence.allowInstantConsult) {
    return 'Instant consultations are not enabled on your account. The Coracure team can turn them on.';
  }
  return null;
};

/** Seconds left on an offer, floored at zero. */
export const secondsLeft = (offer: InstantOffer, now = Date.now()): number =>
  Math.max(0, Math.floor((new Date(offer.expiresAt).getTime() - now) / 1000));

/**
 * An offer the doctor can still act on.
 *
 * An expired one stays in the list until the sweep clears it, so the screen
 * filters by the clock rather than trusting `outcome` — the alternative is a
 * countdown at 00:00 above a button that 409s.
 */
export const isActionable = (offer: InstantOffer, now = Date.now()): boolean =>
  offer.outcome === 'pending' && secondsLeft(offer, now) > 0;

export const KEYS = { presence: 'doctor:presence', offers: 'doctor:instant-offers' };

export const fetchPresence = (): Promise<PresenceRecord> => doctorPresenceApi.getPresence();
export const fetchOffers = (): Promise<InstantOffer[]> => doctorPresenceApi.openOffers();

export const setStatus = (status: ManualStatus): Promise<PresenceRecord> =>
  doctorPresenceApi.setPresence(toApiPresence(status));
