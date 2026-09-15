import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DoctorLoginScreen from './screens/DoctorLoginScreen';
import AppShell from './AppShell';
import ErrorBoundary from './ErrorBoundary';

/**
 * Doctor app root.
 *
 * Auth gate only — doctors are created and approved by an administrator, so
 * there is no self-registration path. Once signed in, the five-tab shell owns
 * navigation.
 *
 * The boundary wraps the shell rather than sitting inside it, so a throw while
 * a screen mounts shows the error instead of leaving a white screen — in a
 * release build there is no other way to see what failed.
 */
export const App = () => {
  const [signedIn, setSignedIn] = useState(false);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {signedIn ? (
          <AppShell onLogout={() => setSignedIn(false)} />
        ) : (
          <DoctorLoginScreen onAuthenticated={() => setSignedIn(true)} />
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

export default App;
