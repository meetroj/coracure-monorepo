import type { ClinicalRecordView } from '@coracure/api';

import { emptyRecord, type ConsultationRecord } from './clinical';
import { fromView, toSaveRequest } from './clinicalRecord';

const record = (over: Partial<ConsultationRecord> = {}): ConsultationRecord => ({
  ...emptyRecord('c-1'),
  notes: { complaint: 'Low mood for two weeks', history: 'No prior episodes', observations: 'Flat affect', diagnosis: 'Provisional: depressive episode' },
  risk: { category: 'low', selfHarm: 'notAsked', referralAdvised: false },
  ...over,
});

const view = (over: Partial<ClinicalRecordView> = {}): ClinicalRecordView => ({
  consultationId: 'c-1',
  chiefComplaint: 'Low mood',
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
  ...over,
});

test('nothing is sent until the two fields the backend requires on every save are written', () => {
  expect(toSaveRequest(record({ notes: { ...record().notes, complaint: '  ' } }), true)).toBeNull();
  expect(toSaveRequest(record({ risk: { category: null, selfHarm: 'notAsked', referralAdvised: false } }), true)).toBeNull();
});

test('observations have no backend field, so they ride in the history and come back out', () => {
  const body = toSaveRequest(record(), true)!;
  expect(body.clinicalHistory).toBe('No prior episodes\n\nObservations:\nFlat affect');

  const back = fromView(view({ clinicalHistory: body.clinicalHistory! }));
  expect(back.notes).toMatchObject({ history: 'No prior episodes', observations: 'Flat affect' });
});

test('observations with no history still split back out cleanly', () => {
  const body = toSaveRequest(record({ notes: { ...record().notes, history: '' } }), true)!;
  const back = fromView(view({ clinicalHistory: body.clinicalHistory! }));
  expect(back.notes).toMatchObject({ history: '', observations: 'Flat affect' });
});

test('advice and don’ts go out as the flat advice strings, one item per line, and come back as lists', () => {
  const body = toSaveRequest(record({ advice: ['Sleep at a fixed time', ' '], donts: ["Don't stop the medicine suddenly"] }), true)!;
  expect(body.adviceCovered).toBe('Sleep at a fixed time');
  expect(body.adviceWarningSigns).toBe("Don't stop the medicine suddenly");
  expect(body).not.toHaveProperty('advice');

  const back = fromView(view({ advice: { covered: 'A\nB', homePractice: null, nextFocus: null, warningSigns: 'C' } }));
  expect(back.advice).toEqual(['A', 'B']);
  expect(back.donts).toEqual(['C']);
});

test('a local medicine id is not a UUID and is not sent; a server one is', () => {
  const serverId = '6a1f0c2e-3b4d-4e5f-8a9b-0c1d2e3f4a5b';
  const med = { name: 'Sertraline 50 mg', generic: 'Sertraline', dose: '50 mg', frequency: 'Once daily', duration: '14 days', route: 'After food', quantity: '', instruction: '' };
  const body = toSaveRequest(record({ medicines: [{ ...med, id: 'med_001' }, { ...med, id: serverId }] }), true)!;
  expect(body.medicines![0]).not.toHaveProperty('id');
  expect(body.medicines![1]).toMatchObject({ id: serverId, genericName: 'Sertraline', route: 'After food' });
  // empty optional fields are left off, not sent as ""
  expect(body.medicines![0]).not.toHaveProperty('quantity');
});

test('a non-prescriber never sends medicines or a diagnosis', () => {
  const body = toSaveRequest(record({ medicines: [{ id: 'med_001', name: 'X', generic: '', dose: '1', frequency: 'f', duration: 'd', route: '', quantity: '', instruction: '' }] }), false)!;
  expect(body).not.toHaveProperty('medicines');
  expect(body).not.toHaveProperty('diagnosis');
});

test('one backend lock becomes all three local checkpoints', () => {
  expect(fromView(view({ finalisedAt: '2026-05-15T00:00:00.000Z' }))).toMatchObject({
    notesStatus: 'saved',
    rxStatus: 'finalised',
    summaryStatus: 'submitted',
  });
  expect(fromView(view())).toMatchObject({ notesStatus: 'saved', rxStatus: 'draft', summaryStatus: 'draft' });
});
