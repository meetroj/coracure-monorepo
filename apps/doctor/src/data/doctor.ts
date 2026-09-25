/**
 * Doctor-app domain types and development fixtures.
 *
 * Role scope: a doctor sees only their own cases and assigned patients.
 * There is no patient discovery and no doctor self-registration — doctors are
 * created and approved by an administrator.
 *
 * The fixtures describe one coherent day on the demo clock (11:45 AM, see
 * `calendar.ts`): consultations before it are done, the next one starts at
 * noon, and every count on screen is derived from these records rather than
 * authored beside them.
 */
import type { ImageSourcePropType } from 'react-native';

import type { ProfessionalType } from './clinical';
import { patientById } from './patients';
import {
  DEMO_NOW_MINUTES,
  TODAY,
  clockToMinutes,
  dayOffset,
  fmtDate,
  fmtDayMonth,
  fmtMonthYear,
  fmtWeekday,
  minutesToClock,
  relativeDay,
  toISODate,
} from './calendar';

/* ------------------------------ availability ------------------------------ */

/** Manually selectable live status. */
export type ManualStatus = 'available' | 'offline' | 'paused' | 'scheduledOnly';
/** System-controlled live status. */
export type AutoStatus = 'requestPending' | 'inConsultation' | 'completingNotes';
export type LiveStatus = ManualStatus | AutoStatus;

export const MANUAL_STATUSES: { key: ManualStatus; label: string }[] = [
  { key: 'available', label: 'Available Now' },
  { key: 'scheduledOnly', label: 'Scheduled Only' },
  { key: 'paused', label: 'Busy' },
  { key: 'offline', label: 'Offline' },
];

export const STATUS_LABEL: Record<LiveStatus, string> = {
  available: 'Available Now',
  offline: 'Offline',
  paused: 'Busy',
  scheduledOnly: 'Scheduled Only',
  requestPending: 'Request Pending',
  inConsultation: 'In Consultation',
  completingNotes: 'Completing Notes',
};

/** System-controlled statuses cannot be picked by the doctor. */
export const isAutoStatus = (s: LiveStatus): s is AutoStatus =>
  s === 'requestPending' || s === 'inConsultation' || s === 'completingNotes';

/** Statuses the system sets on its own, shown for transparency only. */
export const AUTO_STATUSES: AutoStatus[] = ['requestPending', 'inConsultation', 'completingNotes'];

/**
 * Presentation detail for the status sheet: what each state means, plus the
 * icon/tint that distinguishes it at a glance.
 */
export const STATUS_META: Record<
  LiveStatus,
  { description: string; icon: 'dot' | 'pause' | 'calendar' | 'clock' | 'video' | 'document'; bg: string; fg: string }
> = {
  offline: { description: 'You are hidden from patients. No instant or scheduled requests will reach you.', icon: 'dot', bg: '#EFF3F1', fg: '#8A9995' },
  available: { description: 'You are ready to consult now. Instant requests can reach you immediately.', icon: 'dot', bg: '#E7F7F0', fg: '#34D499' },
  paused: { description: 'You will stop receiving new requests until you switch back to Available.', icon: 'pause', bg: '#FDF4E5', fg: '#E0972B' },
  scheduledOnly: { description: 'Only appointments booked into your weekly schedule will reach you. Instant requests stay off.', icon: 'calendar', bg: '#E7F7F0', fg: '#0E766C' },
  requestPending: { description: 'A consultation request is waiting for your response.', icon: 'clock', bg: '#EAF1FC', fg: '#3E6DB5' },
  inConsultation: { description: 'A consultation is currently in progress.', icon: 'video', bg: '#F0EDFB', fg: '#6B5BB5' },
  completingNotes: { description: 'Your prescription or case summary is still pending.', icon: 'document', bg: '#FDF0E5', fg: '#D97B2E' },
};

/**
 * While notes are outstanding the doctor must not receive new instant
 * consultation requests.
 */
export const acceptsInstantRequests = (s: LiveStatus) => s === 'available';

/* ------------------------------ verification ------------------------------ */

export type VerificationStatus = 'pending' | 'rejected' | 'approved';

export type VerificationItem = {
  key: string;
  icon: 'idCard' | 'shieldCheck' | 'document' | 'inPerson' | 'wallet';
  title: string;
  body: string;
  state: 'verified' | 'underReview' | 'issue';
  issueLabel?: string;
};

