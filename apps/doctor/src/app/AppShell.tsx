import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../theme/brand';
import { Icon, type IconName } from '../components/Icon';
import DashboardScreen from './screens/DashboardScreen';
import AppointmentsScreen from './screens/AppointmentsScreen';
import CasesScreen from './screens/CasesScreen';
import AvailabilityScreen from './screens/AvailabilityScreen';
import ProfileRouter from './screens/profile/ProfileRouter';
import type { VerificationStatus } from '../data/doctor';

export type TabKey = 'dashboard' | 'appointments' | 'cases' | 'availability' | 'profile';

/** Fixed order, used everywhere in the doctor app. */
const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar' },
  { key: 'cases', label: 'Cases', icon: 'folder' },
  { key: 'availability', label: 'Availability', icon: 'clock' },
  { key: 'profile', label: 'Profile', icon: 'user' },
];

export const TabBar = ({
  active,
  onChange,
  profileBadge,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
  profileBadge?: boolean;
}) => {
  // Android 15 draws edge-to-edge, so the gesture/nav bar overlaps the app
  // unless we pad by the real inset. A fixed value cannot be correct across
  // gesture-bar and 3-button devices.
  const insets = useSafeAreaInsets();
  return (
  <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
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
          <View style={[s.tabIconWrap, on && s.tabIconWrapActive]}>
            <Icon name={t.icon} size={22} color={on ? colors.surfie : colors.inkFaint} />
            {t.key === 'profile' && profileBadge && <View style={s.tabBadge} />}
          </View>
          <Text style={[s.tabLabel, on && s.tabLabelActive]} numberOfLines={1}>
            {t.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
  );
};

export const AppShell = ({ onLogout }: { onLogout: () => void }) => {
  const [tab, setTab] = useState<TabKey>('dashboard');

  // Verification state drives the Profile tab. Swap these for API values.
  const [verification] = useState<VerificationStatus>('approved');
  const [acknowledged, setAcknowledged] = useState(false);

  const noop = () => undefined;

  return (
    <View style={s.root}>
      <View style={s.body}>
        {tab === 'dashboard' && (
          <DashboardScreen
            onOpenTasks={noop}
            onOpenAlerts={noop}
            onOpenEarnings={() => setTab('profile')}
            onOpenFeedback={noop}
            onViewAppointment={() => setTab('appointments')}
            onJoinConsultation={noop}
          />
        )}
        {tab === 'appointments' && <AppointmentsScreen onOpenDetails={noop} onJoin={noop} />}
        {tab === 'cases' && <CasesScreen onOpenCase={noop} />}
        {tab === 'availability' && <AvailabilityScreen onSaved={noop} />}
        {tab === 'profile' && (
          <ProfileRouter
            status={verification}
            acknowledged={acknowledged}
            // acknowledging the approval unlocks the full profile
            onAcknowledge={() => {
              setAcknowledged(true);
              setTab('dashboard');
            }}
            onLogout={onLogout}
            onOpen={noop}
            onContactAdmin={noop}
            onResubmit={noop}
          />
        )}
      </View>

      <TabBar
        active={tab}
        onChange={setTab}
        profileBadge={verification !== 'approved' || !acknowledged}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },
  body: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
    paddingTop: spacing.sm,
    // paddingBottom is applied inline from the real safe-area inset
    paddingHorizontal: spacing.sm,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabIconWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  tabIconWrapActive: { backgroundColor: colors.surface.selected },
  tabBadge: {
    position: 'absolute',
    top: 3,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.paris,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  tabLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.inkFaint,
  },
  tabLabelActive: { color: colors.surfie, fontWeight: '700' },
});

export default AppShell;
