import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon, StatusPill } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import { useAuth } from '../hooks/useAuth';
import PatientTabBar from '../components/PatientTabBar';

export const CheckInCompleteScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const firstName = user?.fullName?.split(' ')[0] || 'Alex';

  const handleDialEmergency = () => {
    Linking.openURL('tel:112');
  };

  return (
    <View style={s.container}>
      {/* Header Bar */}
      <View style={s.headerBar}>
        <Pressable
          style={s.headerIconBtn}
          onPress={() => navigation.navigate('MainTabs')}
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
        >
          <Icon name="arrowLeft" size={20} color={colors.ink} />
        </Pressable>

        <LogoWide width={110} height={28} />

        <Pressable
          style={s.headerIconBtn}
          onPress={() => navigation.navigate('Notifications')}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Icon name="bell" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={s.titleWrap}>
          <Text style={s.mainGreeting}>Check-in complete,</Text>
          <Text style={s.nameGreeting}>{firstName}! 👋</Text>
          <Text style={s.subGreeting}>Here is your plan for today:</Text>
        </View>

        {/* 1. Current Status Card */}
        <View style={s.statusCard}>
          <View style={s.statusIconCircle}>
            <Icon name="shieldCheck" size={28} color={colors.white} />
          </View>
          <View style={s.statusTextWrap}>
            <Text style={s.statusTag}>CURRENT STATUS</Text>
            <Text style={s.statusHeading}>Low Risk - Stable</Text>
            <Text style={s.statusDesc}>
              Your metrics look good today. Continue your exercise and recovery plan.
            </Text>
          </View>
        </View>

        {/* 2. Recovery Goal Card */}
        <View style={s.goalCard}>
          <View style={s.goalLeft}>
            <Text style={s.goalTitle}>Knee Recovery Goal</Text>
            <Text style={s.goalSub}>Day 24 of 30 • Mobility Rehabilitation</Text>
            <View style={s.goalProgressBar}>
              <View style={[s.goalProgressFill, { width: '72%' }]} />
            </View>
          </View>
          <View style={s.goalPercentageBadge}>
            <Text style={s.goalPercentageText}>72%</Text>
          </View>
        </View>

        {/* 3. Section: What To Do Next */}
        <View style={s.nextSection}>
          <Text style={s.sectionHeader}>WHAT TO DO NEXT</Text>

          {/* Action 1: Continue Care Plan */}
          <Pressable
            style={s.actionRowCard}
            onPress={() => navigation.navigate('CarePlan')}
            accessibilityRole="button"
            accessibilityLabel="Continue your care plan"
          >
            <View style={[s.actionIconWrap, { backgroundColor: '#EEF8F5' }]}>
              <Icon name="clipboard" size={20} color={colors.surfie} />
            </View>
            <View style={s.actionTextCol}>
              <Text style={s.actionTitle}>Continue your care plan</Text>
              <Text style={s.actionDesc}>15-min knee flexion stretch & walk target</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.inkFaint} />
          </Pressable>

          {/* Action 2: Book Follow-Up */}
          <Pressable
            style={s.actionRowCard}
            onPress={() => navigation.navigate('BookFollowUp')}
            accessibilityRole="button"
            accessibilityLabel="Book a follow up consultation"
          >
            <View style={[s.actionIconWrap, { backgroundColor: '#EEF8F5' }]}>
              <Icon name="calendar" size={20} color={colors.surfie} />
            </View>
            <View style={s.actionTextCol}>
              <Text style={s.actionTitle}>Book a follow-up</Text>
              <Text style={s.actionDesc}>Schedule with Dr. Richard Parker</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.inkFaint} />
          </Pressable>

          {/* Action 3: Explore Care Hub */}
          <Pressable
            style={s.actionRowCard}
            onPress={() => navigation.navigate('CareHub')}
            accessibilityRole="button"
            accessibilityLabel="Explore Care Hub"
          >
            <View style={[s.actionIconWrap, { backgroundColor: '#EEF8F5' }]}>
              <Icon name="heart" size={20} color={colors.surfie} />
            </View>
            <View style={s.actionTextCol}>
              <Text style={s.actionTitle}>Explore Care Hub</Text>
              <Text style={s.actionDesc}>Self-help tools, guided breathing, and library</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.inkFaint} />
          </Pressable>

          {/* Feeling Better Banner */}
          <Pressable
            style={s.feelingBetterBanner}
            onPress={() => navigation.navigate('CarePlan')}
          >
            <View style={s.feelingBetterTextWrap}>
              <Text style={s.feelingBetterTitle}>Feeling better today?</Text>
              <Text style={s.feelingBetterSub}>Update your joint mobility & pain score log</Text>
            </View>
            <Text style={s.viewPlanLink}>Update Log ›</Text>
          </Pressable>

          {/* Red Alert Card */}
          <View style={s.painAlertCard}>
            <View style={s.painAlertHeader}>
              <Icon name="alertTriangle" size={18} color="#DC2626" />
              <Text style={s.painAlertTitle}>Feeling severe or sudden pain?</Text>
            </View>
            <Text style={s.painAlertDesc}>
              If you experience sharp joint locking, fever, or swelling, seek immediate clinical guidance.
            </Text>
            <View style={s.painAlertButtons}>
              <Pressable
                style={s.careHubCallBtn}
                onPress={() => navigation.navigate('CareHub')}
                accessibilityRole="button"
                accessibilityLabel="Call Care Hub"
              >
                <Icon name="phone" size={14} color="#991B1B" />
                <Text style={s.careHubCallText}>Call Care Hub</Text>
              </Pressable>
              <Pressable
                style={s.emergencyDialBtn}
                onPress={handleDialEmergency}
                accessibilityRole="button"
                accessibilityLabel="Call Emergency 112"
              >
                <Icon name="phone" size={14} color={colors.white} />
                <Text style={s.emergencyDialText}>Emergency 112</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 5-Tab Bar with Care Plan Highlighted */}
      <PatientTabBar activeTab="CarePlan" />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FBF9',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  titleWrap: {
    marginBottom: 4,
  },
  mainGreeting: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
  },
  nameGreeting: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.surfie,
    marginBottom: 2,
  },
  subGreeting: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    backgroundColor: '#FCFDFD',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statusIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0E766C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTextWrap: {
    flex: 1,
  },
  statusTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0E766C',
    letterSpacing: 0.5,
  },
  statusHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 2,
    marginBottom: 2,
  },
  statusDesc: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF8F5',
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: spacing.md,
  },
  goalLeft: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  goalSub: {
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
    marginBottom: 8,
  },
  goalProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1FAE5',
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: colors.surfie,
    borderRadius: 3,
  },
  goalPercentageBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surfie,
  },
  goalPercentageText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.surfie,
  },
  nextSection: {
    gap: spacing.sm,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkFaint,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  actionRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  actionDesc: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  feelingBetterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF8F5',
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  feelingBetterTextWrap: {
    flex: 1,
  },
  feelingBetterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0E766C',
  },
  feelingBetterSub: {
    fontSize: 11,
    color: '#0E766C',
    marginTop: 2,
  },
  viewPlanLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0E766C',
    marginLeft: spacing.sm,
  },
  painAlertCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: spacing.xs,
  },
  painAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  painAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  painAlertDesc: {
    fontSize: 11,
    color: '#7F1D1D',
    lineHeight: 16,
  },
  painAlertButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  careHubCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.white,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  careHubCallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  emergencyDialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    borderRadius: 8,
  },
  emergencyDialText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
});

export default CheckInCompleteScreen;
