import { setSession, type Session } from '../api/http';
import { LEVELS, type AdminLevel } from '../nav';
import { delay } from './db';

/**
 * Sign-in for the UI build.
 *
 * *** NO CREDENTIALS ARE CHECKED AND NOTHING LEAVES THE BROWSER. *** This is a
 * UI panel: any email and password gets you in. The real flow lives in
 * `api/http.ts` (`signIn` / `completeTwoFactor`) and is untouched — swapping
 * back means pointing `SignIn.tsx` at those two functions again.
 *
 * The session it builds is the same shape the real one is, including a token
 * whose `lvl` claim carries the permission level, so `levelFromToken` and
 * every permission gate behave exactly as they would against the backend.
 */

/** base64url, no padding — the encoding a real JWT uses. */
const b64url = (value: unknown): string =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * A structurally valid, deliberately unsigned token. Nothing verifies it
 * because nothing here is a security boundary — it exists so the panel reads
 * its level from the same place it would in production.
 */
export const fakeToken = (level: AdminLevel): string =>
  [
    b64url({ alg: 'none', typ: 'JWT' }),
    b64url({ sub: 'ad-demo', typ: 'admin', ver: 0, kind: 'access', lvl: level }),
    'ui-build-not-signed',
  ].join('.');

const TTL_SECONDS = 15 * 60;

const sessionFor = (email: string, level: AdminLevel): Session => ({
  accessToken: fakeToken(level),
  refreshToken: 'ui-build-refresh',
  expiresAt: Date.now() + TTL_SECONDS * 1000,
  level,
  email,
});

/**
 * Signs in as `super_admin` so every section is reachable. The level can be
 * changed afterwards from the profile menu — see `switchLevel`.
 */
export const mockSignIn = async (email: string): Promise<void> => {
  await delay(null, 420);
  setSession(sessionFor(email.trim().toLowerCase() || 'admin@coracure.com', 'super_admin'));
};

/**
 * Re-issues the session at a different permission level.
 *
 * *** A DEMO AFFORDANCE, NOT A FEATURE. *** There is no endpoint behind it and
 * there never will be — a real admin's level is set by a super admin and read
 * from their token. It exists so the role-gated navigation, the hidden
 * actions and the 403 states can actually be reviewed without six accounts.
 * Delete it with the rest of this folder when the backend is wired in.
 */
export const switchLevel = (level: AdminLevel, email: string): void => {
  setSession(sessionFor(email, level));
};

export const DEMO_LEVELS = LEVELS;
