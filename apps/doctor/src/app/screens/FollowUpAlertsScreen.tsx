import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon, type IconName } from '../../components/Icon';
import { Screen, EmptyState } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { toast } from '../../components/Toast';
import { useStore } from '../../state/store';
import { isOpenAlert, selectAlerts, type AlertView } from '../../state/selectors';
import { acknowledgeAlert } from '../../state/actions';
import { patientById } from '../../data/patients';
import { ALERT_STATUS, ALERT_CHIPS, alertReceivedLabel, type AlertCategory } from '../../data/followup';

/** Per-category tint. Red is reserved for genuine safety, never for workload. */
const TONE: Record<AlertCategory, { fg: string; bg: string; icon: IconName }> = {
  redFlag: { fg: colors.danger, bg: colors.dangerSoft, icon: 'flag' },
  amber: { fg: '#B87316', bg: '#FDF4E5', icon: 'alertTriangle' },
  sideEffect: { fg: '#B87316', bg: '#FDF4E5', icon: 'prescription' },
  missed: { fg: colors.surfie, bg: colors.successSoft, icon: 'calendar' },
  due: { fg: colors.surfie, bg: colors.successSoft, icon: 'clock' },
};

/**
 * Follow-up Alerts — psychiatry check-in triage.
 *
 * Severity drives order: red flags sort above everything and are the only
 * place danger red appears. Alert copy is the patient's reported wording,
 * never a diagnosis, and only assigned patients appear. Acknowledging is
 * recorded on the alert, so it stays acknowledged when the doctor comes back.
 */
