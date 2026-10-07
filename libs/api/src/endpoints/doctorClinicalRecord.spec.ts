import { configureApi } from '../config';
import { __resetHttpForTests, setSession } from '../http';
import { __resetMemoryForTests } from '../tokenStore';
import { finaliseClinicalRecord, getClinicalRecord, saveClinicalRecord } from './doctorClinicalRecord';

let calls: { url: string; method: string; body: any }[];
let reply: { status: number; body: unknown };

beforeEach(async () => {
  __resetHttpForTests();
  __resetMemoryForTests();
  calls = [];
  reply = { status: 200, body: {} };
  configureApi({ baseUrl: 'http://api.test/api/v1', timeoutMs: 5000 });
  await setSession({ accessToken: 'a-1', refreshToken: 'r-1', expiresIn: 900 });

  global.fetch = jest.fn(async (url: unknown, init: any) => {
    calls.push({
      url: String(url),
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      headers: { get: () => null },
      text: async () => JSON.stringify(reply.body),
    } as unknown as Response;
  }) as unknown as typeof fetch;
});

test('reads the current draft or record for one consultation', async () => {
  reply = { status: 200, body: { consultationId: 'c-1', outstanding: [] } };

  await getClinicalRecord('c-1');

  expect(calls[0].method).toBe('GET');
  expect(calls[0].url).toBe('http://api.test/api/v1/doctor/consultations/c-1/clinical-record');
});

test('saving is a PUT, with the advice fields flat and sibling, not nested', async () => {
  reply = { status: 200, body: { consultationId: 'c-1' } };

  await saveClinicalRecord('c-1', {
    chiefComplaint: 'Low mood for two weeks',
    riskCategory: 'low',
    adviceCovered: 'Sleep hygiene discussed',
    adviceWarningSigns: 'Seek urgent care if thoughts of self-harm occur',
  });

  expect(calls[0].method).toBe('PUT');
  expect(calls[0].url).toBe('http://api.test/api/v1/doctor/consultations/c-1/clinical-record');
  expect(calls[0].body).toEqual({
    chiefComplaint: 'Low mood for two weeks',
    riskCategory: 'low',
    adviceCovered: 'Sleep hygiene discussed',
    adviceWarningSigns: 'Seek urgent care if thoughts of self-harm occur',
  });
  // Never nested under an `advice` key on the way out.
  expect(calls[0].body).not.toHaveProperty('advice');
});

test('finalising sends no body', async () => {
  reply = { status: 201, body: { consultationId: 'c-1', finalisedAt: '2026-05-15T00:00:00.000Z' } };

  await finaliseClinicalRecord('c-1');

  expect(calls[0].method).toBe('POST');
  expect(calls[0].url).toBe('http://api.test/api/v1/doctor/consultations/c-1/clinical-record/finalise');
  expect(calls[0].body).toBeUndefined();
});
