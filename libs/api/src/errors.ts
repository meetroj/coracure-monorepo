/**
 * The one error shape the backend returns, and the codes worth branching on.
 *
 * *** BRANCH ON `code`, NEVER ON `message`. *** `code` is contract and frozen
 * once released; `message` is reworded freely by the backend team and is only
 * ever a fallback for display. Every screen in this app that reacts to a
 * failure reads `error.code`.
 */

/** Verbatim from `docs/API_CONTRACT.md` §3. */
export type ApiErrorBody = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  path?: string;
  requestId?: string;
  timestamp?: string;
};

/** Platform-wide codes, any endpoint. */
export const PlatformCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
  CONFLICT: 'CONFLICT',
  NOT_FOUND: 'NOT_FOUND',
  CONFIG_MISSING: 'CONFIG_MISSING',
  CONFIG_INVALID: 'CONFIG_INVALID',
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/** Domain codes the patient app designs a screen or a branch around. */
export const DomainCode = {
  /** Not a toast. Carries the soonest time the pool can cover. */
  NO_PROVIDER_AVAILABLE: 'NO_PROVIDER_AVAILABLE',
  SLOT_TAKEN: 'SLOT_TAKEN',
  SLOT_UNAVAILABLE: 'SLOT_UNAVAILABLE',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
  PROFILE_INCOMPLETE: 'PROFILE_INCOMPLETE',
  DECLINE_LIMIT_REACHED: 'DECLINE_LIMIT_REACHED',
  ALREADY_PAID: 'ALREADY_PAID',
  NOT_PAYABLE: 'NOT_PAYABLE',
  NOT_REFUNDABLE: 'NOT_REFUNDABLE',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  TOKEN_INVALID: 'TOKEN_INVALID',
  ACCOUNT_NOT_ACTIVE: 'ACCOUNT_NOT_ACTIVE',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_DATE_OF_BIRTH: 'INVALID_DATE_OF_BIRTH',
} as const;

/** Codes this client raises itself; they never come off the wire. */
export const ClientCode = {
  /** No usable connection, DNS failure, or the server never answered. */
  NETWORK_UNAVAILABLE: 'NETWORK_UNAVAILABLE',
  /** The request outlived `timeoutMs`. */
  TIMEOUT: 'TIMEOUT',
  /** A 2xx whose body was not the JSON we expected. */
  MALFORMED_RESPONSE: 'MALFORMED_RESPONSE',
  /** Refresh failed, or there was no session to refresh. The app signs out. */
  SESSION_EXPIRED: 'SESSION_EXPIRED',
} as const;

export type ErrorCode =
  | (typeof PlatformCode)[keyof typeof PlatformCode]
  | (typeof DomainCode)[keyof typeof DomainCode]
  | (typeof ClientCode)[keyof typeof ClientCode]
  | (string & {});

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details: unknown;
  readonly requestId: string | null;
  readonly path: string | null;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.statusCode = body.statusCode;
    this.details = body.details ?? null;
    this.requestId = body.requestId ?? null;
    this.path = body.path ?? null;
    // Extending a builtin across the RN/Babel transpile target loses the
    // prototype chain, so `instanceof ApiError` fails without this.
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /** Local failures — worth a "try again", never worth signing the user out. */
  get isNetwork(): boolean {
    return this.code === ClientCode.NETWORK_UNAVAILABLE || this.code === ClientCode.TIMEOUT;
  }

  get isAuth(): boolean {
    return (
      this.statusCode === 401 ||
      this.code === PlatformCode.UNAUTHENTICATED ||
      this.code === DomainCode.TOKEN_INVALID ||
      this.code === ClientCode.SESSION_EXPIRED
    );
  }

  /** A 5xx or a lost connection is worth retrying; a 4xx is the caller's fault. */
  get isRetryable(): boolean {
    return this.isNetwork || this.statusCode >= 500 || this.statusCode === 429;
  }

  static is(e: unknown): e is ApiError {
    return e instanceof ApiError;
  }

  static of(e: unknown): ApiError | null {
    return e instanceof ApiError ? e : null;
  }
}

/** Builds a client-side ApiError with the same shape as a server one. */
export const clientError = (
  code: (typeof ClientCode)[keyof typeof ClientCode],
  message: string,
  statusCode = 0,
): ApiError => new ApiError({ statusCode, code, message });

/**
 * The sentence a user sees.
 *
 * The backend's `message` is written for humans and is used as-is for anything
 * this map does not cover, but the cases below are ones where a generic
 * server phrasing would be worse than app-specific copy — or where the failure
 * never reached the server at all.
 */
const FRIENDLY: Record<string, string> = {
  [ClientCode.NETWORK_UNAVAILABLE]:
    'No internet connection. Check your network and try again.',
  [ClientCode.TIMEOUT]: 'The server took too long to respond. Please try again.',
  [ClientCode.MALFORMED_RESPONSE]: 'We received an unexpected response. Please try again.',
  [ClientCode.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
  [PlatformCode.INTERNAL_ERROR]: 'Something went wrong on our side. Please try again shortly.',
  [PlatformCode.DATABASE_UNAVAILABLE]: 'We are having trouble reaching our systems. Try again shortly.',
  [PlatformCode.STORAGE_UNAVAILABLE]: 'File storage is unavailable right now. Try again shortly.',
  [PlatformCode.NOT_FOUND]: 'We could not find that.',
  [PlatformCode.FORBIDDEN]: 'You do not have access to that.',
};

export const messageFor = (e: unknown, fallback = 'Something went wrong. Please try again.'): string => {
  if (!ApiError.is(e)) return fallback;
  const friendly = FRIENDLY[e.code];
  if (friendly) return friendly;
  // 429 carries a retry hint often enough that the server text beats ours.
  return e.message?.trim() ? e.message : fallback;
};

/**
 * `TOO_MANY_ATTEMPTS` should read "try again in N minutes", never a raw error.
 * The backend puts the wait in `details`; the shape is not frozen, so this
 * reads defensively and falls back to the server's own sentence.
 */
export const retryAfterSeconds = (e: unknown): number | null => {
  if (!ApiError.is(e)) return null;
  const d = e.details as { retryAfterSeconds?: unknown; retryAfter?: unknown } | null;
  const raw = d?.retryAfterSeconds ?? d?.retryAfter;
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : null;
};
