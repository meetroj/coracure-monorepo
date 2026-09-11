import { apiUrl, getApiConfig } from './config';
import { ApiError, ClientCode, clientError, type ApiErrorBody } from './errors';
import {
  clearTokens,
  loadTokens,
  saveTokens,
  type SessionTokens,
} from './tokenStore';

/**
 * The one HTTP client. Every call in the app goes through `request`, which is
 * what makes the base URL, the bearer header, the error shape, the timeout and
 * the refresh rule single-sourced instead of re-implemented per screen.
 */

/* ------------------------------ session state ----------------------------- */

let session: SessionTokens | null = null;
let hydrated = false;

type SignOutReason = 'expired' | 'revoked' | 'user';
type Listener = (reason: SignOutReason) => void;
const signOutListeners = new Set<Listener>();

/** The app subscribes once and routes back to sign-in when this fires. */
export const onSignedOut = (fn: Listener): (() => void) => {
  signOutListeners.add(fn);
  return () => signOutListeners.delete(fn);
};

const emitSignOut = (reason: SignOutReason) => {
  signOutListeners.forEach((fn) => {
    try {
      fn(reason);
    } catch {
      // A listener that throws must not stop the others from being told.
    }
  });
};

/** Reads the persisted session once per process, then serves from memory. */
export const hydrateSession = async (): Promise<SessionTokens | null> => {
  if (hydrated) return session;
  session = await loadTokens();
  hydrated = true;
  return session;
};

export const getSession = (): SessionTokens | null => session;
export const isSignedIn = (): boolean => session !== null;

export const setSession = async (
  tokens: { accessToken: string; refreshToken: string; expiresIn: number } | null,
): Promise<void> => {
  hydrated = true;
  if (!tokens) {
    session = null;
    await clearTokens();
    return;
  }
  session = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
  };
  await saveTokens(session);
};

/** Ends the session locally. The caller decides whether to tell the backend. */
export const clearSession = async (reason: SignOutReason = 'user'): Promise<void> => {
  session = null;
  refreshInFlight = null;
  await clearTokens();
  emitSignOut(reason);
};

/* --------------------------- single-flight refresh ------------------------ */

/**
 * *** THE SINGLE FLIGHT. ***
 *
 * Access tokens last 15 minutes. A dashboard that fires four queries at once
 * after expiry would, without this, issue four refreshes — and since each one
 * returns a new pair, three of the four lose the race and the user is signed
 * out mid-session for no reason.
 *
 * The rule is one promise: the first caller to need a refresh creates it, and
 * every other caller awaits the same promise rather than starting its own.
 */
let refreshInFlight: Promise<SessionTokens> | null = null;

/** Refresh this far before real expiry, so a request in flight cannot age out. */
const EXPIRY_SKEW_MS = 45_000;

