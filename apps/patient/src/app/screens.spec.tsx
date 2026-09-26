import React from 'react';
import { render, act } from '@testing-library/react-native';
import { NavigationContext, NavigationRouteContext } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthContext, DEFAULT_SEEDED_PROFILE } from '../auth/AuthContext';
import { configureDemoMode } from '@coracure/api';

const names = ['Appointments','CarePlan','CareHub','Profile','Notifications','Reports','Search','BookingFlow','CaregiverGuide','SupportDirectory','HelpSupport','LegalPolicy','DailyCheckIn','CheckInComplete','SelfHelpTool','EducationLibrary','BlogsArticles','Prescription','DeviceCheck','VideoConsultation','Feedback','RescheduleAppointment','CancelRefund','BookFollowUp','ProfileSetup','Consent','ChooseService','FindDoctor','DoctorProfile','SelectSlot','InstantConsultRequest','AppointmentDetail','AIAssistant','Dashboard'];
const navigation = { navigate: jest.fn(), goBack: jest.fn(), addListener: () => () => {}, isFocused: () => true, canGoBack: () => false };
const auth = { isAuthenticated: true, isNewAccount: false, user: DEFAULT_SEEDED_PROFILE, isLoading: false, signIn: jest.fn(), loginAsDemo: jest.fn(), signOut: jest.fn(), refreshProfile: jest.fn() };

beforeAll(() => configureDemoMode(true));
afterAll(() => configureDemoMode(false));
test.each(names)('%s renders with native React Native primitives and demo data', async name => {
  const Screen = require(`../screens/${name}Screen`).default;

  const result = render(<SafeAreaProvider><AuthContext.Provider value={auth}><NavigationContext.Provider value={navigation as any}><NavigationRouteContext.Provider value={{ key: name, name, params: { consultationId: 'cons-001' } }}><Screen /></NavigationRouteContext.Provider></NavigationContext.Provider></AuthContext.Provider></SafeAreaProvider>);
  await act(async () => {});
  expect(result.toJSON()).toBeTruthy();
  result.unmount();
});


