import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';

import ClinicalNotesScreen from './ClinicalNotesScreen';
import EPrescriptionScreen from './EPrescriptionScreen';
import ClinicalTemplatesScreen from './ClinicalTemplatesScreen';
import CaseSummaryScreen from './CaseSummaryScreen';
import { appointments } from '../../data/doctor';
import { draftMedicines } from '../../data/clinical';

const noop = () => undefined;
const appt = appointments.find((a) => a.id === 'a1')!;

/* --------------------------- notes · DOC-CLN-01 --------------------------- */

test('every required clinical field is present and flagged', () => {
  const { getByText, getAllByText } = render(
    <ClinicalNotesScreen appointment={appt} onBack={noop} />
  );

  [
    'Chief Complaint',
    'Brief Clinical History',
    'Observations',
    'Diagnosis',
    'Risk Assessment',
    'Advice or Treatment Plan',
    'Follow-up Plan',
  ].forEach((l) => expect(getByText(l)).toBeTruthy());

  // all seven are mandatory
  expect(getAllByText('Required')).toHaveLength(7);
});

test('risk accepts low, moderate or high, and moderate is the starting value', () => {
  const { getByTestId, getByText } = render(
    <ClinicalNotesScreen appointment={appt} onBack={noop} />
  );

  fireEvent.press(getByTestId('section-risk'));
  ['Low', 'Moderate', 'High'].forEach((l) => expect(getByText(l)).toBeTruthy());

  const onSave = jest.fn();
  const saved = render(<ClinicalNotesScreen appointment={appt} onBack={noop} onSave={onSave} />);
  saved.getByTestId('section-risk') && fireEvent.press(saved.getByTestId('section-risk'));
  fireEvent.press(saved.getByTestId('risk-high'));
  fireEvent.press(saved.getByTestId('save-notes'));
  expect(onSave).toHaveBeenCalledWith('high');
});

test('notes offer a way through to the case summary', () => {
  const { getByTestId, getByText } = render(<ClinicalNotesScreen appointment={appt} onBack={noop} />);
  // the consultation-link notice was removed by request; a direct case
  // summary entry point replaced it
  expect(getByTestId('open-case-summary')).toBeTruthy();
  expect(getByText('Case Summary')).toBeTruthy();
});

/* ------------------------ prescription · DOC-CLN-02 ----------------------- */

test('a psychiatrist gets medicine entry', () => {
  const { getByText, queryByTestId } = render(
    <EPrescriptionScreen appointment={appt} onBack={noop} professionalType="psychiatrist" />
  );

  expect(getByText('E-Prescription')).toBeTruthy();
  expect(getByText('Medications')).toBeTruthy();
  expect(getByText('Escitalopram 5 mg')).toBeTruthy();
  expect(getByText('Clonazepam 0.25 mg')).toBeTruthy();
  expect(getByText('Finalise Prescription')).toBeTruthy();
  expect(queryByTestId('no-prescribe')).toBeNull();
});

test('a non-prescriber cannot save medicines and gets an advice plan', () => {
  (['psychologist', 'therapist', 'counsellor'] as const).forEach((t) => {
    const { getByText, getByTestId, queryByText } = render(
      <EPrescriptionScreen appointment={appt} onBack={noop} professionalType={t} />
    );

    expect(getByText('Therapy Plan')).toBeTruthy();
    expect(getByTestId('no-prescribe')).toBeTruthy();
    expect(queryByText('Medications')).toBeNull();
    // no medicine may appear anywhere on the screen
    draftMedicines.forEach((m) => expect(queryByText(m.name)).toBeNull());
    expect(getByText('Finalise Advice & Therapy Plan')).toBeTruthy();
  });
});

test("the Don'ts section covers self-harm and serious reactions", () => {
  const { getByText } = render(
    <EPrescriptionScreen appointment={appt} onBack={noop} />
  );

  // renamed from Warning Signs to a Don't framing, by request
  expect(getByText("Don'ts")).toBeTruthy();
  expect(
    getByText("Don't ignore thoughts of self-harm — contact your doctor or a helpline immediately.")
  ).toBeTruthy();
  expect(
    getByText("Don't continue the medicine if you notice rash, swelling, severe drowsiness or any serious reaction.")
  ).toBeTruthy();
});

