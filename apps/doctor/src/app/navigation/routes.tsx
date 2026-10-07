import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CommonActions,
  StackActions,
  usePreventRemove,
  useFocusEffect,
  useIsFocused,
  useNavigation,
  type CompositeNavigationProp,
  type NavigationAction,
} from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { NotFound, RouteLoading } from '../../components/NotFound';
import { confirm, confirmDiscard } from '../../components/confirm';
import { toast } from '../../components/Toast';
import { useStore, getState, setState, type ThreadLive } from '../../state/store';
import {
  selectAppointment,
  selectAppointments,
  selectAppointmentByConsultation,
  selectCaseByAppointment,
  selectLiveStatus,
  selectRecord,
} from '../../state/selectors';
import {
  acknowledgeApproval,
  applyTemplate,
  assignPlan,
  endCall,
  leaveCall,
  markThreadRead,
  resubmitVerification,
  setInstant,
  setLiveStatus,
  setRecommendations,
  startCall,
  threadForAppointment,
} from '../../state/actions';
import type { InstantOffer, SafetyAlert } from '@coracure/api';
import { ApiError, messageFor } from '@coracure/api/errors';

import { docById } from '../../data/documents';
import { usePatientFiles, usePatientIdentity } from '../../data/patientFiles';
import { UUID } from '../../data/clinicalRecord';
import { useConsultation } from '../../data/consultationDetail';
import { useSafetyAlert, useSafetyAlerts } from '../../data/safetyAlerts';
import { toAppointment, useDoctorDay } from '../../data/appointments';
import { useCareHubItems } from '../../data/followup';
import { isServerThread, refreshChatThreads } from '../../data/chat';
import {
  identifierProblem,
  isServerId,
  recordDecision,
  saveCase,
  useAuthorClarification,
  useAuthorClarifications,
  useExpertReviews,
  useIsExpert,
} from '../../data/clarifications';
import {
  OFFER_POLL_MS,
  acceptOffer,
  declineOffer,
  fetchOffers,
  isActionable,
  setStatus,
  toInstantRequest,
  useInstantOfferPoll,
} from '../../data/presence';
import type { StepKey } from '../../data/registration';
import type { AppNotification } from '../../data/messaging';
import type { ClinicalTask } from '../../state/selectors';

import DashboardScreen from '../screens/DashboardScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import AppointmentDetailsScreen from '../screens/AppointmentDetailsScreen';
import ConsultationRoomScreen from '../screens/ConsultationRoomScreen';
import ClinicalNotesScreen from '../screens/ClinicalNotesScreen';
import EPrescriptionScreen from '../screens/EPrescriptionScreen';
import PrescriptionPreviewScreen from '../screens/PrescriptionPreviewScreen';
import ClinicalTemplatesScreen from '../screens/ClinicalTemplatesScreen';
import CaseSummaryScreen from '../screens/CaseSummaryScreen';
import CareHubScreen from '../screens/CareHubScreen';
import AssignFollowUpPlanScreen from '../screens/AssignFollowUpPlanScreen';
import CaseDetailScreen from '../screens/CaseDetailScreen';
import CasesScreen from '../screens/CasesScreen';
import PendingTasksScreen from '../screens/PendingTasksScreen';
import FollowUpAlertsScreen from '../screens/FollowUpAlertsScreen';
import PatientFollowUpDetailScreen from '../screens/PatientFollowUpDetailScreen';
import RequestReportScreen from '../screens/RequestReportScreen';
import PatientDocumentsScreen from '../screens/PatientDocumentsScreen';
import DocumentViewerScreen from '../screens/DocumentViewerScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatThreadScreen from '../screens/ChatThreadScreen';
import ClarificationsScreen from '../screens/ClarificationsScreen';
import CreateClarificationScreen from '../screens/CreateClarificationScreen';
import ExpertClarificationScreen from '../screens/ExpertClarificationScreen';
import ExpertResponseScreen from '../screens/ExpertResponseScreen';
import ExpertInboxScreen from '../screens/ExpertInboxScreen';
import ExpertCaseReviewScreen from '../screens/ExpertCaseReviewScreen';
import InstantRequestScreen from '../screens/InstantRequestScreen';
import InstantAcceptedScreen from '../screens/InstantAcceptedScreen';
import InstantDeclinedScreen from '../screens/InstantDeclinedScreen';
import EarningsScreen from '../screens/EarningsScreen';
import PayoutHistoryScreen from '../screens/PayoutHistoryScreen';
import ReviewsScreen from '../screens/ReviewsScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import SupportIssueScreen from '../screens/SupportIssueScreen';
import FaqListScreen from '../screens/FaqListScreen';
import AvailabilityScreen from '../screens/AvailabilityScreen';
import OnboardingFlow from '../screens/onboarding/OnboardingFlow';
import ProfileRouter, { type ProfileDestination } from '../screens/profile/ProfileRouter';
import { useVerification } from '../../data/verification';
import { AccountStatusScreen, verificationItems } from '../screens/profile/AccountStatusScreens';
import DoctorProfileDetailsScreen from '../screens/profile/DoctorProfileDetailsScreen';
import {
  ConsultationFeeScreen,
  ConsultationDurationScreen,
  BankDetailsScreen,
  PrivacySecurityScreen,
  RequestChangesScreen,
} from '../screens/profile/ProfileSettingsScreens';
import type { DashboardStackParams, RootParams, TabParams } from './types';

/**
 * Route adapters: each turns a route's params into the record it names, and
 * the screen's callbacks into navigation.
 *
 * A record that cannot be resolved renders NotFound with a way back — never a
 * blank screen and never some other patient's record. Screens with unsaved
 * work report it, and the route asks before that work is thrown away, whether
 * the doctor taps Back, swipes, or presses Android's back button.
 */

type RootNav = NativeStackNavigationProp<RootParams>;
type Props<K extends keyof RootParams> = NativeStackScreenProps<RootParams, K>;
type TabNav = CompositeNavigationProp<BottomTabNavigationProp<TabParams>, RootNav>;
type DashNav = CompositeNavigationProp<NativeStackNavigationProp<DashboardStackParams>, TabNav>;

