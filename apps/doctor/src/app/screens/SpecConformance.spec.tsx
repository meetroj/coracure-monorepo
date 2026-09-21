import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import ClinicalNotesScreen from './ClinicalNotesScreen';
import EPrescriptionScreen from './EPrescriptionScreen';
import ClinicalTemplatesScreen from './ClinicalTemplatesScreen';
import CaseSummaryScreen from './CaseSummaryScreen';
import ConsultationRoomScreen from './ConsultationRoomScreen';
import { appointments, cases, nextAppointment, detailFor, doctor } from '../../data/doctor';
import { patientAlerts } from '../../data/followup';
import { draftMedicines, templateCounts, clinicalTemplates } from '../../data/clinical';

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

  // the same person, wherever he appears
  expect(cases.find((c) => c.initials === 'RS')!.age).toBe(32);
  expect(nextAppointment.age).toBe(32);
  expect(patientAlerts.find((a) => a.name === 'Rahul Sharma')!.age).toBe(32);
  expect(patientAlerts.find((a) => a.name === 'Rahul Sharma')!.patientId).toBe('PT-10482');
});

test('no cardiology content survives anywhere in the fixtures', () => {
  const banned =
    /chest (pain|discomfort)|cardiolog|heartbeat|angina|\bECG\b|blood pressure|hypertension|bronchitis|shortness of breath|palpitation|angio/i;

  appointments.forEach((a) => expect(a.concern).not.toMatch(banned));
  cases.forEach((c) => expect(c.concern).not.toMatch(banned));
  expect(nextAppointment.concern).not.toMatch(banned);
  expect(doctor.speciality).toBe('Psychiatrist');
  expect(doctor.professionalType).toBe('psychiatrist');
});

/* ------------------------- clinical notes spec ---------------------------- */

test('clinical notes carries the specified patient line and identifiers', () => {
  const { getByText } = render(<ClinicalNotesScreen appointment={appt} onBack={noop} />);

  expect(getByText('Rahul Sharma')).toBeTruthy();
  // identity now reads on one line: age, gender, patient id
  expect(getByText('32 • Male • ID: PT-10482')).toBeTruthy();
  expect(getByText('View Profile')).toBeTruthy();
  expect(getByText('Autosaved')).toBeTruthy();
  expect(getByText('Refer for Clarification')).toBeTruthy();
  expect(getByText('Clinical Notes & Diagnosis')).toBeTruthy();
  expect(getByText('Save Notes')).toBeTruthy();
});

test('clinical notes carries the exact specified field content', () => {
  const { getByTestId, getByText } = render(
    <ClinicalNotesScreen appointment={appt} onBack={noop} />
  );

  expect(getByText('Anxiety, persistent restlessness and difficulty sleeping.')).toBeTruthy();

  fireEvent.press(getByTestId('section-history'));
  expect(
    getByText(
      'Symptoms have continued for approximately two weeks and are affecting concentration and daily work.'
    )
  ).toBeTruthy();

  fireEvent.press(getByTestId('section-observations'));
  expect(
    getByText('Patient is alert, oriented and cooperative. Speech is clear. Reports racing thoughts at night.')
  ).toBeTruthy();

  fireEvent.press(getByTestId('section-diagnosis'));
  expect(getByText('Provisional diagnosis: Generalised Anxiety Disorder')).toBeTruthy();

  fireEvent.press(getByTestId('section-risk'));
  // self-harm-thoughts and referral lines were removed by request; only the
  // risk-category selector remains
  expect(getByText('Moderate')).toBeTruthy();

  fireEvent.press(getByTestId('section-advice'));
  expect(getByText('Sleep routine guidance, breathing practice and scheduled clinical review.')).toBeTruthy();

  fireEvent.press(getByTestId('section-followUp'));
  expect(getByText('Review after seven days or earlier if symptoms worsen.')).toBeTruthy();
});

/* --------------------------- prescription spec ---------------------------- */

test('the two specified medicines carry their exact structured instructions', () => {
  const [esc, clo] = draftMedicines;

  expect(esc.name).toBe('Escitalopram 5 mg');
  expect([esc.dose, esc.frequency, esc.duration, esc.instruction]).toEqual([
    '5 mg',
    'Once daily',
    '7 days',
    'After dinner',
  ]);

  expect(clo.name).toBe('Clonazepam 0.25 mg');
  expect([clo.dose, clo.frequency, clo.duration, clo.instruction]).toEqual([
    '0.25 mg',
    'At bedtime',
    '5 days',
    'Use only as directed',
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
  const { getByText } = render(<CaseSummaryScreen appointment={appt} onBack={noop} />);

  expect(
    getByText('Add a 3–5 line summary to complete this consultation.')
  ).toBeTruthy();
  expect(getByText('ID: CON-10482')).toBeTruthy();
  expect(getByText('Psychiatry')).toBeTruthy();
  expect(getByText('Moderate')).toBeTruthy();
  expect(getByText('Generalised Anxiety Disorder')).toBeTruthy();
  expect(getByText('Write your case summary here...')).toBeTruthy();
  expect(getByText('0/1000')).toBeTruthy();
  expect(getByText('Submit Summary & Complete')).toBeTruthy();
});

test('the four checklist rows are exactly those specified', () => {
  const { getByText } = render(<CaseSummaryScreen appointment={appt} onBack={noop} />);

  ['Clinical notes completed', 'Prescription or advice finalised', 'Follow-up plan assigned', 'Case summary'].forEach(
    (l) => expect(getByText(l)).toBeTruthy()
  );
});

/* -------------------------- consultation room ----------------------------- */

test('the room shows the patient at the agreed age, not the old fixture', () => {
  const { getByText } = render(<ConsultationRoomScreen appointment={appt} onBack={noop} />);
  expect(getByText('32 years · Male')).toBeTruthy();
  expect(getByText('CON-10482')).toBeTruthy();
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