test('finalising is a distinct, irreversible action', () => {
  const onFinalise = jest.fn();
  const { getByTestId, getByText } = render(
    <EPrescriptionScreen appointment={appt} onBack={noop} onFinalise={onFinalise} />
  );

  // the explanatory caption was removed from the screen; what must survive is
  // that finalising is its own control, labelled for the professional's output
  expect(getByText('Finalise Prescription')).toBeTruthy();
  fireEvent.press(getByTestId('finalise'));
  expect(onFinalise).toHaveBeenCalledTimes(1);

  // and that it is not the same control as Save Draft
  expect(getByText('Save Draft')).toBeTruthy();
});

/* -------------------------- templates · DOC-CLN-03 ------------------------ */

test('a non-prescriber never sees a medication template or its filter', () => {
  const { queryByText, queryByTestId, getByTestId } = render(
    <ClinicalTemplatesScreen onBack={noop} professionalType="counsellor" />
  );

  expect(queryByText('Anxiety Initial Care')).toBeNull();
  expect(queryByText('Sleep Support Plan')).toBeNull();
  expect(queryByTestId('filter-medication')).toBeNull();
  expect(getByTestId('no-medication-templates')).toBeTruthy();
  // the non-medication ones are still offered
  expect(queryByText('Low Mood Check-in')).toBeTruthy();
});

test('a prescriber sees the full set and can filter it', () => {
  const { getByText, getByTestId, queryByText } = render(
    <ClinicalTemplatesScreen onBack={noop} professionalType="psychiatrist" />
  );

  expect(getByText('Anxiety Initial Care')).toBeTruthy();
  expect(getByText('Therapy Session Follow-up')).toBeTruthy();

  fireEvent.press(getByTestId('filter-medication'));
  expect(getByText('Anxiety Initial Care')).toBeTruthy();
  expect(queryByText('Therapy Session Follow-up')).toBeNull();
});

test('applying a template does not finalise anything', () => {
  const onApply = jest.fn();
  const { getByTestId } = render(
    <ClinicalTemplatesScreen onBack={noop} onApply={onApply} professionalType="psychiatrist" />
  );

  fireEvent.press(getByTestId('template-tpl1'));
  expect(onApply).toHaveBeenCalledWith('tpl1');
});

/* ------------------- case summary · DOC-CLN-04 and 06 --------------------- */

test('the summary is mandatory: submit stays disabled until it is written', () => {
  const onSubmit = jest.fn();
  const { getByTestId, getByText } = render(
    <CaseSummaryScreen appointment={appt} onBack={noop} onSubmit={onSubmit} />
  );

  expect(getByText('0/1000')).toBeTruthy();
  fireEvent.press(getByTestId('submit-summary'));
  expect(onSubmit).not.toHaveBeenCalled();

  // the case summary checklist row is pending until it is written
  expect(within(getByTestId('check-summarySubmitted')).getByText('Pending')).toBeTruthy();

  fireEvent.press(getByTestId('summary-input'));
  fireEvent.press(getByTestId('submit-summary'));
  expect(onSubmit).toHaveBeenCalled();
});

test('entering the summary clears it from the checklist without discarding work', () => {
  const { getByTestId } = render(<CaseSummaryScreen appointment={appt} onBack={noop} />);

  expect(within(getByTestId('check-summarySubmitted')).getByText('Pending')).toBeTruthy();
  fireEvent.press(getByTestId('summary-input'));
  expect(within(getByTestId('check-summarySubmitted')).getByText('Done')).toBeTruthy();
});

test('the checklist reflects the real completion state', () => {
  const { getByText, getByTestId } = render(
    <CaseSummaryScreen
      appointment={appt}
      onBack={noop}
      completion={{
        notesFinalised: true,
        outputFinalised: false,
        followUpAssigned: true,
        summarySubmitted: false,
      }}
    />
  );

  expect(getByText('Clinical notes completed')).toBeTruthy();
  expect(getByText('Prescription or advice finalised')).toBeTruthy();
  expect(within(getByTestId('check-outputFinalised')).getByText('Pending')).toBeTruthy();

  // even a written summary cannot close it while the prescription is missing
  fireEvent.press(getByTestId('summary-input'));
  expect(within(getByTestId('check-outputFinalised')).getByText('Pending')).toBeTruthy();
});