/* --------------------------------- helpers -------------------------------- */

/** Confirms before a screen with unsaved changes is removed. */
const useLeaveGuard = () => {
  const navigation = useNavigation();
  const [dirty, setDirty] = useState(false);
  const leaving = useRef(false);
  usePreventRemove(dirty, ({ data }) => {
    if (leaving.current) {
      navigation.dispatch(data.action);
      return;
    }
    confirmDiscard(() => navigation.dispatch(data.action));
  });
  /** For leaving on purpose — after a save — without being asked. */
  const leave = useCallback((go: () => void) => {
    leaving.current = true;
    go();
  }, []);
  return { setDirty, leave };
};

/** Anything that can dispatch — a root, tab or nested stack navigation object. */
type Dispatcher = { dispatch: (action: NavigationAction) => void };

/** Navigates by name from any navigator; the action bubbles up to the one that has the route. */
const go = <K extends keyof RootParams>(nav: Dispatcher, name: K, params?: RootParams[K]) =>
  nav.dispatch(CommonActions.navigate(name, params as object | undefined));

/**
 * Goes back to a screen already in the stack for the same record, rather than
 * stacking a second copy of it (Notes → Prescription → Notes → …).
 */
const openOrReturn = (
  nav: RootNav,
  name: 'ClinicalNotes' | 'Prescription' | 'CaseSummary' | 'AppointmentDetails',
  params: { appointmentId: string }
) => {
  const routes = nav.getState()?.routes ?? [];
  const found = routes.some(
    (r) => r.name === name && (r.params as { appointmentId?: string } | undefined)?.appointmentId === params.appointmentId
  );
  nav.dispatch(found ? StackActions.popTo(name, params) : StackActions.push(name, params));
};

/** Starts (or resumes) the call and opens the room. */
const joinCall = (nav: Dispatcher, appointmentId: string) => {
  if (getState().activeCall?.appointmentId !== appointmentId) startCall(appointmentId);
  go(nav, 'ConsultationRoom', { appointmentId });
};

/** The patient's chat thread for a consultation, created on first use. */
const openThread = (nav: Dispatcher, appointmentId: string) => {
  const threadId = threadForAppointment(appointmentId);
  if (threadId) go(nav, 'ChatThread', { threadId });
  else toast.show('Could not open the chat for this consultation', 'error');
};

/** The consultation record when one exists, otherwise the appointment itself. */
const openConsultation = (nav: Dispatcher, appointmentId: string) => {
  if (selectCaseByAppointment(getState(), appointmentId)) go(nav, 'CaseDetail', { appointmentId });
  else go(nav, 'AppointmentDetails', { appointmentId });
};

/** A draft reopens in the editor — it has no thread yet, and the backend will not close one. */
const openClarification = (nav: Dispatcher, clarificationId: string) =>
  getState().clarifications.find((c) => c.id === clarificationId)?.status === 'draft'
    ? go(nav, 'CreateClarification', { clarificationId })
    : go(nav, 'Clarification', { clarificationId });

const backToDashboard = (nav: RootNav) => {
  nav.popToTop();
  nav.navigate('Tabs', { screen: 'DashboardTab', params: { screen: 'Dashboard' } });
};

/* ---------------------------------- tabs ---------------------------------- */

export const DashboardRoute = () => {
  const nav = useNavigation<DashNav>();
  // No push for offers yet: while this screen is in front and the doctor is
  // Available Now, ask every few seconds and open the first new one.
  const focused = useIsFocused();
  const available = useStore((s) => selectLiveStatus(s) === 'available');
  useInstantOfferPoll(focused && available, () => nav.navigate('InstantRequest'));
  return (
    <DashboardScreen
      onOpenTasks={() => nav.navigate('PendingTasks')}
      onOpenAlerts={() => nav.navigate('FollowUpAlerts')}
      onOpenEarnings={() => nav.navigate('Earnings')}
      onOpenReviews={() => nav.navigate('Reviews')}
      onOpenAppointments={() => nav.navigate('AppointmentsTab')}
      onOpenAppointment={(id) => nav.navigate('AppointmentDetails', { appointmentId: id })}
      onJoin={(id) => joinCall(nav, id)}
      onEditSchedule={() => nav.navigate('Availability')}
      onOpenProfile={() => nav.navigate('ProfileTab')}
    />
  );
};

export const PendingTasksRoute = () => {
  const nav = useNavigation<DashNav>();
  useDoctorDay();
  const open = (t: ClinicalTask) => {
    const appointmentId = t.appointmentId;
    if (t.category === 'summary') nav.navigate('CaseSummary', { appointmentId });
    else if (t.category === 'prescription') nav.navigate('Prescription', { appointmentId });
    else if (t.category === 'note') nav.navigate('ClinicalNotes', { appointmentId });
    else if (t.alertId) nav.navigate('AlertDetail', { alertId: t.alertId });
    else nav.navigate('AssignPlan', { appointmentId });
  };
  return <PendingTasksScreen onBack={() => nav.goBack()} onOpenTask={open} />;
};

export const FollowUpAlertsRoute = ({ route }: NativeStackScreenProps<DashboardStackParams, 'FollowUpAlerts'>) => {
  const nav = useNavigation<DashNav>();
  return (
    <FollowUpAlertsScreen
      onBack={() => nav.goBack()}
      onOpenAlert={(alertId) => nav.navigate('AlertDetail', { alertId })}
      initialCategory={route.params?.category as never}
    />
  );
};

export const AppointmentsRoute = () => {
  const nav = useNavigation<TabNav>();
  return (
    <AppointmentsScreen
      onOpenDetails={(appointmentId) => nav.navigate('AppointmentDetails', { appointmentId })}
      onJoin={(appointmentId) => joinCall(nav, appointmentId)}
    />
  );
};

export const CasesRoute = () => {
  const nav = useNavigation<TabNav>();
  // which write-ups the server still has open — the case list reads it
  useDoctorDay();
  return <CasesScreen onOpenCase={(appointmentId) => nav.navigate('CaseDetail', { appointmentId })} />;
};

