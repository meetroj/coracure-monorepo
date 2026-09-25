import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, fireEvent } from '@testing-library/react-native';

import ClinicalNotesScreen from './ClinicalNotesScreen';
import EPrescriptionScreen from './EPrescriptionScreen';
import ClinicalTemplatesScreen from './ClinicalTemplatesScreen';
import CaseSummaryScreen from './CaseSummaryScreen';
import ConsultationRoomScreen from './ConsultationRoomScreen';
import { appointments, appointmentById, nextAppointmentFor, detailFor, doctor } from '../../data/doctor';
import { patientAlerts } from '../../data/followup';
import { templateCounts, clinicalTemplates } from '../../data/clinical';
import { getState } from '../../state/store';
import { selectCases } from '../../state/selectors';

/**
 * Pins the literal values the written specs call for, so a later edit to a
 * fixture cannot silently drift the screens away from what was agreed.
 */

const noop = () => undefined;
const appt = appointments.find((a) => a.id === 'a1')!;

/* ----------------------- one patient, one set of facts -------------------- */

test('Rahul Sharma is 32, male, PT-10482 / CON-10482 in every fixture', () => {
  const d = detailFor(appt);
  expect(appt.name).toBe('Rahul Sharma');
  expect(appt.age).toBe(32);
  expect(appt.gender).toBe('Male');
  expect(d.patientId).toBe('PT-10482');
  expect(d.consultationId).toBe('CON-10482');

  // the same person wherever he appears: cases, the next-appointment card and
  // follow-up alerts resolve him by ID instead of carrying their own copy (N03)
  const hisCases = selectCases(getState()).filter((c) => c.patientId === 'PT-10482');
  expect(hisCases.length).toBeGreaterThan(0);
  hisCases.forEach((c) => expect([c.name, c.age, c.gender]).toEqual(['Rahul Sharma', 32, 'Male']));
  expect(nextAppointmentFor()!.id).toBe('a1');
  const alert = patientAlerts.find((a) => a.patientId === 'PT-10482')!;
  expect(appointmentById(alert.appointmentId)).toEqual(expect.objectContaining({ name: 'Rahul Sharma', age: 32 }));
});

test('no cardiology content survives anywhere in the fixtures', () => {
  const banned =
    /chest (pain|discomfort)|cardiolog|heartbeat|angina|\bECG\b|blood pressure|hypertension|bronchitis|shortness of breath|palpitation|angio/i;

  // every fixture module, not only the lists a screen happens to read
  const sources = ['../../data', '../../state']
    .map((d) => path.join(__dirname, d))
    .flatMap((dir) =>
      fs
        .readdirSync(dir)
        .filter((f) => /\.tsx?$/.test(f) && !/\.spec\./.test(f))
        .map((f) => ({ f, text: fs.readFileSync(path.join(dir, f), 'utf8') }))
    );
  expect(sources.length).toBeGreaterThan(5);
  sources.forEach(({ f, text }) => expect(`${f}: ${text.match(banned)?.[0] ?? 'clean'}`).toBe(`${f}: clean`));

  appointments.forEach((a) => expect(a.concern).not.toMatch(banned));
  selectCases(getState()).forEach((c) => expect(c.concern).not.toMatch(banned));
  expect(doctor.speciality).toBe('Psychiatrist');
  expect(doctor.professionalType).toBe('psychiatrist');
});

/* ------------------------- clinical notes spec ---------------------------- */

