import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { colors, radius, spacing, typography } from '@coracure/brand';
import { Icon, BackgroundWatermarks, Button, StatusPill } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import KneeJointImg from '../assets/knee-joint.jpg';
import { useAuth } from '../hooks/useAuth';
import { mockConsultationsStore } from '@coracure/api';

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const userName = user?.fullName || 'Alex Morgan';

  const [showInstantModal, setShowInstantModal] = useState(false);

  return (
    <View testID="dashboard" style={s.container}>
      <BackgroundWatermarks />

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar: Brand Logo + Notification Bell */}
        <View style={s.topBar}>
          <LogoWide width={120} height={32} />
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
        </View>

        {/* Greeting */}
        <View style={s.greetingSection}>
          <Text style={s.greetingMuted}>Good Morning,</Text>
          <Text style={s.greetingName}>{userName} 👋</Text>
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
          <View style={s.searchFilterIcon}>
            <Icon name="filter" size={16} color={colors.surfie} />
          </View>
        </Pressable>

        {/* Upcoming Appointment Card with Dr. Richard Parker photo */}
        <Pressable
          style={s.appointmentCard}
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
                <Icon name="calendar" size={14} color="#A7F3D0" />
                <Text style={s.timeText}>{new Date(mockConsultationsStore[0].scheduledStartAt).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              </View>
              <View style={s.timeItem}>
                <Icon name="clock" size={14} color="#A7F3D0" />
                <Text style={s.timeText}>{new Date(mockConsultationsStore[0].scheduledStartAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </View>

            <Pressable
              style={s.viewDetailsBtn}
              onPress={() => navigation.navigate('DeviceCheck', { consultationId: 'cons-001' })}
            >
              <Text style={s.viewDetailsText}>View Details & Join</Text>
            </Pressable>
          </View>

          {/* Dr. Richard Parker Photo Frame */}
          <View style={s.doctorPhotoFrame}>
            <Image
              source={DrRichardImg}
              style={s.doctorPhoto}
              resizeMode="cover"
            />
          </View>
        </Pressable>

        {/* 4 Quick Action Cards */}
        <View style={s.quickActionsGrid}>
          {/* Action 1: Consult Now */}
          <Pressable
            style={s.actionCard}
            onPress={() => setShowInstantModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Consult Now"
          >
            <View style={s.actionIconBox}>
              <Icon name="stethoscope" size={22} color={colors.surfie} />
            </View>
            <Text style={s.actionTitle}>Consult Now</Text>
            <Text style={s.actionSubtitle}>Talk to a doctor right now</Text>
          </Pressable>

          {/* Action 2: Book Appointment */}
          <Pressable
            style={s.actionCard}
            onPress={() => navigation.navigate('BookingFlow')}
            accessibilityRole="button"
            accessibilityLabel="Book Appointment"
          >
            <View style={s.actionIconBox}>
              <Icon name="calendar" size={22} color={colors.surfie} />
            </View>
            <Text style={s.actionTitle}>Book Appointment</Text>
            <Text style={s.actionSubtitle}>Schedule with a specialist</Text>
          </Pressable>

          {/* Action 3: Upload Reports */}
          <Pressable
            style={s.actionCard}
            onPress={() => navigation.navigate('Reports')}
            accessibilityRole="button"
            accessibilityLabel="Upload Reports"
          >
            <View style={s.actionIconBox}>
              <Icon name="clipboard" size={22} color={colors.surfie} />
            </View>
            <Text style={s.actionTitle}>Upload Reports</Text>
            <Text style={s.actionSubtitle}>Share your medical reports</Text>
          </Pressable>

          {/* Action 4: AI Assistant */}
          <Pressable
            style={s.actionCard}
            onPress={() => navigation.navigate('CareHub')}
          >
            <View style={s.actionIconBox}>
              <Icon name="sparkles" size={22} color={colors.surfie} />
            </View>
            <Text style={s.actionTitle}>AI Assistant</Text>
            <Text style={s.actionSubtitle}>Get instant insights 24/7</Text>
          </Pressable>
        </View>

        {/* Explore Services */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Explore Services</Text>
          <Pressable onPress={() => navigation.navigate('CareHub')}>
            <Text style={s.viewAllLink}>View All ›</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.servicesRow}
        >
          {['Orthopedics', 'Cardiology', 'Neurology', 'Dermatology', 'Mental Health'].map((service, idx) => (
            <Pressable
              key={service}
              style={[s.serviceChip, idx === 0 && s.serviceChipActive]}
              onPress={() => navigation.navigate('CareHub')}
            >
              <Text style={[s.serviceChipText, idx === 0 && s.serviceChipTextActive]}>
                {service}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Your Care Plan with Knee Recovery Image */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Your Care Plan</Text>
          <Pressable onPress={() => navigation.navigate('CarePlan')}>
            <Text style={s.viewAllLink}>View Plan ›</Text>
          </Pressable>
        </View>

        <Pressable
          style={s.carePlanCard}
          onPress={() => navigation.navigate('CarePlan')}
        >
          <View style={s.carePlanProgressCircle}>
            <Text style={s.carePlanProgressVal}>72%</Text>
          </View>

          <View style={s.carePlanInfo}>
            <Text style={s.carePlanTitle}>Knee Recovery Plan</Text>
            <Text style={s.carePlanSubtitle}>6 weeks • Day 24</Text>
            <Text style={s.carePlanDetail}>Next check-in: Today</Text>
          </View>

          {/* Knee Joint Diagram Thumbnail */}
          <View style={s.kneeDiagramFrame}>
            <Image
              source={KneeJointImg}
              style={s.kneeDiagramImage}
              resizeMode="contain"
            />
          </View>
        </Pressable>

        {/* Security / Privacy Banner */}
        <View style={s.securityBanner}>
          <Icon name="shieldCheck" size={20} color={colors.surfie} />
          <View style={s.securityTextCol}>
            <Text style={s.securityText}>
              Your health data is safe and secure with us. We follow industry leading security standards.
            </Text>
            <Pressable onPress={() => {}}>
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

            <ScrollView style={s.modalContent} showsVerticalScrollIndicator={false}>
              {/* Option 1: Existing Appointment Ready */}
              <View style={s.optionCard}>
                <View style={s.optionBadge}>
                  <StatusPill label="Ready Today" tone="brand" />
                </View>
                <View style={s.optionRow}>
                  <Image source={DrRichardImg} style={s.optionAvatar} resizeMode="cover" />
                  <View style={s.optionInfo}>
                    <Text style={s.optionDocName}>Dr. Richard Parker</Text>
                    <Text style={s.optionSpecialty}>Orthopedic Surgeon • Knee Specialist</Text>
                    <Text style={s.optionTime}>Today • 10:30 AM (Confirmed)</Text>
                  </View>
                </View>
                <Button
                  label="Join Dr. Parker's Call →"
                  onPress={() => {
                    setShowInstantModal(false);
                    navigation.navigate('DeviceCheck', { consultationId: 'cons-001' });
                  }}
                  style={{ marginTop: spacing.sm }}
                />
              </View>

              {/* Option 2: Request Instant On-Call Doctor */}
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
                    navigation.navigate('CareHub');
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
    marginBottom: spacing.md,
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
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  greetingSection: {
    marginBottom: spacing.md,
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
  searchFilterIcon: {
    padding: 4,
  },
  appointmentCard: {
    backgroundColor: '#0E5C53',
    borderRadius: 22,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
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
    color: '#A7F3D0',
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
    fontSize: 11,
    color: '#E6F3EE',
  },
  viewDetailsBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  viewDetailsText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    fontWeight: '700',
    color: '#0E5C53',
  },
  doctorPhotoFrame: {
    width: 90,
    height: 115,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  doctorPhoto: {
    width: '100%',
    height: '100%',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.md,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontFamily: typography.heading.family,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  actionSubtitle: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
    lineHeight: 14,
  },
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
    backgroundColor: colors.surface.selected,
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
  carePlanCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  carePlanProgressCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
  },
  carePlanProgressVal: {
    fontFamily: typography.heading.family,
    fontSize: 13,
    fontWeight: '800',
    color: colors.surfie,
  },
  carePlanInfo: {
    flex: 1,
    gap: 2,
  },
  carePlanTitle: {
    fontFamily: typography.heading.family,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  carePlanSubtitle: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
  },
  carePlanDetail: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.surfie,
    fontWeight: '600',
    marginTop: 2,
  },
  kneeDiagramFrame: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kneeDiagramImage: {
    width: '100%',
    height: '100%',
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
    backgroundColor: colors.surface.selected,
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


