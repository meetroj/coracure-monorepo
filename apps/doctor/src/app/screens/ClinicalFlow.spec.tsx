import React from 'react';
import { doctorClinicalRecordApi } from '@coracure/api';
import { ApiError } from '@coracure/api/errors';
import { confirm, confirmDiscard } from '../../components/confirm';
import { render, fireEvent, screen, within, waitFor } from '@testing-library/react-native';

import ClinicalNotesScreen from './ClinicalNotesScreen';
import EPrescriptionScreen from './EPrescriptionScreen';
import ClinicalTemplatesScreen from './ClinicalTemplatesScreen';
import CaseSummaryScreen from './CaseSummaryScreen';
import { getState } from '../../state/store';
import { selectAppointment, selectRecord } from '../../state/selectors';
import { assignPlan, finaliseRx, saveNotes, setRisk, updateNote } from '../../state/actions';
import { noteFieldsFor } from '../../data/clinical';

const NOTE_FIELDS = noteFieldsFor('psychiatrist');

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

/** A summary within the backend's 3–5 line rule. */
const THREE_LINES = 'Anxiety with poor sleep.\nModerate risk.\nEscitalopram started; review in two weeks.';

beforeEach(() => {
  // Nothing saved yet on the server: the screens keep the local record.
  jest
    .spyOn(doctorClinicalRecordApi, 'getClinicalRecord')
    .mockRejectedValue(new ApiError({ statusCode: 404, code: 'RECORD_NOT_FOUND', message: 'No record yet.' }));
  jest.spyOn(doctorClinicalRecordApi, 'saveClinicalRecord').mockResolvedValue({} as never);
  jest.spyOn(doctorClinicalRecordApi, 'finaliseClinicalRecord').mockResolvedValue({} as never);
});

/* ------------------------------- notes · CLN-01 ----------------------------- */

test('every clinical field is a real, empty input — nothing is pre-written', () => {
  notes();
  NOTE_FIELDS.forEach((f) => expect(screen.getByTestId(`note-${f.key}`).props.value).toBe(''));
  expect(screen.getByTestId('notes-status')).toHaveTextContent('Not started');
  expect(screen.queryByText('Autosaved')).toBeNull();
});

test('typing keeps a draft on this consultation’s record, and does not claim a server save', () => {
  notes();
  fireEvent.changeText(screen.getByTestId('note-complaint'), 'Low mood for six weeks.');
  expect(record().notes.complaint).toBe('Low mood for six weeks.');
  expect(screen.getByTestId('notes-status')).toHaveTextContent('Unsaved changes');
});

test('saving names every missing required field and does not move on', () => {
  const onSaved = jest.fn();
  notes({ onSaved });
  fireEvent.press(screen.getByTestId('save-notes'));
  expect(onSaved).not.toHaveBeenCalled();
  const missing = screen.getByTestId('notes-missing');
  ['Chief Complaint', 'Provisional Diagnosis', 'Risk category'].forEach((l) => expect(missing).toHaveTextContent(new RegExp(l)));
});

test('a complete note saves to the real record and moves on to the next step', async () => {
  const onSaved = jest.fn();
  notes({ onSaved });
  NOTE_FIELDS.forEach((f) => fireEvent.changeText(screen.getByTestId(`note-${f.key}`), `${f.label} text.`));
  fireEvent.press(screen.getByTestId('risk-high'));
  fireEvent.press(screen.getByTestId('save-notes'));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  // keyed by the real consultation id (`a.id`), never the human reference code
  expect(doctorClinicalRecordApi.saveClinicalRecord).toHaveBeenCalledWith(
    'a1',
    expect.objectContaining({ chiefComplaint: 'Chief Complaint text.', riskCategory: 'high' })
  );
  expect(record().notesStatus).toBe('saved');
  expect(record().risk.category).toBe('high');
});

test('a refused save keeps the notes as typed and does not move on', async () => {
  (doctorClinicalRecordApi.saveClinicalRecord as jest.Mock).mockRejectedValueOnce(
    new ApiError({ statusCode: 409, code: 'NOT_DOCUMENTABLE', message: 'This consultation cannot be documented yet.' })
  );
  const onSaved = jest.fn();
  notes({ onSaved });
  NOTE_FIELDS.forEach((f) => fireEvent.changeText(screen.getByTestId(`note-${f.key}`), `${f.label} text.`));
  fireEvent.press(screen.getByTestId('risk-low'));
  fireEvent.press(screen.getByTestId('save-notes'));
  await waitFor(() => expect(doctorClinicalRecordApi.saveClinicalRecord).toHaveBeenCalled());
  expect(onSaved).not.toHaveBeenCalled();
  expect(record().notesStatus).not.toBe('saved');
  expect(record().notes.complaint).toBe('Chief Complaint text.');
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
  expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Remove Escitalopram?' }));
  expect(record().medicines).toHaveLength(0);
});

