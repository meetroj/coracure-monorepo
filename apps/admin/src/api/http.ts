/**
 * The one HTTP client for the panel.
 *
 * The error shape, the code catalogue and the `ApiError` class are reused from
 * `@coracure/api/errors` - that file is plain TypeScript with no React Native
 * imports, so the panel gets the same frozen contract the apps branch on
 * without pulling `react-native` into a browser bundle.
 *
 * The rest of `libs/api` is NOT reused, deliberately: its `config.ts` reads
 * `Platform` from react-native and its token store is `react-native-keychain`.
 * Neither means anything here, so the ~90 lines below are the web equivalents.
 */

import {
  ApiError,
  ClientCode,
  clientError,
  type ApiErrorBody,
} from '@coracure/api/errors';

import { LEVELS, type AdminLevel } from '../nav';

/* -------------------------------- config --------------------------------- */

/**
 * `VITE_API_URL` is Vite's own env mechanism - no `define` block and no
 * `react-native-config`. Set it in `.env.local` to point at a deployed backend.
 *
 * *** NOTHING SECRET GOES HERE. *** Anything in a frontend bundle is readable
 * by anyone who opens devtools. The panel only ever holds the admin's own
 * short-lived tokens.
 */
export const API_BASE: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

const TIMEOUT_MS = 20_000;

