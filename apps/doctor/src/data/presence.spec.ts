import type { InstantOffer, PresenceRecord } from '@coracure/api';

import {
  availableBlockedBecause,
  isActionable,
  secondsLeft,
  toApiPresence,
  toLiveStatus,
} from './presence';
import { AUTO_STATUSES, MANUAL_STATUSES } from './doctor';

/**
 * The status control and the Consult Now queue.
 *
 * The status control is the one thing a doctor touches every day, so a name
 * that does not survive the round trip is a silent 400 on the most-used button
 * in the app. The offer cases are about the countdown: an expired offer is
 * still in the list, and a button above a 00:00 timer just 409s.
 */

const offer = (over: Partial<InstantOffer> = {}): InstantOffer =>
  ({
    id: 'o-1',
    consultationId: 'c-1',
    patientId: 'p-1',
    patientInitials: 'AS',
    patientAge: 34,
    patientGender: 'female',
    specialtyName: 'Psychiatry',
    concernName: 'Anxiety',
    preferredLanguage: 'en',
    paymentStatus: 'paid',
    doctorId: 'd-1',
    attemptNumber: 1,
    outcome: 'pending',
    offeredAt: new Date('2026-05-15T10:00:00.000Z').toISOString(),
    expiresAt: new Date('2026-05-15T10:01:00.000Z').toISOString(),
    ...over,
  }) as InstantOffer;

const presence = (over: Partial<PresenceRecord> = {}): PresenceRecord =>
  ({
    doctorId: 'd-1',
    presence: 'offline',
    canReceiveInstant: false,
    blockedByConsultationId: null,
    allowInstantConsult: true,
    ...over,
  }) as PresenceRecord;

/* -------------------------------- the names ------------------------------- */

test('every status the doctor can pick has a name the API accepts', () => {
  // The screen offers four. If one of them does not map, that button is a 400
  // and nobody finds out until a doctor presses it.
  MANUAL_STATUSES.forEach(({ key }) => {
    expect(toApiPresence(key)).toBeTruthy();
  });
  expect(MANUAL_STATUSES.map((m) => toApiPresence(m.key))).toEqual([
    'available_now',
    'scheduled_only',
    'paused',
    'offline',
  ]);
});

test('offline is one the doctor may set — it is not a platform state', () => {
  // Worth pinning: the contract document said otherwise for a while, and a
  // doctor who cannot go offline has no way to stop being offered work.
  expect(toApiPresence('offline')).toBe('offline');
});

test('every platform state has something to show, so the pill is never blank', () => {
  AUTO_STATUSES.forEach((auto) => {
    const fromApi = toLiveStatus(
      auto === 'requestPending'
        ? 'request_pending'
        : auto === 'inConsultation'
          ? 'in_consultation'
          : 'completing_notes',
    );
    expect(fromApi).toBe(auto);
  });
});

test('survives a round trip in both directions', () => {
  MANUAL_STATUSES.forEach(({ key }) => {
    expect(toLiveStatus(toApiPresence(key))).toBe(key);
  });
});

/* ------------------------------- the blockers ----------------------------- */

test('says which consultation is holding them back, before the button is pressed', () => {
  const why = availableBlockedBecause(presence({ blockedByConsultationId: 'c-9' }));

  // The backend answers this press with DOCUMENTATION_OUTSTANDING. The record
  // already carries the reason, so there is no excuse for discovering it from
  // a failure.
  expect(why).toMatch(/write-up/i);
});

test('names the permission a doctor cannot grant themselves', () => {
  const why = availableBlockedBecause(presence({ allowInstantConsult: false }));

  expect(why).toMatch(/Coracure team/i);
});

test('is silent when nothing is in the way', () => {
  expect(availableBlockedBecause(presence())).toBeNull();
});

/* ------------------------------- the countdown ---------------------------- */

test('counts the seconds left, and never goes negative', () => {
  const now = new Date('2026-05-15T10:00:30.000Z').getTime();
  expect(secondsLeft(offer(), now)).toBe(30);

  const after = new Date('2026-05-15T10:05:00.000Z').getTime();
  expect(secondsLeft(offer(), after)).toBe(0);
});

test('an expired offer is not actionable, even while it is still in the list', () => {
  const after = new Date('2026-05-15T10:05:00.000Z').getTime();

  // It stays until the sweep clears it. A live button over a 00:00 countdown
  // just 409s with OFFER_CLOSED.
  expect(isActionable(offer(), after)).toBe(false);
});

test('an offer already decided is not actionable either', () => {
  const now = new Date('2026-05-15T10:00:30.000Z').getTime();

  expect(isActionable(offer({ outcome: 'timed_out' }), now)).toBe(false);
  expect(isActionable(offer({ outcome: 'accepted' }), now)).toBe(false);
  expect(isActionable(offer(), now)).toBe(true);
});