export const ClarificationsRoute = () => {
  const nav = useNavigation<TabNav>();
  // the author's real cases replace the list once they load; a failure says so and offers a retry
  const cases = useAuthorClarifications();
  // Back on the tab: an expert may have written since, so ask again. Not on the first focus — it has just loaded.
  const seen = useRef(false);
  const { refresh } = cases;
  useFocusEffect(
    useCallback(() => {
      if (seen.current) refresh();
      seen.current = true;
    }, [refresh])
  );
  // only experts are ever assigned cases, so only they get the way in
  const isExpert = useIsExpert();
  return (
    <ClarificationsScreen
      error={cases.error}
      loading={cases.showSkeleton}
      onRetry={cases.retry}
      onOpenExpertInbox={isExpert ? () => nav.navigate('ExpertInbox') : undefined}
      onOpen={(c) => openClarification(nav, c.id)}
      onNewQuery={() => nav.navigate('CreateClarification')}
    />
  );
};

export const ProfileRoute = () => {
  const nav = useNavigation<TabNav>();
  const open = (key: ProfileDestination) => {
    const to: Record<ProfileDestination, () => void> = {
      accountStatus: () => nav.navigate('AccountStatus'),
      profileDetails: () => nav.navigate('ProfileDetails'),
      requestChanges: () => nav.navigate('RequestChanges'),
      fee: () => nav.navigate('ConsultationFee'),
      duration: () => nav.navigate('ConsultationDuration'),
      availability: () => nav.navigate('Availability'),
      earnings: () => nav.navigate('Earnings'),
      reviews: () => nav.navigate('Reviews'),
      bank: () => nav.navigate('BankDetails'),
      notifications: () => nav.navigate('Notifications'),
      help: () => nav.navigate('HelpSupport'),
      privacy: () => nav.navigate('Privacy'),
    };
    to[key]();
  };
  return (
    <ProfileRouter
      onOpen={open}
      onAcknowledge={() => {
        acknowledgeApproval();
        nav.navigate('DashboardTab', { screen: 'Dashboard' });
      }}
      onGetSupport={() => nav.navigate('HelpSupport', { raise: 'account' })}
      onResubmit={() => nav.navigate('Resubmit')}
    />
  );
};

/* ------------------------------ consultation ------------------------------ */

export const AppointmentDetailsRoute = ({ route, navigation: nav }: Props<'AppointmentDetails'>) => {
  const a = useStore((s) => selectAppointment(s, route.params?.appointmentId));
  if (!a) return <NotFound onBack={nav.goBack} what="appointment" />;
  return (
    <AppointmentDetailsScreen
      appointment={a}
      onBack={nav.goBack}
      onJoin={(id) => joinCall(nav, id)}
      onMessage={() => openThread(nav, a.id)}
      onOpenDoc={(docId) => nav.navigate('DocumentViewer', { docId, patientId: a.patientId })}
      onViewAllDocs={() => nav.navigate('PatientDocuments', { patientId: a.patientId, appointmentId: a.id })}
      onRequestDoc={() => nav.navigate('RequestReport', { appointmentId: a.id })}
      onOpenCase={(id) => openConsultation(nav, id)}
    />
  );
};

export const ConsultationRoomRoute = ({ route, navigation: nav }: Props<'ConsultationRoom'>) => {
  const id = route.params?.appointmentId;
  const a = useStore((s) => selectAppointment(s, id));
  const call = useStore((s) => s.activeCall);
  const threadId = useStore((s) => s.threads.find((t) => t.kind === 'patient' && t.patientId === a?.patientId)?.id);
  const leaving = useRef(false);

  // a room opened directly (not through Join) still has a live call behind it
  useEffect(() => {
    if (a && a.state === 'confirmed' && getState().activeCall?.appointmentId !== a.id) startCall(a.id);
    if (a) threadForAppointment(a.id);
  }, [a]);

  // Android back and any other removal ask first; the room's own buttons confirm themselves
  usePreventRemove(!!a && call?.appointmentId === id, ({ data }) => {
    if (leaving.current) {
      nav.dispatch(data.action);
      return;
    }
    confirm({
      title: 'Leave the consultation?',
      message: 'The consultation stays open and you can rejoin it from the appointment.',
      confirmLabel: 'Leave',
      onConfirm: () => {
        leaving.current = true;
        leaveCall();
        nav.dispatch(data.action);
      },
    });
  });

  if (!a) return <NotFound onBack={nav.goBack} what="consultation" />;
  const go = (fn: () => void) => {
    leaving.current = true;
    fn();
  };
  return (
    <ConsultationRoomScreen
      appointment={a}
      joinedAt={call?.appointmentId === a.id ? call.joinedAt : undefined}
      threadId={threadId}
      onLeave={() =>
        go(() => {
          leaveCall();
          nav.goBack();
        })
      }
      onEnd={(log) =>
        go(() => {
          endCall(a.id, log.durationSeconds);
          toast.show('Consultation ended — complete the notes');
          nav.replace('ClinicalNotes', { appointmentId: a.id });
        })
      }
      onAction={(key) => {
        if (key === 'note') nav.navigate('ClinicalNotes', { appointmentId: a.id });
        else if (key === 'rx') nav.navigate('Prescription', { appointmentId: a.id });
        else if (key === 'followUp') nav.navigate('AssignPlan', { appointmentId: a.id });
        else nav.navigate('RequestReport', { appointmentId: a.id });
      }}
      onViewDetails={() => nav.navigate('AppointmentDetails', { appointmentId: a.id })}
      onReportIssue={() => nav.navigate('HelpSupport', { raise: 'consultation' })}
    />
  );
};

