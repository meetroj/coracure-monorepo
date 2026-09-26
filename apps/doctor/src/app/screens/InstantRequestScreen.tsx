import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, Button, Avatar } from '../../components/ui';
import { ScreenHeader, HeaderAction } from '../../components/ScreenHeader';
import { BottomSheet } from '../../components/BottomSheet';
import { instantRequest, INSTANT_STEPS, modeLabel } from '../../data/doctor';

/** Amber is used for the countdown only — never as a brand accent. */
const AMBER = colors.warn;
const AMBER_TRACK = '#F3DCB4';

const RING = 27;
const STROKE = 4;
const CIRC = 2 * Math.PI * RING;

const CountdownRing = ({ left, total }: { left: number; total: number }) => {
  const size = RING * 2 + STROKE * 2;
  const progress = Math.max(0, Math.min(1, left / total));
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`${left} seconds left`}>
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
        <Text style={s.ringValue}>{left}</Text>
      </View>
    </View>
  );
};

/**
 * Full-page instant consultation request.
 *
 * A dedicated page, not a sheet over the dashboard: the doctor has one
 * decision to make against a clock, and nothing behind it should compete for
 * attention. Leaving with Back keeps the request pending; an unanswered
 * request moves to another doctor when the clock runs out.
 */
export const InstantRequestScreen = ({
  onAccept,
  onDecline,
  onExpire,
  onBack,
}: {
  onAccept: () => void;
  onDecline: () => void;
  /** The window closed without an answer. */
  onExpire: () => void;
  onBack: () => void;
}) => {
  const req = instantRequest;
  const [left, setLeft] = useState(req.respondWithin);
  const [info, setInfo] = useState(false);
  const answered = useRef(false);

  useEffect(() => {
    if (left <= 0) {
      if (!answered.current) {
        answered.current = true;
        onExpire();
      }
      return;
    }
    const id = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [left, onExpire]);

  // one answer per request — a second tap or the clock cannot answer again
  const answer = (fn: () => void) => () => {
    if (answered.current) return;
    answered.current = true;
    fn();
  };

  const meta = useMemo(
    () => [
      { key: 'mode', icon: 'video' as const, label: modeLabel[req.mode] },
      { key: 'lang', icon: 'language' as const, label: req.languages },
      { key: 'dur', icon: 'clock' as const, label: `Approx. ${req.approxMinutes} min` },
    ],
    [req]
  );

  return (
    <Screen
      testID="instant-request"
      background={colors.white}
      header={
        <ScreenHeader
          onBack={onBack}
          right={<HeaderAction testID="instant-info" icon="info" label="About instant requests" onPress={() => setInfo(true)} />}
        />
      }
      footer={
        <View style={s.actions}>
          <Button testID="accept" label="Accept request" onPress={answer(onAccept)} />
          <Button testID="decline" label="Decline" variant="secondary" onPress={answer(onDecline)} />
          <Text style={s.footNote}>Declined or unanswered requests automatically move to another available doctor.</Text>
        </View>
      }
    >
      <View style={s.body}>
        <View style={s.statusRow}>
          <View style={s.liveDot} />
          <Text style={s.statusOn}>Request pending</Text>
        </View>

        <Text style={s.title} accessibilityRole="header">
          Instant consultation request
        </Text>
        <Text style={s.helper}>Respond before this request moves to another doctor.</Text>

        {/* compact urgency strip */}
        <View style={s.urgency}>
          <CountdownRing left={left} total={req.respondWithin} />
          <Text style={s.secondsLeft}>seconds left</Text>
          <View style={s.urgencyDivider} />
          <Icon name="inPerson" size={19} color={colors.inkMuted} />
          <Text style={s.waiting}>Patient is waiting</Text>
        </View>

        {/* patient request card */}
        <View style={s.card}>
          <View style={s.patientRow}>
            <Avatar initials={req.initials} size={58} />
            <View style={s.flex}>
              <Text style={s.name}>{req.name}</Text>
              <Text style={s.sub}>
                {req.gender} • {req.age} years
              </Text>
              <View style={s.specRow}>
                <Icon name="stethoscope" size={15} color={colors.surfie} />
                <Text style={s.spec}>{req.speciality}</Text>
              </View>
            </View>
          </View>

          <View style={s.concernBox}>
            <View style={s.concernIcon}>
              <Icon name="document" size={19} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={s.concern}>{req.concern}</Text>
              <Text style={s.concernLabel}>Patient reported</Text>
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
                  <Text style={s.metaLabel}>{m.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={s.shieldNote}>
          <Icon name="shieldCheck" size={19} color={colors.surfie} />
          <Text style={s.shieldText}>No other instant request will be assigned while this request is active.</Text>
        </View>

        <Text style={s.howTitle}>How it works</Text>
        <View style={s.steps}>
          {INSTANT_STEPS.map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <View style={s.stepLine} />}
              <View style={s.step}>
                <View style={s.stepBadge}>
                  <Text style={s.stepNum}>{i + 1}</Text>
                </View>
                <Text style={s.stepLabel}>{label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      <BottomSheet visible={info} title="About instant requests" onClose={() => setInfo(false)} testID="instant-info-sheet">
        <Text style={s.infoBody}>
          Instant requests reach you only while your status is Available Now. You have {req.respondWithin} seconds to
          answer; after that the request moves to another available doctor.
        </Text>
        <Text style={s.infoBody}>
          Accepting reserves your time for this patient. The consultation opens only after the patient completes
          payment and teleconsultation consent — you cannot start it earlier.
        </Text>
        <Text style={s.infoBody}>To stop receiving instant requests, change your status to Scheduled Only from the dashboard.</Text>
      </BottomSheet>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  body: { paddingHorizontal: spacing.lg },

  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: AMBER },
  statusOn: { ...typeStyles.status, color: AMBER },

  title: { ...typeStyles.pageTitle, color: colors.ink, textAlign: 'center', marginTop: spacing.sm },
  helper: { ...typeStyles.bodySmall, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },

  urgency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warnSoft,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  ringLabel: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringValue: { ...typeStyles.metricSmall, color: AMBER },
  secondsLeft: { ...typeStyles.body, color: AMBER },
  urgencyDivider: { width: 1, height: 26, backgroundColor: AMBER_TRACK, marginHorizontal: spacing.xs },
  waiting: { ...typeStyles.body, color: colors.inkMuted, flex: 1 },

  card: { borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.card, padding: spacing.md, marginTop: spacing.md },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { ...typeStyles.name, color: colors.ink },
  sub: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 1 },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  spec: { ...typeStyles.body, color: colors.ink },

  concernBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.mint,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  concernIcon: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  concern: { ...typeStyles.body, color: colors.ink },
  concernLabel: { ...typeStyles.caption, color: colors.inkMuted },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface.mint, alignItems: 'center', justifyContent: 'center' },
  metaDivider: { width: 1, height: 24, backgroundColor: colors.surface.line, marginHorizontal: spacing.xs },
  metaLabel: { ...typeStyles.caption, flex: 1, color: colors.ink },

  shieldNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.mint,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  shieldText: { ...typeStyles.bodySmall, flex: 1, color: colors.ink },

  howTitle: { ...typeStyles.cardTitle, color: colors.ink, marginTop: spacing.lg, marginBottom: spacing.sm },
  steps: { flexDirection: 'row', alignItems: 'flex-start' },
  step: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  stepBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface.mint, alignItems: 'center', justifyContent: 'center' },
  stepNum: { ...typeStyles.number, color: colors.surfie },
  stepLabel: { ...typeStyles.caption, flex: 1, color: colors.inkMuted },
  stepLine: { width: 10, height: 1, backgroundColor: colors.surface.line, marginTop: 13 },

  actions: { gap: spacing.sm },
  footNote: { ...typeStyles.helper, color: colors.inkMuted, textAlign: 'center' },

  infoBody: { ...typeStyles.body, color: colors.ink, marginBottom: spacing.md },
});

export default InstantRequestScreen;
