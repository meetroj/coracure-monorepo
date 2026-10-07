import type { PendingDocumentation } from '@coracure/api';

import { appointments } from '../data/doctor';
import { resetStore, getState } from './store';
import { saveNotes, setRisk, updateNote } from './actions';
import { selectCases, selectTasks, writeUpStep } from './selectors';

const ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
/** A real consultation, held and finished, nothing written on this device. */
const held = { ...appointments.find((a) => a.id === 'a2')!, id: ID, state: 'completed' as const };

const pending = (over: Partial<PendingDocumentation> = {}): PendingDocumentation => ({
  consultationId: ID,
  referenceCode: 'CC-10459',
  scheduledStartAt: null,
  status: 'awaiting_documentation',
  startedAt: '2026-05-15T10:00:00.000Z',
  outstanding: [],
  ...over,
});

const withServer = (list: PendingDocumentation[]) => resetStore({ appointments: [held], pendingDocumentation: list });
const caseOf = () => selectCases(getState()).find((c) => c.appointmentId === ID)!;
const taskOf = () => selectTasks(getState()).find((t) => t.appointmentId === ID);

test('a consultation the server has written up reads as complete, though nothing was written here', () => {
  withServer([]);
  expect(writeUpStep(getState(), held)).toBe(3);
  expect(caseOf()).toMatchObject({ state: 'complete', docsDone: 3, prescriptionFinalised: true, summarySubmitted: true });
  expect(taskOf()).toBeUndefined();
});

test('nothing saved on the server yet is a notes task', () => {
  withServer([pending({ startedAt: null })]);
  expect(taskOf()).toMatchObject({ category: 'note' });
  expect(caseOf()).toMatchObject({ state: 'pending', docsDone: 0 });
});

test('a missing prescription or advice is a prescription task; only the summary left is a summary task', () => {
  withServer([pending({ outstanding: [{ code: 'PRESCRIPTION_OR_ADVICE_MISSING', message: 'x' }] })]);
  expect(taskOf()).toMatchObject({ category: 'prescription' });
  expect(caseOf().docsDone).toBe(1);

  withServer([pending({ outstanding: [{ code: 'CASE_SUMMARY_MISSING', message: 'x' }] })]);
  expect(taskOf()).toMatchObject({ category: 'summary' });
  expect(caseOf()).toMatchObject({ docsDone: 2, prescriptionFinalised: true });
});

test('this device is trusted when it is further along than the last server read', () => {
  withServer([pending({ startedAt: null })]);
  updateNote(ID, 'complaint', 'Low mood');
  setRisk(ID, { category: 'low' });
  saveNotes(ID);
  // saved here a moment ago; the pending list has not been read again yet
  expect(taskOf()).toMatchObject({ category: 'prescription' });
});
