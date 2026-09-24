import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Linking, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon, type IconName } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import PatientTabBar from '../components/PatientTabBar';

interface HubService {
  id: string;
  title: string;
  sub: string;
  icon: IconName;
  screen?: string;
  isEmergency?: boolean;
}

const SERVICES: HubService[] = [
  {
    id: 'instant',
    title: 'Instant Consult Now',
    sub: 'Duty doctor live video call (PT-13-01)',
    icon: 'video',
    screen: 'BookingFlow',
  },
  {
    id: 'emergency',
    title: 'Emergency Hotline',
    sub: 'Immediate 24/7 medical dialer',
    icon: 'emergency',
    isEmergency: true,
  },
  {
    id: 'physio',
    title: 'Physical Therapy',
    sub: 'Guided rehabilitation exercises',
    icon: 'shieldCheck',
    screen: 'CarePlan',
  },
  {
    id: 'meds',
    title: 'Medication Refills',
    sub: 'Request e-prescription refill',
    icon: 'clipboard',
    screen: 'Prescription',
  },
  {
    id: 'lab',
    title: 'Lab Test Booking',
    sub: 'Home sample collection & X-Ray',
    icon: 'folder',
    screen: 'Reports',
  },
  {
    id: 'wellness',
    title: 'Mental Wellness',
    sub: 'Stress relief & breathing tools',
    icon: 'heart',
    screen: 'SelfHelpTool',
  },
];

export const CareHubScreen = () => {
  const navigation = useNavigation<any>();

  const handleServicePress = (srv: HubService) => {
    if (srv.isEmergency) {
      Linking.openURL('tel:112');
    } else if (srv.screen) {
      navigation.navigate(srv.screen);
    } else {
      Alert.alert(srv.title, 'Connecting to your care team...');
    }
  };

  return (
    <View style={s.container}>
      {/* Top Header */}
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
          <Text style={s.pageTitle}>Care Hub ✨</Text>
          <Text style={s.pageSubtitle}>
            Your 24/7 dedicated recovery support network
          </Text>
        </View>

        {/* Top Card: Care Coordinator */}
        <View style={s.coordinatorCard}>
          <Image
            source={DrRichardImg}
            style={s.coordinatorPhoto}
            resizeMode="cover"
          />
          <View style={s.coordinatorInfo}>
            <View style={s.onlineBadge}>
              <View style={s.onlineDot} />
              <Text style={s.onlineText}>Care Team Available</Text>
            </View>
            <Text style={s.coordinatorName}>Dr. Richard Parker</Text>
            <Text style={s.coordinatorSub}>Primary Orthopedic Coordinator</Text>
          </View>
          <Pressable
            style={s.chatNowBtn}
            onPress={() => navigation.navigate('HelpSupport')}
            accessibilityRole="button"
            accessibilityLabel="Care Support"
          >
            <Icon name="info" size={15} color={colors.white} />
            <Text style={s.chatNowText}>Support</Text>
          </Pressable>
        </View>

        {/* 2x3 Grid of Support Services */}
        <Text style={s.sectionHeading}>Recovery Services & Support</Text>
        <View style={s.servicesGrid}>
          {SERVICES.map((srv) => (
            <Pressable
              key={srv.id}
              style={[s.serviceCard, srv.isEmergency && s.serviceCardEmergency]}
              onPress={() => handleServicePress(srv)}
              accessibilityRole="button"
              accessibilityLabel={srv.title}
            >
              <View
                style={[
                  s.serviceIconWrap,
                  { backgroundColor: srv.isEmergency ? '#FEE2E2' : '#EEF8F5' },
                ]}
              >
                <Icon
                  name={srv.icon}
                  size={22}
                  color={srv.isEmergency ? '#DC2626' : colors.surfie}
                />
              </View>
              <Text
                style={[
                  s.serviceTitle,
                  srv.isEmergency && s.serviceTitleEmergency,
                ]}
              >
                {srv.title}
              </Text>
              <Text style={s.serviceSub}>{srv.sub}</Text>
            </Pressable>
          ))}
        </View>

        {/* Directory Navigation Links */}
        <Text style={s.sectionHeading}>Learning & Wellness Tools</Text>
        <View style={s.directoryList}>
          <Pressable
            style={s.directoryRow}
            onPress={() => navigation.navigate('CaregiverGuide')}
            accessibilityRole="button"
            accessibilityLabel="Caregiver and Family Guide"
          >
            <View style={s.dirIconCircle}>
              <Icon name="heart" size={18} color={colors.surfie} />
            </View>
            <View style={s.dirTextCol}>
              <Text style={s.dirTitle}>Caregiver & Family Guide</Text>
              <Text style={s.dirSub}>Guidance for family members supporting recovery</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.inkFaint} />
          </Pressable>

          <Pressable
            style={s.directoryRow}
            onPress={() => navigation.navigate('SupportDirectory')}
            accessibilityRole="button"
            accessibilityLabel="Support Directory"
          >
            <View style={s.dirIconCircle}>
              <Icon name="mapPin" size={18} color={colors.surfie} />
            </View>
            <View style={s.dirTextCol}>
              <Text style={s.dirTitle}>Support Directory</Text>
              <Text style={s.dirSub}>Verified rehabilitation clinics and helplines</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.inkFaint} />
          </Pressable>

          <Pressable
            style={s.directoryRow}
            onPress={() => navigation.navigate('SelfHelpTool')}
            accessibilityRole="button"
            accessibilityLabel="Self-Help Tools"
          >
            <View style={s.dirIconCircle}>
              <Icon name="shieldCheck" size={18} color={colors.surfie} />
            </View>
            <View style={s.dirTextCol}>
              <Text style={s.dirTitle}>Self-Help & Breathing Tools</Text>
              <Text style={s.dirSub}>Guided calming exercises for recovery</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.inkFaint} />
          </Pressable>

          <Pressable
            style={s.directoryRow}
            onPress={() => navigation.navigate('EducationLibrary')}
            accessibilityRole="button"
            accessibilityLabel="Education Library"
          >
            <View style={s.dirIconCircle}>
              <Icon name="clipboard" size={18} color={colors.surfie} />
            </View>
            <View style={s.dirTextCol}>
              <Text style={s.dirTitle}>Education Library</Text>
              <Text style={s.dirSub}>Physician-approved guides on sleep & joints</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.inkFaint} />
          </Pressable>

          <Pressable
            style={s.directoryRow}
            onPress={() => navigation.navigate('BlogsArticles')}
            accessibilityRole="button"
            accessibilityLabel="Blogs and Articles"
          >
            <View style={s.dirIconCircle}>
              <Icon name="document" size={18} color={colors.surfie} />
            </View>
            <View style={s.dirTextCol}>
              <Text style={s.dirTitle}>Blogs & Recovery Insights</Text>
              <Text style={s.dirSub}>Expert articles from clinical specialists</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.inkFaint} />
          </Pressable>
        </View>
      </ScrollView>

      {/* 5-Tab Bar */}
      <PatientTabBar activeTab="CareHub" />
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
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  coordinatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  coordinatorPhoto: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  coordinatorInfo: {
    flex: 1,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  coordinatorName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  coordinatorSub: {
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 1,
  },
  chatNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfie,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  chatNowText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 4,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  serviceCardEmergency: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  serviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  serviceTitleEmergency: {
    color: '#991B1B',
  },
  serviceSub: {
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 15,
  },
  directoryList: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  directoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dirIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirTextCol: {
    flex: 1,
  },
  dirTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  dirSub: {
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 1,
  },
});

export default CareHubScreen;
