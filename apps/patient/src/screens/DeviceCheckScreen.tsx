import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon, type IconName } from '@coracure/ui';
import LogoMark from '../assets/brand/logo-mark.svg';
import PatientCameraImg from '../assets/patient-camera.jpg';
import { ScreenBackground } from '../components/ScreenBackground';
import type { RootStackParamList } from '../navigation/RootNavigator';

/**
 * Pre-call check (P-24).
 *
 * Every readiness row lives inside the camera card so the screen reads as one
 * device, not four. Nothing here blocks joining — a red row is information, and
 * the patient still decides.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'DeviceCheck'>;

const CHECKS: { icon: IconName; title: string; body: string; state: string }[] = [
  { icon: 'mic', title: 'Microphone', body: 'Voice will be heard clearly', state: 'Working' },
  { icon: 'phone', title: 'Speaker', body: 'Audio will play clearly', state: 'Working' },
  { icon: 'globe', title: 'Internet Connection', body: 'Stable and strong', state: 'Strong' },
];

const TIPS: { icon: IconName; text: string }[] = [
  { icon: 'camera', text: 'Check if camera or microphone access is enabled.' },
  { icon: 'globe', text: 'For better quality, use a stable Wi-Fi connection.' },
  { icon: 'phone', text: 'Close other apps that might be using your camera or mic.' },
];

export const DeviceCheckScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const consultationId = route.params?.consultationId ?? 'cons-001';

  const [helpOpen, setHelpOpen] = useState(true);

  return (
    <View style={s.container}>

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenBackground name="joinCall" scrolls />
        {/* header: back · centred logo · help */}
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} style={s.roundBtn} hitSlop={10} accessibilityLabel="Back">
            <Icon name="arrowLeft" size={19} color={colors.ink} />
          </Pressable>
          <View style={s.brandRow}>
            <LogoMark width={30} height={30} />
            <Text style={s.brandName}>CoraCure</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('HelpSupport')}
            style={s.roundBtn}
            hitSlop={10}
            accessibilityLabel="Help"
          >
            <Icon name="headset" size={18} color={colors.ink} />
          </Pressable>
        </View>

        <View style={s.idPill}>
          <Icon name="idCard" size={13} color={colors.surfie} />
          <Text style={s.idPillText}>Patient ID CC{consultationId.slice(-6).toUpperCase()}</Text>
        </View>

        <Text style={s.title} accessibilityRole="header">
          Let’s make sure{'\n'}
          <Text style={s.titleAccent}>everything works well</Text>
        </Text>

        {/* --------------------------- camera card --------------------------- */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Your Camera</Text>
          <View style={s.looksGood}>
            <Icon name="video" size={17} color={colors.surfie} />
            <Text style={s.looksGoodText}>Looks good!</Text>
          </View>

          <View style={s.preview}>
            <Image source={PatientCameraImg} style={s.previewImg} resizeMode="cover" />
            <Pressable style={s.flipBtn} accessibilityRole="button" accessibilityLabel="Switch camera">
              <Icon name="refresh" size={19} color={colors.ink} />
            </Pressable>
          </View>

          {CHECKS.map((c) => (
            <View key={c.title} style={s.checkRow}>
              <View style={s.checkIcon}>
                <Icon name={c.icon} size={18} color={colors.surfie} />
              </View>
              <View style={s.flex}>
                <Text style={s.checkTitle}>{c.title}</Text>
                <Text style={s.checkBody}>{c.body}</Text>
              </View>
              <Text style={s.checkState}>{c.state}</Text>
              <Icon name="checkCircle" size={19} color={colors.surfie} />
            </View>
          ))}
        </View>

        {/* ---------------------------- test audio ---------------------------- */}
        <View style={s.rowCard}>
          <View style={s.rowIcon}>
            <Icon name="headset" size={22} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.rowTitle}>Test your audio</Text>
            <Text style={s.rowBody}>Tap to play a test sound and make sure you can hear it.</Text>
          </View>
          <Pressable style={s.capsule} accessibilityRole="button" accessibilityLabel="Test audio">
            <Text style={s.capsuleText}>Test Audio</Text>
            <Icon name="video" size={14} color={colors.surfie} filled />
          </Pressable>
        </View>

        {/* ------------------------ documents and intake ---------------------- */}
        <Pressable
          style={s.rowCard}
          onPress={() => navigation.navigate('Reports')}
          accessibilityRole="button"
          accessibilityLabel="Upload documents"
        >
          <View style={s.rowIcon}>
            <Icon name="upload" size={21} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.rowTitle}>Upload documents</Text>
            <Text style={s.rowBody}>Add reports your professional should see before the call.</Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.surfie} />
        </Pressable>

        <Pressable
          style={s.rowCard}
          onPress={() => navigation.navigate('BookingFlow', { serviceId: 'intake' })}
          accessibilityRole="button"
          accessibilityLabel="Pre-consultation details"
        >
          <View style={s.rowIcon}>
            <Icon name="clipboard" size={21} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.rowTitle}>Pre-consultation details</Text>
            <Text style={s.rowBody}>Answer a few questions so the session starts with context.</Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.surfie} />
        </Pressable>

        {/* ------------------------------ need help --------------------------- */}
        <View style={s.card}>
          <Pressable
            style={s.helpHead}
            onPress={() => setHelpOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityState={{ expanded: helpOpen }}
          >
            <Text style={s.cardTitle}>Need help?</Text>
            <Icon name={helpOpen ? 'chevronUp' : 'chevronDown'} size={18} color={colors.ink} />
          </Pressable>

          {helpOpen &&
            TIPS.map((t, i) => (
              <View key={t.text} style={[s.tipRow, i === TIPS.length - 1 && s.tipRowLast]}>
                <View style={s.tipIcon}>
                  <Icon name={t.icon} size={16} color={colors.surfie} />
                </View>
                <Text style={s.tipText}>{t.text}</Text>
              </View>
            ))}
        </View>

        {/* ------------------------------ join -------------------------------- */}
        <Pressable
          style={({ pressed }) => [s.joinBtn, pressed && s.pressed]}
          onPress={() => navigation.navigate('VideoConsultation', { consultationId })}
          accessibilityRole="button"
          accessibilityLabel="Join consultation"
        >
          <Icon name="video" size={21} color={colors.white} />
          <Text style={s.joinText}>Join Consultation</Text>
        </Pressable>

        <View style={s.secureRow}>
          <Icon name="lock" size={14} color={colors.surfie} />
          <Text style={s.secureText}>Your call is secure and encrypted</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.page },
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandName: {
    fontFamily: typography.heading.family,
    fontSize: 19,
    fontWeight: '800',
    color: colors.surfie,
  },

  idPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.successSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  idPillText: {
    fontFamily: typography.body.family,
    fontSize: 11,
    fontWeight: '700',
    color: colors.surfie,
  },

  title: {
    fontFamily: typography.heading.family,
    fontSize: 27,
    lineHeight: 35,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.5,
    maxWidth: '78%',
    marginBottom: spacing.lg,
  },
  titleAccent: { color: colors.surfie },

  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: typography.heading.family,
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  looksGood: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
  looksGoodText: {
    fontFamily: typography.body.family,
    fontSize: 13,
    fontWeight: '700',
    color: colors.surfie,
  },

  preview: {
    height: 210,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: '#EEF2F1',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  previewImg: { width: '100%', height: 210 },
  flipBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 11,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    marginTop: spacing.sm,
  },
  checkIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTitle: {
    fontFamily: typography.heading.family,
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  checkBody: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 1,
  },
  checkState: {
    fontFamily: typography.body.family,
    fontSize: 13,
    fontWeight: '700',
    color: colors.surfie,
  },

  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rowIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: typography.heading.family,
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  rowBody: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.surfie,
  },
  capsuleText: {
    fontFamily: typography.body.family,
    fontSize: 13,
    fontWeight: '700',
    color: colors.surfie,
  },

  helpHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  tipRowLast: { borderBottomWidth: 0, paddingBottom: 2 },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 17,
  },

  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: colors.surfie,
    marginTop: spacing.xs,
  },
  joinText: {
    fontFamily: typography.heading.family,
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: spacing.md,
  },
  secureText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.inkMuted,
  },
});

export default DeviceCheckScreen;
