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

export type SelfHarm = 'notAsked' | 'denied' | 'reported';
export const SELF_HARM_OPTIONS: { key: SelfHarm; label: string }[] = [
  { key: 'notAsked', label: 'Not assessed' },
  { key: 'denied', label: 'Denied on enquiry' },
  { key: 'reported', label: 'Reported' },
];

export type RiskAssessment = {
  category: RiskCategory | null;
  selfHarm: SelfHarm;
  referralAdvised: boolean;
};

export const emptyRisk: RiskAssessment = { category: null, selfHarm: 'notAsked', referralAdvised: false };

/* --------------------------- clinical notes (01) -------------------------- */

export type NoteKey = 'complaint' | 'history' | 'observations' | 'diagnosis' | 'advice' | 'followUp';

export type NoteField = {
  key: NoteKey;
  label: string;
  required: boolean;
  placeholder: string;
  max: number;
};

export const NOTE_MAX = 1000;

export const NOTE_FIELDS: NoteField[] = [
  { key: 'complaint', label: 'Chief Complaint', required: true, max: NOTE_MAX, placeholder: 'What the patient came with, in clinical terms.' },
  { key: 'history', label: 'Brief Clinical History', required: true, max: NOTE_MAX, placeholder: 'Onset, duration and course so far.' },
  { key: 'observations', label: 'Observations', required: true, max: NOTE_MAX, placeholder: 'Mental state and presentation during the consultation.' },
  { key: 'diagnosis', label: 'Diagnosis', required: true, max: NOTE_MAX, placeholder: 'State clearly whether provisional or confirmed.' },
  { key: 'advice', label: 'Advice or Treatment Plan', required: true, max: NOTE_MAX, placeholder: 'What you advised, and why.' },
  { key: 'followUp', label: 'Follow-up Plan', required: true, max: NOTE_MAX, placeholder: 'When to review, and what would bring it forward.' },
];

export const emptyNotes = (): Record<NoteKey, string> => ({
  complaint: '',
  history: '',
  observations: '',
  diagnosis: '',
  advice: '',
  followUp: '',
});

/** Required note fields still empty, in form order. */
export const missingNoteFields = (notes: Record<NoteKey, string>, risk: RiskAssessment) => {
  const missing = NOTE_FIELDS.filter((f) => f.required && !notes[f.key].trim()).map((f) => f.label);
  if (!risk.category) missing.push('Risk category');
  return missing;
};

/* ---------------------------- prescription (02) --------------------------- */

export type Medicine = {
  id: string;
  name: string;
  generic: string;
  dose: string;
  frequency: string;
  duration: string;
  /** How it is taken — with water, milk, food, etc. */
  route: string;
  quantity: string;
  instruction: string;
};

export const FREQUENCIES = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'At bedtime',
  'In the morning',
  'As needed',
] as const;

export const ROUTES = ['With water', 'After food', 'Before food', 'With milk'] as const;

/**
 * A short local formulary for the medicine search. Picking one fills the
 * name, generic and dose; everything else is still the doctor's decision.
 */