export const ClinicalNotesRoute = ({ route, navigation: nav }: Props<'ClinicalNotes'>) => {
  const a = useStore((s) => selectAppointment(s, route.params?.appointmentId));
  if (!a) return <NotFound onBack={nav.goBack} what="consultation" />;
  return (
    <ClinicalNotesScreen
      appointment={a}
      onBack={nav.goBack}
      onSaved={() => openOrReturn(nav, 'Prescription', { appointmentId: a.id })}
      onViewProfile={() => nav.navigate('AppointmentDetails', { appointmentId: a.id })}
      onReferForClarification={() => {
        const existing = selectRecord(getState(), a.id).clarificationId;
        if (existing) openClarification(nav, existing);
        else nav.navigate('CreateClarification', { appointmentId: a.id });
      }}
      onOpenCaseSummary={() => openOrReturn(nav, 'CaseSummary', { appointmentId: a.id })}
    />
  );
};

export const PrescriptionRoute = ({ route, navigation: nav }: Props<'Prescription'>) => {
  const a = useStore((s) => selectAppointment(s, route.params?.appointmentId));
  if (!a) return <NotFound onBack={nav.goBack} what="consultation" />;
  return (
    <EPrescriptionScreen
      appointment={a}
      onBack={nav.goBack}
      onFinalised={() => openOrReturn(nav, 'CaseSummary', { appointmentId: a.id })}
      onLoadTemplate={() => nav.navigate('Templates', { appointmentId: a.id })}
      onPreview={() => nav.navigate('PrescriptionPreview', { appointmentId: a.id })}
      onRecommendResources={() => nav.navigate('CareHub', { appointmentId: a.id })}
      onOpenNotes={() => openOrReturn(nav, 'ClinicalNotes', { appointmentId: a.id })}
    />
  );
};

export const PrescriptionPreviewRoute = ({ route, navigation: nav }: Props<'PrescriptionPreview'>) => {
  const a = useStore((s) => selectAppointment(s, route.params?.appointmentId));
  if (!a) return <NotFound onBack={nav.goBack} what="prescription" />;
  return <PrescriptionPreviewScreen appointment={a} onBack={nav.goBack} />;
};

export const TemplatesRoute = ({ route, navigation: nav }: Props<'Templates'>) => {
  const a = useStore((s) => selectAppointment(s, route.params?.appointmentId));
  if (!a) return <NotFound onBack={nav.goBack} what="consultation" />;
  return (
    <ClinicalTemplatesScreen
      onBack={nav.goBack}
      patientName={a.name}
      onApply={(templateId) => {
        applyTemplate(a.id, templateId);
        toast.show('Template applied to the prescription draft');
        nav.goBack();
      }}
    />
  );
};

export const CaseSummaryRoute = ({ route, navigation: nav }: Props<'CaseSummary'>) => {
  const a = useStore((s) => selectAppointment(s, route.params?.appointmentId));
  if (!a) return <NotFound onBack={nav.goBack} what="consultation" />;
  return (
    <CaseSummaryScreen
      appointment={a}
      onBack={nav.goBack}
      onSubmitted={() => {
        nav.popToTop();
        nav.navigate('CaseDetail', { appointmentId: a.id });
      }}
      onOpenNotes={() => openOrReturn(nav, 'ClinicalNotes', { appointmentId: a.id })}
      onOpenPrescription={() => openOrReturn(nav, 'Prescription', { appointmentId: a.id })}
      onAssignPlan={() => nav.navigate('AssignPlan', { appointmentId: a.id })}
    />
  );
};

export const CareHubRoute = ({ route, navigation: nav }: Props<'CareHub'>) => {
  const a = useStore((s) => selectAppointment(s, route.params?.appointmentId));
  const rec = useStore((s) => (a ? selectRecord(s, a.id).recommendations : undefined));
  // picks travel only inside the write-up PUT, which a finalised record refuses
  const finalised = useStore((s) => (a ? selectRecord(s, a.id).summaryStatus === 'submitted' : false));
  const { setDirty, leave } = useLeaveGuard();
  const library = useCareHubItems();
  if (!a || !rec) return <NotFound onBack={nav.goBack} what="consultation" />;
  return (
    <CareHubScreen
      readOnly={finalised}
      library={library}
      onBack={nav.goBack}
      onDirtyChange={setDirty}
      patientName={a.name}
      initialSelected={rec.ids}
      initialNote={rec.note}
      onSave={(ids, note) => {
        setRecommendations(a.id, ids, note);
        toast.show(ids.length ? `${ids.length} resource${ids.length === 1 ? '' : 's'} recommended` : 'Recommendations cleared');
        leave(nav.goBack);
      }}
    />
  );
};

export const AssignPlanRoute = ({ route, navigation: nav }: Props<'AssignPlan'>) => {
  const a = useStore((s) => selectAppointment(s, route.params?.appointmentId));
  const plan = useStore((s) => (a ? selectRecord(s, a.id).plan : undefined));
  if (!a) return <NotFound onBack={nav.goBack} what="consultation" />;
  return (
    <AssignFollowUpPlanScreen
      appointment={a}
      initialPlan={plan}
      onBack={nav.goBack}
      onAssign={(result) => {
        assignPlan(a.id, {
          pathway: result.pathway?.name ?? '',
          duration: result.durationDays ?? 0,
          start: result.startsOn ?? '',
        });
        toast.show(plan ? 'Follow-up plan updated' : 'Follow-up plan assigned');
        nav.goBack();
      }}
      onCancelled={() => {
        assignPlan(a.id, undefined);
        toast.show('Follow-up plan stopped');
        nav.goBack();
      }}
      onViewConsultation={() => openConsultation(nav, a.id)}
    />
  );
};

