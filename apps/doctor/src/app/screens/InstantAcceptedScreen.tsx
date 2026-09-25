import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, Button, Avatar } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { instantRequest, modeLabel } from '../../data/doctor';

/**
 * Static stand-in for a spinner: a ring of dots with graded opacity reads as
 * "working" without animation, which keeps the screen calm next to a payment
 * the doctor cannot influence.
 */
const PendingDots = ({ size = 22, color = colors.paris }: { size?: number; color?: string }) => {
  const c = size / 2;
  const r = size / 2 - 2.5;
  return (
    <Svg width={size} height={size}>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        return <Circle key={i} cx={c + r * Math.cos(a)} cy={c + r * Math.sin(a)} r={1.7} fill={color} opacity={0.25 + (i / 8) * 0.75} />;
      })}
    </Svg>
  );
};

/**
 * Shown immediately after the doctor accepts an instant request.
 *
 * The slot is reserved but the consultation is NOT open: payment and consent
 * are still outstanding, so "Join consultation" stays disabled and says why.
 * Nothing here implies the doctor may start early.
 */
export const InstantAcceptedScreen = ({ onReturn, onBack }: { onReturn: () => void; onBack: () => void }) => {
  const req = instantRequest;
  const meta = [
    { key: 'mode', icon: 'video' as const, label: modeLabel[req.mode] },
    { key: 'lang', icon: 'language' as const, label: req.languages },
    { key: 'dur', icon: 'clock' as const, label: `${req.approxMinutes} min` },
  ];

  return (
    <Screen
      testID="instant-accepted"
      background={colors.white}
      header={
        <ScreenHeader
          onBack={onBack}
          right={
            <View style={s.statusChip}>
              <View style={s.liveDot} />
              <Text style={s.statusText}>Reserved</Text>
            </View>
          }
        />
      }
      footer={
        <View style={s.actions}>
          {/* stays disabled until both steps clear — never start before consent */}
          <Button
            testID="join"
            label="Join consultation"
            disabled
            accessibilityHint="Opens once the patient completes payment and consent"
          />
          <Pressable testID="return" onPress={onReturn} hitSlop={8} style={s.returnBtn} accessibilityRole="button">
            <Text style={s.returnText}>Return to dashboard</Text>
          </Pressable>
          <Text style={s.footNote}>You will not receive another instant request while this patient completes the required steps.</Text>
        </View>
      }
    >
      <View style={s.body}>
        <View style={s.successWrap}>
          <View style={s.successHalo}>
            <View style={s.successDisc}>
              <Icon name="checkCircle" size={30} color={colors.white} />
            </View>
          </View>
          <Text style={s.title} accessibilityRole="header">
            Request accepted
          </Text>
          <Text style={s.subtitle}>Your availability has been reserved for this patient.</Text>
        </View>

        <View style={s.summaryCard}>
          <View style={s.patientRow}>
            <Avatar initials={req.initials} size={54} />
            <View style={s.flex}>
              <Text style={s.name}>{req.name}</Text>
              <Text style={s.sub}>
                {req.gender} • {req.age} years
              </Text>
              <View style={s.specRow}>
                <Icon name="stethoscope" size={15} color={colors.surfie} />
                <View style={s.specChip}>
                  <Text style={s.specText}>{req.speciality}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={s.summaryDivider} />
          <Text style={s.concernLabel}>Presenting concern</Text>
          <Text style={s.concern}>{req.concern}</Text>
          <View style={s.summaryDivider} />

          <View style={s.metaRow}>
            {meta.map((m, i) => (
              <React.Fragment key={m.key}>
                {i > 0 && <View style={s.metaDivider} />}
                <View style={s.metaItem}>
                  <View style={s.metaIcon}>
                    <Icon name={m.icon} size={16} color={colors.surfie} />
                  </View>
                  <Text style={s.metaLabel}>{m.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={s.waitCard}>
          <Text style={s.waitTitle}>Waiting for patient</Text>
          <Text style={s.waitSub}>The patient is completing the required steps to join.</Text>
          <View style={s.waitDivider} />
          <View style={s.waitRow}>
            <PendingDots />
            <Text style={s.waitLabel}>Payment</Text>
            <View style={[s.waitPill, { backgroundColor: colors.warnSoft }]}>
              <Text style={[s.waitPillText, { color: colors.warn }]}>In progress</Text>
            </View>
          </View>
          <View style={s.waitDivider} />
          <View style={s.waitRow}>
            <View style={s.emptyRing} />
            <Text style={s.waitLabel}>Teleconsultation consent</Text>
            <View style={[s.waitPill, { backgroundColor: '#EFF3F1' }]}>
              <Text style={[s.waitPillText, { color: colors.inkMuted }]}>Awaiting confirmation</Text>
            </View>
          </View>
        </View>

        <View style={s.note}>
          <Icon name="info" size={18} color={colors.surfie} />
          <Text style={s.noteText}>The consultation will open once payment and consent are verified.</Text>
        </View>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  body: { paddingHorizontal: spacing.lg },

  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.paris },
  statusText: { ...typeStyles.status, color: colors.surfie },

  successWrap: { alignItems: 'center', marginTop: spacing.sm },
  successHalo: { width: 74, height: 74, borderRadius: 37, backgroundColor: colors.surface.mint, alignItems: 'center', justifyContent: 'center' },
  successDisc: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surfie, alignItems: 'center', justifyContent: 'center' },
  title: { ...typeStyles.pageTitle, color: colors.ink, marginTop: spacing.md, textAlign: 'center' },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xs },

  summaryCard: { backgroundColor: colors.surface.mint, borderRadius: radius.card, padding: spacing.md, marginTop: spacing.lg },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { ...typeStyles.name, color: colors.ink },
  sub: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 1 },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  specChip: { backgroundColor: '#D6F0E4', borderRadius: radius.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: 3 },
  specText: { ...typeStyles.caption, color: colors.surfie },
  summaryDivider: { height: 1, backgroundColor: '#CFE9DC', marginVertical: spacing.md },
  concernLabel: { ...typeStyles.caption, color: colors.inkMuted },
  concern: { ...typeStyles.body, color: colors.ink, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  metaDivider: { width: 1, height: 24, backgroundColor: '#CFE9DC', marginHorizontal: spacing.xs },
  metaLabel: { ...typeStyles.caption, flex: 1, color: colors.ink },

  waitCard: { borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.card, padding: spacing.md, marginTop: spacing.md },
  waitTitle: { ...typeStyles.cardTitle, color: colors.ink },
  waitSub: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 1 },
  waitDivider: { height: 1, backgroundColor: colors.surface.line, marginVertical: spacing.md },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  waitLabel: { ...typeStyles.label, flex: 1, color: colors.ink },
  waitPill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: 5, flexShrink: 1 },
  waitPillText: { ...typeStyles.status },
  emptyRing: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.surface.inputBorder },

  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.mint,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  noteText: { ...typeStyles.bodySmall, flex: 1, color: colors.ink },

  actions: { gap: spacing.xs },
  returnBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  returnText: { ...typeStyles.button, color: colors.surfie },
  footNote: { ...typeStyles.helper, color: colors.inkMuted, textAlign: 'center' },
});

export default InstantAcceptedScreen;
