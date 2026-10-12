import { describe, expect, it } from 'vitest';

import {
  LANGUAGE_NAMES,
  PIN_CODE,
  fromLivePatientDetail,
  fromLivePatientRow,
  patientEditBody,
  patientListQuery,
  type LivePatientDetail,
  type LivePatientRow,
} from './livePatients';

/**
 * The panel's side of `GET/PATCH /admin/patients` (`AdminPatientRow`,
 * `AdminPatientDetail`, `AdminUpdatePatientDto`). No network.
 */

const row = (over: Partial<LivePatientRow> = {}): LivePatientRow => ({
  id: 'p-1',
  patientCode: 'PT-000001',
  fullName: 'Aarav Mehta',
  mobileNumber: '+919810000001',
  email: 'aarav@example.com',
  status: 'active',
  gender: 'male',
  age: 34,
  region: { id: 'r-1', name: 'Delhi NCR' },
  consultationCount: 3,
  lastConsultationAt: '2026-10-01T09:00:00.000Z',
  createdAt: '2026-06-01T09:00:00.000Z',
  ...over,
});

const detail = (over: Partial<LivePatientDetail> = {}): LivePatientDetail => ({
  ...row(),
  dateOfBirth: '1992-04-17',
  preferredLanguage: 'hi',
  languages: ['hi', 'en'],
  emailVerified: true,
  address: { line: '12 MG Road', pinCode: '110017', city: 'New Delhi', district: 'South Delhi', state: 'Delhi' },
  profileComplete: true,
  updatedAt: '2026-10-02T09:00:00.000Z',
  activity: { consultations: 3, completed: 2, cancelled: 1, noShow: 0, upcoming: 1, openComplaints: 1, lastConsultationAt: '2026-10-01T09:00:00.000Z' },
  ...over,
});

describe('patientListQuery', () => {
  it('asks for the newest, a page of 25, from the start', () => {
    expect(patientListQuery({})).toEqual({ sort: 'newest', limit: 25, offset: 0 });
  });

  it('sends the search trimmed, and the status as the backend names it', () => {
    expect(patientListQuery({ search: '  PT-000042 ', status: 'suspended' })).toMatchObject({ search: 'PT-000042', status: 'suspended' });
    expect(patientListQuery({ search: '   ' })).not.toHaveProperty('search');
  });

  it('clamps the page size to the API maximum', () => {
    expect(patientListQuery({ limit: 1000 }).limit).toBe(100);
    expect(patientListQuery({ limit: 0 }).limit).toBe(1);
  });

  it('never sends the two fixture-only filters, which the backend would reject as unknown', () => {
    const q = patientListQuery({ hasOpenComplaint: 'true', hasActiveFollowUp: 'true' });
    expect(q).not.toHaveProperty('hasOpenComplaint');
    expect(q).not.toHaveProperty('hasActiveFollowUp');
  });
});

describe('fromLivePatientRow', () => {
  it('uses the patient code the patient reads out as the reference', () => {
    expect(fromLivePatientRow(row()).referenceCode).toBe('PT-000001');
  });

  it('shows missing identity as a word, never as null or an id', () => {
    const r = fromLivePatientRow(row({ fullName: null, mobileNumber: null, age: null, region: null }));
    expect(r.fullName).toBe('Unnamed patient');
    expect(r.mobileNumber).toBe('-');
    expect(r.age).toBeNull();
    expect(r.region).toBe('-');
  });

  it('keeps the backend statuses and maps an erased patient onto the pending-deletion word', () => {
    expect(fromLivePatientRow(row({ status: 'suspended' })).status).toBe('suspended');
    expect(fromLivePatientRow(row({ status: 'pending' })).status).toBe('pending');
    expect(fromLivePatientRow(row({ status: 'deleted' })).status).toBe('pending_deletion');
  });
});

