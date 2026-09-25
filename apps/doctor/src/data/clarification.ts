/**
 * Expert clarification cases (DOC-CAS-01 … DOC-CAS-05).
 *
 * A clarification is a de-identified case shared with an authorised expert for
 * advisory guidance. Two invariants hold throughout:
 *
 *   1. Direct identifiers never leave the treating doctor's side.
 *   2. Expert guidance is advisory. It never modifies the care plan, is never
 *      shown to the patient, and is never written to the patient record.
 */
import { fmtDayTime } from './calendar';

/* ------------------------------ de-identification ------------------------- */

/** Fields stripped before a case is shared. */
export const DIRECT_IDENTIFIERS = ['name', 'patientId', 'phone', 'email', 'address'] as const;

const IDENTIFIER_PATTERNS: RegExp[] = [
  /\b[A-Z]{2}-\d{5,}\b/, // patient / consultation ids
  /\b(?:\+91[- ]?)?[6-9]\d{9}\b/, // phone
  /[\w.]+@[\w.]+\.\w{2,}/, // email
  /\bPT-\d+\b/i,
];

/**
 * Scans free text for direct identifiers.
 *
 * Deliberately conservative: it reports whether anything looks like an
 * identifier so the doctor can fix it, and never silently rewrites clinical
 * text — an automatic redaction that mangles a dose would be worse than a
 * warning.
 */
export const scanForIdentifiers = (text: string): string[] =>
  IDENTIFIER_PATTERNS.filter((re) => re.test(text)).map((re) => re.source);

export const hasIdentifiers = (text: string) => scanForIdentifiers(text).length > 0;

/** What the expert may see — the private fields are dropped, not blanked. */
export type SharedCase = {
  caseId: string;
  title: string;
  ageLabel: string;
  gender: 'Male' | 'Female';
  speciality: string;
  history: string;
  provisionalDiagnosis: string;
  currentPlan: string;
  question: string;
  attachments: number;
};

export const deIdentify = (draft: ClarificationDraft): SharedCase => ({
  caseId: draft.caseId,
  title: draft.title,
  ageLabel: draft.ageLabel,
  gender: draft.gender,
  speciality: draft.speciality,
  history: draft.history,
  provisionalDiagnosis: draft.provisionalDiagnosis,
  currentPlan: draft.currentPlan,
  question: draft.question,
  attachments: draft.files.length,
  // name, patientId and consultationId are intentionally absent
});

/* --------------------------------- draft ---------------------------------- */

export type Urgency = 'routine' | 'priority' | 'urgent';
export const URGENCIES: { key: Urgency; label: string }[] = [
  { key: 'routine', label: 'Routine' },
  { key: 'priority', label: 'Priority' },
  { key: 'urgent', label: 'Urgent' },
];

export const GUIDANCE_AREAS = [
  'Treatment plan review',
  'Diagnostic clarification',
  'Medication adjustment',
  'Risk assessment',
  'Referral advice',
];

export type ClarificationFile = { id: string; name: string; size: string };

export type ClarificationDraft = {
  caseId: string;
  /** The consultation it was raised from. Private, never shared. */
  appointmentId: string;
  /** Private, never shared. */
  patientName: string;
  patientId: string;
  consultationId: string;
  title: string;
  ageLabel: string;
  gender: 'Male' | 'Female';
  history: string;
  provisionalDiagnosis: string;
  currentPlan: string;
  question: string;
  guidanceArea: string;
  urgency: Urgency;
  speciality: string;
  files: ClarificationFile[];
};

export const HISTORY_MAX = 1000;
export const QUESTION_MAX = 1000;
export const REPLY_MAX = 1000;
export const GUIDANCE_MAX = 1000;
export const DECISION_MAX = 1000;

/* -------------------------------- lifecycle ------------------------------- */

export type CaseStatus = 'posted' | 'expertReview' | 'clarificationNeeded' | 'responseReceived' | 'reviewed' | 'closed';

export const STATUS_LABEL: Record<CaseStatus, string> = {
  posted: 'Posted',
  expertReview: 'Expert review',
  clarificationNeeded: 'Clarification needed',
  responseReceived: 'Response received',
  reviewed: 'Reviewed',
  closed: 'Closed',
};

/** The three steps the compact tracker renders; later states reuse the third. */
export const trackerSteps = (status: CaseStatus): { label: string; state: 'done' | 'active' | 'todo' }[] => {
  const order: CaseStatus[] = ['posted', 'expertReview', 'clarificationNeeded'];
  const laterThanTracker = ['responseReceived', 'reviewed', 'closed'].includes(status);
  const idx = laterThanTracker ? 2 : order.indexOf(status);
  const third = laterThanTracker ? STATUS_LABEL[status] : 'Clarification needed';
  return [
    { label: 'Posted', state: idx > 0 ? 'done' : 'active' },
    { label: 'Expert review', state: idx > 1 ? 'done' : idx === 1 ? 'active' : 'todo' },
    { label: third, state: idx === 2 ? 'active' : 'todo' },
  ];
};

/* ------------------------------ expert content ---------------------------- */

export type Expert = { id: string; name: string; initials: string; role: string };

