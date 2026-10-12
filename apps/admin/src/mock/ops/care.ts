import { allListed } from '../../api/consultationsList';
import type { ProviderCategory } from '../../api/types';
import { createStore, daysAgo, hoursAgo } from '../../modules/kit/store';
import * as db from '../db';
import { appointmentStatus, durationMinutes, type AppointmentStatus } from './appointment';

export { APPOINTMENT_STATUSES, appointmentStatus, durationMinutes, type AppointmentStatus } from './appointment';

/**
 * Appointments, Case Records and Follow-ups (requirements §32-§49).
 *
 * Case records are derived from the consultation fixtures, so every appointment
 * opens a record, and a doctor consultation and a non-doctor one carry the two
 * different structures of §42.
 */

/* ------------------------------- case records ------------------------------ */

export type CaseRecord = {
  id: string;
  consultationId: string;
  referenceCode: string;
  patientId: string;
  patientName: string;
  professionalId: string;
  professionalName: string;
  providerCategory: ProviderCategory;
  specialty: string;
  startsAt: string;
  durationMinutes: number | null;
  status: AppointmentStatus;
  kind: 'doctor' | 'non_doctor';
  /** False until the consultation has begun. */
  held: boolean;
  clinical: { chiefComplaint: string; history: string; observations: string; provisionalDiagnosis: string };
  prescription: { medications: string[]; advice: string; warningSigns: string; allergies: string };
  assessment: { presentingConcern: string; history: string; observations: string };
  carePlan: { recommendations: string; precautions: string };
  documents: { name: string; group: string }[];
  resources: { title: string; kind: string }[];
};

const DOCTOR_CASES = [
  { complaint: 'Low mood and poor sleep for six weeks', history: 'No prior psychiatric treatment. Stressful job change in March.', obs: 'Calm, cooperative, mildly low affect. No psychotic features.', dx: 'Moderate depressive episode', meds: ['Escitalopram 10 mg, once daily at night', 'Melatonin 3 mg, 30 minutes before bed'], advice: 'Regular sleep schedule, 20 minutes of daylight walking, review in 4 weeks.', warn: 'Call us or a local helpline if thoughts of self-harm appear.', allergy: 'No known drug allergies' },
  { complaint: 'Panic episodes while travelling', history: 'Three episodes in two months, each lasting about 15 minutes.', obs: 'Anxious but oriented. Heart rate 96, regular.', dx: 'Panic disorder, mild', meds: ['Sertraline 25 mg, once daily in the morning'], advice: 'Breathing practice twice daily, limit caffeine, keep a symptom diary.', warn: 'Chest pain that does not settle needs emergency care.', allergy: 'Penicillin' },
  { complaint: 'Difficulty reducing alcohol use', history: 'Daily use for five years, two failed attempts to stop.', obs: 'Mild tremor, otherwise stable. Motivated for treatment.', dx: 'Alcohol use disorder, moderate', meds: ['Naltrexone 50 mg, once daily', 'Thiamine 100 mg, once daily'], advice: 'Weekly check-ins, avoid trigger settings, involve a family member.', warn: 'Seizure, confusion or severe shaking needs emergency care.', allergy: 'None known' },
  { complaint: 'Skin rash on both forearms for ten days', history: 'Started after a new detergent. No fever.', obs: 'Erythematous, mildly scaly patches. No signs of infection.', dx: 'Contact dermatitis', meds: ['Mometasone 0.1% cream, twice daily for 7 days', 'Cetirizine 10 mg at night'], advice: 'Switch back to the previous detergent, moisturise after washing.', warn: 'Spreading redness, pus or fever needs review the same day.', allergy: 'Sulfa drugs' },
];

const NON_DOCTOR_CASES = [
  { concern: 'Persistent worry and difficulty relaxing', history: 'Symptoms began after exams; no previous counselling.', obs: 'Engaged and articulate. Reports tension headaches and restless sleep.', rec: 'Daily 10-minute paced-breathing practice. Weekly thought record. Two follow-up sessions.', prec: 'If worry leads to panic or hopelessness, contact CoraCure or a helpline at once.' },
  { concern: 'Low energy and irregular eating', history: 'Skips breakfast, eats late, mostly packaged food.', obs: 'BMI in normal range. Reports afternoon fatigue.', rec: 'Three structured meals, a protein source at breakfast, 2 litres of water daily.', prec: 'Dizziness, fainting or rapid weight loss needs a doctor visit.' },
  { concern: 'Lower back stiffness after long sitting', history: 'Desk job for 8 years. No injury.', obs: 'Reduced hip flexibility. Pain 4 out of 10 on bending.', rec: 'Hip-flexor stretches and core activation, three times a week. Stand every 45 minutes.', prec: 'Numbness in the legs or loss of bladder control needs urgent medical care.' },
];