export const FORMULARY: { name: string; generic: string; dose: string }[] = [
  { name: 'Escitalopram 5 mg', generic: 'Escitalopram oxalate', dose: '5 mg' },
  { name: 'Escitalopram 10 mg', generic: 'Escitalopram oxalate', dose: '10 mg' },
  { name: 'Sertraline 25 mg', generic: 'Sertraline hydrochloride', dose: '25 mg' },
  { name: 'Sertraline 50 mg', generic: 'Sertraline hydrochloride', dose: '50 mg' },
  { name: 'Sertraline 100 mg', generic: 'Sertraline hydrochloride', dose: '100 mg' },
  { name: 'Fluoxetine 20 mg', generic: 'Fluoxetine hydrochloride', dose: '20 mg' },
  { name: 'Mirtazapine 7.5 mg', generic: 'Mirtazapine', dose: '7.5 mg' },
  { name: 'Mirtazapine 15 mg', generic: 'Mirtazapine', dose: '15 mg' },
  { name: 'Clonazepam 0.25 mg', generic: 'Clonazepam', dose: '0.25 mg' },
  { name: 'Clonazepam 0.5 mg', generic: 'Clonazepam', dose: '0.5 mg' },
  { name: 'Propranolol 10 mg', generic: 'Propranolol hydrochloride', dose: '10 mg' },
  { name: 'Quetiapine 25 mg', generic: 'Quetiapine fumarate', dose: '25 mg' },
  { name: 'Olanzapine 5 mg', generic: 'Olanzapine', dose: '5 mg' },
  { name: 'Lithium carbonate 300 mg', generic: 'Lithium carbonate', dose: '300 mg' },
  { name: 'Naltrexone 50 mg', generic: 'Naltrexone hydrochloride', dose: '50 mg' },
  { name: 'Thiamine 100 mg', generic: 'Thiamine', dose: '100 mg' },
];

export const emptyMedicine = (): Omit<Medicine, 'id'> => ({
  name: '',
  generic: '',
  dose: '',
  frequency: '',
  duration: '',
  route: 'After food',
  quantity: '',
  instruction: '',
});

/** Required fields still empty on a medicine entry. */
export const missingMedicineFields = (m: Omit<Medicine, 'id'>) => {
  const out: string[] = [];
  if (!m.name.trim()) out.push('name');
  if (!m.dose.trim()) out.push('dose');
  if (!m.frequency.trim()) out.push('frequency');
  if (!m.duration.trim()) out.push('duration');
  return out;
};

/** Advice printed on the patient document when nothing more specific is written. */
export const DEFAULT_ADVICE = [
  'Keep a consistent sleep and wake time, including on days off.',
  'Practise paced breathing for ten minutes before bed.',
  'Reduce caffeine after midday and avoid alcohol as a sleep aid.',
];

/** Escalation guidance printed on the patient document, framed as don'ts. */
export const DEFAULT_DONTS = [
  "Don't ignore thoughts of self-harm — contact your doctor or a helpline immediately.",
  "Don't wait out severe anxiety or panic that does not settle — seek urgent care.",
  "Don't stop or change the medicine dose without speaking to your doctor.",
  "Don't continue the medicine if you notice rash, swelling, severe drowsiness or any serious reaction.",
];

export const ADVICE_ITEM_MAX = 200;

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

type TemplateContent = {
  meds: Omit<Medicine, 'id'>[];
  advice: string[];
  donts: string[];
};

export type ClinicalTemplate = {
  id: string;
  name: string;
  kind: TemplateKind;
  professionalType: ProfessionalType;
  specialty: string;
  description: string;
  /** Counts are derived from the content, so the card can never overstate it. */
  medicines: number;
  adviceItems: number;
  /** Some plans are described by their guidance rather than their advice. */
  adviceLabel?: string;
  warningSigns: number;
  notes: number;
  mine: boolean;
  content: TemplateContent;
};

const template = (
  t: Omit<ClinicalTemplate, 'medicines' | 'adviceItems' | 'warningSigns' | 'notes'> & { notes?: number }
): ClinicalTemplate => ({
  ...t,
  medicines: t.content.meds.length,
  adviceItems: t.content.advice.length,
  warningSigns: t.content.donts.length,
  notes: t.notes ?? 1,
});

