import { configureApi } from '../config';
import { ApiError } from '../errors';
import { __resetHttpForTests, setSession } from '../http';
import { __resetMemoryForTests } from '../tokenStore';
import { blockDate, getSlots, removeRule, replaceWeekly, setCustomHours } from './doctorAvailability';

/**
 * The diary, at the wire.
 *
 * The weekly PUT is the dangerous one: it replaces everything, so a body that
 * drops a day removes it. The rest of these pin the difference between "block
 * part of a day" and "block the whole day", which is one omitted field apart.
 */

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
      method: init?.method,
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

test('sends the WHOLE weekly pattern, because the server replaces it', async () => {
  await replaceWeekly([
    { dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
    { dayOfWeek: 1, startTime: '16:00', endTime: '19:00' },
    { dayOfWeek: 3, startTime: '09:00', endTime: '13:00' },
  ]);

  // Three windows across two days. Sending only the day that changed would
  // silently clear the others — a doctor going dark without being told.
  expect(calls[0].method).toBe('PUT');
  expect(calls[0].body.windows).toHaveLength(3);
});

test('omits channels when the caller did not choose, so the server default stands', async () => {
  await replaceWeekly([{ dayOfWeek: 1, startTime: '09:00', endTime: '13:00' }]);

  expect(calls[0].body.windows[0]).toEqual({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:00',
  });
});

test('a whole day off sends no times at all', async () => {
  await blockDate({ date: '2026-06-14' });

  // Both times omitted is what MEANS "the whole day". Sending 00:00-23:59
  // would be a window, and a window can be booked around.
  expect(calls[0].body).toEqual({ date: '2026-06-14' });
});

test('blocking part of a day sends both ends of the window', async () => {
  await blockDate({ date: '2026-06-14', startTime: '13:00', endTime: '17:00' });

  expect(calls[0].body).toEqual({ date: '2026-06-14', startTime: '13:00', endTime: '17:00' });
});

test('custom hours always carry both times', async () => {
  await setCustomHours({ date: '2026-06-15', startTime: '11:00', endTime: '15:00' });

  expect(calls[0].url).toContain('/custom-hours');
  expect(calls[0].body).toEqual({ date: '2026-06-15', startTime: '11:00', endTime: '15:00' });
});

test('removing a rule deletes it rather than flagging it', async () => {
  reply = { status: 204, body: null };

  await removeRule('rule-1');

  expect(calls[0].method).toBe('DELETE');
  expect(calls[0].url).toBe('http://api.test/api/v1/me/doctor/availability/rule-1');
});

test('slot lookup sends both ends of the range', async () => {
  reply = { status: 200, body: [] };

  await getSlots('2026-06-01T00:00:00.000Z', '2026-06-07T23:59:59.000Z');

  expect(calls[0].url).toContain('from=2026-06-01T00%3A00%3A00.000Z');
  expect(calls[0].url).toContain('to=2026-06-07T23%3A59%3A59.000Z');
});

test('surfaces an overlap refusal by code, so the screen can point at the day', async () => {
  reply = {
    status: 409,
    body: {
      statusCode: 409,
      code: 'OVERLAPPING_AVAILABILITY',
      message: 'Those hours overlap another window on the same day.',
    },
  };

  await expect(
    replaceWeekly([
      { dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
      { dayOfWeek: 1, startTime: '12:00', endTime: '15:00' },
    ]),
  ).rejects.toMatchObject({ code: 'OVERLAPPING_AVAILABILITY' });
});

test('a date in the past is refused with its own code, not a generic 400', async () => {
  reply = {
    status: 400,
    body: { statusCode: 400, code: 'DATE_IN_THE_PAST', message: 'That date has gone.' },
  };

  const error = await blockDate({ date: '2020-01-01' }).catch((e) => e);

  expect((error as ApiError).code).toBe('DATE_IN_THE_PAST');
});
