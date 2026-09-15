import {
  canPrescribe,
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

test('a non-prescriber produces an advice and therapy plan instead', () => {
  expect(outputLabel('psychiatrist')).toBe('Prescription');
  expect(outputLabel('psychologist')).toBe('Advice & Therapy Plan');
  expect(outputLabel('counsellor')).toBe('Advice & Therapy Plan');
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
    'Follow-up plan',
    'Case summary',
  ]);
  // the wording follows the professional's permission
  expect(missingForCompletion(nothing, 'counsellor')[1]).toBe('Advice or therapy plan');
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
