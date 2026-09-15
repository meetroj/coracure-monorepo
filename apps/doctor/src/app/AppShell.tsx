import { typeStyles, fontWeight } from '../../../../libs/typography/src';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../theme/brand';
import { Icon, type IconName } from '../components/Icon';
import DashboardScreen from './screens/DashboardScreen';
import AppointmentsScreen from './screens/AppointmentsScreen';
import CasesScreen from './screens/CasesScreen';
import AvailabilityScreen from './screens/AvailabilityScreen';
import ReviewsScreen from './screens/ReviewsScreen';
import FollowUpAlertsScreen from './screens/FollowUpAlertsScreen';
import PendingTasksScreen from './screens/PendingTasksScreen';
import EarningsScreen from './screens/EarningsScreen';
import AppointmentDetailsScreen from './screens/AppointmentDetailsScreen';
import CaseDetailScreen from './screens/CaseDetailScreen';
import ConsultationRoomScreen from './screens/ConsultationRoomScreen';
import ClinicalNotesScreen from './screens/ClinicalNotesScreen';
import EPrescriptionScreen from './screens/EPrescriptionScreen';
import ClinicalTemplatesScreen from './screens/ClinicalTemplatesScreen';
import CaseSummaryScreen from './screens/CaseSummaryScreen';
import AssignFollowUpPlanScreen from './screens/AssignFollowUpPlanScreen';
import CareHubScreen from './screens/CareHubScreen';
import ClarificationsScreen from './screens/ClarificationsScreen';
import PatientFollowUpDetailScreen from './screens/PatientFollowUpDetailScreen';
import RequestReportScreen from './screens/RequestReportScreen';
import PatientDocumentsScreen from './screens/PatientDocumentsScreen';
import InstantRequestScreen from './screens/InstantRequestScreen';
import InstantAcceptedScreen from './screens/InstantAcceptedScreen';
import InstantDeclinedScreen from './screens/InstantDeclinedScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ChatListScreen from './screens/ChatListScreen';
import ChatThreadScreen from './screens/ChatThreadScreen';
import CreateClarificationScreen from './screens/CreateClarificationScreen';
import ExpertClarificationScreen from './screens/ExpertClarificationScreen';
import ExpertCaseReviewScreen from './screens/ExpertCaseReviewScreen';
import ExpertResponseScreen from './screens/ExpertResponseScreen';
import ProfileRouter from './screens/profile/ProfileRouter';
import DoctorProfileDetailsScreen from './screens/profile/DoctorProfileDetailsScreen';
import HelpSupportScreen from './screens/HelpSupportScreen';
import { useNavStack } from './navigation';
import { appointments, nextAppointment } from '../data/doctor';
import type { VerificationStatus } from '../data/doctor';
import type { NotifTarget } from '../data/messaging';

export type TabKey = 'dashboard' | 'appointments' | 'cases' | 'clarifications' | 'profile';

/** Fixed order, used everywhere in the doctor app. */
const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar' },
  { key: 'cases', label: 'Cases', icon: 'folder' },
  // Availability moved under Profile — it is configured occasionally, while a
  // clarification is returned to over days and needs a home of its own.
  { key: 'clarifications', label: 'Clarifications', icon: 'message' },
  { key: 'profile', label: 'Profile', icon: 'user' },
];

/** Row height excluding the safe-area inset. */
const TAB_ROW_H = 62;
const INACTIVE = '#7C8B99';

