import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Pressable, Text, Platform, BackHandler } from 'react-native';
import { useSafeAreaInsets, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { NavigationContext, NavigationRouteContext } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import VerifyOtpScreen from '../screens/VerifyOtpScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import ConsentScreen from '../screens/ConsentScreen';
import RescheduleAppointmentScreen from '../screens/RescheduleAppointmentScreen';
import CancelRefundScreen from '../screens/CancelRefundScreen';
import DeviceCheckScreen from '../screens/DeviceCheckScreen';
import VideoConsultationScreen from '../screens/VideoConsultationScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import CarePlanScreen from '../screens/CarePlanScreen';
import PrescriptionScreen from '../screens/PrescriptionScreen';
import DailyCheckInScreen from '../screens/DailyCheckInScreen';
import CheckInCompleteScreen from '../screens/CheckInCompleteScreen';
import BookFollowUpScreen from '../screens/BookFollowUpScreen';
import CareHubScreen from '../screens/CareHubScreen';
import SelfHelpToolScreen from '../screens/SelfHelpToolScreen';
import EducationLibraryScreen from '../screens/EducationLibraryScreen';
import BlogsArticlesScreen from '../screens/BlogsArticlesScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SearchScreen from '../screens/SearchScreen';
import BookingFlowScreen from '../screens/BookingFlowScreen';
import CaregiverGuideScreen from '../screens/CaregiverGuideScreen';
import SupportDirectoryScreen from '../screens/SupportDirectoryScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import LegalPolicyScreen from '../screens/LegalPolicyScreen';
import { MainTabs } from './MainTabs';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  VerifyOtp: { mobileNumber: string; challengeId: string };
  ProfileSetup: undefined;
  Consent: undefined;
  MainTabs: undefined;
  RescheduleAppointment: { consultationId?: string } | undefined;
  CancelRefund: { consultationId?: string } | undefined;
  DeviceCheck: { consultationId?: string } | undefined;
  VideoConsultation: { consultationId?: string } | undefined;
  Feedback: { consultationId?: string } | undefined;
  CarePlan: { consultationId?: string } | undefined;
  Prescription: { consultationId?: string } | undefined;
  DailyCheckIn: { consultationId?: string } | undefined;
  CheckInComplete: { status?: string } | undefined;
  BookFollowUp: { doctorName?: string; specialty?: string; fee?: number } | undefined;
  CareHub: undefined;
  SelfHelpTool: undefined;
  EducationLibrary: undefined;
  BlogsArticles: undefined;
  Appointments: undefined;
  Profile: undefined;
  Notifications: undefined;
  Reports: undefined;
  Search: undefined;
  BookingFlow: { serviceId?: string; specialtyId?: string; serviceName?: string; fee?: number } | undefined;
  CaregiverGuide: undefined;
  SupportDirectory: undefined;
  HelpSupport: undefined;
  LegalPolicy: undefined;
};

interface StackEntry {
  key: string;
  name: keyof RootStackParamList;
  params?: any;
}

