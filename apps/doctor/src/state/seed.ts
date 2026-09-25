/**
 * The documentation already on file when the demo opens.
 *
 * Each held consultation is seeded to the step its record has reached, so the
 * worklist, the case list and every count derive from these records rather
 * than from numbers authored beside them. Clinical text is consistent with the
 * consultation it belongs to and never contradicts a later safety alert.
 */
import { appointments, type Appointment } from '../data/doctor';
import { dayOffset, toISODate } from '../data/calendar';
import {
  DEFAULT_ADVICE,
  DEFAULT_DONTS,
  emptyRecord,
  type ConsultationRecord,
  type Medicine,
  type NoteKey,
  type RiskAssessment,
} from '../data/clinical';

type Stage = 'notesDraft' | 'rxDraft' | 'summaryPending' | 'complete';

type Seed = {
  stage: Stage;
  notes: Record<NoteKey, string>;
  risk: RiskAssessment;
  meds: Omit<Medicine, 'id'>[];
  summary?: string;
  /** Pathway key; the plan starts the day after the consultation. */
  plan?: { pathway: string; duration: number };
  clarificationId?: string;
  allergies?: string;
};

const med = (
  name: string,
  generic: string,
  dose: string,
  frequency: string,
  duration: string,
  quantity: string,
  instruction = '',
  route = 'After food'
): Omit<Medicine, 'id'> => ({ name, generic, dose, frequency, duration, route, quantity, instruction });

const ESCITALOPRAM_5 = med('Escitalopram 5 mg', 'Escitalopram oxalate', '5 mg', 'Once daily', '14 days', '14 tablets', 'Take in the morning');
const ESCITALOPRAM_10 = med('Escitalopram 10 mg', 'Escitalopram oxalate', '10 mg', 'Once daily', '28 days', '28 tablets', 'Take in the morning');
const CLONAZEPAM = med('Clonazepam 0.25 mg', 'Clonazepam', '0.25 mg', 'At bedtime', '5 days', '5 tablets', 'Short course only', 'With water');
const SERTRALINE_50 = med('Sertraline 50 mg', 'Sertraline hydrochloride', '50 mg', 'Once daily', '28 days', '28 tablets', 'Take after breakfast');
const SERTRALINE_100 = med('Sertraline 100 mg', 'Sertraline hydrochloride', '100 mg', 'Once daily', '28 days', '28 tablets', 'Take after breakfast');
const MIRTAZAPINE = med('Mirtazapine 7.5 mg', 'Mirtazapine', '7.5 mg', 'At bedtime', '14 days', '14 tablets', 'Take 30 minutes before sleep', 'With water');
const NALTREXONE = med('Naltrexone 50 mg', 'Naltrexone hydrochloride', '50 mg', 'Once daily', '30 days', '30 tablets', 'Take at the same time each day');
const PROPRANOLOL = med('Propranolol 10 mg', 'Propranolol hydrochloride', '10 mg', 'As needed', '14 days', '14 tablets', 'For physical symptoms of panic, up to twice a day');

const notes = (
  complaint: string,
  history: string,
  observations: string,
  diagnosis: string,
  advice: string,
  followUp: string
): Record<NoteKey, string> => ({ complaint, history, observations, diagnosis, advice, followUp });

const MSE = 'Alert, oriented and cooperative. Speech normal in rate and volume. No perceptual disturbances elicited.';

const risk = (category: RiskAssessment['category'], selfHarm: RiskAssessment['selfHarm'] = 'denied'): RiskAssessment => ({
  category,
  selfHarm,
  referralAdvised: false,
});

