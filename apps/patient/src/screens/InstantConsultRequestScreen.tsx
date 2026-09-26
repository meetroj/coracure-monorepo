import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, Icon } from '@coracure/ui';
import FlowHeader from '../components/FlowHeader';
import { findDoctor } from '../data/doctors';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'InstantConsultRequest'>;
type Rt = RouteProp<RootStackParamList, 'InstantConsultRequest'>;

/** The doctor has this long to accept before the pool is asked instead. */
const RESPOND_SECONDS = 60;

export const InstantConsultRequestScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const doctor = findDoctor(route.params?.doctorId);

  const [left, setLeft] = useState(RESPOND_SECONDS);

  useEffect(() => {
    const id = setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const mmss = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  /** The request is only live while the doctor still has time to answer. */
  const waiting = left > 0;

  const steps = [
    { icon: 'send' as const, label: 'Requested', when: 'Just now', done: true },
    { icon: 'bell' as const, label: 'Notified', when: 'Just now', done: true },
    { icon: 'user' as const, label: 'Accepted', when: waiting ? 'Pending' : 'Reassigning', done: false },
  ];

  return (
    <Screen contentStyle={s.content}>
      <FlowHeader
        action="headset"
        dot={false}
        actionLabel="Contact support"
        onAction={() => navigation.navigate('HelpSupport')}
      />

      <Text style={s.title} accessibilityRole="header">Requesting your</Text>
      <View style={s.titleRow}>
        <Text style={s.titleAccent}>Instant Consult</Text>
        <Icon name="sparkles" size={22} color={colors.surfie} />
      </View>
      <Text style={s.lede}>
        We have notified the doctor. Please wait while they review your request.
      </Text>

      {/* Who was asked, and how long they have */}
      <View style={s.card}>
        <View style={s.docRow}>
          <View>
            <Image source={doctor.img} style={s.photo} resizeMode="cover" />
            <View style={s.onlineDot} />
          </View>

          <View style={s.docText}>
            <View style={s.requestedPill}>
              <Text style={s.requestedText}>Requested Doctor</Text>
            </View>
            <View style={s.nameRow}>
              <Text style={s.name}>{doctor.name}</Text>
              <Icon name="checkCircle" size={16} color={colors.surfie} />
            </View>
            <Text style={s.specialty}>{doctor.specialty}</Text>
            <Text style={s.meta}>
              {doctor.qualification.split(' (')[0]} • {doctor.years}+ years experience
            </Text>

            <View style={s.scoreRow}>
              <Icon name="shieldCheck" size={14} color={colors.surfie} />
              <Text style={s.scoreText}>{doctor.satisfaction}% Rating</Text>
              <View style={s.scoreRule} />
              <Icon name="star" size={14} color={colors.surfie} />
              <Text style={s.scoreText}>{doctor.rating} ({doctor.reviews})</Text>
            </View>
          </View>
        </View>

        <View style={s.waitBox}>
          <View style={s.waitIcon}>
            <Icon name="clock" size={20} color={colors.surfie} />
          </View>
          <View style={s.waitText}>
            <Text style={s.waitTitle}>{waiting ? 'Waiting for acceptance' : 'Finding another doctor'}</Text>
            <Text style={s.waitSub}>
              {waiting
                ? `Doctor has up to ${RESPOND_SECONDS} seconds to respond`
                : 'Connecting you to the next available doctor'}
            </Text>
          </View>
          <Text style={s.waitCount}>{mmss}</Text>
        </View>
      </View>

      {/* Where the request has got to */}
      <View style={s.card}>
        <View style={s.stepRow}>
          {steps.map((step, i) => (
            <React.Fragment key={step.label}>
              {i > 0 && <View style={[s.stepLine, steps[i - 1].done && step.done && s.stepLineOn]} />}
              <View style={s.step}>
                <View style={[s.stepIcon, step.done && s.stepIconOn]}>
                  <Icon name={step.icon} size={18} color={step.done ? colors.surfie : colors.inkFaint} />
                </View>
                <Text style={s.stepLabel} numberOfLines={1}>{step.label}</Text>
                <Text style={[s.stepWhen, step.done && s.stepWhenOn]}>{step.when}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      <View style={s.reassureCard}>
        <View style={s.reassureIcon}>
          <Icon name="swap" size={20} color={colors.surfie} />
        </View>
        <View style={s.reassureText}>
          <Text style={s.reassureTitle}>Do not worry, we have got you.</Text>
          <Text style={s.reassureSub}>
            If {doctor.name} declines or does not respond in time, we will connect you to the next
            available doctor.
          </Text>
        </View>
      </View>

      <View style={s.payNote}>
        <View style={s.payIcon}>
          <Icon name="lock" size={16} color={colors.surfie} />
        </View>
        <Text style={s.payText}>Payment will start only after the doctor accepts.</Text>
      </View>

      <Pressable
        style={s.cancelBtn}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Cancel request"
      >
        <Icon name="close" size={18} color={colors.danger} />
        <Text style={s.cancelText}>Cancel Request</Text>
      </Pressable>
    </Screen>
  );
};

const s = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxxl,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleAccent: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxxl,
    fontWeight: '700',
    color: colors.surfie,
  },
  lede: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    lineHeight: 20,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    marginTop: spacing.lg,
    ...shadow.card,
  },
  docRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  photo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surface.mintSoft,
  },
  onlineDot: {
    position: 'absolute',
    right: 3,
    bottom: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surfie,
    borderWidth: 2,
    borderColor: colors.white,
  },
  docText: { flex: 1, gap: 2 },
  requestedPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    marginBottom: 4,
  },
  requestedText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '600',
    color: colors.surfie,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.ink,
    flexShrink: 1,
  },
  specialty: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '600',
    color: colors.surfie,
  },
  meta: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
  },
  scoreText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.ink,
  },
  scoreRule: {
    width: 1,
    height: 14,
    backgroundColor: colors.surface.line,
    marginHorizontal: 4,
  },

  waitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  waitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitText: { flex: 1 },
  waitTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  waitSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginTop: 1,
  },
  waitCount: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '700',
    color: colors.surfie,
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  step: { flex: 1, alignItems: 'center', gap: 3 },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.page,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  stepIconOn: { backgroundColor: colors.surface.mintSoft },
  stepLine: {
    height: 2,
    flex: 1,
    backgroundColor: colors.surface.line,
    marginTop: 21,
  },
  stepLineOn: { backgroundColor: colors.surfie },
  stepLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  stepWhen: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  stepWhenOn: { color: colors.surfie },

  reassureCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface.selected,
    borderRadius: radius.card,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  reassureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reassureText: { flex: 1 },
  reassureTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  reassureSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 3,
    lineHeight: 19,
  },

  payNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.page,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  payIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },

  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 54,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  cancelText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.danger,
  },
});

export default InstantConsultRequestScreen;
