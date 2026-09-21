/**
 * Follow-up domain: pathway plans, check-in alerts, Care Hub resources and the
 * per-patient follow-up detail.
 *
 * Psychiatry-scoped. Nothing here is a diagnosis, a risk score or a prediction
 * — alert copy is the patient's own reported wording, and trend is a direction
 * between two observed states, never a computed clinical grade.
 */

/* ------------------------------- pathways --------------------------------- */

export type PathwayKey = 'depressionAnxiety' | 'sleep' | 'substanceUse' | 'bipolarPsychosis' | 'general';

export type Pathway = {
  key: PathwayKey;
  label: string;
  icon: 'brain' | 'moon' | 'leaf' | 'sparkle' | 'inPerson';
  /** Count only — the questions themselves are governed centrally. */
  dailyQuestions: number;
};

export const pathways: Pathway[] = [
  { key: 'depressionAnxiety', label: 'Depression & Anxiety', icon: 'brain', dailyQuestions: 7 },
  { key: 'sleep', label: 'Sleep', icon: 'moon', dailyQuestions: 5 },
  { key: 'substanceUse', label: 'Substance Use', icon: 'leaf', dailyQuestions: 6 },
  { key: 'bipolarPsychosis', label: 'Bipolar & Psychosis', icon: 'sparkle', dailyQuestions: 8 },
  { key: 'general', label: 'General', icon: 'inPerson', dailyQuestions: 4 },
];

export const DURATIONS = [3, 7, 14] as const;
export type Duration = (typeof DURATIONS)[number];

/** Review date always sits `duration` days after the start. */
export const reviewDateFor = (startLabel: string, duration: Duration) => {
  const [d, mon, y] = startLabel.split(' ');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = months.indexOf(mon);
  if (idx < 0) return startLabel;
  const dt = new Date(Number(y), idx, Number(d) + duration - 1);
  return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
};

export const shortDate = (label: string) => label.split(' ').slice(0, 2).join(' ');

export const planPatient = {
  initials: 'RS',
  name: 'Rahul Sharma',
  gender: 'Male' as const,
  age: 32,
  consultationId: 'CON-10482',
  patientId: 'PT-10482',
};

export const DEFAULT_START = '16 May 2024';

/* --------------------------------- alerts --------------------------------- */

export type AlertCategory = 'redFlag' | 'amber' | 'sideEffect' | 'missed' | 'due';
export type AlertStatus = 'open' | 'acknowledged' | 'escalated' | 'reviewed';

export const ALERT_CATEGORY: Record<AlertCategory, { label: string; tone: 'danger' | 'warn' | 'neutral' }> = {
  redFlag: { label: 'Red Flag', tone: 'danger' },
  amber: { label: 'Amber Alert', tone: 'warn' },
  sideEffect: { label: 'Medication Side Effect', tone: 'warn' },
  missed: { label: 'Missed Check-in', tone: 'neutral' },
  due: { label: 'Follow-up Due', tone: 'neutral' },
};

export const ALERT_STATUS: Record<AlertStatus, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  escalated: 'Escalated',
  reviewed: 'Reviewed',
};

export type PatientAlert = {
  id: string;
  initials: string;
  name: string;
  gender: 'Male' | 'Female';
  age: number;
  patientId: string;
  category: AlertCategory;
  /** Why the alert fired. A reason, never a diagnosis. */
  trigger: string;
  /**
   * The patient's own words from the check-in that raised this. Absent when
   * there was no submission to quote — a missed check-in has nothing to say.
   */
  checkIn?: string;
  receivedAgo: string;
  status: AlertStatus;
};

/** Red first, then amber/side-effect, then routine — severity drives order. */
const CATEGORY_RANK: Record<AlertCategory, number> = {
  redFlag: 0,
  amber: 1,
  sideEffect: 2,
  missed: 3,
  due: 4,
};

export const patientAlerts: PatientAlert[] = [
  {
    id: 'al1',
    initials: 'RS',
    name: 'Rahul Sharma',
    gender: 'Male',
    age: 32,
    patientId: 'PT-10482',
    category: 'redFlag',
    trigger: 'Reported thoughts of self-harm',
    checkIn: 'I have been having thoughts of hurting myself since last night.',
    receivedAgo: '10 minutes ago',
    status: 'open',
  },
  {
    id: 'al2',
    initials: 'NP',
    name: 'Neha Pillai',
    gender: 'Female',
    age: 28,
    patientId: 'PT-10517',
    category: 'amber',
    trigger: 'Anxiety and restlessness have worsened',
    checkIn: 'My anxiety is much worse and I cannot sit still at all.',
    receivedAgo: '25 minutes ago',
    status: 'open',
  },
  {
    id: 'al3',
    initials: 'SK',
    name: 'Sandeep Kumar',
    gender: 'Male',
    age: 40,
    patientId: 'PT-10533',
    category: 'sideEffect',
    trigger: 'Severe drowsiness reported after medication',
    checkIn: 'I feel very drowsy through the whole day after the new dose.',
    receivedAgo: '40 minutes ago',
    status: 'acknowledged',
  },
  {
    id: 'al4',
    initials: 'PS',
    name: 'Priya Singh',
    gender: 'Female',
    age: 35,
    patientId: 'PT-10548',
    category: 'missed',
    trigger: 'Two consecutive daily check-ins missed',
    receivedAgo: '1 hour ago',
    status: 'open',
  },
];