test('clinical notes carries the specified patient line and identifiers', () => {
  const onViewProfile = jest.fn();
  const { getByText } = render(<ClinicalNotesScreen appointment={appt} onBack={noop} onViewProfile={onViewProfile} />);

  expect(getByText('Rahul Sharma')).toBeTruthy();
  // identity reads on one line: age, gender, patient id
  expect(getByText('32 • Male • ID: PT-10482')).toBeTruthy();
  expect(getByText('Consultation CON-10482 · 15 May 2026')).toBeTruthy();
  expect(getByText('Clinical Notes & Diagnosis')).toBeTruthy();
  // the save state is real: nothing has been written yet
  expect(getByText('Not started')).toBeTruthy();
  // K29: View Profile goes somewhere; N29: the save button says it moves on
  fireEvent.press(getByText('View Profile'));
  expect(onViewProfile).toHaveBeenCalledTimes(1);
  expect(getByText('Refer')).toBeTruthy();
  expect(getByText('Save notes & continue')).toBeTruthy();
});

test('a consultation not yet held opens with empty, required fields and no invented findings', () => {
  // the earlier mock pre-filled this consultation's notes before it had happened;
  // the brief asks for real clinical inputs, so each field starts blank with guidance
  const { getAllByText, getByPlaceholderText } = render(
    <ClinicalNotesScreen appointment={appt} onBack={noop} onViewProfile={noop} />
  );
  expect(getAllByText('Required')).toHaveLength(7);
  [
    'What the patient came with, in clinical terms.',
    'Onset, duration and course so far.',
    'Mental state and presentation during the consultation.',
    'State clearly whether provisional or confirmed.',
    'What you advised, and why.',
    'When to review, and what would bring it forward.',
  ].forEach((p) => expect(getByPlaceholderText(p).props.value).toBe(''));
});

test('a completed consultation shows exactly what was recorded', () => {
  const earlier = appointmentById('a11')!;
  const recorded = getState().records.a11.notes;
  const { queryByDisplayValue, queryByText } = render(
    <ClinicalNotesScreen appointment={earlier} onBack={noop} onViewProfile={noop} />
  );
  expect(recorded.complaint).toBe('Anxiety, restlessness and difficulty sleeping.');
  expect(queryByDisplayValue(recorded.complaint) ?? queryByText(recorded.complaint)).toBeTruthy();
});

/* --------------------------- prescription spec ---------------------------- */

test('a new prescription starts with no medicines; the anxiety template carries the two specified medicines', () => {
  // DOC-CLN-02's pre-filled draft was demo content on a consultation that had
  // not happened. Its medicine list now starts empty and the same two arrive
  // through "Anxiety Initial Care"; its durations and instructions differ from
  // the old mock (listed in the implementation report for product sign-off).
  expect(getState().records.a1?.meds ?? []).toEqual([]);

  const [esc, clo] = clinicalTemplates.find((t) => t.id === 'tpl1')!.content.meds;
  expect([esc.name, esc.dose, esc.frequency, esc.duration, esc.instruction]).toEqual([
    'Escitalopram 5 mg',
    '5 mg',
    'Once daily',
    '14 days',
    'Take in the morning',
  ]);
  expect([clo.name, clo.dose, clo.frequency, clo.duration, clo.instruction]).toEqual([
    'Clonazepam 0.25 mg',
    '0.25 mg',
    'At bedtime',
    '5 days',
    'Short course only',
  ]);
});

test('prescription shows the specified header and patient block', () => {
  const { getByText, queryByText } = render(<EPrescriptionScreen appointment={appt} onBack={noop} />);

  // NOTE: this screen deliberately diverges from DOC-CLN-02 on three points,
  // by explicit design request: the title drops "& Advice", the patient strip
  // no longer prints the professional type, and the "Report Requested for Next
  // Visit" section was removed along with the follow-up section.
  expect(getByText('E-Prescription')).toBeTruthy();
  expect(getByText('Save Draft')).toBeTruthy();
  expect(getByText('Load from Template')).toBeTruthy();
  expect(getByText('Consultation ID: CON-10482')).toBeTruthy();
  expect(getByText('Patient PDF Preview')).toBeTruthy();
  expect(queryByText('Report Requested for Next Visit')).toBeNull();
});

