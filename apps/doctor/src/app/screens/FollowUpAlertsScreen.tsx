import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon, type IconName } from '../../components/Icon';
import {
  patientAlerts,
  sortedAlerts,
  ALERT_STATUS,
  ALERT_CHIPS,
  type AlertCategory,
  type PatientAlert,
} from '../../data/followup';

const MUTED = '#6B7C86';

/** Per-category tint. Red is reserved for genuine safety, never for workload. */
const TONE: Record<AlertCategory, { fg: string; bg: string; icon: IconName }> = {
  redFlag: { fg: colors.danger, bg: colors.dangerSoft, icon: 'flag' },
  amber: { fg: '#C97F1B', bg: '#FDF4E5', icon: 'alertTriangle' },
  sideEffect: { fg: '#C97F1B', bg: '#FDF4E5', icon: 'plus' },
  missed: { fg: colors.surfie, bg: colors.successSoft, icon: 'calendar' },
  due: { fg: colors.surfie, bg: colors.successSoft, icon: 'clock' },
};

/**
 * Follow-up Alerts — psychiatry check-in triage.
 *
 * Severity drives order: red flags sort above everything and are the only
 * place danger red appears, so urgency keeps its meaning. Alert copy is the
 * patient's reported wording, never a diagnosis, and only assigned patients
 * appear here.
 */
