import { configureApi } from './config';
import { ApiError, ClientCode } from './errors';
import {
  __resetHttpForTests,
  api,
  clearSession,
  onSignedOut,
  setSession,
} from './http';
import { __resetMemoryForTests } from './tokenStore';

/**
 * The refresh rule, tested.
 *
 * `CLAUDE.md` calls single-flight refresh out by name: access tokens last 15
 * minutes, and a screen firing four parallel queries after expiry must issue
 * ONE refresh, not four — because each refresh returns a new pair and three of
 * the four would lose the race and sign the user out mid-session.
 *
 * That is invisible in manual testing (it only bites under concurrency, on a
 * screen with several queries, at the 15-minute mark) so it is exactly the kind
 * of thing that has to be pinned by a test.
 */

type Handler = (url: string, init: RequestInit) => { status: number; body: unknown };

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'x-request-id' ? 'req-test' : null),
    },
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

let handler: Handler;
let calls: { url: string; body: unknown }[];

beforeEach(() => {
  __resetHttpForTests();
  __resetMemoryForTests();
  calls = [];
  configureApi({ baseUrl: 'http://api.test/api/v1', timeoutMs: 5000 });

  global.fetch = jest.fn(async (url: unknown, init: unknown) => {
    const request = init as RequestInit;
    calls.push({
      url: String(url),
      body: request?.body ? JSON.parse(String(request.body)) : undefined,
    });
    const { status, body } = handler(String(url), request);
    return jsonResponse(status, body);
  }) as unknown as typeof fetch;
});

const refreshCalls = () => calls.filter((c) => c.url.endsWith('/auth/refresh'));

describe('single-flight refresh', () => {
  it('issues exactly one refresh for many concurrent 401s', async () => {
    // A session whose access token is already past expiry.
    await setSession({ accessToken: 'stale', refreshToken: 'r1', expiresIn: -60 });

    let refreshCount = 0;
    handler = (url) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCount += 1;
        return {
          status: 200,
          body: { accessToken: 'fresh', refreshToken: 'r2', expiresIn: 900 },
        };
      }
      return { status: 200, body: { ok: true } };
    };

    await Promise.all([
      api.get('/me/profile'),
      api.get('/me/consultations'),
      api.get('/services'),
      api.get('/me/notifications/unread-count'),
    ]);

    expect(refreshCount).toBe(1);
    expect(refreshCalls()).toHaveLength(1);
  });

  it('sends the refreshed token on the queries that waited', async () => {
    await setSession({ accessToken: 'stale', refreshToken: 'r1', expiresIn: -60 });

    const seenAuth: string[] = [];
    handler = (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        return {
          status: 200,
          body: { accessToken: 'fresh', refreshToken: 'r2', expiresIn: 900 },
        };
      }
      const headers = (init.headers ?? {}) as Record<string, string>;
      seenAuth.push(headers['Authorization'] ?? '');
      return { status: 200, body: { ok: true } };
    };

    await Promise.all([api.get('/services'), api.get('/regions')]);

    expect(seenAuth).toEqual(['Bearer fresh', 'Bearer fresh']);
  });

  it('refreshes once after a 401, then retries the original call only once', async () => {
    // Not expired by the clock — the server revoked it early.
    await setSession({ accessToken: 'a1', refreshToken: 'r1', expiresIn: 900 });

    let profileCalls = 0;
    handler = (url) => {
      if (url.endsWith('/auth/refresh')) {
        return {
          status: 200,
          body: { accessToken: 'a2', refreshToken: 'r2', expiresIn: 900 },
        };
      }
      profileCalls += 1;
      // First attempt 401s; the retry after refresh succeeds.
      return profileCalls === 1
        ? { status: 401, body: { statusCode: 401, code: 'UNAUTHENTICATED', message: 'no' } }
        : { status: 200, body: { id: 'p1' } };
    };

    await expect(api.get('/me/profile')).resolves.toEqual({ id: 'p1' });
    expect(profileCalls).toBe(2);
    expect(refreshCalls()).toHaveLength(1);
  });

  it('does not try to refresh a TOKEN_INVALID — it signs out instead', async () => {
    await setSession({ accessToken: 'a1', refreshToken: 'r1', expiresIn: 900 });

    const reasons: string[] = [];
    onSignedOut((reason) => reasons.push(reason));

    handler = () => ({
      status: 401,
      body: { statusCode: 401, code: 'TOKEN_INVALID', message: 'revoked' },
    });

    await expect(api.get('/me/profile')).rejects.toMatchObject({
      code: ClientCode.SESSION_EXPIRED,
    });
    // Refreshing a revoked pair cannot succeed, so it must not be attempted.
    expect(refreshCalls()).toHaveLength(0);
    expect(reasons).toEqual(['revoked']);
  });

  it('signs out once when the refresh itself fails, and does not loop', async () => {
    await setSession({ accessToken: 'stale', refreshToken: 'r1', expiresIn: -60 });

    const reasons: string[] = [];
    onSignedOut((reason) => reasons.push(reason));

    handler = (url) =>
      url.endsWith('/auth/refresh')
        ? { status: 401, body: { statusCode: 401, code: 'TOKEN_INVALID', message: 'gone' } }
        : { status: 200, body: {} };

    const results = await Promise.allSettled([api.get('/services'), api.get('/regions')]);

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(refreshCalls()).toHaveLength(1);
    expect(reasons).toEqual(['expired']);
  });
});

describe('error envelope', () => {
  beforeEach(async () => {
    await clearSession('user');
  });

  it('surfaces the backend code, not the message, and keeps the request id', async () => {
    handler = () => ({
      status: 409,
      body: {
        statusCode: 409,
        code: 'NO_PROVIDER_AVAILABLE',
        message: 'Nobody free',
        details: { soonestAvailableAt: '2026-09-14T09:30:00.000Z' },
        requestId: 'req-abc',
      },
    });

    await expect(api.post('/me/consultations', {}, { auth: false })).rejects.toMatchObject({
      code: 'NO_PROVIDER_AVAILABLE',
      statusCode: 409,
      requestId: 'req-abc',
    });
  });

  it('labels a gateway failure with no envelope rather than leaving code undefined', async () => {
    handler = () => ({ status: 502, body: '<html>Bad Gateway</html>' });

    const error = await api.get('/services', { auth: false }).catch((e: unknown) => e);
    expect(ApiError.is(error)).toBe(true);
    expect((error as ApiError).code).toBe('INTERNAL_ERROR');
    expect((error as ApiError).isRetryable).toBe(true);
  });

  it('refuses an authenticated call with no session instead of firing it', async () => {
    handler = () => ({ status: 200, body: {} });
    await expect(api.get('/me/profile')).rejects.toMatchObject({
      code: ClientCode.SESSION_EXPIRED,
    });
    expect(calls).toHaveLength(0);
  });
});
