import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, within } from '@testing-library/react-native';

import ClinicalNotesScreen from './ClinicalNotesScreen';
import EPrescriptionScreen from './EPrescriptionScreen';
import ClinicalTemplatesScreen from './ClinicalTemplatesScreen';
import CaseSummaryScreen from './CaseSummaryScreen';
import { getState } from '../../state/store';
import { selectAppointment, selectRecord } from '../../state/selectors';
import { assignPlan, finaliseRx, saveNotes, setRisk, updateNote } from '../../state/actions';
import { NOTE_FIELDS } from '../../data/clinical';

const noop = () => undefined;
const appt = () => selectAppointment(getState(), 'a1')!;
const record = () => selectRecord(getState(), 'a1');

const notes = (over: Partial<Record<string, jest.Mock>> = {}) =>
  render(
    <ClinicalNotesScreen
      appointment={appt()}
      onBack={noop}
      onSaved={over.onSaved ?? jest.fn()}
      onViewProfile={noop}
      onReferForClarification={noop}
      onOpenCaseSummary={noop}
    />
  );

const prescription = (professionalType?: 'psychiatrist' | 'psychologist' | 'counsellor', onFinalised = jest.fn()) =>
  render(
    <EPrescriptionScreen
      appointment={appt()}
      onBack={noop}
      professionalType={professionalType}
      onFinalised={onFinalised}
      onLoadTemplate={noop}
      onPreview={noop}
      onRecommendResources={noop}
      onOpenNotes={noop}
    />
  );

const completeNotes = () => {
  NOTE_FIELDS.forEach((f) => updateNote('a1', f.key, `${f.label} written by the doctor.`));
  setRisk('a1', { category: 'moderate' });
  saveNotes('a1');
};

/* ------------------------------- notes · CLN-01 ----------------------------- */

test('every clinical field is a real, empty input — nothing is pre-written', () => {
  notes();
  NOTE_FIELDS.forEach((f) => expect(screen.getByTestId(`note-${f.key}`).props.value).toBe(''));
  expect(screen.getByTestId('notes-status')).toHaveTextContent('Not started');
  expect(screen.queryByText('Autosaved')).toBeNull();
});

test('typing saves a draft to this consultation’s record, and says so', () => {
  notes();
  fireEvent.changeText(screen.getByTestId('note-complaint'), 'Low mood for six weeks.');
  expect(record().notes.complaint).toBe('Low mood for six weeks.');
  expect(screen.getByTestId('notes-status')).toHaveTextContent(/^Draft saved/);
});

test('saving names every missing required field and does not move on', () => {
  const onSaved = jest.fn();
  notes({ onSaved });
  fireEvent.press(screen.getByTestId('save-notes'));
  expect(onSaved).not.toHaveBeenCalled();
  const missing = screen.getByTestId('notes-missing');
  ['Chief Complaint', 'Diagnosis', 'Follow-up Plan', 'Risk category'].forEach((l) => expect(missing).toHaveTextContent(new RegExp(l)));
});

test('a complete note saves and moves on to the next step', () => {
  const onSaved = jest.fn();
  notes({ onSaved });
  NOTE_FIELDS.forEach((f) => fireEvent.changeText(screen.getByTestId(`note-${f.key}`), `${f.label} text.`));
  fireEvent.press(screen.getByTestId('risk-high'));
  fireEvent.press(screen.getByTestId('save-notes'));
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(record().notesStatus).toBe('saved');
  expect(record().risk.category).toBe('high');
});

test('notes survive leaving the screen and coming back', () => {
  const first = notes();
  fireEvent.changeText(screen.getByTestId('note-diagnosis'), 'Generalised anxiety disorder, provisional.');
  first.unmount();
  notes();
  expect(screen.getByTestId('note-diagnosis').props.value).toBe('Generalised anxiety disorder, provisional.');
});

test('notes are read-only once the consultation is completed', () => {
  completeNotes();
  finaliseRx('a1');
  assignPlan('a1', { pathway: 'depressionAnxiety', duration: 14, start: '2026-05-16' } as never);
  // submitting closes it
  require('../../state/actions').setSummary('a1', 'x'.repeat(200));
  require('../../state/actions').submitSummary('a1');
  notes();
  expect(screen.getByTestId('note-complaint').props.editable).toBe(false);
  expect(screen.queryByTestId('save-notes')).toBeNull();
  expect(screen.getByTestId('notes-status')).toHaveTextContent('Completed · read-only');
});

