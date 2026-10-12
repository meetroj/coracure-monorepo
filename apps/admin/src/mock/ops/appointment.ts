import type { ConsultationStatus } from '../../api/types';

/**
 * The spec's appointment vocabulary (requirements §33, §47), derived from the
 * platform's consultation status. Kept free of imports so the list API and the
 * case-record fixtures can both use it without a cycle.
 */

export const APPOINTMENT_STATUSES = [
  'requested', 'allocated', 'accepted', 'upcoming', 'in_progress', 'completed', 'cancelled', 'rescheduled',
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

const hash = (s: string) => [...s].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);

/**
 * A scheduled consultation is Accepted, Upcoming or Rescheduled. The backend
 * has no field that says which, so the fixtures derive it from the id and it
 * does not change between renders.
 */
export const appointmentStatus = (status: ConsultationStatus, id: string): AppointmentStatus => {
  switch (status) {
    case 'pending_payment':
      return 'requested';
    case 'awaiting_doctor':
      return 'allocated';
    case 'scheduled':
      return (['accepted', 'upcoming', 'rescheduled'] as const)[hash(id) % 3];
    case 'in_progress':
      return 'in_progress';
    case 'awaiting_documentation':
    case 'completed':
      return 'completed';
    default:
      return 'cancelled';
  }
};

/**
 * Minutes between the consultation beginning and ending (§47). Only a held
 * consultation has one; the fixtures carry no end time, so it is derived.
 */
export const durationMinutes = (status: ConsultationStatus, id: string): number | null =>
  status === 'completed' || status === 'awaiting_documentation' ? 20 + (hash(id) % 5) * 7 : null;
