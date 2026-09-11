import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

import { useConsentStatus, useProfile } from '@coracure/api';
import { colors } from '@coracure/brand';
import { useT } from '@coracure/i18n';

import { useNavigator } from './navigation/Navigator';
import { TabBar } from './navigation/TabBar';
import { isTabRoute, type TabRoute } from './navigation/routes';
import { useSession } from './session/SessionProvider';

import SplashScreen from './screens/SplashScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import VerifyOtpScreen from './screens/VerifyOtpScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import ConsentScreen from './screens/ConsentScreen';
import DashboardScreen from './screens/DashboardScreen';
import AppointmentsScreen from './screens/AppointmentsScreen';
import ReportsScreen from './screens/ReportsScreen';
import AccountScreen from './screens/AccountScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import FindCareScreen from './screens/FindCareScreen';
import AssistantScreen from './screens/AssistantScreen';
import CareMatchScreen from './screens/CareMatchScreen';
import ChooseServiceScreen from './screens/ChooseServiceScreen';
import ChooseTimeScreen from './screens/ChooseTimeScreen';
import IntakeScreen from './screens/IntakeScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import PaymentSuccessScreen from './screens/PaymentSuccessScreen';
import InstantConsultScreen from './screens/InstantConsultScreen';
import DeviceCheckScreen from './screens/DeviceCheckScreen';
import EmergencyScreen from './screens/EmergencyScreen';
import ConsultationDetailScreen from './screens/ConsultationDetailScreen';
import SettingsScreen from './screens/SettingsScreen';
import LegalDocumentScreen from './screens/LegalDocumentScreen';

/**
 * The shell: what renders, and where `/splash` sends you.
 *
 * *** THE FIRST-RUN ORDER IS THE SERVER'S, NOT A LOCAL FLAG. ***
 * `profile.isComplete` and `consent.teleconsultationConsent` are both read from
 * the backend, so a user who completed setup on another device is not asked
 * again, and a user whose consent was invalidated by a new published version is
 * asked again automatically. `/splash` is the router: every sign-in and every
 * completed step returns here and it re-decides.
 *
 *   no session            → welcome
 *   session, no profile   → profile
 *   session, no consent   → consent
 *   otherwise             → dashboard
 */
const Gate = () => {
  const { status, isAuthenticated } = useSession();
  const { reset } = useNavigator();
  const t = useT();

  // Only asked for once there is a session to ask with.
  const profile = useProfile(isAuthenticated);
  const consent = useConsentStatus(isAuthenticated);

  useEffect(() => {
    if (status === 'booting') return;

    if (!isAuthenticated) {
      reset('welcome');
      return;
    }

    // Hold the splash until both answers are in. Routing on a half-loaded
    // picture is what sends a complete user back through onboarding.
    if (profile.isLoading || consent.isLoading) return;

    // If either read failed we cannot tell what is complete. Land on the
    // dashboard, which has its own error and retry states, rather than looping
    // the user through setup they may not need.
    if (profile.isError || consent.isError) {
      reset('dashboard');
      return;
    }

    if (profile.data && !profile.data.isComplete) {
      reset('profile');
      return;
    }
    if (consent.data && !consent.data.teleconsultationConsent) {
      reset('consent');
      return;
    }
    reset('dashboard');
  }, [
    status,
    isAuthenticated,
    profile.isLoading,
    profile.isError,
    profile.data,
    consent.isLoading,
    consent.isError,
    consent.data,
    reset,
  ]);

  return (
    <SplashScreen
      message={
        status === 'booting'
          ? t('splash.checkingSession')
          : isAuthenticated
            ? t('splash.preparing')
            : t('splash.justAMoment')
      }
    />
  );
};

/** Maps the active route to its screen. One place, exhaustively. */
const CurrentScreen = () => {
  const { route } = useNavigator();

  switch (route.name) {
    case 'splash':
      return <Gate />;
    case 'welcome':
      return <WelcomeScreen />;
    case 'login':
      return <LoginScreen />;
    case 'verify-otp':
      return <VerifyOtpScreen />;
    case 'profile':
      return <ProfileSetupScreen />;
    case 'consent':
      return <ConsentScreen />;
    case 'dashboard':
      return <DashboardScreen />;
    case 'appointments':
      return <AppointmentsScreen />;
    case 'reports':
      return <ReportsScreen />;
    case 'account':
      return <AccountScreen />;
    case 'notifications':
      return <NotificationsScreen />;
    case 'assistant':
      return <AssistantScreen />;
    case 'care-match':
      return <CareMatchScreen />;
    case 'find-care':
      return <FindCareScreen />;
    case 'services':
      return <ChooseServiceScreen />;
    case 'choose-time':
      return <ChooseTimeScreen />;
    case 'intake':
      return <IntakeScreen />;
    case 'checkout':
      return <CheckoutScreen />;
    case 'paid':
      return <PaymentSuccessScreen />;
    case 'instant':
      return <InstantConsultScreen />;
    case 'device-check':
      return <DeviceCheckScreen />;
    case 'emergency':
      return <EmergencyScreen />;
    case 'consultation':
      return <ConsultationDetailScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'legal':
      return <LegalDocumentScreen />;
    default: {
      // Exhaustiveness: adding a route without a screen is a compile error.
      const never: never = route.name;
      return never;
    }
  }
};

export const AppShell = () => {
  const { route, navigate } = useNavigator();
  const { isAuthenticated } = useSession();
  const profile = useProfile(isAuthenticated);

  // The tab bar only exists on the four tab destinations. A pushed screen
  // (booking, a consultation, settings) is full-bleed with its own back action.
  const showTabs = isAuthenticated && isTabRoute(route.name);

  return (
    <View style={s.root}>
      <View style={s.body}>
        <CurrentScreen />
      </View>
      {showTabs && (
        <TabBar
          active={route.name as TabRoute}
          onChange={(key) => navigate(key)}
          profileBadge={profile.data ? !profile.data.isComplete : false}
        />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },
  body: { flex: 1 },
});

export default AppShell;
