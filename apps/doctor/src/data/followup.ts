/**
 * Follow-up domain: pathway plans, check-in alerts, Care Hub resources and the
 * per-alert detail.
 *
 * Psychiatry-scoped. Nothing here is a diagnosis, a risk score or a prediction
 * — alert copy is the patient's own reported wording, and trend is a direction
 * between two observed states, never a computed clinical grade.
 */
import { DEMO_NOW_MINUTES, dayOffset, fmtAgo, fmtDate, fmtDayMonth, fmtDayTime, toISODate } from './calendar';

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

export const pathwayByKey = (k: string) => pathways.find((p) => p.key === k);

export const DURATIONS = [3, 7, 14] as const;
export type Duration = (typeof DURATIONS)[number];

/** Review date always sits `duration` days after the start (inclusive). */
export const reviewDateFor = (startISO: string, duration: number) => {
  const [y, m, d] = startISO.split('-').map(Number);
  return fmtDate(new Date(y, m - 1, d + duration - 1));
};

export const planStartDefault = () => toISODate(dayOffset(1));

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

export type DayState = 'stable' | 'attention' | 'redFlag' | 'pending';

export const DAY_STATE: Record<
  DayState,
  { label: string; tone: 'success' | 'warn' | 'danger' | 'neutral'; face: 'faceSmile' | 'faceNeutral' | 'faceFrown' }
> = {
  stable: { label: 'Good', tone: 'success', face: 'faceSmile' },
  attention: { label: 'Needs Attention', tone: 'warn', face: 'faceNeutral' },
  redFlag: { label: 'High Risk', tone: 'danger', face: 'faceFrown' },
  pending: { label: 'No response', tone: 'neutral', face: 'faceNeutral' },
};

/** `label` is the day within the assigned plan; `date` is the calendar day. */
export type CheckInDay = { day: number; label: string; date: string; state: DayState };

export type TriggerResponse = {
  id: string;
  /** A recognisable glyph so the row reads before the sentence does. */
  icon: 'brain' | 'shield' | 'trendUp' | 'moon' | 'prescription';
  question: string;
  answer: string;
  /** The answer that raised the alert, rendered in the severity colour. */
  flagged: boolean;
};

export type PatientAlert = {
  id: string;
  patientId: string;
  /** The consultation whose follow-up plan produced this alert. */
  appointmentId: string;
  category: AlertCategory;
  /** Why the alert fired. A reason, never a diagnosis. */
  trigger: string;
  /**
   * The patient's own words from the check-in that raised this. Absent when
   * there was no submission to quote — a missed check-in has nothing to say.
   */
  checkIn?: string;
  /** Minutes before the demo clock that the alert arrived. */
  receivedMinutesAgo: number;
  /** Initial workflow state; the store holds the live one. */
  status: AlertStatus;
  pathway: PathwayKey;
  dayOf: number;
  dayTotal: number;
  history: CheckInDay[];
  responses: TriggerResponse[];
};

/** Red first, then amber/side-effect, then routine — severity drives order. */
const CATEGORY_RANK: Record<AlertCategory, number> = {
  redFlag: 0,
  amber: 1,
  sideEffect: 2,
  missed: 3,
  due: 4,
};

/** The last `count` days of a plan up to today, oldest first. */
const historyFor = (dayOf: number, states: DayState[]): CheckInDay[] =>
  states.map((state, i) => {
    const day = dayOf - (states.length - 1 - i);
    const date = dayOffset(day - dayOf);
    return { day, label: `D-${day}`, date: fmtDayMonth(date), state };
  });