const url = (path: string): string =>
  `${API_BASE.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

/* ------------------------------ session state ----------------------------- */

export type Session = {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms, from the response's `expiresIn` seconds. */
  expiresAt: number;
  level: AdminLevel;
  /**
   * The address the admin signed in with - echoed back for the header, not
   * read from the token. There is no `GET /auth/admin/me` to ask for a display
   * name (gap A-4), so the panel shows what it already knows rather than
   * inventing a name.
   */
  email: string;
};

/**
 * *** sessionStorage, not localStorage. ***
 *
 * `localStorage` survives closing the tab, which on a shared desktop means the
 * next person to open the browser holds an admin session. `sessionStorage` dies
 * with the tab and is still readable by any script on the origin.
 *
 * ponytail: sessionStorage is the floor, not the ceiling. The right answer is a
 * refresh token in an httpOnly, SameSite=Strict cookie set by the backend, with
 * only the access token in memory - move to that when the deployment can serve
 * the panel and the API from one origin. Until then this is one XSS away from a
 * stolen session, which is why the idle timeout below is not optional.
 */
const STORAGE_KEY = 'coracure.admin.session';

/** Signed out after this long with no request. Clinical data on a desktop. */
const IDLE_LIMIT_MS = 30 * 60 * 1000;

let session: Session | null = null;
let lastActivityAt = 0;

type SignOutReason = 'expired' | 'revoked' | 'idle' | 'user';
const listeners = new Set<(reason: SignOutReason) => void>();

/** The shell subscribes once and routes back to sign-in when this fires. */
export const onSignedOut = (fn: (reason: SignOutReason) => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const emit = (reason: SignOutReason) => {
  for (const fn of listeners) {
    try {
      fn(reason);
    } catch {
      // A listener that throws must not stop the others being told.
    }
  }
};

export const getSession = (): Session | null => session;

export const setSession = (next: Session | null): void => {
  session = next;
  lastActivityAt = Date.now();
  refreshInFlight = null;
  try {
    if (next) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode or a storage quota. The session still works for this tab.
  }
};

/** Reads the persisted session once at boot. Rejects a stale or wrong shape. */
export const hydrateSession = (): Session | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.refreshToken !== 'string' ||
      typeof parsed.expiresAt !== 'number' ||
      typeof parsed.level !== 'string'
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    // `email` is display-only and was added after the first release, so a
    // stored session without it is restored rather than thrown away.
    parsed.email ??= '';
    session = parsed as Session;
    lastActivityAt = Date.now();
    return session;
  } catch {
    return null;
  }
};

export const clearSession = (reason: SignOutReason = 'user'): void => {
  setSession(null);
  emit(reason);
};

/* ------------------------- the level, from the token ---------------------- */

const LEVEL_SET: ReadonlySet<string> = new Set(LEVELS);

/**
 * Reads the permission level out of the access token's own claims.
 *
 * The access token is a JWT and `lvl` is one of its claims - see the backend's
 * `tokens.service.ts`, `interface Claims`. So the panel already holds the level
 * and needs no endpoint to ask for it.
 *
 * *** THIS IS A DECODE, NOT A VERIFICATION. *** Anyone can edit a JWT payload;
 * what they cannot do is re-sign it, and the backend checks the signature on
 * every single request. A tampered `lvl` therefore buys nothing but a sidebar
 * full of links that all answer `INSUFFICIENT_PERMISSION`. Which links to draw
 * is the only decision this function is allowed to make.
 */
export const levelFromToken = (accessToken: string): AdminLevel | null => {
  const payload = accessToken.split('.')[1];
  if (!payload) return null;
  try {
    // JWT uses base64url and strips the padding; `atob` wants neither.
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(
      atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)),
    ) as { typ?: string; lvl?: string };

    if (claims.typ !== 'admin') return null;
    return LEVEL_SET.has(claims.lvl ?? '') ? (claims.lvl as AdminLevel) : null;
  } catch {
    // A truncated or non-JWT token. There is no level to show.
    return null;
  }
};

/* --------------------------- single-flight refresh ------------------------ */

/**
 * *** THE SINGLE FLIGHT. ***
 *
 * Access tokens last 15 minutes. The dashboard fires several widget queries at
 * once; without this, each one that gets a 401 starts its own refresh, and
 * since every refresh returns a NEW pair, all but the winner are rejected and
 * the admin is signed out mid-session for no reason.
 *
 * One promise. The first caller to need a refresh creates it; everyone else
 * awaits the same promise.
 */
let refreshInFlight: Promise<Session> | null = null;

const refresh = async (): Promise<Session> => {
  const current = session;
  if (!current) throw clientError(ClientCode.SESSION_EXPIRED, 'No session to refresh.');

  const response = await fetch(url('/auth/refresh'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  });

  if (!response.ok) {
    clearSession('revoked');
    throw clientError(ClientCode.SESSION_EXPIRED, 'Your session has expired.', response.status);
  }

  const body = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  // The refreshed token carries its own `lvl`, so the level is re-read rather
  // than carried forward - if an admin's level changed, the new token says so.
  const next: Session = {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    expiresAt: Date.now() + body.expiresIn * 1000,
    level: levelFromToken(body.accessToken) ?? current.level,
    email: current.email,
  };
  setSession(next);
  return next;
};

const refreshOnce = (): Promise<Session> => {
  refreshInFlight ??= refresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
};

/* -------------------------------- request -------------------------------- */

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** Built explicitly. NEVER spread form state - `forbidNonWhitelisted` 400s. */
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Set by the retry after a refresh, so one 401 cannot loop. */
  retried?: boolean;
  /** Skips the bearer header and the refresh path. Sign-in only. */
  anonymous?: boolean;
};

export async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', body, query, retried = false, anonymous = false } = options;

  if (!anonymous) {
    if (!session) throw clientError(ClientCode.SESSION_EXPIRED, 'Not signed in.');
    if (Date.now() - lastActivityAt > IDLE_LIMIT_MS) {
      clearSession('idle');
      throw clientError(ClientCode.SESSION_EXPIRED, 'Signed out after 30 minutes idle.');
    }
    lastActivityAt = Date.now();
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url(path) + (qs ? `?${qs}` : ''), {
      method,
      signal: controller.signal,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(anonymous || !session ? {} : { authorization: `Bearer ${session.accessToken}` }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (cause) {
    throw (cause as Error)?.name === 'AbortError'
      ? clientError(ClientCode.TIMEOUT, 'The server took too long to respond.')
      : clientError(ClientCode.NETWORK_UNAVAILABLE, 'Could not reach the server.');
  } finally {
    clearTimeout(timer);
  }

  // One 401, one refresh, one retry. `retried` is what stops the loop.
  if (response.status === 401 && !anonymous && !retried) {
    try {
      await refreshOnce();
    } catch {
      clearSession('expired');
      throw clientError(ClientCode.SESSION_EXPIRED, 'Your session has expired.', 401);
    }
    return request<T>(path, { ...options, retried: true });
  }

  /**
   * A 401 that survived the refresh means the pair the server just issued is
   * still not accepted. Retrying again would loop, and leaving the session in
   * place would strand the admin on a panel where every screen fails and
   * nothing routes back to sign-in. `anonymous` is excluded so the sign-in
   * form's own 401 (`INVALID_CREDENTIALS`) still reaches it unchanged.
   */
  if (response.status === 401 && !anonymous) {
    clearSession('expired');
    throw clientError(ClientCode.SESSION_EXPIRED, 'Your session has expired.', 401);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      if (response.ok) {
        throw clientError(ClientCode.MALFORMED_RESPONSE, 'Unexpected response from the server.');
      }
    }
  }

  if (!response.ok) {
    const shape = parsed as Partial<ApiErrorBody> | null;
    // TOKEN_INVALID means sign out cleanly - never loop the refresh.
    if (shape?.code === 'TOKEN_INVALID') clearSession('revoked');
    throw new ApiError({
      statusCode: shape?.statusCode ?? response.status,
      code: shape?.code ?? 'INTERNAL_ERROR',
      message: shape?.message ?? response.statusText,
      details: shape?.details,
      path: shape?.path,
      requestId: shape?.requestId ?? response.headers.get('x-request-id') ?? undefined,
    });
  }

  return parsed as T;
}

/* --------------------------------- auth ---------------------------------- */

type TokenResponse = { accessToken: string; refreshToken: string; expiresIn: number };

export type SignInResult =
  | { status: 'complete' }
  | { status: 'two_factor_required'; mfaToken: string };

/**
 * `POST /auth/admin/sign-in`. Either completes, or hands back an `mfaToken` for
 * the second leg. `INVALID_CREDENTIALS` is the answer for both a wrong password
 * and an unknown address - the backend verifies against a decoy hash so the
 * timing does not leak which addresses exist, and the copy must not either.
 */
/**
 * Held between the two legs of a two-factor sign-in, so the session carries
 * the address for the header even though only the first leg is given it.
 */
let pendingEmail = '';

export const signIn = async (email: string, password: string): Promise<SignInResult> => {
  const body = await request<
    (TokenResponse & { status: 'complete' }) | { status: 'two_factor_required'; mfaToken: string }
  >('/auth/admin/sign-in', {
    method: 'POST',
    body: { email, password },
    anonymous: true,
  });

  pendingEmail = email;
  if (body.status === 'two_factor_required') return { status: 'two_factor_required', mfaToken: body.mfaToken };
  setSession(toSession(body, email));
  return { status: 'complete' };
};

/** Second leg. A `TOKEN_INVALID` here means start over at the password screen. */
export const completeTwoFactor = async (mfaToken: string, code: string): Promise<void> => {
  const body = await request<TokenResponse>('/auth/admin/two-factor', {
    method: 'POST',
    body: { mfaToken, code },
    anonymous: true,
  });
  setSession(toSession(body, pendingEmail));
};

/** Ends the session on EVERY device - it is one `token_version` increment. */
export const signOut = async (): Promise<void> => {
  try {
    await request<void>('/auth/sign-out', { method: 'POST' });
  } catch {
    // Already invalid server-side. Local state is what signs the admin out.
  }
  clearSession('user');
};

/**
 * A token whose claims do not name a known admin level is not a session this
 * panel can draw a navigation for. Refusing here is better than defaulting to
 * some level and showing an admin the wrong sidebar.
 */
const toSession = (t: TokenResponse, email: string): Session => {
  const level = levelFromToken(t.accessToken);
  if (!level) {
    throw clientError(
      ClientCode.MALFORMED_RESPONSE,
      'That sign-in did not return an admin session.',
    );
  }
  return {
    accessToken: t.accessToken,
    refreshToken: t.refreshToken,
    expiresAt: Date.now() + t.expiresIn * 1000,
    level,
    email,
  };
};

/** Test seam: resets module state between specs. */
export const __resetForTests = (): void => {
  session = null;
  lastActivityAt = 0;
  refreshInFlight = null;
  listeners.clear();
};
