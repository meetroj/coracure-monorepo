import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

import type { FollowupPlan } from '@coracure/api';
import { ApiError, messageFor } from '@coracure/api/errors';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, Button } from '../../components/ui';
import { SkeletonRowList, SectionError } from '../../components/skeletons';
import { confirm } from '../../components/confirm';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Notice } from '../../components/clinical';
import { useStore } from '../../state/store';
import { selectRecord } from '../../state/selectors';
import { CalendarSheet } from '../../components/form';
import { reviewDateFor, planStartDefault } from '../../data/followup';
import { assignFollowup, cancelFollowup, useFollowupPlan, usePathways } from '../../data/followupPlan';
import { UUID, useClinicalRecordSync } from '../../data/clinicalRecord';
import { TODAY, fmtDate, fmtDayMonth, fromISODate, toISODate } from '../../data/calendar';
import type { FollowUpPlan } from '../../data/clinical';
import type { Appointment } from '../../data/doctor';

/**
 * Assign Follow-up Plan — for one consultation.
 *
 * A plan's length is fixed by its pathway, never chosen separately — the
 * backend has no independent duration field, so offering one here would ask
 * for a value the assign call cannot carry.
 *
 * A running plan can be stopped here too: the server marks it `cancelled`,
 * the daily check-ins stop, and the check-ins already answered stay on file.
 *
 * The backend starts a plan only on a finalised record (NOT_YET_DOCUMENTED
 * otherwise) — that is, after the case summary is submitted — so the screen
 * says so up front and again, in words, if the server refuses.
 */
export const AssignFollowUpPlanScreen = ({
  appointment,
  initialPlan,
  onBack,
  onAssign,
  onCancelled,
  onViewConsultation,
}: {
  appointment: Appointment;
  /** The plan already assigned, when re-opened to change it. */
  initialPlan?: FollowUpPlan;
  onBack: () => void;
  onAssign: (plan: FollowupPlan) => void;
  onCancelled?: () => void;
  onViewConsultation: () => void;
}) => {
  const a = appointment;
  const { data: pathways, showSkeleton, error, retry } = usePathways();
  const [picked, setPathwayCode] = useState<string | undefined>();
  const [pickedStart, setStart] = useState<string | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const current = useFollowupPlan(a.id, UUID.test(a.id));
  const running = current.data?.status === 'active';
  useClinicalRecordSync(a.id);
  const finalised = useStore((st) => selectRecord(st, a.id).summaryStatus === 'submitted');
  // The server's plan beats this device's memory of one.
  const serverPlan = current.data?.pathway ? current.data : undefined;
  const hasPlan = !!serverPlan || !!initialPlan;

  // Until the doctor picks: the server's plan, else the one assigned on this
  // device, else the first pathway in the catalogue.
  const pathwayCode =
    picked ??
    serverPlan?.pathway?.code ??
    (initialPlan ? pathways?.find((p) => p.name === initialPlan.pathway)?.code : undefined) ??
    pathways?.[0]?.code;
  const start = pickedStart ?? serverPlan?.startsOn ?? initialPlan?.start ?? planStartDefault();

  const selected = pathways?.find((p) => p.code === pathwayCode);
  const review = useMemo(() => (selected ? reviewDateFor(start, selected.durationDays) : undefined), [start, selected]);
  const startDate = fromISODate(start);

  const assign = async () => {
    if (!selected) return;
    setBusy(true);
    setSubmitError(undefined);
    try {
      // `a.id` is the real consultation id; `.consultationId` is the human
      // reference code shown on screen — the backend wants the former.
      const plan = await assignFollowup(a.id, { pathwayCode: selected.code, startsOn: start });
      onAssign(plan);
    } catch (e) {
      setSubmitError(
        ApiError.is(e) && e.code === 'NOT_YET_DOCUMENTED'
          ? 'Submit the case summary first — a follow-up plan can start only once the consultation record is finalised.'
          : messageFor(e)
      );
    } finally {
      setBusy(false);
    }
  };

  const stop = () =>
    confirm({
      title: 'Stop this follow-up plan?',
      message: 'The patient stops getting daily check-ins. Check-ins already answered stay on file.',
      confirmLabel: 'Stop plan',
      destructive: true,
      onConfirm: async () => {
        if (busy) return;
        setBusy(true);
        setSubmitError(undefined);
        try {
          await cancelFollowup(a.id);
          onCancelled?.();
        } catch (e) {
          setSubmitError(messageFor(e));
        } finally {
          setBusy(false);
        }
      },
    });

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
        <View>
          <Button
            testID="assign"
            label={hasPlan ? 'Update Follow-up Plan' : 'Assign Follow-up Plan'}
            icon="arrowRight"
            iconRight
            onPress={assign}
            disabled={!selected || busy}
          />
          {running && (
            <Button testID="stop-plan" label="Stop follow-up plan" variant="ghost" onPress={stop} disabled={busy} style={s.stopBtn} />
          )}
          {!!submitError && <Text style={s.errorText}>{submitError}</Text>}
        </View>
      }
    >
      <View style={s.body}>
        {!finalised && UUID.test(a.id) && (
          <Notice testID="plan-needs-summary" tone="warn" icon="alertCircle">
            A follow-up plan can start once the case summary is submitted and the record is finalised.
          </Notice>
        )}
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
        {showSkeleton ? (
          <SkeletonRowList rows={2} avatar="none" />
        ) : error ? (
          <SectionError testID="pathways-error" message="Could not load follow-up pathways." onRetry={retry} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tileRow}>
            {(pathways ?? []).map((p) => {
              const on = p.code === pathwayCode;
              return (
                <Pressable
                  key={p.code}
                  testID={`pathway-${p.code}`}
                  onPress={() => setPathwayCode(p.code)}
                  style={[s.tile, on && s.tileOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  {on && (
                    <View style={s.tileCheck}>
                      <Icon name="checkCircle" size={14} color={colors.surfie} filled />
                    </View>
                  )}
                  <Text style={[s.tileLabel, on && s.tileLabelOn]} numberOfLines={2}>
                    {p.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {selected && (
          <View style={s.infoPanel}>
            <View style={s.infoIcon}>
              <Icon name="brain" size={18} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={s.infoTitle}>{selected.name}</Text>
              <Text style={s.infoMeta}>{selected.durationDays}-day check-in plan</Text>
            </View>
          </View>
        )}

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
          <View style={s.dateField} accessible accessibilityLabel={`Review date, ${review ?? ''}`}>
            <Icon name="calendar" size={16} color={colors.surfie} />
            <View style={s.flex}>
              <Text style={s.fieldLabel}>Review date</Text>
              <Text testID="review-date" style={s.fieldValue}>
                {review ?? '—'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={s.h2}>Plan summary</Text>
        <View style={s.summaryRow}>
          {[
            { k: 'Starts', v: fmtDayMonth(startDate), id: 'summary-start' },
            { k: 'Check-ins', v: selected ? String(selected.durationDays) : '—', id: 'checkin-count' },
            { k: 'Review', v: review ? review.split(' ').slice(0, 2).join(' ') : '—', id: 'summary-review' },
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
  errorText: { ...typeStyles.caption, color: colors.danger, textAlign: 'center', marginTop: 6 },
  stopBtn: { marginTop: spacing.xs },

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
    width: 130,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    minHeight: 64,
  },
  tileOn: { borderColor: colors.surfie, backgroundColor: '#F4FBF8' },
  tileCheck: { position: 'absolute', top: 4, right: 4 },
  tileLabel: { ...typeStyles.caption, color: colors.inkMuted },
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
