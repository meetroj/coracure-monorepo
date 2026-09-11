import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Share, Image } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, AppHeader, Button, Avatar, StatusPill, Divider, Icon } from '@coracure/ui';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import type { RootStackParamList } from '../navigation/RootNavigator';

type PrescriptionScreenProp = NativeStackNavigationProp<RootStackParamList, 'Prescription'>;
type PrescriptionRouteProp = RouteProp<RootStackParamList, 'Prescription'>;

interface Medicine {
  name: string;
  form: string;
  category: string;
  dosage: string;
  timing: string;
  duration: string;
}

const PRESCRIBED_MEDICINES: Medicine[] = [
  {
    name: 'Amoxycillin 500mg',
    form: 'Tablet',
    category: 'Antibiotic',
    dosage: '1 tablet after food',
    timing: 'Twice daily (Morning, Night)',
    duration: '5 Days',
  },
  {
    name: 'Paracetamol 650mg',
    form: 'Tablet',
    category: 'Pain Relief',
    dosage: '1 tablet after food',
    timing: 'Thrice daily (SOS if fever/pain)',
    duration: '3 Days',
  },
  {
    name: 'Pantoprazole 40mg',
    form: 'Tablet',
    category: 'Antacid',
    dosage: '1 tablet before food',
    timing: 'Once daily (Morning empty stomach)',
    duration: '7 Days',
  },
];

