import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DoctorLoginScreen from './screens/DoctorLoginScreen';
import OnboardingFlow from './screens/onboarding/OnboardingFlow';
import AppShell from './AppShell';
import ErrorBoundary from './ErrorBoundary';
import { PortalProvider } from '../components/Portal';
import { ToastHost } from '../components/Toast';
import { useStore } from '../state/store';
import { leaveOnboarding, signIn, submitRegistration } from '../state/actions';

/**
 * Doctor app root.
 *
 * Doctors are created by an administrator, so there is no self-registration.
 * Sign-in is a mobile number and a one-time code. A doctor whose details are
 * already on file (the demo account, 98765 43210) lands on the Dashboard; a
 * new account first completes onboarding — basic details, identity,
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

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PortalProvider>
          {stage === 'login' && <DoctorLoginScreen onAuthenticated={signIn} />}
          {stage === 'onboarding' && <OnboardingFlow mobile={mobile} onSubmitted={submitRegistration} onExit={leaveOnboarding} />}
          {stage === 'shell' && <AppShell />}
          <ToastHost />
        </PortalProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

export default App;
