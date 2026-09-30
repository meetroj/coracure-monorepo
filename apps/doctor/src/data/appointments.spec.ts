import type { DoctorConsultation } from '@coracure/api';
import { doctorConsultationsApi } from '@coracure/api';

import { fetchDoctorDay, toAppointment } from './appointments';
import { TODAY, dayOffset } from './calendar';

/**
 * Backend consultations → the cards a doctor reads.
 *
 * The cases here are the ones where the two models disagree: nine statuses
 * mapped onto five, a "past" list that contains this morning's work, and an
 * instant request that has no scheduled time at all.
 */

const at = (offsetDays: number, hour: number, minute = 0) => {
  const d = dayOffset(offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const consultation = (over: Partial<DoctorConsultation> = {}): DoctorConsultation =>
  ({
    id: 'c-1',
    referenceCode: 'CC-10482',
    patientId: 'p-1',
    status: 'scheduled',
    mode: 'scheduled',
    channel: 'video',
    specialtyId: 's-1',
    concernId: 'cn-1',
    doctorId: 'd-1',
    scheduledStartAt: at(0, 12),
    durationMinutes: 30,
    holdExpiresAt: null,
    consultationFeeInr: 800,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: at(-2, 9),
    intakeAnswers: null,
    paymentStatus: 'paid',
    patient: {
      id: 'p-1',
      fullName: 'Anita Sharma',
      initials: 'AS',
      age: 34,
      gender: 'female',
      preferredLanguage: 'en',
    },
    ...over,
  }) as DoctorConsultation;

/* --------------------------------- mapping -------------------------------- */

test('reads the human reference code as the case id, not the uuid', () => {
  const a = toAppointment(consultation());

  // CC-10482 is what a doctor and support both quote down a phone.
  expect(a.consultationId).toBe('CC-10482');
  expect(a.id).toBe('c-1');
});

test('names the patient, and keeps initials for the avatar', () => {
  const a = toAppointment(consultation());

  expect(a.name).toBe('Anita Sharma');
  expect(a.initials).toBe('AS');
  expect(a.age).toBe(34);
  expect(a.gender).toBe('Female');
});

test('falls back to initials rather than printing a missing name', () => {
  const a = toAppointment(
    consultation({ patient: { id: 'p-1', fullName: null, initials: 'AS', age: null, gender: 'undisclosed', preferredLanguage: 'en' } as never }),
  );

  expect(a.name).toBe('AS');
  // A patient who declined to say is not a third category to display.
  expect(a.gender).toBe('Other');
});

test('resolves the concern to its name, or says so plainly', () => {
  const named = toAppointment(consultation(), new Map([['cn-1', 'Anxiety and restlessness']]));
  expect(named.concern).toBe('Anxiety and restlessness');

  // A booking made without a concern is normal — the patient picked a service.
  expect(toAppointment(consultation({ concernId: null })).concern).toBe('General consultation');
});

/* --------------------------------- statuses ------------------------------- */

test('a held slot nobody has paid for is still on the diary', () => {
  const a = toAppointment(consultation({ status: 'pending_payment', paymentStatus: 'unpaid' }));

  // The slot IS held. Hiding it would double-book the doctor when it settles.
  expect(a.state).toBe('confirmed');
  expect(a.payment).toBe('notPaid');
});

test('a consultation awaiting its write-up reads as completed', () => {
  const a = toAppointment(consultation({ status: 'awaiting_documentation', scheduledStartAt: at(0, 9) }));

  // It happened. What is outstanding is the WRITE-UP, and that has its own
  // queue rather than a fifth state on the card.
  expect(a.state).toBe('completed');
});

test.each([
  ['cancelled', 'cancelled'],
  ['expired', 'cancelled'],
  ['no_show', 'noShow'],
  ['in_progress', 'confirmed'],
])('maps %s onto %s', (status, expected) => {
  expect(toAppointment(consultation({ status: status as never })).state).toBe(expected);
});

test('today reads as confirmed; a future day reads as upcoming', () => {
  expect(toAppointment(consultation({ scheduledStartAt: at(0, 12) })).state).toBe('confirmed');
  expect(toAppointment(consultation({ scheduledStartAt: at(3, 12) })).state).toBe('upcoming');
});

test('buckets by the day, from the pinned today', () => {
  expect(toAppointment(consultation({ scheduledStartAt: at(0, 12) })).bucket).toBe('today');
  expect(toAppointment(consultation({ scheduledStartAt: at(2, 12) })).bucket).toBe('upcoming');
  expect(toAppointment(consultation({ scheduledStartAt: at(-2, 12) })).bucket).toBe('past');
});

test('a cancelled booking shows refunded rather than a payment answer that does not apply', () => {
  const a = toAppointment(consultation({ status: 'cancelled', paymentStatus: 'not_applicable' }));

  expect(a.payment).toBe('refunded');
});

test('an instant request with no scheduled time falls back to when it was asked', () => {
  const a = toAppointment(
    consultation({ mode: 'instant', status: 'awaiting_doctor', scheduledStartAt: null, createdAt: at(0, 14, 30) }),
  );

  // Not a crash and not 1970: the moment the patient asked is what the doctor
  // is deciding against.
  expect(a.time).toBe('02:30 PM');
  expect(a.dayOffset).toBe(0);
});

/* ------------------------------- the whole day ---------------------------- */

describe('loading the day', () => {
  beforeEach(() => {
    jest.spyOn(doctorConsultationsApi, 'listConsultations').mockResolvedValue([]);
    jest.spyOn(doctorConsultationsApi, 'pendingDocumentation').mockResolvedValue([]);
    jest.spyOn(doctorConsultationsApi, 'listSafetyAlerts').mockResolvedValue([]);
    jest.spyOn(doctorConsultationsApi, 'unreadNotifications').mockResolvedValue({ unread: 3 });
  });

  it('asks for BOTH lists, because this morning is already in the past one', async () => {
    await fetchDoctorDay();

    // `upcoming` means "still holding time". A doctor at 6pm with three
    // write-ups outstanding would otherwise see an empty day.
    expect(doctorConsultationsApi.listConsultations).toHaveBeenCalledWith(
      expect.objectContaining({ upcoming: true }),
    );
    expect(doctorConsultationsApi.listConsultations).toHaveBeenCalledWith(
      expect.objectContaining({ upcoming: false }),
    );
  });

  it('returns one list, in the order a day runs', async () => {
    (doctorConsultationsApi.listConsultations as jest.Mock)
      .mockResolvedValueOnce([consultation({ id: 'later', scheduledStartAt: at(0, 17) })])
      .mockResolvedValueOnce([consultation({ id: 'earlier', scheduledStartAt: at(0, 9), status: 'completed' })]);

    const day = await fetchDoctorDay();

    expect(day.appointments.map((a) => a.id)).toEqual(['earlier', 'later']);
  });

  it('carries the write-up queue and the badge through', async () => {
    (doctorConsultationsApi.pendingDocumentation as jest.Mock).mockResolvedValue([
      { consultationId: 'c-9', referenceCode: 'CC-9', outstanding: [{ code: 'CASE_SUMMARY_MISSING', message: 'x' }] },
    ]);

    const day = await fetchDoctorDay();

    expect(day.pendingDocumentation).toHaveLength(1);
    expect(day.unreadNotifications).toBe(3);
  });
});