export const patientAlerts: PatientAlert[] = [
  {
    id: 'al1',
    patientId: 'PT-10482',
    appointmentId: 'a11',
    category: 'redFlag',
    trigger: 'Reported thoughts of self-harm',
    checkIn: 'I have been having thoughts of hurting myself since last night.',
    receivedMinutesAgo: 10,
    status: 'open',
    pathway: 'depressionAnxiety',
    dayOf: 12,
    dayTotal: 14,
    history: historyFor(12, ['stable', 'stable', 'attention', 'stable', 'stable', 'attention', 'redFlag']),
    responses: [
      { id: 'q1', icon: 'brain', question: 'Have you had thoughts of harming yourself?', answer: 'Yes', flagged: true },
      { id: 'q2', icon: 'shield', question: 'Do you feel safe right now?', answer: 'No', flagged: true },
      { id: 'q3', icon: 'trendUp', question: 'Have your symptoms significantly worsened?', answer: 'Yes', flagged: true },
    ],
  },
  {
    id: 'al5',
    patientId: 'PT-10463',
    appointmentId: 'a15',
    category: 'redFlag',
    trigger: 'Severe worsening reported',
    checkIn: 'My symptoms have become much worse since yesterday.',
    receivedMinutesAgo: 28,
    status: 'open',
    pathway: 'depressionAnxiety',
    dayOf: 10,
    dayTotal: 14,
    history: historyFor(10, ['stable', 'attention', 'attention', 'stable', 'attention', 'attention', 'redFlag']),
    responses: [
      { id: 'q1', icon: 'trendUp', question: 'Have your symptoms significantly worsened?', answer: 'Yes', flagged: true },
      { id: 'q2', icon: 'shield', question: 'Do you feel safe right now?', answer: 'Yes', flagged: false },
      { id: 'q3', icon: 'brain', question: 'Have you had thoughts of harming yourself?', answer: 'No', flagged: false },
    ],
  },
  {
    id: 'al2',
    patientId: 'PT-10461',
    appointmentId: 'a12',
    category: 'amber',
    trigger: 'Anxiety and restlessness have worsened',
    checkIn: 'My anxiety is much worse and I cannot sit still at all.',
    receivedMinutesAgo: 45,
    status: 'open',
    pathway: 'depressionAnxiety',
    dayOf: 6,
    dayTotal: 14,
    history: historyFor(6, ['stable', 'stable', 'attention', 'stable', 'attention', 'attention']),
    responses: [
      { id: 'q1', icon: 'trendUp', question: 'Has your anxiety increased since yesterday?', answer: 'Yes', flagged: true },
      { id: 'q2', icon: 'moon', question: 'Did you sleep less than five hours?', answer: 'Yes', flagged: true },
      { id: 'q3', icon: 'shield', question: 'Do you feel safe right now?', answer: 'Yes', flagged: false },
    ],
  },
  {
    id: 'al6',
    patientId: 'PT-10464',
    appointmentId: 'a16',
    category: 'amber',
    trigger: 'Low mood continuing',
    checkIn: 'Still low most days, but no worse than last week.',
    receivedMinutesAgo: 95,
    status: 'open',
    pathway: 'depressionAnxiety',
    dayOf: 9,
    dayTotal: 14,
    history: historyFor(9, ['attention', 'attention', 'stable', 'attention', 'attention', 'stable', 'attention']),
    responses: [
      { id: 'q1', icon: 'brain', question: 'Has your mood been low on most of the day?', answer: 'Yes', flagged: true },
      { id: 'q2', icon: 'trendUp', question: 'Is it worse than last week?', answer: 'No', flagged: false },
      { id: 'q3', icon: 'shield', question: 'Do you feel safe right now?', answer: 'Yes', flagged: false },
    ],
  },
  {
    id: 'al3',
    patientId: 'PT-10460',
    appointmentId: 'a13',
    category: 'sideEffect',
    trigger: 'Severe drowsiness reported after medication',
    checkIn: 'I feel very drowsy through the whole day after the new dose.',
    receivedMinutesAgo: 140,
    status: 'acknowledged',
    pathway: 'depressionAnxiety',
    dayOf: 9,
    dayTotal: 14,
    history: historyFor(9, ['stable', 'stable', 'stable', 'attention', 'stable', 'attention', 'attention']),
    responses: [
      { id: 'q1', icon: 'prescription', question: 'Any side effects from your medication?', answer: 'Drowsiness', flagged: true },
      { id: 'q2', icon: 'prescription', question: 'Have you missed any doses?', answer: 'No', flagged: false },
      { id: 'q3', icon: 'shield', question: 'Do you feel safe right now?', answer: 'Yes', flagged: false },
    ],
  },
  {
    id: 'al4',
    patientId: 'PT-10548',
    appointmentId: 'a14',
    category: 'missed',
    trigger: 'Two consecutive daily check-ins missed',
    receivedMinutesAgo: 180,
    status: 'open',
    pathway: 'depressionAnxiety',
    dayOf: 8,
    dayTotal: 14,
    history: historyFor(8, ['stable', 'attention', 'stable', 'stable', 'attention', 'pending', 'pending']),
    responses: [],
  },
  {
    id: 'al7',
    patientId: 'PT-10467',
    appointmentId: 'a19',
    category: 'due',
    trigger: 'Planned follow-up review is due today',
    checkIn: 'I have uploaded the sleep diary you asked for.',
    receivedMinutesAgo: 240,
    status: 'open',
    pathway: 'sleep',
    dayOf: 7,
    dayTotal: 7,
    history: historyFor(7, ['attention', 'attention', 'stable', 'stable', 'stable', 'stable', 'stable']),
    responses: [
      { id: 'q1', icon: 'moon', question: 'How many hours did you sleep last night?', answer: '6 hours', flagged: false },
      { id: 'q2', icon: 'trendUp', question: 'Is your sleep better than last week?', answer: 'Yes', flagged: false },
    ],
  },
];