export const experts: Record<string, Expert> = {
  ex1: { id: 'ex1', name: 'Dr. Kiran Bhatt', initials: 'KB', role: 'Consultant Psychiatrist' },
  ex2: { id: 'ex2', name: 'Dr. Sunita Gokhale', initials: 'SG', role: 'Senior Reviewer' },
};

export type ResponseType = 'comment' | 'considerations' | 'clarification' | 'followUp';

export const RESPONSE_TYPE_LABEL: Record<ResponseType, string> = {
  comment: 'Comment',
  considerations: 'Clinical considerations',
  clarification: 'Clarification requested',
  followUp: 'Follow-up recommended',
};

export type ClarificationMessage = {
  id: string;
  /** `me` is the treating doctor; otherwise an expert id. */
  author: 'me' | string;
  kind?: ResponseType;
  body: string;
  at: string;
  file?: string;
};

export const OUTCOMES = [
  'Guidance reviewed',
  'Guidance adopted',
  'Guidance not applicable',
  'Escalated for in-person review',
];

/**
 * A clarification the doctor raised, as it appears in their own list.
 * `draft` is list-only — a case that has never been posted has no tracker
 * state, so it sits outside `CaseStatus` rather than distorting it.
 */
export type ListStatus = CaseStatus | 'draft';

export const LIST_STATUS_LABEL: Record<ListStatus, string> = {
  draft: 'Draft',
  posted: 'Posted',
  expertReview: 'Awaiting Response',
  clarificationNeeded: 'Clarification Asked',
  responseReceived: 'Response Received',
  reviewed: 'Reviewed',
  closed: 'Closed',
};

export type Clarification = {
  id: string;
  /** The shared reference, e.g. CLR-2026-0184. */
  caseId: string;
  appointmentId: string;
  title: string;
  blurb: string;
  icon: 'brain' | 'moon' | 'inPerson' | 'heart';
  urgency: Urgency;
  status: ListStatus;
  lastActivity: string;
  /** The de-identified case, exactly as the expert sees it. */
  shared: {
    ageLabel: string;
    gender: 'Male' | 'Female';
    provisionalDiagnosis: string;
    history: string;
    currentPlan: string;
    question: string;
    guidanceArea: string;
    files: ClarificationFile[];
  };
  expertId: string;
  messages: ClarificationMessage[];
  /** Present once the expert has sent guidance. */
  guidance?: { body: string; kind: ResponseType; at: string; attachments: number };
  outcome?: { value: string; note: string; at: string };
};

export type ClarificationSummary = Pick<
  Clarification,
  'id' | 'caseId' | 'title' | 'blurb' | 'icon' | 'urgency' | 'status' | 'lastActivity'
>;

/** Filter row across the top of the list. `all` matches everything. */
export const CLARIFICATION_FILTERS: { key: ListStatus | 'all'; label: string; icon: 'checklist' | 'pencil' | 'sort' | 'clock' | 'message' }[] = [
  { key: 'all', label: 'All', icon: 'checklist' },
  { key: 'draft', label: 'Draft', icon: 'pencil' },
  { key: 'expertReview', label: 'Awaiting Response', icon: 'clock' },
  { key: 'clarificationNeeded', label: 'Clarification Asked', icon: 'message' },
  { key: 'responseReceived', label: 'Response Received', icon: 'message' },
  { key: 'reviewed', label: 'Reviewed', icon: 'sort' },
];

