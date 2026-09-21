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

export type ClarificationDraft = {
  caseId: string;
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
  files: { id: string; name: string }[];
};

export const HISTORY_MAX = 1000;
export const QUESTION_MAX = 1000;
export const REPLY_MAX = 1000;
export const GUIDANCE_MAX = 1000;
export const DECISION_MAX = 1000;

export const initialDraft: ClarificationDraft = {
  caseId: 'CLR-2026-0184',
  patientName: 'Rahul Sharma',
  patientId: 'PT-10482',
  consultationId: 'CON-10482',
  title: 'Persistent anxiety with limited early response',
  ageLabel: '32 years',
  gender: 'Male',
  history:
    'Two-week history of anxiety, disturbed sleep, restlessness and reduced concentration.',
  provisionalDiagnosis: 'Generalised Anxiety Disorder, provisional',
  currentPlan: 'Escitalopram 5 mg and seven-day follow-up',
  question:
    'Would you recommend adjusting the current treatment plan given the limited early response and persistent sleep disturbance?',
  guidanceArea: 'Treatment plan review',
  urgency: 'routine',
  speciality: 'Psychiatry',
  files: [{ id: 'f1', name: 'Recent clinical note.pdf' }],
};

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

export type ResponseType = 'comment' | 'considerations' | 'clarification' | 'followUp';

export const RESPONSE_TYPES: { key: ResponseType; label: string }[] = [
  { key: 'comment', label: 'Comment' },
  { key: 'considerations', label: 'Suggest considerations' },
  { key: 'clarification', label: 'Ask clarification' },
  { key: 'followUp', label: 'Recommend follow-up' },
];

export const expertMessage = {
  initials: 'NK',
  name: 'Dr. Neha Kapoor',
  role: 'Psychiatry Expert',
  body: 'Please confirm how long the current medication has been used and whether adherence has been consistent.',
  at: 'Today, 2:15 PM',
};

export const expertGuidance = {
  author: 'Dr. Neha Kapoor',
  role: 'Psychiatry Expert',
  kind: 'Clinical considerations',
  body:
    'Confirm adherence and tolerability before changing treatment. If symptoms remain significant, arrange an earlier clinical review. Recommend urgent in-person support if an immediate safety concern is identified.',
  receivedAt: 'Received today, 4:10 PM',
  attachments: 1,
};

export const OUTCOMES = [
  'Guidance reviewed',
  'Guidance adopted',
  'Guidance not applicable',
  'Escalated for in-person review',
];

export const reviewStamp = { by: 'Dr. Arjun Mehta', at: 'Today, 4:22 PM' };

/**
 * Closing a thread is an audit event. It preserves the discussion and does not
 * write anything into the patient record.
 */
export const closeThread = (status: CaseStatus, confirmed: boolean): CaseStatus =>
  confirmed ? 'closed' : status;

/* --------------------------- the doctor's queue --------------------------- */

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

export type ClarificationSummary = {
  id: string;
  caseId: string;
  title: string;
  blurb: string;
  icon: 'brain' | 'moon' | 'inPerson' | 'heart';
  urgency: Urgency;
  status: ListStatus;
  lastActivity: string;
};

/** Filter row across the top of the list. `all` matches everything. */
export const CLARIFICATION_FILTERS: { key: ListStatus | 'all'; label: string; icon: 'checklist' | 'pencil' | 'sort' | 'clock' | 'message' }[] = [
  { key: 'all', label: 'All', icon: 'checklist' },
  { key: 'draft', label: 'Draft', icon: 'pencil' },
  { key: 'posted', label: 'Posted', icon: 'sort' },
  { key: 'expertReview', label: 'Awaiting Response', icon: 'clock' },
  { key: 'responseReceived', label: 'Response Received', icon: 'message' },
];

export const clarificationList: ClarificationSummary[] = [
  { id: 'cl1', caseId: 'D-21-4587', title: 'Mood instability after medication change', blurb: 'Seeking input on managing mood swings following recent SSRI adjustment in patient.', icon: 'brain', urgency: 'urgent', status: 'expertReview', lastActivity: 'Today, 10:24 AM' },
  { id: 'cl2', caseId: 'D-21-4578', title: 'Insomnia with panic symptoms', blurb: 'Persistent insomnia with nocturnal panic attacks despite therapy.', icon: 'moon', urgency: 'priority', status: 'responseReceived', lastActivity: 'Yesterday, 7:48 PM' },
  { id: 'cl3', caseId: 'D-21-4561', title: 'Adolescent anxiety case', blurb: 'Seeking recommendations for CBT approach in 16-year-old with school avoidance.', icon: 'inPerson', urgency: 'urgent', status: 'clarificationNeeded', lastActivity: '2 days ago, 4:15 PM' },
  { id: 'cl4', caseId: 'D-21-4543', title: 'Bipolar review query', blurb: 'Requesting review of lithium dosage considering recent renal function decline.', icon: 'heart', urgency: 'routine', status: 'reviewed', lastActivity: '4 days ago, 9:10 AM' },
];

/** High / Medium / Low, as the list renders urgency. */
export const URGENCY_SHORT: Record<Urgency, string> = {
  urgent: 'High',
  priority: 'Medium',
  routine: 'Low',
};
