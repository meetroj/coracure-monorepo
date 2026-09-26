import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon, type IconName } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import type { RootStackParamList } from '../navigation/RootNavigator';

/**
 * Notifications.
 *
 * *** NO NOTIFICATION NAMES A DIAGNOSIS. *** Every line here says what happened
 * — a record is ready, a check-in is due — and never what it says clinically.
 * Copy is server-owned in production; the shapes below stand in for it.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Note = {
  id: string;
  icon: IconName;
  title: string;
  body: string;
  when: string;
  goto?: keyof RootStackParamList;
};

const UNREAD: Note[] = [
  {
    id: 'n1', icon: 'user', title: 'A doctor has been assigned',
    body: 'Dr. Richard Parker will see you for your Orthopedic consultation.',
    when: '1h ago', goto: 'Appointments',
  },
  {
    id: 'n2', icon: 'upload', title: 'A report has been requested',
    body: 'Please upload your recent lab reports before your consultation.',
    when: '1d ago', goto: 'Reports',
  },
  {
    id: 'n3', icon: 'checkCircle', title: 'Your check-in is due',
    body: 'Two minutes on how you are doing today.',
    when: '1d ago', goto: 'DailyCheckIn',
  },
];

const READ: Note[] = [
  {
    id: 'n4', icon: 'calendar', title: 'Upcoming appointment tomorrow',
    body: 'Make sure you have a quiet, well-lit space ready.',
    when: '3h ago', goto: 'Appointments',
  },
  {
    id: 'n5', icon: 'prescription', title: 'Your prescription is ready',
    body: 'Your record from consultation CC-1003 is available to view.',
    when: '6d ago', goto: 'Prescription',
  },
  {
    id: 'n6', icon: 'wallet', title: 'Payment received',
    body: 'We have received your payment for consultation CC-1003.',
    when: '6d ago',
  },
];

export const NotificationsScreen = () => {
  const navigation = useNavigation<Nav>();
  const [readIds, setReadIds] = useState<string[]>([]);

  const unread = UNREAD.filter((n) => !readIds.includes(n.id));
  const read = [...UNREAD.filter((n) => readIds.includes(n.id)), ...READ];

  const Row = ({ n, isUnread }: { n: Note; isUnread: boolean }) => (
    <Pressable
      style={s.card}
      onPress={() => {
        if (isUnread) setReadIds((prev) => [...prev, n.id]);
        if (n.goto) navigation.navigate(n.goto as any);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${n.title}. ${n.body}`}
    >
      <View style={s.iconBox}>
        <Icon name={n.icon} size={19} color={colors.surfie} />
      </View>

      <View style={s.flex}>
        <View style={s.titleRow}>
          <Text style={[s.title, isUnread && s.titleUnread]} numberOfLines={1}>
            {n.title}
          </Text>
          {isUnread && <View style={s.unreadDot} />}
        </View>
        <Text style={s.body} numberOfLines={2}>{n.body}</Text>
        <Text style={s.when}>{n.when}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={s.container}>
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* header: logo, then heading, then the two groups */}
        <View style={s.header}>
          <LogoWide width={120} height={30} />
          {!!unread.length && (
            <Pressable
              onPress={() => setReadIds(UNREAD.map((n) => n.id))}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={s.markAll}>Mark all read</Text>
            </Pressable>
          )}
        </View>

        <Text style={s.heading} accessibilityRole="header">Notifications</Text>
        <Text style={s.lede}>Everything that needs your attention, in one place.</Text>

        <View style={s.group}>
          <Text style={s.groupLabel}>Unread</Text>
          {unread.length ? (
            unread.map((n) => <Row key={n.id} n={n} isUnread />)
          ) : (
            <Text style={s.empty}>Nothing unread.</Text>
          )}
        </View>

        <View style={s.group}>
          <Text style={s.groupLabel}>Read</Text>
          {read.map((n) => <Row key={n.id} n={n} isUnread={false} />)}
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.page },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  markAll: {
    fontFamily: typography.body.family,
    fontSize: 12,
    fontWeight: '700',
    color: colors.surfie,
  },

  heading: {
    fontFamily: typography.heading.family,
    fontSize: 30,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.6,
  },
  lede: {
    fontFamily: typography.body.family,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 4,
    marginBottom: spacing.lg,
  },

  group: { marginBottom: spacing.lg },
  groupLabel: {
    fontFamily: typography.heading.family,
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  empty: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.inkFaint,
    paddingVertical: spacing.sm,
  },

  // Plain hairline border, no colour accent on the radius.
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: {
    flexShrink: 1,
    fontFamily: typography.heading.family,
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  titleUnread: { fontWeight: '800' },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.surfie },
  body: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 16,
    marginTop: 3,
  },
  when: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 5,
  },
});

export default NotificationsScreen;
