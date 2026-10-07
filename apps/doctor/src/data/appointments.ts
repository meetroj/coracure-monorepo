import { doctorConsultationsApi } from '@coracure/api';
import type { DoctorConsultation, PendingDocumentation, SafetyAlert } from '@coracure/api';

import { useEffect } from 'react';

import { setDoctorDay } from '../state/actions';
import { TODAY, daysBetween, fmtDate, minutesToClock, relativeDay } from './calendar';
import { useResource } from './useResource';
import type { Appointment, AppointmentState, ConsultMode, PaymentState } from './doctor';

/**
 * The backend's consultations, as the doctor app's appointments.
 *
 * One mapping, used by every screen, because the dashboard's counts and the
 * list they open read the same array — a tile saying "3 today" that opens a
 * list of 2 is the bug this exists to prevent.
 */

/**
 * `status` is the backend's nine-state machine; the app shows five.
 *
 * `pending_payment` maps to a booking like any other: the slot IS held, and a
 * doctor's diary has to show it or they will be double-booked when it settles.
 * `awaiting_documentation` is `completed` here — the consultation happened;
 * what is outstanding is the WRITE-UP, and that has its own queue on the
 * dashboard rather than a fifth state on a card.
 */
const STATE: Record<DoctorConsultation['status'], AppointmentState> = {
  pending_payment: 'confirmed',
  scheduled: 'confirmed',
  awaiting_doctor: 'confirmed',
  in_progress: 'confirmed',
  awaiting_documentation: 'completed',
  completed: 'completed',
  cancelled: 'cancelled',
  no_show: 'noShow',
  // A hold nobody paid for. Cancelled from the doctor's point of view: the
  // time is free again and nobody decided anything.
  expired: 'cancelled',
};

const PAYMENT: Record<DoctorConsultation['paymentStatus'], PaymentState> = {
  paid: 'paid',
  unpaid: 'notPaid',
  // Cancelled or expired: "paid" and "unpaid" are both the wrong question, and
  // `refunded` is the only one of the three the card can show honestly.
  not_applicable: 'refunded',
};

const GENDER: Record<string, Appointment['gender']> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  undisclosed: 'Other',
};

/**
 * An instant consultation has no `scheduledStartAt` until a doctor accepts it,
 * so the created time stands in — it is still the moment the patient asked,
 * which is what a doctor is deciding against.
 */
const startOf = (c: DoctorConsultation): Date => new Date(c.scheduledStartAt ?? c.createdAt);

export const toAppointment = (
  c: DoctorConsultation,
  concernNames: Map<string, string> = new Map(),
): Appointment => {
  const start = startOf(c);
  const offset = daysBetween(TODAY, start);
  const minutes = start.getHours() * 60 + start.getMinutes();
  const patient = c.patient;

  const state = STATE[c.status];
  return {
    id: c.id,
    patientId: c.patientId,
    // What the doctor and support both quote. The UUID is not for humans.
    consultationId: c.referenceCode,
    dayOffset: offset,
    dayLabel: relativeDay(start),
    dateLabel: fmtDate(start),
    time: minutesToClock(minutes),
    minutes,
    initials: patient?.initials ?? '–',
    // Null only if the patient has not completed their own profile; the card
    // falls back to initials rather than printing "null".
    name: patient?.fullName ?? patient?.initials ?? 'Patient',
    age: patient?.age ?? 0,
    gender: GENDER[patient?.gender ?? 'undisclosed'] ?? 'Other',
    mode: c.channel as ConsultMode,
    // A future booking reads as "upcoming"; today's as "confirmed". Same row,
    // different word, because a doctor scanning today wants to see what is
    // still to come rather than a column of identical pills.
    state: state === 'confirmed' && offset > 0 ? 'upcoming' : state,
    payment: PAYMENT[c.paymentStatus],
    concern: (c.concernId && concernNames.get(c.concernId)) || 'General consultation',
    bucket: offset === 0 ? 'today' : offset > 0 ? 'upcoming' : 'past',
  };
};

export type DoctorDay = {
  appointments: Appointment[];
  /** Held and not written up. While this is non-empty the doctor cannot go available. */
  pendingDocumentation: PendingDocumentation[];
  openAlerts: SafetyAlert[];
  unreadNotifications: number;
};

export const KEYS = { day: 'doctor:day' };

/**
 * Everything the dashboard leads with, in one pass.
 *
 * *** UPCOMING AND PAST ARE TWO CALLS, NOT ONE FILTER. *** The backend's
 * `upcoming` means "still holding time" — a consultation held this morning is
 * in the PAST list from the moment it ends. A dashboard that asked only for
 * upcoming would show a doctor an empty day at 6pm with three write-ups
 * outstanding.
 */
export const fetchDoctorDay = async (): Promise<DoctorDay> => {
  const [upcoming, past, pendingDocumentation, openAlerts, unread, concerns] = await Promise.all([
    doctorConsultationsApi.listConsultations({ upcoming: true, limit: 100 }),
    doctorConsultationsApi.listConsultations({ upcoming: false, limit: 100 }),
    doctorConsultationsApi.pendingDocumentation(),
    doctorConsultationsApi.listSafetyAlerts({ openOnly: true, limit: 100 }),
    doctorConsultationsApi.unreadNotifications(),
    // Without this every card reads "General consultation": a consultation
    // carries a concern ID and no name.
    doctorConsultationsApi.listConcerns().catch(() => []),
  ]);
  const concernNames = new Map<string, string>(concerns.map((c) => [c.id, c.name] as const));

  return {
    appointments: [...upcoming, ...past]
      .map((c) => toAppointment(c, concernNames))
      .sort((a, b) => a.dayOffset - b.dayOffset || a.minutes - b.minutes),
    pendingDocumentation,
    openAlerts,
    unreadNotifications: unread.unread,
  };
};

/**
 * Loads the day into the store, once, on the screen that needs it first.
 *
 * The result goes into the STORE rather than staying in the hook because every
 * other screen — appointments, tasks, alerts, the consultation room — reads the
 * same selectors. A hook-local copy would give the dashboard one answer and the
 * list it opens another.
 */
export const useDoctorDay = () => {
  const resource = useResource(KEYS.day, () => fetchDoctorDay());

  useEffect(() => {
    if (resource.data) setDoctorDay(resource.data);
  }, [resource.data]);

  return resource;
};

/** What a status/payment change from the backend means for the card already on screen. */
export const patchFromConsultation = (c: DoctorConsultation): Pick<Appointment, 'state' | 'payment'> => ({
  state: STATE[c.status],
  payment: PAYMENT[c.paymentStatus],
});

/** The patient did not attend. Recorded against the consultation, not the person. */
export const markNoShow = (consultationId: string): Promise<DoctorConsultation> =>
  doctorConsultationsApi.markNoShow(consultationId);

/** A consultation this doctor cannot take. The reason is recorded. */
export const cancelConsultation = (consultationId: string, reason?: string): Promise<DoctorConsultation> =>
  doctorConsultationsApi.cancelConsultation(consultationId, reason);