export const clinicalTemplates: ClinicalTemplate[] = [
  template({
    id: 'tpl1',
    name: 'Anxiety Initial Care',
    kind: 'medication',
    professionalType: 'psychiatrist',
    specialty: 'Psychiatry',
    description: 'First-contact plan for generalised anxiety with sleep disturbance.',
    mine: true,
    content: {
      meds: [
        { name: 'Escitalopram 5 mg', generic: 'Escitalopram oxalate', dose: '5 mg', frequency: 'Once daily', duration: '14 days', route: 'After food', quantity: '14 tablets', instruction: 'Take in the morning' },
        { name: 'Clonazepam 0.25 mg', generic: 'Clonazepam', dose: '0.25 mg', frequency: 'At bedtime', duration: '5 days', route: 'With water', quantity: '5 tablets', instruction: 'Short course only' },
      ],
      advice: [
        'Keep a consistent sleep and wake time.',
        'Practise paced breathing for ten minutes twice a day.',
        'Limit caffeine to one cup before noon.',
      ],
      donts: [],
    },
  }),
  template({
    id: 'tpl2',
    name: 'Sleep Support Plan',
    kind: 'medication',
    professionalType: 'psychiatrist',
    specialty: 'Psychiatry',
    description: 'Short-course support alongside sleep-hygiene guidance.',
    adviceLabel: 'guidance items',
    mine: true,
    content: {
      meds: [
        { name: 'Mirtazapine 7.5 mg', generic: 'Mirtazapine', dose: '7.5 mg', frequency: 'At bedtime', duration: '14 days', route: 'With water', quantity: '14 tablets', instruction: 'Take 30 minutes before sleep' },
      ],
      advice: [
        'Go to bed only when sleepy and get up at the same time daily.',
        'Keep screens out of the bedroom for the last hour.',
        'Avoid daytime naps longer than 20 minutes.',
        'Keep a sleep diary for the next two weeks.',
      ],
      donts: [],
    },
  }),
  template({
    id: 'tpl3',
    name: 'Therapy Session Follow-up',
    kind: 'therapy',
    professionalType: 'psychologist',
    specialty: 'Psychology',
    description: 'Advice and therapy plan for a between-session review.',
    notes: 2,
    mine: false,
    content: {
      meds: [],
      advice: [
        'Complete the thought record twice this week.',
        'Schedule one pleasant activity each day.',
        'Practise the grounding exercise when anxiety rises.',
        'Note sleep and mood in the daily log.',
        'Bring the worksheets to the next session.',
      ],
      donts: [],
    },
  }),
  template({
    id: 'tpl4',
    name: 'Substance Use Follow-up',
    kind: 'medication',
    professionalType: 'psychiatrist',
    specialty: 'De-addiction',
    description: 'Maintenance review with relapse-risk guidance.',
    mine: false,
    content: {
      meds: [
        { name: 'Naltrexone 50 mg', generic: 'Naltrexone hydrochloride', dose: '50 mg', frequency: 'Once daily', duration: '30 days', route: 'After food', quantity: '30 tablets', instruction: 'Take at the same time each day' },
        { name: 'Thiamine 100 mg', generic: 'Thiamine', dose: '100 mg', frequency: 'Once daily', duration: '30 days', route: 'After food', quantity: '30 tablets', instruction: '' },
      ],
      advice: [],
      donts: [
        "Don't drink alcohol while taking this medicine.",
        "Don't stop the medicine suddenly without speaking to your doctor.",
      ],
    },
  }),
  template({
    id: 'tpl5',
    name: 'Low Mood Check-in',
    kind: 'advice',
    professionalType: 'counsellor',
    specialty: 'Counselling',
    description: 'Structured check-in for persistent low mood. No medication.',
    mine: false,
    content: {
      meds: [],
      advice: [
        'Walk outdoors for 20 minutes each day.',
        'Keep regular meal times.',
        'Contact one supportive person each day.',
        'Use the mood tracker every evening.',
      ],
      donts: [],
    },
  }),
];

/**
 * DOC-CLN-03: a template must be compatible with the doctor's prescribing
 * permission. A medication template is not shown at all to a non-prescriber —
 * offering it disabled would imply it could be unlocked.
 */
export const templatesFor = (t: ProfessionalType) =>
  clinicalTemplates.filter((tpl) => (tpl.medicines > 0 ? canPrescribe(t) : true));

