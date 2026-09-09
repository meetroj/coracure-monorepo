import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import { Screen, AppHeader, IconButton, PageTitle, Card, Button, SectionHeader } from '../../components/ui';
import {
  initialSchedule,
  scheduleExceptions,
  leaves,
  doctor,
  type DaySchedule,
  type ConsultMode,
} from '../../data/doctor';

const MODES: { key: ConsultMode; label: string; icon: 'video' | 'phone' | 'inPerson' }[] = [
  { key: 'video', label: 'Video', icon: 'video' },
  { key: 'audio', label: 'Audio', icon: 'phone' },
  { key: 'inPerson', label: 'In-person', icon: 'inPerson' },
];

/**
 * Scheduled availability. Deliberately separate from the Dashboard's live
 * Available Now / Offline selector — this sets bookable hours, not presence.
 */
export const AvailabilityScreen = ({ onSaved }: { onSaved?: () => void }) => {
  const [tab, setTab] = useState<'weekly' | 'timeOff'>('weekly');
  const [schedule, setSchedule] = useState<DaySchedule[]>(initialSchedule);
  const [openDay, setOpenDay] = useState<string | null>('Wednesday');
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: string) =>
    setSchedule((prev) => prev.map((d) => (d.day === day ? { ...d, enabled: !d.enabled } : d)));

  const toggleMode = (day: string, mode: ConsultMode) =>
    setSchedule((prev) =>
      prev.map((d) =>
        d.day === day
          ? { ...d, modes: d.modes.includes(mode) ? d.modes.filter((m) => m !== mode) : [...d.modes, mode] }
          : d
      )
    );

  const addRange = (day: string) =>
    setSchedule((prev) =>
      prev.map((d) => (d.day === day ? { ...d, ranges: [...d.ranges, { from: '06:00 PM', to: '08:00 PM' }] } : d))
    );

  const removeRange = (day: string, idx: number) =>
    setSchedule((prev) =>
      prev.map((d) => (d.day === day ? { ...d, ranges: d.ranges.filter((_, i) => i !== idx) } : d))
    );

  const copySchedule = () => {
    const monday = schedule.find((d) => d.day === 'Monday');
    if (!monday) return;
    setSchedule((prev) =>
      prev.map((d) =>
        d.day === 'Saturday' || d.day === 'Sunday'
          ? d
          : { ...d, enabled: true, ranges: monday.ranges.map((r) => ({ ...r })), modes: [...monday.modes] }
      )
    );
  };

  const save = () => {
    setSaving(true);
    // TODO: PUT the schedule once the backend route exists.
    setTimeout(() => {
      setSaving(false);
      onSaved?.();
    }, 800);
  };

  const active = schedule.find((d) => d.day === openDay);

  return (
    <Screen>
      <AppHeader right={<IconButton name="bell" badge label="Notifications" />} />
      <PageTitle title="Set your availability" subtitle="Choose your regular hours and exceptions." />

      <View style={s.segment}>
        <Pressable
          testID="tab-weekly"
          onPress={() => setTab('weekly')}
          style={[s.segmentBtn, tab === 'weekly' && s.segmentBtnActive]}
        >
          <Text style={[s.segmentText, tab === 'weekly' && s.segmentTextActive]}>Weekly hours</Text>
        </Pressable>
        <Pressable
          testID="tab-timeoff"
          onPress={() => setTab('timeOff')}
          style={[s.segmentBtn, tab === 'timeOff' && s.segmentBtnActive]}
        >
          <Text style={[s.segmentText, tab === 'timeOff' && s.segmentTextActive]}>Time off</Text>
        </Pressable>
      </View>

      {tab === 'weekly' ? (
        <>
          <Card tone="mint" style={s.weekCard}>
            <View style={s.weekHead}>
              <View style={s.flex}>
                <Text style={s.weekTitle}>Standard week</Text>
                <Text style={s.weekSub}>Your regular weekly availability</Text>
              </View>
              <Pressable onPress={copySchedule} hitSlop={8} style={s.copyBtn}>
                <Icon name="copy" size={16} color={colors.surfie} />
                <Text style={s.copyText}>Copy schedule</Text>
              </Pressable>
            </View>

            <View style={s.dayGrid}>
              {schedule.map((d) => (
                <Pressable
                  key={d.day}
                  testID={`day-${d.short}`}
                  onPress={() => setOpenDay(d.day)}
                  style={[s.dayCard, openDay === d.day && s.dayCardActive]}
                >
                  <View style={s.dayTop}>
                    <Text style={s.dayName}>{d.short}</Text>
                    <Switch
                      value={d.enabled}
                      onValueChange={() => toggleDay(d.day)}
                      trackColor={{ false: '#D8E2DE', true: colors.paris }}
                      thumbColor={colors.white}
                    />
                  </View>
                  {d.enabled && d.ranges.length > 0 ? (
                    d.ranges.map((r, i) => (
                      <Text key={i} style={s.dayRange}>
                        {r.from} – {r.to}
                      </Text>
                    ))
                  ) : (
                    <Text style={s.dayUnavailable}>Unavailable</Text>
                  )}
                </Pressable>
              ))}
            </View>
          </Card>

          {/* per-day editor */}
          {active && active.enabled && (
            <Card style={s.editorCard}>
              <View style={s.editorHead}>
                <Text style={s.editorTitle}>{active.day} hours</Text>
                <Pressable onPress={() => setOpenDay(null)} hitSlop={8}>
                  <Icon name="close" size={18} color={colors.inkFaint} />
                </Pressable>
              </View>

              {active.ranges.map((r, i) => (
                <View key={i} style={s.rangeRow}>
                  <View style={s.timeBox}>
                    <Icon name="clock" size={15} color={colors.surfie} />
                    <Text style={s.timeText}>{r.from}</Text>
                    <Icon name="chevronDown" size={14} color={colors.inkFaint} />
                  </View>
                  <Text style={s.dash}>–</Text>
                  <View style={s.timeBox}>
                    <Icon name="clock" size={15} color={colors.surfie} />
                    <Text style={s.timeText}>{r.to}</Text>
                    <Icon name="chevronDown" size={14} color={colors.inkFaint} />
                  </View>
                  <Pressable onPress={() => removeRange(active.day, i)} hitSlop={8}>
                    <Icon name="trash" size={18} color={colors.inkFaint} />
                  </Pressable>
                </View>
              ))}

              <Pressable onPress={() => addRange(active.day)} style={s.addRow} hitSlop={8}>
                <Icon name="plus" size={16} color={colors.surfie} />
                <Text style={s.addText}>Add hours</Text>
              </Pressable>

              <View style={s.modeSection}>
                <View style={s.flex}>
                  <Text style={s.modeTitle}>Consultation modes</Text>
                  <Text style={s.modeSub}>How patients can book with you</Text>
                </View>
              </View>
              <View style={s.modeRow}>
                {MODES.map((m) => {
                  const on = active.modes.includes(m.key);
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => toggleMode(active.day, m.key)}
                      style={[s.modeChip, on && s.modeChipOn]}
                    >
                      <Icon name={m.icon} size={15} color={on ? colors.surfie : colors.inkMuted} />
                      <Text style={[s.modeChipText, on && s.modeChipTextOn]}>{m.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          )}

          {/* exceptions */}
          <Card style={s.spaced}>
            <View style={s.cardHeadRow}>
              <Icon name="calendar" size={18} color={colors.surfie} />
              <View style={s.flex}>
                <Text style={s.cardTitle}>Schedule exceptions</Text>
                <Text style={s.cardSub}>Custom availability for specific dates</Text>
              </View>
              <Pressable hitSlop={8} style={s.copyBtn}>
                <Icon name="plus" size={15} color={colors.surfie} />
                <Text style={s.copyText}>Add</Text>
              </Pressable>
            </View>
            <View style={s.exceptionRow}>
              {scheduleExceptions.map((e) => (
                <Pressable key={e.id} style={s.exceptionCard}>
                  <Text style={s.exceptionDate}>{e.dateLabel}</Text>
                  <Text style={s.exceptionNote}>{e.note}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {/* booking preferences */}
          <Card style={s.spaced}>
            <View style={s.cardHeadRow}>
              <Icon name="settings" size={18} color={colors.surfie} />
              <View style={s.flex}>
                <Text style={s.cardTitle}>Booking preferences</Text>
                <Text style={s.cardSub}>Default appointment settings</Text>
              </View>
            </View>
            <View style={s.prefRow}>
              <Pressable style={s.prefBox}>
                <Text style={s.prefLabel}>Consultation duration</Text>
                <View style={s.prefValueRow}>
                  <Text style={s.prefValue}>{doctor.consultationMinutes} min</Text>
                  <Icon name="chevronRight" size={15} color={colors.inkFaint} />
                </View>
              </Pressable>
              <View style={s.prefDivider} />
              <Pressable style={s.prefBox}>
                <Text style={s.prefLabel}>Buffer time</Text>
                <View style={s.prefValueRow}>
                  <Text style={s.prefValue}>15 min</Text>
                  <Icon name="chevronRight" size={15} color={colors.inkFaint} />
                </View>
              </Pressable>
            </View>
          </Card>
        </>
      ) : (
        <>
          <SectionHeader title="Blocked dates and leave" subtitle="Dates you will be unavailable" actionLabel="Add" />
          <Card>
            {leaves.map((l, i) => (
              <View key={l.id} style={[s.leaveRow, i < leaves.length - 1 && s.leaveBorder]}>
                <View style={s.leaveIcon}>
                  <Icon name="banCircle" size={17} color={colors.danger} />
                </View>
                <View style={s.flex}>
                  <Text style={s.leaveDate}>{l.dateLabel}</Text>
                  <Text style={s.leaveReason}>{l.reason}</Text>
                </View>
                <Pressable hitSlop={8}>
                  <Icon name="close" size={17} color={colors.inkFaint} />
                </Pressable>
              </View>
            ))}
          </Card>
        </>
      )}

      <View style={s.saveWrap}>
        <Button
          testID="save-schedule"
          label="Save and publish schedule"
          icon="arrowRight"
          onPress={save}
          loading={saving}
        />
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  spaced: { marginTop: spacing.md },

  segment: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface.selected,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.sm },
  segmentBtnActive: { backgroundColor: colors.surfie },
  segmentText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.surfie,
  },
  segmentTextActive: { color: colors.white },

  weekCard: {},
  weekHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  weekTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  weekSub: { fontFamily: typography.body.family, fontSize: typography.size.xs, color: colors.inkMuted },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },

  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dayCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
  },
  dayCardActive: { borderColor: colors.paris, borderWidth: 1.5 },
  dayTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { fontFamily: typography.heading.family, fontSize: typography.size.md, fontWeight: '700', color: colors.ink },
  dayRange: { fontFamily: typography.body.family, fontSize: typography.size.xxs, color: colors.inkMuted, marginTop: 2 },
  dayUnavailable: { fontFamily: typography.body.family, fontSize: typography.size.xxs, color: colors.inkFaint, marginTop: 2 },

  editorCard: { marginTop: spacing.md },
  editorHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  editorTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  timeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  timeText: { flex: 1, fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.ink },
  dash: { color: colors.inkFaint },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  addText: { fontFamily: typography.body.family, fontSize: typography.size.sm, fontWeight: '700', color: colors.surfie },
  modeSection: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  modeTitle: { fontFamily: typography.body.family, fontSize: typography.size.md, fontWeight: '700', color: colors.ink },
  modeSub: { fontFamily: typography.body.family, fontSize: typography.size.xs, color: colors.inkMuted },
  modeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  modeChipOn: { backgroundColor: colors.surface.selected, borderColor: colors.paris },
  modeChipText: { fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.inkMuted },
  modeChipTextOn: { color: colors.surfie, fontWeight: '700' },

  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontFamily: typography.heading.family, fontSize: typography.size.md, fontWeight: '700', color: colors.ink },
  cardSub: { fontFamily: typography.body.family, fontSize: typography.size.xs, color: colors.inkMuted },
  exceptionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  exceptionCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  exceptionDate: { fontFamily: typography.body.family, fontSize: typography.size.sm, fontWeight: '700', color: colors.ink },
  exceptionNote: { fontFamily: typography.body.family, fontSize: typography.size.xxs, color: colors.inkMuted },

  prefRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  prefBox: { flex: 1 },
  prefLabel: { fontFamily: typography.body.family, fontSize: typography.size.xs, color: colors.inkMuted },
  prefValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  prefValue: { fontFamily: typography.heading.family, fontSize: typography.size.md, fontWeight: '700', color: colors.ink },
  prefDivider: { width: 1, height: 34, backgroundColor: colors.surface.line, marginHorizontal: spacing.md },

  leaveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  leaveBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  leaveIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveDate: { fontFamily: typography.body.family, fontSize: typography.size.md, fontWeight: '700', color: colors.ink },
  leaveReason: { fontFamily: typography.body.family, fontSize: typography.size.xs, color: colors.inkMuted },

  saveWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
});

export default AvailabilityScreen;
