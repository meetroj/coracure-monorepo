import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CommonActions,
  StackActions,
  usePreventRemove,
  useNavigation,
  type CompositeNavigationProp,
  type NavigationAction,
} from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { NotFound } from '../../components/NotFound';
import { confirm, confirmDiscard } from '../../components/confirm';
import { toast } from '../../components/Toast';
import { useStore, getState } from '../../state/store';
import {
  selectAppointment,
  selectAppointments,
  selectAlert,
  selectCaseByAppointment,
  selectRecord,
} from '../../state/selectors';
import {
  acknowledgeApproval,
  applyTemplate,
  assignPlan,
  endCall,
  leaveCall,
  markAlertRead,
  markNotificationRead,
  markThreadRead,
  recordOutcome,
  closeClarification,
  resubmitVerification,
  reviewAlert,
  saveClarification,
  setInstant,
  setLiveStatus,
  setRecommendations,
  startCall,
  threadForAppointment,
} from '../../state/actions';
import { patientById } from '../../data/patients';
import { docById } from '../../data/documents';
import { demoRegistration, type StepKey } from '../../data/registration';
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

const backToDashboard = (nav: RootNav) => {
  nav.popToTop();
  nav.navigate('Tabs', { screen: 'DashboardTab', params: { screen: 'Dashboard' } });
};

/* ---------------------------------- tabs ---------------------------------- */

export const DashboardRoute = () => {
  const nav = useNavigation<DashNav>();
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
    />
  );
};

export const PendingTasksRoute = () => {
  const nav = useNavigation<DashNav>();
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
  return <CasesScreen onOpenCase={(appointmentId) => nav.navigate('CaseDetail', { appointmentId })} />;
};

