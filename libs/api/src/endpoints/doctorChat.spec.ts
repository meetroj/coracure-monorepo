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
import { attachmentUrl, listMessages, markRead, sendAttachment, sendMessage } from './doctorChat';

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

test('a conversation is addressed by the patient, through the doctor route', async () => {
  await listMessages('p-1', { limit: 50, before: '2026-10-05T09:00:00.000Z' });

  // `/me/chat-threads` is the PATIENT's side and would 403 here.
  expect(calls[0].url).toContain('http://api.test/api/v1/doctor/chat-threads/p-1/messages?');
  expect(calls[0].url).toContain('limit=50');
  expect(calls[0].url).toContain('before=2026-10-05T09');
});

test('a text message sends the body and nothing the DTO would refuse', async () => {
  replies = [{ status: 201, body: { id: 'm-1' } }];

  await sendMessage('p-1', 'Please continue the same dose.');

  expect(calls[0].method).toBe('POST');
  expect(calls[0].body).toEqual({ body: 'Please continue the same dose.' });
});

test('marking read posts to the thread with no body', async () => {
  replies = [{ status: 204, body: null }];

  await markRead('p-1');

  expect(calls[0].url).toBe('http://api.test/api/v1/doctor/chat-threads/p-1/read');
  expect(calls[0].body).toBeUndefined();
});

test('an attachment link is fetched per message, never listed', async () => {
  replies = [ok({ url: 'https://store.test/get?sig=x', expiresInSeconds: 300 })];

  const link = await attachmentUrl('p-1', 'm-9');

  expect(calls[0].url).toBe('http://api.test/api/v1/doctor/chat-threads/p-1/messages/m-9/attachment-url');
  expect(link.url).toBe('https://store.test/get?sig=x');
});

/* ------------------------------- attachments ------------------------------ */

const TICKET = {
  storageKey: 'chat-attachments/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg',
  upload: { url: 'https://store.test/put?sig=abc', expiresInSeconds: 600 },
};
const FILE = { fileName: 'rash.jpg', contentType: 'image/jpeg' as const };

describe('sending a file', () => {
  it('asks for a URL, PUTs the bytes, then sends a message naming the key', async () => {
    replies = [ok(TICKET), { status: 200, body: null }, { status: 201, body: { id: 'm-2', attachmentFileName: 'rash.jpg' } }];

    const sent = await sendAttachment('p-1', FILE, new Uint8Array([1, 2, 3]));

    expect(calls.map((c) => c.url)).toEqual([
      'http://api.test/api/v1/doctor/chat-threads/p-1/attachment-url',
      'https://store.test/put?sig=abc',
      'http://api.test/api/v1/doctor/chat-threads/p-1/messages',
    ]);
    expect(calls[0].body).toEqual(FILE);
    // key and name travel together, and there is no `body` to fail `IsNotEmpty`
    expect(calls[2].body).toEqual({ attachmentStorageKey: TICKET.storageKey, attachmentFileName: 'rash.jpg' });
    // the bearer goes to Coracure, never to the object store
    expect(calls[1].headers.Authorization).toBeUndefined();
    expect(sent).toMatchObject({ id: 'm-2' });
  });

  it('sends no message when the PUT itself fails', async () => {
    replies = [ok(TICKET), { status: 403, body: null }];

    await expect(sendAttachment('p-1', FILE, new Uint8Array([1]))).rejects.toBeInstanceOf(ApiError);
    // Only the URL request and the failed PUT — no message pointing at bytes never written.
    expect(calls).toHaveLength(2);
  });
});