const DOC_GROUPS = [
  { name: 'Previous history summary.pdf', group: 'Any Previous History' },
  { name: 'Current medication list.pdf', group: 'Medication History' },
  { name: 'Blood panel March.pdf', group: 'Laboratory reports' },
  { name: 'Discharge summary 2025.pdf', group: 'Discharge summaries' },
  { name: 'Referral letter.pdf', group: 'Referral documents' },
  { name: 'Skin photo left forearm.jpg', group: 'Clinical photographs' },
  { name: 'Earlier prescription.pdf', group: 'Previous prescriptions' },
];

const RESOURCES = [
  { title: 'Understanding anxiety', kind: 'Article' },
  { title: 'Sleep hygiene in 7 steps', kind: 'Video' },
  { title: 'Paced breathing, guided', kind: 'Exercise' },
  { title: 'Balanced plate guide', kind: 'Diet plan' },
];

const build = (): CaseRecord[] =>
  allListed()
    .filter((c) => c.doctorId)
    .map((c, i) => {
      const provider = db.findDoctor(c.doctorId as string);
      const category: ProviderCategory = provider?.category ?? 'doctor';
      const kind = category === 'doctor' ? 'doctor' : 'non_doctor';
      const held = c.status === 'completed' || c.status === 'awaiting_documentation' || c.status === 'in_progress';
      const d = DOCTOR_CASES[i % DOCTOR_CASES.length];
      const n = NON_DOCTOR_CASES[i % NON_DOCTOR_CASES.length];
      return {
        id: c.id,
        consultationId: c.id,
        referenceCode: c.referenceCode ?? c.id,
        patientId: c.patientId ?? 'pt-1001',
        patientName: c.patientName,
        professionalId: c.doctorId as string,
        professionalName: c.doctorName ?? '-',
        providerCategory: category,
        specialty: c.serviceName ?? provider?.specialtyName ?? '-',
        startsAt: c.startsAt ?? daysAgo(1),
        durationMinutes: durationMinutes(c.status, c.id),
        status: appointmentStatus(c.status, c.id),
        kind,
        held,
        clinical: { chiefComplaint: d.complaint, history: d.history, observations: d.obs, provisionalDiagnosis: d.dx },
        prescription: { medications: d.meds, advice: d.advice, warningSigns: d.warn, allergies: d.allergy },
        assessment: { presentingConcern: n.concern, history: n.history, observations: n.obs },
        carePlan: { recommendations: n.rec, precautions: n.prec },
        documents: held ? DOC_GROUPS.filter((_, k) => (k + i) % 3 !== 0).slice(0, 4) : [],
        resources: held ? RESOURCES.filter((_, k) => (k + i) % 2 === 0).slice(0, 2) : [],
      };
    });

let cache: CaseRecord[] | null = null;
export const caseRecords = (): CaseRecord[] => (cache ??= build());
export const findCaseRecord = (id: string): CaseRecord | undefined => caseRecords().find((r) => r.id === id);

/**
 * Case Summary - auto-generated (§38, §41). Built from the documentation
 * fields, never typed by anyone, so editing the notes changes the summary.
 */
export const summaryOf = (r: CaseRecord): string =>
  r.kind === 'doctor'
    ? `${r.clinical.chiefComplaint}. History: ${r.clinical.history} Observations: ${r.clinical.observations} Provisional diagnosis: ${r.clinical.provisionalDiagnosis}. Key treatment and advice: ${r.prescription.medications.join('; ')}. ${r.prescription.advice}`
    : `Presenting concern: ${r.assessment.presentingConcern}. History: ${r.assessment.history} Assessment: ${r.assessment.observations} Care plan: ${r.carePlan.recommendations}`;

/* -------------------------------- follow-ups ------------------------------- */

export const FOLLOW_UP_STATUSES = [
  'active', 'patient_response_pending', 'provider_review_pending', 'reviewed', 'follow_up_consultation_recommended', 'completed',
] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export type FollowUp = {
  id: string;
  patientId: string;
  patientName: string;
  caseId: string;
  professional: string;
  planName: string;
  status: FollowUpStatus;
  patientResponse: string | null;
  providerReview: string | null;
  recommendation: string | null;
  updatedAt: string;
};

