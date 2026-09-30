/**
 * The native file streamer. A picked file is read by `react-native-blob-util`
 * and never by `fetch`, because OkHttp refuses a `file://` URL — see
 * `putLocalFile`. The module is required lazily, so this mock stands in for it
 * without Node ever loading a native binary.
 */
jest.mock(
  'react-native-blob-util',
  () => ({ default: { fetch: jest.fn(), wrap: jest.fn((path: string) => ({ path })) } }),
  { virtual: true },
);

import { configureApi } from '../config';
import { ApiError, ClientCode } from '../errors';
import { __resetHttpForTests, setSession } from '../http';
import { __resetMemoryForTests } from '../tokenStore';
import {
  confirmCredentialUpload,
  getCredentials,
  requestCredentialUpload,
  updateProfile,
  uploadCredential,
} from './doctorProfile';

/**
 * Profile and credentials, at the seam where the onboarding form meets the API.
 *
 * The cases that matter here are the ones that corrupt state rather than fail
 * loudly: a confirm that runs after a failed PUT leaves an admin reviewing a
 * credential whose file does not exist, and a body carrying a field the DTO
 * does not allow fails the WHOLE save rather than dropping that one field.
 */

type Reply = { status: number; body: unknown };

let replies: Reply[];
let calls: { url: string; method: string; body: any; headers: Record<string, string> }[];

const ok = (body: unknown): Reply => ({ status: 200, body });

const TOKENS = { accessToken: 'a-1', refreshToken: 'r-1', expiresIn: 900 };
const TICKET = { storageKey: 'doctors/d-1/degree_certificate/mbbs.pdf', upload: { url: 'https://store.test/put?sig=abc', expiresInSeconds: 600 } };
const FILE = { documentType: 'degree_certificate' as const, fileName: 'mbbs.pdf', contentType: 'application/pdf' as const };

