import { api, clearSession, setSession } from '../http';
import type { OtpChallenge, PatientVerifyResult, TokenPair, VerifyOtpBody } from '../types';

/**
 * Patient authentication.
 *
 * Sign-up and sign-in are the same pair of calls: the response to `request` is
 * identical whether or not the number has an account, so nothing here may imply
 * to the user that it knows them. The patient row is written on the first
 * successful verify.
 */

/** E.164 — exactly the backend's regex, so a bad number fails before a round trip. */
const E164 = /^\+[1-9]\d{7,14}$/;

export const isValidE164 = (mobileNumber: string): boolean => E164.test(mobileNumber);

/** Joins a dial code and national digits into the E.164 the backend stores. */
export const toE164 = (dial: string, nationalDigits: string): string =>
  `${dial}${nationalDigits.replace(/\D/g, '')}`;

export const requestPatientOtp = (mobileNumber: string): Promise<OtpChallenge> =>
  // Built explicitly, not spread: `forbidNonWhitelisted` turns a stray field
  // into a 400.
  api.post<OtpChallenge>('/auth/patient/otp/request', { mobileNumber }, { auth: false });

/**
 * Exchanges the code for tokens and installs the session.
 *
 * `pushToken` and `deviceId` are optional and only sent when the app actually
 * has them — an explicit `undefined` would be stripped by `whitelist: true`
 * anyway, but omitting keeps the payload honest about what was collected.
 */
export const verifyPatientOtp = async (input: {
  mobileNumber: string;
  challengeId: string;
  code: string;
  pushToken?: string;
  deviceId?: string;
}): Promise<PatientVerifyResult> => {
  const body: VerifyOtpBody = {
    mobileNumber: input.mobileNumber,
    challengeId: input.challengeId,
    code: input.code,
  };
  if (input.pushToken) body.pushToken = input.pushToken;
  if (input.deviceId) body.deviceId = input.deviceId;

  const result = await api.post<PatientVerifyResult>('/auth/patient/otp/verify', body, {
    auth: false,
  });
  await setSession(result);
  return result;
};

/** Manual refresh. Ordinary calls never need this — `request` refreshes itself. */
export const refresh = (refreshToken: string): Promise<TokenPair> =>
  api.post<TokenPair>('/auth/refresh', { refreshToken }, { auth: false });

/**
 * Signs out of EVERY device — the backend increments `token_version`, and there
 * is no per-device revocation. The local session is cleared whatever the server
 * says, because a user who tapped sign-out must end up signed out even if the
 * request failed.
 */
export const signOut = async (): Promise<void> => {
  try {
    await api.post<void>('/auth/sign-out');
  } catch {
    // Already-expired token, or no connection. Local clear-down still applies.
  } finally {
    await clearSession('user');
  }
};