const fu = (
  n: number,
  patientId: string,
  patientName: string,
  caseId: string,
  professional: string,
  planName: string,
  status: FollowUpStatus,
  patientResponse: string | null,
  providerReview: string | null,
  recommendation: string | null,
  hours: number,
): FollowUp => ({ id: `fu-${n}`, patientId, patientName, caseId, professional, planName, status, patientResponse, providerReview, recommendation, updatedAt: hoursAgo(hours) });

export const followUps = createStore<FollowUp>([
  fu(1, 'pt-1001', 'Aarav Mehta', 'cs-1003', 'Dr Vikram Sethi', '4-week recovery check-in', 'active', null, null, null, 5),
  fu(2, 'pt-1002', 'Priya Nair', 'cs-1001', 'Dr Ananya Rao', 'Sleep and mood diary', 'patient_response_pending', null, null, null, 30),
  fu(3, 'pt-1003', 'Rohan Deshpande', 'cs-1100', 'Dr Ananya Rao', 'Medication tolerance check', 'provider_review_pending', 'Mild nausea in the first week, settled now. Sleeping 6 hours.', null, null, 12),
  fu(4, 'pt-1004', 'Sneha Iyer', 'cs-1101', 'Meera Krishnan', 'Anxiety coping practice', 'reviewed', 'Practising breathing daily. Two panic episodes this fortnight.', 'Improving. Continue current plan, add thought record.', null, 48),
  fu(5, 'pt-1005', 'Kabir Singh', 'cs-1102', 'Dr Sameer Joshi', 'Dose review', 'follow_up_consultation_recommended', 'Still waking at 4 am most days.', 'Persisting symptoms; adjust dose in a short consultation.', 'Book a follow-up consultation within 7 days.', 20),
  fu(6, 'pt-1006', 'Ananya Reddy', 'cs-1103', 'Rhea Dutta', 'Home exercise programme', 'completed', 'Completed all 12 sessions.', 'Goals met. Discharged from the plan.', null, 120),
  fu(7, 'pt-1007', 'Vikram Joshi', 'cs-1104', 'Dr Vikram Sethi', 'Alcohol reduction diary', 'active', null, null, null, 8),
  fu(8, 'pt-1008', 'Meera Pillai', 'cs-1105', 'Dr Kabir Nair', 'Post-visit symptom check', 'patient_response_pending', null, null, null, 60),
]);

export const countWhere = <T,>(rows: readonly T[], pred: (r: T) => boolean): number => rows.filter(pred).length;

/* ------------------------------ clarifications ----------------------------- */

export const CLARIFICATION_STATUSES = ['new', 'awaiting_response', 'responded', 'closed'] as const;
export type ClarificationStatus = (typeof CLARIFICATION_STATUSES)[number];

export type ClarificationThread = {
  id: string;
  caseId: string;
  referenceCode: string;
  patientName: string;
  professional: string;
  subject: string;
  status: ClarificationStatus;
  raisedAt: string;
  thread: { from: string; text: string; at: string }[];
};

const SUBJECTS = [
  'Dose before this visit unclear',
  'Allergy history missing',
  'Report values do not match the notes',
  'Please confirm the follow-up interval',
  'Observation entry looks incomplete',
  'Referral letter unreadable',
];

/**
 * A thread belongs to one Case Record (§44) and is also listed on its own under
 * Clarifications. Seeded from held cases so every thread opens a real record.
 */
export const clarifications = createStore<ClarificationThread>(
  caseRecords()
    .filter((r) => r.held)
    .slice(0, 8)
    .map((r, i): ClarificationThread => {
      const status = CLARIFICATION_STATUSES[i % 4];
      const ask = { from: 'Clarification desk', text: `${SUBJECTS[i % SUBJECTS.length]}. Can you confirm?`, at: hoursAgo(40 - i) };
      const answer = { from: r.professionalName, text: 'Confirmed, details added to the case notes.', at: hoursAgo(30 - i) };
      return {
        id: `cl-${i + 1}`,
        caseId: r.id,
        referenceCode: r.referenceCode,
        patientName: r.patientName,
        professional: r.professionalName,
        subject: SUBJECTS[i % SUBJECTS.length],
        status,
        raisedAt: hoursAgo(40 - i),
        thread: status === 'new' || status === 'awaiting_response' ? [ask] : [ask, answer],
      };
    }),
);
