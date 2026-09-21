import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  authApi,
  clearQueryCache,
  hydrateSession,
  isSignedIn as httpIsSignedIn,
  onSignedOut,
  setSession,
  type PatientVerifyResult,
} from '@coracure/api';

/**
 * Who is signed in, and whether we have finished asking.
 *
 * `status` is three states rather than a boolean because the difference
 * matters: `booting` is "we have not read the keychain yet" and must show the
 * splash, not the welcome screen. Rendering sign-in during boot and then
 * yanking it away is the flash every RN app with a persisted session gets
 * wrong.
 */

export type SessionStatus = 'booting' | 'authenticated' | 'anonymous';

type SessionValue = {
  status: SessionStatus;
  isAuthenticated: boolean;
  /** Set on the verify response — routes a first-time user into profile setup. */
  isNewAccount: boolean;
  /** Why the last session ended, so the sign-in screen can explain itself. */
  endedReason: 'expired' | 'revoked' | 'user' | null;
  signIn: (result: PatientVerifyResult) => void;
  signOut: () => Promise<void>;
  clearEndedReason: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export const useSession = (): SessionValue => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
};

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<SessionStatus>('booting');
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [endedReason, setEndedReason] = useState<SessionValue['endedReason']>(null);

  // Boot: read the keychain once.
  useEffect(() => {
    let cancelled = false;
    hydrateSession()
      .then(() => {
        if (!cancelled) setStatus(httpIsSignedIn() ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        // A keychain that will not open is indistinguishable from no session.
        if (!cancelled) setStatus('anonymous');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * The HTTP layer signs out on its own when a refresh fails — the user is not
   * involved and no screen called anything. This is how the UI finds out.
   */
  useEffect(
    () =>
      onSignedOut((reason) => {
        // Cached patient data must not outlive the session it was fetched under.
        clearQueryCache();
        setIsNewAccount(false);
        setEndedReason(reason);
        setStatus('anonymous');
      }),
    [],
  );

  const signIn = useCallback((result: PatientVerifyResult) => {
    // `verifyPatientOtp` has already installed the tokens; this is the UI half.
    setIsNewAccount(result.isNewAccount);
    setEndedReason(null);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    // `authApi.signOut` clears locally even if the network call fails, and the
    // `onSignedOut` listener above flips the status.
    await authApi.signOut();
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      isAuthenticated: status === 'authenticated',
      isNewAccount,
      endedReason,
      signIn,
      signOut,
      clearEndedReason: () => setEndedReason(null),
    }),
    [status, isNewAccount, endedReason, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

/** Re-exported so screens do not import from two places to set a session. */
export { setSession };
