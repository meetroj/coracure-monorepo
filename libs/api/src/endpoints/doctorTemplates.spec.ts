import { configureApi } from '../config';
import { __resetHttpForTests, setSession } from '../http';
import { __resetMemoryForTests } from '../tokenStore';
import { create, list, remove, update } from './doctorTemplates';

type Reply = { status: number; body: unknown };

let calls: { url: string; method: string; body: any }[];
let replies: Reply[];

beforeEach(async () => {
  __resetHttpForTests();
  __resetMemoryForTests();
  calls = [];
  replies = [{ status: 200, body: [] }];
  configureApi({ baseUrl: 'http://api.test/api/v1', timeoutMs: 5000 });
  await setSession({ accessToken: 'a-1', refreshToken: 'r-1', expiresIn: 900 });

  global.fetch = jest.fn(async (url: unknown, init: any) => {
    calls.push({
      url: String(url),
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body,
    });
    const reply = replies.shift() ?? { status: 200, body: {} };
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      headers: { get: () => null },
      text: async () => (reply.body === undefined ? '' : JSON.stringify(reply.body)),
    } as unknown as Response;
  }) as unknown as typeof fetch;
});

const content = { meds: [], advice: ['Walk daily'], donts: [] };

test('lists, creates, updates and removes through the doctor route', async () => {
  await list();
  replies = [{ status: 201, body: { id: 't-1' } }];
  await create({ name: 'Mine', kind: 'advice', content });
  replies = [{ status: 200, body: { id: 't-1' } }];
  await update('t-1', { name: 'Renamed' });
  replies = [{ status: 204, body: undefined }];
  await remove('t-1');

  expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
    'GET http://api.test/api/v1/doctor/clinical-templates',
    'POST http://api.test/api/v1/doctor/clinical-templates',
    'PATCH http://api.test/api/v1/doctor/clinical-templates/t-1',
    'DELETE http://api.test/api/v1/doctor/clinical-templates/t-1',
  ]);
  expect(calls[1].body).toEqual({ name: 'Mine', kind: 'advice', content });
  expect(calls[2].body).toEqual({ name: 'Renamed' });
});