/** Singular/plural count chips for a template card. */
export const templateCounts = (t: ClinicalTemplate): string[] => {
  const out: string[] = [];
  out.push(t.medicines === 0 ? 'No medicines' : `${t.medicines} medicine${t.medicines > 1 ? 's' : ''}`);
  if (t.adviceItems > 0) out.push(`${t.adviceItems} ${t.adviceLabel ?? 'advice items'}`);
  if (t.warningSigns > 0) out.push(`${t.warningSigns} warning sign${t.warningSigns > 1 ? 's' : ''}`);
  if (t.notes > 0) out.push(`${t.notes} note${t.notes > 1 ? 's' : ''}`);
  return out;
};

/* ----------------------------- the record --------------------------------- */

export type FollowUpPlan = {
  pathway: string;
  duration: number;
  /** ISO start date of the daily check-ins. */
  start: string;
};

/**
 * Everything the doctor documents for one consultation. Held in the app store
 * and keyed by appointment, so every clinical screen reads and writes the same
 * record for the patient in front of it.
 */
export type ConsultationRecord = {
  appointmentId: string;
  notes: Record<NoteKey, string>;
  risk: RiskAssessment;
  /** "Diagnosis history & allergies" on the prescription. */
  allergies: string;
  notesStatus: 'empty' | 'draft' | 'saved';
  notesSavedAt?: string;
  medicines: Medicine[];
  advice: string[];
  donts: string[];
  rxStatus: 'draft' | 'finalised';
  rxSavedAt?: string;
  rxFinalisedAt?: string;
  summary: string;
  summaryStatus: 'draft' | 'submitted';
  summarySubmittedAt?: string;
  plan?: FollowUpPlan;
  recommendations: { ids: string[]; note: string };
  /** The clarification raised from this consultation, when there is one. */
  clarificationId?: string;
};

export const emptyRecord = (appointmentId: string): ConsultationRecord => ({
  appointmentId,
  notes: emptyNotes(),
  risk: { ...emptyRisk },
  allergies: '',
  notesStatus: 'empty',
  medicines: [],
  // a new prescription starts blank; the doctor writes it or applies a template
  advice: [],
  donts: [],
  rxStatus: 'draft',
  summary: '',
  summaryStatus: 'draft',
  recommendations: { ids: [], note: '' },
});

/* --------------------------- completion gate (06) ------------------------- */

export type CompletionState = {
  notesFinalised: boolean;
  outputFinalised: boolean;
  followUpAssigned: boolean;
  summarySubmitted: boolean;
};

export const CASE_SUMMARY_MIN = 60;
export const CASE_SUMMARY_MAX = 1000;

export const completionOf = (r: ConsultationRecord): CompletionState => ({
  notesFinalised: r.notesStatus === 'saved',
  outputFinalised: r.rxStatus === 'finalised',
  followUpAssigned: !!r.plan,
  summarySubmitted: r.summaryStatus === 'submitted',
});

/**
 * DOC-CLN-06: returns what is still missing, so the UI can list it without
 * discarding entered work. An empty array means the consultation may close.
 */
export const missingForCompletion = (c: CompletionState, t: ProfessionalType): string[] => {
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

/** The record's overall stage, as the case list and headers describe it. */
export type RecordStage = 'notStarted' | 'inProgress' | 'readyToSubmit' | 'completed';

export const recordStage = (r: ConsultationRecord, t: ProfessionalType): RecordStage => {
  const c = completionOf(r);
  if (isClinicallyComplete(c, t)) return 'completed';
  if (c.notesFinalised && c.outputFinalised && c.followUpAssigned) return 'readyToSubmit';
  if (r.notesStatus === 'empty' && r.medicines.length === 0 && !r.summary.trim()) return 'notStarted';
  return 'inProgress';
};

export const STAGE_LABEL: Record<RecordStage, string> = {
  notStarted: 'Not started',
  inProgress: 'In progress',
  readyToSubmit: 'Ready to submit',
  completed: 'Completed',
};
