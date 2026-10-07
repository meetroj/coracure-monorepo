/** See `doctorProfile.spec.ts` — the native file streamer, mocked the same way. */
jest.mock(
  'react-native-blob-util',
  () => ({ default: { fetch: jest.fn(), wrap: jest.fn((path: string) => ({ path })) } }),
  { virtual: true },
);

import { configureApi } from '../config';
import { ApiError } from '../errors';
import { __resetHttpForTests, setSession } from '../http';
import { __resetMemoryForTests } from '../tokenStore';
import {
  cancelReportRequest,
  consultationReportRequests,
  fileDownloadUrl,
  listPatientFiles,
  raiseReportRequest,
  uploadPatientFile,
} from './doctorFiles';

type Reply = { status: number; body: unknown };

let calls: { url: string; method: string; body: any; headers: Record<string, string> }[];
let replies: Reply[];

const ok = (body: unknown): Reply => ({ status: 200, body });

beforeEach(async () => {
  __resetHttpForTests();
  __resetMemoryForTests();
  calls = [];
  replies = [ok([])];
  configureApi({ baseUrl: 'http://api.test/api/v1', timeoutMs: 5000 });
  await setSession({ accessToken: 'a-1', refreshToken: 'r-1', expiresIn: 900 });

  global.fetch = jest.fn(async (url: unknown, init: any) => {
    calls.push({
      url: String(url),
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body,
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    const reply = replies.shift();
    if (!reply) throw new Error(`no reply queued for ${String(url)}`);
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
  replies = [ok({ url: 'https://store/x', expiresInSeconds: 300, sizeBytes: 1024 })];

  const link = await fileDownloadUrl('f-1');

  // Minting one per row at list time would have them expiring while the
  // doctor scrolls.
  expect(calls[0].url).toBe('http://api.test/api/v1/doctor/files/f-1/download-url');
  expect(link.expiresInSeconds).toBe(300);
});

test('a request carries the actual ask AND the bucket the app groups by', async () => {
  replies = [{ status: 201, body: { id: 'r-1' } }];

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
  replies = [{ status: 201, body: { id: 'r-1' } }];

  await raiseReportRequest({ consultationId: 'c-1', title: 'X-ray', category: 'other' });

  expect(calls[0].body).not.toHaveProperty('reason');
});

test('withdrawing posts to the request, and sends no body it would reject', async () => {
  replies = [{ status: 201, body: { id: 'r-1', status: 'cancelled' } }];

  await cancelReportRequest('r-1');

  expect(calls[0].method).toBe('POST');
  expect(calls[0].url).toBe('http://api.test/api/v1/doctor/report-requests/r-1/cancel');
  expect(calls[0].body).toBeUndefined();
});

test('reads what was asked on one consultation, with what came back', async () => {
  replies = [
    {
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
    },
  ];

  const requests = await consultationReportRequests('c-1');

  expect(requests[0]!.fulfilledBy).toHaveLength(1);
});

/* ------------------------- uploading for a patient ------------------------ */

const TICKET = { storageKey: 'patient-files/p-1/report/scan.pdf', upload: { url: 'https://store.test/put?sig=abc', expiresInSeconds: 600 } };
const UPLOAD = { category: 'report' as const, fileName: 'scan.pdf', contentType: 'application/pdf' as const, consultationId: 'c-1' };

describe('uploading a document for a patient', () => {
  it('runs request, PUT and confirm in that order, anchored to the consultation', async () => {
    replies = [ok(TICKET), { status: 200, body: null }, { status: 201, body: { id: 'f-1', category: 'report' } }];

    const saved = await uploadPatientFile('p-1', UPLOAD, new Uint8Array([1, 2, 3]));

    expect(calls.map((c) => c.url)).toEqual([
      'http://api.test/api/v1/doctor/patients/p-1/files/upload-url',
      'https://store.test/put?sig=abc',
      'http://api.test/api/v1/doctor/patients/p-1/files',
    ]);
    // the upload-url DTO is whitelisted: no consultationId on step 1
    expect(calls[0].body).toEqual({ category: 'report', fileName: 'scan.pdf', contentType: 'application/pdf' });
    expect(calls[2].body).toEqual({
      category: 'report',
      fileName: 'scan.pdf',
      storageKey: TICKET.storageKey,
      consultationId: 'c-1',
    });
    expect(saved).toMatchObject({ id: 'f-1' });
  });

  it('never sends the bearer token to the object store', async () => {
    replies = [ok(TICKET), { status: 200, body: null }, { status: 201, body: { id: 'f-1' } }];

    await uploadPatientFile('p-1', UPLOAD, new Uint8Array([1]));

    expect(calls[0].headers.Authorization).toBe('Bearer a-1');
    expect(calls[1].headers.Authorization).toBeUndefined();
    expect(calls[1].headers['Content-Type']).toBe('application/pdf');
  });

  it('streams a file still on the device natively, same as a credential upload', async () => {
    const blobUtil = require('react-native-blob-util').default;
    blobUtil.fetch.mockResolvedValueOnce({ info: () => ({ status: 200 }) });
    replies = [ok(TICKET), { status: 201, body: { id: 'f-1' } }];

    await uploadPatientFile('p-1', UPLOAD, { uri: 'file:///data/user/0/com.doctor/cache/scan.pdf' });

    // The PUT never reaches `fetch` — OkHttp cannot parse a `file://` URL.
    expect(calls.map((c) => c.url)).toEqual([
      'http://api.test/api/v1/doctor/patients/p-1/files/upload-url',
      'http://api.test/api/v1/doctor/patients/p-1/files',
    ]);
    expect(blobUtil.fetch).toHaveBeenCalledWith(
      'PUT',
      'https://store.test/put?sig=abc',
      { 'Content-Type': 'application/pdf' },
      expect.anything(),
    );
  });

  it('does not confirm when the PUT itself fails', async () => {
    replies = [ok(TICKET), { status: 403, body: null }];

    await expect(uploadPatientFile('p-1', UPLOAD, new Uint8Array([1]))).rejects.toBeInstanceOf(ApiError);
    // Only the upload-url call and the failed PUT — confirm never ran, so
    // there is no row pointing at bytes that were never written.
    expect(calls).toHaveLength(2);
  });
});
