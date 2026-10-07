import { configureApi } from '../config';
import { ApiError, ClientCode, messageFor } from '../errors';
import { __resetHttpForTests, api, getSession, onSignedOut, setSession } from '../http';
import { __resetMemoryForTests } from '../tokenStore';
import { requestOtp, restoreSession, signOut, verifyOtp } from './doctorAuth';

/**
 * Doctor sign-in, at the seam where it meets the network.
 *
 * Everything here is an edge case the happy path hides: the challenge a resend
 * replaces, the session that must exist before `verifyOtp` resolves, the
 * sign-out that has to work with the backend unreachable, and the refusals the
 * screen has to tell apart. None of it is visible in a manual run against a
 * healthy server, which is the whole reason it is pinned here.
 */

type Reply = { status: number; body: unknown };

let replies: Reply[];
let calls: { url: string; method: string; body: any; auth: string | null }[];

const ok = (body: unknown): Reply => ({ status: 200, body });
const fail = (status: number, code: string, message = 'nope', details?: unknown): Reply => ({
  status,
  body: { statusCode: status, code, message, ...(details ? { details } : {}) },
});

const TOKENS = { accessToken: 'a-1', refreshToken: 'r-1', expiresIn: 900 };

beforeEach(() => {
  __resetHttpForTests();
  __resetMemoryForTests();
  replies = [];
  calls = [];
  configureApi({ baseUrl: 'http://api.test/api/v1', timeoutMs: 5000 });

  global.fetch = jest.fn(async (url: unknown, init: any) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({
      url: String(url),
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      auth: headers.Authorization ?? null,
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

/* ------------------------------ requesting -------------------------------- */

describe('requesting a code', () => {
  it('posts the E.164 number and nothing else, unauthenticated', async () => {
    replies = [ok({ challengeId: 'ch-1' })];

    await expect(requestOtp('+919876543210')).resolves.toEqual({ challengeId: 'ch-1' });

    expect(calls[0].url).toBe('http://api.test/api/v1/auth/doctor/otp/request');
    // `forbidNonWhitelisted` makes an extra key a hard 400, so the body is
    // exactly one field — never a spread of screen state.
    expect(calls[0].body).toEqual({ mobileNumber: '+919876543210' });
    // No session exists yet; sending a stale bearer would 401 before the
    // handler ever ran.
    expect(calls[0].auth).toBeNull();
  });

  it('surfaces a suspended account as ACCOUNT_NOT_ACTIVE', async () => {
    replies = [fail(403, 'ACCOUNT_NOT_ACTIVE', 'This account is no longer active.')];

    await expect(requestOtp('+919999999999')).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_ACTIVE',
      statusCode: 403,
    });
  });

  it('keeps the server sentence for TOO_MANY_ATTEMPTS, because the wait is only in the text', async () => {
    replies = [fail(429, 'TOO_MANY_ATTEMPTS', 'Too many attempts. Please try again in 15 minutes.')];

    const error = await requestOtp('+919876543210').catch((e) => e);

    // `details` is empty on this one — the backend interpolates the window into
    // the message and sends nothing machine-readable — so a client that built
    // its own "try again in N" copy would have no N to put in it.
    expect((error as ApiError).details).toBeNull();
    expect(messageFor(error)).toMatch(/15 minutes/);
  });

  it('turns a dead network into a retryable client error rather than a crash', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Network request failed'));

    const error = await requestOtp('+919876543210').catch((e) => e);

    expect((error as ApiError).code).toBe(ClientCode.NETWORK_UNAVAILABLE);
    expect((error as ApiError).isRetryable).toBe(true);
    expect(messageFor(error)).toMatch(/No internet connection/);
  });
});

/* ------------------------------- verifying -------------------------------- */

describe('verifying a code', () => {
  it('sends the challenge alongside the code, and omits optional device fields when absent', async () => {
    replies = [ok({ ...TOKENS, verificationStatus: 'verified' })];

    await verifyOtp({ mobileNumber: '+919876543210', challengeId: 'ch-1', code: '000000' });

    expect(calls[0].body).toEqual({
      mobileNumber: '+919876543210',
      challengeId: 'ch-1',
      code: '000000',
    });
    expect(calls[0].body).not.toHaveProperty('pushToken');
    expect(calls[0].body).not.toHaveProperty('deviceId');
  });

  it('includes the push token and device id when the app has them', async () => {
    replies = [ok({ ...TOKENS, verificationStatus: 'verified' })];

    await verifyOtp({
      mobileNumber: '+919876543210',
      challengeId: 'ch-1',
      code: '000000',
      pushToken: 'fcm-abc',
      deviceId: 'device-1',
    });

    expect(calls[0].body).toMatchObject({ pushToken: 'fcm-abc', deviceId: 'device-1' });
  });

  it('has the session stored BEFORE it resolves, so the next call is already authenticated', async () => {
    replies = [ok({ ...TOKENS, verificationStatus: 'verified' }), ok({ ok: true })];

    await verifyOtp({ mobileNumber: '+919876543210', challengeId: 'ch-1', code: '000000' });

    expect(getSession()?.accessToken).toBe('a-1');
    await api.get('/me/doctor/profile');
    expect(calls[1].auth).toBe('Bearer a-1');
  });

  it('derives the expiry from expiresIn seconds, not milliseconds', async () => {
    replies = [ok({ ...TOKENS, expiresIn: 900, verificationStatus: 'verified' })];
    const before = Date.now();

    await verifyOtp({ mobileNumber: '+919876543210', challengeId: 'ch-1', code: '000000' });

    // 900 read as milliseconds would expire the session on the next tick and
    // refresh-storm the backend; 900 seconds is 15 minutes.
    const ttl = (getSession() as { expiresAt: number }).expiresAt - before;
    expect(ttl).toBeGreaterThan(14 * 60_000);
    expect(ttl).toBeLessThanOrEqual(15 * 60_000 + 50);
  });

  it.each([
    ['pending', 'pending'],
    ['under_review', 'under_review'],
    ['verified', 'verified'],
    // a rejected doctor signs in to read the reason and resubmit
    ['rejected', 'rejected'],
  ])('reports verificationStatus %s, which is what the app routes on', async (status) => {
    replies = [ok({ ...TOKENS, verificationStatus: status, isNewAccount: false })];

    await expect(
      verifyOtp({ mobileNumber: '+919876543210', challengeId: 'ch-1', code: '000000' }),
    ).resolves.toEqual({ verificationStatus: status, isNewAccount: false });
  });

  it('says when the verification created the account', async () => {
    replies = [ok({ ...TOKENS, verificationStatus: 'pending', isNewAccount: true })];

    await expect(
      verifyOtp({ mobileNumber: '+919876543210', challengeId: 'ch-1', code: '000000' }),
    ).resolves.toEqual({ verificationStatus: 'pending', isNewAccount: true });
  });

  it('leaves no session behind when the code is wrong', async () => {
    replies = [fail(401, 'INVALID_CREDENTIALS', 'That code is not correct or has expired.')];

    await expect(
      verifyOtp({ mobileNumber: '+919876543210', challengeId: 'ch-1', code: '111111' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });

    // A half-written session is worse than none: it would let the app believe
    // it was signed in and 401 on the first real screen.
    expect(getSession()).toBeNull();
  });

  it('reports a suspended or rejected account as ACCOUNT_NOT_ACTIVE, not as a bad code', async () => {
    replies = [fail(403, 'ACCOUNT_NOT_ACTIVE', 'This account is no longer active.')];

    await expect(
      verifyOtp({ mobileNumber: '+919876543210', challengeId: 'ch-1', code: '000000' }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_NOT_ACTIVE', statusCode: 403 });
  });

  it('verifying against a stale challenge fails like any wrong code, so a resend must replace the id', async () => {
    // What the server sees after a resend: the old challenge no longer matches.
    replies = [ok({ challengeId: 'ch-2' }), fail(401, 'INVALID_CREDENTIALS', 'That code is not correct or has expired.')];

    const resent = await requestOtp('+919876543210');
    expect(resent.challengeId).toBe('ch-2');

    await expect(
      verifyOtp({ mobileNumber: '+919876543210', challengeId: 'ch-1', code: '000000' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });
});

/* ------------------------------- signing out ------------------------------ */

describe('signing out', () => {
  it('revokes on the server and clears locally', async () => {
    await setSession(TOKENS);
    replies = [{ status: 204, body: null }];

    await signOut();

    expect(calls[0].url).toBe('http://api.test/api/v1/auth/sign-out');
    expect(calls[0].auth).toBe('Bearer a-1');
    expect(getSession()).toBeNull();
  });

  it('still clears the session when the server cannot be reached', async () => {
    await setSession(TOKENS);
    (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Network request failed'));

    // Leaving a live token on a device holding clinical data because a request
    // timed out is the wrong way to fail. The intent is local.
    await expect(signOut()).resolves.toBeUndefined();
    expect(getSession()).toBeNull();
  });

  it('tells the app once, so the navigator can route back to sign-in', async () => {
    const seen: string[] = [];
    onSignedOut((reason) => seen.push(reason));
    await setSession(TOKENS);
    replies = [{ status: 204, body: null }];

    await signOut();

    expect(seen).toEqual(['user']);
  });
});

/* ------------------------------ cold start -------------------------------- */

describe('restoring a session', () => {
  it('is false with nothing stored', async () => {
    await expect(restoreSession()).resolves.toBe(false);
  });

  it('is true once a session has been saved, without making a call', async () => {
    await setSession(TOKENS);

    await expect(restoreSession()).resolves.toBe(true);
    expect(calls).toHaveLength(0);
  });
});
