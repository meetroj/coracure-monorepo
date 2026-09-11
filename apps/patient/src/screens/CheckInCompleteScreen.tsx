import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, AppHeader, Button, StatusPill, Card, Icon } from '@coracure/ui';
import { useAuth } from '../hooks/useAuth';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'CheckInComplete'>;

export const CheckInCompleteScreen = () => {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const firstName = user?.fullName?.split(' ')[0] || 'Alex';

  return (
    <Screen bottomInset contentStyle={s.container}>
      <AppHeader
        right={<Icon name="bell" size={20} color={colors.inkMuted} />}
      />

      <View style={s.headerWrap}>
        <Text style={s.pageTitle}>Check-in complete, {firstName}! 👋</Text>
        <Text style={s.pageSubtitle}>Here's how you're doing today.</Text>
      </View>

      {/* Today's Triage Status Card */}
      <View style={s.statusCard}>
        <View style={s.statusHeaderRow}>
          <View style={s.statusIconWrap}>
            <Icon name="shieldCheck" size={24} color={colors.surfie} />
          </View>
          <View style={s.statusMeta}>
            <Text style={s.statusTag}>TODAY'S STATUS</Text>
            <View style={s.riskRow}>
              <Text style={s.riskTitle}>Low Risk</Text>
              <StatusPill label="Safe & Stable" tone="success" />
            </View>
          </View>
        </View>

        <Text style={s.statusDesc}>
          Your symptoms are mild and stable. Keep following your care plan and monitor your health daily.
        </Text>

        <View style={s.onTrackNotice}>
          <Icon name="checkCircle" size={18} color={colors.surfie} />
          <Text style={s.onTrackText}>
            You're on track! Consistency is key to staying healthy and speeding recovery.
          </Text>
        </View>
      </View>

      {/* What to do next section */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>What to do next</Text>
        <View style={s.actionsList}>
          <Pressable
            style={s.actionRow}
            onPress={() => navigation.navigate('CarePlan')}
          >
            <View style={s.actionIconBox}>
              <Icon name="clipboard" size={20} color={colors.surfie} />
            </View>
            <View style={s.actionTextCol}>
              <Text style={s.actionHeading}>Continue your care plan</Text>
              <Text style={s.actionSub}>Keep following today's tasks and medicines</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.inkFaint} />
          </Pressable>

          <Pressable
            style={s.actionRow}
            onPress={() => navigation.navigate('BookFollowUp')}
          >
            <View style={s.actionIconBox}>
              <Icon name="calendar" size={20} color={colors.surfie} />
            </View>
            <View style={s.actionTextCol}>
              <Text style={s.actionHeading}>Book a follow-up</Text>
              <Text style={s.actionSub}>Schedule your next appointment</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.inkFaint} />
          </Pressable>

          <Pressable
            style={s.actionRow}
            onPress={() => navigation.navigate('CareHub')}
          >
            <View style={s.actionIconBox}>
              <Icon name="heart" size={20} color={colors.surfie} />
            </View>
            <View style={s.actionTextCol}>
              <Text style={s.actionHeading}>Explore Care Hub</Text>
              <Text style={s.actionSub}>Self-help tools, guided breathing, and guides</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.inkFaint} />
          </Pressable>
        </View>
      </View>

      {/* Chat Support Card */}
      <View style={s.supportCard}>
        <View style={s.supportTextWrap}>
          <Text style={s.supportTitle}>Have questions?</Text>
          <Text style={s.supportSub}>Our dedicated care team is here to assist you.</Text>
        </View>
        <Button
          label="Chat with us"
          variant="secondary"
          size="sm"
          icon="chat"
          onPress={() => Alert.alert('Care Team Chat', 'Connecting with your care coordinator...')}
        />
      </View>

      {/* Emergency Assistance Box */}
      <View style={s.emergencyCard}>
        <View style={s.emergencyIcon}>
          <Icon name="emergency" size={22} color={colors.danger} />
        </View>
        <View style={s.emergencyTextWrap}>
          <Text style={s.emergencyTitle}>Feeling worse or in crisis?</Text>
          <Text style={s.emergencySub}>Get immediate clinical help if symptoms become acute.</Text>
        </View>
        <Button
          label="Get Help Now"
          variant="danger"
          size="sm"
          onPress={() => Alert.alert('Emergency Helpline', 'Connecting to National Medical Emergency 108...')}
        />
      </View>

      {/* Bottom CTA to return to Home Dashboard */}
      <View style={s.footer}>
        <Button
          label="Back to Dashboard →"
          onPress={() => navigation.navigate('MainTabs')}
        />
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  headerWrap: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  pageTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '700',
    color: colors.ink,
  },
  pageSubtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.lg,
    ...shadow.card,
    marginBottom: spacing.xl,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  statusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusMeta: {
    flex: 1,
  },
  statusTag: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
    fontWeight: '700',
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  riskTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.surfie,
  },
  statusDesc: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.ink,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  onTrackNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.mintSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  onTrackText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.surfie,
    fontWeight: '600',
    lineHeight: 16,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  actionsList: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
    gap: spacing.md,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextCol: {
    flex: 1,
  },
  actionHeading: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  actionSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginTop: 1,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  supportTextWrap: {
    flex: 1,
  },
  supportTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  supportSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginTop: 1,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#F7D5D3',
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  emergencyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTextWrap: {
    flex: 1,
  },
  emergencyTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.danger,
  },
  emergencySub: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 1,
  },
  footer: {
    marginTop: spacing.xs,
  },
});

export default CheckInCompleteScreen;

