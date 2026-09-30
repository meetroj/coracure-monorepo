import { configureApi } from '../config';
import { __resetHttpForTests, setSession } from '../http';
import { __resetMemoryForTests } from '../tokenStore';
import {
  cancelReportRequest,
  consultationReportRequests,
  fileDownloadUrl,
  listPatientFiles,
  raiseReportRequest,
} from './doctorFiles';

let calls: { url: string; method: string; body: any }[];
let reply: { status: number; body: unknown };

beforeEach(async () => {
  __resetHttpForTests();
  __resetMemoryForTests();
  calls = [];
  reply = { status: 200, body: [] };
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

test('reads a patient’s files through the doctor route, not the patient one', () => {
  return listPatientFiles('p-1').then(() => {
    // `/me/files` is the PATIENT's own list and would 403 here.
    expect(calls[0].url).toBe('http://api.test/api/v1/doctor/patients/p-1/files');
  });
});

test('narrows to one consultation when the screen is scoped to it', async () => {
  await listPatientFiles('p-1', { consultationId: 'c-9', category: 'report' });

  expect(calls[0].url).toContain('consultationId=c-9');
  expect(calls[0].url).toContain('category=report');
});

test('a download link is fetched per file, never listed', async () => {
  reply = { status: 200, body: { url: 'https://store/x', expiresInSeconds: 300, sizeBytes: 1024 } };

  const link = await fileDownloadUrl('f-1');

  // Minting one per row at list time would have them expiring while the
  // doctor scrolls.
  expect(calls[0].url).toBe('http://api.test/api/v1/doctor/files/f-1/download-url');
  expect(link.expiresInSeconds).toBe(300);
});

test('a request carries the actual ask AND the bucket the app groups by', async () => {
  reply = { status: 201, body: { id: 'r-1' } };

  await raiseReportRequest({
    consultationId: 'c-1',
    title: 'Thyroid profile (T3, T4, TSH)',
    category: 'lab',
  });

  // "Lab" alone does not tell a patient which test.
  expect(calls[0].body).toEqual({
    consultationId: 'c-1',
    title: 'Thyroid profile (T3, T4, TSH)',
    category: 'lab',
  });
});

test('omits the reason when the doctor did not give one', async () => {
  reply = { status: 201, body: { id: 'r-1' } };

  await raiseReportRequest({ consultationId: 'c-1', title: 'X-ray', category: 'other' });

  expect(calls[0].body).not.toHaveProperty('reason');
});

test('withdrawing posts to the request, and sends no body it would reject', async () => {
  reply = { status: 201, body: { id: 'r-1', status: 'cancelled' } };

  await cancelReportRequest('r-1');

  expect(calls[0].method).toBe('POST');
  expect(calls[0].url).toBe('http://api.test/api/v1/doctor/report-requests/r-1/cancel');
  expect(calls[0].body).toBeUndefined();
});

test('reads what was asked on one consultation, with what came back', async () => {
  reply = {
    status: 200,
    body: [
      {
        id: 'r-1',
        consultationId: 'c-1',
        title: 'Thyroid profile',
        category: 'lab',
        status: 'fulfilled',
        fulfilledBy: [{ id: 'f-1', fileName: 'thyroid.pdf', createdAt: '2026-05-15T00:00:00.000Z' }],
      },
    ],
  };

  const requests = await consultationReportRequests('c-1');

  expect(requests[0]!.fulfilledBy).toHaveLength(1);
});
