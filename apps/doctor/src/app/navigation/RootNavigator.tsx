import React from 'react';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { colors } from '../../theme/brand';
import { useStore } from '../../state/store';
import { TabBar } from './TabBar';
import * as R from './routes';
import type { DashboardStackParams, RootParams, TabParams } from './types';

const Root = createNativeStackNavigator<RootParams, undefined>();
const Tabs = createBottomTabNavigator<TabParams, undefined>();
const Dash = createNativeStackNavigator<DashboardStackParams, undefined>();

/** The app's own surfaces, so no default navigator colour flashes during a transition. */
const theme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.surfie,
    background: colors.surface.page,
    card: colors.white,
    text: colors.ink,
    border: colors.surface.line,
  },
};

/** Dashboard keeps its worklists (tasks, alerts) under the tab bar. */
const DashboardStack = () => (
  <Dash.Navigator id={undefined} screenOptions={{ headerShown: false }}>
    <Dash.Screen name="Dashboard" component={R.DashboardRoute} />
    <Dash.Screen name="PendingTasks" component={R.PendingTasksRoute} />
    <Dash.Screen name="FollowUpAlerts" component={R.FollowUpAlertsRoute} />
  </Dash.Navigator>
);

/**
 * A doctor with an account status not yet seen — a new submission, a
 * rejection or an approval — lands on Profile, where Account Status says what
 * happens next; everyone else lands on the Dashboard.
 */
const TabNavigator = () => {
  const settled = useStore((s) => s.verification.acknowledged);
  return (
    <Tabs.Navigator
      id={undefined}
      initialRouteName={settled ? 'DashboardTab' : 'ProfileTab'}
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="DashboardTab" component={DashboardStack} />
      <Tabs.Screen name="AppointmentsTab" component={R.AppointmentsRoute} />
      <Tabs.Screen name="CasesTab" component={R.CasesRoute} />
      <Tabs.Screen name="ClarificationsTab" component={R.ClarificationsRoute} />
      <Tabs.Screen name="ProfileTab" component={R.ProfileRoute} />
    </Tabs.Navigator>
  );
};

/**
 * One native stack over the tabs. Every detail screen is a real push — the
 * platform transition, the iOS edge swipe and Android's back button all work,
 * and the screen underneath stays mounted, so returning to it (a consultation
 * room behind its notes, a list behind a record) finds it exactly as it was.
 *
 * The consultation room and the resubmission flow opt out of the swipe: a
 * stray edge gesture must not drop a call or a half-corrected submission.
 */
export const RootNavigator = () => (
  <NavigationContainer theme={theme}>
    <Root.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.surface.page },
      }}
    >
      <Root.Screen name="Tabs" component={TabNavigator} />

      <Root.Screen name="AppointmentDetails" component={R.AppointmentDetailsRoute} />
      <Root.Screen name="ConsultationRoom" component={R.ConsultationRoomRoute} options={{ gestureEnabled: false }} />
      <Root.Screen name="ClinicalNotes" component={R.ClinicalNotesRoute} />
      <Root.Screen name="Prescription" component={R.PrescriptionRoute} />
      <Root.Screen name="PrescriptionPreview" component={R.PrescriptionPreviewRoute} />
      <Root.Screen name="Templates" component={R.TemplatesRoute} />
      <Root.Screen name="CaseSummary" component={R.CaseSummaryRoute} />
      <Root.Screen name="CaseDetail" component={R.CaseDetailRoute} />
      <Root.Screen name="CareHub" component={R.CareHubRoute} />
      <Root.Screen name="AssignPlan" component={R.AssignPlanRoute} />

      <Root.Screen name="AlertDetail" component={R.AlertDetailRoute} />
      <Root.Screen name="RequestReport" component={R.RequestReportRoute} />
      <Root.Screen name="PatientDocuments" component={R.PatientDocumentsRoute} />
      <Root.Screen name="DocumentViewer" component={R.DocumentViewerRoute} />

      <Root.Screen name="Notifications" component={R.NotificationsRoute} />
      <Root.Screen name="ChatList" component={R.ChatListRoute} />
      <Root.Screen name="ChatThread" component={R.ChatThreadRoute} />

      <Root.Screen name="CreateClarification" component={R.CreateClarificationRoute} />
      <Root.Screen name="Clarification" component={R.ClarificationRoute} />
      <Root.Screen name="ExpertResponse" component={R.ExpertResponseRoute} />

      <Root.Screen name="InstantRequest" component={R.InstantRequestRoute} />
      <Root.Screen name="InstantAccepted" component={R.InstantAcceptedRoute} />
      <Root.Screen name="InstantDeclined" component={R.InstantDeclinedRoute} />

      <Root.Screen name="AccountStatus" component={R.AccountStatusRoute} />
      <Root.Screen name="Resubmit" component={R.ResubmitRoute} options={{ gestureEnabled: false }} />
      <Root.Screen name="ProfileDetails" component={R.ProfileDetailsRoute} />
      <Root.Screen name="ConsultationFee" component={R.ConsultationFeeRoute} />
      <Root.Screen name="ConsultationDuration" component={R.ConsultationDurationRoute} />
      <Root.Screen name="BankDetails" component={R.BankDetailsRoute} />
      <Root.Screen name="Privacy" component={R.PrivacyRoute} />
      <Root.Screen name="RequestChanges" component={R.RequestChangesRoute} />
      <Root.Screen name="Availability" component={R.AvailabilityRoute} />
      <Root.Screen name="Earnings" component={R.EarningsRoute} />
      <Root.Screen name="PayoutHistory" component={R.PayoutHistoryRoute} />
      <Root.Screen name="Reviews" component={R.ReviewsRoute} />
      <Root.Screen name="HelpSupport" component={R.HelpSupportRoute} />
      <Root.Screen name="SupportIssue" component={R.SupportIssueRoute} />
      <Root.Screen name="FaqList" component={R.FaqListRoute} />
    </Root.Navigator>
  </NavigationContainer>
);

export default RootNavigator;