export const sortedAlerts = (list: PatientAlert[]) =>
  [...list].sort((a, b) => CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category]);

/** Chip counts are authored per the brief and shown as workload, not derived. */
export const ALERT_CHIPS: { key: AlertCategory; label: string; count: number }[] = [
  { key: 'redFlag', label: 'Red Flags', count: 4 },
  { key: 'amber', label: 'Amber Alerts', count: 6 },
  { key: 'missed', label: 'Missed Check-ins', count: 5 },
  { key: 'sideEffect', label: 'Side Effects', count: 3 },
  { key: 'due', label: 'Follow-up Due', count: 7 },
];

export const SORT_OPTIONS = ['Newest', 'Alert type'] as const;
export const STATUS_FILTERS: (AlertStatus | 'all')[] = ['all', 'open', 'acknowledged', 'escalated', 'reviewed'];

/* -------------------------------- care hub -------------------------------- */

export type ResourceKind = 'tool' | 'education' | 'article' | 'caregiver';

export type CareResource = {
  id: string;
  title: string;
  blurb: string;
  icon: 'wind' | 'anchor' | 'moon' | 'brain' | 'prescription' | 'inPerson' | 'heart' | 'leaf' | 'sparkle';
  kind: ResourceKind;
  meta: string;
  /**
   * Live on the platform. Draft or withdrawn material is never offered — a
   * doctor cannot recommend something the patient would not be able to open.
   */
  published: boolean;
  /** Only clinically reviewed content may be selected. */
  reviewed: boolean;
  /** Conditions this resource is indicated for; drives the condition filter. */
  conditions: string[];
  /** Some material may only be shared with explicit patient consent. */
  requiresConsent?: boolean;
};

/** The condition filter row. `All` is the default and filters nothing. */
export const CARE_CONDITIONS = ['All Conditions', 'Anxiety', 'Depression', 'Sleep', 'Substance Use'] as const;

export const careResources: CareResource[] = [
  { id: 'r1', title: 'Guided Breathing', blurb: 'Calm your mind with simple breathing exercises.', icon: 'wind', kind: 'tool', meta: '5-minute exercise', published: true, reviewed: true, conditions: ['Anxiety'] },
  { id: 'r3', title: 'Sleep Hygiene', blurb: 'Build healthy sleep habits for better rest and recovery.', icon: 'moon', kind: 'tool', meta: 'Routine guide', published: true, reviewed: true, conditions: ['Sleep', 'Anxiety'] },
  { id: 'r7', title: 'Managing Anxiety', blurb: 'Evidence-based techniques to manage stress and worry.', icon: 'brain', kind: 'tool', meta: 'Technique guide', published: true, reviewed: true, conditions: ['Anxiety'] },
  { id: 'r6', title: 'Family Support', blurb: 'Strengthen support systems and improve communication.', icon: 'inPerson', kind: 'tool', meta: 'Guide', published: true, reviewed: true, conditions: ['Depression', 'Anxiety'], requiresConsent: true },
  { id: 'r2', title: 'Grounding Technique', blurb: 'Step-by-step distress management you can use anywhere.', icon: 'anchor', kind: 'tool', meta: 'Exercise', published: true, reviewed: true, conditions: ['Anxiety', 'Substance Use'] },
  { id: 'r5', title: 'Medication Adherence', blurb: 'Practical routines for taking medication on time.', icon: 'prescription', kind: 'tool', meta: 'Routine guide', published: true, reviewed: true, conditions: ['Depression', 'Anxiety'] },
  { id: 'r10', title: 'Mood Tracking', blurb: 'Notice patterns in mood from day to day.', icon: 'sparkle', kind: 'tool', meta: 'Daily log', published: true, reviewed: true, conditions: ['Depression'] },

  { id: 'm1', title: 'Understanding Anxiety', blurb: 'What anxiety is, why it happens and what helps.', icon: 'brain', kind: 'education', meta: '8-minute read', published: true, reviewed: true, conditions: ['Anxiety'] },
  { id: 'm2', title: 'Understanding Depression', blurb: 'Recognising low mood and what recovery looks like.', icon: 'heart', kind: 'education', meta: '7-minute read', published: true, reviewed: true, conditions: ['Depression'] },
  { id: 'm3', title: 'Sleep and Recovery', blurb: 'How rest affects mood, focus and healing.', icon: 'moon', kind: 'education', meta: '5-minute read', published: true, reviewed: true, conditions: ['Sleep'] },
  // Written but not yet cleared for release — never offered for recommendation.
  { id: 'm4', title: 'Substance Use: First Steps', blurb: 'Early support for cutting down safely.', icon: 'leaf', kind: 'education', meta: '6-minute read', published: false, reviewed: false, conditions: ['Substance Use'] },
];