/* ------------------------------ appointments ------------------------------ */

export type AppointmentState = 'confirmed' | 'upcoming' | 'completed' | 'cancelled' | 'noShow';
export type ConsultMode = 'video' | 'audio' | 'inPerson';
export type PaymentState = 'paid' | 'refunded' | 'notPaid';

export type Appointment = {
  id: string;
  patientId: string;
  /** The clinical record this appointment opens. */
  consultationId: string;
  /** Days from today: 0 today, negative past, positive upcoming. */
  dayOffset: number;
  /** "Today", "Tomorrow", "Fri, 24 May". */
  dayLabel: string;
  /** "15 May 2026". */
  dateLabel: string;
  time: string;
  /** Minutes past midnight, for ordering and countdowns. */
  minutes: number;
  initials: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  mode: ConsultMode;
  state: AppointmentState;
  payment: PaymentState;
  concern: string;
  bucket: 'today' | 'upcoming' | 'past';
};

const appt = (
  id: string,
  patientId: string,
  consultationId: string,
  offset: number,
  time: string,
  mode: ConsultMode,
  state: AppointmentState,
  payment: PaymentState,
  concern: string
): Appointment => {
  const pt = patientById(patientId);
  if (!pt) throw new Error(`Unknown patient ${patientId}`);
  const date = dayOffset(offset);
  return {
    id,
    patientId,
    consultationId,
    dayOffset: offset,
    dayLabel: relativeDay(date),
    dateLabel: fmtDate(date),
    time,
    minutes: clockToMinutes(time),
    initials: pt.initials,
    name: pt.name,
    age: pt.age,
    gender: pt.gender,
    mode,
    state,
    payment,
    concern,
    bucket: offset === 0 ? 'today' : offset > 0 ? 'upcoming' : 'past',
  };
};

export const appointments: Appointment[] = [
  /* today — the demo clock reads 11:45 AM */
  appt('a5', 'PT-10462', 'CON-10462', 0, '08:00 AM', 'inPerson', 'noShow', 'notPaid', 'Sleep disturbance and irritability'),
  appt('a3', 'PT-10460', 'CON-10460', 0, '09:00 AM', 'inPerson', 'completed', 'paid', 'Low mood and loss of interest'),
  appt('a2', 'PT-10459', 'CON-10459', 0, '10:30 AM', 'audio', 'completed', 'paid', 'Medication side effects and daytime drowsiness'),
  appt('a1', 'PT-10482', 'CON-10482', 0, '12:00 PM', 'video', 'confirmed', 'paid', 'Anxiety, restlessness and difficulty sleeping'),
  appt('a4', 'PT-10461', 'CON-10461', 0, '02:15 PM', 'video', 'cancelled', 'refunded', 'Panic episodes with racing thoughts'),
  appt('a6', 'PT-10548', 'CON-10483', 0, '05:30 PM', 'audio', 'confirmed', 'paid', 'Low mood follow-up'),

  /* upcoming */
  appt('a7', 'PT-10470', 'CON-10490', 1, '09:30 AM', 'video', 'upcoming', 'paid', 'Anxiety review'),
  appt('a8', 'PT-10471', 'CON-10491', 2, '11:00 AM', 'video', 'upcoming', 'paid', 'Medication review after dose change'),

  /* past — earlier consultations, most recent first */
  appt('a9', 'PT-10472', 'CON-10479', -1, '03:00 PM', 'inPerson', 'completed', 'paid', 'Sleep and mood review'),
  appt('a24', 'PT-10475', 'CON-10472', -1, '10:00 AM', 'video', 'completed', 'paid', 'Anxiety with stress at work'),
  appt('a25', 'PT-10476', 'CON-10473', -1, '12:30 PM', 'audio', 'completed', 'paid', 'Low mood and early waking'),
  appt('a26', 'PT-10477', 'CON-10474', -1, '06:00 PM', 'video', 'completed', 'paid', 'Alcohol use — relapse prevention'),
  appt('a27', 'PT-10478', 'CON-10475', -1, '07:30 PM', 'audio', 'completed', 'paid', 'Poor sleep and worry'),
  appt('a23', 'PT-10474', 'CON-10471', -2, '04:00 PM', 'video', 'completed', 'paid', 'Exam-related anxiety'),
  appt('a22', 'PT-10473', 'CON-10470', -3, '11:30 AM', 'inPerson', 'completed', 'paid', 'Low mood after job loss'),
  appt('a21', 'PT-10469', 'CON-10469', -4, '10:00 AM', 'video', 'completed', 'paid', 'Panic symptoms while commuting'),
  appt('a20', 'PT-10468', 'CON-10468', -5, '05:00 PM', 'inPerson', 'completed', 'paid', 'Alcohol use — cutting down'),
  appt('a12', 'PT-10461', 'CON-10449', -6, '04:00 PM', 'video', 'completed', 'paid', 'Panic episodes and poor sleep'),
  appt('a19', 'PT-10467', 'CON-10467', -7, '09:30 AM', 'video', 'completed', 'paid', 'Sleep difficulty and low energy'),
  appt('a18', 'PT-10466', 'CON-10466', -7, '12:00 PM', 'audio', 'completed', 'paid', 'Anxiety with physical tension'),
  appt('a14', 'PT-10548', 'CON-10444', -8, '05:00 PM', 'audio', 'completed', 'paid', 'Low mood and poor motivation'),
  appt('a17', 'PT-10465', 'CON-10465', -8, '10:30 AM', 'inPerson', 'completed', 'paid', 'Irritability and poor sleep'),
  appt('a13', 'PT-10460', 'CON-10441', -9, '12:00 PM', 'inPerson', 'completed', 'paid', 'Low mood and fatigue'),
  appt('a16', 'PT-10464', 'CON-10464', -9, '03:30 PM', 'video', 'completed', 'paid', 'Persistent low mood'),
  appt('a15', 'PT-10463', 'CON-10463', -10, '10:00 AM', 'video', 'completed', 'paid', 'Worsening anxiety and low mood'),
  appt('a11', 'PT-10482', 'CON-10431', -12, '11:00 AM', 'video', 'completed', 'paid', 'Anxiety and difficulty sleeping'),
];