export const PrescriptionScreen = () => {
  const navigation = useNavigation<PrescriptionScreenProp>();
  const route = useRoute<PrescriptionRouteProp>();
  const consultationId = route.params?.consultationId || 'demo-consultation-id';

  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      Alert.alert('Prescription Downloaded', 'Prescription PDF has been saved to your downloads folder.');
    }, 1000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'CoraCure Verified Prescription: Dr. Richard Parker • Prescription #RX-2024-001048. Access your full care record on CoraCure.',
        title: 'CoraCure Prescription #RX-2024-001048',
      });
    } catch {
      // ignore
    }
  };

  return (
    <Screen bottomInset contentStyle={s.container}>
      <AppHeader
        onBack={() => navigation.goBack()}
        right={<StatusPill label="Verified" tone="success" />}
      />

      <View style={s.headerWrap}>
        <Text style={s.pageTitle}>Prescription</Text>
        <Text style={s.pageSubtitle}>Official prescription from your consultation</Text>
      </View>

      {/* Doctor & Clinic Header Card */}
      <View style={s.card}>
        <View style={s.doctorHeaderRow}>
          <Image
            source={DrRichardImg}
            style={s.doctorAvatar}
            resizeMode="cover"
          />
          <View style={s.doctorInfo}>
            <Text style={s.doctorName}>Dr. Richard Parker</Text>
            <Text style={s.specialty}>Cardiologist & Orthopedic Consultant</Text>
            <Text style={s.regNo}>Reg No: KMC-54219 • 15 yrs experience</Text>
          </View>
        </View>

        <Divider />

        <View style={s.metaGrid}>
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>Date</Text>
            <Text style={s.metaVal}>18 May 2026</Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>Time</Text>
            <Text style={s.metaVal}>10:30 AM</Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>Prescription ID</Text>
            <Text style={s.metaValHighlight}>RX-2024-001048</Text>
          </View>
        </View>
      </View>

      {/* Patient Details Card */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>Patient Details</Text>
        <View style={s.patientGrid}>
          <View style={s.patientCol}>
            <Text style={s.patientName}>Alex Morgan</Text>
            <Text style={s.patientSub}>34 Years, Male • Bangalore, India</Text>
          </View>
          <View style={s.patientColRight}>
            <Text style={s.consultType}>Video Consultation</Text>
            <Text style={s.consultRef}>Ref: CC24-001048</Text>
          </View>
        </View>
      </View>

      {/* Prescribed Medicines Section */}
      <View style={s.section}>
        <Text style={s.sectionHeading}>Prescribed Medicines</Text>
        <View style={s.medsList}>
          {PRESCRIBED_MEDICINES.map((med, index) => (
            <View key={med.name} style={s.medCard}>
              <View style={s.medHeaderRow}>
                <View style={s.medBadgeNumber}>
                  <Text style={s.medBadgeNumText}>{index + 1}</Text>
                </View>
                <View style={s.medTitleWrap}>
                  <Text style={s.medName}>{med.name}</Text>
                  <Text style={s.medCategory}>{med.form} • {med.category}</Text>
                </View>
                <View style={s.durationPill}>
                  <Icon name="clock" size={12} color={colors.surfie} />
                  <Text style={s.durationText}>{med.duration}</Text>
                </View>
              </View>

              <View style={s.dosageBox}>
                <View style={s.dosageRow}>
                  <Icon name="prescription" size={14} color={colors.surfie} />
                  <Text style={s.dosageText}>{med.dosage}</Text>
                </View>
                <Text style={s.timingText}>🕒 {med.timing}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Tests & Advice Card */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>Tests & Advice</Text>
        <View style={s.adviceItem}>
          <Text style={s.adviceSubtitle}>Recommended Diagnostic Tests:</Text>
          <Text style={s.adviceDetail}>• CBC (Complete Blood Count)</Text>
          <Text style={s.adviceDetail}>• RBS (Random Blood Sugar)</Text>
        </View>

        <Divider />

        <View style={s.adviceItem}>
          <Text style={s.adviceSubtitle}>Diet & Lifestyle Guidelines:</Text>
          <Text style={s.adviceDetail}>• Stay well hydrated (2.5L daily)</Text>
          <Text style={s.adviceDetail}>• Avoid heavy lifting for 7 days</Text>
          <Text style={s.adviceDetail}>• Continue light stretching routine twice daily</Text>
        </View>
      </View>

      {/* Follow-up Callout */}
      <View style={s.followUpBox}>
        <Icon name="calendar" size={18} color={colors.surfie} />
        <View style={s.followUpTextWrap}>
          <Text style={s.followUpHeading}>Follow-up</Text>
          <Text style={s.followUpSub}>Follow-up within 7 days or earlier if symptoms persist or worsen.</Text>
        </View>
      </View>

      {/* Legal & Telehealth Disclaimer */}
      <View style={s.disclaimerCard}>
        <Icon name="shieldCheck" size={16} color={colors.surfie} />
        <Text style={s.disclaimerText}>
          This is a verified digital prescription generated under Telemedicine Practice Guidelines and does not require a physical signature.
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={s.actionsRow}>
        <Button
          label="Download PDF"
          variant="secondary"
          icon="download"
          onPress={handleDownloadPdf}
          loading={downloading}
          style={s.actionBtn}
        />
        <Button
          label="Share Prescription"
          icon="share"
          onPress={handleShare}
          style={s.actionBtn}
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
    marginBottom: spacing.md,
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
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.lg,
    ...shadow.card,
    marginBottom: spacing.lg,
  },
  doctorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  doctorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  specialty: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.surfie,
    fontWeight: '600',
    marginTop: 1,
  },
  regNo: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  metaCol: {
    gap: 2,
  },
  metaLabel: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
  },
  metaVal: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.ink,
  },
  metaValHighlight: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.surfie,
  },
  sectionLabel: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  patientGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  patientCol: {
    gap: 2,
  },
  patientName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  patientSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  patientColRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  consultType: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '600',
    color: colors.surfie,
  },
  consultRef: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  medsList: {
    gap: spacing.sm,
  },
  medCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    ...shadow.card,
  },
  medHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  medBadgeNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medBadgeNumText: {
    fontFamily: typography.heading.family,
    fontSize: 11,
    fontWeight: '700',
    color: colors.surfie,
  },
  medTitleWrap: {
    flex: 1,
  },
  medName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  medCategory: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface.mintSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  durationText: {
    fontFamily: typography.body.family,
    fontSize: 10,
    fontWeight: '700',
    color: colors.surfie,
  },
  dosageBox: {
    backgroundColor: colors.surface.page,
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: 4,
  },
  dosageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dosageText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.ink,
  },
  timingText: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
  },
  adviceItem: {
    gap: 4,
  },
  adviceSubtitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  adviceDetail: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    lineHeight: 16,
  },
  followUpBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface.mintSoft,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.selected,
    marginBottom: spacing.md,
  },
  followUpTextWrap: {
    flex: 1,
  },
  followUpHeading: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },
  followUpSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.ink,
    marginTop: 2,
    lineHeight: 16,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#F7FAF8',
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    marginBottom: spacing.xl,
  },
  disclaimerText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkFaint,
    lineHeight: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});

export default PrescriptionScreen;