/* ------------------------- prescription · CLN-02 ------------------------- */

test('a psychiatrist adds a medicine through the form, and it is validated', () => {
  prescription('psychiatrist');
  expect(screen.getByTestId('no-medicines')).toBeTruthy();

  fireEvent.press(screen.getByTestId('add-medicine'));
  fireEvent.press(screen.getByTestId('medicine-confirm'));
  // nothing is added until the required fields are filled
  expect(screen.getByTestId('medicine-missing')).toBeTruthy();
  expect(record().medicines).toHaveLength(0);

  fireEvent.changeText(screen.getByTestId('med-name'), 'Sertraline');
  fireEvent.changeText(screen.getByTestId('med-dose'), '50 mg');
  fireEvent.changeText(screen.getByTestId('med-duration'), '30 days');
  fireEvent.press(screen.getByTestId('med-frequency'));
  fireEvent.press(screen.getByTestId('med-frequency-Once daily'));
  fireEvent.press(screen.getByTestId('med-frequency-done'));
  fireEvent.press(screen.getByTestId('medicine-confirm'));

  expect(record().medicines).toHaveLength(1);
  const m = record().medicines[0];
  expect(m.id).toMatch(/^med_\d{3}$/);
  expect(within(screen.getByTestId(`medicine-${m.id}`)).getByText('Sertraline')).toBeTruthy();
});

test('a medicine can be edited and, after confirming, removed', () => {
  require('../../state/actions').addMedicine('a1', { name: 'Escitalopram', generic: '', dose: '5 mg', frequency: 'Once daily', duration: '14 days', route: 'After food', quantity: '', instruction: '' });
  prescription('psychiatrist');
  const id = record().medicines[0].id;

  fireEvent.press(screen.getByTestId(`med-menu-${id}`));
  fireEvent.press(screen.getByTestId('sheet-action-edit'));
  expect(screen.getByTestId('med-dose').props.value).toBe('5 mg');
  fireEvent.changeText(screen.getByTestId('med-dose'), '10 mg');
  fireEvent.press(screen.getByTestId('medicine-confirm'));
  expect(record().medicines[0].dose).toBe('10 mg');
  expect(record().medicines[0].id).toBe(id);

  fireEvent.press(screen.getByTestId(`med-menu-${id}`));
  fireEvent.press(screen.getByTestId('sheet-action-remove'));
  expect(Alert.alert).toHaveBeenLastCalledWith('Remove Escitalopram?', expect.any(String), expect.any(Array), expect.any(Object));
  expect(record().medicines).toHaveLength(0);
});

test('finalising needs something to issue, asks first, then locks the prescription', () => {
  const onFinalised = jest.fn();
  // a new prescription starts blank: no medicines, advice or don'ts (N14)
  expect([record().medicines, record().advice, record().donts]).toEqual([[], [], []]);
  prescription('psychiatrist', onFinalised);
  fireEvent.press(screen.getByTestId('finalise'));
  expect(onFinalised).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();

  fireEvent.changeText(screen.getByTestId('advice-input'), 'Keep a sleep diary for two weeks.');
  fireEvent.press(screen.getByTestId('advice-add'));
  fireEvent.press(screen.getByTestId('finalise'));
  expect(Alert.alert).toHaveBeenLastCalledWith('Finalise prescription?', expect.any(String), expect.any(Array), expect.any(Object));
  expect(onFinalised).toHaveBeenCalledTimes(1);
  expect(record().rxStatus).toBe('finalised');
  expect(screen.getByTestId('rx-locked')).toBeTruthy();
  expect(screen.queryByTestId('add-medicine')).toBeNull();
});

test('Save Draft stamps the prescription without finalising it', () => {
  prescription('psychiatrist');
  fireEvent.press(screen.getByTestId('save-draft'));
  expect(record().rxSavedAt).toBeTruthy();
  expect(record().rxStatus).toBe('draft');
});

test('a non-prescriber gets an advice and therapy plan, never medicines', () => {
  (['psychologist', 'counsellor'] as const).forEach((t) => {
    const r = prescription(t);
    expect(screen.getByText('Therapy Plan')).toBeTruthy();
    expect(screen.getByTestId('no-prescribe')).toBeTruthy();
    expect(screen.queryByTestId('add-medicine')).toBeNull();
    r.unmount();
  });
});