/** Recommendable content only: published AND clinically reviewed. */
export const recommendableResources = careResources.filter((r) => r.published);

export const CARE_FILTERS = [
  'Recommended',
  'Anxiety',
  'Depression',
  'Sleep',
  'Substance Use',
  'Medication Support',
  'Caregiver Support',
];

export const CARE_TABS: { key: ResourceKind; label: string }[] = [
  { key: 'tool', label: 'Tools' },
  { key: 'education', label: 'Education' },
  { key: 'article', label: 'Articles' },
  { key: 'caregiver', label: 'Caregiver Guides' },
];

export const DEFAULT_SELECTED = ['r1', 'r2', 'r5'];
export const NOTE_MAX = 1000;
export const DEFAULT_NOTE =
  'Use these resources alongside your prescribed treatment and follow-up plan.';

/* ----------------------------- follow-up detail --------------------------- */

export type DayState = 'stable' | 'attention' | 'redFlag' | 'pending';

export const DAY_STATE: Record<
  DayState,
  { label: string; tone: 'success' | 'warn' | 'danger' | 'neutral'; face: 'faceSmile' | 'faceNeutral' | 'faceFrown' }
> = {
  stable: { label: 'Good', tone: 'success', face: 'faceSmile' },
  attention: { label: 'Needs Attention', tone: 'warn', face: 'faceNeutral' },
  redFlag: { label: 'High Risk', tone: 'danger', face: 'faceFrown' },
  pending: { label: 'Pending', tone: 'neutral', face: 'faceNeutral' },
};

/** `label` is the day within the assigned plan; `date` is the calendar day. */
export type CheckInDay = { day: number; label: string; date: string; state: DayState };

/** The last seven days of a fourteen-day plan, oldest first. */
export const checkInDays: CheckInDay[] = [
  { day: 6, label: 'D-6', date: 'May 9', state: 'stable' },
  { day: 7, label: 'D-7', date: 'May 10', state: 'stable' },
  { day: 8, label: 'D-8', date: 'May 11', state: 'attention' },
  { day: 9, label: 'D-9', date: 'May 12', state: 'stable' },
  { day: 10, label: 'D-10', date: 'May 13', state: 'stable' },
  { day: 11, label: 'D-11', date: 'May 14', state: 'attention' },
  { day: 12, label: 'D-12', date: 'May 15', state: 'redFlag' },
];

export type TriggerResponse = {
  id: string;
  /** A recognisable glyph so the row reads before the sentence does. */
  icon: 'brain' | 'shield' | 'trendUp';
  question: string;
  answer: string;
};

export const triggerResponses: TriggerResponse[] = [
  { id: 't1', icon: 'brain', question: 'Have you had thoughts of harming yourself?', answer: 'Yes' },
  { id: 't2', icon: 'shield', question: 'Do you feel safe right now?', answer: 'No' },
  { id: 't3', icon: 'trendUp', question: 'Have your symptoms significantly worsened?', answer: 'Yes' },
];

export type RecommendedAction = {
  key: string;
  /** Two authored lines so all three tiles wrap identically. */
  line1: string;
  line2: string;
  icon: 'calendar' | 'user' | 'siren';
  tone: 'brand' | 'warn' | 'danger';
};

export const recommendedActions: RecommendedAction[] = [
  { key: 'followUp', line1: 'Advise', line2: 'Follow-up Booking', icon: 'calendar', tone: 'brand' },
];

export const followUpDetail = {
  initials: 'RS',
  name: 'Rahul Sharma',
  gender: 'Male' as const,
  age: 32,
  patientId: 'PT-10482',
  pathway: 'Depression & Anxiety',
  dayOf: 12,
  dayTotal: 14,
  assignedTo: 'Dr. Arjun Mehta',
  lastCheckIn: 'Today, 08:30 AM',
  nextCheckIn: 'Tomorrow',
  status: 'Red Flag',
  previousState: 'attention' as DayState,
  currentState: 'redFlag' as DayState,
  trendLabel: 'Worsening',
};

export const NOTE_LIMIT = 1000;