export const clarifications: Clarification[] = [
  {
    id: 'cl1',
    caseId: 'CLR-2026-0191',
    appointmentId: 'a14',
    title: 'Mood instability after medication change',
    blurb: 'Seeking input on managing mood swings following a recent SSRI adjustment.',
    icon: 'brain',
    urgency: 'urgent',
    status: 'expertReview',
    lastActivity: fmtDayTime(0, 10 * 60 + 24),
    shared: {
      ageLabel: '35 years',
      gender: 'Female',
      provisionalDiagnosis: 'Moderate depressive episode, provisional',
      history: 'Four weeks of low mood and poor motivation. Sertraline increased to 50 mg eight days ago; mood now swinging through the day.',
      currentPlan: 'Sertraline 50 mg once daily, 14-day check-in pathway',
      question: 'Would you hold the current dose or step back given the mood swings since the increase?',
      guidanceArea: 'Medication adjustment',
      files: [],
    },
    expertId: 'ex1',
    messages: [
      { id: 'm1', author: 'me', body: 'Would you hold the current dose or step back given the mood swings since the increase?', at: fmtDayTime(0, 10 * 60 + 24) },
    ],
  },
  {
    id: 'cl2',
    caseId: 'CLR-2026-0187',
    appointmentId: 'a12',
    title: 'Insomnia with panic symptoms',
    blurb: 'Persistent insomnia with night-time panic attacks despite sleep hygiene work.',
    icon: 'moon',
    urgency: 'priority',
    status: 'clarificationNeeded',
    lastActivity: fmtDayTime(-1, 19 * 60 + 48),
    shared: {
      ageLabel: '28 years',
      gender: 'Female',
      provisionalDiagnosis: 'Panic disorder, provisional',
      history: 'Panic episodes for two months, now waking at night with panic attacks. Sleep under five hours most nights.',
      currentPlan: 'Escitalopram 10 mg once daily, sleep-hygiene plan',
      question: 'Is a short course of a sleep aid reasonable alongside the SSRI, or should we wait for the SSRI to take effect?',
      guidanceArea: 'Treatment plan review',
      files: [{ id: 'f1', name: 'Sleep diary.pdf', size: '320 KB' }],
    },
    expertId: 'ex1',
    messages: [
      { id: 'm1', author: 'me', body: 'Is a short course of a sleep aid reasonable alongside the SSRI, or should we wait for the SSRI to take effect?', at: fmtDayTime(-2, 16 * 60 + 5) },
      { id: 'm2', author: 'ex1', kind: 'clarification', body: 'How many weeks has she been on escitalopram 10 mg, and has caffeine or alcohol use changed recently?', at: fmtDayTime(-1, 19 * 60 + 48) },
    ],
  },
  {
    id: 'cl3',
    caseId: 'CLR-2026-0184',
    appointmentId: 'a11',
    title: 'Persistent anxiety with limited early response',
    blurb: 'Anxiety and sleep disturbance with limited response at two weeks of an SSRI.',
    icon: 'brain',
    urgency: 'routine',
    status: 'responseReceived',
    lastActivity: fmtDayTime(0, 10 * 60 + 45),
    shared: {
      ageLabel: '32 years',
      gender: 'Male',
      provisionalDiagnosis: 'Generalised anxiety disorder, provisional',
      history: 'Anxiety, disturbed sleep, restlessness and reduced concentration. Started escitalopram 5 mg twelve days ago.',
      currentPlan: 'Escitalopram 5 mg once daily, 14-day check-in pathway',
      question: 'Would you adjust the plan given the limited early response and persistent sleep disturbance?',
      guidanceArea: 'Treatment plan review',
      files: [{ id: 'f1', name: 'Recent clinical note.pdf', size: '210 KB' }],
    },
    expertId: 'ex1',
    messages: [
      { id: 'm1', author: 'me', body: 'Would you adjust the plan given the limited early response and persistent sleep disturbance?', at: fmtDayTime(-2, 9 * 60 + 15) },
      { id: 'm2', author: 'ex1', kind: 'clarification', body: 'Please confirm how long the current medication has been used and whether adherence has been consistent.', at: fmtDayTime(-1, 14 * 60 + 15) },
      { id: 'm3', author: 'me', body: 'Twelve days at 5 mg, taken daily. No missed doses reported.', at: fmtDayTime(-1, 16 * 60 + 2) },
      { id: 'm4', author: 'ex2', kind: 'comment', body: 'Agree with continuing for now. Worth checking caffeine intake and sleep timing before any change.', at: fmtDayTime(0, 9 * 60 + 5) },
    ],
    guidance: {
      kind: 'considerations',
      body: 'Confirm adherence and tolerability before changing treatment. If symptoms remain significant after four weeks, arrange an earlier clinical review. Recommend urgent in-person support if an immediate safety concern is identified.',
      at: fmtDayTime(0, 10 * 60 + 45),
      attachments: 1,
    },
  },
  {
    id: 'cl4',
    caseId: 'CLR-2026-0172',
    appointmentId: 'a13',
    title: 'Low mood with partial response',
    blurb: 'Partial response to first-line SSRI with daytime fatigue.',
    icon: 'heart',
    urgency: 'routine',
    status: 'reviewed',
    lastActivity: fmtDayTime(-4, 9 * 60 + 10),
    shared: {
      ageLabel: '40 years',
      gender: 'Male',
      provisionalDiagnosis: 'Depressive episode, moderate',
      history: 'Low mood and fatigue for six weeks, partial response at four weeks of sertraline 50 mg.',
      currentPlan: 'Sertraline 50 mg once daily',
      question: 'Is it reasonable to increase to 100 mg now, or wait two more weeks?',
      guidanceArea: 'Medication adjustment',
      files: [],
    },
    expertId: 'ex2',
    messages: [
      { id: 'm1', author: 'me', body: 'Is it reasonable to increase to 100 mg now, or wait two more weeks?', at: fmtDayTime(-6, 11 * 60) },
      { id: 'm2', author: 'ex2', kind: 'considerations', body: 'A cautious increase is reasonable given partial response and good tolerability. Review sleep and energy within two weeks.', at: fmtDayTime(-5, 15 * 60 + 30) },
    ],
    guidance: {
      kind: 'considerations',
      body: 'A cautious increase is reasonable given partial response and good tolerability. Review sleep and energy within two weeks.',
      at: fmtDayTime(-5, 15 * 60 + 30),
      attachments: 0,
    },
    outcome: { value: 'Guidance adopted', note: 'Increased to 100 mg with review in two weeks.', at: fmtDayTime(-4, 9 * 60 + 10) },
  },
];

/** High / Medium / Low, as the list renders urgency. */
export const URGENCY_SHORT: Record<Urgency, string> = {
  urgent: 'High',
  priority: 'Medium',
  routine: 'Low',
};
