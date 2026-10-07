import { configureApi } from '../config';
import { __resetHttpForTests, setSession } from '../http';
import { __resetMemoryForTests } from '../tokenStore';
import { closeCase, createCase, listCases, markCaseReviewed, postCase, replyToCase, updateDraft } from './doctorClarification';

let calls: { url: string; method: string; body: any }[];

beforeEach(async () => {
  __resetHttpForTests();
  __resetMemoryForTests();
  calls = [];
  configureApi({ baseUrl: 'http://api.test/api/v1', timeoutMs: 5000 });
  await setSession({ accessToken: 'a-1', refreshToken: 'r-1', expiresIn: 900 });

  global.fetch = jest.fn(async (url: unknown, init: any) => {
    calls.push({
      url: String(url),
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify({ id: 'k-1' }),
    } as unknown as Response;
  }) as unknown as typeof fetch;
});

const INPUT = { title: 'T', briefHistory: 'H', specificDoubt: 'Q?', urgency: 'soon' as const };

test('the list never sends `openOnly` — the server would read the string "false" as true', async () => {
  await listCases();
  expect(calls[0].url).toBe('http://api.test/api/v1/doctor/clarification-cases');
});

test('create posts, editing a draft patches, both with the whole input', async () => {
  await createCase(INPUT);
  await updateDraft('k-1', INPUT);
  expect([calls[0].method, calls[1].method]).toEqual(['POST', 'PATCH']);
  expect(calls[1].url).toBe('http://api.test/api/v1/doctor/clarification-cases/k-1');
  expect(calls[1].body).toEqual(INPUT);
});

test('post (with no expert named), reviewed and close send no body; a reply sends only the text', async () => {
  await postCase('k-1');
  await markCaseReviewed('k-1');
  await closeCase('k-1');
  await replyToCase('k-1', 'Twelve days at 5 mg.');
  expect(calls.map((c) => c.url.replace('http://api.test/api/v1/doctor/clarification-cases/k-1', ''))).toEqual([
    '/post',
    '/reviewed',
    '/close',
    '/reply',
  ]);
  expect(calls.slice(0, 3).map((c) => c.body)).toEqual([undefined, undefined, undefined]);
  expect(calls[3].body).toEqual({ body: 'Twelve days at 5 mg.' });
});