/* ---------------------------- templates · CLN-03 --------------------------- */

test('a non-prescriber never sees a medication template', () => {
  render(<ClinicalTemplatesScreen onBack={noop} onApply={noop} professionalType="counsellor" />);
  expect(screen.queryByText('Anxiety Initial Care')).toBeNull();
  expect(screen.getByTestId('no-medication-templates')).toBeTruthy();
  expect(screen.getByText('Low Mood Check-in')).toBeTruthy();
});

test('a template is applied, duplicated, or — for the doctor’s own — deleted after confirming', () => {
  const onApply = jest.fn();
  render(<ClinicalTemplatesScreen onBack={noop} onApply={onApply} professionalType="psychiatrist" />);

  fireEvent.press(screen.getByTestId('template-tpl1'));
  expect(onApply).toHaveBeenCalledWith('tpl1');

  fireEvent.press(screen.getByTestId('template-menu-tpl1'));
  fireEvent.press(screen.getByTestId('sheet-action-duplicate'));
  expect(screen.getByText('Anxiety Initial Care (Copy)')).toBeTruthy();

  fireEvent.press(screen.getByTestId('template-menu-tpl2'));
  fireEvent.press(screen.getByTestId('sheet-action-delete'));
  expect(Alert.alert).toHaveBeenCalled();
  expect(screen.queryByText('Sleep Support Plan')).toBeNull();
});

test('applying a template fills the prescription draft and finalises nothing', () => {
  require('../../state/actions').applyTemplate('a1', 'tpl1');
  expect(record().medicines.length).toBeGreaterThan(0);
  expect(record().rxStatus).toBe('draft');
});

/* ----------------------- case summary · CLN-04 and 06 ----------------------- */

const summary = (onSubmitted = jest.fn()) =>
  render(
    <CaseSummaryScreen
      appointment={appt()}
      onBack={noop}
      onSubmitted={onSubmitted}
      onOpenNotes={noop}
      onOpenPrescription={noop}
      onAssignPlan={noop}
    />
  );

test('the summary is the doctor’s own words, saved as they type', () => {
  summary();
  expect(screen.getByTestId('summary-input').props.value).toBe('');
  fireEvent.changeText(screen.getByTestId('summary-input'), 'Short.');
  expect(record().summary).toBe('Short.');
  expect(screen.getByTestId('summary-short')).toBeTruthy();
});

test('submitting is blocked, with the reasons shown, until the checklist is complete', () => {
  const onSubmitted = jest.fn();
  summary(onSubmitted);
  fireEvent.changeText(screen.getByTestId('summary-input'), 'A'.repeat(160));
  fireEvent.press(screen.getByTestId('submit-summary'));
  expect(onSubmitted).not.toHaveBeenCalled();
  expect(screen.getByTestId('summary-blocked')).toHaveTextContent(/clinical notes completed/);
  expect(screen.getByTestId('fix-followUpAssigned')).toBeTruthy();
  // the work written so far is kept
  expect(record().summary).toHaveLength(160);
});

test('with notes, prescription and plan done, submitting asks, then completes the consultation', () => {
  completeNotes();
  require('../../state/actions').addMedicine('a1', { name: 'Escitalopram', generic: '', dose: '5 mg', frequency: 'Once daily', duration: '14 days', route: 'After food', quantity: '', instruction: '' });
  finaliseRx('a1');
  assignPlan('a1', { pathway: 'depressionAnxiety', duration: 14, start: '2026-05-16' } as never);

  const onSubmitted = jest.fn();
  summary(onSubmitted);
  ['notesFinalised', 'outputFinalised', 'followUpAssigned'].forEach((k) =>
    expect(within(screen.getByTestId(`check-${k}`)).getByText('Done')).toBeTruthy()
  );
  fireEvent.changeText(screen.getByTestId('summary-input'), 'Anxiety with poor sleep; moderate risk; escitalopram started; review in two weeks. '.repeat(2));
  fireEvent.press(screen.getByTestId('submit-summary'));
  expect(Alert.alert).toHaveBeenLastCalledWith('Submit summary and complete?', expect.any(String), expect.any(Array), expect.any(Object));
  expect(onSubmitted).toHaveBeenCalledTimes(1);
  expect(record().summaryStatus).toBe('submitted');
});