export const CaseDetailRoute = ({ route, navigation: nav }: Props<'CaseDetail'>) => {
  const id = route.params?.appointmentId;
  const a = useStore((s) => selectAppointment(s, id));
  const c = useStore((s) => selectCaseByAppointment(s, id));
  if (!a || !c) return <NotFound onBack={nav.goBack} what="case" />;
  return (
    <CaseDetailScreen
      patientCase={c}
      appointment={a}
      onBack={nav.goBack}
      onOpenNotes={() => nav.navigate('ClinicalNotes', { appointmentId: a.id })}
      onOpenPrescription={() => nav.navigate('Prescription', { appointmentId: a.id })}
      onOpenSummary={() => nav.navigate('CaseSummary', { appointmentId: a.id })}
      onOpenClarification={(clarificationId) => openClarification(nav, clarificationId)}
      onNewClarification={() => nav.navigate('CreateClarification', { appointmentId: a.id })}
      onOpenRecommended={() => nav.navigate('CareHub', { appointmentId: a.id })}
      onOpenDocuments={() => nav.navigate('PatientDocuments', { patientId: a.patientId, appointmentId: a.id })}
      onOpenAppointment={() => nav.navigate('AppointmentDetails', { appointmentId: a.id })}
      onAssignPlan={() => nav.navigate('AssignPlan', { appointmentId: a.id })}
    />
  );
};

/* ------------------------- follow-up and documents ------------------------ */

export const AlertDetailRoute = ({ route, navigation: nav }: Props<'AlertDetail'>) => {
  const id = route.params?.alertId;
  // The list is open alerts only; a closed one (from a notification, or just
  // closed here) is only reachable by id. The list row shows first when cached.
  const list = useSafetyAlerts();
  const one = useSafetyAlert(id);
  const alert = one.data ?? list.data?.find((a) => a.id === id);
  const pending = !!id && ((!one.data && !one.error) || (!list.data && !list.error));
  if (!alert && pending) return <RouteLoading onBack={nav.goBack} />;
  if (!alert) return <NotFound onBack={nav.goBack} what="alert" />;
  const refresh = () => {
    one.refresh();
    list.retry();
  };
  return <AlertDetailForm alert={alert} refresh={refresh} nav={nav} />;
};

/** The review form, guarded so a half-written closing note is not dropped on Back. */
const AlertDetailForm = ({
  alert,
  refresh,
  nav,
}: {
  alert: SafetyAlert;
  refresh: () => void;
  nav: Props<'AlertDetail'>['navigation'];
}) => {
  const { setDirty, leave } = useLeaveGuard();
  const appt = useStore((s) => selectAppointmentByConsultation(s, alert.consultationId));
  return (
    <PatientFollowUpDetailScreen
      alert={alert}
      onBack={nav.goBack}
      onDirtyChange={setDirty}
      onAcknowledged={() => {
        toast.show('Alert acknowledged');
        refresh();
      }}
      onClosed={() => {
        toast.show('Alert closed');
        refresh();
        leave(nav.goBack);
      }}
      onMessage={appt ? () => openThread(nav, appt.id) : undefined}
      onOpenConsultation={appt ? () => openConsultation(nav, appt.id) : undefined}
    />
  );
};

export const RequestReportRoute = ({ route, navigation: nav }: Props<'RequestReport'>) => {
  const a = useStore((s) => selectAppointment(s, route.params?.appointmentId));
  const { setDirty, leave } = useLeaveGuard();
  if (!a) return <NotFound onBack={nav.goBack} what="consultation" />;
  return <RequestReportScreen appointment={a} onBack={nav.goBack} onDirtyChange={setDirty} onDone={() => leave(nav.goBack)} />;
};

export const PatientDocumentsRoute = ({ route, navigation: nav }: Props<'PatientDocuments'>) => {
  const patientId = route.params?.patientId;
  const appointmentId = route.params?.appointmentId;
  const latest = useStore((s) =>
    selectAppointments(s)
      .filter((x) => x.patientId === patientId && x.state !== 'cancelled')
      .sort((x, y) => y.dayOffset - x.dayOffset || y.minutes - x.minutes)[0]
  );
  // the demo fixture, a loaded appointment, or the server's patient card — NotFound only when none of them knows the patient
  const { patient, loading } = usePatientIdentity(patientId);
  if (!patient) return loading ? <RouteLoading onBack={nav.goBack} /> : <NotFound onBack={nav.goBack} what="patient" />;
  const viewId = appointmentId ?? latest?.id;
  return (
    <PatientDocumentsScreen
      patientId={patientId}
      appointmentId={appointmentId}
      onBack={nav.goBack}
      onOpenDoc={(docId) => nav.navigate('DocumentViewer', { docId, patientId })}
      onViewPatient={() => (viewId ? openOrReturn(nav, 'AppointmentDetails', { appointmentId: viewId }) : nav.goBack())}
      onRequestReport={appointmentId ? () => nav.navigate('RequestReport', { appointmentId }) : undefined}
    />
  );
};

/**
 * A real backend file never lives in `state.documents` — that array is this
 * session's own local, doctor-added documents. It lives in whatever list
 * fetched it, keyed by patient, so a direct open (not via the list) has to
 * ask for that same list itself: `usePatientFiles` shares its cache key with
 * `PatientDocumentsScreen`, so this is instant whenever the list already ran.
 * A real (UUID) file opened without its patient cannot be found that way, and
 * says so — it never falls back to a demo fixture.
 */
export const DocumentViewerRoute = ({ route, navigation: nav }: Props<'DocumentViewer'>) => {
  const { docId, patientId } = route.params ?? { docId: undefined, patientId: undefined };
  const real = !!docId && UUID.test(docId);
  const localDoc = useStore((s) => (real ? undefined : docById(s.documents, docId)));
  const files = usePatientFiles(real ? patientId : undefined);
  const doc = localDoc ?? files.data?.find((f) => f.id === docId);
  const a = useStore((s) => selectAppointment(s, doc?.appointmentId));
  if (!doc) {
    const loading = real && !!patientId && !files.data && !files.error;
    return loading ? <RouteLoading onBack={nav.goBack} /> : <NotFound onBack={nav.goBack} what="document" />;
  }
  return (
    <DocumentViewerScreen
      doc={doc}
      consultationLabel={a ? `${a.consultationId} · ${a.dateLabel}` : undefined}
      onBack={nav.goBack}
      onOpenAllDocuments={() => {
        const routes = nav.getState()?.routes ?? [];
        const hasList = routes.some((r) => r.name === 'PatientDocuments' && (r.params as { patientId?: string })?.patientId === doc.patientId);
        if (hasList) nav.goBack();
        else nav.navigate('PatientDocuments', { patientId: doc.patientId, appointmentId: doc.appointmentId });
      }}
    />
  );
};

