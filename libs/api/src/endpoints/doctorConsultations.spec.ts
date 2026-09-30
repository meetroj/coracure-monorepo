import { configureApi } from '../config';
import { __resetHttpForTests, setSession } from '../http';
import { __resetMemoryForTests } from '../tokenStore';
import {
  listConsultations,
  listSafetyAlerts,
  pendingDocumentation,
  unreadNotifications,
} from './doctorConsultations';

/**
 * The doctor's day, at the wire.
 *
 * The query string is the whole point here: `upcoming` and `openOnly` decide
 * what the dashboard counts, and a boolean that arrives as the string "false"
 * would be read as truthy by the wrong parser. The backend coerces, but only
 * if the key is actually sent.
 */

let calls: { url: string }[];
let reply: { status: number; body: unknown };

beforeEach(async () => {
  __resetHttpForTests();
  __resetMemoryForTests();
  calls = [];
  reply = { status: 200, body: [] };
  configureApi({ baseUrl: 'http://api.test/api/v1', timeoutMs: 5000 });
  await setSession({ accessToken: 'a-1', refreshToken: 'r-1', expiresIn: 900 });

  global.fetch = jest.fn(async (url: unknown) => {
    calls.push({ url: String(url) });
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      headers: { get: () => null },
      text: async () => JSON.stringify(reply.body),
    } as unknown as Response;
  }) as unknown as typeof fetch;
});

test('asks for the upcoming list with the flag the backend branches on', async () => {
  await listConsultations({ upcoming: true, limit: 20 });

  expect(calls[0].url).toBe('http://api.test/api/v1/doctor/consultations?upcoming=true&limit=20');
});

test('sends upcoming=false rather than dropping it, so the past list is not the default', async () => {
  await listConsultations({ upcoming: false });

  // `upcoming` defaults to TRUE server-side. Omitting the key when it is false
  // would silently return the opposite list.
  expect(calls[0].url).toContain('upcoming=false');
});

test('omits a filter the caller did not set', async () => {
  await listConsultations();

  expect(calls[0].url).toBe('http://api.test/api/v1/doctor/consultations');
});

test('reads the write-up queue from its own endpoint, not by filtering the list', async () => {
  reply = {
    status: 200,
    body: [
      {
        consultationId: 'c-1',
        referenceCode: 'CC-1',
        status: 'awaiting_documentation',
        outstanding: [{ code: 'CASE_SUMMARY_MISSING', message: 'Add a case summary.' }],
      },
    ],
  };

  const pending = await pendingDocumentation();

  // A consultation held this morning is in the PAST list — filtering the
  // upcoming one for it would always come back empty.
  expect(calls[0].url).toBe('http://api.test/api/v1/doctor/pending-documentation');
  expect(pending[0].outstanding[0].code).toBe('CASE_SUMMARY_MISSING');
});

test('asks only for open safety alerts when that is what the dashboard shows', async () => {
  await listSafetyAlerts({ openOnly: true });

  expect(calls[0].url).toContain('openOnly=true');
});

test('reads the badge count as a number, not a list length', async () => {
  reply = { status: 200, body: { unread: 4 } };

  await expect(unreadNotifications()).resolves.toEqual({ unread: 4 });
});