export const FollowUpAlertsScreen = ({
  onBack,
  onOpenAlert,
}: {
  onBack: () => void;
  onOpenAlert?: (a: PatientAlert) => void;
}) => {
  const insets = useSafeAreaInsets();
  const [chip, setChip] = useState<AlertCategory | 'all'>('all');
  const [acked, setAcked] = useState<string[]>([]);

  // Severity rank is the only order. There is no sort control, because a red
  // flag must never be sortable below a routine alert.
  const list = useMemo(
    () => sortedAlerts(chip === 'all' ? patientAlerts : patientAlerts.filter((a) => a.category === chip)),
    [chip]
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={{ paddingTop: insets.top }}>
        <View style={s.appBar}>
          <Pressable
            testID="back"
            onPress={onBack}
            hitSlop={10}
            style={s.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Icon name="arrowLeft" size={18} color={colors.ink} />
          </Pressable>
          <LogoWide width={104} height={26} />
          <Pressable hitSlop={10} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Notifications">
            <Icon name="bell" size={17} color={colors.ink} />
            <View style={s.dot} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.head}>
          <Text style={s.h1}>Follow-Up Alerts</Text>
          <Text style={s.sub}>Patients who need your attention based on their check-ins.</Text>
        </View>

        {/* one line: the row scrolls sideways rather than wrapping, so the
            header keeps a fixed height however many categories exist */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipWrap}
        >
          {ALERT_CHIPS.map((c) => {
            const on = chip === c.key;
            const tone = TONE[c.key];
            return (
              <Pressable
                key={c.key}
                testID={`chip-${c.key}`}
                onPress={() => setChip(on ? 'all' : c.key)}
                style={[s.chip, on && { backgroundColor: colors.surfie, borderColor: colors.surfie }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Icon name={tone.icon} size={14} color={on ? colors.white : tone.fg} />
                <Text style={[s.chipText, on && s.chipTextOn]} numberOfLines={1}>
                  {c.label}
                </Text>
                <View style={[s.chipCount, on ? s.chipCountOn : { backgroundColor: tone.bg }]}>
                  <Text style={[s.chipCountText, on ? s.chipCountTextOn : { color: tone.fg }]}>
                    {c.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {list.length === 0 ? (
          <View style={s.empty}>
            <Icon name="checkCircle" size={26} color={colors.surfie} />
            <Text style={s.emptyTitle}>Nothing to review</Text>
            <Text style={s.emptyBody}>No alerts match this filter.</Text>
          </View>
        ) : (
          list.map((a) => {
            const tone = TONE[a.category];
            const st = acked.includes(a.id) ? 'acknowledged' : a.status;
            const isOpen = st === 'open';

            return (
              <View key={a.id} style={s.card}>
                <View style={s.cardTop}>
                  <View>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{a.initials}</Text>
                    </View>
                    {/* severity reads at the avatar, before any text is parsed */}
                    <View style={[s.avatarDot, { backgroundColor: tone.fg }]} />
                  </View>

                  <View style={s.flex}>
                    <Text style={s.name} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text style={s.meta} numberOfLines={1}>
                      {a.gender} • {a.age} years • {a.patientId}
                    </Text>

                    <View style={[s.reason, { backgroundColor: tone.bg }]}>
                      <Icon name={tone.icon} size={11} color={tone.fg} />
                      <Text style={[s.reasonText, { color: tone.fg }]} numberOfLines={1}>
                        {a.trigger}
                      </Text>
                    </View>

                    <View style={s.timeRow}>
                      <Text style={s.time}>{a.receivedAgo}</Text>
                      {!isOpen && (
                        <View style={s.statusPill}>
                          <Text style={s.statusText}>{ALERT_STATUS[st]}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Pressable
                    testID={`open-${a.id}`}
                    onPress={() => onOpenAlert?.(a)}
                    hitSlop={8}
                    style={s.chevBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${a.name}`}
                  >
                    <Icon name="chevronRight" size={16} color={colors.ink} />
                  </Pressable>
                </View>

                {/* the patient's own words — absent when nothing was submitted */}
                {a.checkIn ? (
                  <View style={s.checkIn}>
                    <View style={s.checkInHead}>
                      <Icon name="message" size={12} color={colors.surfie} />
                      <Text style={s.checkInLabel}>Latest Check-in</Text>
                    </View>
                    <Text style={s.checkInText} numberOfLines={1}>
                      &ldquo;{a.checkIn}&rdquo;
                    </Text>
                  </View>
                ) : (
                  <View style={s.checkIn}>
                    <View style={s.checkInHead}>
                      <Icon name="calendar" size={12} color={MUTED} />
                      <Text style={[s.checkInLabel, { color: MUTED }]}>No check-in submitted</Text>
                    </View>
                  </View>
                )}

                <View style={s.actions}>
                  <Pressable
                    testID={`ack-${a.id}`}
                    onPress={() => setAcked((v) => (v.includes(a.id) ? v : [...v, a.id]))}
                    disabled={!isOpen}
                    style={[s.btn, s.btnGhost, !isOpen && s.btnDisabled]}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !isOpen }}
                    accessibilityLabel={`Acknowledge ${a.name}`}
                  >
                    <Text style={s.btnGhostText}>
                      {isOpen ? 'Acknowledge' : ALERT_STATUS[st]}
                    </Text>
                  </Pressable>

                  <Pressable
                    testID={`open-btn-${a.id}`}
                    onPress={() => onOpenAlert?.(a)}
                    style={[s.btn, s.btnSolid]}
                    accessibilityRole="button"
                    accessibilityLabel={`Open case for ${a.name}`}
                  >
                    <Icon name="externalLink" size={14} color={colors.white} />
                    <Text style={s.btnSolidText}>Open</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        <View style={s.scope}>
          <Icon name="shield" size={13} color={MUTED} />
          <Text style={s.scopeText}>Only patients assigned to you appear here.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingBottom: spacing.lg },

  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.page,
  },
  dot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.paris,
  },

  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  h1: {
    fontFamily: typography.heading.family,
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.4,
  },
  sub: { fontFamily: typography.body.family, fontSize: 12.5, color: MUTED, marginTop: 3 },

  /* chips */
  chipWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  chipText: { fontFamily: typography.body.family, fontSize: 12.5, fontWeight: '600', color: colors.ink },
  chipTextOn: { color: colors.white, fontWeight: '700' },
  chipCount: { borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  chipCountOn: { backgroundColor: 'rgba(255,255,255,0.22)' },
  chipCountText: { fontFamily: typography.body.family, fontSize: 11, fontWeight: '700' },
  chipCountTextOn: { color: colors.white },


  /* card */
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.heading.family,
    fontSize: 16,
    fontWeight: '700',
    color: colors.surfie,
  },
  avatarDot: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.white,
  },
  name: { fontFamily: typography.heading.family, fontSize: 15, fontWeight: '700', color: colors.ink },
  meta: { fontFamily: typography.body.family, fontSize: 11.5, color: MUTED, marginTop: 2 },

  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    marginTop: 6,
    maxWidth: '100%',
  },
  reasonText: { fontFamily: typography.body.family, fontSize: 11.5, fontWeight: '700', flexShrink: 1 },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  time: { fontFamily: typography.body.family, fontSize: 11, color: MUTED },
  statusPill: {
    backgroundColor: colors.surface.selected,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusText: { fontFamily: typography.body.family, fontSize: 9.5, fontWeight: '700', color: colors.surfie },

  chevBtn: {
    marginTop: 18,
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surface.line,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* check-in */
  checkIn: {
    marginTop: spacing.md,
    backgroundColor: colors.surface.mint,
    borderRadius: 12,
    padding: spacing.md,
  },
  checkInHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  checkInLabel: { fontFamily: typography.body.family, fontSize: 11, fontWeight: '700', color: colors.surfie },
  checkInText: {
    fontFamily: typography.body.family,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.ink,
    marginTop: 5,
  },

  /* actions */
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
  },
  btnGhost: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.surfie },
  btnGhostText: { fontFamily: typography.heading.family, fontSize: 13, fontWeight: '700', color: colors.surfie },
  btnDisabled: { borderColor: colors.surface.inputBorder, opacity: 0.55 },
  btnSolid: { backgroundColor: colors.surfie },
  btnSolidText: { fontFamily: typography.heading.family, fontSize: 13, fontWeight: '700', color: colors.white },

  /* empty + scope */
  empty: { alignItems: 'center', gap: 6, paddingVertical: spacing.xxxl },
  emptyTitle: { fontFamily: typography.heading.family, fontSize: 15, fontWeight: '700', color: colors.ink },
  emptyBody: { fontFamily: typography.body.family, fontSize: 12.5, color: MUTED },

  scope: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  scopeText: { fontFamily: typography.body.family, fontSize: 11.5, color: MUTED },
});

export default FollowUpAlertsScreen;
