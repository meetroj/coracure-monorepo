import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { doctorAuthApi } from '@coracure/api';

import DoctorLoginScreen from './screens/DoctorLoginScreen';
import IntroScreen from './screens/IntroScreen';
import OnboardingFlow from './screens/onboarding/OnboardingFlow';
import AppShell from './AppShell';
import ErrorBoundary from './ErrorBoundary';
import { PortalProvider } from '../components/Portal';
import { ToastHost } from '../components/Toast';
import { ConfirmHost } from '../components/confirm';
import { KeyboardDoneBar } from '../components/KeyboardDoneBar';
import { brand } from '../theme/brand';
import { useStore } from '../state/store';
import { completeSignIn, endSession, leaveIntro, leaveOnboarding, submitRegistration } from '../state/actions';

/**
 * Doctor app root.
 *
 * A three-slide intro runs once before sign-in, then the stage moves to
 * `login` for the rest of the session.
 *
 * Doctors register themselves: sign-in and sign-up are one mobile number and a
 * one-time code, and an administrator then approves or rejects the details. A
 * doctor whose details are already on file (the demo account, 98765 43210)
 * lands on the Dashboard; a new account first completes onboarding — basic details, identity,
 * qualifications and experience — and then reaches the app with its account
 * under review on the Profile tab.
 *
 * The stage lives in the store, so signing out and back in as the same doctor
 * keeps what they did this session. The error boundary sits outside
 * everything: a throw while a screen mounts shows the error instead of a
 * white screen, which in a release build is the only way to see what failed.
 * Sheets, menus and toasts render in one host above the navigator.
 */
export const App = () => {
  const stage = useStore((s) => s.session.stage);
  const mobile = useStore((s) => s.session.mobile);
  const submission = useStore((s) => s.submission);

  /**
   * The client signs out on its own when a refresh fails or the account's
   * `token_version` moves — a sign-out from another device, or an admin
   * suspension. Without this the app would sit on a dashboard whose every
   * request 401s. Subscribing at the root means it is handled once, wherever
   * the doctor happens to be.
   *
   * Cold-start restore is kicked off by `main.tsx`, not here: a spec renders
   * this component directly and must not have a network call wired into mount.
   */
  useEffect(() => doctorAuthApi.onSignedOut(() => endSession()), []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PortalProvider>
          {stage === 'restoring' && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.colors.surface.page }}>
              <ActivityIndicator size="large" color={brand.colors.surfie} />
            </View>
          )}
          {stage === 'login' && <DoctorLoginScreen onAuthenticated={completeSignIn} />}
          {stage === 'onboarding' && (
            <OnboardingFlow
              mobile={mobile}
              initialDraft={submission}
              onSubmitted={submitRegistration}
              onExit={leaveOnboarding}
            />
          )}
          {stage === 'shell' && <AppShell />}
          {stage === 'intro' && <IntroScreen onDone={leaveIntro} />}
          <ConfirmHost />
          <ToastHost />
          <KeyboardDoneBar />
        </PortalProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

export default App;