export const FollowUpAlertsScreen = ({
  onBack,
  onOpenAlert,
  initialCategory,
}: {
  onBack: () => void;
  onOpenAlert: (alertId: string) => void;
  initialCategory?: AlertCategory;
}) => {
  const alerts = useStore(selectAlerts);
  const [chip, setChip] = useState<AlertCategory | 'all'>(initialCategory ?? 'all');

  const list = useMemo(() => (chip === 'all' ? alerts : alerts.filter((a) => a.category === chip)), [alerts, chip]);
  const openCount = (c: AlertCategory) => alerts.filter((a) => a.category === c && isOpenAlert(a)).length;

  const acknowledge = (a: AlertView) => {
    acknowledgeAlert(a.id);
    toast.show(`Acknowledged — ${patientById(a.patientId)?.name ?? 'patient'}`);
  };

  return (
    <Screen
      testID="follow-up-alerts"
      header={
        <ScreenHeader onBack={onBack} title="Follow-Up Alerts" subtitle="Patients who need your attention based on their check-ins." />
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipWrap}>
        {ALERT_CHIPS.map((c) => {
          const on = chip === c.key;
          const tone = TONE[c.key];
          const count = openCount(c.key);
          return (
            <Pressable
              key={c.key}
              testID={`chip-${c.key}`}
              onPress={() => setChip(on ? 'all' : c.key)}
              style={[s.chip, on && s.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${c.label}, ${count} open`}
            >
              <Icon name={tone.icon} size={14} color={on ? colors.white : tone.fg} />
              <Text style={[s.chipText, on && s.chipTextOn]} numberOfLines={1}>
                {c.label}
              </Text>
              <View style={[s.chipCount, on ? s.chipCountOn : { backgroundColor: tone.bg }]}>
                <Text style={[s.chipCountText, on ? s.chipCountTextOn : { color: tone.fg }]}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {list.length === 0 ? (
        <EmptyState icon="checkCircle" title="Nothing to review" body="No alerts match this filter." actionLabel="Show all" onAction={() => setChip('all')} />
      ) : (
        list.map((a) => {
          const tone = TONE[a.category];
          const patient = patientById(a.patientId);
          const status = a.live.status;
          const isOpen = status === 'open';
          return (
            <View key={a.id} testID={`alert-${a.id}`} style={s.card}>
              <Pressable
                testID={`open-${a.id}`}
                onPress={() => onOpenAlert(a.id)}
                style={({ pressed }) => [s.cardTop, pressed && s.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Open alert for ${patient?.name}: ${a.trigger}`}
              >
                <View>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{patient?.initials}</Text>
                  </View>
                  <View style={[s.avatarDot, { backgroundColor: tone.fg }]} />
                </View>
                <View style={s.flex}>
                  <View style={s.nameRow}>
                    <Text style={s.name} numberOfLines={1}>
                      {patient?.name}
                    </Text>
                    {!a.live.read && <View style={s.unreadDot} accessibilityLabel="Unread" />}
                  </View>
                  <Text style={s.meta} numberOfLines={1}>
                    {patient?.gender} • {patient?.age} years • {a.patientId}
                  </Text>
                  <View style={[s.reason, { backgroundColor: tone.bg }]}>
                    <Icon name={tone.icon} size={12} color={tone.fg} />
                    <Text style={[s.reasonText, { color: tone.fg }]} numberOfLines={2}>
                      {a.trigger}
                    </Text>
                  </View>
                  <View style={s.timeRow}>
                    <Text style={s.time}>{alertReceivedLabel(a)}</Text>
                    <View style={[s.statusPill, isOpen && s.statusPillOpen]}>
                      <Text style={[s.statusText, isOpen && s.statusTextOpen]}>{ALERT_STATUS[status]}</Text>
                    </View>
                  </View>
                </View>
                <Icon name="chevronRight" size={18} color={colors.inkFaint} />
              </Pressable>

              {a.checkIn ? (
                <View style={s.checkIn}>
                  <View style={s.checkInHead}>
                    <Icon name="message" size={12} color={colors.surfie} />
                    <Text style={s.checkInLabel}>Latest check-in</Text>
                  </View>
                  <Text style={s.checkInText} numberOfLines={2}>
                    &ldquo;{a.checkIn}&rdquo;
                  </Text>
                </View>
              ) : (
                <View style={s.checkIn}>
                  <View style={s.checkInHead}>
                    <Icon name="calendar" size={12} color={colors.inkMuted} />
                    <Text style={[s.checkInLabel, { color: colors.inkMuted }]}>No check-in submitted</Text>
                  </View>
                </View>
              )}

              <View style={s.actions}>
                <Pressable
                  testID={`ack-${a.id}`}
                  onPress={() => acknowledge(a)}
                  disabled={!isOpen}
                  style={({ pressed }) => [s.btn, s.btnGhost, !isOpen && s.btnDisabled, pressed && isOpen && s.pressed]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !isOpen }}
                  accessibilityLabel={isOpen ? `Acknowledge alert for ${patient?.name}` : `${ALERT_STATUS[status]}`}
                >
                  <Text style={s.btnGhostText}>{isOpen ? 'Acknowledge' : ALERT_STATUS[status]}</Text>
                </Pressable>
                <Pressable
                  testID={`open-btn-${a.id}`}
                  onPress={() => onOpenAlert(a.id)}
                  style={({ pressed }) => [s.btn, s.btnSolid, pressed && s.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Review ${patient?.name}`}
                >
                  <Text style={s.btnSolidText}>{a.category === 'redFlag' && isOpen ? 'Review now' : 'Review'}</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      <View style={s.scope}>
        <Icon name="shield" size={14} color={colors.inkMuted} />
        <Text style={s.scopeText}>Only patients assigned to you appear here.</Text>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.8 },

  chipWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  chipOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  chipText: { ...typeStyles.caption, fontWeight: fontWeight.semibold, color: colors.ink },
  chipTextOn: { color: colors.white },
  chipCount: { borderRadius: radius.pill, paddingHorizontal: 6, minWidth: 22, alignItems: 'center' },
  chipCountOn: { backgroundColor: 'rgba(255,255,255,0.22)' },
  chipCountText: { ...typeStyles.caption, fontSize: 11, lineHeight: 17, fontWeight: fontWeight.bold },
  chipCountTextOn: { color: colors.white },

  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typeStyles.avatar, lineHeight: undefined, color: colors.surfie },
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { ...typeStyles.name, fontWeight: fontWeight.bold, color: colors.ink, flexShrink: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfie },
  meta: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },
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
  reasonText: { ...typeStyles.caption, fontWeight: fontWeight.bold, flexShrink: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  time: { ...typeStyles.caption, color: colors.inkMuted },
  statusPill: { backgroundColor: colors.surface.selected, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 1 },
  statusPillOpen: { backgroundColor: colors.warnSoft },
  statusText: { ...typeStyles.caption, fontSize: 11, lineHeight: 16, fontWeight: fontWeight.bold, color: colors.surfie },
  statusTextOpen: { color: colors.warn },

  checkIn: { marginTop: spacing.md, backgroundColor: colors.surface.mint, borderRadius: 12, padding: spacing.md },
  checkInHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  checkInLabel: { ...typeStyles.caption, fontWeight: fontWeight.bold, color: colors.surfie },
  checkInText: { ...typeStyles.bodySmall, color: colors.ink, marginTop: 4 },

  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: 12 },
  btnGhost: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.surfie },
  btnGhostText: { ...typeStyles.buttonSmall, color: colors.surfie },
  btnDisabled: { borderColor: colors.surface.inputBorder, opacity: 0.6 },
  btnSolid: { backgroundColor: colors.surfie },
  btnSolidText: { ...typeStyles.buttonSmall, color: colors.white },

  scope: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  scopeText: { ...typeStyles.caption, color: colors.inkMuted },
});

export default FollowUpAlertsScreen;
