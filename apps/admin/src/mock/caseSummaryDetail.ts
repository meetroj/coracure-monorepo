import { caseSummaries } from './caseSummaries';

/**
 * Full content behind one case-summary row, in the doctor app's terms
 * (apps/doctor/src/data/clinical.ts): what the patient provided, what the
 * doctor documented, and the auto-generated summary.
 *
 * Doctors (`prescriber`) write Clinical Notes + a Prescription; non-doctor
 * professionals write an Assessment + a Care Plan.
 */
export type CaseSummaryDetail = {
  summaryId: string;
  prescriber: boolean;
  doctor: { type: string; registrationNumber: string; languages: string };
  patient: { gender: string; age: number; mode: string; duration: string; payment: string; complaint: string; history: string; medication: string; reports: string[] };
  notes: { label: string; value: string }[];
  medications: { name: string; dose: string; frequency: string; duration: string }[];
  plan: { label: string; value: string }[];
  signedBy: string | null;
  summary: string | null;
  /** What the doctor recommended from the Care Hub; null when nothing was. */
  recommendations: {
    tools: { name: string; description: string }[];
    modules: { name: string; description: string }[];
    note: string | null;
  } | null;
  /** The follow-up plan assigned after this case; null when none was. */
  followUp: {
    pathway: string;
    questions: number;
    status: 'active' | 'completed' | 'stopped';
    startedAt: string;
    reviewAt: string;
    /** The doctor picks 3, 7 or 14 days; there is one check-in a day. */
    durationDays: number;
    /** Which day of the plan today is, while it is active. */
    day: number | null;
    checkIns: { date: string; colour: 'green' | 'amber' | 'red' }[];
  } | null;
};

const HISTORY = ['No previous psychiatric history.', 'Treated for anxiety two years ago.', 'Sleep problems for six months.'];
const COMPLAINTS = [
  'Low mood and trouble sleeping for the last few weeks.',
  'Constant worry that is affecting work and daily routine.',
  'Strong cravings and difficulty staying away from alcohol.',
  'Feeling very irritable, with sudden swings in energy.',
];

const TOOLS = [
  { name: 'Guided Breathing', description: 'Calm your mind with simple breathing exercises.' },
  { name: 'Sleep Hygiene', description: 'Build healthy sleep habits for better rest and recovery.' },
  { name: 'Managing Anxiety', description: 'Evidence-based techniques to manage stress and worry.' },
  { name: 'Grounding Technique', description: 'Step-by-step distress management you can use anywhere.' },
  { name: 'Medication Adherence', description: 'Practical routines for taking medication on time.' },
];
const MODULES = [
  { name: 'Understanding Anxiety', description: 'What anxiety is, why it happens and what helps.' },
  { name: 'Understanding Depression', description: 'Recognising low mood and what recovery looks like.' },
  { name: 'Sleep and Recovery', description: 'How rest affects mood, focus and healing.' },
];
const PATHWAYS: [string, number][] = [
  ['Depression & Anxiety', 7],
  ['Sleep', 5],
  ['Substance Use', 8],
  ['Bipolar & Psychosis', 9],
  ['General', 6],
];
const MEDS = [
  { name: 'Escitalopram', dose: '10 mg', frequency: 'Once daily, morning', duration: '4 weeks' },
  { name: 'Clonazepam', dose: '0.25 mg', frequency: 'At night', duration: '2 weeks' },
];

