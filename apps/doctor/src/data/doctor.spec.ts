import {
  isAutoStatus,
  acceptsInstantRequests,
  isClinicallyComplete,
  type LiveStatus,
  type PatientCase,
} from './doctor';

/**
 * The "completing notes blocks new instant requests" rule used to be covered
 * through a simulate link on the dashboard. That affordance is gone, so the
 * rule is asserted directly against the domain helpers instead of relying on
 * a UI shortcut to reach a system-driven state.
 */
test('only Available Now accepts instant consultation requests', () => {
  expect(acceptsInstantRequests('available')).toBe(true);
  (['offline', 'paused', 'scheduledOnly', 'requestPending', 'inConsultation', 'completingNotes'] as LiveStatus[]).forEach(
    (s) => expect(acceptsInstantRequests(s)).toBe(false)
  );
});

test('completing notes is system-controlled and blocks instant requests', () => {
  expect(isAutoStatus('completingNotes')).toBe(true);
  expect(acceptsInstantRequests('completingNotes')).toBe(false);
});

test('manually selectable statuses are not system-controlled', () => {
  (['available', 'offline', 'paused', 'scheduledOnly'] as LiveStatus[]).forEach((s) =>
    expect(isAutoStatus(s)).toBe(false)
  );
});

const baseCase: PatientCase = {
  id: 'x',
  caseId: 'COR-1',
  initials: 'XY',
  name: 'Test Patient',
  dateLabel: '15 May',
  age: 40,
  gender: 'Male',
  concern: 'Test',
  state: 'pending',
  docsDone: 3,
  docsTotal: 3,
  prescriptionFinalised: false,
  summarySubmitted: false,
};

test('a case is clinically complete only with both advice and summary', () => {
  // full documents alone is not enough
  expect(isClinicallyComplete(baseCase)).toBe(false);
  expect(isClinicallyComplete({ ...baseCase, prescriptionFinalised: true })).toBe(false);
  expect(isClinicallyComplete({ ...baseCase, summarySubmitted: true })).toBe(false);
  expect(
    isClinicallyComplete({ ...baseCase, prescriptionFinalised: true, summarySubmitted: true })
  ).toBe(true);
});
