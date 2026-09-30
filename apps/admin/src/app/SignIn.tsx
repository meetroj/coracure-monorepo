import { useState } from 'react';
import { ApiError, messageFor, retryAfterSeconds } from '@coracure/api/errors';

import { mockSignIn } from '../mock/auth';
import logo from '../assets/brand/coracure-wide-twotone.svg';
import hero from '../assets/login-hero.png';

/**
 * Email and password, then an optional OTP. That is the whole admin sign-in —
 * there is no self sign-up, no password reset endpoint and no 2FA setup screen,
 * because none of the three exists server-side (gap A-4).
 *
 * The permission level is NOT asked for. It rides in the access token's `lvl`
 * claim and is read back by `levelFromToken`, which is what builds the sidebar.
 *
 * Layout is the supplied comp: brand artwork left, form right on plain white
 * with no card around it.
 */

/** The email is remembered; the SESSION never is. See the checkbox comment. */
const REMEMBERED_EMAIL = 'coracure.admin.email';

export function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL) ?? '');
  const [remember, setRemember] = useState(() => localStorage.getItem(REMEMBERED_EMAIL) !== null);
  const [password, setPassword] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetHint, setResetHint] = useState(false);

  const fail = (e: unknown) => {
    const wait = retryAfterSeconds(e);
    // TOO_MANY_ATTEMPTS must read as a wait, never as a raw error.
    if (ApiError.of(e)?.code === 'TOO_MANY_ATTEMPTS' && wait) {
      setError(`Too many attempts. Try again in ${Math.ceil(wait / 60)} minute(s).`);
      return;
    }
    // The second leg expiring is not a wrong code — it is start-over.
    if (ApiError.of(e)?.code === 'TOKEN_INVALID') {
      setMfaToken(null);
      setCode('');
      setError('That sign-in attempt expired. Please enter your password again.');
      return;
    }
    setError(messageFor(e, 'Could not sign in. Please try again.'));
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const address = email.trim().toLowerCase();
    try {
      // UI build: no credentials are checked and nothing leaves the browser.
      await mockSignIn(address);
      if (remember) localStorage.setItem(REMEMBERED_EMAIL, address);
      else localStorage.removeItem(REMEMBERED_EMAIL);
      onSignedIn();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mfaToken) return;
    setBusy(true);
    setError(null);
    try {
      await mockSignIn(email.trim().toLowerCase());
      onSignedIn();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth">
      {/*
        The artwork carries its own mint field on the left for this copy, but
        the panel's aspect ratio is not the image's, so how much of that field
        survives depends on the window. The scrim in `styles.css` is what makes
        the text legible at every size rather than only at the design width.
      */}
      <section className="auth__hero" style={{ backgroundImage: `url(${hero})` }}>
        <div className="auth__heroContent">
          <img className="auth__logo" src={logo} alt="Coracure" width={220} />

          <div>
            <p className="eyebrow">
              <span className="eyebrow__rule" />
              Admin panel
            </p>

            <h1 className="auth__headline">
              Better
              <br />
              Healthcare
              <br />
              <span className="auth__headlineAccent">Together</span>
            </h1>

            <p className="auth__lede">
              Manage providers, consultations, content and more across the
              Coracure platform.
            </p>

            <ul className="auth__features">
              {FEATURES.map((feature) => (
                <li key={feature.id}>
                  <span className="auth__featureIcon" aria-hidden="true">
                    {feature.icon}
                  </span>
                  <span>
                    {feature.line1}
                    <br />
                    {feature.line2}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="eyebrow auth__footnote">
            <span className="eyebrow__rule" />
            People · Care · Technology
          </p>
        </div>
      </section>

      {/* No card — the form sits directly on the page, as in the comp. */}
      <section className="auth__panel">
        <form className="auth__form" onSubmit={mfaToken ? submitCode : submitPassword}>
          <p className="eyebrow">Welcome to</p>
          <img className="auth__logo auth__logo--form" src={logo} alt="Coracure" width={200} />

          {mfaToken ? (
            <>
              <h2 className="auth__title">Two-factor verification</h2>
              <p className="muted auth__subtitle">
                Enter the 6-digit code sent to your mobile number.
              </p>

              <label htmlFor="code">Verification code</label>
              <div className="field">
                <span className="field__icon" aria-hidden="true">
                  {ICON.shield}
                </span>
                <input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <h2 className="auth__title">Sign in to Admin Panel</h2>
              <p className="muted auth__subtitle">Access and manage the Coracure platform.</p>

              <label htmlFor="email">Email address</label>
              <div className="field">
                <span className="field__icon" aria-hidden="true">
                  {ICON.mail}
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@coracure.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <label htmlFor="password">Password</label>
              <div className="field">
                <span className="field__icon" aria-hidden="true">
                  {ICON.lock}
                </span>
                <input
                  id="password"
                  type={revealed ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="field__reveal"
                  type="button"
                  onClick={() => setRevealed((v) => !v)}
                  aria-label={revealed ? 'Hide password' : 'Show password'}
                  aria-pressed={revealed}
                >
                  {revealed ? ICON.eyeOff : ICON.eye}
                </button>
              </div>

              <div className="auth__row">
                {/*
                  Remembers the EMAIL ADDRESS, not the session.

                  A "remember me" that persists an admin session would mean
                  writing a token to localStorage, where it survives closing the
                  browser — on a shared desktop that hands the next person an
                  admin session, and this panel reads clinical records. The
                  session stays in sessionStorage and still dies with the tab.
                */}
                <label className="checkbox" htmlFor="remember">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember my email
                </label>

                <button
                  className="linkish"
                  type="button"
                  onClick={() => setResetHint((v) => !v)}
                >
                  Forgot password?
                </button>
              </div>

              {/*
                There is no password-reset endpoint on the backend (gap A-4), so
                this says what actually happens rather than opening a flow that
                cannot complete.
              */}
              {resetHint && (
                <p className="note" role="status">
                  Admin passwords are reset by a super admin — there is no
                  self-service reset. Ask one to set you a new password.
                </p>
              )}
            </>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button className="button" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : mfaToken ? 'Verify' : 'Sign in'}
            {!busy && <span aria-hidden="true"> →</span>}
          </button>

          <p className="muted small auth__note">
            Admin accounts are created by another admin. There is no sign-up.
          </p>
        </form>
      </section>
    </main>
  );
}

/* ------------------------------ inline icons ------------------------------ */

/**
 * Five small glyphs, inline. A whole icon package for five paths would be a
 * dependency to keep current for no gain; these are copied to the same 24×24
 * stroke grid the apps' `Icon` uses.
 */
const svg = (children: React.ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const ICON = {
  mail: svg(
    <>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="m3.5 7 7.6 5.3a1.6 1.6 0 0 0 1.8 0L20.5 7" />
    </>,
  ),
  lock: svg(
    <>
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V7a4 4 0 1 1 8 0v3.5" />
    </>,
  ),
  eye: svg(
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>,
  ),
  eyeOff: svg(
    <>
      <path d="M10.6 6.2A7.9 7.9 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.7 3.4M6.3 7.8A16.9 16.9 0 0 0 2.5 12S6 18 12 18a8.7 8.7 0 0 0 3.6-.8" />
      <path d="m3 3 18 18" />
    </>,
  ),
  shield: svg(
    <>
      <path d="M12 3.2 5 6v5.5c0 4.2 2.9 7.4 7 9.3 4.1-1.9 7-5.1 7-9.3V6Z" />
      <path d="m9.2 12 2 2 3.6-3.8" />
    </>,
  ),
};

const FEATURES = [
  { id: 'trusted', line1: 'Trusted', line2: 'platform', icon: ICON.shield },
  {
    id: 'outcomes',
    line1: 'Better',
    line2: 'outcomes',
    icon: svg(
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19.5c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6" />
        <path d="M16.5 6.2a3 3 0 0 1 0 5.6M18 15.2c1.6.7 2.7 2.2 3 4.3" />
      </>,
    ),
  },
  {
    id: 'decisions',
    line1: 'Data-driven',
    line2: 'decisions',
    icon: svg(
      <>
        <path d="M5 19.5V13M12 19.5V6M19 19.5v-8" />
      </>,
    ),
  },
];
