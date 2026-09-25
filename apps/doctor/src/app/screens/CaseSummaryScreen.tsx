import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, Button } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { NoteInput, Notice } from '../../components/clinical';
import { confirm } from '../../components/confirm';
import { toast } from '../../components/Toast';
import { useStore } from '../../state/store';
import { selectDoctor, selectRecord } from '../../state/selectors';
import { setSummary, submitSummary } from '../../state/actions';
import { detailFor, type Appointment } from '../../data/doctor';
import {
  CASE_SUMMARY_MAX,
  CASE_SUMMARY_MIN,
  RISK_LABEL,
  canPrescribe,
  completionOf,
  type CompletionState,
} from '../../data/clinical';
import { pathwayByKey, reviewDateFor } from '../../data/followup';

/**
 * Case Summary — DOC-CLN-04, and the completion gate from DOC-CLN-06.
 *
 * The summary is the doctor's own words, typed here and saved to the record as
 * they write. The checklist is computed from the consultation's actual state:
 * each item links to the screen that completes it, and submitting stays
 * blocked until notes, the prescription and the follow-up plan are done.
 * Nothing written is discarded when the gate blocks.
 */
export const CaseSummaryScreen = ({
  appointment,
  onBack,
  onSubmitted,
  onOpenNotes,
  onOpenPrescription,
  onAssignPlan,
}: {
  appointment: Appointment;
  onBack: () => void;
  onSubmitted: () => void;
  onOpenNotes: () => void;
  onOpenPrescription: () => void;
  onAssignPlan: () => void;
}) => {
  const a = appointment;
  const d = detailFor(a);
  const doctor = useStore(selectDoctor);
  const record = useStore((st) => selectRecord(st, a.id));
  const completion = completionOf(record);
  const submitted = record.summaryStatus === 'submitted';
  const [attempted, setAttempted] = useState(false);

  const length = record.summary.trim().length;
  const longEnough = length >= CASE_SUMMARY_MIN;
  const prescriber = canPrescribe(doctor.professionalType);

  const checklist: { key: keyof CompletionState; label: string; done: boolean; fix?: () => void; fixLabel?: string }[] = [
    { key: 'notesFinalised', label: 'Clinical notes completed', done: completion.notesFinalised, fix: onOpenNotes, fixLabel: 'Open notes' },
    {
      key: 'outputFinalised',
      label: prescriber ? 'Prescription or advice finalised' : 'Advice & therapy plan finalised',
      done: completion.outputFinalised,
      fix: onOpenPrescription,
      fixLabel: prescriber ? 'Open prescription' : 'Open plan',
    },
    { key: 'followUpAssigned', label: 'Follow-up plan assigned', done: completion.followUpAssigned, fix: onAssignPlan, fixLabel: 'Assign plan' },
    { key: 'summarySubmitted', label: 'Case summary', done: submitted || longEnough },
  ];
  const outstanding = checklist.filter((c) => c.key !== 'summarySubmitted' && !c.done);
  const canSubmit = !submitted && longEnough && outstanding.length === 0;

  const submit = () => {
    setAttempted(true);
    if (!longEnough) {
      toast.show(`Write at least ${CASE_SUMMARY_MIN} characters`, 'error');
      return;
    }
    if (outstanding.length > 0) {
      toast.show(`Complete first: ${outstanding.map((o) => o.label.toLowerCase()).join(', ')}`, 'error');
      return;
    }
    confirm({
      title: 'Submit summary and complete?',
      message: `This closes ${a.name}'s consultation. Notes, prescription and summary become read-only.`,
      confirmLabel: 'Submit & complete',
      onConfirm: () => {
        submitSummary(a.id);
        toast.show('Consultation completed');
        onSubmitted();
      },
    });
  };

  const plan = record.plan ? pathwayByKey(record.plan.pathway) : undefined;

  return (
    <Screen
      testID="case-summary"
      header={
        <ScreenHeader
          onBack={onBack}
          title="Case Summary"
          subtitle={submitted ? `Submitted ${record.summarySubmittedAt ?? ''}`.trim() : 'Add a 3–5 line summary to complete this consultation.'}
        />
      }
      footer={
        submitted ? (
          <View style={s.doneFoot}>
            <Icon name="checkCircle" size={18} color={colors.surfie} filled />
            <Text style={s.doneFootText}>Consultation completed</Text>
          </View>
        ) : (
          <Button
            testID="submit-summary"
            label="Submit Summary & Complete"
            icon="arrowRight"
            iconRight
            onPress={submit}
            accessibilityHint={canSubmit ? undefined : 'Shows what is still needed before the consultation can be completed'}
          />
        )
      }
    >
      {/* ------------------------------ patient card ----------------------------- */}
      <View style={s.patient}>
        <View style={s.patientTop}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{a.initials}</Text>
          </View>
          <View style={s.flex}>
            <Text style={s.name}>{a.name}</Text>
            <Text style={s.meta}>
              {a.gender} · {a.age} years
            </Text>
            <Text style={s.metaId} selectable>
              Consultation ID: {d.consultationId}
            </Text>
          </View>
          <View style={s.specPill}>
            <Text style={s.specText}>Psychiatry</Text>
          </View>
        </View>

        <View style={s.patientFoot}>
          <View style={s.footCell}>
            <Text style={s.footLabel}>Diagnosis</Text>
            <Text testID="summary-diagnosis" style={s.footValue} numberOfLines={2}>
              {record.notes.diagnosis.trim() || 'Not recorded in notes'}
            </Text>
          </View>
          <View style={s.footRule} />
          <View style={s.footCell}>
            <Text style={s.footLabel}>Risk category</Text>
            {record.risk.category ? (
              <View style={[s.riskPill, record.risk.category === 'high' && s.riskPillHigh]}>
                <Text style={[s.riskPillText, record.risk.category === 'high' && s.riskPillTextHigh]}>
                  {RISK_LABEL[record.risk.category]}
                </Text>
              </View>
            ) : (
              <Text style={s.footValue}>Not assessed</Text>
            )}
          </View>
        </View>
      </View>

      {/* -------------------------------- summary -------------------------------- */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>Your summary</Text>
          <Text style={s.required}>{submitted ? 'Submitted' : '3–5 lines required'}</Text>
        </View>
        <Text style={s.helper}>
          Summarise the concern, relevant history, assessment, treatment or advice, risk level and follow-up plan.
        </Text>
        <View style={s.inputWrap}>
          <NoteInput
            testID="summary-input"
            value={record.summary}
            onChangeText={(v) => setSummary(a.id, v)}
            placeholder="Write your case summary here…"
            max={CASE_SUMMARY_MAX}
            minHeight={160}
            editable={!submitted}
            invalid={attempted && !longEnough}
            accessibilityLabel="Case summary"
          />
        </View>
        {!submitted && length > 0 && !longEnough && (
          <Text testID="summary-short" style={s.countHint}>
            {CASE_SUMMARY_MIN - length} more characters needed
          </Text>
        )}
        {!submitted && length > 0 && (
          <Text style={s.savedHint}>Draft saved as you type</Text>
        )}
      </View>

      {/* ------------------------------- checklist ------------------------------- */}
      <Text style={s.listTitle}>Completion checklist</Text>
      <View style={s.card}>
        {checklist.map((c, i) => (
          <View key={c.key} testID={`check-${c.key}`} style={[s.checkRow, i < checklist.length - 1 && s.checkBorder]}>
            <View style={[s.checkIcon, c.done ? s.checkIconDone : s.checkIconPending]}>
              <Icon name={c.done ? 'check' : 'alertCircle'} size={15} weight={c.done ? 3 : 1.8} color={c.done ? colors.surfie : colors.warn} />
            </View>
            <View style={s.flex}>
              <Text style={[s.checkText, !c.done && s.checkTextPending]}>{c.label}</Text>
              {c.key === 'followUpAssigned' && plan && record.plan && (
                <Text style={s.checkSub}>
                  {plan.label} · {record.plan.duration} days · review {reviewDateFor(record.plan.start, record.plan.duration)}
                </Text>
              )}
            </View>
            {c.done ? (
              <Text style={s.checkState}>Done</Text>
            ) : c.fix && !submitted ? (
              <Pressable
                testID={`fix-${c.key}`}
                onPress={c.fix}
                hitSlop={8}
                style={s.fixBtn}
                accessibilityRole="button"
                accessibilityLabel={c.fixLabel}
              >
                <Text style={s.fixText}>{c.fixLabel}</Text>
              </Pressable>
            ) : (
              <Text style={[s.checkState, s.checkStatePending]}>Pending</Text>
            )}
          </View>
        ))}
      </View>

      {attempted && outstanding.length > 0 && (
        <Notice testID="summary-blocked" tone="warn" icon="alertCircle">
          Still to do: {outstanding.map((o) => o.label.toLowerCase()).join(', ')}. Instant requests stay paused until this
          consultation is complete.
        </Notice>
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },

  patient: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  patientTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typeStyles.avatar, fontSize: 18, lineHeight: undefined, color: colors.surfie },
  name: { ...typeStyles.name, color: colors.ink },
  meta: { ...typeStyles.caption, color: colors.inkMuted },
  metaId: { ...typeStyles.caption, color: colors.inkFaint, marginTop: 2 },
  specPill: { backgroundColor: colors.successSoft, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 4 },
  specText: { ...typeStyles.caption, color: colors.surfie },
  patientFoot: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  footCell: { flex: 1, paddingRight: spacing.sm, gap: 3 },
  footRule: { width: 1, alignSelf: 'stretch', backgroundColor: colors.surface.line, marginRight: spacing.md },
  footLabel: { ...typeStyles.caption, color: colors.inkFaint },
  footValue: { ...typeStyles.bodySmall, color: colors.ink, fontWeight: fontWeight.semibold },
  riskPill: { alignSelf: 'flex-start', backgroundColor: colors.successSoft, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  riskPillHigh: { backgroundColor: colors.dangerSoft },
  riskPillText: { ...typeStyles.caption, color: colors.surfie, fontWeight: fontWeight.semibold },
  riskPillTextHigh: { color: colors.danger },

  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { ...typeStyles.cardTitle, color: colors.ink },
  required: { ...typeStyles.caption, color: colors.surfie },
  helper: { ...typeStyles.helper, color: colors.inkMuted, marginTop: 6 },
  inputWrap: { marginTop: spacing.md },
  countHint: { ...typeStyles.caption, color: colors.warn, marginTop: 6 },
  savedHint: { ...typeStyles.caption, color: colors.inkFaint, marginTop: 2 },

  listTitle: { ...typeStyles.sectionTitle, fontSize: 17, lineHeight: 23, color: colors.ink, marginHorizontal: spacing.lg, marginTop: spacing.xl },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52, paddingVertical: spacing.sm },
  checkBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  checkIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  checkIconDone: { backgroundColor: colors.successSoft },
  checkIconPending: { backgroundColor: colors.warnSoft },
  checkText: { ...typeStyles.body, color: colors.ink },
  checkTextPending: { color: colors.inkMuted },
  checkSub: { ...typeStyles.caption, color: colors.inkMuted },
  checkState: { ...typeStyles.caption, color: colors.surfie, fontWeight: fontWeight.semibold },
  checkStatePending: { color: colors.warn },
  fixBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.surfie,
  },
  fixText: { ...typeStyles.buttonSmall, color: colors.surfie },

  doneFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 52 },
  doneFootText: { ...typeStyles.button, color: colors.surfie },
});

export default CaseSummaryScreen;