export const detailFor = (summaryId: string): CaseSummaryDetail | null => {
  const i = caseSummaries.findIndex((r) => r.id === summaryId);
  if (i < 0) return null;
  const row = caseSummaries[i];
  const prescriber = row.serviceName === 'Psychiatry' || i % 3 === 0;
  const done = row.status !== 'awaiting';
  return {
    summaryId,
    prescriber,
    doctor: {
      type: prescriber ? 'Doctor (can prescribe)' : 'Psychologist / Therapist',
      registrationNumber: `KA-2019-${88000 + i}`,
      languages: 'English, Hindi',
    },
    patient: {
      gender: i % 2 ? 'Female' : 'Male',
      age: 24 + (i % 30),
      mode: ['Video', 'Audio', 'Video'][i % 3],
      duration: row.generatedAt ? `${20 + (i % 25)} min` : '—',
      payment: row.status === 'awaiting' ? 'Not paid' : 'Paid',
      complaint: COMPLAINTS[i % COMPLAINTS.length],
      history: HISTORY[i % HISTORY.length],
      medication: i % 2 ? 'None' : 'Multivitamin, occasionally',
      reports: i % 2 ? [] : ['Blood-test-report.pdf', 'Previous-prescription.jpg'],
    },
    notes: done
      ? prescriber
        ? [
            { label: 'Chief Complaint', value: 'Low mood and poor sleep for several weeks.' },
            { label: 'Brief Clinical History', value: 'Stress at work, reduced appetite, no self-harm thoughts.' },
            { label: 'Observations', value: 'Calm, cooperative, speech normal.' },
            { label: 'Provisional Diagnosis', value: 'Adjustment disorder with anxiety.' },
          ]
        : [
            { label: 'Presenting Concern', value: 'Persistent worry affecting daily routine.' },
            { label: 'Relevant History', value: 'Recent job change; family support available.' },
            { label: 'Assessment / Observations', value: 'Mild anxiety; engaged well in session.' },
          ]
      : [],
    medications: done && prescriber ? MEDS : [],
    plan: !done
      ? []
      : prescriber
        ? [
            { label: 'Advice & Instructions', value: 'Regular sleep schedule; reduce caffeine.' },
            { label: 'Warning Signs', value: 'Seek urgent help for thoughts of self-harm.' },
            { label: 'History of Allergies', value: 'None known.' },
          ]
        : [
            { label: 'Recommendations / Interventions', value: 'Weekly sessions; breathing and journaling exercises.' },
            { label: 'Precautions & Warning Signs', value: 'Contact the helpline if symptoms worsen.' },
          ],
    recommendations:
      done && i % 4 !== 3
        ? {
            tools: [TOOLS[i % TOOLS.length], TOOLS[(i + 2) % TOOLS.length]].filter((t, k, all) => all.indexOf(t) === k),
            modules: i % 2 ? [MODULES[i % MODULES.length]] : [],
            note: i % 2 === 0 ? 'Start with the breathing exercise each evening.' : null,
          }
        : null,
    followUp:
      done && i % 3 !== 2
        ? (() => {
            const status = i % 4 === 0 ? 'completed' : i % 4 === 3 ? 'stopped' : 'active';
            const days = [3, 7, 14][i % 3];
            const startedAt = new Date(row.consultationAt).toISOString();
            const elapsed = Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / 86_400_000));
            const colours = ['green', 'green', 'amber', 'green', 'red', 'green', 'green'] as const;
            const [pathway, questions] = PATHWAYS[i % PATHWAYS.length];
            return {
              pathway,
              questions,
              status: status as 'active' | 'completed' | 'stopped',
              startedAt,
              reviewAt: new Date(new Date(startedAt).getTime() + days * 86_400_000).toISOString(),
              durationDays: days,
              day: status === 'active' ? Math.min(elapsed, days) : null,
              checkIns: Array.from({ length: Math.min(days, 5, elapsed) }, (_, k) => ({
                date: new Date(new Date(startedAt).getTime() + (k + 1) * 86_400_000).toISOString(),
                colour: colours[(i + k) % colours.length],
              })),
            };
          })()
        : null,
    signedBy: done && prescriber ? row.doctorName : null,
    summary: row.generatedAt
      ? `${row.serviceName} consultation. ${prescriber ? 'Provisional diagnosis recorded and prescription issued.' : 'Assessment documented with a care plan.'} Follow-up per the plan.`
      : null,
  };
};
