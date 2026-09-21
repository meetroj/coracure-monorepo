import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configureApi, useProfile, LANGUAGES } from '@coracure/api';
import { I18nProvider, type Locale } from '@coracure/i18n';

import AppShell from './AppShell';
import { CareFlowProvider } from './flow/CareFlowProvider';
import { NavigatorProvider } from './navigation/Navigator';
import { SessionProvider, useSession } from './session/SessionProvider';

/**
 * Patient app root.
 *
 * The API is configured once, here, before anything renders. `configureApi`
 * takes the base URL from `CORACURE_API_URL` when the build inlines it and
 * otherwise falls back to the platform-aware development default — which is
 * `10.0.2.2` on Android, because an emulator cannot reach the host's
 * `localhost`. Nothing secret is passed: the app holds the user's own tokens
 * and nothing else.
 */
configureApi({ clientName: 'coracure-patient' });

/**
 * Language follows the patient's OWN `preferredLanguage`.
 *
 * That is the same value provider assignment matches on and never relaxes — a
 * patient promised a Hindi-speaking clinician should be reading a Hindi
 * interface. Until the profile loads (or when signed out) the device locale is
 * used, which `I18nProvider` resolves for itself.
 *
 * `useProfile` needs no context of its own, only a session to be enabled by,
 * so it can sit above the navigator.
 */
const Localised = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useSession();
  const profile = useProfile(isAuthenticated);

  const stored = profile.data?.preferredLanguage;
  const locale =
    stored && (LANGUAGES as readonly string[]).includes(stored) ? (stored as Locale) : null;

  return <I18nProvider locale={locale}>{children}</I18nProvider>;
};

/**
 * The navigator needs to know whether there is a session in order to refuse a
 * protected route, and the session lives in a provider — so the gate is a thin
 * component between the two rather than a prop drilled from the root.
 */
const Navigation = () => {
  const { isAuthenticated } = useSession();
  return (
    <NavigatorProvider initial="splash" isAuthenticated={isAuthenticated}>
      <CareFlowProvider>
        <AppShell />
      </CareFlowProvider>
    </NavigatorProvider>
  );
};

export const App = () => (
  <SafeAreaProvider>
    <SessionProvider>
      <Localised>
        <Navigation />
      </Localised>
    </SessionProvider>
  </SafeAreaProvider>
);

export default App;