describe('fromLivePatientDetail', () => {
  it('carries the address the patient wrote and the places the backend filled in', () => {
    const d = fromLivePatientDetail(detail());
    expect(d.profile).toMatchObject({ addressLine1: '12 MG Road', pinCode: '110017', city: 'New Delhi', state: 'Delhi', country: 'India' });
  });

  it('shows languages by name, the first being the preferred one, and keeps the codes for the edit form', () => {
    const d = fromLivePatientDetail(detail());
    expect(d.language).toBe('Hindi');
    expect(d.profile.languages).toEqual(['Hindi', 'English']);
    expect(d.languageCodes).toEqual(['hi', 'en']);
  });

  it('falls back to the preferred language when the list is empty', () => {
    expect(fromLivePatientDetail(detail({ languages: [] })).languageCodes).toEqual(['hi']);
  });

  it('never invents health data: the backend withholds it, so the record has none', () => {
    expect(fromLivePatientDetail(detail()).profile.health).toBeNull();
  });

  it('leaves the tab arrays empty rather than pretending anything about them', () => {
    const d = fromLivePatientDetail(detail());
    for (const k of ['consultations', 'complaints', 'followUps', 'files', 'reportRequests', 'consents'] as const) {
      expect(d[k]).toEqual([]);
    }
  });

  it('flags an open complaint from the activity summary', () => {
    expect(fromLivePatientDetail(detail()).hasOpenComplaint).toBe(true);
    expect(fromLivePatientDetail(detail({ activity: { ...detail().activity, openComplaints: 0 } })).hasOpenComplaint).toBe(false);
  });

  it('keeps the region id the edit form must send back', () => {
    expect(fromLivePatientDetail(detail()).regionId).toBe('r-1');
  });
});

describe('patientEditBody', () => {
  const full = { fullName: ' Anita Sharma ', dateOfBirth: '1990-04-17', gender: 'female', languages: ['ta', 'en'], regionId: 'r-2', addressLine: ' 4 Park St ', pinCode: ' 560038 ' };

  it('sends exactly the fields the backend accepts, trimmed', () => {
    expect(patientEditBody(full)).toEqual({
      fullName: 'Anita Sharma',
      dateOfBirth: '1990-04-17',
      gender: 'female',
      languages: ['ta', 'en'],
      regionId: 'r-2',
      addressLine: '4 Park St',
      pinCode: '560038',
    });
  });

  it('never sends the email, mobile or health fields, which the backend refuses as unknown', () => {
    const body = patientEditBody({ ...full, ...({ email: 'x@y.z', mobileNumber: '1', health: {} } as object) });
    for (const k of ['email', 'mobileNumber', 'health', 'allergies']) expect(body).not.toHaveProperty(k);
  });

  it('sends the address line and the PIN code together or not at all', () => {
    expect(patientEditBody({ ...full, pinCode: '' })).not.toHaveProperty('addressLine');
    expect(patientEditBody({ ...full, addressLine: '  ' })).not.toHaveProperty('pinCode');
  });

  it('leaves a blank field out, because there is no way to clear one through this endpoint', () => {
    const body = patientEditBody({ ...full, fullName: '  ', regionId: '', languages: [] });
    expect(body).not.toHaveProperty('fullName');
    expect(body).not.toHaveProperty('regionId');
    expect(body).not.toHaveProperty('languages');
  });
});

describe('PIN_CODE', () => {
  it('is the backend rule: six digits, not starting with 0', () => {
    expect(PIN_CODE.test('560038')).toBe(true);
    expect(PIN_CODE.test('060038')).toBe(false);
    expect(PIN_CODE.test('56003')).toBe(false);
    expect(PIN_CODE.test('5600381')).toBe(false);
  });
});

describe('LANGUAGE_NAMES', () => {
  it('names every code the backend accepts', () => {
    // `LANGUAGES` in the backend's common/languages.ts.
    for (const code of ['en', 'hi', 'hinglish', 'mr', 'kn', 'pa', 'ta', 'te', 'bn', 'gu', 'ml', 'ur']) {
      expect(LANGUAGE_NAMES[code], code).toBeTruthy();
    }
  });
});
