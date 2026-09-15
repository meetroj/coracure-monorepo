/**
 * Module 9 — clinical records, prescriptions and the completion gate.
 *
 * The rule that shapes every screen here: prescribing permission belongs to
 * the professional, not the screen. A psychiatrist writes medicines; a
 * psychologist, therapist or counsellor completes an advice or therapy plan
 * and can never save a medicine entry. Surfaces ask `canPrescribe` rather than
 * matching on a specialty string.
 *
 * Traceability: DOC-CLN-01 … DOC-CLN-06.
 */

/* ----------------------------- professional ------------------------------- */

export type ProfessionalType = 'psychiatrist' | 'psychologist' | 'therapist' | 'counsellor';

/** Extend deliberately — adding a type here grants medicine entry. */
const PRESCRIBERS: ProfessionalType[] = ['psychiatrist'];

export const canPrescribe = (t: ProfessionalType) => PRESCRIBERS.includes(t);

export const PROFESSIONAL_LABEL: Record<ProfessionalType, string> = {
  psychiatrist: 'Psychiatrist',
  psychologist: 'Psychologist',
  therapist: 'Therapist',
  counsellor: 'Counsellor',
};

/** The document a professional produces at the end of a consultation. */
export const outputLabel = (t: ProfessionalType) =>
  canPrescribe(t) ? 'Prescription' : 'Advice & Therapy Plan';

/* -------------------------------- risk ------------------------------------ */

export type RiskCategory = 'low' | 'moderate' | 'high';
export const RISK_CATEGORIES: RiskCategory[] = ['low', 'moderate', 'high'];
export const RISK_LABEL: Record<RiskCategory, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
};

/* --------------------------- clinical notes (01) -------------------------- */

export type NoteField = {
  key: string;
  label: string;
  required: boolean;
  placeholder: string;
  value: string;
  max: number;
};

export const noteFields: NoteField[] = [
  {
    key: 'complaint',
    label: 'Chief Complaint',
    required: true,
    max: 300,
    placeholder: 'What the patient came with, in clinical terms.',
    value: 'Anxiety, persistent restlessness and difficulty sleeping.',
  },
  {
    key: 'history',
    label: 'Brief Clinical History',
    required: true,
    max: 500,
    placeholder: 'Onset, duration and course so far.',
    value:
      'Symptoms have continued for approximately two weeks and are affecting concentration and daily work.',
  },
  {
    key: 'observations',
    label: 'Observations',
    required: true,
    max: 500,
    placeholder: 'Mental state and presentation during the consultation.',
    value:
      'Patient is alert, oriented and cooperative. Speech is clear. Reports racing thoughts at night.',
  },
  {
    key: 'diagnosis',
    label: 'Diagnosis or Provisional Diagnosis',
    required: true,
    max: 300,
    placeholder: 'State clearly whether provisional or confirmed.',
    value: 'Provisional diagnosis: Generalised Anxiety Disorder',
  },
  {
    key: 'advice',
    label: 'Advice or Treatment Plan',
    required: true,
    max: 500,
    placeholder: 'What you advised, and why.',
    value: 'Sleep routine guidance, breathing practice and scheduled clinical review.',
  },
  {
    key: 'followUp',
    label: 'Follow-up Plan',
    required: true,
    max: 300,
    placeholder: 'When to review, and what would bring it forward.',
    value: 'Review after seven days or earlier if symptoms worsen.',
  },
];

export type RiskAssessment = {
  category: RiskCategory;
  selfHarmThoughts: string;
  referralAdvised: boolean;
};

export const defaultRisk: RiskAssessment = {
  category: 'moderate',
  selfHarmThoughts: 'Not reported',
  referralAdvised: false,
};

/* ---------------------------- prescription (02) --------------------------- */

export type Medicine = {
  id: string;
  name: string;
  generic: string;
  dose: string;
  frequency: string;
  duration: string;
  instruction: string;
};

export const draftMedicines: Medicine[] = [
  {
    id: 'm1',
    name: 'Escitalopram 5 mg',
    generic: 'Escitalopram oxalate',
    dose: '5 mg',
    frequency: 'Once daily',
    duration: '7 days',
    instruction: 'After dinner',
  },
  {
    id: 'm2',
    name: 'Clonazepam 0.25 mg',
    generic: 'Clonazepam',
    dose: '0.25 mg',
    frequency: 'At bedtime',
    duration: '5 days',
    instruction: 'Use only as directed',
  },
];

export const adviceItems = [
  'Keep a consistent sleep and wake time, including on days off.',
  'Practise paced breathing for ten minutes before bed.',
  'Reduce caffeine after midday and avoid alcohol as a sleep aid.',
];

/** Escalation guidance printed on the patient document. */
export const warningSigns = [
  'Any thought of self-harm, or of not wanting to be here.',
  'Severe worsening of anxiety, or panic that does not settle.',
  'Confusion, disorientation or unusual agitation.',
  'Feeling unsafe or unable to cope alone.',
  'Rash, swelling, severe drowsiness or any serious reaction to a medicine.',
];

export const reportsRequested = ['Thyroid profile (T3, T4, TSH)', 'Sleep diary for seven nights'];

