import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { colors, typography, spacing, radius } from '@coracure/brand';
import { PillButton, Icon, BackgroundWatermarks } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import ConsultationHeroImg from '../assets/consultation-hero.png';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';

type WelcomeScreenProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

export const WelcomeScreen = () => {
  const navigation = useNavigation<WelcomeScreenProp>();
  const { loginAsDemo } = useAuth();

  const onGetStarted = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <BackgroundWatermarks />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <LogoWide width={130} height={34} />
          <Pressable onPress={() => navigation.navigate('Login')} hitSlop={12}>
            <Text style={styles.topSkipText}>Skip</Text>
          </Pressable>
        </View>

        {/* Hero Title & Subtitle */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Expert care,</Text>
          <Text style={styles.heroHighlight}>anytime, anywhere.</Text>
          <Text style={styles.supportCopy}>
            Connect with trusted professionals, enjoy private consultations, and receive ongoing care tailored to you.
          </Text>
        </View>

        {/* Hero Image Card with Floating Badges */}
        <View style={styles.imageCardWrapper}>
          <View style={styles.imageCard}>
            <Image
              source={ConsultationHeroImg}
              style={styles.heroImage}
              resizeMode="cover"
            />

            {/* Floating Badge 1: Trusted Professionals (top left) */}
            <View style={styles.floatingBadgeTopLeft}>
              <View style={styles.badgeIconCircle}>
                <Icon name="shieldCheck" size={16} color={colors.surfie} />
              </View>
              <Text style={styles.badgeText}>Trusted Professionals</Text>
            </View>

            {/* Floating Badge 2: Easy Appointments (bottom right) */}
            <View style={styles.floatingBadgeBottomRight}>
              <View style={styles.badgeIconCircle}>
                <Icon name="calendar" size={16} color={colors.surfie} />
              </View>
              <Text style={styles.badgeText}>Easy Appointments</Text>
            </View>
          </View>
        </View>

        {/* Stats Card: 200K+ Patients Trust Us | 50+ Specialties */}
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <View style={styles.statIconCircle}>
              <Icon name="user" size={18} color={colors.surfie} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>200K+</Text>
              <Text style={styles.statLabel}>Patients Trust Us</Text>
            </View>
          </View>
          
          <View style={styles.statDivider} />

          <View style={styles.statCol}>
            <View style={styles.statIconCircle}>
              <Icon name="heart" size={18} color={colors.surfie} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>50+</Text>
              <Text style={styles.statLabel}>Specialties</Text>
            </View>
          </View>
        </View>

        {/* Carousel Indicators (3 dots) */}
        <View style={styles.dotsRow}>
          <View style={styles.dotActive} />
          <View style={styles.dotInactive} />
          <View style={styles.dotInactive} />
        </View>

        {/* Action Button & Skip */}
        <View style={styles.footer}>
          <PillButton label="Get Started" onPress={onGetStarted} />
          
          <Pressable onPress={() => navigation.navigate('Login')} style={styles.bottomSkipBtn}>
            <Text style={styles.bottomSkipText}>Skip ›</Text>
          </Pressable>

          <Pressable onPress={() => loginAsDemo()} style={styles.demoLink}>
            <Text style={styles.demoLinkText}>⚡ Quick Demo Login (bypass auth)</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FBF9',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  topSkipText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.surfie,
  },
  heroSection: {
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontFamily: typography.heading.family,
    fontWeight: '800',
    fontSize: 32,
    color: '#111827',
    lineHeight: 38,
  },
  heroHighlight: {
    fontFamily: typography.heading.family,
    fontWeight: '800',
    fontSize: 32,
    color: colors.surfie,
    lineHeight: 38,
  },
  supportCopy: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  imageCardWrapper: {
    marginBottom: spacing.lg,
  },
  imageCard: {
    width: '100%',
    height: 230,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surface.mintSoft,
    borderWidth: 1,
    borderColor: '#D1EAE0',
    shadowColor: '#0E766C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  floatingBadgeTopLeft: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  floatingBadgeBottomRight: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  badgeIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: '#111827',
  },
  statsCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  statCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: '#111827',
  },
  statLabel: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E5E7EB',
    marginHorizontal: spacing.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.lg,
  },
  dotActive: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfie,
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  footer: {
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  bottomSkipBtn: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  bottomSkipText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    fontWeight: '500',
  },
  demoLink: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  demoLinkText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.surfie,
    fontWeight: '600',
  },
});

export default WelcomeScreen;