export const appointmentById = (id: string | undefined): Appointment | undefined =>
  id ? appointments.find((a) => a.id === id) : undefined;

/** Consultations that actually took place (or were missed), newest first. */
export const heldAppointments = () =>
  appointments
    .filter((a) => a.state === 'completed' || a.state === 'noShow')
    .sort((x, y) => y.dayOffset - x.dayOffset || y.minutes - x.minutes);

/** The next appointment still to start today, on the demo clock. */
export const nextAppointmentFor = (list: Appointment[] = appointments): Appointment | undefined =>
  list
    .filter((a) => a.dayOffset === 0 && a.state === 'confirmed' && a.minutes >= DEMO_NOW_MINUTES)
    .sort((x, y) => x.minutes - y.minutes)[0];

/** Minutes from the demo clock to the appointment; negative once it has started. */
export const minutesUntil = (a: Appointment) =>
  a.dayOffset * 24 * 60 + (a.minutes - DEMO_NOW_MINUTES);

/** A patient's earlier consultations, most recent first. */
export const previousConsultations = (a: Appointment) =>
  appointments
    .filter(
      (x) =>
        x.patientId === a.patientId &&
        x.id !== a.id &&
        x.state === 'completed' &&
        (x.dayOffset < a.dayOffset || (x.dayOffset === a.dayOffset && x.minutes < a.minutes))
    )
    .sort((x, y) => y.dayOffset - x.dayOffset || y.minutes - x.minutes);

/* -------------------------- appointment detail ---------------------------- */

export type IntakeRow = {
  key: string;
  icon: 'calendar' | 'heart' | 'prescription' | 'alertTriangle' | 'document';
  label: string;
  value: string;
};

export type AppointmentDetail = {
  patientId: string;
  /** Clinical record identifier. Everything in Module 9 links to this. */
  consultationId: string;
  /** The booking reference shown on the appointment. */
  appointmentRef: string;
  dateLabel: string;
  /** Patient-reported, in their words. Never a diagnosis. */
  concern: string;
  concernDetail: string;
  duration: string;
  severity: string;
  totalConsultations: number;
  intake: IntakeRow[];
  consent: { version: string; time: string };
  past?: { appointmentId: string; dateLabel: string; time: string; title: string; note: string };
  payment: { state: string; txnId: string; method: string };
};

