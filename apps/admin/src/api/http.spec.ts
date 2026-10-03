import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetForTests,
  getSession,
  levelFromToken,
  onSignedOut,
  request,
  setSession,
  signIn,
} from './http';

/**
 * The single-flight refresh is the one piece of logic in this client that is
 * not obvious, and the one whose failure mode is invisible in development: with
 * four parallel refreshes, three lose the race and the admin is signed out
 * mid-session. These tests are what stop that regressing.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

type Counts = { refresh: number; protected: number };

/**
 * A JWT the way the backend issues one: base64url, no padding, `typ` and `lvl`
 * in the payload. The signature is a placeholder because nothing client-side
 * verifies it - the backend does that on every request.
 */
const jwt = (claims: Record<string, unknown>): string => {
  const b64url = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(claims)}.not-checked-here`;
};

const adminToken = (lvl: string) => jwt({ sub: 'a1', typ: 'admin', ver: 0, kind: 'access', lvl });

/**
 * Answers 401 on the protected path until a refresh has happened, then 200.
 * Every refresh returns a NEW token pair, exactly as the backend does - which
 * is precisely why more than one refresh would break the session.
 */
const backend = (counts: Counts) =>
  vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/refresh')) {
      counts.refresh += 1;
      return json({
        accessToken: adminToken('operations'),
        refreshToken: `refresh-${counts.refresh}`,
        expiresIn: 900,
      });
    }
    counts.protected += 1;
    return counts.refresh === 0
      ? json({ statusCode: 401, code: 'UNAUTHENTICATED', message: 'expired' }, 401)
      : json({ ok: true });
  });

beforeEach(() => {
  __resetForTests();
  sessionStorage.clear();
  setSession({
    accessToken: 'stale',
    refreshToken: 'refresh-0',
    expiresAt: Date.now() + 60_000,
    level: 'operations',
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('single-flight refresh', () => {
  it('issues ONE refresh for four parallel 401s', async () => {
    const counts: Counts = { refresh: 0, protected: 0 };
    vi.stubGlobal('fetch', backend(counts));

    const results = await Promise.all([
      request('/admin/governance/dashboard'),
      request('/admin/safety-alerts'),
      request('/admin/complaints'),
      request('/admin/doctors/credential-queue'),
    ]);

    expect(counts.refresh).toBe(1);
    // Four 401s, then four retries that succeed.
    expect(counts.protected).toBe(8);
    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }, { ok: true }]);
  });

  it('keeps the session and stores the new pair', async () => {
    const counts: Counts = { refresh: 0, protected: 0 };
    vi.stubGlobal('fetch', backend(counts));

    await request('/admin/governance/dashboard');

    expect(getSession()?.accessToken).toBe(adminToken('operations'));
    expect(getSession()?.refreshToken).toBe('refresh-1');
    // Re-read from the refreshed token's own `lvl` claim, not carried forward.
    expect(getSession()?.level).toBe('operations');
  });

  it('picks up a level change from the refreshed token', async () => {
    let refreshed = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('/auth/refresh')) {
          refreshed = true;
          // The admin was moved to clinical_governance between requests.
          return json({
            accessToken: adminToken('clinical_governance'),
            refreshToken: 'r2',
            expiresIn: 900,
          });
        }
        return refreshed
          ? json({ ok: true })
          : json({ statusCode: 401, code: 'UNAUTHENTICATED', message: 'expired' }, 401);
      }),
    );

    await request('/admin/governance/dashboard');
    expect(getSession()?.level).toBe('clinical_governance');
  });

  it('retries a 401 only once, then signs out', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/auth/refresh')) {
          return json({ accessToken: 'a', refreshToken: 'r', expiresIn: 900 });
        }
        calls += 1;
        // A backend that 401s even on a fresh token must not loop forever.
        return json({ statusCode: 401, code: 'UNAUTHENTICATED', message: 'no' }, 401);
      }),
    );

    const reasons: string[] = [];
    onSignedOut((reason) => reasons.push(reason));

    await expect(request('/admin/governance/dashboard')).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
    });
    expect(calls).toBe(2);
    expect(reasons).toEqual(['expired']);
    expect(getSession()).toBeNull();
  });

  it('signs out without retrying when the refresh itself is refused', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes('/auth/refresh')
          ? json({ statusCode: 401, code: 'TOKEN_INVALID', message: 'revoked' }, 401)
          : json({ statusCode: 401, code: 'UNAUTHENTICATED', message: 'expired' }, 401),
      ),
    );

    const reasons: string[] = [];
    onSignedOut((reason) => reasons.push(reason));

    await expect(request('/admin/doctors')).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
    });
    // 'revoked' from the failed refresh; the outer handler does not double-fire.
    expect(reasons).toContain('revoked');
    expect(getSession()).toBeNull();
  });
});

describe('error handling', () => {
  it('raises an ApiError carrying the backend code, not the message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(
          {
            statusCode: 403,
            code: 'INSUFFICIENT_PERMISSION',
            message: 'Your admin role does not have access to this action',
            requestId: 'req-42',
          },
          403,
        ),
      ),
    );

    await expect(request('/admin/doctors/x/verify', { method: 'POST' })).rejects.toMatchObject({
      code: 'INSUFFICIENT_PERMISSION',
      statusCode: 403,
      requestId: 'req-42',
    });
  });

  it('signs out on TOKEN_INVALID instead of looping the refresh', async () => {
    let refreshes = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('/auth/refresh')) refreshes += 1;
        return json({ statusCode: 401, code: 'TOKEN_INVALID', message: 'revoked' }, 401);
      }),
    );

    await expect(request('/admin/doctors')).rejects.toBeDefined();
    // One refresh attempt at most - never a loop.
    expect(refreshes).toBeLessThanOrEqual(1);
    expect(getSession()).toBeNull();
  });

  it('returns undefined for a 204 rather than failing to parse it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
    await expect(request('/auth/sign-out', { method: 'POST' })).resolves.toBeUndefined();
  });
});

describe('the level comes from the token, not from the form', () => {
  it('reads `lvl` out of the access token claims', () => {
    expect(levelFromToken(adminToken('finance'))).toBe('finance');
    expect(levelFromToken(adminToken('super_admin'))).toBe('super_admin');
  });

  it('sets the session level from the sign-in response alone', async () => {
    __resetForTests();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({
          status: 'complete',
          accessToken: adminToken('care_coordinator'),
          refreshToken: 'r',
          expiresIn: 900,
        }),
      ),
    );

    // No level argument exists to pass - that is the point.
    await expect(signIn('a@b.test', 'pw')).resolves.toEqual({ status: 'complete' });
    expect(getSession()?.level).toBe('care_coordinator');
  });

  it('refuses a token that names no known level', async () => {
    __resetForTests();
    // A hand-edited payload cannot be re-signed, so the backend would reject it
    // anyway - but the panel must not build a sidebar from it either.
    expect(levelFromToken(adminToken('root'))).toBeNull();
    // A doctor's token is not an admin session.
    expect(levelFromToken(jwt({ sub: 'd1', typ: 'doctor', ver: 0 }))).toBeNull();
    // Garbage in, null out - never a throw into the sign-in flow.
    expect(levelFromToken('not-a-jwt')).toBeNull();
    expect(levelFromToken('')).toBeNull();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({ status: 'complete', accessToken: adminToken('root'), refreshToken: 'r', expiresIn: 900 }),
      ),
    );
    await expect(signIn('a@b.test', 'pw')).rejects.toMatchObject({
      code: 'MALFORMED_RESPONSE',
    });
    expect(getSession()).toBeNull();
  });
});

describe('idle timeout', () => {
  it('signs out a session that has been idle past the limit', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ ok: true })));
    vi.useFakeTimers();
    try {
      vi.advanceTimersByTime(31 * 60 * 1000);
      await expect(request('/admin/governance/dashboard')).rejects.toMatchObject({
        code: 'SESSION_EXPIRED',
      });
      expect(getSession()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