const seeds: Record<string, Seed> = {
  /* earlier consultations whose follow-up plans produce today's alerts */
  a11: {
    stage: 'complete',
    notes: notes(
      'Anxiety, restlessness and difficulty sleeping.',
      'Two weeks of worry, racing thoughts at night and poor sleep, affecting concentration at work.',
      `${MSE} Appears tense; reports racing thoughts at night.`,
      'Provisional diagnosis: Generalised anxiety disorder.',
      'Started a low-dose SSRI with a short course of night sedation. Sleep-routine and breathing guidance given.',
      'Daily check-ins on the Depression & Anxiety pathway for 14 days; review in two weeks or earlier if worse.'
    ),
    risk: risk('moderate'),
    meds: [ESCITALOPRAM_5, CLONAZEPAM],
    summary:
      'Two weeks of anxiety with disturbed sleep and racing thoughts, affecting work. Assessed as moderate risk; a safety plan was discussed. Started escitalopram 5 mg with a five-day course of clonazepam at night, alongside sleep-routine guidance. Enrolled on the 14-day Depression & Anxiety check-in pathway.',
    plan: { pathway: 'depressionAnxiety', duration: 14 },
    clarificationId: 'cl3',
  },
  a12: {
    stage: 'complete',
    notes: notes(
      'Panic episodes and poor sleep.',
      'Panic episodes for two months, now waking at night with panic attacks.',
      `${MSE} Anxious affect.`,
      'Provisional diagnosis: Panic disorder.',
      'SSRI started; psychoeducation on panic cycle and grounding technique.',
      '14-day check-in pathway; review in two weeks.'
    ),
    risk: risk('low'),
    meds: [ESCITALOPRAM_10, PROPRANOLOL],
    summary:
      'Two months of panic episodes with night-time awakenings. Low risk on assessment. Started escitalopram 10 mg with propranolol as needed, and explained the panic cycle with a grounding technique. Enrolled on the 14-day check-in pathway.',
    plan: { pathway: 'depressionAnxiety', duration: 14 },
    clarificationId: 'cl2',
  },
  a13: {
    stage: 'complete',
    notes: notes(
      'Low mood and fatigue.',
      'Six weeks of low mood, fatigue and reduced interest; partial response to sertraline 50 mg.',
      `${MSE} Mood subjectively low, affect restricted.`,
      'Provisional diagnosis: Moderate depressive episode.',
      'Continue SSRI; activity scheduling and sleep routine discussed.',
      '14-day check-in pathway; review in two weeks.'
    ),
    risk: risk('low'),
    meds: [SERTRALINE_50],
    summary:
      'Six weeks of low mood and fatigue with partial response to sertraline 50 mg. Low risk on assessment. Continued sertraline with activity scheduling and sleep-routine guidance. Enrolled on the 14-day check-in pathway, with expert input requested on dose timing.',
    plan: { pathway: 'depressionAnxiety', duration: 14 },
    clarificationId: 'cl4',
  },
  a14: {
    stage: 'complete',
    notes: notes(
      'Low mood and poor motivation.',
      'Four weeks of low mood and poor motivation after a stressful period at home.',
      `${MSE} Mood low, reactive affect.`,
      'Provisional diagnosis: Moderate depressive episode.',
      'SSRI dose increased; daily routine and social contact discussed.',
      '14-day check-in pathway; review in two weeks.'
    ),
    risk: risk('moderate'),
    meds: [SERTRALINE_50],
    summary:
      'Four weeks of low mood and poor motivation after stress at home. Moderate risk on assessment with protective factors. Sertraline increased to 50 mg with a daily routine plan. Enrolled on the 14-day check-in pathway.',
    plan: { pathway: 'depressionAnxiety', duration: 14 },
    clarificationId: 'cl1',
  },
  a15: {
    stage: 'summaryPending',
    notes: notes(
      'Worsening anxiety and low mood.',
      'Three weeks of anxiety and low mood with poor sleep.',
      `${MSE} Anxious and low in mood.`,
      'Provisional diagnosis: Mixed anxiety and depressive disorder.',
      'SSRI started; sleep routine and breathing practice advised.',
      '14-day check-in pathway; review in two weeks.'
    ),
    risk: risk('moderate'),
    meds: [SERTRALINE_50],
    plan: { pathway: 'depressionAnxiety', duration: 14 },
  },
  a16: {
    stage: 'notesDraft',
    notes: notes(
      'Persistent low mood.',
      'Low mood most days for two months.',
      '',
      '',
      '',
      ''
    ),
    risk: risk(null, 'notAsked'),
    meds: [],
    plan: { pathway: 'depressionAnxiety', duration: 14 },
  },
  a19: {
    stage: 'complete',
    notes: notes(
      'Sleep difficulty and low energy.',
      'Difficulty falling asleep for a month, low energy in the day.',
      MSE,
      'Provisional diagnosis: Insomnia disorder.',
      'Sleep-hygiene plan and sleep diary.',
      'Seven-day sleep pathway; review when it ends.'
    ),
    risk: risk('low'),
    meds: [MIRTAZAPINE],
    summary:
      'A month of difficulty falling asleep with low daytime energy. Low risk on assessment. Short course of mirtazapine at bedtime with a sleep-hygiene plan and sleep diary. Enrolled on the seven-day Sleep pathway.',
    plan: { pathway: 'sleep', duration: 7 },
  },

  /* consultations still being written up */
  a17: {
    stage: 'summaryPending',
    notes: notes('Irritability and poor sleep.', 'Irritability at home and work with broken sleep for a month.', MSE, 'Provisional diagnosis: Adjustment disorder.', 'Sleep routine and stress-management guidance.', 'Review in two weeks.'),
    risk: risk('low'),
    meds: [MIRTAZAPINE],
  },
  a18: {
    stage: 'rxDraft',
    notes: notes('Anxiety with physical tension.', 'Episodes of anxiety with muscle tension and restlessness for three weeks.', MSE, 'Provisional diagnosis: Generalised anxiety disorder.', 'Breathing practice; limit caffeine.', 'Review in two weeks.'),
    risk: risk('low'),
    meds: [ESCITALOPRAM_5],
  },
  a20: {
    stage: 'notesDraft',
    notes: notes('Alcohol use — cutting down.', 'Drinking daily for two years, wants to cut down.', '', '', '', ''),
    risk: risk(null, 'notAsked'),
    meds: [],
  },
  a21: {
    stage: 'summaryPending',
    notes: notes('Panic symptoms while commuting.', 'Panic attacks on the train for six weeks.', MSE, 'Provisional diagnosis: Panic disorder.', 'Graded exposure plan; grounding technique.', 'Review in two weeks.'),
    risk: risk('low'),
    meds: [ESCITALOPRAM_5],
  },
  a22: {
    stage: 'rxDraft',
    notes: notes('Low mood after job loss.', 'Low mood and withdrawal since losing his job a month ago.', MSE, 'Provisional diagnosis: Moderate depressive episode.', 'Activity scheduling; job-search support resources.', 'Review in two weeks.'),
    risk: risk('moderate'),
    meds: [SERTRALINE_50],
  },
  a23: {
    stage: 'summaryPending',
    notes: notes('Exam-related anxiety.', 'Anxiety and poor sleep ahead of final exams.', MSE, 'Provisional diagnosis: Adjustment disorder with anxiety.', 'Study schedule, sleep routine and breathing practice.', 'Review after exams.'),
    risk: risk('low'),
    meds: [],
  },
  a24: {
    stage: 'notesDraft',
    notes: notes('Anxiety with stress at work.', '', '', '', '', ''),
    risk: risk(null, 'notAsked'),
    meds: [],
  },
  a25: {
    stage: 'rxDraft',
    notes: notes('Low mood and early waking.', 'Low mood with early-morning waking for five weeks.', MSE, 'Provisional diagnosis: Moderate depressive episode.', 'Sleep routine; daily activity plan.', 'Review in two weeks.'),
    risk: risk('moderate'),
    meds: [MIRTAZAPINE],
  },
  a26: {
    stage: 'summaryPending',
    notes: notes('Alcohol use — relapse prevention.', 'Three months abstinent; cravings at weekends.', MSE, 'Provisional diagnosis: Alcohol use disorder, early remission.', 'Relapse-prevention plan; support group details shared.', 'Review in four weeks.'),
    risk: risk('low'),
    meds: [NALTREXONE],
  },
  a27: {
    stage: 'summaryPending',
    notes: notes('Poor sleep and worry.', 'Worry about family health with poor sleep for a month.', MSE, 'Provisional diagnosis: Generalised anxiety disorder.', 'Worry-time technique; sleep routine.', 'Review in two weeks.'),
    risk: risk('low'),
    meds: [],
  },
  a9: {
    stage: 'summaryPending',
    notes: notes('Sleep and mood review.', 'Follow-up review; sleep improved, mood stable.', MSE, 'Recurrent depressive disorder, currently improving.', 'Continue current plan.', 'Review in four weeks.'),
    risk: risk('low'),
    meds: [SERTRALINE_100],
  },

  /* today's consultations so far */
  a3: {
    stage: 'notesDraft',
    notes: notes('Low mood and loss of interest.', 'Low mood for two months with loss of interest in hobbies.', '', '', '', ''),
    risk: risk(null, 'notAsked'),
    meds: [],
  },
  a2: {
    stage: 'rxDraft',
    notes: notes(
      'Medication side effects and daytime drowsiness.',
      'Drowsiness since the sertraline dose increased last week.',
      `${MSE} Mildly sedated.`,
      'Adverse effect of sertraline under review; depressive episode improving.',
      'Reduce dose and take at night; review drowsiness in one week.',
      'Review in one week.'
    ),
    risk: risk('low'),
    meds: [SERTRALINE_50],
    allergies: 'Penicillin',
  },
};

