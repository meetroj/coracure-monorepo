import type { Consultation, ConsultationStatus, Service } from '@coracure/api';
import type { Tone } from '@coracure/ui';
import type { IconName } from '@coracure/ui';

/**
 * How a consultation reads on screen.
 *
 * The status vocabulary is the backend's, and each one means something specific
 * that the patient needs told differently — `expired` in particular is NOT
 * `cancelled`: nobody decided it, the payment hold simply ran out, and the
 * copy has to say so or the user thinks we cancelled on them.
 */
export const STATUS_LABEL: Record<ConsultationStatus, string> = {
  pending_payment: 'Payment pending',
  scheduled: 'Confirmed',
  awaiting_doctor: 'Finding a clinician',
  in_progress: 'In progress',
  awaiting_documentation: 'Awaiting notes',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'Missed',
  expired: 'Hold expired',
};

export const STATUS_TONE: Record<ConsultationStatus, Tone> = {
  pending_payment: 'warn',
  scheduled: 'success',
  awaiting_doctor: 'brand',
  in_progress: 'brand',
  awaiting_documentation: 'neutral',
  completed: 'success',
  cancelled: 'danger',
  no_show: 'danger',
  expired: 'warn',
};

export const STATUS_ICON: Record<ConsultationStatus, IconName> = {
  pending_payment: 'wallet',
  scheduled: 'checkCircle',
  awaiting_doctor: 'clock',
  in_progress: 'video',
  awaiting_documentation: 'document',
  completed: 'checkCircle',
  cancelled: 'banCircle',
  no_show: 'alertCircle',
  expired: 'alertTriangle',
};

/** True while the row is still holding a slot that can expire. */
export const isHolding = (c: Consultation): boolean =>
  c.status === 'pending_payment' && !!c.holdExpiresAt;

/** True when the patient can join — the only state with a live call. */
export const isJoinable = (c: Consultation): boolean =>
  c.status === 'in_progress' || c.status === 'awaiting_doctor';

/**
 * The name the patient sees for a consultation.
 *
 * *** IT IS THE SERVICE, NOT THE PROVIDER. *** A booking is identified by what
 * was booked, because that is what the patient chose. The provider's name is
 * available — `GET /doctors/:doctorId` returns the profile of the one ASSIGNED
 * to this patient (FR-4.3) — but it belongs on the consultation detail screen
 * after assignment, not in a list title. In a list it would read as though the
 * provider had been picked.
 */
export const serviceNameFor = (
  consultation: Consultation,
  services: Service[] | undefined,
): string =>
  services?.find((s) => s.id === consultation.specialtyId)?.name ?? 'Consultation';

/* --------------------------------- dates ---------------------------------- */

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * "Today, 4:30 PM" / "Tomorrow, 9:00 AM" / "Thu, 14 Sep · 9:30 AM".
 *
 * Deliberately hand-rolled rather than `Intl.DateTimeFormat`: on Android,
 * React Native ships without full ICU unless the build opts in, so `Intl`
 * silently falls back to a US-shaped format on some devices and not others.
 */
export const formatWhen = (iso: string | null, now = new Date()): string => {
  if (!iso) return 'Time to be confirmed';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Time to be confirmed';

  const time = formatTime(d);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (sameDay(d, now)) return `Today, ${time}`;
  if (sameDay(d, tomorrow)) return `Tomorrow, ${time}`;

  const withinAWeek = d.getTime() - now.getTime() < 7 * 24 * 3600_000 && d > now;
  if (withinAWeek) return `${DAY[d.getDay()]!.slice(0, 3)}, ${time}`;

  return `${d.getDate()} ${MONTH[d.getMonth()]!.slice(0, 3)} ${d.getFullYear()} · ${time}`;
};

export const formatTime = (d: Date): string => {
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
};

export const formatDateLong = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${DAY[d.getDay()]}, ${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Greeting by local hour. Not personalisation — just the time of day.
 *
 * Returns a translation KEY rather than a sentence: the greeting is one of the
 * few strings that changes with the clock as well as the locale, and returning
 * English here would make it the one label that never translated.
 */
export const greetingKeyFor = (
  now = new Date(),
): 'dashboard.goodMorning' | 'dashboard.goodAfternoon' | 'dashboard.goodEvening' => {
  const h = now.getHours();
  if (h < 12) return 'dashboard.goodMorning';
  if (h < 17) return 'dashboard.goodAfternoon';
  return 'dashboard.goodEvening';
};

/** Status label keys, so a consultation's state translates with the rest. */
export const STATUS_LABEL_KEY: Record<ConsultationStatus, `status.${ConsultationStatus}`> = {
  pending_payment: 'status.pending_payment',
  scheduled: 'status.scheduled',
  awaiting_doctor: 'status.awaiting_doctor',
  in_progress: 'status.in_progress',
  awaiting_documentation: 'status.awaiting_documentation',
  completed: 'status.completed',
  cancelled: 'status.cancelled',
  no_show: 'status.no_show',
  expired: 'status.expired',
};

/** Rupees, with no decimals — every fee in the catalogue is a whole number. */
export const formatInr = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '—';
  if (amount <= 0) return 'Free';
  // `en-IN` grouping (1,00,000) done by hand for the same ICU reason as above.
  const [whole] = Math.round(amount).toString().split('.');
  const s = whole!;
  if (s.length <= 3) return `₹${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `₹${rest},${last3}`;
};

/**
 * PT-11-01 — may the patient see WHO their professional is yet?
 *
 * *** NOT UNTIL THEY HAVE PAID. *** The backend assigns at booking, so a
 * `pending_payment` hold already carries a `doctorId`. The story says the
 * profile becomes visible ON PAYMENT, so a held booking must not show a name —
 * that would turn checkout into "here is your doctor, confirm", a choice the
 * patient does not have. An expired hold never became a booking.
 *
 * `cancelled` is hidden too: the consultation record carries no paid flag, so a
 * hold cancelled before payment is indistinguishable from a paid booking that
 * was cancelled, and the safe answer for both is not to name anyone.
 *
 * One rule, used by every surface that could name a professional, so a list
 * row and the detail screen can never disagree.
 */
export const isProviderVisible = (c: { doctorId: string | null; status: string }): boolean =>
  !!c.doctorId &&
  c.status !== 'pending_payment' &&
  c.status !== 'expired' &&
  c.status !== 'cancelled';
