import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DoctorLoginScreen from './screens/DoctorLoginScreen';
import OnboardingFlow from './screens/onboarding/OnboardingFlow';
import AppShell from './AppShell';
import ErrorBoundary from './ErrorBoundary';

/**
 * Doctor app root.
 *
 * Auth gate — doctors are created and approved by an administrator, so there
 * is no self-registration path.
 *
 * After OTP the doctor completes onboarding: basic details, proof of identity,
 * qualifications and experience, all with their supporting documents, then a
 * review and submission for verification. Only after submitting do they reach
 * the five-tab shell, where Profile carries the account state — landing on a
 * dashboard of clinical work they are not yet verified for would be
 * misleading.
 *
 * Back out of the first onboarding step returns to sign-in, because there is
 * no account to return to until the submission is made.
 *
 * The boundary wraps the shell rather than sitting inside it, so a throw while
 * a screen mounts shows the error instead of leaving a white screen — in a
 * release build there is no other way to see what failed.
 */

type Stage = 'login' | 'onboarding' | 'shell';

export const App = () => {
  const [stage, setStage] = useState<Stage>('login');

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {stage === 'login' && (
          <DoctorLoginScreen onAuthenticated={() => setStage('onboarding')} />
        )}
        {stage === 'onboarding' && (
          <OnboardingFlow
            onSubmitted={() => setStage('shell')}
            onExit={() => setStage('login')}
          />
        )}
        {stage === 'shell' && <AppShell onLogout={() => setStage('login')} />}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

export default App;
