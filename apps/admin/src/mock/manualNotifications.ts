import * as db from './db';
import { patientRecords } from './patients';

/**
 * In-memory store for manually sent notifications and the send history.
 *
 * Stateful like `db.ts` (a send really appears in History) and reset by a page
 * reload. Kept in its own file so the notification screens do not touch the
 * shared fixtures.
 */

export type Audience = 'doctor' | 'patient';
export type Channel = 'in_app' | 'push';
export type SendStatus = 'sent' | 'failed' | 'partial';

export type Recipient = { id: string; name: string; detail: string };

export type SentNotification = {
  id: string;
  sentAt: string;
  audience: Audience;
  type: 'manual' | 'automatic';
  /** Set for an automatic one: the template that produced it. */
  templateCode?: string;
  title: string;
  body: string;
  deepLink: string | null;
  channels: Channel[];
  /** 'all' for a whole-audience send, else specific people. */
  scope: 'all' | 'selected';
  recipientCount: number;
  delivered: number;
  failed: number;
  status: SendStatus;
};

const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

/** The same patients the Patients section lists, so a message can be sent to a real row there. */
const patients = (): Recipient[] =>
  patientRecords().map((p) => ({ id: p.id, name: p.fullName, detail: p.mobileNumber }));

export const recipientsFor = (audience: Audience): Recipient[] =>
  audience === 'doctor'
    ? db.doctors.map((d) => ({ id: d.id, name: d.fullName, detail: d.specialtyName ?? 'Doctor' }))
    : patients();

export const deepLinks = [
  { value: '', label: 'None (opens the app)' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'messages', label: 'Messages' },
  { value: 'checkin', label: 'Daily check-in' },
  { value: 'profile', label: 'Profile' },
];

const row = (
  id: number,
  hours: number,
  audience: Audience,
  title: string,
  body: string,
  count: number,
  delivered: number,
  extra: Partial<SentNotification> = {},
): SentNotification => ({
  id: `nh-${id}`,
  sentAt: hoursAgo(hours),
  audience,
  type: 'manual',
  title,
  body,
  deepLink: null,
  channels: ['in_app', 'push'],
  scope: 'all',
  recipientCount: count,
  delivered,
  failed: count - delivered,
  status: delivered === count ? 'sent' : delivered === 0 ? 'failed' : 'partial',
  ...extra,
});

const auto = (id: number, hours: number, code: string, title: string, body: string, n: number, ok: number) =>
  row(id, hours, 'patient', title, body, n, ok, { type: 'automatic', templateCode: code, scope: 'selected' });

export const history: SentNotification[] = [
  row(1, 3, 'doctor', 'Availability review', 'Please review your availability for next week.', 12, 12, { deepLink: 'profile' }),
  row(2, 10, 'patient', 'Scheduled maintenance', 'The app will be unavailable tonight from 2 to 3 AM.', 15, 13),
  auto(3, 14, 'consultation_reminder', 'Appointment reminder', 'Your appointment starts in 30 minutes.', 1, 1),
  auto(4, 20, 'checkin_due', 'Daily check-in', 'Your daily check-in is ready.', 8, 8),
  row(5, 30, 'doctor', 'New documents policy', 'Upload renewed registration documents by month end.', 12, 9),
  row(6, 52, 'patient', 'We have updated our terms', 'Please read the updated terms in the app.', 15, 0, { channels: ['push'] }),
  auto(7, 60, 'consultation_booked', 'Your appointment is confirmed', 'Your appointment is confirmed for {{time}}.', 3, 3),
  row(8, 80, 'doctor', 'Training session', 'A short platform training is scheduled on Friday.', 4, 4, { scope: 'selected', deepLink: 'appointments' }),
  auto(9, 100, 'refund_issued', 'Refund issued', 'A refund of {{amount}} has been issued to your original payment method.', 2, 2),
  row(10, 130, 'patient', 'Wellbeing tips', 'Read our new guide on sleep routines.', 15, 15, { channels: ['in_app'] }),
  auto(11, 170, 'provider_assigned', 'A provider has been assigned', 'A provider has been assigned to your appointment.', 5, 4),
  row(12, 240, 'doctor', 'Payout schedule', 'Payouts now run every Monday.', 12, 12),
];
