import type { DoctorConsultation } from '@coracure/api';

import { appointments } from './doctor';
import { answerText, detailFromConsultation, intakeRows, questionLabel } from './consultationDetail';

const ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const real = { ...appointments.find((a) => a.id === 'a1')!, id: ID };

const consultation = (over: Partial<DoctorConsultation> = {}): DoctorConsultation =>
  ({
    id: ID,
    referenceCode: 'CC-10482',
    patientId: real.patientId,
    status: 'scheduled',
    intakeAnswers: null,
    doctorContext: { riskCategory: null, totalPastConsultationsWithDoctor: 2, hasCurrentTeleconsultationConsent: true },
    ...over,
  }) as DoctorConsultation;

test('every intake answer given is shown under its own question, whatever the form asked', () => {
  const rows = intakeRows({ sleepHours: 5, how_long_has_this_been_going_on: '3 weeks', takesMedication: false, triggers: ['work', 'travel'], note: '  ' });
  expect(rows.map((r) => [r.label, r.value])).toEqual([
    ['Sleep hours', '5'],
    ['How long has this been going on', '3 weeks'],
    ['Takes medication', 'No'],
    ['Triggers', 'work, travel'],
  ]);
  // an empty answer is left out, not shown blank
  expect(rows.find((r) => r.key === 'note')).toBeUndefined();
});

test('labels and values read as words', () => {
  expect(questionLabel('currentMedication')).toBe('Current medication');
  expect(answerText(true)).toBe('Yes');
  expect(answerText(null)).toBe('');
});

test('the summary lines pick an answer out only when its question plainly names it', () => {
  const d = detailFromConsultation(real, consultation({ intakeAnswers: { duration: '3 weeks', severity: 'Moderate', currentMedication: 'Escitalopram 5 mg' } }), []);
  expect([d.duration, d.severity, d.medication]).toEqual(['3 weeks', 'Moderate', 'Escitalopram 5 mg']);

  const none = detailFromConsultation(real, consultation({ intakeAnswers: { mood: 'Low' } }), []);
  expect([none.duration, none.severity, none.medication]).toEqual(['Not recorded', 'Not recorded', 'None reported']);
});

test('what the patient put on their own profile follows the intake answers, labelled as theirs', () => {
  const ctx = {
    riskCategory: null,
    totalPastConsultationsWithDoctor: 0,
    hasCurrentTeleconsultationConsent: true,
    patientHealth: { bloodGroup: 'ab_negative', heightCm: 172, weightKg: null, allergies: ' Penicillin ', medicalConditions: null, currentMedications: 'Thyroxine 50 mcg' },
  };
  const d = detailFromConsultation(real, consultation({ intakeAnswers: { mood: 'Low' }, doctorContext: ctx }), []);
  // blank and missing values are left out, not shown empty
  expect(d.intake.map((r) => [r.label, r.value])).toEqual([
    ['Mood', 'Low'],
    ['Allergies (patient-reported)', 'Penicillin'],
    ['Current medications (patient-reported)', 'Thyroxine 50 mcg'],
    ['Blood group', 'AB−'],
    ['Height', '172 cm'],
  ]);
  // with no medication answer on the intake form, the profile's is the summary line
  expect(d.medication).toBe('Thyroxine 50 mcg');
  // an older backend, or an admin's read: nothing added, nothing thrown
  expect(detailFromConsultation(real, consultation({ intakeAnswers: { mood: 'Low' } }), []).intake).toHaveLength(1);
});

test('consent is what the backend has on file — no invented version or time', () => {
  expect(detailFromConsultation(real, consultation(), []).consent).toEqual({ status: 'onFile' });
  expect(
    detailFromConsultation(real, consultation({ doctorContext: { riskCategory: null, totalPastConsultationsWithDoctor: 0, hasCurrentTeleconsultationConsent: false } }), []).consent
  ).toEqual({ status: 'missing' });
  // not loaded yet
  expect(detailFromConsultation(real, undefined, []).consent).toEqual({ status: 'unknown' });
});

test('the visit count is the backend’s past count plus this one; past visits come from the loaded list', () => {
  const earlier = { ...real, id: 'e1e1e1e1-0000-4000-8000-000000000000', state: 'completed' as const, dayOffset: -10, concern: 'Low mood' };
  const d = detailFromConsultation(real, consultation(), [real, earlier]);
  expect(d.totalConsultations).toBe(3);
  expect(d.past).toMatchObject({ appointmentId: earlier.id, note: 'Low mood' });
  // none loaded: nothing invented from fixtures
  expect(detailFromConsultation(real, consultation(), [real]).past).toBeUndefined();
});