export const RootNavigator = () => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isNewAccount, user, isLoading, signOut } = useAuth();

  const [stack, setStack] = useState<StackEntry[]>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const target = sp.get('screen') as keyof RootStackParamList;
      const consultationId = sp.get('consultationId');
      if (target) {
        const params = consultationId !== null
          ? { consultationId }
          : target === 'VideoConsultation' || target === 'DeviceCheck'
          ? { consultationId: 'cons-001' }
          : undefined;
        return [{ key: target, name: target, params }];
      }
    }
    if (!isAuthenticated) {
      return [{ key: 'welcome', name: 'Welcome', params: undefined }];
    }
    if (isNewAccount || !user?.isComplete) {
      return [{ key: 'profile-setup', name: 'ProfileSetup', params: undefined }];
    }
    return [{ key: 'main-tabs', name: 'MainTabs', params: undefined }];
  });

  const [showScreenSwitcher, setShowScreenSwitcher] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (Platform.OS === 'web' && new URLSearchParams(window.location.search).has('screen')) return;
    const name = !isAuthenticated ? 'Welcome' : isNewAccount || !user?.isComplete ? 'ProfileSetup' : 'MainTabs';
    setStack([{ key: name, name }]);
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showScreenSwitcher) { setShowScreenSwitcher(false); return true; }
      if (stack.length <= 1) return false;
      setStack((previous) => previous.slice(0, -1));
      return true;
    });
    return () => subscription.remove();
  }, [stack.length, showScreenSwitcher]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      (window as any).__navigateToScreen = (screenName: keyof RootStackParamList, params?: any) => {
        setStack([{ key: `${screenName}-${Date.now()}`, name: screenName, params }]);
      };
    }
  }, []);

  const navigationValue = useMemo(() => {
    return {
      navigate: (screen: any, params?: any) => {
        setStack((prev) => [...prev, { key: `${screen}-${Date.now()}`, name: screen, params }]);
      },
      replace: (screen: any, params?: any) => {
        setStack((prev) => [...prev.slice(0, -1), { key: `${screen}-${Date.now()}`, name: screen, params }]);
      },
      goBack: () => {
        setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
      },
      push: (screen: any, params?: any) => {
        setStack((prev) => [...prev, { key: `${screen}-${Date.now()}`, name: screen, params }]);
      },
      pop: () => {
        setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
      },
      reset: (stateOrConfig: any) => {
        if (stateOrConfig?.routes?.length) {
          const newRoutes = stateOrConfig.routes.map((r: any) => ({
            key: `${r.name}-${Date.now()}`,
            name: r.name,
            params: r.params,
          }));
          setStack(newRoutes);
        } else if (typeof stateOrConfig === 'string') {
          setStack([{ key: `${stateOrConfig}-${Date.now()}`, name: stateOrConfig as any }]);
        }
      },
      addListener: () => () => {},
      removeListener: () => {},
      dispatch: () => {},
      isFocused: () => true,
      canGoBack: () => stack.length > 1,
      getParent: () => undefined,
      getState: () => ({ index: stack.length - 1, routes: stack }),
      setParams: (params: any) => {
        setStack((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last) {
            next[next.length - 1] = { ...last, params: { ...last.params, ...params } };
          }
          return next;
        });
      },
      setOptions: () => {},
    };
  }, [stack]);

  const current = stack[stack.length - 1] || { key: 'welcome', name: 'Welcome' as const, params: undefined };

  const routeValue = useMemo(() => {
    return {
      key: current.key,
      name: current.name,
      params: current.params,
    };
  }, [current]);

  if (isLoading) {
    return <SplashScreen />;
  }

  const renderScreenContent = () => {
    switch (current.name) {
      case 'Welcome':
        return <WelcomeScreen />;
      case 'Login':
        return <LoginScreen />;
      case 'VerifyOtp':
        return <VerifyOtpScreen />;
      case 'ProfileSetup':
        return <ProfileSetupScreen />;
      case 'Consent':
        return <ConsentScreen />;
      case 'MainTabs':
        return <MainTabs />;
      case 'RescheduleAppointment':
        return <RescheduleAppointmentScreen />;
      case 'CancelRefund':
        return <CancelRefundScreen />;
      case 'DeviceCheck':
        return <DeviceCheckScreen />;
      case 'VideoConsultation':
        return <VideoConsultationScreen />;
      case 'Feedback':
        return <FeedbackScreen />;
      case 'CarePlan':
        return <CarePlanScreen />;
      case 'Prescription':
        return <PrescriptionScreen />;
      case 'DailyCheckIn':
        return <DailyCheckInScreen />;
      case 'CheckInComplete':
        return <CheckInCompleteScreen />;
      case 'BookFollowUp':
        return <BookFollowUpScreen />;
      case 'CareHub':
        return <CareHubScreen />;
      case 'SelfHelpTool':
        return <SelfHelpToolScreen />;
      case 'EducationLibrary':
        return <EducationLibraryScreen />;
      case 'BlogsArticles':
        return <BlogsArticlesScreen />;
      case 'Appointments':
        return <AppointmentsScreen />;
      case 'Profile':
        return <ProfileScreen />;
      case 'Notifications':
        return <NotificationsScreen />;
      case 'Reports':
        return <ReportsScreen />;
      case 'Search':
        return <SearchScreen />;
      case 'BookingFlow':
        return <BookingFlowScreen />;
      case 'CaregiverGuide':
        return <CaregiverGuideScreen />;
      case 'SupportDirectory':
        return <SupportDirectoryScreen />;
      case 'HelpSupport':
        return <HelpSupportScreen />;
      case 'LegalPolicy':
        return <LegalPolicyScreen />;
      default:
        return <WelcomeScreen />;
    }
  };

  interface ScreenItem {
    name: keyof RootStackParamList;
    label: string;
    params?: any;
  }

  const ALL_SCREENS: ScreenItem[] = [
    { name: 'Welcome', label: '1. Welcome' },
    { name: 'Login', label: '2. Login' },
    { name: 'VerifyOtp', label: '3. Verify OTP', params: { mobileNumber: '+91 98765 43210', challengeId: 'demo' } },
    { name: 'ProfileSetup', label: '4. Profile Setup' },
    { name: 'Consent', label: '5. Consent' },
    { name: 'MainTabs', label: '6. Dashboard' },
    { name: 'Notifications', label: '6b. Notifications' },
    { name: 'Search', label: '6c. Symptom Search' },
    { name: 'BookingFlow', label: '6d. Booking (Slots)', params: { serviceId: 'spec-ortho', step: 2 } },
    { name: 'BookingFlow', label: '6e. Booking (Intake)', params: { serviceId: 'spec-ortho', step: 3 } },
    { name: 'BookingFlow', label: '6f. Booking (Checkout)', params: { serviceId: 'spec-ortho', step: 4 } },
    { name: 'BookingFlow', label: '6g. Booking (Voucher)', params: { serviceId: 'spec-ortho', step: 5 } },
    { name: 'Reports', label: '6h. Reports Hub' },
    { name: 'Appointments', label: '7. Appointments List' },
    { name: 'VideoConsultation', label: '8. Video Call', params: { consultationId: 'cons-001' } },
    { name: 'VideoConsultation', label: '8b. Video (Guard Test)', params: { consultationId: 'invalid' } },
    { name: 'Feedback', label: '9. Feedback', params: { consultationId: 'cons-001' } },
    { name: 'CarePlan', label: '10. Care Plan' },
    { name: 'DailyCheckIn', label: '11. Daily Check-In' },
    { name: 'CheckInComplete', label: '12. Check-In Done' },
    { name: 'CareHub', label: '13. Care Hub' },
    { name: 'SelfHelpTool', label: '14. Breathing Tool' },
    { name: 'EducationLibrary', label: '15. Sleep Library' },
    { name: 'BlogsArticles', label: '16. Articles' },
    { name: 'Prescription', label: '17. Prescription' },
    { name: 'DeviceCheck', label: '18. Device Check', params: { consultationId: 'cons-001' } },
    { name: 'DeviceCheck', label: '18b. Device Check (Guard Test)', params: { consultationId: 'invalid' } },
    { name: 'BookFollowUp', label: '19. Follow Up' },
    { name: 'RescheduleAppointment', label: '20. Reschedule', params: { consultationId: 'cons-001' } },
    { name: 'CancelRefund', label: '21. Cancel & Refund', params: { consultationId: 'cons-001' } },
    { name: 'Profile', label: '22. Profile Screen' },
    { name: 'CaregiverGuide', label: '23. Caregiver Guide' },
    { name: 'SupportDirectory', label: '24. Support Directory' },
    { name: 'HelpSupport', label: '25. Help & Support' },
    { name: 'LegalPolicy', label: '26. Legal & Policy' },
  ];

  return (
    <NavigationContext.Provider value={navigationValue as any}>
      <NavigationRouteContext.Provider value={routeValue}>
        <View style={[s.container, { paddingTop: insets.top }]}>
          {Platform.OS !== 'web' && <Text style={{ textAlign: 'center', fontSize: 11, color: '#0E766C', padding: 4 }}>Demo · Sample data · No real payments or consultations</Text>}
          {/* Subtle Top Preview Navigator Bar */}
          {Platform.OS === 'web' && <View style={s.previewBar}>
            <Pressable
              style={s.previewToggle}
              onPress={() => setShowScreenSwitcher((prev) => !prev)}
            >
              <Text style={s.previewToggleText}>
                📱 Screen: <Text style={s.previewToggleHighlight}>{current.name}</Text> ▾
              </Text>
            </Pressable>
            {stack.length > 1 && (
              <Pressable style={s.previewBackBtn} onPress={() => navigationValue.goBack()}>
                <Text style={s.previewBackText}>‹ Back</Text>
              </Pressable>
            )}
          </View>}

          {showScreenSwitcher && (
            <View style={s.switcherDropdown}>
              <View style={s.switcherGrid}>
                {ALL_SCREENS.map((sc, idx) => (
                  <Pressable
                    key={`${sc.name}-${idx}`}
                    style={[s.switcherItem, current.name === sc.name && s.switcherItemActive]}
                    onPress={() => {
                      setShowScreenSwitcher(false);
                      setStack((prev) => [
                        ...prev,
                        {
                          key: `${sc.name}-${Date.now()}`,
                          name: sc.name,
                          params: sc.params || { mobileNumber: '+91 98765 43210', challengeId: 'demo' },
                        },
                      ]);
                    }}
                  >
                    <Text style={[s.switcherItemText, current.name === sc.name && s.switcherItemTextActive]}>
                      {sc.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={s.screenWrapper} key={current.key}>
            <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>
            {renderScreenContent()}
            </SafeAreaInsetsContext.Provider>
          </View>
        </View>
      </NavigationRouteContext.Provider>
    </NavigationContext.Provider>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F7FBF9',
    position: 'relative',
  },
  screenWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0E766C',
    paddingHorizontal: 12,
    paddingVertical: 5,
    zIndex: 9999,
  },
  previewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewToggleText: {
    fontSize: 11,
    color: '#E6F3EE',
    fontWeight: '500',
  },
  previewToggleHighlight: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  previewBackBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewBackText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  switcherDropdown: {
    position: 'absolute',
    top: 28,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#0E766C',
    zIndex: 10000,
    maxHeight: 280,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  switcherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  switcherItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  switcherItemActive: {
    backgroundColor: '#0E766C',
  },
  switcherItemText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  switcherItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default RootNavigator;