export const alertById = (id: string | undefined) => patientAlerts.find((a) => a.id === id);

export const sortedAlerts = <T extends Pick<PatientAlert, 'category'>>(list: T[]) =>
  [...list].sort((a, b) => CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category]);

export const alertReceivedLabel = (a: PatientAlert) => fmtAgo(a.receivedMinutesAgo);

/** When the patient's last check-in landed, as the detail header reads it. */
export const alertCheckInLabel = (a: PatientAlert) => {
  const at = DEMO_NOW_MINUTES - a.receivedMinutesAgo;
  return at >= 0 ? fmtDayTime(0, at) : fmtDayTime(-1, at + 24 * 60);
};

/** The chip row across the top of the alerts list; counts come from the list. */
export const ALERT_CHIPS: { key: AlertCategory; label: string }[] = [
  { key: 'redFlag', label: 'Red Flags' },
  { key: 'amber', label: 'Amber Alerts' },
  { key: 'sideEffect', label: 'Side Effects' },
  { key: 'missed', label: 'Missed Check-ins' },
  { key: 'due', label: 'Follow-up Due' },
];

/* ---------------------------- follow-up actions --------------------------- */

/**
 * What the doctor records against an alert. The options depend on severity:
 * a red flag is never closed by booking a routine follow-up alone.
 */
export type AlertAction = 'calledPatient' | 'urgentReview' | 'crisisSupport' | 'followUpBooking' | 'messaged' | 'noAction';

export const ALERT_ACTIONS: Record<AlertAction, { label: string; icon: 'phone' | 'calendar' | 'siren' | 'message' | 'check' | 'shieldCheck' }> = {
  calledPatient: { label: 'Called the patient', icon: 'phone' },
  urgentReview: { label: 'Arranged urgent review', icon: 'siren' },
  crisisSupport: { label: 'Shared crisis support', icon: 'shieldCheck' },
  followUpBooking: { label: 'Advised follow-up booking', icon: 'calendar' },
  messaged: { label: 'Messaged the patient', icon: 'message' },
  noAction: { label: 'Reviewed, no change needed', icon: 'check' },
};

export const actionsFor = (category: AlertCategory): AlertAction[] =>
  category === 'redFlag'
    ? ['calledPatient', 'urgentReview', 'crisisSupport']
    : category === 'missed'
      ? ['messaged', 'calledPatient', 'followUpBooking']
      : ['followUpBooking', 'messaged', 'noAction'];

export const NOTE_LIMIT = 1000;

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
export const recommendableResources = careResources.filter((r) => r.published && r.reviewed);

export const NOTE_MAX = 1000;
