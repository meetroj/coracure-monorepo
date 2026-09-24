import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon, type IconName } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import PatientTabBar from '../components/PatientTabBar';

interface PolicyItem {
  id: string;
  title: string;
  sub: string;
  icon: IconName;
  content: string;
}

const POLICIES: PolicyItem[] = [
  {
    id: 'terms',
    title: 'Terms of Use',
    sub: 'Rules and guidelines for using services',
    icon: 'document',
    content:
      'CoraCure provides digital healthcare matching and encrypted teleconsultations under applicable Indian digital health laws. Patients must provide accurate identification, follow assigned treatment plans, and use the platform only for lawful clinical purposes.',
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    sub: 'How we collect, use and protect your information',
    icon: 'lock',
    content:
      'We comply with DISHA guidelines and statutory EHR safety standards. Your clinical consultation recordings, prescriptions, and intake symptoms are encrypted with AES-256 and never shared with third-party advertisers.',
  },
  {
    id: 'consent',
    title: 'Consent Policy',
    sub: 'Details about consent for teleconsultation and records',
    icon: 'shieldCheck',
    content:
      'Before any consultation begins, informed digital consent is recorded under PT-03-01. You consent to audio-video examination, digital prescription generation, and statutory record retention.',
  },
  {
    id: 'refund',
    title: 'Refund & Cancellation Policy',
    sub: 'Policy on refunds, cancellations and rescheduling',
    icon: 'refresh',
    content:
      'Free cancellation or rescheduling is permitted up to 2 hours prior to scheduled consultation start. If a doctor fails to attend within 10 minutes of booking start, an immediate 100% refund is credited to source.',
  },
  {
    id: 'retention',
    title: 'Data Retention Policy',
    sub: 'How long we retain your data and why',
    icon: 'folder',
    content:
      'Under statutory medical practice regulations, teleconsultation clinical notes, referral slips, and digital prescriptions must be retained for 3 years from the date of consultation and cannot be wiped on demand.',
  },
  {
    id: 'cookies',
    title: 'Cookies Policy',
    sub: 'How we use cookies and device identifiers',
    icon: 'shieldCheck',
    content:
      'We use session authentication tokens and essential device performance telemetry only to ensure video call stability and maintain secure login states.',
  },
  {
    id: 'community',
    title: 'Community Guidelines',
    sub: 'Our standards for respectful interactions',
    icon: 'heart',
    content:
      'CoraCure enforces a zero-tolerance policy against abusive language, harassment, or fraudulent impersonation. Violations result in immediate account suspension.',
  },
  {
    id: 'grievance',
    title: 'Grievance Redressal Policy',
    sub: 'How we address and resolve your concerns',
    icon: 'clipboard',
    content:
      'Patients may lodge formal complaints under PT-19-02. Our designated Grievance Officer investigates all clinical and billing tickets with a mandatory resolution timeline of 24 to 48 business hours.',
  },
];

export const LegalPolicyScreen = () => {
  const navigation = useNavigation<any>();
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyItem | null>(null);

  return (
    <View style={s.container}>
      {/* Top Header */}
      <View style={s.headerBar}>
        <Pressable
          style={s.headerIconBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
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
        {/* Hero Section */}
        <View style={s.heroCard}>
          <View style={s.heroTextCol}>
            <Text style={s.heroTitle}>Legal & Policy ⚖️</Text>
            <Text style={s.heroSub}>
              Important information about your rights, privacy and our policies.
            </Text>
          </View>
          <View style={s.docIconWrap}>
            <Icon name="shieldCheck" size={32} color={colors.surfie} />
          </View>
        </View>

        {/* Policies List */}
        <View style={s.cardGroup}>
          {POLICIES.map((item, idx) => (
            <React.Fragment key={item.id}>
              <Pressable
                style={s.rowItem}
                onPress={() => setSelectedPolicy(item)}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <View style={s.rowIconCircle}>
                  <Icon name={item.icon} size={18} color={colors.surfie} />
                </View>
                <View style={s.rowTextCol}>
                  <Text style={s.rowTitle}>{item.title}</Text>
                  <Text style={s.rowSub}>{item.sub}</Text>
                </View>
                <Icon name="chevronRight" size={18} color={colors.inkFaint} />
              </Pressable>
              {idx < POLICIES.length - 1 && <View style={s.rowDivider} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>

      {/* Policy Detail Modal */}
      <Modal visible={!!selectedPolicy} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{selectedPolicy?.title}</Text>
              <Pressable
                onPress={() => setSelectedPolicy(null)}
                accessibilityRole="button"
                accessibilityLabel="Close policy modal"
              >
                <Icon name="x" size={20} color={colors.ink} />
              </Pressable>
            </View>

            <ScrollView style={s.modalBodyScroll} showsVerticalScrollIndicator={false}>
              <Text style={s.modalBodyText}>{selectedPolicy?.content}</Text>
              <View style={s.auditBox}>
                <Icon name="lock" size={14} color={colors.surfie} />
                <Text style={s.auditText}>
                  Statutory version 1.2 • Effective Date: 9 September 2026 • Verified for clinical teleconsultation
                </Text>
              </View>
            </ScrollView>

            <Pressable
              style={s.modalCloseBtn}
              onPress={() => setSelectedPolicy(null)}
            >
              <Text style={s.modalCloseBtnText}>I Understand</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 5-Tab Bar */}
      <PatientTabBar activeTab="Profile" />
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
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF8F5',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 14,
  },
  heroTextCol: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
  },
  heroSub: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 16,
  },
  docIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGroup: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
    marginTop: 4,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 56,
  },
  rowIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextCol: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  rowSub: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  modalBodyScroll: {
    marginVertical: 6,
  },
  modalBodyText: {
    fontSize: 13,
    color: colors.ink,
    lineHeight: 20,
  },
  auditBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF8F5',
    padding: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  auditText: {
    flex: 1,
    fontSize: 11,
    color: colors.surfie,
    lineHeight: 15,
  },
  modalCloseBtn: {
    backgroundColor: colors.surfie,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
});

export default LegalPolicyScreen;
