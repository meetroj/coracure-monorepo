/**
 * Notifications and messaging.
 *
 * Scope assumption, stated because it drives the model: a doctor messages
 * patients assigned to them and experts on clarification threads they raised.
 * There is no open directory and no doctor-to-doctor chat outside a case.
 * Expert threads stay hidden from the patient, matching the clarification
 * rules.
 */
import { fmtAgoShort } from './calendar';

/* ------------------------------ notifications ----------------------------- */

export type NotifKind =
  | 'documentFulfilled'
  | 'expertResponse'
  | 'followUpAlert'
  | 'instantRequest'
  | 'appointment'
  | 'payout';

/** Where opening a notification takes the doctor — always with the record id. */
export type NotifTarget =
  | { route: 'document'; patientId: string; docId: string }
  | { route: 'expertResponse'; clarificationId: string }
  | { route: 'alertDetail'; alertId: string }
  | { route: 'instantRequest' }
  | { route: 'apptDetails'; appointmentId: string }
  | { route: 'earnings' };

export const NOTIF_META: Record<
  NotifKind,
  {
    label: string;
    icon: 'document' | 'message' | 'flag' | 'video' | 'calendar' | 'wallet';
    tone: 'brand' | 'warn' | 'danger';
    /** The row's call to action, e.g. "Respond" to a request or "View" the detail. */
    actionLabel: string;
    actionVariant: 'primary' | 'secondary';
  }
> = {
  documentFulfilled: { label: 'Documents', icon: 'document', tone: 'brand', actionLabel: 'View', actionVariant: 'secondary' },
  expertResponse: { label: 'Expert', icon: 'message', tone: 'brand', actionLabel: 'View', actionVariant: 'secondary' },
  followUpAlert: { label: 'Follow-up', icon: 'flag', tone: 'danger', actionLabel: 'Review', actionVariant: 'primary' },
  instantRequest: { label: 'Instant', icon: 'video', tone: 'brand', actionLabel: 'Respond', actionVariant: 'primary' },
  appointment: { label: 'Appointments', icon: 'calendar', tone: 'brand', actionLabel: 'View', actionVariant: 'secondary' },
  payout: { label: 'Earnings', icon: 'wallet', tone: 'brand', actionLabel: 'View', actionVariant: 'secondary' },
};

export type AppNotification = {
  id: string;
  kind: NotifKind;
  title: string;
  /** Never contains a diagnosis — see the DOC-DOC-03 rules. */
  body: string;
  /** Minutes before the demo clock. */
  minutesAgo: number;
  /** Initial read state; the store holds the live one. */
  read: boolean;
  target: NotifTarget;
};

export const notifications: AppNotification[] = [
  {
    id: 'n6',
    kind: 'instantRequest',
    title: 'Instant consultation request',
    body: 'A new patient is requesting an instant video consultation.',
    minutesAgo: 0,
    read: false,
    target: { route: 'instantRequest' },
  },
  {
    id: 'n1',
    kind: 'followUpAlert',
    title: 'Red flag check-in',
    body: 'Rahul Sharma reported a safety concern in today’s check-in.',
    minutesAgo: 10,
    read: false,
    target: { route: 'alertDetail', alertId: 'al1' },
  },
  {
    id: 'n2',
    kind: 'documentFulfilled',
    title: 'Requested document uploaded',
    body: 'Rahul Sharma uploaded Sleep Tracking Report. Open CoraCure to review it.',
    minutesAgo: 25,
    read: false,
    target: { route: 'document', patientId: 'PT-10482', docId: 'd2' },
  },
  {
    id: 'n3',
    kind: 'expertResponse',
    title: 'Expert guidance received',
    body: 'Dr. Kiran Bhatt responded on CLR-2026-0184.',
    minutesAgo: 60,
    read: false,
    target: { route: 'expertResponse', clarificationId: 'cl3' },
  },
  {
    id: 'n4',
    kind: 'appointment',
    title: 'Appointment confirmed',
    body: 'Priya Singh confirmed the 5:30 PM audio consultation.',
    minutesAgo: 180,
    read: true,
    target: { route: 'apptDetails', appointmentId: 'a6' },
  },
  {
    id: 'n5',
    kind: 'payout',
    title: 'Payout processed',
    body: 'Your monthly payout has been sent to your linked account.',
    minutesAgo: 60 * 26,
    read: true,
    target: { route: 'earnings' },
  },
];