export const ClarificationsRoute = () => {
  const nav = useNavigation<TabNav>();
  return (
    <ClarificationsScreen
      onOpen={(c) =>
        c.status === 'draft' ? nav.navigate('CreateClarification', { clarificationId: c.id }) : nav.navigate('Clarification', { clarificationId: c.id })
      }
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
      onOpenDoc={(docId) => nav.navigate('DocumentViewer', { docId })}
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
      onEnd={() =>
        go(() => {
          endCall(a.id);
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
        if (existing) nav.navigate('Clarification', { clarificationId: existing });
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
  const { setDirty, leave } = useLeaveGuard();
  if (!a || !rec) return <NotFound onBack={nav.goBack} what="consultation" />;
  return (
    <CareHubScreen
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
      onAssign={(p) => {
        assignPlan(a.id, p);
        toast.show(plan ? 'Follow-up plan updated' : 'Follow-up plan assigned');
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
      onOpenAlert={(alertId) => nav.navigate('AlertDetail', { alertId })}
      onAssignPlan={() => nav.navigate('AssignPlan', { appointmentId: a.id })}
      onOpenClarification={(clarificationId) => nav.navigate('Clarification', { clarificationId })}
      onNewClarification={() => nav.navigate('CreateClarification', { appointmentId: a.id })}
      onOpenRecommended={() => nav.navigate('CareHub', { appointmentId: a.id })}
      onOpenDocuments={() => nav.navigate('PatientDocuments', { patientId: a.patientId, appointmentId: a.id })}
      onOpenAppointment={() => nav.navigate('AppointmentDetails', { appointmentId: a.id })}
    />
  );
};

/* ------------------------- follow-up and documents ------------------------ */

export const AlertDetailRoute = ({ route, navigation: nav }: Props<'AlertDetail'>) => {
  const id = route.params?.alertId;
  const alert = useStore((s) => selectAlert(s, id));
  useEffect(() => {
    if (id && alert && !alert.live.read) markAlertRead(id);
  }, [id, alert]);
  if (!alert) return <NotFound onBack={nav.goBack} what="alert" />;
  return <AlertDetailForm alert={alert} nav={nav} />;
};

/** The review form, guarded so a half-written review is not dropped on Back. */
const AlertDetailForm = ({ alert, nav }: { alert: NonNullable<ReturnType<typeof selectAlert>>; nav: Props<'AlertDetail'>['navigation'] }) => {
  const { setDirty, leave } = useLeaveGuard();
  return (
    <PatientFollowUpDetailScreen
      alert={alert}
      onBack={nav.goBack}
      onDirtyChange={setDirty}
      onReview={(action, note) => {
        reviewAlert(alert.id, action, note);
        toast.show('Alert reviewed');
        leave(nav.goBack);
      }}
      onMessage={() => openThread(nav, alert.appointmentId)}
      onOpenConsultation={() => openConsultation(nav, alert.appointmentId)}
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
  if (!patientById(patientId)) return <NotFound onBack={nav.goBack} what="patient" />;
  const viewId = appointmentId ?? latest?.id;
  return (
    <PatientDocumentsScreen
      patientId={patientId}
      appointmentId={appointmentId}
      onBack={nav.goBack}
      onOpenDoc={(docId) => nav.navigate('DocumentViewer', { docId })}
      onViewPatient={() => (viewId ? openOrReturn(nav, 'AppointmentDetails', { appointmentId: viewId }) : nav.goBack())}
      onRequestReport={appointmentId ? () => nav.navigate('RequestReport', { appointmentId }) : undefined}
    />
  );
};

export const DocumentViewerRoute = ({ route, navigation: nav }: Props<'DocumentViewer'>) => {
  const doc = docById(route.params?.docId);
  const a = useStore((s) => selectAppointment(s, doc?.appointmentId));
  if (!doc) return <NotFound onBack={nav.goBack} what="document" />;
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
    markNotificationRead(n.id);
    const t = n.target;
    if (t.route === 'document') nav.navigate('DocumentViewer', { docId: t.docId });
    else if (t.route === 'expertResponse') nav.navigate('ExpertResponse', { clarificationId: t.clarificationId });
    else if (t.route === 'alertDetail') nav.navigate('AlertDetail', { alertId: t.alertId });
    else if (t.route === 'instantRequest') nav.navigate('InstantRequest');
    else if (t.route === 'apptDetails') nav.navigate('AppointmentDetails', { appointmentId: t.appointmentId });
    else nav.navigate('Earnings');
  };
  return <NotificationsScreen onBack={nav.goBack} onOpen={open} />;
};

export const ChatListRoute = ({ navigation: nav }: Props<'ChatList'>) => (
  <ChatListScreen onBack={nav.goBack} onOpenThread={(threadId) => nav.navigate('ChatThread', { threadId })} />
);

export const ChatThreadRoute = ({ route, navigation: nav }: Props<'ChatThread'>) => {
  const id = route.params?.threadId;
  const thread = useStore((s) => s.threads.find((t) => t.id === id));
  useEffect(() => {
    if (id && thread && thread.unread > 0) markThreadRead(id);
  }, [id, thread]);
  if (!thread) return <NotFound onBack={nav.goBack} what="conversation" />;
  return (
    <ChatThreadScreen
      thread={thread}
      onBack={nav.goBack}
      onOpenDoc={(docId) => nav.navigate('DocumentViewer', { docId })}
      onOpenContext={() => {
        if (thread.clarificationId) nav.navigate('Clarification', { clarificationId: thread.clarificationId });
        else if (thread.appointmentId) nav.navigate('AppointmentDetails', { appointmentId: thread.appointmentId });
      }}
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
  if ((existingId && !existing) || (appointmentId && !knownAppointment)) return <NotFound onBack={nav.goBack} what="clarification" />;
  return (
    <CreateClarificationScreen
      initialAppointmentId={appointmentId}
      existing={existing}
      onCancel={nav.goBack}
      onDirtyChange={setDirty}
      onSubmit={(draft) => {
        const id = saveClarification(draft, true, existing?.id);
        toast.show('Sent to the expert panel');
        leave(() => nav.replace('Clarification', { clarificationId: id }));
      }}
      onSaveDraft={(draft) => {
        saveClarification(draft, false, existing?.id);
        toast.show('Draft saved', 'info');
        leave(nav.goBack);
      }}
    />
  );
};

export const ClarificationRoute = ({ route, navigation: nav }: Props<'Clarification'>) => {
  const id = route.params?.clarificationId;
  const c = useStore((s) => s.clarifications.find((x) => x.id === id));
  if (!c) return <NotFound onBack={nav.goBack} what="clarification" />;
  return <ExpertClarificationScreen clarification={c} onBack={nav.goBack} onRecordDecision={() => nav.navigate('ExpertResponse', { clarificationId: c.id })} />;
};

export const ExpertResponseRoute = ({ route, navigation: nav }: Props<'ExpertResponse'>) => {
  const id = route.params?.clarificationId;
  const c = useStore((s) => s.clarifications.find((x) => x.id === id));
  const { setDirty, leave } = useLeaveGuard();
  if (!c) return <NotFound onBack={nav.goBack} what="clarification" />;
  return (
    <ExpertResponseScreen
      clarification={c}
      onBack={nav.goBack}
      onDirtyChange={setDirty}
      onDecide={(outcome, note, close) => {
        recordOutcome(c.id, outcome, note);
        if (close) closeClarification(c.id);
        toast.show(close ? 'Decision recorded and clarification closed' : 'Decision recorded');
        leave(nav.goBack);
      }}
    />
  );
};

/* ---------------------------------- instant ------------------------------- */

export const InstantRequestRoute = ({ navigation: nav }: Props<'InstantRequest'>) => {
  const pending = useStore((s) => s.instant === 'pending');
  const [answered, setAnswered] = useState(false);
  if (!pending && !answered) return <NotFound onBack={nav.goBack} what="request" />;
  return (
    <InstantRequestScreen
      onBack={nav.goBack}
      onAccept={() => {
        setAnswered(true);
        setInstant('accepted');
        nav.replace('InstantAccepted');
      }}
      onDecline={() => {
        setAnswered(true);
        setInstant('declined');
        nav.replace('InstantDeclined');
      }}
      onExpire={() => {
        setAnswered(true);
        setInstant('expired');
        nav.replace('InstantDeclined', { expired: true });
      }}
    />
  );
};

export const InstantAcceptedRoute = ({ navigation: nav }: Props<'InstantAccepted'>) => (
  <InstantAcceptedScreen onBack={nav.goBack} onReturn={() => backToDashboard(nav)} />
);

export const InstantDeclinedRoute = ({ route, navigation: nav }: Props<'InstantDeclined'>) => (
  <InstantDeclinedScreen
    expired={!!route.params?.expired}
    onBack={nav.goBack}
    onReturn={() => backToDashboard(nav)}
    onPause={() => {
      setLiveStatus('scheduledOnly');
      toast.show('Instant requests paused — status set to Scheduled Only', 'info');
      backToDashboard(nav);
    }}
  />
);

/* ---------------------------------- profile ------------------------------- */

export const AccountStatusRoute = ({ navigation: nav }: Props<'AccountStatus'>) => {
  const verification = useStore((s) => s.verification);
  const submission = useStore((s) => s.submission);
  const mobile = useStore((s) => s.session.mobile);
  const status = verification.status === 'notSubmitted' ? 'pending' : verification.status;
  return (
    <AccountStatusScreen
      status={status}
      acknowledged={verification.acknowledged}
      submittedAt={verification.submittedAt}
      items={verificationItems(status, submission ?? demoRegistration(mobile))}
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
  const submission = useStore((s) => s.submission);
  const mobile = useStore((s) => s.session.mobile);
  const rejected = useStore((s) => s.verification.status === 'rejected');
  const draft = submission ?? demoRegistration(mobile);
  const flagged = rejected
    ? verificationItems('rejected', draft)
        .filter((i) => i.state === 'issue')
        .map((i) => ({ step: i.key as StepKey, label: i.issueLabel ?? 'Needs correction' }))
    : [];
  return (
    <OnboardingFlow
      mode="resubmit"
      mobile={mobile}
      flagged={flagged}
      initialDraft={draft}
      onExit={nav.goBack}
      onSubmitted={(draft) => {
        resubmitVerification(draft);
        nav.goBack();
      }}
    />
  );
};

export const ProfileDetailsRoute = ({ navigation: nav }: Props<'ProfileDetails'>) => (
  <DoctorProfileDetailsScreen onBack={nav.goBack} onEditFee={() => nav.navigate('ConsultationFee')} onRequestChange={() => nav.navigate('RequestChanges')} />
);

export const ConsultationFeeRoute = ({ navigation: nav }: Props<'ConsultationFee'>) => {
  const { setDirty, leave } = useLeaveGuard();
  return <ConsultationFeeScreen onBack={nav.goBack} onDirtyChange={setDirty} onSaved={() => leave(nav.goBack)} />;
};

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
