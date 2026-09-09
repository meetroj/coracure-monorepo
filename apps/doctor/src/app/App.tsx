import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DoctorLoginScreen from './screens/DoctorLoginScreen';
import AppShell from './AppShell';

/**
 * Doctor app root.
 *
 * Auth gate only — doctors are created and approved by an administrator, so
 * there is no self-registration path. Once signed in, the five-tab shell owns
 * navigation.
 */
export const App = () => {
  const [signedIn, setSignedIn] = useState(false);

  return (
    <SafeAreaProvider>
      {signedIn ? (
        <AppShell onLogout={() => setSignedIn(false)} />
      ) : (
        <DoctorLoginScreen onAuthenticated={() => setSignedIn(true)} />
      )}
    </SafeAreaProvider>
  );
};

export default App;