const stamp = (a: Appointment, afterMinutes: number) => {
  const mins = a.minutes + afterMinutes;
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'}`;
};

let medCounter = 0;
/** Stable, readable ids: med_001, med_002 … */
export const nextMedicineId = () => {
  medCounter += 1;
  return `med_${String(medCounter).padStart(3, '0')}`;
};

export const resetMedicineIds = () => {
  medCounter = 0;
};

export const seedRecords = (): Record<string, ConsultationRecord> => {
  resetMedicineIds();
  const out: Record<string, ConsultationRecord> = {};
  appointments.forEach((a) => {
    const seed = seeds[a.id];
    if (!seed) return;
    const r = emptyRecord(a.id);
    r.notes = seed.notes;
    r.risk = seed.risk;
    r.allergies = seed.allergies ?? '';
    r.medicines = seed.meds.map((m) => ({ ...m, id: nextMedicineId() }));
    r.advice = [...DEFAULT_ADVICE];
    r.donts = [...DEFAULT_DONTS];
    r.clarificationId = seed.clarificationId;
    const reached = ['notesDraft', 'rxDraft', 'summaryPending', 'complete'].indexOf(seed.stage);
    r.notesStatus = reached >= 1 ? 'saved' : 'draft';
    if (reached >= 1) r.notesSavedAt = stamp(a, 35);
    if (reached >= 1 && r.medicines.length) r.rxSavedAt = stamp(a, 40);
    if (reached >= 2) {
      r.rxStatus = 'finalised';
      r.rxFinalisedAt = stamp(a, 45);
    }
    if (seed.plan) {
      r.plan = { pathway: seed.plan.pathway, duration: seed.plan.duration, start: toISODate(dayOffset(a.dayOffset + 1)) };
    }
    if (reached >= 3 && seed.summary) {
      r.summary = seed.summary;
      r.summaryStatus = 'submitted';
      r.summarySubmittedAt = stamp(a, 50);
    }
    out[a.id] = r;
  });
  return out;
};