/** Patient-reported intake, authored where the booking form captured more detail. */
const intakeById: Record<string, Partial<AppointmentDetail> & { medication?: string; allergies?: string; other?: string }> = {
  a1: {
    concernDetail: 'Restlessness and racing thoughts at night are back, with poor sleep over the last week.',
    duration: '3 weeks',
    severity: 'Moderate',
    medication: 'Escitalopram 5 mg, once daily',
    allergies: 'None known',
    other: 'Fatigue and poor concentration at work.',
  },
  a2: {
    concernDetail: 'Feels drowsy through the day since the dose was increased last week.',
    duration: '1 week',
    severity: 'Mild',
    medication: 'Sertraline 100 mg, once daily',
    allergies: 'Penicillin',
    other: 'Still managing work but needs afternoon naps.',
  },
  a6: {
    concernDetail: 'Mood still low most days; missed a few check-ins this week.',
    duration: '4 weeks',
    severity: 'Moderate',
    medication: 'Sertraline 50 mg, once daily',
    allergies: 'None known',
  },
};

const PAST_TITLE: Record<ConsultMode, string> = {
  video: 'Video consultation',
  audio: 'Audio consultation',
  inPerson: 'In-person visit',
};

/**
 * Detail for any appointment. Rows without an authored record still open a
 * usable screen rather than a blank one: identifiers derive from the
 * appointment and the intake falls back to the presenting concern.
 */
export const detailFor = (a: Appointment): AppointmentDetail => {
  const seed = intakeById[a.id] ?? {};
  const previous = previousConsultations(a);
  const last = previous[0];
  const stamp = toISODate(dayOffset(a.dayOffset)).slice(2).replace(/-/g, '');
  const totalConsultations =
    appointments.filter((x) => x.patientId === a.patientId && x.state !== 'cancelled').length;
  return {
    patientId: a.patientId,
    consultationId: a.consultationId,
    appointmentRef: `APT-${stamp}-${String(a.minutes).padStart(4, '0')}`,
    dateLabel: a.dateLabel,
    concern: a.concern,
    concernDetail: seed.concernDetail ?? a.concern,
    duration: seed.duration ?? 'Not recorded',
    severity: seed.severity ?? 'Not recorded',
    totalConsultations,
    intake: [
      { key: 'dur', icon: 'calendar', label: 'Duration', value: seed.duration ?? 'Not recorded' },
      { key: 'sev', icon: 'heart', label: 'Severity', value: seed.severity ?? 'Not recorded' },
      { key: 'med', icon: 'prescription', label: 'Medication', value: seed.medication ?? 'None reported' },
      { key: 'alg', icon: 'alertTriangle', label: 'Allergies', value: seed.allergies ?? 'None known' },
      { key: 'oth', icon: 'document', label: 'Other', value: seed.other ?? a.concern },
    ],
    consent: { version: 'v2.1', time: minutesToClock(Math.max(0, a.minutes - 40)) },
    past: last
      ? {
          appointmentId: last.id,
          dateLabel: last.dateLabel,
          time: last.time,
          title: PAST_TITLE[last.mode],
          note: last.concern,
        }
      : undefined,
    payment: {
      state: a.payment === 'paid' ? 'Paid' : a.payment === 'refunded' ? 'Refunded' : 'Not paid',
      txnId: `CC${stamp}${a.id.slice(1).padStart(4, '0')}`,
      method: 'Online',
    },
  };
};

/* --------------------------------- cases ---------------------------------- */

export type CaseState = 'complete' | 'pending' | 'followUp' | 'noShow';

/**
 * A case is one held consultation. It is derived from the appointment and its
 * clinical record (see `state/selectors.ts`), never authored separately, so the
 * list cannot disagree with the record behind it.
 */
export type PatientCase = {
  id: string;
  /** The consultation this case belongs to. */
  appointmentId: string;
  patientId: string;
  /** The consultation reference, e.g. CON-10482. */
  caseId: string;
  initials: string;
  name: string;
  dateLabel: string;
  dayOffset: number;
  minutes: number;
  age: number;
  gender: 'Male' | 'Female';
  concern: string;
  state: CaseState;
  docsDone: number;
  docsTotal: number;
  /** A case is clinically complete only once advice AND summary are done. */
  prescriptionFinalised: boolean;
  summarySubmitted: boolean;
};

