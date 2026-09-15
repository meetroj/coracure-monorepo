import { typeStyles } from '../../../../../libs/typography/src';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import { Button, Avatar } from '../../components/ui';
import { instantRequest, INSTANT_STEPS, modeLabel } from '../../data/doctor';

/** Amber is used for the countdown only — never as a brand accent. */
const AMBER = '#E0972B';
const AMBER_TRACK = '#F3DCB4';

const RING = 27;
const STROKE = 4;
const CIRC = 2 * Math.PI * RING;

const CountdownRing = ({ left, total }: { left: number; total: number }) => {
  const size = RING * 2 + STROKE * 2;
  const progress = Math.max(0, Math.min(1, left / total));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={RING} stroke={AMBER_TRACK} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={RING}
          stroke={AMBER}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={s.ringLabel}>
        <Text style={[typeStyles.body, s.ringValue]}>{left}</Text>
      </View>
    </View>
  );
};

/**
 * Full-page instant consultation request.
 *
 * Deliberately a dedicated page, not a sheet or modal over the dashboard: the
 * doctor has one decision to make against a clock, and nothing behind it
 * should compete for attention. It also carries no bottom navigation, so the
 * only ways out are Accept, Decline, or the timer expiring.
 */
export const InstantRequestScreen = ({
  onAccept,
  onDecline,
  onBack,
  onHelp,
}: {
  onAccept: () => void;
  onDecline: () => void;
  onBack: () => void;
  onHelp?: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const req = instantRequest;
  const [left, setLeft] = useState(req.respondWithin);

  useEffect(() => {
    if (left <= 0) {
      // unanswered requests reroute on their own
      onDecline();
      return;
    }
    const id = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [left, onDecline]);

  const meta = useMemo(
    () => [
      { key: 'mode', icon: 'video' as const, label: modeLabel[req.mode] },
      { key: 'lang', icon: 'language' as const, label: req.languages },
      { key: 'dur', icon: 'clock' as const, label: `Approx. ${req.approxMinutes} min` },
    ],
    [req]
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={{ paddingTop: insets.top }}>
        {/* top app bar */}
        <View style={s.appBar}>
          <Pressable testID="back" onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
            <Icon name="chevronLeft" size={24} color={colors.ink} />
          </Pressable>
          <LogoWide width={124} height={31} />
          <Pressable onPress={onHelp} hitSlop={10} accessibilityRole="button" accessibilityLabel="Help">
            <Icon name="info" size={22} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      {/* slim live-status row */}
      <View style={s.statusRow}>
        <View style={s.statusLeft}>
          <View style={s.liveDot} />
          <Text style={[typeStyles.body, s.statusOn]}>Available Now</Text>
        </View>
        <View style={s.statusDivider} />
        <Text style={[typeStyles.body, s.statusMuted]}>Request Pending</Text>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typeStyles.body, s.title]}>Instant consultation request</Text>
        <Text style={[typeStyles.body, s.helper]}>Respond before this request moves to another doctor.</Text>

        {/* compact urgency strip */}
        <View style={s.urgency}>
          <CountdownRing left={left} total={req.respondWithin} />
          <Text style={[typeStyles.body, s.secondsLeft]}>seconds left</Text>
          <View style={s.urgencyDivider} />
          <Icon name="inPerson" size={19} color={colors.inkMuted} />
          <Text style={[typeStyles.body, s.waiting]}>Patient is waiting</Text>
        </View>

        {/* patient request card */}
        <View style={s.card}>
          <View style={s.patientRow}>
            <Avatar initials={req.initials} size={62} />
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.name]}>{req.name}</Text>
              <Text style={[typeStyles.body, s.sub]}>
                {req.gender}  •  {req.age} years
              </Text>
              <View style={s.specRow}>
                <Icon name="stethoscope" size={15} color={colors.surfie} />
                <Text style={[typeStyles.body, s.spec]}>{req.speciality}</Text>
              </View>
            </View>
          </View>

          <View style={s.concernBox}>
            <View style={s.concernIcon}>
              <Icon name="document" size={19} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.concern]}>{req.concern}</Text>
              <Text style={[typeStyles.body, s.concernLabel]}>Patient reported</Text>
            </View>
          </View>

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

        {/* exclusivity note */}
        <View style={s.shieldNote}>
          <Icon name="shieldCheck" size={19} color={colors.surfie} />
          <Text style={[typeStyles.body, s.shieldText]}>
            No other instant request will be assigned while this request is active.
          </Text>
        </View>

        {/* compact three-step line */}
        <Text style={[typeStyles.body, s.howTitle]}>How it works</Text>
        <View style={s.steps}>
          {INSTANT_STEPS.map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <View style={s.stepLine} />}
              <View style={s.step}>
                <View style={s.stepBadge}>
                  <Text style={[typeStyles.body, s.stepNum]}>{i + 1}</Text>
                </View>
                <Text style={[typeStyles.body, s.stepLabel]}>{label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>

      {/* actions pinned low, clear of the gesture bar */}
      <View style={[s.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button testID="accept" label="Accept request" onPress={onAccept} />
        <Button testID="decline" label="Decline" variant="secondary" onPress={onDecline} />
        <Text style={[typeStyles.body, s.footNote]}>
          Declined or unanswered requests automatically move to another available doctor.
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

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.paris },
  statusOn: { ...typeStyles.body, color: colors.surfie },
  statusDivider: { width: 1, height: 18, backgroundColor: colors.surface.line },
  statusMuted: { ...typeStyles.body, flex: 1, textAlign: 'right', color: colors.inkFaint },

  scroll: { paddingHorizontal: spacing.lg },
  title: { ...typeStyles.pageTitle, color: colors.ink, textAlign: 'center', marginTop: spacing.md },
  helper: { ...typeStyles.helper, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },

  urgency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FCF3E2',
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  ringLabel: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringValue: { ...typeStyles.metricSmall, color: AMBER },
  secondsLeft: { ...typeStyles.body, color: AMBER },
  urgencyDivider: { width: 1, height: 26, backgroundColor: AMBER_TRACK, marginHorizontal: spacing.sm },
  waiting: { ...typeStyles.body, color: colors.inkMuted },

  card: {
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.card,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { ...typeStyles.name, color: colors.ink },
  sub: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 1 },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  spec: { ...typeStyles.body, color: colors.ink },

  concernBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#E8F8F2',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  concernIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  concern: { ...typeStyles.body, color: colors.ink },
  concernLabel: { ...typeStyles.label, color: colors.inkMuted },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E8F8F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaDivider: { width: 1, height: 24, backgroundColor: colors.surface.line, marginHorizontal: spacing.sm },
  metaLabel: { ...typeStyles.label, flex: 1, color: colors.ink },

  shieldNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#E8F8F2',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  shieldText: { ...typeStyles.body, flex: 1, color: colors.ink },

  howTitle: { ...typeStyles.cardTitle, color: colors.ink, marginTop: spacing.lg, marginBottom: spacing.sm },
  steps: { flexDirection: 'row', alignItems: 'flex-start' },
  step: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E8F8F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { ...typeStyles.number, color: colors.surfie },
  stepLabel: { ...typeStyles.label, flex: 1, color: colors.inkMuted },
  stepLine: { width: 12, height: 1, backgroundColor: colors.surface.line, marginTop: 13 },

  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  footNote: { ...typeStyles.helper, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xs },
});

export default InstantRequestScreen;
