import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Image, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, Button, Divider, Icon } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import PatientImg from '../assets/patient-camera.jpg';
import type { RootStackParamList } from '../navigation/RootNavigator';

type PrescriptionScreenProp = NativeStackNavigationProp<RootStackParamList, 'Prescription'>;

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

  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      Alert.alert('Prescription Downloaded', 'Prescription PDF has been saved to your downloads folder.');
    }, 1000);
  };

  return (
    <Screen contentStyle={s.container}>
      <View style={s.topBar}>
        <View style={s.topBarSide} />
        <LogoWide width={120} height={30} />
        <View style={s.topBarSide}>
          <Pressable
            style={s.bell}
            onPress={() => navigation.navigate('Notifications')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Icon name="bell" size={20} color={colors.ink} />
            <View style={s.bellDot} />
          </Pressable>
        </View>
      </View>

      <View style={s.headerWrap}>
        <Text style={s.pageTitle} accessibilityRole="header">Prescription</Text>
        <Text style={s.pageSubtitle}>Official prescription from your consultation</Text>
      </View>

      {/* Doctor & Clinic Header Card */}
      <View style={s.card}>
        <View style={s.doctorHeaderRow}>
          <Image source={DrRichardImg} style={s.doctorAvatar} resizeMode="cover" />
          <View style={s.doctorInfo}>
            <Text style={s.doctorName} numberOfLines={1}>Dr. Richard Parker</Text>
            <Text style={s.specialty} numberOfLines={1}>Cardiologist & Orthopedic</Text>
            <Text style={s.experience} numberOfLines={1}>15 yrs experience</Text>
          </View>
        </View>

        <View style={s.metaRule} />

        <View style={s.metaRow}>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Date</Text>
            <Text style={s.metaVal} numberOfLines={1}>18 May 2026</Text>
          </View>
          <View style={s.metaDivider} />
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Time</Text>
            <Text style={s.metaVal} numberOfLines={1}>10:30 AM</Text>
          </View>
          <View style={s.metaDivider} />
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Prescription ID</Text>
            <Text style={s.metaValHighlight} numberOfLines={1}>RX-2024-001048</Text>
          </View>
        </View>
      </View>

      {/* Patient Details Card */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>Patient Details</Text>
        <View style={s.patientGrid}>
          <Image source={PatientImg} style={s.patientAvatar} resizeMode="cover" />
          <View style={s.patientCol}>
            <Text style={s.patientName}>Alex Morgan</Text>
            <Text style={s.patientSub}>34 Years, Male</Text>
          </View>
          <View style={s.patientColRight}>
            <Text style={s.consultType}>Video Consultation</Text>
            <Text style={s.consultRef}>Visit ID: CC24-001048</Text>
          </View>
        </View>
      </View>

      {/* Prescribed Medicines Section */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>Prescribed Medicines</Text>
        {PRESCRIBED_MEDICINES.map((med, index) => (
          <View key={med.name} style={s.medRow}>
            <View style={s.medTopRow}>
              <View style={s.medBadgeNumber}>
                <Text style={s.medBadgeNumText}>{index + 1}</Text>
              </View>
              <View style={s.medTitleWrap}>
                <Text style={s.medName}>{med.name}</Text>
                <Text style={s.medCategory}>{med.form} • {med.category}</Text>
              </View>
              <View style={s.durationBox}>
                <Text style={s.durationText}>{med.duration}</Text>
              </View>
            </View>

            <View style={s.dosageChips}>
              <View style={s.chip}>
                <Text style={s.chipText}>{med.dosage}</Text>
              </View>
              <View style={s.chip}>
                <Text style={s.chipText}>{med.timing}</Text>
              </View>
            </View>
          </View>
        ))}
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
      <View style={s.followUpCard}>
        <Icon name="calendar" size={18} color={colors.surfie} />
        <View style={s.followUpTextWrap}>
          <Text style={s.followUpHeading}>Follow-up</Text>
          <Text style={s.followUpSub}>Follow-up within 7 days or earlier if symptoms persist or worsen.</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={s.actionsRow}>
        <Button
          label="Download PDF"
          variant="secondary"
          icon="download"
          onPress={handleDownloadPdf}
          loading={downloading}
          style={s.actionBtnOutline}
        />
        <Pressable
          style={s.shareBtn}
          onPress={() => navigation.navigate('MainTabs')}
          accessibilityRole="button"
          accessibilityLabel="Done, return to home"
        >
          <Icon name="check" size={17} color={colors.white} />
          <Text style={s.shareText} numberOfLines={1}>Done</Text>
        </Pressable>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  topBarSide: {
    width: 40,
    alignItems: 'flex-end',
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfie,
    borderWidth: 1.5,
    borderColor: colors.white,
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
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  doctorAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  doctorInfo: {
    flex: 1,
    justifyContent: 'center',
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
  experience: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 3,
  },
  metaRule: {
    height: 1,
    backgroundColor: colors.surface.line,
    marginVertical: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaCell: {
    flex: 1,
    gap: 2,
  },
  metaDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.surface.line,
    marginHorizontal: spacing.sm,
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
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  patientCol: {
    flex: 1,
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
  medRow: {
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  medTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  medBadgeNumber: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medTitleWrap: {
    flex: 1,
  },
  medBadgeNumText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
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
  durationBox: {
    minWidth: 62,
    alignItems: 'center',
    backgroundColor: colors.surface.mintSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  durationText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },
  dosageChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginLeft: 28 + spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface.mintSoft,
    borderWidth: 1,
    borderColor: colors.surface.selected,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  chipText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '600',
    color: colors.surfie,
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
  followUpCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    ...shadow.card,
    marginBottom: spacing.lg,
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
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtnOutline: {
    flex: 1,
    borderColor: colors.surfie,
  },
  shareBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfie,
  },
  shareText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.white,
    flexShrink: 1,
  },
});

export default PrescriptionScreen;

