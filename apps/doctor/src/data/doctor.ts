/**
 * Doctor-app domain types and development fixtures.
 *
 * Role scope: a doctor sees only their own cases and assigned patients.
 * There is no patient discovery and no doctor self-registration — doctors are
 * created and approved by an administrator.
 */
import type { ImageSourcePropType } from 'react-native';

import type { ProfessionalType } from './clinical';

/* ------------------------------ availability ------------------------------ */

/** Manually selectable live status. */
export type ManualStatus = 'available' | 'offline' | 'paused' | 'scheduledOnly';
/** System-controlled live status. */
export type AutoStatus = 'requestPending' | 'inConsultation' | 'completingNotes';
export type LiveStatus = ManualStatus | AutoStatus;

export const MANUAL_STATUSES: { key: ManualStatus; label: string }[] = [
  { key: 'available', label: 'Available Now' },
  { key: 'offline', label: 'Offline' },
  { key: 'paused', label: 'Paused' },
  { key: 'scheduledOnly', label: 'Scheduled Only' },
];

export const STATUS_LABEL: Record<LiveStatus, string> = {
  available: 'Available Now',
  offline: 'Offline',
  paused: 'Paused',
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
  offline: { description: 'Not receiving instant requests', icon: 'dot', bg: '#EFF3F1', fg: '#8A9995' },
  available: { description: 'Ready for instant consultations', icon: 'dot', bg: '#E7F7F0', fg: '#34D499' },
  paused: { description: 'Temporarily unavailable', icon: 'pause', bg: '#FDF4E5', fg: '#E0972B' },
  scheduledOnly: { description: 'Scheduled appointments only', icon: 'calendar', bg: '#E7F7F0', fg: '#0E766C' },
  requestPending: { description: 'Waiting for you to accept or decline', icon: 'clock', bg: '#EAF1FC', fg: '#3E6DB5' },
  inConsultation: { description: 'Consultation currently in progress', icon: 'video', bg: '#F0EDFB', fg: '#6B5BB5' },
  completingNotes: { description: 'Prescription or case summary pending', icon: 'document', bg: '#FDF0E5', fg: '#D97B2E' },
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
  time: string;
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

/* -------------------------- appointment detail ---------------------------- */

export type IntakeRow = {
  key: string;
  icon: 'calendar' | 'heart' | 'prescription' | 'alertTriangle' | 'document';
  label: string;
  value: string;
};

/** Abstract preview only — a clinical file is never thumbnailed for real. */
export type UploadedDoc = { id: string; title: string; uploaded: string; lines: number[] };

export type AppointmentDetail = {
  patientId: string;
  /** Clinical record identifier. Everything in Module 9 links to this. */
  consultationId: string;
  appointmentId: string;
  dateLabel: string;
  /** Patient-reported, in their words. Never a diagnosis. */
  concern: string;
  concernDetail: string;
  duration: string;
  severity: string;
  totalConsultations: number;
  intake: IntakeRow[];
  documents: UploadedDoc[];
  consent: { version: string; time: string };
  past?: { dateLabel: string; time: string; title: string; note: string };
  payment: { state: string; txnId: string; method: string };
  /** Minutes until the slot opens; drives the footer sub-label. */
  startsInMinutes: number;
};

const DOC_LINES = {
  text: [1, 0.82, 0.9, 0.6, 0.86],
  notes: [0.9, 0.7, 0.95, 0.55],
  report: [0.8, 0.95, 0.65, 0.88, 0.72],
};

const detailById: Record<string, AppointmentDetail> = {
  a1: {
    patientId: 'PT-10482',
    consultationId: 'CON-10482',
    appointmentId: 'APT-240515-0930',
    dateLabel: '15 May 2024',
    concern: 'Anxiety and difficulty sleeping',
    concernDetail:
      'Persistent restlessness, racing thoughts at night and poor sleep for two weeks.',
    duration: '2 weeks',
    severity: 'Moderate',
    totalConsultations: 3,
    intake: [
      { key: 'dur', icon: 'calendar', label: 'Duration', value: '2 weeks' },
      { key: 'sev', icon: 'heart', label: 'Severity', value: 'Moderate' },
      { key: 'med', icon: 'prescription', label: 'Medication', value: 'None' },
      { key: 'alg', icon: 'alertTriangle', label: 'Allergies', value: 'None known' },
      { key: 'oth', icon: 'document', label: 'Other', value: 'Fatigue and poor concentration.' },
    ],
    documents: [
      { id: 'd1', title: 'Previous Prescription', uploaded: 'Uploaded 14 May', lines: DOC_LINES.text },
      { id: 'd2', title: 'Sleep Report', uploaded: 'Uploaded 14 May', lines: DOC_LINES.report },
      { id: 'd3', title: 'Symptoms Journal', uploaded: 'Uploaded 13 May', lines: DOC_LINES.notes },
    ],
    consent: { version: 'v2.1', time: '09:20 AM' },
    past: { dateLabel: '28 Apr 2024', time: '11:00 AM', title: 'Video follow-up', note: 'Sleep-hygiene guidance.' },
    payment: { state: 'Paid', txnId: 'CC2404287193', method: 'Online' },
    startsInMinutes: 15,
  },
};

/**
 * Detail for any appointment. Rows without an authored record still open a
 * usable screen rather than a blank one: identifiers derive from the
 * appointment and the intake falls back to the presenting concern.
 */
export const detailFor = (a: Appointment): AppointmentDetail =>
  detailById[a.id] ?? {
    patientId: `PT-104${a.id.slice(1).padStart(2, '0')}`,
    consultationId: `CON-104${a.id.slice(1).padStart(2, '0')}`,
    appointmentId: `APT-240515-${a.time.replace(/[: ]/g, '').slice(0, 4)}`,
    dateLabel: '15 May 2024',
    concern: a.concern,
    concernDetail: a.concern,
    duration: 'Not recorded',
    severity: 'Not recorded',
    totalConsultations: 1,
    intake: [
      { key: 'dur', icon: 'calendar', label: 'Duration', value: 'Not recorded' },
      { key: 'sev', icon: 'heart', label: 'Severity', value: 'Not recorded' },
      { key: 'med', icon: 'prescription', label: 'Medication', value: 'None' },
      { key: 'alg', icon: 'alertTriangle', label: 'Allergies', value: 'None known' },
      { key: 'oth', icon: 'document', label: 'Other', value: a.concern },
    ],
    documents: [],
    consent: { version: 'v2.1', time: a.time },
    past: undefined,
    payment: {
      state: a.payment === 'paid' ? 'Paid' : a.payment === 'refunded' ? 'Refunded' : 'Not paid',
      txnId: `CC2405${a.id.slice(1).padStart(4, '0')}`,
      method: 'Online',
    },
    startsInMinutes: 15,
  };

/* --------------------------------- cases ---------------------------------- */

export type CaseState = 'complete' | 'pending' | 'followUp' | 'noShow';

export type PatientCase = {
  id: string;
  caseId: string;
  /**
   * The consultation this case belongs to. DR-11-01 keys a past item to its
   * consultation, and every clinical screen is addressed by it — so the link is
   * explicit here rather than inferred by matching names or list position.
   */
  appointmentId: string;
  initials: string;
  name: string;
  dateLabel: string;
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

export const isClinicallyComplete = (c: PatientCase) =>
  c.prescriptionFinalised && c.summarySubmitted;

/* ------------------------------ case detail ------------------------------- */

/**
 * The full consultation record behind a case (DR-11-01).
 *
 * Every block is a summary of what another module owns — notes, prescription,
 * summary, follow-up, check-ins, clarification. This screen holds none of that
 * itself; it links out to the module that does.
 */
export type CaseDetail = {
  /** Short human reference shown in the title, e.g. "D-17". */
  ref: string;
  mode: string;
  paid: boolean;
  audit: { createdBy: string; createdAt: string; updatedAt: string };
  notes: { excerpt: string; primaryDiagnosis: string } | null;
  prescription: { medicines: number; supplements: number; names: string[] } | null;
  summary: string | null;
  followUp: { dateLabel: string; mode: string } | null;
  checkins: { count: number; latest: string; status: string } | null;
  /** `withInitials` identifies the expert on the thread, for the row avatar. */
  clarification: { messages: number; latest: string; withInitials: string } | null;
  closedAt: string | null;
};

const caseDetailById: Record<string, Partial<CaseDetail>> = {
  c1: {
    audit: {
      createdBy: 'Dr. Arjun Mehta',
      createdAt: '15 May 2024, 08:58 AM',
      updatedAt: '15 May 2024, 09:45 AM',
    },
    notes: {
      excerpt: 'Patient reported chest discomfort and shortness of breath on exertion for the past 3 days.',
      primaryDiagnosis: 'Stable Angina',
    },
    prescription: {
      medicines: 3,
      supplements: 1,
      names: ['Tab. Ecosprin 150', 'Tab. Atorvastatin 40', 'Tab. Metoprolol 25'],
    },
    summary:
      'Cardiovascular evaluation suggests stable angina. ECG normal. Advised lifestyle modification and medication adherence.',
    followUp: { dateLabel: '22 May 2024, 11:30 AM', mode: 'Video Consultation' },
    checkins: { count: 2, latest: '18 May 2024, 08:20 AM', status: 'Stable' },
    clarification: { messages: 2, latest: '16 May 2024, 02:15 PM', withInitials: 'AM' },
    closedAt: '15 May 2024, 09:45 AM',
  },
};

/**
 * Detail for any case. A case without an authored record still opens a usable
 * screen: blocks the doctor has not written yet resolve to `null` and render as
 * "not recorded" rather than as fabricated content.
 */
export const caseDetailFor = (c: PatientCase): CaseDetail => {
  const seed = caseDetailById[c.id] ?? {};
  const appt = appointments.find((a) => a.id === c.appointmentId);
  return {
    // Short doctor-facing reference, derived from the case so it is stable and
    // predictable rather than a slice of the longer COR- identifier.
    ref: `D-${c.id.slice(1).padStart(2, '0')}`,
    mode: appt ? modeLabel[appt.mode] : 'Consultation',
    paid: appt ? appt.payment === 'paid' : false,
    audit: seed.audit ?? {
      createdBy: doctor.name,
      createdAt: c.dateLabel,
      updatedAt: c.dateLabel,
    },
    notes: seed.notes ?? null,
    // only a finalised prescription is part of the record
    prescription: c.prescriptionFinalised ? seed.prescription ?? null : null,
    summary: c.summarySubmitted ? seed.summary ?? null : null,
    followUp: seed.followUp ?? null,
    checkins: seed.checkins ?? null,
    clarification: seed.clarification ?? null,
    closedAt: isClinicallyComplete(c) ? seed.closedAt ?? c.dateLabel : null,
  };
};

/* ------------------------------- schedule --------------------------------- */

export type TimeRange = { from: string; to: string };
export type DaySchedule = {
  day: string;
  short: string;
  enabled: boolean;
  ranges: TimeRange[];
  modes: ConsultMode[];
};
export type ScheduleException = { id: string; dateLabel: string; note: string };
export type Leave = { id: string; dateLabel: string; reason: string };

/* --------------------------------- doctor --------------------------------- */

export type Doctor = {
  name: string;
  /** Drives prescribing permission across every clinical surface. */
  professionalType: ProfessionalType;
  /** Fallback for the avatar whenever `photo` is absent or fails to load. */
  initials: string;
  /** Bundled asset in development; a remote URI once profiles come from the API. */
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

/* ------------------------------- fixtures --------------------------------- */

export const doctor: Doctor = {
  name: 'Dr. Sydney Sweeney',
  professionalType: 'psychiatrist',
  initials: 'SS',
  // Square, face-centred crop of assets/profile.jpg — the source portrait is
  // 452×678, so a circular avatar would centre-crop below the face.
  photo: require('../assets/profile-avatar.jpg'),
  speciality: 'Psychiatrist',
  qualification: 'MBBS, MD',
  yearsExperience: 8,
  registrationNo: 'MCI 12-45892',
  specialisations: ['Adult Psychiatry', 'Sleep Medicine'],
  languages: ['English', 'Hindi'],
  consultationFee: 699,
  consultationMinutes: 30,
  bankVerified: true,
  documentsApproved: true,
  bio: 'Dedicated psychiatrist with 8+ years of experience in diagnosing and treating complex mental health conditions. Passionate about preventive care and helping patients lead healthier, calmer lives.',
};

export const todaySummary = {
  appointments: 18,
  completed: 12,
  upcoming: 4,
  noShow: 1,
  pendingSummaries: 1,
};

export const clinicalTasks = {
  caseSummaries: 2,
  prescriptionDrafts: 3,
  incompleteNotes: 1,
  followUpResponses: 4,
};

export const followUpAlerts = { highPriority: 2, dueToday: 5 };

/* -------------------------------- earnings -------------------------------- */

export type EarningsPeriodKey = 'daily' | 'weekly' | 'monthly';

/** One column of the activity chart. */
export type EarningsBar = { label: string; value: number };

export type EarningsRow = {
  id: string;
  initials: string;
  name: string;
  mode: string;
  dayLabel: string;
  time: string;
  amount: number;
  state: 'Confirmed' | 'Processing';
};

export type EarningsPeriod = {
  key: EarningsPeriodKey;
  tab: string;
  /** The date-stepper caption. */
  rangeLabel: string;
  totalLabel: string;
  total: number;
  consultations: number;
  paid: number;
  processing: number;
  chartTitle: string;
  /** Scope pill beside the chart title; the monthly view has none. */
  chartScope?: string;
  bars: EarningsBar[];
  /** Label of the bar carrying the callout. */
  highlight: string;
  axisMax: number;
  axisStep: number;
  listTitle: string;
  rows: EarningsRow[];
  /** Same period, one cycle back — only set where a month-over-month comparison is shown. */
  previousTotal?: number;
  previousConsultations?: number;
};

/**
 * The doctor keeps the whole consultation fee: gross equals net and the
 * platform deduction is zero. That is a commercial fact, not a placeholder —
 * `platformDeduction` stays in the model so the breakdown can show the ₹0
 * explicitly rather than hiding the line.
 */
export const platformDeduction = 0;

/** Manual, so the payout carries a state rather than a guaranteed date. */
export const nextPayout = {
  amount: 18450,
  expectedLabel: 'Expected 20 May',
  state: 'Processing' as const,
  note: 'Payouts are processed manually by CoraCure.',
};

export type PayoutState = 'Pending' | 'Processed' | 'Paid';

export type PayoutRecord = {
  id: string;
  dateLabel: string;
  forLabel: string;
  amount: number;
  state: PayoutState;
};

/** Most recent first — the pending one at the top mirrors `nextPayout`. */
export const payoutHistory: PayoutRecord[] = [
  { id: 'p1', dateLabel: '05 May 2024', forLabel: 'Payout for Apr 2024', amount: 124800, state: 'Paid' },
  { id: 'p2', dateLabel: '05 Apr 2024', forLabel: 'Payout for Mar 2024', amount: 110400, state: 'Processed' },
  { id: 'p3', dateLabel: '05 Mar 2024', forLabel: 'Payout for Feb 2024', amount: 98600, state: 'Paid' },
];

const dailyRows: EarningsRow[] = [
  { id: 'e1', initials: 'RS', name: 'Rahul Sharma', mode: 'Video', dayLabel: 'Today', time: '09:00 AM', amount: 699, state: 'Confirmed' },
  { id: 'e2', initials: 'AP', name: 'Anita Patel', mode: 'Audio', dayLabel: 'Today', time: '10:30 AM', amount: 699, state: 'Confirmed' },
  { id: 'e3', initials: 'SK', name: 'Sandeep Kumar', mode: 'In-person', dayLabel: 'Today', time: '12:00 PM', amount: 699, state: 'Confirmed' },
  { id: 'e4', initials: 'NP', name: 'Neha Pillai', mode: 'Video', dayLabel: 'Today', time: '02:15 PM', amount: 699, state: 'Processing' },
];

export const earningsPeriods: Record<EarningsPeriodKey, EarningsPeriod> = {
  daily: {
    key: 'daily', tab: 'Daily', rangeLabel: 'Today, 15 May',
    totalLabel: "Today's earnings", total: 8450, consultations: 12,
    paid: 5660, processing: 2790,
    chartTitle: 'Earnings by time', chartScope: 'Today',
    bars: [
      { label: '8 AM', value: 620 },
      { label: '10 AM', value: 1580 },
      { label: '12 PM', value: 2097 },
      { label: '2 PM', value: 1180 },
      { label: '4 PM', value: 690 },
      { label: '6 PM', value: 1420 },
    ],
    highlight: '12 PM', axisMax: 3000, axisStep: 1000,
    listTitle: "Today's consultations", rows: dailyRows,
  },
  weekly: {
    key: 'weekly', tab: 'Weekly', rangeLabel: '13–19 May',
    totalLabel: "This week's earnings", total: 18450, consultations: 27,
    paid: 11470, processing: 6980,
    chartTitle: 'Daily earnings', chartScope: '13–19 May',
    bars: [
      { label: 'Mon', value: 3050 },
      { label: 'Tue', value: 2680 },
      { label: 'Wed', value: 4195 },
      { label: 'Thu', value: 3140 },
      { label: 'Fri', value: 2040 },
      { label: 'Sat', value: 3420 },
      { label: 'Sun', value: 2680 },
    ],
    highlight: 'Wed', axisMax: 8000, axisStep: 2000,
    listTitle: 'Recent consultations',
    rows: [
      dailyRows[0],
      dailyRows[1],
      { ...dailyRows[2], id: 'e3w', dayLabel: 'Tue' },
      { ...dailyRows[3], id: 'e4w', dayLabel: 'Mon', time: '04:15 PM', state: 'Confirmed' },
    ],
  },
  monthly: {
    key: 'monthly', tab: 'Monthly', rangeLabel: 'May 2024',
    totalLabel: "This month's earnings", total: 42120, consultations: 61,
    paid: 23670, processing: 18450,
    chartTitle: 'Weekly earnings',
    bars: [
      { label: 'W1', value: 7100 },
      { label: 'W2', value: 10150 },
      { label: 'W3', value: 12580 },
      { label: 'W4', value: 8000 },
    ],
    highlight: 'W3', axisMax: 20000, axisStep: 5000,
    listTitle: 'Recent earnings',
    rows: [
      dailyRows[0],
      dailyRows[1],
      { ...dailyRows[2], id: 'e3m', dayLabel: '15 May' },
      { ...dailyRows[3], id: 'e4m', dayLabel: '14 May', time: '04:15 PM' },
    ],
    previousTotal: 35700,
    previousConsultations: 52,
  },
};

/**
 * Dashboard summary. Derived, so the card and the Earnings screen cannot
 * drift apart.
 */
export const earnings = {
  today: earningsPeriods.daily.total,
  week: earningsPeriods.weekly.total,
};

/* ----------------------------- follow-up alerts ---------------------------- */

/** Clinical urgency of a check-in response. Drives colour and grouping. */
export type AlertSeverity = 'redFlag' | 'amber' | 'routine';
/** Workflow state, shown as the three top tabs. */
export type AlertBucket = 'needsReview' | 'monitoring' | 'resolved';

export type FollowUpAlert = {
  id: string;
  name: string;
  initials: string;
  /** Which day of the seven-day check-in schedule this response came from. */
  day: number;
  ago: string;
  severity: AlertSeverity;
  /** Red flags surface in their own "Urgent" group above everything else. */
  urgent: boolean;
  title: string;
  /** The patient's own words. Shown quoted, never paraphrased. */
  response: string;
  caseId: string;
  pathway: string;
  bucket: AlertBucket;
  primaryAction: string;
  secondaryAction: string;
};

export const followUpAlertList: FollowUpAlert[] = [
  {
    id: 'f1', name: 'Rahul Sharma', initials: 'RS', day: 3, ago: '10 min ago',
    severity: 'redFlag', urgent: true, title: 'Feels unsafe',
    response: 'I do not feel safe being alone tonight.',
    caseId: 'CC-1284', pathway: 'Anxiety pathway', bucket: 'needsReview',
    primaryAction: 'Review now', secondaryAction: 'Call patient',
  },
  {
    id: 'f2', name: 'Meera Joshi', initials: 'MJ', day: 5, ago: '28 min ago',
    severity: 'redFlag', urgent: true, title: 'Severe worsening reported',
    response: 'My symptoms have become much worse since yesterday.',
    caseId: 'CC-1276', pathway: 'Depression pathway', bucket: 'needsReview',
    primaryAction: 'Review now', secondaryAction: 'View case',
  },
  {
    id: 'f3', name: 'Anita Verma', initials: 'AV', day: 2, ago: '1 hr ago',
    severity: 'amber', urgent: false, title: 'Medication side effects',
    response: 'Feeling dizzy and nauseous after the morning dose.',
    caseId: 'CC-1281', pathway: 'Medication follow-up', bucket: 'needsReview',
    primaryAction: 'Review', secondaryAction: 'Message',
  },
  {
    id: 'f4', name: 'Sameer Khan', initials: 'SK', day: 4, ago: '2 hrs ago',
    severity: 'amber', urgent: false, title: 'Sleep worsening',
    response: 'I slept less than three hours last night.',
    caseId: 'CC-1279', pathway: 'Sleep pathway', bucket: 'needsReview',
    primaryAction: 'Review', secondaryAction: 'View case',
  },
  {
    id: 'f5', name: 'Neha Singh', initials: 'NS', day: 7, ago: '3 hrs ago',
    severity: 'routine', urgent: false, title: 'New report uploaded',
    response: 'I have uploaded the sleep diary you requested.',
    caseId: 'CC-1268', pathway: 'Follow-up', bucket: 'needsReview',
    primaryAction: 'Open report', secondaryAction: 'Reply',
  },
  {
    id: 'f6', name: 'Kabir Shah', initials: 'KS', day: 6, ago: '5 hrs ago',
    severity: 'amber', urgent: false, title: 'Mood dip continuing',
    response: 'Still low most days, but no worse than last week.',
    caseId: 'CC-1272', pathway: 'Depression pathway', bucket: 'monitoring',
    primaryAction: 'Review', secondaryAction: 'View case',
  },
  {
    id: 'f7', name: 'Riya Kapoor', initials: 'RK', day: 4, ago: '7 hrs ago',
    severity: 'routine', urgent: false, title: 'Adherence confirmed',
    response: 'Taking the medication exactly as prescribed.',
    caseId: 'CC-1264', pathway: 'Medication follow-up', bucket: 'monitoring',
    primaryAction: 'Review', secondaryAction: 'View case',
  },
  {
    id: 'f8', name: 'Priya Singh', initials: 'PS', day: 2, ago: '9 hrs ago',
    severity: 'routine', urgent: false, title: 'Appetite improving',
    response: 'Eating better than I was at the start of the week.',
    caseId: 'CC-1259', pathway: 'Anxiety pathway', bucket: 'monitoring',
    primaryAction: 'Review', secondaryAction: 'View case',
  },
  {
    id: 'f9', name: 'Rohit Desai', initials: 'RD', day: 7, ago: 'Yesterday',
    severity: 'amber', urgent: false, title: 'Side effects settled',
    response: 'The dizziness stopped after the dose was lowered.',
    caseId: 'CC-1251', pathway: 'Medication follow-up', bucket: 'resolved',
    primaryAction: 'View case', secondaryAction: 'Reopen',
  },
  {
    id: 'f10', name: 'Kavita Nair', initials: 'KN', day: 7, ago: '2 days ago',
    severity: 'routine', urgent: false, title: 'Check-in complete',
    response: 'Feeling much steadier now, thank you.',
    caseId: 'CC-1248', pathway: 'Sleep pathway', bucket: 'resolved',
    primaryAction: 'View case', secondaryAction: 'Reopen',
  },
];

/* --------------------------- pending clinical tasks ------------------------ */

/** Where a task sits against its deadline. Drives the accent and the grouping. */
/** What kind of unfinished work this is. Drives the chips and the accent. */
export type TaskCategory = 'summary' | 'prescription' | 'note' | 'followUp';

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  summary: 'Summaries',
  prescription: 'Prescriptions',
  note: 'Notes',
  followUp: 'Follow-ups',
};

export type ClinicalTask = {
  id: string;
  category: TaskCategory;
  /** What the doctor still owes, named the same way for each category. */
  title: string;
  patient: string;
  /** The clinical record the debt belongs to. */
  caseId: string;
  /** The consultation this came out of. Psychiatry-first, never general medicine. */
  specialty: string;
  /** How long it has been sitting. The default order runs longest first. */
  pendingFor: string;
  openedOn: string;
};

const TASK_TITLE: Record<TaskCategory, string> = {
  summary: 'Pending Case Summary',
  prescription: 'Prescription Draft',
  note: 'Incomplete Notes',
  followUp: 'Unread Follow-up Response',
};

const task = (
  id: string,
  category: TaskCategory,
  patient: string,
  caseId: string,
  specialty: string,
  pendingFor: string,
  openedOn: string
): ClinicalTask => ({ id, category, title: TASK_TITLE[category], patient, caseId, specialty, pendingFor, openedOn });

/**
 * The worklist, oldest debt first. Eighteen items across four categories —
 * 6 summaries, 5 prescriptions, 4 notes and 3 follow-ups — so every count on
 * the screen is derived rather than authored twice.
 */
export const clinicalTaskList: ClinicalTask[] = [
  task('t1', 'summary', 'Rahul Sharma', 'CON-10482', 'Psychiatry Consultation', '14d 22h', '30 Apr'),
  task('t2', 'prescription', 'Anita Patel', 'CON-10459', 'Psychiatry Consultation', '13d 18h', '1 May'),
  task('t3', 'note', 'Sandeep Kumar', 'CON-10460', 'Counselling Session', '12d 20h', '2 May'),
  task('t4', 'followUp', 'Neha Pillai', 'CON-10461', 'Psychology Session', '11d 15h', '3 May'),
  task('t5', 'prescription', 'Arjun Kapoor', 'CON-10462', 'De-addiction Follow-up', '10d 16h', '4 May'),
  task('t6', 'summary', 'Meera Joshi', 'CON-10463', 'Psychiatry Consultation', '9d 21h', '5 May'),
  task('t7', 'note', 'Kabir Shah', 'CON-10464', 'Psychology Session', '8d 19h', '6 May'),
  task('t8', 'summary', 'Sameer Khan', 'CON-10465', 'Counselling Session', '7d 23h', '7 May'),
  task('t9', 'prescription', 'Divya Nair', 'CON-10466', 'Psychiatry Consultation', '6d 18h', '8 May'),
  task('t10', 'followUp', 'Neha Singh', 'CON-10467', 'Psychology Session', '5d 20h', '9 May'),
  task('t11', 'note', 'Rohit Verma', 'CON-10468', 'De-addiction Follow-up', '4d 17h', '10 May'),
  task('t12', 'summary', 'Priya Menon', 'CON-10469', 'Psychiatry Consultation', '3d 22h', '11 May'),
  task('t13', 'prescription', 'Imran Qureshi', 'CON-10470', 'Psychiatry Consultation', '2d 19h', '12 May'),
  task('t14', 'summary', 'Ananya Rao', 'CON-10471', 'Counselling Session', '1d 21h', '13 May'),
  task('t15', 'note', 'Vikram Desai', 'CON-10472', 'Psychology Session', '22h', '14 May'),
  task('t16', 'prescription', 'Riya Kapoor', 'CON-10473', 'Psychiatry Consultation', '18h', '14 May'),
  task('t17', 'followUp', 'Farhan Sheikh', 'CON-10474', 'De-addiction Follow-up', '9h', '15 May'),
  task('t18', 'summary', 'Lakshmi Iyer', 'CON-10475', 'Psychology Session', '4h', '15 May'),
];

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
   * reasonably contest — it is not shown on every review, because a low rating
   * on its own is not grounds for a report.
   */
  reportable?: boolean;
};

export const feedback = {
  rating: 4.8,
  reviews: 126,
  /** Month-on-month movement, shown as the insight row. */
  ratingDelta: 0.2,
  /** Share of reviews at each star level; ordered 5 → 1. */
  distribution: [
    { stars: 5, percent: 82 },
    { stars: 4, percent: 13 },
    { stars: 3, percent: 4 },
    { stars: 2, percent: 1 },
    { stars: 1, percent: 0 },
  ],
  /** Tag counts across all reviews — descriptive, never ranked or gamified. */
  appreciation: [
    { tag: 'Clear explanations' as ReviewTag, count: 94, icon: 'message' as const },
    { tag: 'Listens carefully' as ReviewTag, count: 88, icon: 'heart' as const },
    { tag: 'Helpful guidance' as ReviewTag, count: 76, icon: 'document' as const },
    { tag: 'On time' as ReviewTag, count: 69, icon: 'clock' as const },
  ],
};

export const reviews: Review[] = [
  {
    id: 'r1',
    label: 'Verified patient',
    stars: 5,
    dateLabel: '14 May 2024',
    mode: 'Video consultation',
    body: 'Dr. Mehta listened patiently and explained the treatment plan in a very clear way.',
    tags: ['Clear explanations', 'Listens carefully'],
  },
  {
    id: 'r2',
    initials: 'RS',
    label: 'Patient R.S.',
    stars: 5,
    dateLabel: '12 May 2024',
    mode: 'Follow-up',
    body: 'The follow-up was reassuring and all my questions were answered without rushing.',
    tags: ['Helpful guidance', 'On time'],
  },
  {
    id: 'r3',
    label: 'Verified patient',
    stars: 4,
    dateLabel: '9 May 2024',
    mode: 'Audio consultation',
    body: 'Good consultation and practical advice. The call started a few minutes late.',
    tags: ['Helpful guidance'],
  },
  {
    id: 'r4',
    initials: 'AP',
    label: 'Patient A.P.',
    stars: 5,
    dateLabel: '6 May 2024',
    mode: 'Video consultation',
    body: 'Very professional and calm. I felt comfortable discussing my concerns.',
    tags: ['Listens carefully'],
  },
  {
    id: 'r5',
    label: 'Verified patient',
    stars: 3,
    dateLabel: '2 May 2024',
    mode: 'Video consultation',
    body: 'Consultation was helpful, but I would have liked more time for questions.',
    tags: [],
    reportable: true,
  },
];

export const appointments: Appointment[] = [
  { id: 'a1', time: '09:00 AM', initials: 'RS', name: 'Rahul Sharma', age: 32, gender: 'Male', mode: 'video', state: 'confirmed', payment: 'paid', concern: 'Anxiety, restlessness and difficulty sleeping', bucket: 'today' },
  { id: 'a2', time: '10:30 AM', initials: 'AP', name: 'Anita Patel', age: 34, gender: 'Female', mode: 'audio', state: 'confirmed', payment: 'paid', concern: 'Medication side effects and daytime drowsiness', bucket: 'today' },
  { id: 'a3', time: '12:00 PM', initials: 'SK', name: 'Sandeep Kumar', age: 40, gender: 'Male', mode: 'inPerson', state: 'completed', payment: 'paid', concern: 'Low mood and loss of interest', bucket: 'today' },
  { id: 'a4', time: '02:15 PM', initials: 'NP', name: 'Neha Pillai', age: 28, gender: 'Female', mode: 'video', state: 'cancelled', payment: 'refunded', concern: 'Panic episodes with racing thoughts', bucket: 'today' },
  { id: 'a5', time: '04:00 PM', initials: 'AK', name: 'Arjun Kapoor', age: 38, gender: 'Male', mode: 'inPerson', state: 'noShow', payment: 'notPaid', concern: 'Sleep disturbance and irritability', bucket: 'today' },
  { id: 'a6', time: '05:30 PM', initials: 'PS', name: 'Priya Singh', age: 35, gender: 'Female', mode: 'audio', state: 'confirmed', payment: 'paid', concern: 'Low mood follow-up', bucket: 'today' },
  { id: 'a7', time: '09:30 AM', initials: 'MV', name: 'Meera Verma', age: 36, gender: 'Female', mode: 'video', state: 'upcoming', payment: 'paid', concern: 'Anxiety review', bucket: 'upcoming' },
  { id: 'a8', time: '11:00 AM', initials: 'RD', name: 'Rohit Desai', age: 49, gender: 'Male', mode: 'video', state: 'upcoming', payment: 'paid', concern: 'Medication review after dose change', bucket: 'upcoming' },
  { id: 'a9', time: '03:00 PM', initials: 'KN', name: 'Kavita Nair', age: 57, gender: 'Female', mode: 'inPerson', state: 'completed', payment: 'paid', concern: 'Sleep and mood review', bucket: 'past' },
];

export const nextAppointment = {
  /** The appointment this card stands for, so its CTAs can open the real one. */
  appointmentId: 'a1',
  initials: 'RS',
  name: 'Rahul Sharma',
  age: 32,
  gender: 'Male' as const,
  concern: 'Anxiety, restlessness and difficulty sleeping',
  time: '10:00 AM',
  dayLabel: 'Today',
  payment: 'Paid',
  mode: 'Video Call',
  inMinutes: 15,
};

export const cases: PatientCase[] = [
  { id: 'c1', appointmentId: 'a1', caseId: 'COR-12458', initials: 'RS', name: 'Rahul Sharma', dateLabel: '15 May · 09:00 AM', age: 32, gender: 'Male', concern: 'Anxiety, restlessness and difficulty sleeping', state: 'complete', docsDone: 3, docsTotal: 3, prescriptionFinalised: true, summarySubmitted: true },
  { id: 'c2', appointmentId: 'a2', caseId: 'COR-12459', initials: 'AP', name: 'Anita Patel', dateLabel: '15 May · 10:30 AM', age: 34, gender: 'Female', concern: 'Medication side effects and daytime drowsiness', state: 'followUp', docsDone: 2, docsTotal: 3, prescriptionFinalised: true, summarySubmitted: false },
  { id: 'c3', appointmentId: 'a3', caseId: 'COR-12460', initials: 'SK', name: 'Sandeep Kumar', dateLabel: '15 May · 12:00 PM', age: 40, gender: 'Male', concern: 'Low mood and loss of interest', state: 'complete', docsDone: 3, docsTotal: 3, prescriptionFinalised: true, summarySubmitted: true },
  { id: 'c4', appointmentId: 'a4', caseId: 'COR-12461', initials: 'NP', name: 'Neha Pillai', dateLabel: '15 May · 02:15 PM', age: 28, gender: 'Female', concern: 'Panic episodes with racing thoughts', state: 'pending', docsDone: 1, docsTotal: 3, prescriptionFinalised: false, summarySubmitted: false },
  { id: 'c5', appointmentId: 'a5', caseId: 'COR-12462', initials: 'AK', name: 'Arjun Kapoor', dateLabel: '15 May · 04:00 PM', age: 38, gender: 'Male', concern: 'Sleep disturbance and irritability', state: 'noShow', docsDone: 0, docsTotal: 3, prescriptionFinalised: false, summarySubmitted: false },
  { id: 'c6', appointmentId: 'a6', caseId: 'COR-12463', initials: 'PS', name: 'Priya Singh', dateLabel: '15 May · 05:30 PM', age: 35, gender: 'Female', concern: 'Low mood follow-up', state: 'complete', docsDone: 3, docsTotal: 3, prescriptionFinalised: true, summarySubmitted: true },
];

export const TOTAL_CASES = 52;

export const initialSchedule: DaySchedule[] = [
  { day: 'Monday', short: 'Mon', enabled: true, ranges: [{ from: '09:00 AM', to: '01:00 PM' }, { from: '04:00 PM', to: '07:00 PM' }], modes: ['video', 'audio'] },
  { day: 'Tuesday', short: 'Tue', enabled: true, ranges: [{ from: '09:30 AM', to: '01:30 PM' }, { from: '04:00 PM', to: '08:00 PM' }], modes: ['video', 'audio'] },
  { day: 'Wednesday', short: 'Wed', enabled: true, ranges: [{ from: '09:00 AM', to: '01:00 PM' }, { from: '04:00 PM', to: '07:00 PM' }], modes: ['video', 'audio', 'inPerson'] },
  { day: 'Thursday', short: 'Thu', enabled: true, ranges: [{ from: '09:30 AM', to: '01:30 PM' }, { from: '04:00 PM', to: '08:00 PM' }], modes: ['video', 'audio'] },
  { day: 'Friday', short: 'Fri', enabled: true, ranges: [{ from: '09:00 AM', to: '01:00 PM' }, { from: '04:00 PM', to: '06:00 PM' }], modes: ['video', 'audio'] },
  { day: 'Saturday', short: 'Sat', enabled: false, ranges: [], modes: ['video'] },
  { day: 'Sunday', short: 'Sun', enabled: false, ranges: [], modes: ['video'] },
];

export const scheduleExceptions: ScheduleException[] = [
  { id: 'e1', dateLabel: '24 May', note: 'Custom hours' },
  { id: 'e2', dateLabel: '28 May', note: 'Custom hours' },
  { id: 'e3', dateLabel: '30 May', note: 'Custom hours' },
];

export const leaves: Leave[] = [
  { id: 'l1', dateLabel: '5 Jun', reason: 'Personal leave' },
  { id: 'l2', dateLabel: '15 Jun', reason: 'Personal leave' },
];

/* ------------------------- verification fixtures -------------------------- */

export const pendingItems: VerificationItem[] = [
  { key: 'reg', icon: 'idCard', title: 'Medical registration', body: 'Your medical registration is under review.', state: 'underReview' },
  { key: 'id', icon: 'shieldCheck', title: 'Proof of identity', body: 'Your identity has been verified.', state: 'verified' },
  { key: 'addr', icon: 'inPerson', title: 'Practice address', body: 'Your practice address is under review.', state: 'underReview' },
  { key: 'bank', icon: 'wallet', title: 'Bank details', body: 'Your payout account is under review.', state: 'underReview' },
];

export const rejectedItems: VerificationItem[] = [
  { key: 'reg', icon: 'idCard', title: 'Medical registration', body: 'Upload a clear and valid registration certificate', state: 'issue', issueLabel: 'Document unclear' },
  { key: 'id', icon: 'shieldCheck', title: 'Proof of identity', body: 'Ensure your name matches your government-issued ID', state: 'issue', issueLabel: 'Name mismatch' },
  { key: 'addr', icon: 'inPerson', title: 'Practice address', body: 'Verify your clinic or hospital address', state: 'issue', issueLabel: 'Not verified' },
];

export const approvedItems: VerificationItem[] = [
  { key: 'reg', icon: 'idCard', title: 'Medical registration', body: 'Your medical registration has been verified', state: 'verified' },
  { key: 'id', icon: 'shieldCheck', title: 'Proof of identity', body: 'Your government-issued ID has been verified', state: 'verified' },
  { key: 'profile', icon: 'document', title: 'Professional profile', body: 'Your professional details are verified', state: 'verified' },
  { key: 'practice', icon: 'inPerson', title: 'Practice details', body: 'Your clinic or hospital details are verified', state: 'verified' },
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

export const instantRequest: InstantRequest = {
  initials: 'RS',
  name: 'Rahul Sharma',
  age: 32,
  gender: 'Male',
  speciality: 'Psychiatry',
  concern: 'Anxiety and difficulty sleeping',
  mode: 'video',
  languages: 'English / Hindi',
  approxMinutes: 30,
  respondWithin: 24,
};

/** The order is fixed: consultation opens only after payment and consent. */
export const INSTANT_STEPS = [
  'Accept request',
  'Patient completes payment',
  'Consent verified and consultation opens',
];
