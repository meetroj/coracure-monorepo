import { api, clearSession, hydrateSession, onSignedOut, setSession } from '../http';

/**
 * Doctor sign-in (API_CONTRACT §7.1).
 *
 * *** THERE IS NO DOCTOR SIGN-UP, AND THERE MUST NEVER BE ONE HERE. *** An
 * administrator creates the account (`POST /v1/admin/doctors`), so a number
 * nobody has enrolled is REFUSED rather than texted a code. The backend answers
 * an unknown number and a wrong code with the SAME `INVALID_CREDENTIALS`, on
 * purpose: a different code for "no such doctor" would let anyone test whether
 * a given clinician is on the platform. The app must not try to tell them
 * apart either, which is why nothing in this module branches on it.
 *
 * Both calls are `auth: false`: there is no session yet, and sending a stale
 * bearer would make the request 401 before it reached the handler.
 */

/** Mirrors `doctor_verification_status`. */
export type DoctorVerificationStatus =
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'suspended';

export type OtpChallenge = { challengeId: string };

export type DoctorSignIn = {
  /**
   * *** WHAT THE APP ROUTES ON. *** Anything but `verified` lands on the
   * credential screen, not the dashboard. `rejected` and `suspended` never
   * reach here — the backend refuses those at sign-in with
   * `ACCOUNT_NOT_ACTIVE` — so in practice this is pending, under_review or
   * verified.
   */
  verificationStatus: DoctorVerificationStatus;
};

export type VerifyInput = {
  mobileNumber: string;
  /** From `requestOtp`. A RESEND ISSUES A NEW ONE — replace the id you hold. */
  challengeId: string;
  code: string;
  /** Push delivery is bound to the device on the sign-in that registers it. */
  pushToken?: string;
  deviceId?: string;
};

/**
 * Sends a code to a number an admin has already enrolled.
 *
 * `TOO_MANY_ATTEMPTS` is counted per number, not per device, so a second phone
 * cannot get around it — and the wait is in the message rather than in
 * `details`, which is why callers render `messageFor(e)` here instead of
 * building their own "try again in N minutes".
 */
export const requestOtp = (mobileNumber: string): Promise<OtpChallenge> =>
  api.post<OtpChallenge>('/auth/doctor/otp/request', { mobileNumber }, { auth: false });

/**
 * Exchanges the code for a session.
 *
 * The tokens are written to secure storage BEFORE this resolves, so a screen
 * may make an authenticated call the moment it sees the result — there is no
 * window where the caller is "signed in" to the UI but not to the client.
 *
 * The body is built field by field rather than spread from form state: the
 * backend runs `forbidNonWhitelisted`, so one stray key is a hard 400 and not
 * an ignored field.
 */
export const verifyOtp = async (input: VerifyInput): Promise<DoctorSignIn> => {
  const body = await api.post<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    verificationStatus: DoctorVerificationStatus;
  }>(
    '/auth/doctor/otp/verify',
    {
      mobileNumber: input.mobileNumber,
      challengeId: input.challengeId,
      code: input.code,
      ...(input.pushToken ? { pushToken: input.pushToken } : {}),
      ...(input.deviceId ? { deviceId: input.deviceId } : {}),
    },
    { auth: false },
  );

  // `setSession` lives in the module that owns the refresh, so the persisted
  // pair and the in-memory one can never disagree.
  await setSession(body);
  return { verificationStatus: body.verificationStatus };
};

/**
 * Ends the session.
 *
 * *** THE LOCAL CLEAR IS UNCONDITIONAL. *** The server call revokes every
 * device (one `token_version` bump), but if it fails — flight mode, a dead
 * backend — the doctor still asked to be signed out, and leaving a live token
 * on a device holding clinical data because a request timed out is the wrong
 * failure. The call is best-effort; the clear is not.
 */
export const signOut = async (): Promise<void> => {
  try {
    await api.post<void>('/auth/sign-out');
  } catch {
    // Already-expired tokens 401 here. Nothing to report: the intent is local.
  } finally {
    await clearSession('user');
  }
};

/**
 * Cold start. Reads the keychain once and reports whether there is a session
 * to resume — it does NOT prove the token still works, because only a call can
 * do that. A revoked token surfaces on the first real request, where `http`
 * signs out and `onSignedOut` routes back here.
 */
export const restoreSession = async (): Promise<boolean> => (await hydrateSession()) !== null;

export { onSignedOut };