test('finalising needs something to issue, asks first, saves, then locks the prescription', async () => {
  const onFinalised = jest.fn();
  // a new prescription starts blank: no medicines, advice or don'ts (N14)
  expect([record().medicines, record().advice, record().donts]).toEqual([[], [], []]);
  completeNotes();
  prescription('psychiatrist', onFinalised);
  fireEvent.press(screen.getByTestId('finalise'));
  expect(onFinalised).not.toHaveBeenCalled();
  expect(confirm).not.toHaveBeenCalled();
  expect(confirmDiscard).not.toHaveBeenCalled();

  fireEvent.changeText(screen.getByTestId('advice-input'), 'Keep a sleep diary for two weeks.');
  fireEvent.press(screen.getByTestId('advice-add'));
  fireEvent.press(screen.getByTestId('finalise'));
  expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Finalise prescription?' }));
  await waitFor(() => expect(onFinalised).toHaveBeenCalledTimes(1));
  expect(record().rxStatus).toBe('finalised');
  expect(screen.getByTestId('rx-locked')).toBeTruthy();
  expect(screen.queryByTestId('add-medicine')).toBeNull();
  // Saved, NOT locked on the server: the one lock is the case summary submit.
  expect(doctorClinicalRecordApi.saveClinicalRecord).toHaveBeenCalledWith(
    'a1',
    expect.objectContaining({ adviceCovered: 'Keep a sleep diary for two weeks.' })
  );
  expect(doctorClinicalRecordApi.finaliseClinicalRecord).not.toHaveBeenCalled();
});

test('Save Draft persists the whole record — the notes ride along — without finalising it', async () => {
  completeNotes();
  prescription('psychiatrist');
  fireEvent.press(screen.getByTestId('save-draft'));
  await waitFor(() => expect(record().rxSavedAt).toBeTruthy());
  expect(record().rxStatus).toBe('draft');
  // a PUT is a full replace: saving from here must still carry the notes
  expect(doctorClinicalRecordApi.saveClinicalRecord).toHaveBeenCalledWith(
    'a1',
    expect.objectContaining({ chiefComplaint: 'Chief Complaint written by the doctor.', riskCategory: 'moderate' })
  );
});

test('a prescription cannot be saved before the notes the backend requires exist', async () => {
  prescription('psychiatrist');
  fireEvent.press(screen.getByTestId('save-draft'));
  // refused locally with a plain reason, never sent as a request the server would 400
  await waitFor(() => expect(record().rxSavedAt).toBeUndefined());
  expect(doctorClinicalRecordApi.saveClinicalRecord).not.toHaveBeenCalled();
});

