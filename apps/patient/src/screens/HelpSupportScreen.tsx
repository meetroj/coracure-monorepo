import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert, Modal, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon, PillButton, type IconName } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import PatientTabBar from '../components/PatientTabBar';

interface HelpItem {
  id: string;
  title: string;
  sub: string;
  icon: IconName;
  action: () => void;
}

export const HelpSupportScreen = () => {
  const navigation = useNavigation<any>();

  // Complaint modal state (PT-19-02)
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintType, setComplaintType] = useState('Doctor Punctuality / Conduct');
  const [complaintText, setComplaintText] = useState('');
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);

  const handleFAQs = () => {
    Alert.alert(
      'Frequently Asked Questions',
      '1. How do I join my video consultation?\nGo to Appointments > tap Join Call at scheduled time.\n\n2. How do refunds work?\nFree cancellation up to 2h before the start time.\n\n3. Can I download my prescriptions?\nYes, visit Reports & Documents at any time.'
    );
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support Desk',
      'Reach our patient support team:\nEmail: support@coracure.health\nHelpdesk Phone: +91 800 123 4567\nOperating Hours: 7:00 AM - 11:00 PM IST',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Helpdesk', onPress: () => Linking.openURL('tel:18001234567') },
      ]
    );
  };

  const handleReportIssue = () => {
    Alert.alert(
      'Report Technical Issue',
      'Experiencing audio, video or payment difficulties? Submit diagnostic logs to our engineering team.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Logs',
          onPress: () =>
            Alert.alert('Logs Submitted', 'Device diagnostic telemetry sent. Ticket #TICK-9942 created.'),
        },
      ]
    );
  };

  const handleSubmitComplaint = () => {
    if (!complaintText.trim()) {
      Alert.alert('Required', 'Please describe your grievance or concern.');
      return;
    }
    setIsSubmittingComplaint(true);
    setTimeout(() => {
      setIsSubmittingComplaint(false);
      setShowComplaintModal(false);
      setComplaintText('');
      Alert.alert(
        'Grievance Registered (PT-19-02)',
        'Your complaint has been escalated to our Clinical Governance and Patient Relations Officer. Reference: #GRV-2026-441. We resolve all inquiries within 24 hours.'
      );
    }, 800);
  };

  const HELP_ITEMS: HelpItem[] = [
    {
      id: 'faqs',
      title: 'FAQs',
      sub: 'Find answers to common questions',
      icon: 'info',
      action: handleFAQs,
    },
    {
      id: 'contact',
      title: 'Contact Support',
      sub: 'Chat and email our care team',
      icon: 'phone',
      action: handleContactSupport,
    },
    {
      id: 'complaint',
      title: 'Make a Complaint',
      sub: 'Voice your concern with us (PT-19-02)',
      icon: 'clipboard',
      action: () => setShowComplaintModal(true),
    },
    {
      id: 'issue',
      title: 'Report an Issue',
      sub: 'Report bug or technical issue',
      icon: 'alertTriangle',
      action: handleReportIssue,
    },
  ];

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
            <Text style={s.heroTitle}>How can we help you?</Text>
            <Text style={s.heroSub}>
              We're here to support you at every step of your care journey.
            </Text>
          </View>
          <View style={s.headsetIconWrap}>
            <Icon name="phone" size={32} color={colors.surfie} />
          </View>
        </View>

        {/* Quick Help List */}
        <Text style={s.sectionTitle}>Quick Help</Text>
        <View style={s.cardGroup}>
          {HELP_ITEMS.map((item, idx) => (
            <React.Fragment key={item.id}>
              <Pressable
                style={s.rowItem}
                onPress={item.action}
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
              {idx < HELP_ITEMS.length - 1 && <View style={s.rowDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Immediate Help Emergency Card */}
        <View style={s.emergencyCard}>
          <View style={s.emergencyHeader}>
            <View style={s.emergencyIconCircle}>
              <Icon name="phone" size={20} color="#0E766C" />
            </View>
            <View style={s.emergencyTextCol}>
              <Text style={s.emergencyTitle}>Need immediate help?</Text>
              <Text style={s.emergencySub}>
                If this is an emergency or you're in severe pain, reach 24/7 clinical help.
              </Text>
            </View>
          </View>
          <Pressable
            style={s.emergencyLinkBtn}
            onPress={() => navigation.navigate('SupportDirectory')}
            accessibilityRole="button"
            accessibilityLabel="Emergency Guidance"
          >
            <Text style={s.emergencyLinkText}>Emergency Guidance ↗</Text>
          </Pressable>
        </View>

        {/* Privacy Note */}
        <View style={s.privacyRow}>
          <View style={s.privacyIconCircle}>
            <Icon name="shieldCheck" size={18} color={colors.surfie} />
          </View>
          <View style={s.privacyTextCol}>
            <Text style={s.privacyTitle}>Your privacy matters.</Text>
            <Text style={s.privacySub}>
              All consultations and data are handled with strict statutory confidentiality.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Complaint Filing Modal (PT-19-02) */}
      <Modal visible={showComplaintModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Make a Complaint (PT-19-02)</Text>
              <Pressable
                onPress={() => setShowComplaintModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <Icon name="x" size={20} color={colors.ink} />
              </Pressable>
            </View>

            <Text style={s.modalSub}>
              All complaints are logged with the Clinical Redressal Committee and audited independently.
            </Text>

            <View style={s.typeSelector}>
              {['Doctor Punctuality / Conduct', 'Video Call Glitch', 'Billing / Refund'].map((t) => (
                <Pressable
                  key={t}
                  style={[s.typeChip, complaintType === t && s.typeChipActive]}
                  onPress={() => setComplaintType(t)}
                >
                  <Text style={[s.typeChipText, complaintType === t && s.typeChipTextActive]}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={s.complaintInput}
              multiline
              numberOfLines={4}
              placeholder="Describe your issue or grievance..."
              placeholderTextColor={colors.inkFaint}
              value={complaintText}
              onChangeText={setComplaintText}
            />

            <View style={s.modalActions}>
              <Pressable
                style={s.cancelBtn}
                onPress={() => setShowComplaintModal(false)}
              >
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={s.submitBtn}
                onPress={handleSubmitComplaint}
                disabled={isSubmittingComplaint}
              >
                <Text style={s.submitText}>Submit Grievance</Text>
              </Pressable>
            </View>
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
  headsetIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginLeft: 2,
    marginTop: 2,
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
  emergencyCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 10,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emergencyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTextCol: {
    flex: 1,
    gap: 2,
  },
  emergencyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  emergencySub: {
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 15,
  },
  emergencyLinkBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  emergencyLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.surfie,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  privacyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyTextCol: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  privacySub: {
    fontSize: 10,
    color: colors.inkMuted,
    lineHeight: 14,
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
  modalSub: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  typeChipActive: {
    backgroundColor: colors.surfie,
  },
  typeChipText: {
    fontSize: 11,
    color: colors.inkMuted,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: colors.white,
  },
  complaintInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: colors.ink,
    textAlignVertical: 'top',
    height: 90,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
});

export default HelpSupportScreen;