/* ------------------------------ templates (03) ---------------------------- */

export type TemplateKind = 'medication' | 'advice' | 'therapy' | 'followUp';

export const TEMPLATE_FILTERS: { key: 'all' | TemplateKind | 'mine'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'medication', label: 'Medication' },
  { key: 'advice', label: 'Advice Plans' },
  { key: 'therapy', label: 'Therapy Plans' },
  { key: 'followUp', label: 'Follow-up' },
  { key: 'mine', label: 'My Templates' },
];

export type ClinicalTemplate = {
  id: string;
  name: string;
  kind: TemplateKind;
  professionalType: ProfessionalType;
  specialty: string;
  description: string;
  medicines: number;
  adviceItems: number;
  /** Some plans are described by their guidance rather than their advice. */
  adviceLabel?: string;
  warningSigns: number;
  notes: number;
  mine: boolean;
};

export const clinicalTemplates: ClinicalTemplate[] = [
  {
    id: 'tpl1',
    name: 'Anxiety Initial Care',
    kind: 'medication',
    professionalType: 'psychiatrist',
    specialty: 'Psychiatry',
    description: 'First-contact plan for generalised anxiety with sleep disturbance.',
    medicines: 2,
    adviceItems: 3,
    warningSigns: 0,
    notes: 1,
    mine: true,
  },
  {
    id: 'tpl2',
    name: 'Sleep Support Plan',
    kind: 'medication',
    professionalType: 'psychiatrist',
    specialty: 'Psychiatry',
    description: 'Short-course support alongside sleep-hygiene guidance.',
    medicines: 1,
    adviceItems: 4,
    adviceLabel: 'guidance items',
    warningSigns: 0,
    notes: 1,
    mine: true,
  },
  {
    id: 'tpl3',
    name: 'Therapy Session Follow-up',
    kind: 'therapy',
    professionalType: 'psychologist',
    specialty: 'Psychology',
    description: 'Advice and therapy plan for a between-session review.',
    medicines: 0,
    adviceItems: 5,
    warningSigns: 0,
    notes: 2,
    mine: false,
  },
  {
    id: 'tpl4',
    name: 'Substance Use Follow-up',
    kind: 'medication',
    professionalType: 'psychiatrist',
    specialty: 'De-addiction',
    description: 'Maintenance review with relapse-risk guidance.',
    medicines: 2,
    adviceItems: 0,
    warningSigns: 2,
    notes: 1,
    mine: false,
  },
  {
    id: 'tpl5',
    name: 'Low Mood Check-in',
    kind: 'advice',
    professionalType: 'counsellor',
    specialty: 'Counselling',
    description: 'Structured check-in for persistent low mood. No medication.',
    medicines: 0,
    adviceItems: 4,
    warningSigns: 0,
    notes: 1,
    mine: false,
  },
];

/**
 * DOC-CLN-03: a template must be compatible with the doctor's prescribing
 * permission. A medication template is not shown at all to a non-prescriber —
 * offering it disabled would imply it could be unlocked.
 */
export const templatesFor = (t: ProfessionalType) =>
  clinicalTemplates.filter((tpl) => (tpl.medicines > 0 ? canPrescribe(t) : true));

/* --------------------------- completion gate (06) ------------------------- */

export type CompletionState = {
  notesFinalised: boolean;
  outputFinalised: boolean;
  followUpAssigned: boolean;
  summarySubmitted: boolean;
};

export const CASE_SUMMARY_MIN = 60;
export const CASE_SUMMARY_MAX = 500;

/**
 * DOC-CLN-06: returns what is still missing, so the UI can list it without
 * discarding entered work. An empty array means the consultation may close.
 */
export const missingForCompletion = (
  c: CompletionState,
  t: ProfessionalType
): string[] => {
  const missing: string[] = [];
  if (!c.notesFinalised) missing.push('Clinical notes');
  if (!c.outputFinalised) missing.push(canPrescribe(t) ? 'Prescription or advice' : 'Advice or therapy plan');
  if (!c.followUpAssigned) missing.push('Follow-up plan');
  if (!c.summarySubmitted) missing.push('Case summary');
  return missing;
};

export const isClinicallyComplete = (c: CompletionState, t: ProfessionalType) =>
  missingForCompletion(c, t).length === 0;

/**
 * An instant-consult doctor stays in Completing Notes until the gate clears —
 * this is what blocks new instant requests.
 */
export const blocksInstantRequests = (c: CompletionState, t: ProfessionalType) =>
  !isClinicallyComplete(c, t);

/** Singular/plural count chips for a template card. */
export const templateCounts = (t: ClinicalTemplate): string[] => {
  const out: string[] = [];
  out.push(t.medicines === 0 ? 'No medicines' : `${t.medicines} medicine${t.medicines > 1 ? 's' : ''}`);
  if (t.adviceItems > 0) out.push(`${t.adviceItems} ${t.adviceLabel ?? 'advice items'}`);
  if (t.warningSigns > 0) out.push(`${t.warningSigns} warning signs`);
  if (t.notes > 0) out.push(`${t.notes} note${t.notes > 1 ? 's' : ''}`);
  return out;
};
