import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./http', () => ({ request: vi.fn() }));

import { request } from './http';
import { caseRecords, medicineLine, recordRowFrom, summaryFrom } from './liveCaseRecords';

/** `CaseSummaryRow`, the consultation list row and `ClinicalRecordView`, as the panel reads them. No network. */

const mocked = vi.mocked(request);
beforeEach(() => {
  mocked.mockReset();
});

const row = {
  id: 'k1',
  referenceCode: 'CC-0001',
  status: 'completed',
  displayStatus: 'completed',
  mode: 'scheduled',
  scheduledStartAt: '2026-10-10T09:00:00.000Z',
  startedAt: '2026-10-10T09:01:00.000Z',
  endedAt: '2026-10-10T09:21:00.000Z',
  createdAt: '2026-10-09T09:00:00.000Z',
  channel: 'video',
  specialty: { id: 's1', name: 'Psychiatry' },
  doctor: { id: 'd1', fullName: 'Dr Asha Menon' },
  patient: { id: 'p1', fullName: 'Aarav Mehta' },
  payment: null,
  paymentStatus: 'paid',
  actualDurationMinutes: 20,
} as unknown as Parameters<typeof recordRowFrom>[0];

describe('recordRowFrom', () => {
  it('reads a consultation as a case record, with the summary state joined by id', () => {
    const r = recordRowFrom(row, new Map([['k1', 'pending' as const]]));
    expect(r).toMatchObject({
      id: 'k1',
      referenceCode: 'CC-0001',
      patientName: 'Aarav Mehta',
      professionalName: 'Dr Asha Menon',
      specialty: 'Psychiatry',
      durationMinutes: 20,
      status: 'completed',
      summaryState: 'pending',
    });
  });

  it('has no summary state for a consultation the governance list did not name', () => {
    expect(recordRowFrom(row, new Map()).summaryState).toBeNull();
  });
});

describe('summaryFrom', () => {
  it('names a patient and a provider the backend had none for', () => {
    const s = summaryFrom({
      consultationId: 'k1',
      referenceCode: 'CC-0001',
      status: 'awaiting_documentation',
      scheduledStartAt: '2026-10-10T09:00:00.000Z',
      endedAt: null,
      doctor: null,
      patient: { id: 'p1', fullName: null },
      finalisedAt: null,
      summaryState: 'pending',
    });
    expect(s).toMatchObject({ id: 'k1', patientName: 'Unnamed patient', professionalName: 'Not assigned', state: 'pending', finalisedAt: null });
  });
});

describe('the clinical record', () => {
  it('is null, not an error, when the provider has not opened one', async () => {
    mocked.mockRejectedValue(Object.assign(new Error('no record'), { statusCode: 404 }));
    expect(await caseRecords.record('k1')).toBeNull();
  });

  it('still fails on anything else, so a real outage is not shown as "no record"', async () => {
    mocked.mockRejectedValue(Object.assign(new Error('boom'), { statusCode: 500 }));
    await expect(caseRecords.record('k1')).rejects.toMatchObject({ statusCode: 500 });
  });

  it('reads the record from the admin route', async () => {
    mocked.mockResolvedValue({ consultationId: 'k1', recordKind: 'prescription' });
    await caseRecords.record('k1');
    expect(mocked).toHaveBeenCalledWith('/admin/consultations/k1/clinical-record');
  });
});

describe('medicineLine', () => {
  it('reads name, dose, how often and how long, with the instructions after', () => {
    expect(medicineLine({ id: 'm', name: 'Sertraline', dose: '25 mg', frequency: 'Once daily', duration: '4 weeks', instructions: 'After food' })).toBe(
      'Sertraline, 25 mg, Once daily, 4 weeks (After food)',
    );
    expect(medicineLine({ id: 'm', name: 'Melatonin', dose: '', frequency: 'At night', duration: '' })).toBe('Melatonin, At night');
  });
});

describe('documents', () => {
  it('lists them by group and asks for each link on the same consultation', async () => {
    mocked.mockResolvedValueOnce({ groups: [{ kind: 'lab_report', files: [{ id: 'f1', fileName: 'cbc.pdf', category: null, uploadedByName: null, createdAt: '2026-10-10T10:00:00.000Z' }] }] });
    const groups = await caseRecords.documents('k1');
    expect(groups[0].files[0].fileName).toBe('cbc.pdf');
    mocked.mockResolvedValueOnce({ url: 'https://files.example/x', expiresInSeconds: 300 });
    await caseRecords.documentUrl('k1', 'f1');
    expect(mocked).toHaveBeenLastCalledWith('/admin/consultations/k1/documents/f1/download-url');
  });
});