/* -------------------------------- messaging ------------------------------- */

export const NotificationsRoute = ({ navigation: nav }: Props<'Notifications'>) => {
  const open = (n: AppNotification) => {
    // The screen has already marked it read (`markOneRead`), row and badge both.
    const t = n.target;
    if (t.route === 'document') nav.navigate('DocumentViewer', { docId: t.docId, patientId: t.patientId });
    else if (t.route === 'expertResponse') nav.navigate('ExpertResponse', { clarificationId: t.clarificationId });
    else if (t.route === 'clarification') openClarification(nav, t.clarificationId);
    else if (t.route === 'expertReview') nav.navigate('ExpertReview', { caseId: t.caseId });
    else if (t.route === 'alertDetail') nav.navigate('AlertDetail', { alertId: t.alertId });
    else if (t.route === 'instantRequest') nav.navigate('InstantRequest');
    else if (t.route === 'apptDetails') nav.navigate('AppointmentDetails', { appointmentId: t.appointmentId });
    else if (t.route === 'earnings') nav.navigate('Earnings');
    else if (t.route === 'chat') nav.navigate('ChatThread', { threadId: t.patientId });
    // `{ route: 'none' }`: an unrecognised real notification — marking it read is all there is to do.
  };
  return <NotificationsScreen onBack={nav.goBack} onOpen={open} />;
};

export const ChatListRoute = ({ navigation: nav }: Props<'ChatList'>) => {
  // the tabs poll this list, but opening Messages should not wait for the next tick
  useEffect(() => {
    refreshChatThreads().catch(() => undefined);
  }, []);
  return <ChatListScreen onBack={nav.goBack} onOpenThread={(threadId) => nav.navigate('ChatThread', { threadId })} />;
};

export const ChatThreadRoute = ({ route, navigation: nav }: Props<'ChatThread'>) => {
  const id = route.params?.threadId;
  const thread = useStore((s) => s.threads.find((t) => t.id === id));
  // A real conversation opened cold — from a notification, before the list has
  // loaded — is not in the store yet: ask for the list once before giving up.
  const [asked, setAsked] = useState(false);
  const missing = !thread && isServerThread(id);
  useEffect(() => {
    if (missing) refreshChatThreads().catch(() => undefined).finally(() => setAsked(true));
  }, [missing]);
  useEffect(() => {
    if (id && thread && thread.unread > 0) markThreadRead(id);
  }, [id, thread]);
  if (!thread) return missing && !asked ? <RouteLoading onBack={nav.goBack} /> : <NotFound onBack={nav.goBack} what="conversation" />;
  return <ChatThreadOpen thread={thread} nav={nav} />;
};

/** The thread itself, which reads and polls only while it is the screen in front. */
const ChatThreadOpen = ({ thread, nav }: { thread: ThreadLive; nav: Props<'ChatThread'>['navigation'] }) => {
  const focused = useIsFocused();
  const context = thread.clarificationId
    ? () => openClarification(nav, thread.clarificationId!)
    : thread.appointmentId
      ? () => nav.navigate('AppointmentDetails', { appointmentId: thread.appointmentId! })
      : undefined;
  return (
    <ChatThreadScreen
      thread={thread}
      active={focused}
      onBack={nav.goBack}
      onOpenDoc={(docId) => nav.navigate('DocumentViewer', { docId, patientId: thread.patientId })}
      onOpenContext={context}
    />
  );
};

/* ------------------------------ clarifications ---------------------------- */