export const isClinicallyComplete = (c: Pick<PatientCase, 'prescriptionFinalised' | 'summarySubmitted'>) =>
  c.prescriptionFinalised && c.summarySubmitted;

/* ------------------------------- schedule --------------------------------- */

export type TimeRange = { from: string; to: string };
export type DaySchedule = {
  day: string;
  short: string;
  enabled: boolean;
  ranges: TimeRange[];
  modes: ConsultMode[];
};
/** A single date with custom hours, replacing the weekly pattern for that day. */
export type ScheduleOverride = { id: string; date: string; from: string; to: string };
/** A blocked date. `date` is ISO so it sorts and validates without parsing labels. */
export type Leave = { id: string; date: string; reason: string };

/* --------------------------------- doctor --------------------------------- */

export type Doctor = {
  name: string;
  /** Drives prescribing permission across every clinical surface. */
  professionalType: ProfessionalType;
  /** The avatar fallback, and the only avatar while no photo is on file. */
  initials: string;
  /** A remote URI once profiles come from the API. */
  photo?: ImageSourcePropType;
  speciality: string;
  qualification: string;
  yearsExperience: number;
  registrationNo: string;
  specialisations: string[];
  languages: string[];
  consultationFee: number;
  consultationMinutes: number;
  bankVerified: boolean;
  documentsApproved: boolean;
  /** Shown on the profile's About card. */
  bio: string;
};

/** The signed-in doctor. Every "me" reference in the fixtures resolves here. */
export const doctor: Doctor = {
  name: 'Dr. Arjun Mehta',
  professionalType: 'psychiatrist',
  initials: 'AM',
  speciality: 'Psychiatrist',
  qualification: 'MBBS, MD (Psychiatry)',
  yearsExperience: 8,
  registrationNo: 'MCI 12-45892',
  specialisations: ['Adult Psychiatry', 'Sleep Medicine'],
  languages: ['English', 'Hindi'],
  consultationFee: 699,
  consultationMinutes: 30,
  bankVerified: true,
  documentsApproved: true,
  bio: 'Psychiatrist with 8+ years of experience in anxiety, mood and sleep disorders. Focused on clear explanations, shared decisions and steady follow-up between consultations.',
};

/* -------------------------------- earnings -------------------------------- */

export type EarningsPeriodKey = 'daily' | 'weekly' | 'monthly';

/** One column of the activity chart. */
export type EarningsBar = { label: string; value: number };

export type EarningsPeriod = {
  key: EarningsPeriodKey;
  tab: string;
  /** The date caption under the selector. */
  rangeLabel: string;
  total: number;
  consultations: number;
  bars: EarningsBar[];
  /** Label of the bar carrying the callout. */
  highlight: string;
  axisMax: number;
  axisStep: number;
  /** Same period, one cycle back — only set where a comparison is shown. */
  previousTotal?: number;
  previousConsultations?: number;
};

/**
 * The doctor keeps the whole consultation fee: gross equals net and the
 * platform deduction is zero. That is a commercial fact, not a placeholder.
 */
export const platformDeduction = 0;

export type PayoutState = 'Pending' | 'Processed' | 'Paid';

export type PayoutRecord = {
  id: string;
  dateLabel: string;
  forLabel: string;
  amount: number;
  consultations: number;
  state: PayoutState;
  reference: string;
};

const paidConsultations = () =>
  appointments.filter((a) => a.state === 'completed' && a.payment === 'paid');

/** Rounds an axis ceiling up to a readable step. */
const axisFor = (max: number) => {
  const step = max <= 1500 ? 500 : max <= 4000 ? 1000 : max <= 10000 ? 2500 : 5000;
  return { axisStep: step, axisMax: Math.max(step, Math.ceil(max / step) * step) };
};