test('no cardiology or general-practice medicine appears', () => {
  const { queryByText } = render(<EPrescriptionScreen appointment={appt} onBack={noop} />);
  ['Ecosprin', 'Atorlip', 'Clopidogard', 'Azithromycin', 'Levocetirizine', 'Metoprolol'].forEach(
    (m) => expect(queryByText(new RegExp(m, 'i'))).toBeNull()
  );
});

/* ---------------------------- templates spec ------------------------------ */

test('each template reports exactly the counts the spec lists', () => {
  const by = (id: string) => clinicalTemplates.find((t) => t.id === id)!;

  expect(templateCounts(by('tpl1'))).toEqual(['2 medicines', '3 advice items', '1 note']);
  expect(templateCounts(by('tpl2'))).toEqual(['1 medicine', '4 guidance items', '1 note']);
  expect(templateCounts(by('tpl3'))).toEqual(['No medicines', '5 advice items', '2 notes']);
  expect(templateCounts(by('tpl4'))).toEqual(['2 medicines', '2 warning signs', '1 note']);
});

test('the four named templates exist with their specified specialties', () => {
  const { getByText } = render(
    <ClinicalTemplatesScreen onBack={noop} professionalType="psychiatrist" />
  );

  expect(getByText('Anxiety Initial Care')).toBeTruthy();
  expect(getByText('Sleep Support Plan')).toBeTruthy();
  expect(getByText('Therapy Session Follow-up')).toBeTruthy();
  expect(getByText('Substance Use Follow-up')).toBeTruthy();
  expect(getByText('Psychology')).toBeTruthy();
  expect(getByText('De-addiction')).toBeTruthy();
  expect(getByText('Manage your reusable prescription, advice and therapy-plan templates.')).toBeTruthy();
});

/* --------------------------- case summary spec ---------------------------- */

test('case summary shows the specified header, patient block and helper text', () => {
  const { getByText, getByPlaceholderText } = render(<CaseSummaryScreen appointment={appt} onBack={noop} />);

  expect(getByText('Add a 3–5 line summary to complete this consultation.')).toBeTruthy();
  // labelled as on E-Prescription, so one reference reads the same everywhere (N23)
  expect(getByText('Consultation ID: CON-10482')).toBeTruthy();
  expect(getByText('Psychiatry')).toBeTruthy();
  // diagnosis and risk come from the notes, which are not written yet
  expect(getByText('Not recorded in notes')).toBeTruthy();
  expect(getByText('Not assessed')).toBeTruthy();
  expect(getByPlaceholderText('Write your case summary here…')).toBeTruthy();
  expect(getByText(/0\s*\/\s*1000/)).toBeTruthy();
  expect(getByText('Submit Summary & Complete')).toBeTruthy();
});

test('the four checklist rows are exactly those specified', () => {
  const { getByText } = render(<CaseSummaryScreen appointment={appt} onBack={noop} />);

  ['Clinical notes completed', 'Prescription or advice finalised', 'Follow-up plan assigned', 'Case summary'].forEach(
    (l) => expect(getByText(l)).toBeTruthy()
  );
});

/* -------------------------- consultation room ----------------------------- */

test('the room shows the patient at the agreed age, and the patient ID under that label', () => {
  const { getByText, queryByText } = render(<ConsultationRoomScreen appointment={appt} onBack={noop} />);
  expect(getByText('32 years · Male')).toBeTruthy();
  // N46: "Patient ID" used to show the consultation ID
  expect(getByText('Patient ID')).toBeTruthy();
  expect(getByText('PT-10482')).toBeTruthy();
  expect(queryByText('CON-10482')).toBeNull();
});

test('no screen claims HIPAA compliance', () => {
  [
    <ClinicalNotesScreen key="n" appointment={appt} onBack={noop} />,
    <EPrescriptionScreen key="p" appointment={appt} onBack={noop} />,
    <CaseSummaryScreen key="s" appointment={appt} onBack={noop} />,
  ].forEach((el) => {
    const { queryByText } = render(el);
    expect(queryByText(/HIPAA/i)).toBeNull();
  });
});
