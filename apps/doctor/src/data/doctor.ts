/**
 * Doctor-app domain types and development fixtures.
 *
 * Role scope: a doctor sees only their own cases and assigned patients.
 * There is no patient discovery and no doctor self-registration — doctors are
 * created and approved by an administrator.
 */

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

/* --------------------------------- cases ---------------------------------- */

export type CaseState = 'complete' | 'pending' | 'followUp' | 'noShow';

export type PatientCase = {
  id: string;
  caseId: string;
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
  initials: string;
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
};

/* ------------------------------- fixtures --------------------------------- */

export const doctor: Doctor = {
  name: 'Dr. Arjun Mehta',
  initials: 'AM',
  speciality: 'Cardiologist',
  qualification: 'MBBS, MD',
  yearsExperience: 8,
  registrationNo: 'MCI 12-45892',
  specialisations: ['Cardiology', 'Internal Medicine'],
  languages: ['English', 'Hindi'],
  consultationFee: 699,
  consultationMinutes: 30,
  bankVerified: true,
  documentsApproved: true,
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

export const earnings = { today: 8450, week: 42120 };

export const feedback = { rating: 4.8, reviews: 126 };

export const appointments: Appointment[] = [
  { id: 'a1', time: '09:00 AM', initials: 'RS', name: 'Rahul Sharma', age: 45, gender: 'Male', mode: 'video', state: 'confirmed', payment: 'paid', concern: 'Chest discomfort and shortness of breath', bucket: 'today' },
  { id: 'a2', time: '10:30 AM', initials: 'AP', name: 'Anita Patel', age: 34, gender: 'Female', mode: 'audio', state: 'confirmed', payment: 'paid', concern: 'Irregular heartbeat and fatigue', bucket: 'today' },
  { id: 'a3', time: '12:00 PM', initials: 'SK', name: 'Sandeep Kumar', age: 52, gender: 'Male', mode: 'inPerson', state: 'completed', payment: 'paid', concern: 'High blood pressure', bucket: 'today' },
  { id: 'a4', time: '02:15 PM', initials: 'NP', name: 'Neha Pillai', age: 28, gender: 'Female', mode: 'video', state: 'cancelled', payment: 'refunded', concern: 'Acid reflux and chest pain', bucket: 'today' },
  { id: 'a5', time: '04:00 PM', initials: 'AK', name: 'Arjun Kapoor', age: 38, gender: 'Male', mode: 'inPerson', state: 'noShow', payment: 'notPaid', concern: 'Knee pain and swelling', bucket: 'today' },
  { id: 'a6', time: '05:30 PM', initials: 'PS', name: 'Priya Singh', age: 41, gender: 'Female', mode: 'audio', state: 'confirmed', payment: 'paid', concern: 'Thyroid follow-up', bucket: 'today' },
  { id: 'a7', time: '09:30 AM', initials: 'MV', name: 'Meera Verma', age: 36, gender: 'Female', mode: 'video', state: 'upcoming', payment: 'paid', concern: 'Palpitations review', bucket: 'upcoming' },
  { id: 'a8', time: '11:00 AM', initials: 'RD', name: 'Rohit Desai', age: 49, gender: 'Male', mode: 'video', state: 'upcoming', payment: 'paid', concern: 'Post-angioplasty follow-up', bucket: 'upcoming' },
  { id: 'a9', time: '03:00 PM', initials: 'KN', name: 'Kavita Nair', age: 57, gender: 'Female', mode: 'inPerson', state: 'completed', payment: 'paid', concern: 'Hypertension review', bucket: 'past' },
];

export const nextAppointment = {
  initials: 'RS',
  name: 'Rahul Sharma',
  age: 45,
  gender: 'Male' as const,
  concern: 'Chest discomfort and shortness of breath',
  time: '10:00 AM',
  dayLabel: 'Today',
  payment: 'Paid',
  mode: 'Video Call',
  inMinutes: 15,
};

export const cases: PatientCase[] = [
  { id: 'c1', caseId: 'COR-12458', initials: 'RS', name: 'Rahul Sharma', dateLabel: '15 May · 09:00 AM', age: 45, gender: 'Male', concern: 'Chest discomfort and shortness of breath', state: 'complete', docsDone: 3, docsTotal: 3, prescriptionFinalised: true, summarySubmitted: true },
  { id: 'c2', caseId: 'COR-12459', initials: 'AP', name: 'Anita Patel', dateLabel: '15 May · 10:30 AM', age: 34, gender: 'Female', concern: 'Irregular heartbeat and fatigue', state: 'followUp', docsDone: 2, docsTotal: 3, prescriptionFinalised: true, summarySubmitted: false },
  { id: 'c3', caseId: 'COR-12460', initials: 'SK', name: 'Sandeep Kumar', dateLabel: '15 May · 12:00 PM', age: 52, gender: 'Male', concern: 'High blood pressure', state: 'complete', docsDone: 3, docsTotal: 3, prescriptionFinalised: true, summarySubmitted: true },
  { id: 'c4', caseId: 'COR-12461', initials: 'NP', name: 'Neha Pillai', dateLabel: '15 May · 02:15 PM', age: 28, gender: 'Female', concern: 'Acid reflux and chest pain', state: 'pending', docsDone: 1, docsTotal: 3, prescriptionFinalised: false, summarySubmitted: false },
  { id: 'c5', caseId: 'COR-12462', initials: 'AK', name: 'Arjun Kapoor', dateLabel: '15 May · 04:00 PM', age: 38, gender: 'Male', concern: 'Knee pain and swelling', state: 'noShow', docsDone: 0, docsTotal: 3, prescriptionFinalised: false, summarySubmitted: false },
  { id: 'c6', caseId: 'COR-12463', initials: 'PS', name: 'Priya Singh', dateLabel: '15 May · 05:30 PM', age: 41, gender: 'Female', concern: 'Thyroid follow-up', state: 'complete', docsDone: 3, docsTotal: 3, prescriptionFinalised: true, summarySubmitted: true },
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
