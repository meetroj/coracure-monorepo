import { typeStyles } from '../../../../../libs/typography/src';
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import { Button, Avatar } from '../../components/ui';
import { instantRequest, modeLabel } from '../../data/doctor';

const MINT = '#E8F8F2';
const AMBER = '#E0972B';

/**
 * Static stand-in for a spinner: a ring of dots with graded opacity reads as
 * "working" without animation, which keeps the screen calm and avoids a
 * moving element next to a payment the doctor cannot influence.
 */
const PendingDots = ({ size = 22, color = colors.paris }: { size?: number; color?: string }) => {
  const c = size / 2;
  const r = size / 2 - 2.5;
  return (
    <Svg width={size} height={size}>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        return (
          <Circle
            key={i}
            cx={c + r * Math.cos(a)}
            cy={c + r * Math.sin(a)}
            r={1.7}
            fill={color}
            opacity={0.25 + (i / 8) * 0.75}
          />
        );
      })}
    </Svg>
  );
};

/**
 * Shown immediately after the doctor accepts an instant request.
 *
 * The slot is reserved but the consultation is NOT open: payment and consent
 * are still outstanding, so "Join consultation" stays disabled. Nothing here
 * implies the doctor may start early.
 */
export const InstantAcceptedScreen = ({
  onReturn,
  onBack,
  onJoin,
}: {
  onReturn: () => void;
  onBack: () => void;
  onJoin?: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const req = instantRequest;

  const meta = [
    { key: 'mode', icon: 'video' as const, label: modeLabel[req.mode] },
    { key: 'lang', icon: 'language' as const, label: req.languages },
    { key: 'dur', icon: 'clock' as const, label: `${req.approxMinutes} min` },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={{ paddingTop: insets.top }}>
        <View style={s.appBar}>
          <Pressable testID="back" onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
            <Icon name="chevronLeft" size={24} color={colors.ink} />
          </Pressable>
          <LogoWide width={124} height={31} />
          <View style={s.statusChip}>
            <View style={s.liveDot} />
            <Text style={[typeStyles.body, s.statusText]}>Reserved</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* success state */}
        <View style={s.successWrap}>
          <View style={s.successHalo}>
            <View style={s.successDisc}>
              <Icon name="checkCircle" size={30} color={colors.white} />
            </View>
          </View>
          <Text style={[typeStyles.body, s.title]}>Request accepted</Text>
          <Text style={[typeStyles.body, s.subtitle]}>Your availability has been reserved for this patient.</Text>
        </View>

        {/* compact patient summary */}
        <View style={s.summaryCard}>
          <View style={s.patientRow}>
            <Avatar initials={req.initials} size={58} />
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.name]}>{req.name}</Text>
              <Text style={[typeStyles.body, s.sub]}>
                {req.gender}  •  {req.age} years
              </Text>
              <View style={s.specRow}>
                <Icon name="stethoscope" size={15} color={colors.surfie} />
                <View style={s.specChip}>
                  <Text style={[typeStyles.body, s.specText]}>{req.speciality}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={s.summaryDivider} />

          <Text style={[typeStyles.body, s.concernLabel]}>Presenting concern</Text>
          <Text style={[typeStyles.body, s.concern]}>{req.concern}</Text>

          <View style={s.summaryDivider} />

          <View style={s.metaRow}>
            {meta.map((m, i) => (
              <React.Fragment key={m.key}>
                {i > 0 && <View style={s.metaDivider} />}
                <View style={s.metaItem}>
                  <View style={s.metaIcon}>
                    <Icon name={m.icon} size={16} color={colors.surfie} />
                  </View>
                  <Text style={[typeStyles.body, s.metaLabel]}>{m.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* live status of the patient's remaining steps */}
        <View style={s.waitCard}>
          <Text style={[typeStyles.body, s.waitTitle]}>Waiting for patient</Text>
          <Text style={[typeStyles.body, s.waitSub]}>The patient is completing the required steps to join.</Text>

          <View style={s.waitDivider} />

          <View style={s.waitRow}>
            <PendingDots />
            <Text style={[typeStyles.body, s.waitLabel]}>Payment</Text>
            <View style={[s.waitPill, { backgroundColor: '#FCEFD8' }]}>
              <Text style={[typeStyles.body, [s.waitPillText, { color: AMBER }]]}>In progress</Text>
            </View>
          </View>

          <View style={s.waitDivider} />

          <View style={s.waitRow}>
            <View style={s.emptyRing} />
            <Text style={[typeStyles.body, s.waitLabel]}>Teleconsultation consent</Text>
            <View style={[s.waitPill, { backgroundColor: '#EFF3F1' }]}>
              <Text style={[typeStyles.body, [s.waitPillText, { color: colors.inkMuted }]]}>Awaiting confirmation</Text>
            </View>
          </View>
        </View>

        <View style={s.note}>
          <Icon name="info" size={19} color={colors.surfie} />
          <Text style={[typeStyles.body, s.noteText]}>
            The consultation will open once payment and consent are verified.
          </Text>
        </View>
      </ScrollView>

      <View style={[s.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        {/* stays disabled until both steps clear — never start before consent */}
        <Button testID="join" label="Join consultation" onPress={onJoin} disabled />
        <Pressable testID="return" onPress={onReturn} hitSlop={8} style={s.returnBtn}>
          <Text style={[typeStyles.body, s.returnText]}>Return to dashboard</Text>
        </Pressable>
        <Text style={[typeStyles.body, s.footNote]}>
          You will not receive another instant request while this patient completes the required
          steps.
        </Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: colors.white },

  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.paris },
  statusText: { ...typeStyles.status, color: colors.surfie },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },

  successWrap: { alignItems: 'center', marginTop: spacing.lg },
  successHalo: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successDisc: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typeStyles.pageTitle, color: colors.ink, marginTop: spacing.md },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xs },

  summaryCard: {
    backgroundColor: MINT,
    borderRadius: radius.card,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { ...typeStyles.name, color: colors.ink },
  sub: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 1 },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  specChip: {
    backgroundColor: '#D6F0E4',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  specText: { ...typeStyles.body, color: colors.surfie },
  summaryDivider: { height: 1, backgroundColor: '#CFE9DC', marginVertical: spacing.md },
  concernLabel: { ...typeStyles.label, color: colors.inkMuted },
  concern: { ...typeStyles.body, color: colors.ink, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaDivider: { width: 1, height: 24, backgroundColor: '#CFE9DC', marginHorizontal: spacing.sm },
  metaLabel: { ...typeStyles.label, flex: 1, color: colors.ink },

  waitCard: {
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.card,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  waitTitle: { ...typeStyles.cardTitle, color: colors.ink },
  waitSub: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 1 },
  waitDivider: { height: 1, backgroundColor: colors.surface.line, marginVertical: spacing.md },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  waitLabel: { ...typeStyles.label, flex: 1, color: colors.ink },
  waitPill: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  waitPillText: { ...typeStyles.status },
  emptyRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.surface.inputBorder,
  },

  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: MINT,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  noteText: { ...typeStyles.bodySmall, flex: 1, color: colors.ink },

  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  returnBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  returnText: { ...typeStyles.body, color: colors.surfie },
  footNote: { ...typeStyles.helper, color: colors.inkMuted, textAlign: 'center' },
});

export default InstantAcceptedScreen;