/** Bottom navigation with a sliding mint selection background. */
export const TabBar = ({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
  profileBadge?: boolean;
}) => {
  // Android 15 draws edge-to-edge, so the gesture/nav bar overlaps the app
  // unless we pad by the real inset.
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;

  const index = TABS.findIndex((t) => t.key === active);
  const tabWidth = barWidth > 0 ? barWidth / TABS.length : 0;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (tabWidth === 0) return;
    const to = index * tabWidth;
    if (reduceMotion) {
      slide.setValue(to);
      return;
    }
    Animated.timing(slide, {
      toValue: to,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, tabWidth, reduceMotion, slide]);

  return (
    <View
      style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      <View style={s.tabRow}>
        {/* the moving highlight, drawn under the tabs */}
        {tabWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              s.highlight,
              { width: tabWidth, transform: [{ translateX: slide }] },
            ]}
          >
            <View style={s.highlightFill} />
          </Animated.View>
        )}

        {TABS.map((t) => {
          const on = active === t.key;
          return (
            <Pressable
              key={t.key}
              testID={`tab-${t.key}`}
              onPress={() => onChange(t.key)}
              style={s.tabItem}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t.label}
            >
              <View>
                <Icon name={t.icon} size={21} color={on ? colors.surfie : INACTIVE} />
              </View>
              <Text
                style={[typeStyles.body, [s.tabLabel, on && s.tabLabelActive]]}
                // keeps "Appointments" on one line in a fifth of a 320px screen
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export const AppShell = ({
  onLogout,
  /** Overridable so the account states can be exercised without a backend. */
  initialVerification = 'approved',
  initialAcknowledged = false,
}: {
  onLogout: () => void;
  initialVerification?: VerificationStatus;
  initialAcknowledged?: boolean;
}) => {
  const [verification] = useState<VerificationStatus>(initialVerification);
  const [acknowledged, setAcknowledged] = useState(initialAcknowledged);

  /**
   * Landing tab.
   *
   * Until verification is complete AND acknowledged, the doctor lands on
   * Profile — that is where the account state lives, and sending someone to a
   * dashboard of clinical work they cannot yet do is misleading. Once the
   * approval is acknowledged, `onAcknowledge` moves them to Dashboard and that
   * becomes the normal landing tab on subsequent launches.
   *
   * Evaluated once, as a landing decision rather than a redirect that would
   * yank the doctor back mid-session.
   */
  const [tab, setTab] = useState<TabKey>(() =>
    initialVerification !== 'approved' || !initialAcknowledged ? 'profile' : 'dashboard'
  );

  const { top, isFullScreen, push, pop, reset, replace, popTo } = useNavStack();

  /**
   * Care Hub recommendations, keyed by the consultation they belong to
   * (DOC-FUP-04). Held here rather than inside the picker so they survive
   * closing it and are readable from the case record.
   */
  const [recommendations, setRecommendations] = useState<
    Record<string, { ids: string[]; note: string }>
  >({});

  /** The appointment the dashboard's next-appointment card stands for. */
  const nextAppt = appointments.find((a) => a.id === nextAppointment.appointmentId);

  const noop = () => undefined;
  const appt = top?.appt;

  /** Notifications route to the destination they name. */
  const openTarget = (t: NotifTarget) => {
    if (t.route === 'patientDocs') return push({ name: 'patientDocs' });
    if (t.route === 'expertResponse') return push({ name: 'expertResponse' });
    if (t.route === 'alertDetail') return push({ name: 'alertDetail' });
    if (t.route === 'instantRequest') return push({ name: 'instantRequest' });
    if (t.route === 'earnings') return push({ name: 'earnings' });
    return push({ name: 'apptDetails' });
  };

  /* ------------------------- full-screen destinations ----------------------- */

  if (top && isFullScreen) {
    return (
      <View style={s.root} testID="fullscreen-route">
        {top.name === 'reviews' && <ReviewsScreen onBack={pop} />}
        {top.name === 'earnings' && <EarningsScreen onBack={pop} />}

        {top.name === 'apptDetails' && appt && (
          <AppointmentDetailsScreen
            appointment={appt}
            onBack={pop}
            onJoin={(a) => push({ name: 'room', appt: a })}
          />
        )}
        {top.name === 'caseDetail' && top.patientCase && (
          <CaseDetailScreen
            patientCase={top.patientCase}
            onBack={pop}
            // Each block opens the module that owns it. `appt` is only absent
            // if a case points at a consultation that no longer exists, in
            // which case the row stays inert rather than opening a blank form.
            onOpenNotes={appt ? () => push({ name: 'clinicalNotes', appt }) : undefined}
            onOpenPrescription={appt ? () => push({ name: 'prescription', appt }) : undefined}
            onOpenSummary={appt ? () => push({ name: 'caseSummary', appt }) : undefined}
            onOpenFollowUp={() => push({ name: 'assignPlan' })}
            onOpenCheckins={() => push({ name: 'alertDetail' })}
            onOpenClarification={() => push({ name: 'expertClarification' })}
            recommended={appt ? recommendations[appt.id]?.ids ?? [] : []}
            onOpenRecommended={appt ? () => push({ name: 'careHub', appt }) : undefined}
          />
        )}
        {top.name === 'room' && appt && (
          <ConsultationRoomScreen
            appointment={appt}
            onBack={pop}
            onEnd={() => replace({ name: 'clinicalNotes', appt })}
            onAction={(k) => {
              if (k === 'note') push({ name: 'clinicalNotes', appt });
              if (k === 'rx') push({ name: 'prescription', appt });
            }}
            onViewDetails={() => push({ name: 'apptDetails', appt })}
          />
        )}
        {top.name === 'clinicalNotes' && appt && (
          <ClinicalNotesScreen
            appointment={appt}
            onBack={pop}
            // push, not replace: back from the prescription must return to the
            // notes, not skip the whole post-call trail back to the details.
            onSave={() => push({ name: 'prescription', appt })}
          />
        )}
        {top.name === 'prescription' && appt && (
          <EPrescriptionScreen
            appointment={appt}
            onBack={pop}
            onLoadTemplate={() => push({ name: 'templates', appt })}
            onRecommendResources={() => push({ name: 'careHub', appt })}
            recommendedCount={recommendations[appt.id]?.ids.length ?? 0}
            onFinalise={() => push({ name: 'caseSummary', appt })}
          />
        )}
        {top.name === 'templates' && (
          // returns to whatever opened it, rather than assuming the prescription
          <ClinicalTemplatesScreen onBack={pop} onApply={pop} />
        )}
        {top.name === 'caseSummary' && appt && (
          // Submitting completes the consultation, so the whole post-call trail
          // is unwound rather than stepping back into the prescription.
          <CaseSummaryScreen appointment={appt} onBack={pop} onSubmit={reset} />
        )}

        {top.name === 'assignPlan' && (
          <AssignFollowUpPlanScreen onBack={pop} onAssign={pop} onViewConsultation={noop} />
        )}
        {top.name === 'availability' && <AvailabilityScreen onSaved={pop} />}
        {top.name === 'careHub' && (
          <CareHubScreen
            onBack={pop}
            initialSelected={appt ? recommendations[appt.id]?.ids ?? [] : []}
            initialNote={appt ? recommendations[appt.id]?.note ?? '' : ''}
            onSave={(ids, note) => {
              if (appt) setRecommendations((r) => ({ ...r, [appt.id]: { ids, note } }));
              pop();
            }}
          />
        )}
        {top.name === 'alertDetail' && (
          <PatientFollowUpDetailScreen onBack={pop} onSave={pop} onEscalate={noop} />
        )}

        {top.name === 'requestReport' && (
          <RequestReportScreen
            onBack={pop}
            onClose={pop}
            onSend={() => replace({ name: 'patientDocs' })}
            onSaveDraft={pop}
          />
        )}
        {top.name === 'patientDocs' && (
          <PatientDocumentsScreen onBack={pop} onOpenDoc={noop} onOpenNotification={noop} />
        )}

        {top.name === 'instantRequest' && (
          <InstantRequestScreen
            onAccept={() => replace({ name: 'instantAccepted' })}
            onDecline={() => replace({ name: 'instantDeclined' })}
            onBack={pop}
            onHelp={noop}
          />
        )}
        {top.name === 'instantAccepted' && <InstantAcceptedScreen onReturn={reset} onBack={pop} />}
        {top.name === 'instantDeclined' && (
          <InstantDeclinedScreen onReturn={reset} onBack={pop} onPause={reset} />
        )}

        {top.name === 'notifications' && (
          <NotificationsScreen
            onBack={pop}
            onOpen={openTarget}
            onOpenMessages={() => push({ name: 'chatList' })}
          />
        )}
        {top.name === 'chatList' && (
          <ChatListScreen onBack={pop} onOpenThread={(t) => push({ name: 'chatThread', thread: t })} />
        )}
        {top.name === 'chatThread' && top.thread && (
          <ChatThreadScreen thread={top.thread} onBack={pop} />
        )}

        {top.name === 'createClarification' && (
          <CreateClarificationScreen onCancel={pop} onSubmit={pop} onSaveDraft={pop} />
        )}
        {top.name === 'expertClarification' && (
          <ExpertClarificationScreen onBack={pop} onSend={pop} onSaveDraft={pop} onHistory={noop} />
        )}
        {top.name === 'expertCaseReview' && (
          <ExpertCaseReviewScreen onBack={pop} onSubmit={pop} onSaveDraft={pop} />
        )}
        {top.name === 'expertResponse' && (
          <ExpertResponseScreen onBack={pop} onClose={pop} onKeepOpen={pop} />
        )}
        {top.name === 'profileDetails' && (
          <DoctorProfileDetailsScreen onBack={pop} onOpen={noop} />
        )}
        {top.name === 'helpSupport' && <HelpSupportScreen onBack={pop} />}
      </View>
    );
  }

  /* ----------------------------- tabbed surface ---------------------------- */

  return (
    <View style={s.root}>
      <View style={s.body}>
        {tab === 'dashboard' && top?.name === 'alerts' && (
          <FollowUpAlertsScreen onBack={pop} onOpenAlert={() => push({ name: 'alertDetail' })} />
        )}
        {tab === 'dashboard' && top?.name === 'tasks' && <PendingTasksScreen onBack={pop} />}
        {tab === 'dashboard' && !top && (
          <DashboardScreen
            onOpenTasks={() => push({ name: 'tasks' })}
            onOpenAlerts={() => push({ name: 'alerts' })}
            onOpenEarnings={() => push({ name: 'earnings' })}
            onViewAppointment={() => setTab('appointments')}
            // the card's own CTAs open that appointment, not the whole list
            onOpenNextAppointment={() => nextAppt && push({ name: 'apptDetails', appt: nextAppt })}
            onJoinConsultation={() => nextAppt && push({ name: 'room', appt: nextAppt })}
            onOpenRequest={() => push({ name: 'notifications' })}
            onOpenMessages={() => push({ name: 'chatList' })}
          />
        )}
        {tab === 'appointments' && (
          <AppointmentsScreen
            onOpenDetails={(a) => push({ name: 'apptDetails', appt: a })}
            onJoin={(a) => push({ name: 'room', appt: a })}
          />
        )}
        {tab === 'cases' && (
          <CasesScreen
            // DR-11-01: a past item opens its full consultation record.
            onOpenCase={(c) => {
              const a = appointments.find((x) => x.id === c.appointmentId);
              push({ name: 'caseDetail', appt: a, patientCase: c });
            }}
            onOpenDocuments={() => push({ name: 'patientDocs' })}
            onRequestReport={() => push({ name: 'requestReport' })}
            onNewClarification={() => push({ name: 'createClarification' })}
          />
        )}
        {tab === 'clarifications' && (
          <ClarificationsScreen
            onNewQuery={() => push({ name: 'createClarification' })}
            onOpenCase={() => push({ name: 'expertClarification' })}
            onOpenNotifications={() => push({ name: 'notifications' })}
            onOpenMessages={() => push({ name: 'chatList' })}
          />
        )}
        {tab === 'profile' && (
          <ProfileRouter
            status={verification}
            acknowledged={acknowledged}
            onAcknowledge={() => {
              setAcknowledged(true);
              setTab('dashboard');
            }}
            onLogout={onLogout}
            onOpen={(key) => {
              // Only the rows with a screen behind them navigate; the rest are
              // still placeholders rather than dead-ends that look broken.
              if (key === 'availability') push({ name: 'availability' });
              if (key === 'earnings') push({ name: 'earnings' });
              if (key === 'documents') push({ name: 'patientDocs' });
              if (key === 'notifications') push({ name: 'notifications' });
              if (key === 'profileDetails') push({ name: 'profileDetails' });
              if (key === 'help') push({ name: 'helpSupport' });
            }}
            onContactAdmin={noop}
            onResubmit={noop}
          />
        )}
      </View>

      <TabBar
        active={tab}
        // switching tab abandons that tab's trail rather than carrying it over
        onChange={(k) => {
          reset();
          setTab(k);
        }}
        profileBadge={verification !== 'approved' || !acknowledged}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },
  body: { flex: 1 },
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
    // subtle upward shadow
    shadowColor: '#0E766C',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  tabRow: { flexDirection: 'row', height: TAB_ROW_H, overflow: 'hidden' },

  highlight: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  highlightFill: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.surface.mint },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { ...typeStyles.navigation, color: INACTIVE, textAlign: 'center' },
  tabLabelActive: { color: colors.surfie, fontWeight: fontWeight.semibold },
});

export default AppShell;
