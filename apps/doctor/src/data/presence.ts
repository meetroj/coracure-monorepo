import { doctorPresenceApi, doctorProfileApi } from '@coracure/api';
import type { DoctorPresence, InstantOffer, PresenceRecord, SelfSettablePresence } from '@coracure/api';

import { useEffect, useRef } from 'react';

import { setPresenceRecord } from '../state/actions';
import { useResource } from './useResource';
import type { InstantRequest, LiveStatus, ManualStatus } from './doctor';

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
  presence: Pick<PresenceRecord, 'blockedByConsultationId' | 'allowInstantConsult'> | undefined,
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

export const acceptOffer = (consultationId: string): Promise<InstantOffer> => doctorPresenceApi.acceptOffer(consultationId);
export const declineOffer = (consultationId: string): Promise<{ rerouted: boolean }> => doctorPresenceApi.declineOffer(consultationId);

/**
 * Loads presence into the store every screen reading the status control shares.
 *
 * *** APPLIES THE SERVER SNAPSHOT AT MOST ONCE, AND NEVER OVER A LOCAL WRITE. ***
 * There is no poll here, so the fetch and a doctor pressing Save race exactly
 * once, right after mount. `applied` stops a second GET from reapplying; it
 * does not stop THIS one from landing late. `markWritten()` does: the caller
 * marks the moment its own optimistic update fires, synchronously and before
 * any `await`, so a GET already in flight that resolves afterwards finds the
 * flag set and skips — the write a doctor just made outranks a read that
 * started before it.
 */
export const useDoctorPresence = () => {
  const resource = useResource(KEYS.presence, fetchPresence);
  const applied = useRef(false);
  const written = useRef(false);

  useEffect(() => {
    if (resource.data && !applied.current && !written.current) {
      applied.current = true;
      setPresenceRecord({
        liveStatus: toLiveStatus(resource.data.presence),
        blockedByConsultationId: resource.data.blockedByConsultationId,
        allowInstantConsult: resource.data.allowInstantConsult,
      });
    }
  }, [resource.data]);

  return { ...resource, markWritten: () => (written.current = true) };
};

export const OFFER_POLL_MS = 15000;

/**
 * Asks for open instant offers every `OFFER_POLL_MS` while `enabled`, and hands
 * each actionable one to `onOffer` once. There is no push for offers yet, so
 * without this a doctor set to Available Now would never see one.
 */
export const useInstantOfferPoll = (enabled: boolean, onOffer: (offer: InstantOffer) => void) => {
  const seen = useRef(new Set<string>());
  const handler = useRef(onOffer);
  handler.current = onOffer;

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const tick = () =>
      fetchOffers()
        .then((offers) => {
          const offer = alive ? offers.find((o) => isActionable(o) && !seen.current.has(o.consultationId)) : undefined;
          if (!offer) return;
          seen.current.add(offer.consultationId);
          handler.current(offer);
        })
        // a missed poll is retried on the next tick; nothing to tell the doctor
        .catch(() => undefined);
    tick();
    const timer = setInterval(tick, OFFER_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [enabled]);
};

const GENDER: Record<string, InstantRequest['gender']> = { male: 'Male', female: 'Female' };
const LANGUAGE_NAME: Record<string, string> = doctorProfileApi.LANGUAGE_NAMES;

/**
 * An offer, as the request screen shows it.
 *
 * *** NEVER THE PATIENT'S NAME. *** An offer is not an acceptance — this
 * doctor has not taken the case and may never treat this patient — so `name`
 * holds the initials the backend sends, same as the card everywhere else an
 * offer (not yet a consultation) is shown.
 *
 * `mode` and `approxMinutes` have no field on `InstantOffer` at all: an instant
 * request is video-only today, and the backend does not estimate a duration.
 */
export const toInstantRequest = (offer: InstantOffer, now = Date.now()): InstantRequest => ({
  patientId: offer.patientId,
  initials: offer.patientInitials ?? '–',
  name: offer.patientInitials ?? 'Patient',
  age: offer.patientAge ?? 0,
  gender: GENDER[offer.patientGender] ?? 'Other',
  speciality: offer.specialtyName,
  concern: offer.concernName ?? 'General consultation',
  mode: 'video',
  languages: (offer.languages ?? [offer.preferredLanguage]).map((code) => LANGUAGE_NAME[code] ?? code).join(', '),
  approxMinutes: 30,
  // what is LEFT, not the whole window: the offer may have waited before this screen opened
  respondWithin: Math.max(1, secondsLeft(offer, now)),
});
