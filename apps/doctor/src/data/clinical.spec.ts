import {
  CASE_SUMMARY_MAX_LINES,
  CASE_SUMMARY_MIN_LINES,
  canPrescribe,
  emptyRecord,
  generateCaseSummary,
  summaryLineCount,
  noteFieldsFor,
  outputLabel,
  templatesFor,
  missingForCompletion,
  isClinicallyComplete,
  blocksInstantRequests,
  clinicalTemplates,
  type CompletionState,
  type ProfessionalType,
} from './clinical';

const ALL: ProfessionalType[] = ['psychiatrist', 'psychologist', 'therapist', 'counsellor'];
const done: CompletionState = {
  notesFinalised: true,
  outputFinalised: true,
  followUpAssigned: true,
  summarySubmitted: true,
};

/* ------------------------------ DOC-CLN-02 -------------------------------- */

test('only a psychiatrist may prescribe', () => {
  expect(canPrescribe('psychiatrist')).toBe(true);
  ['psychologist', 'therapist', 'counsellor'].forEach((t) =>
    expect(canPrescribe(t as ProfessionalType)).toBe(false)
  );
});

test('a non-prescriber produces a care plan instead', () => {
  expect(outputLabel('psychiatrist')).toBe('Prescription');
  expect(outputLabel('psychologist')).toBe('Care Plan');
  expect(outputLabel('counsellor')).toBe('Care Plan');
});

test('a doctor documents four clinical fields; a non-doctor three neutral ones and no diagnosis', () => {
  expect(noteFieldsFor('psychiatrist').map((f) => f.label)).toEqual([
    'Chief Complaint',
    'Brief Clinical History',
    'Observations',
    'Provisional Diagnosis',
  ]);
  expect(noteFieldsFor('psychologist').map((f) => f.label)).toEqual(['Presenting Concern', 'Relevant History', 'Assessment / Observations']);
});

test('the case summary is generated from the record; a non-doctor’s never names a diagnosis or medicine', () => {
  const r = {
    ...emptyRecord('x'),
    notes: { complaint: 'Low mood.', history: 'Six weeks.', observations: 'Tearful.', diagnosis: 'Depressive episode' },
    medicines: [{ id: 'm1', name: 'Sertraline 50 mg', generic: '', dose: '50 mg', frequency: 'Once daily', duration: '28 days', route: '', quantity: '', instruction: '' }],
    advice: ['Walk daily'],
    risk: { category: 'low' as const, selfHarm: 'denied' as const, referralAdvised: false },
  };
  expect(generateCaseSummary(r, 'psychiatrist')).toBe(
    'Low mood. Six weeks.\nTearful.\nDiagnosis: Depressive episode.\nStarted on Sertraline 50 mg. Advised: Walk daily.\nRisk assessed as low.'
  );
  expect(generateCaseSummary(r, 'psychologist')).toBe('Low mood. Six weeks.\nTearful.\nRecommended: Walk daily.\nRisk assessed as low.');
});

test('a drafted summary is always within the backend’s 3–5 line rule when the record is filled in', () => {
  const r = {
    ...emptyRecord('x'),
    notes: { complaint: 'A', history: 'B', observations: 'C', diagnosis: 'D' },
    medicines: [{ id: 'm1', name: 'X', generic: '', dose: '1', frequency: 'f', duration: 'd', route: '', quantity: '', instruction: '' }],
    advice: ['E'],
    risk: { category: 'low' as const, selfHarm: 'notAsked' as const, referralAdvised: false },
  };
  (['psychiatrist', 'psychologist'] as const).forEach((t) => {
    const n = summaryLineCount(generateCaseSummary(r, t));
    expect(n).toBeGreaterThanOrEqual(CASE_SUMMARY_MIN_LINES);
    expect(n).toBeLessThanOrEqual(CASE_SUMMARY_MAX_LINES);
  });
});

/* ------------------------------ DOC-CLN-03 -------------------------------- */

test('medication templates are hidden from non-prescribers entirely', () => {
  const withMeds = clinicalTemplates.filter((t) => t.medicines > 0);
  expect(withMeds.length).toBeGreaterThan(0);

  expect(templatesFor('psychiatrist')).toHaveLength(clinicalTemplates.length);

  ['psychologist', 'therapist', 'counsellor'].forEach((t) => {
    const visible = templatesFor(t as ProfessionalType);
    expect(visible.every((tpl) => tpl.medicines === 0)).toBe(true);
    expect(visible.length).toBe(clinicalTemplates.length - withMeds.length);
  });
});

/* ------------------------------ DOC-CLN-06 -------------------------------- */

test('a fully documented consultation may close', () => {
  ALL.forEach((t) => {
    expect(missingForCompletion(done, t)).toEqual([]);
    expect(isClinicallyComplete(done, t)).toBe(true);
    expect(blocksInstantRequests(done, t)).toBe(false);
  });
});

test('the gate names every missing item rather than just refusing', () => {
  const nothing: CompletionState = {
    notesFinalised: false,
    outputFinalised: false,
    followUpAssigned: false,
    summarySubmitted: false,
  };

  expect(missingForCompletion(nothing, 'psychiatrist')).toEqual([
    'Clinical notes',
    'Prescription or advice',
    'Case summary',
  ]);
  // the wording follows the professional's permission
  expect(missingForCompletion(nothing, 'counsellor')[1]).toBe('Advice or therapy plan');
});

test('a follow-up plan is not part of the gate — the backend only starts one after the record is finalised', () => {
  ALL.forEach((t) => expect(isClinicallyComplete({ ...done, followUpAssigned: false }, t)).toBe(true));
});

test('a missing case summary alone still blocks completion', () => {
  const noSummary = { ...done, summarySubmitted: false };

  ALL.forEach((t) => {
    expect(missingForCompletion(noSummary, t)).toEqual(['Case summary']);
    expect(isClinicallyComplete(noSummary, t)).toBe(false);
    // this is what holds the doctor in Completing Notes
    expect(blocksInstantRequests(noSummary, t)).toBe(true);
  });
});
