import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Modal, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { colors, radius, spacing, typography } from '@coracure/brand';
import { Icon, Button, StatusPill, type IconName } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import DrArjunImg from '../assets/dr-arjun-mehta.jpg';
import DrNehaImg from '../assets/dr-neha-sharma.jpg';
import KneeJointImg from '../assets/knee-joint.jpg';
import SleepScienceImg from '../assets/sleep-science.jpg';
import MentalHealthImg from '../assets/mental-health.jpg';
import { useAuth } from '../hooks/useAuth';
import { mockConsultationsStore } from '@coracure/api';

/** Doctors behind each speciality tier. Reads from the catalogue once wired. */
const SPECIALIST_DOCTORS = [
  { name: 'Dr. Arjun Mehta', field: 'General Physician', img: DrArjunImg },
  { name: 'Dr. Neha Sharma', field: 'Pulmonologist', img: DrNehaImg },
];

const SUPER_SPECIALIST_DOCTORS = [
  { name: 'Dr. Richard Parker', field: 'Orthopedic Surgeon', img: DrRichardImg },
  { name: 'Dr. Neha Sharma', field: 'Cardiac Electrophysiologist', img: DrNehaImg },
];

const PARAMEDICAL = [
  { name: 'Dietitian', icon: 'heart' as IconName },
  { name: 'Nutritionist', icon: 'clipboard' as IconName },
  { name: 'Physiotherapist', icon: 'stethoscope' as IconName },
  { name: 'Counsellor', icon: 'message' as IconName },
];

const BLOG = {
  kind: 'Article',
  title: 'Five things that actually speed up knee recovery',
  readTime: '4 min read',
  img: KneeJointImg,
};