beforeEach(async () => {
  __resetHttpForTests();
  __resetMemoryForTests();
  replies = [];
  calls = [];
  configureApi({ baseUrl: 'http://api.test/api/v1', timeoutMs: 5000 });
  await setSession(TOKENS);

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

/* -------------------------------- profile --------------------------------- */

describe('editing my own profile', () => {
  it('sends only the four fields a doctor is allowed to change', async () => {
    replies = [ok({ id: 'd-1' })];

    await updateProfile({ bio: 'Psychiatrist', languages: ['en', 'hi'] });

    // Name, qualification, registration number and fee are the admin's. One of
    // them in this body would be a 400 on the whole request, not a dropped key.
    expect(calls[0].body).toEqual({ bio: 'Psychiatrist', languages: ['en', 'hi'] });
    expect(calls[0].method).toBe('PATCH');
  });

  it('omits fields the caller did not set, so a partial save stays partial', async () => {
    replies = [ok({ id: 'd-1' })];

    await updateProfile({ bufferMinutes: 10 });

    expect(calls[0].body).toEqual({ bufferMinutes: 10 });
  });

  it('sends an empty patch rather than inventing values', async () => {
    replies = [ok({ id: 'd-1' })];

    await updateProfile({});

    expect(calls[0].body).toEqual({});
  });
});

/* ------------------------------- credentials ------------------------------ */

describe('uploading a credential', () => {
  it('runs request, PUT and confirm in that order, echoing the minted key back', async () => {
    replies = [ok(TICKET), { status: 200, body: null }, ok({ id: 'doc-1', documentType: 'degree_certificate' })];

    const saved = await uploadCredential(FILE, new Uint8Array([1, 2, 3]));

    expect(calls.map((c) => c.url)).toEqual([
      'http://api.test/api/v1/me/doctor/credentials/upload-url',
      'https://store.test/put?sig=abc',
      'http://api.test/api/v1/me/doctor/credentials',
    ]);
    // The key must be the one the server minted: a key from anywhere else is
    // refused, because confirming an arbitrary key would attach somebody
    // else's object to this doctor.
    expect(calls[2].body).toEqual({
      documentType: 'degree_certificate',
      fileName: 'mbbs.pdf',
      storageKey: TICKET.storageKey,
    });
    expect(saved).toMatchObject({ id: 'doc-1' });
  });

  it('never sends the bearer token to the object store', async () => {
    replies = [ok(TICKET), { status: 200, body: null }, ok({ id: 'doc-1' })];

    await uploadCredential(FILE, new Uint8Array([1]));

    expect(calls[0].headers.Authorization).toBe('Bearer a-1');
    // A third-party host has no business seeing a Coracure token; the
    // permission is signed into the URL already.
    expect(calls[1].headers.Authorization).toBeUndefined();
    expect(calls[1].headers['Content-Type']).toBe('application/pdf');
  });

  /* ------------------------- a file on the device ------------------------- */

  it('streams a local file natively instead of putting it through fetch', async () => {
    const blobUtil = require('react-native-blob-util').default;
    blobUtil.fetch.mockResolvedValueOnce({ info: () => ({ status: 200 }) });
    replies = [ok(TICKET), ok({ id: 'doc-1' })];

    await uploadCredential(FILE, { uri: 'file:///data/user/0/com.doctor/cache/pick.jpg' });

    // `fetch` sees only the two Coracure calls; the PUT never reaches it,
    // which is the whole point — OkHttp cannot parse a `file://` URL.
    expect(calls.map((c) => c.url)).toEqual([
      'http://api.test/api/v1/me/doctor/credentials/upload-url',
      'http://api.test/api/v1/me/doctor/credentials',
    ]);
    expect(blobUtil.fetch).toHaveBeenCalledWith(
      'PUT',
      'https://store.test/put?sig=abc',
      { 'Content-Type': 'application/pdf' },
      expect.anything(),
    );
  });

  it('strips the file:// scheme, because wrap() takes a path and not a URI', async () => {
    const blobUtil = require('react-native-blob-util').default;
    blobUtil.fetch.mockResolvedValueOnce({ info: () => ({ status: 200 }) });
    replies = [ok(TICKET), ok({ id: 'doc-1' })];

    await uploadCredential(FILE, { uri: 'file:///data/user/0/com.doctor/cache/my%20id.jpg' });

    // Decoded too: a picker hands back a percent-encoded name and the
    // filesystem wants the real one.
    expect(blobUtil.wrap).toHaveBeenCalledWith('/data/user/0/com.doctor/cache/my id.jpg');
  });

  it('does not confirm when the native upload returns a failure status', async () => {
    const blobUtil = require('react-native-blob-util').default;
    blobUtil.fetch.mockResolvedValueOnce({ info: () => ({ status: 403 }) });
    replies = [ok(TICKET)];

    await expect(
      uploadCredential(FILE, { uri: 'file:///tmp/pick.jpg' }),
    ).rejects.toBeInstanceOf(ApiError);
    // Only the ticket call ran: no row may point at an object that is not there.
    expect(calls).toHaveLength(1);
  });

  it('does NOT confirm when the PUT fails, so no row points at a missing file', async () => {
    replies = [ok(TICKET), { status: 500, body: null }];

    await expect(uploadCredential(FILE, new Uint8Array([1]))).rejects.toBeInstanceOf(ApiError);

    // Two calls, not three. An admin must never open a credential to find
    // nothing there and then decide a doctor on it.
    expect(calls).toHaveLength(2);
    expect(calls.some((c) => c.url.endsWith('/me/doctor/credentials'))).toBe(false);
  });

  it('explains an expired link rather than reporting a generic failure', async () => {
    replies = [ok(TICKET), { status: 403, body: null }];

    const error = await uploadCredential(FILE, new Uint8Array([1])).catch((e) => e);

    expect((error as ApiError).message).toMatch(/expired/i);
  });

  it('reports a dropped connection mid-upload as a network problem', async () => {
    replies = [ok(TICKET)];
    (global.fetch as jest.Mock).mockImplementationOnce(async (url: unknown, init: any) => {
      calls.push({ url: String(url), method: init?.method, body: init?.body, headers: init?.headers ?? {} });
      const reply = replies.shift()!;
      return {
        ok: true,
        status: reply.status,
        headers: { get: () => null },
        text: async () => JSON.stringify(reply.body),
      } as unknown as Response;
    });
    (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Network request failed'));

    const error = await uploadCredential(FILE, new Uint8Array([1])).catch((e) => e);

    expect((error as ApiError).code).toBe(ClientCode.NETWORK_UNAVAILABLE);
  });

  it('asks for the URL with the exact type it will PUT with', async () => {
    replies = [ok(TICKET), { status: 200, body: null }, ok({ id: 'doc-1' })];

    await uploadCredential({ ...FILE, contentType: 'image/png', fileName: 'photo.png', documentType: 'profile_photo' }, new Uint8Array([1]));

    expect(calls[0].body).toEqual({
      documentType: 'profile_photo',
      fileName: 'photo.png',
      contentType: 'image/png',
    });
    expect(calls[1].headers['Content-Type']).toBe('image/png');
  });

  it('surfaces a rejected key from the confirm step', async () => {
    replies = [
      ok(TICKET),
      { status: 200, body: null },
      { status: 404, body: { statusCode: 404, code: 'NOT_FOUND', message: 'That upload was not found.' } },
    ];

    await expect(uploadCredential(FILE, new Uint8Array([1]))).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('the credential screen', () => {
  it('reads the whole verification state in one call', async () => {
    replies = [
      ok({
        doctorId: 'd-1',
        status: 'under_review',
        required: ['degree_certificate', 'identity_proof'],
        approved: ['identity_proof'],
        outstanding: ['degree_certificate'],
        rejected: [],
        registrationNumberRequired: true,
        registrationNumberMissing: true,
        readyForVerification: false,
        documents: [],
      }),
    ];

    const progress = await getCredentials();

    // `outstanding` is what the screen lists, and it is the SERVER's view —
    // driven by the specialty an admin set, not by a list in the app.
    expect(progress.outstanding).toEqual(['degree_certificate']);
    // A missing registration number blocks verification and the doctor cannot
    // fix it themselves: it is an admin field.
    expect(progress.registrationNumberMissing).toBe(true);
    expect(progress.readyForVerification).toBe(false);
  });

  it('keeps request and confirm callable on their own, for a resumed upload', async () => {
    replies = [ok(TICKET), ok({ id: 'doc-1' })];

    const ticket = await requestCredentialUpload(FILE);
    await confirmCredentialUpload({ ...FILE, storageKey: ticket.storageKey });

    expect(calls).toHaveLength(2);
    expect(calls[1].body.storageKey).toBe(TICKET.storageKey);
  });
});
