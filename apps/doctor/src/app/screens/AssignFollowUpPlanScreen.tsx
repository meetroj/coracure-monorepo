import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, Button } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { CalendarSheet } from '../../components/form';
import { pathways, DURATIONS, reviewDateFor, planStartDefault, type Duration, type PathwayKey } from '../../data/followup';
import { TODAY, fmtDate, fmtDayMonth, fromISODate, toISODate } from '../../data/calendar';
import type { FollowUpPlan } from '../../data/clinical';
import type { Appointment } from '../../data/doctor';

/**
 * Assign Follow-up Plan — for one consultation.
 *
 * The review date is derived from the start date and the duration rather than
 * being separately editable: two fields that can disagree is a bug waiting to
 * happen. The pathway's questions are governed centrally, so this screen shows
 * how many there are, never the questions themselves.
 */
export const AssignFollowUpPlanScreen = ({
  appointment,
  initialPlan,
  onBack,
  onAssign,
  onViewConsultation,
}: {
  appointment: Appointment;
  /** The plan already assigned, when re-opened to change it. */
  initialPlan?: FollowUpPlan;
  onBack: () => void;
  onAssign: (plan: FollowUpPlan) => void;
  onViewConsultation: () => void;
}) => {
  const a = appointment;
  const [pathway, setPathway] = useState<PathwayKey>((initialPlan?.pathway as PathwayKey) ?? 'depressionAnxiety');
  const [duration, setDuration] = useState<Duration>((initialPlan?.duration as Duration) ?? 7);
  const [start, setStart] = useState(initialPlan?.start ?? planStartDefault());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const selected = pathways.find((p) => p.key === pathway)!;
  const review = useMemo(() => reviewDateFor(start, duration), [start, duration]);
  const startDate = fromISODate(start);

  return (
    <Screen
      testID="assign-plan"
      background={colors.white}
      header={
        <ScreenHeader
          onBack={onBack}
          title="Assign Follow-up Plan"
          subtitle="Choose a pathway and schedule the patient's daily check-ins."
        />
      }
      footer={
        <Button
          testID="assign"
          label={initialPlan ? 'Update Follow-up Plan' : 'Assign Follow-up Plan'}
          icon="arrowRight"
          iconRight
          onPress={() => onAssign({ pathway, duration, start })}
        />
      }
    >
      <View style={s.body}>
        <View style={s.strip}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{a.initials}</Text>
          </View>
          <View style={s.flex}>
            <Text style={s.stripName}>{a.name}</Text>
            <Text style={s.stripMeta}>
              {a.gender} • {a.age} years • {a.consultationId}
            </Text>
          </View>
          <Pressable
            testID="view-consultation"
            onPress={onViewConsultation}
            hitSlop={8}
            style={s.viewBtn}
            accessibilityRole="button"
            accessibilityLabel="View consultation"
          >
            <Text style={s.viewText}>View</Text>
            <Icon name="chevronRight" size={13} color={colors.surfie} />
          </Pressable>
        </View>

        <Text style={s.h2}>Select pathway</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tileRow}>
          {pathways.map((p) => {
            const on = p.key === pathway;
            return (
              <Pressable
                key={p.key}
                testID={`pathway-${p.key}`}
                onPress={() => setPathway(p.key)}
                style={[s.tile, on && s.tileOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                {on && (
                  <View style={s.tileCheck}>
                    <Icon name="checkCircle" size={14} color={colors.surfie} filled />
                  </View>
                )}
                <View style={s.tileIcon}>
                  <Icon name={p.icon} size={16} color={colors.surfie} />
                </View>
                <Text style={[s.tileLabel, on && s.tileLabelOn]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={s.infoPanel}>
          <View style={s.infoIcon}>
            <Icon name={selected.icon} size={18} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.infoTitle}>{selected.label}</Text>
            <Text style={s.infoMeta}>Clinically approved • {selected.dailyQuestions} daily questions</Text>
          </View>
        </View>

        <Text style={s.h2}>Plan schedule</Text>
        <View style={s.dateRow}>
          <Pressable
            testID="start-date"
            onPress={() => setCalendarOpen(true)}
            style={({ pressed }) => [s.dateField, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Start date, ${fmtDate(startDate)}. Change`}
          >
            <Icon name="calendar" size={16} color={colors.surfie} />
            <View style={s.flex}>
              <Text style={s.fieldLabel}>Start date</Text>
              <Text style={s.fieldValue}>{fmtDate(startDate)}</Text>
            </View>
            <Icon name="chevronDown" size={14} color={colors.inkMuted} />
          </Pressable>
          <View style={s.dateField} accessible accessibilityLabel={`Review date, ${review}`}>
            <Icon name="calendar" size={16} color={colors.surfie} />
            <View style={s.flex}>
              <Text style={s.fieldLabel}>Review date</Text>
              <Text testID="review-date" style={s.fieldValue}>
                {review}
              </Text>
            </View>
          </View>
        </View>

        <Text style={s.h2}>Check-in duration</Text>
        <View style={s.segment}>
          {DURATIONS.map((d) => {
            const on = d === duration;
            return (
              <Pressable
                key={d}
                testID={`duration-${d}`}
                onPress={() => setDuration(d)}
                style={[s.segItem, on && s.segItemOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <Text style={[s.segText, on && s.segTextOn]}>{d} Days</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={s.h2}>Plan summary</Text>
        <View style={s.summaryRow}>
          {[
            { k: 'Starts', v: fmtDayMonth(startDate), id: 'summary-start' },
            { k: 'Check-ins', v: String(duration), id: 'checkin-count' },
            { k: 'Review', v: review.split(' ').slice(0, 2).join(' '), id: 'summary-review' },
          ].map((c) => (
            <View key={c.k} style={s.summaryCard}>
              <Text style={s.summaryLabel}>{c.k}</Text>
              <Text testID={c.id} style={s.summaryValue}>
                {c.v}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.note}>
          <Icon name="info" size={15} color={colors.surfie} />
          <Text style={s.noteText}>The pathway appears in the patient&apos;s Care Plan from the start date.</Text>
        </View>
      </View>

      <CalendarSheet
        visible={calendarOpen}
        title="Start date"
        selected={{ day: startDate.getDate(), month: startDate.getMonth(), year: startDate.getFullYear() }}
        initialView={{ month: startDate.getMonth(), year: startDate.getFullYear() }}
        isDisabled={(d) => new Date(d.year, d.month, d.day) < TODAY}
        onPick={(d) => {
          setStart(toISODate(new Date(d.year, d.month, d.day)));
          setCalendarOpen(false);
        }}
        onClose={() => setCalendarOpen(false)}
        testID="plan-start"
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.75 },
  body: { paddingHorizontal: spacing.lg },
  h2: { ...typeStyles.sectionTitle, fontSize: 16, lineHeight: 22, color: colors.ink, marginTop: spacing.lg, marginBottom: spacing.sm },

  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typeStyles.avatar, lineHeight: undefined, color: colors.surfie },
  stripName: { ...typeStyles.name, color: colors.ink },
  stripMeta: { ...typeStyles.caption, color: colors.inkMuted },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 1, minHeight: 36, paddingHorizontal: spacing.sm },
  viewText: { ...typeStyles.buttonSmall, color: colors.surfie },

  tileRow: { gap: spacing.sm, paddingRight: spacing.lg },
  tile: {
    width: 92,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: 6,
    alignItems: 'center',
    minHeight: 92,
  },
  tileOn: { borderColor: colors.surfie, backgroundColor: '#F4FBF8' },
  tileCheck: { position: 'absolute', top: 4, right: 4 },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  tileLabel: { ...typeStyles.caption, color: colors.inkMuted, textAlign: 'center' },
  tileLabelOn: { color: colors.ink, fontWeight: fontWeight.semibold },

  infoPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  infoIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  infoTitle: { ...typeStyles.cardTitle, color: colors.ink },
  infoMeta: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },

  dateRow: { flexDirection: 'row', gap: spacing.sm },
  dateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    minHeight: 52,
  },
  fieldLabel: { ...typeStyles.caption, color: colors.inkMuted },
  fieldValue: { ...typeStyles.bodySmall, color: colors.ink, fontWeight: fontWeight.medium },

  segment: { flexDirection: 'row', backgroundColor: '#F3F8F6', borderRadius: radius.md, padding: 3 },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: radius.sm },
  segItemOn: { backgroundColor: colors.surfie },
  segText: { ...typeStyles.status, color: colors.inkMuted },
  segTextOn: { color: colors.white },

  summaryRow: { flexDirection: 'row', gap: 6 },
  summaryCard: { flex: 1, borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.md, padding: spacing.sm },
  summaryLabel: { ...typeStyles.caption, color: colors.inkMuted },
  summaryValue: { ...typeStyles.metricSmall, color: colors.ink },

  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successSoft,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  noteText: { ...typeStyles.caption, flex: 1, color: colors.ink },
});

export default AssignFollowUpPlanScreen;