export const notifGroup = (n: AppNotification): 'today' | 'earlier' =>
  n.minutesAgo < 11 * 60 + 45 ? 'today' : 'earlier';

export const notifTimeLabel = (n: AppNotification) => fmtAgoShort(n.minutesAgo);

/* --------------------------------- threads -------------------------------- */

export type ThreadKind = 'patient' | 'expert';

export type ChatThread = {
  id: string;
  kind: ThreadKind;
  initials: string;
  name: string;
  /** Case or consultation the thread belongs to — chat is never contextless. */
  context: string;
  /** Set for patient threads. */
  patientId?: string;
  appointmentId?: string;
  /** Set for expert threads. */
  clarificationId?: string;
  lastMessage: string;
  at: string;
  unread: number;
  /** Expert threads are internal and never shown to the patient. */
  internalOnly: boolean;
};

export const threads: ChatThread[] = [
  {
    id: 'th1',
    kind: 'patient',
    initials: 'RS',
    name: 'Rahul Sharma',
    context: 'CON-10482',
    patientId: 'PT-10482',
    appointmentId: 'a1',
    lastMessage: 'I have uploaded the sleep report you asked for.',
    at: '8:42 AM',
    unread: 2,
    internalOnly: false,
  },
  {
    id: 'th2',
    kind: 'expert',
    initials: 'KB',
    name: 'Dr. Kiran Bhatt',
    context: 'CLR-2026-0184',
    clarificationId: 'cl3',
    lastMessage: 'Please confirm how long the current medication has been used.',
    at: 'Yesterday',
    unread: 1,
    internalOnly: true,
  },
  {
    id: 'th3',
    kind: 'patient',
    initials: 'AP',
    name: 'Anita Patel',
    context: 'CON-10459',
    patientId: 'PT-10459',
    appointmentId: 'a2',
    lastMessage: 'Thank you, doctor. The drowsiness is a little better.',
    at: '11:05 AM',
    unread: 0,
    internalOnly: false,
  },
  {
    id: 'th4',
    kind: 'patient',
    initials: 'PS',
    name: 'Priya Singh',
    context: 'CON-10483',
    patientId: 'PT-10548',
    appointmentId: 'a6',
    lastMessage: 'Should I continue the same dose this week?',
    at: 'Mon',
    unread: 0,
    internalOnly: false,
  },
];

export const THREAD_FILTERS: { key: 'all' | ThreadKind | 'unread'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'patient', label: 'Patients' },
  { key: 'expert', label: 'Experts' },
];

export type ChatMessage = {
  id: string;
  from: 'me' | 'them';
  body: string;
  at: string;
  /** Attachment name when the message carries a file. */
  file?: string;
};

export const messagesByThread: Record<string, ChatMessage[]> = {
  th1: [
    { id: 'm1', from: 'them', body: 'Good morning doctor. I have been having trouble sleeping again.', at: '8:20 AM' },
    { id: 'm2', from: 'me', body: 'Thanks for letting me know. Could you upload your sleep tracking report?', at: '8:28 AM' },
    { id: 'm3', from: 'them', body: 'I have uploaded the sleep report you asked for.', at: '8:42 AM', file: 'Sleep Tracking Report.pdf' },
  ],
  th2: [
    { id: 'm1', from: 'me', body: 'Sharing a de-identified case for your view on the current plan.', at: 'Yesterday' },
    { id: 'm2', from: 'them', body: 'Please confirm how long the current medication has been used.', at: 'Yesterday' },
  ],
  th3: [
    { id: 'm1', from: 'me', body: 'How are you feeling since the dose change?', at: '10:58 AM' },
    { id: 'm2', from: 'them', body: 'Thank you, doctor. The drowsiness is a little better.', at: '11:05 AM' },
  ],
  th4: [{ id: 'm1', from: 'them', body: 'Should I continue the same dose this week?', at: 'Mon' }],
};

export const MESSAGE_MAX = 1000;

export const threadUnread = (list: { unread: number }[]) => list.reduce((sum, t) => sum + t.unread, 0);