const refreshSession = (): Promise<SessionTokens> => {
  if (refreshInFlight) return refreshInFlight;

  const current = session;
  if (!current) {
    return Promise.reject(
      clientError(ClientCode.SESSION_EXPIRED, 'Your session has expired. Please sign in again.', 401),
    );
  }

  refreshInFlight = (async () => {
    try {
      // Deliberately not `request()`: this call must never itself trigger a
      // refresh, or a failing refresh would recurse until the stack gave out.
      const body = await rawJson<{ accessToken: string; refreshToken: string; expiresIn: number }>(
        'POST',
        '/auth/refresh',
        { refreshToken: current.refreshToken },
        null,
      );
      await setSession(body);
      // `setSession` has just written it, so this is never null.
      return session as SessionTokens;
    } catch (e) {
      // A refresh that fails is terminal: the refresh token is expired, revoked
      // by a `token_version` bump, or invalid. Retrying cannot help.
      await clearSession('expired');
      throw ApiError.is(e) && e.isNetwork
        ? e
        : clientError(ClientCode.SESSION_EXPIRED, 'Your session has expired. Please sign in again.', 401);
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

/* -------------------------------- transport ------------------------------- */

export type RequestOptions = {
  /** Attach the bearer token and refresh on 401. Default true. */
  auth?: boolean;
  /** Appended as a query string; undefined and null entries are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  /** Overrides the configured timeout for one call. */
  timeoutMs?: number;
};

const buildUrl = (path: string, query: RequestOptions['query']): string => {
  const url = apiUrl(path);
  if (!query) return url;
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `${url}?${parts.join('&')}` : url;
};

/**
 * One fetch. No refresh, no retry — `request` layers those on top.
 *
 * `accessToken` is passed explicitly rather than read from module state so the
 * retry after a refresh cannot accidentally re-send the token that just 401'd.
 */
const rawJson = async <T>(
  method: string,
  path: string,
  body: unknown | undefined,
  accessToken: string | null,
  options: RequestOptions = {},
): Promise<T> => {
  const { timeoutMs } = getApiConfig();
  const controller = new AbortController();
  const limit = options.timeoutMs ?? timeoutMs;
  const timer = setTimeout(() => controller.abort(), limit);

  // Honour a caller's own cancellation (a screen unmounting) as well as ours.
  const onExternalAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onExternalAbort);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        'X-Client': getApiConfig().clientName,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    // fetch rejects for a dead network AND for our own abort; only the clock
    // can tell them apart.
    const aborted = (e as { name?: string })?.name === 'AbortError';
    throw aborted && !options.signal?.aborted
      ? clientError(ClientCode.TIMEOUT, `The request timed out after ${Math.round(limit / 1000)}s.`)
      : clientError(ClientCode.NETWORK_UNAVAILABLE, 'We could not reach Coracure.');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }

  // `x-request-id` ties this call to a backend log line and is worth keeping
  // even when the body has none.
  const requestId = response.headers.get('x-request-id');

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    if (response.ok) return undefined as T;
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      if (response.ok) {
        throw clientError(ClientCode.MALFORMED_RESPONSE, 'Unexpected response from the server.', response.status);
      }
    }
  }

  if (response.ok) return (parsed ?? undefined) as T;

  const envelope = (parsed ?? {}) as Partial<ApiErrorBody>;
  throw new ApiError({
    statusCode: envelope.statusCode ?? response.status,
    // A gateway or proxy failure has no envelope at all; label it rather than
    // letting `code` be undefined and every branch below silently miss.
    code: envelope.code ?? (response.status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN_ERROR'),
    message: envelope.message ?? `Request failed with status ${response.status}.`,
    details: envelope.details,
    path: envelope.path,
    requestId: envelope.requestId ?? requestId ?? undefined,
    timestamp: envelope.timestamp,
  });
};

/**
 * The call every endpoint module makes.
 *
 * Refresh happens in two places, and both matter:
 *
 * - **Before the request**, when the token is known to be within `EXPIRY_SKEW_MS`
 *   of expiry. This is the common path and it avoids the 401 entirely.
 * - **After a 401**, once, for the case where the server revoked the token
 *   early (a `token_version` bump from a sign-out elsewhere) and the clock had
 *   no way to know.
 *
 * The retry is deliberately capped at one. A second 401 after a fresh token
 * means the account is gone or suspended, and looping would just hammer the
 * endpoint.
 */
export const request = async <T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> => {
  const needsAuth = options.auth !== false;
  if (!needsAuth) return rawJson<T>(method, path, body, null, options);

  await hydrateSession();
  if (!session) {
    throw clientError(ClientCode.SESSION_EXPIRED, 'Please sign in to continue.', 401);
  }

  if (session.expiresAt - Date.now() < EXPIRY_SKEW_MS) {
    await refreshSession();
  }

  const token = session?.accessToken ?? null;
  try {
    return await rawJson<T>(method, path, body, token, options);
  } catch (e) {
    const err = ApiError.of(e);
    if (!err || !err.isAuth) throw e;

    // TOKEN_INVALID means the pair is revoked; refreshing it cannot succeed.
    if (err.code === 'TOKEN_INVALID') {
      await clearSession('revoked');
      throw clientError(ClientCode.SESSION_EXPIRED, 'Your session has ended. Please sign in again.', 401);
    }

    const refreshed = await refreshSession();
    return rawJson<T>(method, path, body, refreshed.accessToken, options);
  }
};

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};

/** Test seam — resets module state between specs. */
export const __resetHttpForTests = (): void => {
  session = null;
  hydrated = false;
  refreshInFlight = null;
  signOutListeners.clear();
};