test('a non-prescriber gets a care plan, never medicines', () => {
  (['psychologist', 'counsellor'] as const).forEach((t) => {
    const r = prescription(t);
    expect(screen.getByText('Care Plan')).toBeTruthy();
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

test('tapping a template applies it', () => {
  // Duplicate and delete go to the server - see ClinicalTemplates.spec.tsx.
  const onApply = jest.fn();
  render(<ClinicalTemplatesScreen onBack={noop} onApply={onApply} professionalType="psychiatrist" />);

  fireEvent.press(screen.getByTestId('template-tpl1'));
  expect(onApply).toHaveBeenCalledWith('tpl1');
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

test('once notes are saved, the summary drafts itself from the record', () => {
  completeNotes();
  summary();
  const drafted = screen.getByTestId('summary-input').props.value;
  expect(drafted).toMatch(/^Chief Complaint written by the doctor\./);
  // one point per line — the backend counts lines, not characters
  expect(drafted).toMatch(/\nDiagnosis: Provisional Diagnosis written by the doctor\.\n/);
  // notes typed with their own full stops never come out doubled
  expect(drafted).not.toMatch(/\.\./);
  expect(record().summary).toBe(drafted);
});

test('ending a call keeps how long it ran on the record', () => {
  require('../../state/actions').endCall('a1', 125);
  expect(record().durationSeconds).toBe(125);
});

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
  fireEvent.changeText(screen.getByTestId('summary-input'), THREE_LINES);
  fireEvent.press(screen.getByTestId('submit-summary'));
  expect(onSubmitted).not.toHaveBeenCalled();
  expect(screen.getByTestId('summary-blocked')).toHaveTextContent(/clinical notes completed/);
  // the follow-up plan never blocks: the backend refuses it until the record is finalised
  expect(screen.getByTestId('summary-blocked')).not.toHaveTextContent(/follow-up/i);
  expect(screen.queryByTestId('fix-followUpAssigned')).toBeNull();
  // the work written so far is kept
  expect(record().summary).toBe(THREE_LINES);
});

test('one long paragraph is refused: the summary is counted in lines, not characters', () => {
  summary();
  fireEvent.changeText(screen.getByTestId('summary-input'), 'A'.repeat(400));
  expect(screen.getByTestId('summary-short')).toHaveTextContent(/2 more lines needed/);
});

const readyToSubmit = () => {
  completeNotes();
  require('../../state/actions').addMedicine('a1', { name: 'Escitalopram', generic: '', dose: '5 mg', frequency: 'Once daily', duration: '14 days', route: 'After food', quantity: '', instruction: '' });
  finaliseRx('a1');
};

test('with notes and prescription done — no follow-up plan yet — submitting saves, locks the record, then completes', async () => {
  readyToSubmit();
  const onSubmitted = jest.fn();
  summary(onSubmitted);
  ['notesFinalised', 'outputFinalised'].forEach((k) =>
    expect(within(screen.getByTestId(`check-${k}`)).getByText('Done')).toBeTruthy()
  );
  expect(within(screen.getByTestId('check-followUpAssigned')).getByText('After submit')).toBeTruthy();
  fireEvent.changeText(screen.getByTestId('summary-input'), THREE_LINES);
  fireEvent.press(screen.getByTestId('submit-summary'));
  expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Submit summary and complete?' }));
  await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
  expect(record().summaryStatus).toBe('submitted');
  expect(doctorClinicalRecordApi.saveClinicalRecord).toHaveBeenCalledWith('a1', expect.objectContaining({ caseSummary: THREE_LINES }));
  expect(doctorClinicalRecordApi.finaliseClinicalRecord).toHaveBeenCalledWith('a1');
  // assigning the plan is now possible, and offered
  expect(screen.getByTestId('fix-followUpAssigned')).toBeTruthy();
});

test('when the backend refuses to finalise, its own reasons are shown and nothing is closed', async () => {
  (doctorClinicalRecordApi.finaliseClinicalRecord as jest.Mock).mockRejectedValueOnce(
    new ApiError({
      statusCode: 409,
      code: 'RECORD_INCOMPLETE',
      message: 'The record is incomplete.',
      details: { outstanding: [{ code: 'CASE_SUMMARY_TOO_SHORT', message: 'The case summary needs at least 3 lines.' }] },
    })
  );
  readyToSubmit();
  const onSubmitted = jest.fn();
  summary(onSubmitted);
  fireEvent.changeText(screen.getByTestId('summary-input'), THREE_LINES);
  fireEvent.press(screen.getByTestId('submit-summary'));
  await waitFor(() =>
    expect(screen.getByTestId('summary-server-outstanding')).toHaveTextContent('The case summary needs at least 3 lines.')
  );
  expect(onSubmitted).not.toHaveBeenCalled();
  expect(record().summaryStatus).not.toBe('submitted');
});

/* --------------------- server record vs newer local edits -------------------- */

const REAL = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const SERVER_VIEW = {
  consultationId: REAL,
  chiefComplaint: 'From the server',
  clinicalHistory: null,
  diagnosis: null,
  isDiagnosisProvisional: true,
  riskCategory: 'low',
  referralNote: null,
  referralAdvised: false,
  medicines: [],
  advice: { covered: null, homePractice: null, nextFocus: null, warningSigns: null },
  caseSummary: null,
  recommendedContentIds: [],
  finalisedAt: null,
  canPrescribe: true,
  outstanding: [],
  updatedAt: '2026-05-15T00:00:00.000Z',
};

const realNotes = () =>
  render(
    <ClinicalNotesScreen
      appointment={{ ...appt(), id: REAL }}
      onBack={noop}
      onSaved={noop}
      onViewProfile={noop}
      onReferForClarification={noop}
      onOpenCaseSummary={noop}
    />
  );

test('the server record is laid over once; re-opening never overwrites newer local edits with the cached copy', async () => {
  (doctorClinicalRecordApi.getClinicalRecord as jest.Mock).mockResolvedValue(SERVER_VIEW);
  const first = realNotes();
  await waitFor(() => expect(screen.getByTestId('note-complaint').props.value).toBe('From the server'));
  fireEvent.changeText(screen.getByTestId('note-complaint'), 'Edited on this device');
  first.unmount();

  realNotes();
  await waitFor(() => expect(doctorClinicalRecordApi.getClinicalRecord).toHaveBeenCalled());
  expect(screen.getByTestId('note-complaint').props.value).toBe('Edited on this device');
});

test('a save caches the server’s answer, so the next open starts from it', async () => {
  const saved = { ...SERVER_VIEW, chiefComplaint: 'Saved text' };
  (doctorClinicalRecordApi.saveClinicalRecord as jest.Mock).mockResolvedValue(saved);
  updateNote(REAL, 'complaint', 'Saved text');
  setRisk(REAL, { category: 'low' });
  await require('../../data/clinicalRecord').saveWriteUp(REAL, true);
  realNotes();
  // the cache answered: no GET, and nothing laid over the local record
  expect(doctorClinicalRecordApi.getClinicalRecord).not.toHaveBeenCalled();
  expect(screen.getByTestId('note-complaint').props.value).toBe('Saved text');
});