export const CreateClarificationRoute = ({ route, navigation: nav }: Props<'CreateClarification'>) => {
  const existingId = route.params?.clarificationId;
  const existing = useStore((s) => (existingId ? s.clarifications.find((c) => c.id === existingId) : undefined));
  const appointmentId = route.params?.appointmentId;
  const knownAppointment = useStore((s) => (appointmentId ? selectAppointment(s, appointmentId) : undefined));
  const { setDirty, leave } = useLeaveGuard();
  const [busy, setBusy] = useState(false);
  // The case's id once the server has it. A post that fails after the create
  // succeeded is retried against this one, not created a second time.
  const savedId = useRef(existingId);
  if ((existingId && !existing) || (appointmentId && !knownAppointment)) return <NotFound onBack={nav.goBack} what="clarification" />;

  /** Server first; the screen leaves only once the case really exists there. */
  const save = async (draft: Parameters<typeof saveCase>[0], post: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const id = await saveCase(draft, post, savedId.current, (saved) => (savedId.current = saved));
      if (post) {
        toast.show('Posted — an administrator will assign a reviewer');
        leave(() => nav.replace('Clarification', { clarificationId: id }));
      } else {
        toast.show('Draft saved', 'info');
        leave(nav.goBack);
      }
    } catch (e) {
      // an identifier the server found is said in words, with the fields it is in
      toast.show(identifierProblem(e) ?? messageFor(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <CreateClarificationScreen
      initialAppointmentId={appointmentId}
      existing={existing}
      onCancel={nav.goBack}
      onDirtyChange={setDirty}
      busy={busy}
      onSubmit={(draft) => save(draft, true)}
      onSaveDraft={(draft) => save(draft, false)}
    />
  );
};

export const ClarificationRoute = ({ route, navigation: nav }: Props<'Clarification'>) => {
  const id = route.params?.clarificationId;
  const c = useStore((s) => s.clarifications.find((x) => x.id === id));
  // the case itself, read fresh — opened cold from a notification it may not be in the store at all
  const one = useAuthorClarification(id ?? '');
  if (!c && isServerId(id ?? '') && !one.error) return <RouteLoading onBack={nav.goBack} />;
  if (!c) return <NotFound onBack={nav.goBack} what="clarification" />;
  return <ExpertClarificationScreen clarification={c} onBack={nav.goBack} onRecordDecision={() => nav.navigate('ExpertResponse', { clarificationId: c.id })} />;
};

export const ExpertResponseRoute = ({ route, navigation: nav }: Props<'ExpertResponse'>) => {
  const id = route.params?.clarificationId;
  const c = useStore((s) => s.clarifications.find((x) => x.id === id));
  const one = useAuthorClarification(id ?? '');
  const { setDirty, leave } = useLeaveGuard();
  const [busy, setBusy] = useState(false);
  if (!c && isServerId(id ?? '') && !one.error) return <RouteLoading onBack={nav.goBack} />;
  if (!c) return <NotFound onBack={nav.goBack} what="clarification" />;
  return (
    <ExpertResponseScreen
      clarification={c}
      onBack={nav.goBack}
      onDirtyChange={setDirty}
      busy={busy}
      onDecide={async (outcome, note, close) => {
        if (busy) return;
        setBusy(true);
        try {
          // There is no decision field: the case is marked reviewed, then the decision is posted on the thread.
          await recordDecision(c, outcome, note, close);
          toast.show(close ? 'Decision recorded and clarification closed' : 'Decision recorded');
          leave(nav.goBack);
        } catch (e) {
          toast.show(identifierProblem(e) ?? messageFor(e), 'error');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
};

export const ExpertInboxRoute = ({ navigation: nav }: Props<'ExpertInbox'>) => {
  const reviews = useExpertReviews();
  // Coming back from answering a case: its status changed, so ask again.
  // Not on the first focus — the resource has just loaded on mount.
  const seen = useRef(false);
  const { refresh } = reviews;
  useFocusEffect(
    useCallback(() => {
      if (seen.current) refresh();
      seen.current = true;
    }, [refresh])
  );
  return <ExpertInboxScreen reviews={reviews} onBack={nav.goBack} onOpen={(caseId) => nav.navigate('ExpertReview', { caseId })} />;
};

export const ExpertReviewRoute = ({ route, navigation: nav }: Props<'ExpertReview'>) => (
  <ExpertCaseReviewScreen caseId={route.params.caseId} onBack={nav.goBack} />
);

/* ---------------------------------- instant ------------------------------- */

/**
 * The notification that opens this route carries no offer id (M-08 is not
 * wired yet), so the screen asks the backend what is actually waiting rather
 * than trusting what a stale local flag or a push payload might claim. Whoever
 * is first and still actionable (`isActionable`) is the one shown.
 */
export const InstantRequestRoute = ({ navigation: nav }: Props<'InstantRequest'>) => {
  const [offer, setOffer] = useState<InstantOffer | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    fetchOffers()
      .then((offers) => {
        if (!alive) return;
        const next = offers.find((o) => isActionable(o)) ?? null;
        // a new offer starts unanswered, whatever happened to the last one
        if (next) setInstant('pending');
        setOffer(next);
      })
      .catch(() => alive && setOffer(null));
    return () => {
      alive = false;
    };
  }, []);

  if (offer === undefined) return null;
  // the server's list is the truth, not a flag left over from the last request
  if (!offer) return <NotFound onBack={nav.goBack} what="request" />;

  /**
   * `OFFER_CLOSED` / `OFFER_NOT_FOUND` mean the window already moved it to
   * someone else between render and the tap — not a server error the doctor
   * can fix by pressing again. Every other failure leaves the screen
   * unanswered so a flaky connection can be retried.
   */
  const offerGone = (e: unknown) => ApiError.is(e) && (e.code === 'OFFER_CLOSED' || e.code === 'OFFER_NOT_FOUND');
  const handle = async <T,>(action: () => Promise<T>, onOk: (result: T) => void) => {
    try {
      const result = await action();
      onOk(result);
    } catch (e) {
      toast.show(messageFor(e), 'error');
      if (offerGone(e)) {
        setInstant('expired');
        nav.replace('InstantDeclined', { expired: true });
        return;
      }
      throw e;
    }
  };

  return (
    <InstantRequestScreen
      request={toInstantRequest(offer)}
      onBack={nav.goBack}
      onAccept={() =>
        handle(
          () => acceptOffer(offer.consultationId),
          () => {
            setInstant('accepted');
            nav.replace('InstantAccepted', { consultationId: offer.consultationId, request: toInstantRequest(offer) });
          }
        )
      }
      onDecline={() =>
        handle(
          () => declineOffer(offer.consultationId),
          ({ rerouted }) => {
            setInstant('declined');
            nav.replace('InstantDeclined', { rerouted });
          }
        )
      }
      onExpire={() => {
        setInstant('expired');
        nav.replace('InstantDeclined', { expired: true });
      }}
    />
  );
};

export const InstantAcceptedRoute = ({ route, navigation: nav }: Props<'InstantAccepted'>) => {
  const { data, error, retry, refresh } = useConsultation(route.params?.consultationId);
  // No push for payment or consent yet: ask again until the patient has done both.
  const cleared = data?.paymentStatus === 'paid' && !!data.doctorContext?.hasCurrentTeleconsultationConsent;
  useEffect(() => {
    if (cleared) return;
    const timer = setInterval(refresh, OFFER_POLL_MS);
    return () => clearInterval(timer);
  }, [cleared, refresh]);
  if (!route.params) return <NotFound onBack={nav.goBack} what="request" />;
  return (
    <InstantAcceptedScreen
      request={route.params.request}
      consultation={data}
      loadError={error ? messageFor(error) : undefined}
      onRetry={retry}
      onJoin={
        data && cleared
          ? () => {
              // The room reads its appointment from the store, and an instant consultation is not in the day's list until that reloads.
              setState((s) =>
                s.appointments.some((x) => x.id === data.id) ? s : { ...s, appointments: [...s.appointments, toAppointment(data)] }
              );
              joinCall(nav, data.id);
            }
          : undefined
      }
      onBack={nav.goBack}
      onReturn={() => backToDashboard(nav)}
    />
  );
};

export const InstantDeclinedRoute = ({ route, navigation: nav }: Props<'InstantDeclined'>) => {
  const [pausing, setPausing] = useState(false);
  return (
    <InstantDeclinedScreen
      expired={!!route.params?.expired}
      rerouted={route.params?.rerouted ?? true}
      onBack={nav.goBack}
      onReturn={() => backToDashboard(nav)}
      pausing={pausing}
      onPause={async () => {
        setPausing(true);
        try {
          // the server stops routing offers; the pill follows only once it has
          await setStatus('scheduledOnly');
          setLiveStatus('scheduledOnly');
          toast.show('Instant requests paused — status set to Scheduled Only', 'info');
          backToDashboard(nav);
        } catch (e) {
          toast.show(messageFor(e), 'error');
          setPausing(false);
        }
      }}
    />
  );
};

/* ---------------------------------- profile ------------------------------- */

export const AccountStatusRoute = ({ navigation: nav }: Props<'AccountStatus'>) => {
  const verification = useStore((s) => s.verification);
  const live = useVerification();
  const status = live.status ?? (verification.status === 'notSubmitted' ? 'pending' : verification.status);
  if (live.showSkeleton) return <RouteLoading onBack={nav.goBack} />;
  return (
    <AccountStatusScreen
      status={status}
      acknowledged={verification.acknowledged}
      submittedAt={verification.submittedAt}
      rejectionReason={live.rejectionReason}
      items={live.items}
      onBack={nav.goBack}
      onAcknowledge={() => {
        acknowledgeApproval();
        backToDashboard(nav);
      }}
      onGetSupport={() => nav.navigate('HelpSupport', { raise: 'account' })}
      onResubmit={() => nav.navigate('Resubmit')}
    />
  );
};

export const ResubmitRoute = ({ navigation: nav }: Props<'Resubmit'>) => {
  const mobile = useStore((s) => s.session.mobile);
  // What to correct is the ADMIN's list, not a guess: each label is the reason
  // they typed against that document. A resubmission built from anything else
  // sends the doctor back with the same problem.
  const live = useVerification();
  const flagged = live.items
    .filter((i) => i.state === 'issue')
    .map((i) => ({ step: i.key as StepKey, label: i.issueLabel ?? 'Needs correction' }));
  // The form takes its draft once, so it waits for the real registration and
  // the files on record — never a fixture, never a blank that a replace-style
  // save would then write over the doctor's details.
  if (!live.draft) {
    return live.registrationError ? <NotFound onBack={nav.goBack} what="registration" /> : <RouteLoading onBack={nav.goBack} />;
  }
  if (!live.data && !live.error) return <RouteLoading onBack={nav.goBack} />;
  return (
    <OnboardingFlow
      mode="resubmit"
      mobile={mobile}
      flagged={flagged}
      initialDraft={live.draft}
      onExit={nav.goBack}
      onSubmitted={(draft, outcome) => {
        resubmitVerification(draft, outcome);
        nav.goBack();
      }}
    />
  );
};

export const ProfileDetailsRoute = ({ navigation: nav }: Props<'ProfileDetails'>) => (
  <DoctorProfileDetailsScreen onBack={nav.goBack} onEditFee={() => nav.navigate('ConsultationFee')} onRequestChange={() => nav.navigate('RequestChanges')} />
);

export const ConsultationFeeRoute = ({ navigation: nav }: Props<'ConsultationFee'>) => (
  <ConsultationFeeScreen onBack={nav.goBack} onRequestChange={() => nav.navigate('RequestChanges')} />
);

export const ConsultationDurationRoute = ({ navigation: nav }: Props<'ConsultationDuration'>) => {
  const { setDirty, leave } = useLeaveGuard();
  return <ConsultationDurationScreen onBack={nav.goBack} onDirtyChange={setDirty} onSaved={() => leave(nav.goBack)} />;
};

export const BankDetailsRoute = ({ navigation: nav }: Props<'BankDetails'>) => (
  <BankDetailsScreen onBack={nav.goBack} onRequestChange={() => nav.navigate('RequestChanges', { field: 'Bank account' })} />
);

export const PrivacyRoute = ({ navigation: nav }: Props<'Privacy'>) => <PrivacySecurityScreen onBack={nav.goBack} />;

export const RequestChangesRoute = ({ route, navigation: nav }: Props<'RequestChanges'>) => {
  const { setDirty, leave } = useLeaveGuard();
  return (
    <RequestChangesScreen initialField={route.params?.field} onBack={nav.goBack} onDirtyChange={setDirty} onSent={() => leave(nav.goBack)} />
  );
};

export const AvailabilityRoute = ({ navigation: nav }: Props<'Availability'>) => {
  const { setDirty, leave } = useLeaveGuard();
  return <AvailabilityScreen onBack={nav.goBack} onDirtyChange={setDirty} onSaved={() => leave(nav.goBack)} />;
};

export const EarningsRoute = ({ navigation: nav }: Props<'Earnings'>) => (
  <EarningsScreen onBack={nav.goBack} onViewAllHistory={() => nav.navigate('PayoutHistory')} />
);

export const PayoutHistoryRoute = ({ navigation: nav }: Props<'PayoutHistory'>) => <PayoutHistoryScreen onBack={nav.goBack} />;

export const ReviewsRoute = ({ navigation: nav }: Props<'Reviews'>) => <ReviewsScreen onBack={nav.goBack} />;

export const HelpSupportRoute = ({ route, navigation: nav }: Props<'HelpSupport'>) => (
  <HelpSupportScreen
    onBack={nav.goBack}
    onOpenIssue={(issueId) => nav.navigate('SupportIssue', { issueId })}
    onViewAllFaqs={() => nav.navigate('FaqList')}
    initialRaise={!!route.params?.raise}
    initialCategory={route.params?.raise}
  />
);

export const SupportIssueRoute = ({ route, navigation: nav }: Props<'SupportIssue'>) => {
  const issue = useStore((s) => s.supportIssues.find((i) => i.id === route.params?.issueId));
  if (!issue) return <NotFound onBack={nav.goBack} what="issue" />;
  return <SupportIssueScreen issue={issue} onBack={nav.goBack} />;
};

export const FaqListRoute = ({ navigation: nav }: Props<'FaqList'>) => <FaqListScreen onBack={nav.goBack} />;