const earningsFor = (key: EarningsPeriodKey, fee: number): EarningsPeriod => {
  const held = paidConsultations();
  if (key === 'daily') {
    const today = held.filter((a) => a.dayOffset === 0);
    const slots = [8, 10, 12, 14, 16, 18];
    const bars = slots.map((h) => ({
      label: h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`,
      value: today.filter((a) => a.minutes >= h * 60 && a.minutes < (h + 2) * 60).length * fee,
    }));
    const peak = bars.reduce((m, b) => (b.value > m.value ? b : m), bars[0]);
    return {
      key,
      tab: 'Daily',
      rangeLabel: `Today, ${fmtDayMonth(TODAY)}`,
      total: today.length * fee,
      consultations: today.length,
      bars,
      highlight: peak.label,
      ...axisFor(Math.max(...bars.map((b) => b.value))),
    };
  }
  if (key === 'weekly') {
    // Monday-start week containing today
    const mondayOffset = -((TODAY.getDay() + 6) % 7);
    const days = Array.from({ length: 7 }, (_, i) => mondayOffset + i);
    const bars = days.map((off) => ({
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][days.indexOf(off)],
      value: held.filter((a) => a.dayOffset === off).length * fee,
    }));
    const inWeek = held.filter((a) => a.dayOffset >= mondayOffset && a.dayOffset <= 0);
    const prevWeek = held.filter((a) => a.dayOffset >= mondayOffset - 7 && a.dayOffset < mondayOffset);
    const peak = bars.reduce((m, b) => (b.value > m.value ? b : m), bars[0]);
    return {
      key,
      tab: 'Weekly',
      rangeLabel: `${fmtDayMonth(dayOffset(mondayOffset))} – ${fmtDayMonth(dayOffset(mondayOffset + 6))}`,
      total: inWeek.length * fee,
      consultations: inWeek.length,
      bars,
      highlight: peak.label,
      previousTotal: prevWeek.length * fee,
      previousConsultations: prevWeek.length,
      ...axisFor(Math.max(...bars.map((b) => b.value))),
    };
  }
  // monthly: the current calendar month, split into weeks of seven days
  const firstOffset = -(TODAY.getDate() - 1);
  const inMonth = held.filter((a) => a.dayOffset >= firstOffset && a.dayOffset <= 0);
  const bars = [0, 1, 2, 3, 4]
    .map((w) => ({
      label: `W${w + 1}`,
      value:
        held.filter((a) => a.dayOffset >= firstOffset + w * 7 && a.dayOffset < firstOffset + (w + 1) * 7 && a.dayOffset <= 0)
          .length * fee,
    }))
    .filter((b, i) => i < 4 || b.value > 0);
  const peak = bars.reduce((m, b) => (b.value > m.value ? b : m), bars[0]);
  return {
    key,
    tab: 'Monthly',
    rangeLabel: fmtMonthYear(TODAY),
    total: inMonth.length * fee,
    consultations: inMonth.length,
    bars,
    highlight: peak.label,
    ...axisFor(Math.max(...bars.map((b) => b.value))),
  };
};

export const earningsPeriodsFor = (fee: number): Record<EarningsPeriodKey, EarningsPeriod> => ({
  daily: earningsFor('daily', fee),
  weekly: earningsFor('weekly', fee),
  monthly: earningsFor('monthly', fee),
});

/**
 * Monthly payouts, most recent first. Each settles the previous month's
 * consultations on the 5th; the current month's earnings are still accruing.
 */
export const payoutHistory: PayoutRecord[] = Array.from({ length: 8 }, (_, i) => {
  const settle = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 5);
  const period = new Date(TODAY.getFullYear(), TODAY.getMonth() - i - 1, 1);
  const consultations = [178, 164, 171, 152, 149, 158, 141, 136][i];
  const settledThisMonth = settle.getTime() <= TODAY.getTime();
  const state: PayoutState = i === 0 ? (settledThisMonth ? 'Processed' : 'Pending') : 'Paid';
  return {
    id: `p${i + 1}`,
    dateLabel: fmtDate(settle),
    forLabel: `Payout for ${fmtMonthYear(period)}`,
    amount: consultations * 699,
    consultations,
    state,
    reference: `PO-${settle.getFullYear()}${String(settle.getMonth() + 1).padStart(2, '0')}-${4100 + i}`,
  };
});

/** Manual payouts carry a state rather than a guaranteed date. */
export const payoutNote = 'Payouts are processed manually by CoraCure on the 5th of each month.';

/* -------------------------------- feedback -------------------------------- */

/** The closed set of positive attributes a patient may tag a consultation with. */
export const REVIEW_TAGS = [
  'Clear explanations',
  'Listens carefully',
  'Helpful guidance',
  'On time',
] as const;
export type ReviewTag = (typeof REVIEW_TAGS)[number];

/**
 * A review as the doctor sees it. Patient identity is deliberately reduced to
 * "Verified patient" or initials — the doctor never sees who wrote which
 * review, only that the consultation behind it actually happened.
 */
export type Review = {
  id: string;
  /** Initials when the patient allowed them; otherwise the anonymous label. */
  initials?: string;
  label: string;
  stars: number;
  dateLabel: string;
  /** Consultation mode or type the review is attached to. */
  mode: string;
  /** Empty when the patient rated without writing anything. */
  body: string;
  tags: ReviewTag[];
  /**
   * Surfaces the "Report concern" action. Reserved for reviews a doctor may
   * reasonably contest — a low rating on its own is not grounds for a report.
   */
  reportable?: boolean;
};

export const feedback = {
  rating: 4.8,
  reviews: 126,
  /** Share of reviews at each star level; ordered 5 → 1. */
  distribution: [
    { stars: 5, percent: 82 },
    { stars: 4, percent: 13 },
    { stars: 3, percent: 4 },
    { stars: 2, percent: 1 },
    { stars: 1, percent: 0 },
  ],
};

export const reviews: Review[] = [
  {
    id: 'r1',
    label: 'Verified patient',
    stars: 5,
    dateLabel: fmtDate(dayOffset(-1)),
    mode: 'Video consultation',
    body: 'The doctor listened patiently and explained the treatment plan in a very clear way.',
    tags: ['Clear explanations', 'Listens carefully'],
  },
  {
    id: 'r2',
    initials: 'RS',
    label: 'Patient R.S.',
    stars: 5,
    dateLabel: fmtDate(dayOffset(-3)),
    mode: 'Follow-up',
    body: 'The follow-up was reassuring and all my questions were answered without rushing.',
    tags: ['Helpful guidance', 'On time'],
  },
  {
    id: 'r3',
    label: 'Verified patient',
    stars: 4,
    dateLabel: fmtDate(dayOffset(-6)),
    mode: 'Audio consultation',
    body: 'Good consultation and practical advice. The call started a few minutes late.',
    tags: ['Helpful guidance'],
  },
  {
    id: 'r4',
    initials: 'AP',
    label: 'Patient A.P.',
    stars: 5,
    dateLabel: fmtDate(dayOffset(-9)),
    mode: 'Video consultation',
    body: 'Very professional and calm. I felt comfortable discussing my concerns.',
    tags: ['Listens carefully'],
  },
  {
    id: 'r5',
    label: 'Verified patient',
    stars: 3,
    dateLabel: fmtDate(dayOffset(-13)),
    mode: 'Video consultation',
    body: 'Consultation was helpful, but I would have liked more time for questions.',
    tags: [],
    reportable: true,
  },
];

/* ------------------------------- schedule --------------------------------- */

export const initialSchedule: DaySchedule[] = [
  { day: 'Monday', short: 'Mon', enabled: true, ranges: [{ from: '09:00 AM', to: '01:00 PM' }, { from: '04:00 PM', to: '07:00 PM' }], modes: ['video', 'audio'] },
  { day: 'Tuesday', short: 'Tue', enabled: true, ranges: [{ from: '09:30 AM', to: '01:30 PM' }, { from: '04:00 PM', to: '08:00 PM' }], modes: ['video', 'audio'] },
  { day: 'Wednesday', short: 'Wed', enabled: true, ranges: [{ from: '09:00 AM', to: '01:00 PM' }, { from: '04:00 PM', to: '07:00 PM' }], modes: ['video', 'audio', 'inPerson'] },
  { day: 'Thursday', short: 'Thu', enabled: true, ranges: [{ from: '09:30 AM', to: '01:30 PM' }, { from: '04:00 PM', to: '08:00 PM' }], modes: ['video', 'audio'] },
  { day: 'Friday', short: 'Fri', enabled: true, ranges: [{ from: '09:00 AM', to: '01:00 PM' }, { from: '04:00 PM', to: '06:00 PM' }], modes: ['video', 'audio'] },
  { day: 'Saturday', short: 'Sat', enabled: false, ranges: [], modes: ['video'] },
  { day: 'Sunday', short: 'Sun', enabled: false, ranges: [], modes: ['video'] },
];

export const initialOverrides: ScheduleOverride[] = [
  { id: 'o1', date: toISODate(dayOffset(9)), from: '09:00 AM', to: '02:00 PM' },
  { id: 'o2', date: toISODate(dayOffset(13)), from: '04:00 PM', to: '08:00 PM' },
  { id: 'o3', date: toISODate(dayOffset(15)), from: '09:00 AM', to: '01:00 PM' },
];

export const initialLeave: Leave[] = [
  { id: 'l1', date: toISODate(dayOffset(21)), reason: 'Personal leave' },
  { id: 'l2', date: toISODate(dayOffset(31)), reason: 'CME workshop' },
];

/** "Fri, 24 May" for an ISO date. */
export const scheduleDateLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return fmtWeekday(new Date(y, m - 1, d));
};

/* ------------------------- verification fixtures -------------------------- */

export const pendingItems: VerificationItem[] = [
  { key: 'reg', icon: 'idCard', title: 'Medical registration', body: 'Your medical registration is under review.', state: 'underReview' },
  { key: 'id', icon: 'shieldCheck', title: 'Proof of identity', body: 'Your identity document is under review.', state: 'underReview' },
  { key: 'qual', icon: 'document', title: 'Qualifications', body: 'Your degree certificates are under review.', state: 'underReview' },
  { key: 'exp', icon: 'inPerson', title: 'Experience', body: 'Your employment proof is under review.', state: 'underReview' },
];

export const rejectedItems: VerificationItem[] = [
  { key: 'reg', icon: 'idCard', title: 'Medical registration', body: 'Upload a clear and valid registration certificate', state: 'issue', issueLabel: 'Document unclear' },
  { key: 'id', icon: 'shieldCheck', title: 'Proof of identity', body: 'Ensure your name matches your government-issued ID', state: 'issue', issueLabel: 'Name mismatch' },
  { key: 'qual', icon: 'document', title: 'Qualifications', body: 'Your degree certificates have been verified', state: 'verified' },
];

export const approvedItems: VerificationItem[] = [
  { key: 'reg', icon: 'idCard', title: 'Medical registration', body: 'Your medical registration has been verified', state: 'verified' },
  { key: 'id', icon: 'shieldCheck', title: 'Proof of identity', body: 'Your government-issued ID has been verified', state: 'verified' },
  { key: 'qual', icon: 'document', title: 'Qualifications', body: 'Your degree certificates have been verified', state: 'verified' },
  { key: 'exp', icon: 'inPerson', title: 'Experience', body: 'Your employment history has been verified', state: 'verified' },
];

export const modeLabel: Record<ConsultMode, string> = {
  video: 'Video consultation',
  audio: 'Audio consultation',
  inPerson: 'In-person visit',
};

export const modeIcon: Record<ConsultMode, 'video' | 'phone' | 'inPerson'> = {
  video: 'video',
  audio: 'phone',
  inPerson: 'inPerson',
};

export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/* -------------------------- instant consultation -------------------------- */

/**
 * An incoming instant-consultation request.
 *
 * Deliberately minimal: only what a doctor needs to decide accept/decline.
 * No phone number, address, reports, diagnosis, payment credentials or
 * appointment history — none of that is required to answer, and the
 * consultation does not open until payment and consent clear.
 */
export type InstantRequest = {
  patientId: string;
  initials: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  speciality: string;
  concern: string;
  mode: ConsultMode;
  languages: string;
  approxMinutes: number;
  /** Seconds the doctor has to respond before it reroutes. */
  respondWithin: number;
};

const requester = patientById('PT-10480')!;

export const instantRequest: InstantRequest = {
  patientId: requester.id,
  initials: requester.initials,
  name: requester.name,
  age: requester.age,
  gender: requester.gender,
  speciality: 'Psychiatry',
  concern: 'Sudden anxiety with a racing heart since this morning',
  mode: 'video',
  languages: 'English / Hindi',
  approxMinutes: 30,
  respondWithin: 30,
};

/** The order is fixed: consultation opens only after payment and consent. */
export const INSTANT_STEPS = [
  'Accept request',
  'Patient completes payment',
  'Consent verified and consultation opens',
];

/** Today's date in the long form used on documents. */
export const todayLabel = fmtDate(TODAY);
