import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import { useAuth } from '../hooks/useAuth';
import PatientTabBar from '../components/PatientTabBar';

export const CheckInCompleteScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const firstName = user?.fullName?.split(' ')[0] || 'Alex';

  const handleDialEmergency = () => {
    Linking.openURL('tel:108');
  };

  return (
    <View style={s.container}>
      {/* Header Bar */}
      <View style={s.headerBar}>
        <LogoWide width={120} height={30} />

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
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={s.titleWrap}>
          <Text style={s.mainGreeting}>Check-in complete,</Text>
          <Text style={s.nameGreeting}>{firstName}! 👋</Text>
          <Text style={s.subGreeting}>Here is how you are doing today.</Text>
        </View>

        {/* 1. Current Status Card */}
        <View style={s.statusCard}>
          <View style={s.statusRow}>
            <View style={s.statusIconCircle}>
              <Icon name="shieldCheck" size={30} color={colors.white} />
            </View>
            <View style={s.statusTextWrap}>
              <Text style={[s.statusTag, s.statusTagText]}>TODAY'S STATUS</Text>
              <View style={s.statusHeadingRow}>
                <Text style={s.statusHeading}>Low Risk</Text>
                <View style={s.greatJobPill}>
                  <Text style={s.greatJobText}>Great job!</Text>
                </View>
              </View>
              <Text style={s.statusDesc}>
                Your symptoms are mild and stable. Keep following your care plan and monitor your
                health.
              </Text>
            </View>
          </View>

          <View style={s.onTrackBanner}>
            <Icon name="sparkles" size={20} color={colors.surfie} />
            <Text style={s.onTrackText}>
              <Text style={s.onTrackBold}>You are on track!</Text> Consistency is key to staying
              healthy.
            </Text>
          </View>
        </View>

        {/* 3. Section: What To Do Next */}
        <View style={s.nextSection}>
          <Text style={s.sectionHeader}>What to do next</Text>

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
              <Text style={s.actionDesc}>Keep following today's tasks</Text>
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
              <Text style={s.actionDesc}>Schedule your next appointment</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.inkFaint} />
          </Pressable>

          {/* Action 3: Health Trends */}
          <Pressable
            style={s.actionRowCard}
            onPress={() => navigation.navigate('Reports')}
            accessibilityRole="button"
            accessibilityLabel="View health trends"
          >
            <View style={[s.actionIconWrap, { backgroundColor: '#EEF8F5' }]}>
              <Icon name="document" size={20} color={colors.surfie} />
            </View>
            <View style={s.actionTextCol}>
              <Text style={s.actionTitle}>View health trends</Text>
              <Text style={s.actionDesc}>See your progress over time</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.inkFaint} />
          </Pressable>

          {/* Guidance */}
          <View style={s.guidanceCard}>
            <View style={s.guidanceIcon}>
              <Icon name="headset" size={20} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={s.guidanceTitle}>Need guidance?</Text>
              <Text style={s.guidanceSub}>Our care team is here to help.</Text>
            </View>
            <Pressable
              style={s.chatBtn}
              onPress={() => navigation.navigate('HelpSupport')}
              accessibilityRole="button"
              accessibilityLabel="Chat with us"
            >
              <Text style={s.chatBtnText}>Chat with us</Text>
            </Pressable>
          </View>

          {/* Crisis routing */}
          <View style={s.painAlertCard}>
            <View style={s.painAlertIcon}>
              <Icon name="phone" size={20} color={colors.danger} />
            </View>
            <View style={s.flex}>
              <Text style={s.painAlertTitle}>Feeling worse or in crisis?</Text>

            </View>
            <View style={s.painAlertCol}>
              <Pressable
                style={s.emergencyDialBtn}
                onPress={() => navigation.navigate('SupportDirectory')}
                accessibilityRole="button"
                accessibilityLabel="Get help now"
              >
                <Text style={s.emergencyDialText}>Get Help Now</Text>
              </Pressable>
              <Pressable
                onPress={handleDialEmergency}
                accessibilityRole="button"
                accessibilityLabel="Call emergency services on 108"
              >
                <Text style={s.emergencyNumber}>Emergency: 108</Text>
              </Pressable>
            </View>
          </View>
          <Pressable
            style={s.doneBtn}
            onPress={() => navigation.navigate('MainTabs')}
            accessibilityRole="button"
            accessibilityLabel="Done, return to home"
          >
            <Icon name="check" size={18} color={colors.white} />
            <Text style={s.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* 5-Tab Bar with Care Plan Highlighted */}
      <PatientTabBar activeTab="Home" />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FBF9',
  },
  flex: { flex: 1 },
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
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    shadowColor: '#0E766C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  statusHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  greatJobPill: {
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  greatJobText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.surfie,
  },
  onTrackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  onTrackText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  onTrackBold: {
    fontFamily: typography.heading.family,
    fontWeight: '700',
    color: colors.ink,
  },
  guidanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  guidanceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidanceTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  guidanceSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 1,
  },
  chatBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.surfie,
    backgroundColor: colors.white,
  },
  chatBtnText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
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
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.surfie,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0E766C',
    letterSpacing: 0.5,
  },
  statusHeading: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '700',
    color: colors.surfie,
  },
  statusDesc: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
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
  painAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  painAlertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  painAlertTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  painAlertDesc: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radius.card,
    backgroundColor: colors.surfie,
    marginTop: spacing.lg,
  },
  doneBtnText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.white,
  },
  painAlertCol: {
    alignItems: 'center',
    gap: 6,
  },
  emergencyDialBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: 'transparent',
  },
  emergencyDialText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.danger,
  },
  emergencyNumber: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.danger,
  },
});

export default CheckInCompleteScreen;