const RECOMMENDED = [
  { title: 'Sleep hygiene basics', by: 'Dr. Richard Parker', img: SleepScienceImg, screen: 'EducationLibrary' },
  { title: 'Box breathing for pain', by: 'Dr. Richard Parker', img: MentalHealthImg, screen: 'SelfHelpTool' },
];

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const userName = user?.fullName || 'Alex Morgan';

  const [showInstantModal, setShowInstantModal] = useState(false);

  const next = mockConsultationsStore[0];
  /** Card width for the snapping appointment rail: full width less the gutters. */
  const cardWidth = width - spacing.lg * 2;

  return (
    <View testID="dashboard" style={s.container}>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Bar: Brand Logo + Notification Bell + AI Assistant */}
        <View style={s.topBar}>
          <LogoWide width={150} height={40} />
          <View style={s.topActions}>
            <Pressable
              style={s.bellBtn}
              onPress={() => navigation.navigate('Notifications')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Icon name="bell" size={20} color={colors.ink} />
              <View style={s.bellBadge} />
            </Pressable>
            <Pressable
              style={s.aiBtn}
              onPress={() => navigation.navigate('AIAssistant')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="AI Assistant"
            >
              <Icon name="assistant" size={19} color={colors.surfie} />
            </Pressable>
          </View>
        </View>

        {/* Greeting */}
        <View style={s.greetingSection}>
          <Text style={s.greetingMuted}>Good Morning,</Text>
          <Text style={s.greetingName}>{userName}</Text>
        </View>

        {/* Search Bar */}
        <Pressable
          style={s.searchBar}
          onPress={() => navigation.navigate('Search')}
          accessibilityRole="button"
          accessibilityLabel="Search concerns and symptoms"
        >
          <Icon name="search" size={18} color={colors.inkFaint} />
          <Text style={s.searchPlaceholder}>
            Search by concerns, symptoms, or therapy...
          </Text>
        </Pressable>

        {/* ------------------------------------------------------------------ */}
        {/* Appointment rail: what is next, who you are, and what last happened. */}
        {/* Three cards, so the space is never empty between consultations.     */}
        {/* ------------------------------------------------------------------ */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + spacing.sm}
          decelerationRate="fast"
          contentContainerStyle={s.railContent}
          style={s.rail}
        keyboardShouldPersistTaps="handled"
      >
          {/* Card 1: the next consultation */}
          <Pressable
            style={[s.appointmentCard, { width: cardWidth }]}
            onPress={() => navigation.navigate('DeviceCheck', { consultationId: 'cons-001' })}
          >
            <View style={s.appointmentLeft}>
              <View style={s.appointmentBadge}>
                <Text style={s.appointmentBadgeText}>Upcoming Appointment</Text>
              </View>

              <Text style={s.doctorName}>Dr. Richard Parker</Text>
              <Text style={s.doctorSpecialty}>Orthopedic Surgeon</Text>

              <View style={s.dateTimeRow}>
                <View style={s.timeItem}>
                  <Icon name="calendar" size={14} color="#D7E8E3" />
                  <Text style={s.timeText}>
                    {new Date(next.scheduledStartAt).toLocaleDateString('en-IN', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={s.timeItem}>
                  <Icon name="clock" size={14} color="#D7E8E3" />
                  <Text style={s.timeText}>
                    {new Date(next.scheduledStartAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>

              <Pressable
                style={s.viewDetailsBtn}
                onPress={() => navigation.navigate('DeviceCheck', { consultationId: 'cons-001' })}
              >
                <Text style={s.viewDetailsText}>View Details</Text>
              </Pressable>
            </View>

            <View style={s.photoWrap}>
              <View style={s.doctorPhotoFrame}>
                <Image source={DrRichardImg} style={s.doctorPhoto} resizeMode="cover" />
              </View>
              <View style={s.photoArrow}>
                <Icon name="arrowRight" size={16} color={colors.white} />
              </View>
            </View>
          </Pressable>

          {/* Card 2: who the record belongs to, from the profile form */}
          <Pressable
            style={[s.patientCard, { width: cardWidth }]}
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel="Your patient details"
          >
            <View style={s.patientHeaderRow}>
              <View style={s.patientAvatar}>
                <Text style={s.patientInitials}>
                  {userName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                </Text>
              </View>
              <View style={s.flex}>
                <Text style={s.patientName}>{userName}</Text>
                <Text style={s.patientMeta}>Patient ID · CC{String(user?.id ?? '100248').slice(-6)}</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.surfie} />
            </View>

            <View style={s.patientStatsRow}>
              {[
                { label: 'Age', value: user?.age ? String(user.age) : '35' },
                { label: 'Gender', value: user?.gender === 'undisclosed' ? 'Not set' : (user?.gender ?? 'Not set') },
                { label: 'Blood', value: 'O+' },
                { label: 'Language', value: user?.preferredLanguage ?? 'English' },
              ].map((stat) => (
                <View key={stat.label} style={s.patientStat}>
                  <Text style={s.patientStatValue} numberOfLines={1}>{stat.value}</Text>
                  <Text style={s.patientStatLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </Pressable>

          {/* Card 3: what happened last time, until a next one exists */}
          <Pressable
            style={[s.lastVisitCard, { width: cardWidth }]}
            onPress={() => navigation.navigate('Prescription')}
            accessibilityRole="button"
            accessibilityLabel="Your last consultation"
          >
            <View style={s.lastVisitTop}>
              <View style={s.lastVisitTag}>
                <Text style={s.lastVisitTagText}>Last Consultation</Text>
              </View>
              <Text style={s.lastVisitDate}>05 May</Text>
            </View>

            <View style={s.lastVisitRow}>
              <Image source={DrRichardImg} style={s.lastVisitAvatar} resizeMode="cover" />
              <View style={s.flex}>
                <Text style={s.lastVisitName}>Dr. Richard Parker</Text>
                <Text style={s.lastVisitField}>Orthopedic Surgeon</Text>
              </View>
            </View>

            <Text style={s.lastVisitNote} numberOfLines={2}>
              Continue physiotherapy stretches twice daily. Review in three weeks.
            </Text>

            <View style={s.lastVisitActions}>
              <View style={s.lastVisitChip}>
                <Icon name="prescription" size={13} color={colors.surfie} />
                <Text style={s.lastVisitChipText}>Prescription</Text>
              </View>
              <View style={s.lastVisitChip}>
                <Icon name="document" size={13} color={colors.surfie} />
                <Text style={s.lastVisitChipText}>Summary</Text>
              </View>
            </View>
          </Pressable>
        </ScrollView>

        {/* Daily check-in */}
        <Pressable
          style={s.checkInCard}
          onPress={() => navigation.navigate('DailyCheckIn')}
          accessibilityRole="button"
          accessibilityLabel="Daily check-in"
        >
          <View style={s.checkInIcon}>
            <Icon name="checkCircle" size={22} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.checkInTitle}>Daily check-in</Text>
            <Text style={s.checkInSub}>Two minutes on how you are doing today</Text>
          </View>
          <View style={s.checkInArrow}>
            <Icon name="arrowRight" size={16} color={colors.white} />
          </View>
        </Pressable>

        {/* Explore Services */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Explore Services</Text>
          <Pressable onPress={() => navigation.navigate('ChooseService')}>
            <Text style={s.viewAllLink}>View All ›</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.servicesRow}
        keyboardShouldPersistTaps="handled"
      >
          {['Orthopedics', 'Cardiology', 'Neurology', 'Dermatology', 'Mental Health'].map((service, idx) => (
            <Pressable
              key={service}
              style={[s.serviceChip, idx === 0 && s.serviceChipActive]}
              onPress={() => navigation.navigate('FindDoctor', { serviceName: service })}
            >
              <Text style={[s.serviceChipText, idx === 0 && s.serviceChipTextActive]}>
                {service}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Super Speciality — two tiers, each with its own doctors */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Super Speciality</Text>
        </View>

        <View style={s.tierRow}>
          {[
            { tier: 'Specialist', caption: 'Everyday care', list: SPECIALIST_DOCTORS },
            { tier: 'Super Specialist', caption: 'Advanced care', list: SUPER_SPECIALIST_DOCTORS },
          ].map((group) => (
            <Pressable
              key={group.tier}
              style={s.tierCard}
              onPress={() => navigation.navigate('FindDoctor', { serviceName: group.tier })}
              accessibilityRole="button"
              accessibilityLabel={group.tier}
            >
              <Text style={s.tierTitle}>{group.tier}</Text>
              <Text style={s.tierCaption}>{group.caption}</Text>

              <View style={s.tierDoctors}>
                {group.list.map((d) => (
                  <View key={d.name} style={s.tierDoctorRow}>
                    <Image source={d.img} style={s.tierAvatar} resizeMode="cover" />
                    <View style={s.flex}>
                      <Text style={s.tierDoctorName} numberOfLines={1}>{d.name}</Text>
                      <Text style={s.tierDoctorField} numberOfLines={1}>{d.field}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <Text style={s.tierLink}>View all ›</Text>
            </Pressable>
          ))}
        </View>

        {/* Paramedical Professionals */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Paramedical Professionals</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.servicesRow}
          keyboardShouldPersistTaps="handled"
        >
          {PARAMEDICAL.map((p) => (
            <Pressable
              key={p.name}
              style={s.paraChip}
              onPress={() => navigation.navigate('FindDoctor', { serviceName: p.name })}
              accessibilityRole="button"
              accessibilityLabel={p.name}
            >
              <Icon name={p.icon} size={16} color={colors.surfie} />
              <Text style={s.paraChipText} numberOfLines={1}>{p.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Blog */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Articles, Videos & More</Text>
        </View>

        <Pressable
          style={s.blogCard}
          onPress={() => navigation.navigate('BlogsArticles')}
          accessibilityRole="button"
          accessibilityLabel={BLOG.title}
        >
          <Image source={BLOG.img} style={s.blogImage} resizeMode="cover" />
          <View style={s.blogBody}>
            <View style={s.blogKindRow}>
              <View style={s.blogKind}>
                <Text style={s.blogKindText}>{BLOG.kind}</Text>
              </View>
              <Text style={s.blogRead}>{BLOG.readTime}</Text>
            </View>
            <Text style={s.blogTitle}>{BLOG.title}</Text>
            <Text style={s.blogMore}>Read article ›</Text>
          </View>
        </Pressable>

        {/* Resources & Recommendations — what the doctor picked from Care Hub */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Resources & Recommendations</Text>
          <Pressable onPress={() => navigation.navigate('CareHub')}>
            <Text style={s.viewAllLink}>View All ›</Text>
          </Pressable>
        </View>

        <View style={s.recCard}>
          <View style={s.recHeaderRow}>
            <Icon name="sparkles" size={15} color={colors.surfie} />
            <Text style={s.recHeaderText}>Recommended by Dr. Richard Parker</Text>
          </View>

          {RECOMMENDED.map((r) => (
            <Pressable
              key={r.title}
              style={s.recRow}
              onPress={() => navigation.navigate(r.screen)}
              accessibilityRole="button"
              accessibilityLabel={r.title}
            >
              <Image source={r.img} style={s.recThumb} resizeMode="cover" />
              <View style={s.flex}>
                <Text style={s.recTitle} numberOfLines={1}>{r.title}</Text>
                <Text style={s.recBy} numberOfLines={1}>{r.by}</Text>
              </View>
              <Icon name="chevronRight" size={16} color={colors.surfie} />
            </Pressable>
          ))}
        </View>

        {/* Security / Privacy Banner */}
        <View style={s.securityBanner}>
          <Icon name="shieldCheck" size={20} color={colors.surfie} />
          <View style={s.securityTextCol}>
            <Text style={s.securityText}>
              Your health data is safe and secure with us. We follow industry leading security standards.
            </Text>
            <Pressable onPress={() => navigation.navigate('LegalPolicy')}>
              <Text style={s.learnMoreLink}>Learn More</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* INSTANT CONSULTATION MODAL (PT-13-01 APPOINTMENT ENFORCEMENT) */}
      {/* ========================================================================= */}
      <Modal
        visible={showInstantModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInstantModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Consult a Doctor Now</Text>
                <Text style={s.modalSubtitle}>
                  Teleconsultations require a confirmed appointment or on-call request.
                </Text>
              </View>
              <Pressable
                style={s.modalCloseBtn}
                onPress={() => setShowInstantModal(false)}
                accessibilityLabel="Close"
              >
                <Icon name="x" size={18} color={colors.ink} />
              </Pressable>
            </View>

            <ScrollView style={s.modalContent} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
              <View style={s.optionCard}>
                <View style={s.optionBadge}>
                  <StatusPill label="Ready Today" tone="brand" />
                </View>
                <View style={s.optionRow}>
                  <Image source={DrRichardImg} style={s.optionAvatar} resizeMode="cover" />
                  <View style={s.optionInfo}>
                    <Text style={s.optionDocName}>Dr. Richard Parker</Text>
                    <Text style={s.optionSpecialty}>Orthopedic Surgeon · Knee Specialist</Text>
                    <Text style={s.optionTime}>Today · 10:30 AM (Confirmed)</Text>
                  </View>
                </View>
                <Button
                  label="Join Dr. Parker's Call"
                  onPress={() => {
                    setShowInstantModal(false);
                    navigation.navigate('DeviceCheck', { consultationId: 'cons-001' });
                  }}
                  style={{ marginTop: spacing.sm }}
                />
              </View>

              <View style={s.optionCardSecondary}>
                <View style={s.optionHeaderSecondary}>
                  <View style={s.optionIconBox}>
                    <Icon name="stethoscope" size={20} color={colors.surfie} />
                  </View>
                  <View style={s.flex}>
                    <Text style={s.optionDocName}>Request On-Call Doctor</Text>
                    <Text style={s.optionSpecialty}>Connect with an available doctor in ~5 mins</Text>
                  </View>
                </View>
                <Text style={s.optionDesc}>
                  Select your medical specialty and complete payment to initiate instant doctor matching.
                </Text>
                <Button
                  label="Select Specialty & Book"
                  variant="secondary"
                  onPress={() => {
                    setShowInstantModal(false);
                    navigation.navigate('ChooseService');
                  }}
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FBF9',
    position: 'relative',
  },
  flex: { flex: 1 },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfie,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  aiBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7EBE0',
  },
  greetingSection: {
    marginBottom: spacing.sm,
  },
  greetingMuted: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  greetingName: {
    fontFamily: typography.heading.family,
    fontWeight: '800',
    fontSize: 24,
    color: '#111827',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
  },

  /* ------------------------------ rail ------------------------------ */
  rail: { marginBottom: spacing.lg },
  railContent: { gap: spacing.sm },

  appointmentCard: {
    backgroundColor: '#0E5C53',
    borderRadius: 22,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0E5C53',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  appointmentLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  appointmentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: 8,
  },
  appointmentBadgeText: {
    fontFamily: typography.body.family,
    fontSize: 10,
    fontWeight: '600',
    color: '#E6F3EE',
  },
  doctorName: {
    fontFamily: typography.heading.family,
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
  },
  doctorSpecialty: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: '#B8C7C3',
    marginTop: 2,
    marginBottom: 10,
  },
  dateTimeRow: {
    gap: 4,
    marginBottom: 12,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: '#D7E8E3',
  },
  viewDetailsBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  viewDetailsText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    fontWeight: '700',
    color: colors.surfie,
  },
  photoWrap: {
    position: 'relative',
  },
  doctorPhotoFrame: {
    width: 104,
    height: 132,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  // Explicit px, not '100%': Fabric does not resolve percentage dimensions on
  // an Image reliably and the frame renders empty white.
  doctorPhoto: {
    width: 104,
    height: 132,
  },
  photoArrow: {
    position: 'absolute',
    right: -16,
    top: '50%',
    marginTop: -34,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0E5C53',
  },

  patientCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.lg,
    gap: spacing.md,
    justifyContent: 'center',
  },
  patientHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientInitials: {
    fontFamily: typography.heading.family,
    fontSize: 16,
    fontWeight: '800',
    color: colors.surfie,
  },
  patientName: {
    fontFamily: typography.heading.family,
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  patientMeta: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  patientStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface.page,
    borderRadius: radius.card,
    paddingVertical: spacing.sm,
  },
  patientStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  patientStatValue: {
    fontFamily: typography.heading.family,
    fontSize: 13,
    fontWeight: '700',
    color: colors.surfie,
  },
  patientStatLabel: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
  },

  lastVisitCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.lg,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  lastVisitTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastVisitTag: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  lastVisitTagText: {
    fontFamily: typography.body.family,
    fontSize: 10,
    fontWeight: '700',
    color: colors.surfie,
  },
  lastVisitDate: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
    fontWeight: '600',
  },
  lastVisitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  lastVisitAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  lastVisitName: {
    fontFamily: typography.heading.family,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  lastVisitField: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
  },
  lastVisitNote: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 17,
  },
  lastVisitActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  lastVisitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
  },
  lastVisitChipText: {
    fontFamily: typography.body.family,
    fontSize: 11,
    fontWeight: '700',
    color: colors.surfie,
  },

  /* --------------------------- check-in --------------------------- */
  checkInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C7EBE0',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  checkInIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInTitle: {
    fontFamily: typography.heading.family,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  checkInSub: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  checkInArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ----------------------------- book ----------------------------- */

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  viewAllLink: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.surfie,
    fontWeight: '600',
  },
  servicesRow: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  serviceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serviceChipActive: {
    backgroundColor: colors.successSoft,
    borderColor: colors.surfie,
  },
  serviceChipText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  serviceChipTextActive: {
    color: colors.surfie,
    fontWeight: '700',
  },

  /* ------------------------ super speciality ----------------------- */
  tierRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  tierCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.md,
    gap: 6,
  },
  tierTitle: {
    fontFamily: typography.heading.family,
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  tierCaption: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
  },
  tierDoctors: {
    gap: 8,
    marginTop: 4,
  },
  tierDoctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  tierDoctorName: {
    fontFamily: typography.body.family,
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  tierDoctorField: {
    fontFamily: typography.body.family,
    fontSize: 9,
    color: colors.inkMuted,
  },
  tierLink: {
    fontFamily: typography.body.family,
    fontSize: 11,
    fontWeight: '700',
    color: colors.surfie,
    marginTop: 4,
  },

  /* -------------------------- paramedical -------------------------- */
  paraChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  paraChipText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.ink,
  },

  /* ----------------------------- blog ----------------------------- */
  blogCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  blogImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#F3F4F6',
  },
  blogBody: {
    padding: spacing.md,
    gap: 6,
  },
  blogKindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blogKind: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  blogKindText: {
    fontFamily: typography.body.family,
    fontSize: 10,
    fontWeight: '700',
    color: colors.surfie,
  },
  blogRead: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
  },
  blogTitle: {
    fontFamily: typography.heading.family,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 21,
  },
  blogMore: {
    fontFamily: typography.body.family,
    fontSize: 11,
    fontWeight: '700',
    color: colors.surfie,
  },

  /* ------------------------ recommendations ------------------------ */
  recCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  recHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recHeaderText: {
    fontFamily: typography.body.family,
    fontSize: 11,
    fontWeight: '700',
    color: colors.surfie,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 6,
  },
  recThumb: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  recTitle: {
    fontFamily: typography.body.family,
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  recBy: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 2,
  },

  securityBanner: {
    backgroundColor: '#EEF8F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4EFE5',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  securityTextCol: {
    flex: 1,
    gap: 4,
  },
  securityText: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: '#374151',
    lineHeight: 16,
  },
  learnMoreLink: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.surfie,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
    paddingBottom: spacing.sm,
  },
  modalTitle: {
    fontFamily: typography.heading.family,
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  modalSubtitle: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingVertical: spacing.xs,
  },
  optionCard: {
    backgroundColor: '#EEF8F5',
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: '#C7EBE0',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  optionBadge: {
    marginBottom: 6,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionAvatar: {
    width: 52,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfie,
  },
  optionInfo: {
    flex: 1,
    gap: 2,
  },
  optionDocName: {
    fontFamily: typography.heading.family,
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  optionSpecialty: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
  },
  optionTime: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.surfie,
    fontWeight: '600',
    marginTop: 2,
  },
  optionCardSecondary: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  optionHeaderSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: 6,
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionDesc: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 16,
  },
});

export default DashboardScreen;
