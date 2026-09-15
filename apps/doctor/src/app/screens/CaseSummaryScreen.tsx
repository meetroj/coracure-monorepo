import { typeStyles, fontWeight } from '../../../../../libs/typography/src';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/ui';
import { detailFor, doctor, type Appointment } from '../../data/doctor';
import {
  CASE_SUMMARY_MAX,
  CASE_SUMMARY_MIN,
  RISK_LABEL,
  type CompletionState,
  type ProfessionalType,
  type RiskCategory,
} from '../../data/clinical';

/**
 * Case Summary — DOC-CLN-04, and the gate from DOC-CLN-06.
 *
 * The summary is mandatory: the consultation cannot be marked complete without
 * it. The checklist lists what is still outstanding rather than silently
 * refusing, and nothing entered is discarded when the gate blocks.
 *
 * Until the gate clears, new instant requests stay blocked.
 */

const SAMPLE =
  'Patient reports two weeks of persistent anxiety with disturbed sleep and racing thoughts at night, affecting concentration at work. No self-harm ideation elicited. Assessed as moderate risk. Started on low-dose SSRI with short-course night sedation, alongside sleep-routine and breathing guidance. Review in seven days, earlier if symptoms worsen.';

export const CaseSummaryScreen = ({
  appointment,
  onBack,
  professionalType = doctor.professionalType,
  completion = {
    notesFinalised: true,
    outputFinalised: true,
    followUpAssigned: true,
    summarySubmitted: false,
  },
  risk = 'moderate',
  diagnosis = 'Generalised Anxiety Disorder',
  onSubmit = () => undefined,
}: {
  appointment: Appointment;
  onBack: () => void;
  professionalType?: ProfessionalType;
  completion?: CompletionState;
  risk?: RiskCategory;
  diagnosis?: string;
  onSubmit?: (summary: string) => void;
}) => {
  const d = detailFor(appointment);
  const insets = useSafeAreaInsets();

  // Stands in for the text input until the app has an editor primitive.
  const [summary, setSummary] = useState('');

  const longEnough = summary.trim().length >= CASE_SUMMARY_MIN;
  const withinLimit = summary.length <= CASE_SUMMARY_MAX;
  const canSubmit = longEnough && withinLimit;

  const checklist: { key: keyof CompletionState; label: string; done: boolean }[] = [
    { key: 'notesFinalised', label: 'Clinical notes completed', done: completion.notesFinalised },
    { key: 'outputFinalised', label: 'Prescription or advice finalised', done: completion.outputFinalised },
    { key: 'followUpAssigned', label: 'Follow-up plan assigned', done: completion.followUpAssigned },
    { key: 'summarySubmitted', label: 'Case summary', done: canSubmit },
  ];

  return (
    <View style={s.root}>
      <Screen contentStyle={s.content}>
        <View style={s.bar}>
          <Pressable
            testID="back"
            onPress={onBack}
            hitSlop={8}
            style={s.barBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Icon name="arrowLeft" size={19} color={colors.ink} />
          </Pressable>
          <View style={s.barLogo}>
            <LogoWide width={100} height={25} />
          </View>
          <Pressable
            testID="notifications"
            onPress={() => undefined}
            hitSlop={8}
            style={s.barBtn}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Icon name="bell" size={18} color={colors.ink} />
          </Pressable>
        </View>

        <View style={s.titleWrap}>
          <Text style={[typeStyles.body, s.title]}>Case Summary</Text>
          <Text style={[typeStyles.body, s.subtitle]} numberOfLines={1}>
            Add a 3–5 line summary to complete this consultation.
          </Text>
        </View>

        {/* ------------------------------ patient card ----------------------------- */}
        <View style={s.patient}>
          <View style={s.patientTop}>
            <View style={s.avatar}>
              <Text style={[typeStyles.body, s.avatarText]}>{appointment.initials}</Text>
            </View>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.name]}>
                {appointment.name}
              </Text>
              <Text style={[typeStyles.body, s.meta]}>
                {appointment.gender} · {appointment.age} years
              </Text>
              <View style={s.idRow}>
                <Text style={[typeStyles.body, s.metaId]}>ID: {d.consultationId}</Text>
                <Pressable
                  testID="copy-consultation-id"
                  onPress={() => undefined}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Copy consultation ID"
                >
                  <Icon name="copy" size={12} color={colors.surfie} />
                </Pressable>
              </View>
            </View>
            <View style={s.specPill}>
              <Text style={[typeStyles.body, s.specText]}>Psychiatry</Text>
            </View>
          </View>

          <View style={s.patientFoot}>
            <View style={s.footCell}>
              <View style={s.footIcon}>
                <Icon name="document" size={15} color={colors.surfie} />
              </View>
              <View style={s.flex}>
                <Text style={[typeStyles.body, s.footLabel]}>Diagnosis</Text>
                <Text style={[typeStyles.body, s.footValue]} numberOfLines={1}>
                  {diagnosis}
                </Text>
              </View>
            </View>
            <View style={s.footRule} />
            <View style={s.footCell}>
              <View style={s.footIcon}>
                <Icon name="shieldCheck" size={15} color={risk === 'high' ? colors.danger : colors.surfie} />
              </View>
              <View style={s.flex}>
                <Text style={[typeStyles.body, s.footLabel]}>Risk category</Text>
                <View style={[s.riskPill, risk === 'high' && s.riskPillHigh]}>
                  <Text style={[typeStyles.body, s.riskPillText, risk === 'high' && s.riskPillTextHigh]}>
                    {RISK_LABEL[risk]}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* -------------------------------- summary -------------------------------- */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={[typeStyles.body, s.cardTitle]}>Case Summary</Text>
            <Text style={[typeStyles.body, s.required]}>3–5 lines required</Text>
          </View>
          <Text style={[typeStyles.body, s.helper]}>
            Summarise the concern, relevant history, assessment, treatment or advice provided, risk
            level and follow-up plan.
          </Text>

          <Pressable
            testID="summary-input"
            onPress={() => setSummary((v) => (v ? '' : SAMPLE))}
            style={[s.input, !!summary && s.inputFilled]}
            accessibilityRole="button"
            accessibilityLabel="Case summary"
          >
            <View style={s.inputTextRow}>
              <Icon name="pencil" size={15} color={colors.inkFaint} />
              <Text style={[typeStyles.body, [s.inputText, !summary && s.inputPlaceholder], s.flex]}>
                {summary || 'Write your case summary here...'}
              </Text>
            </View>

            <View style={s.countRow}>
              {!longEnough && summary.length > 0 && (
                <Text style={[typeStyles.body, s.countHint]}>At least {CASE_SUMMARY_MIN} characters</Text>
              )}
              <View style={s.flex} />
              <Text style={[typeStyles.body, [s.counter, !withinLimit && s.counterOver]]}>
                {summary.length}/{CASE_SUMMARY_MAX}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* ------------------------------- checklist ------------------------------- */}
        <Text style={[typeStyles.body, s.listTitle]}>Completion checklist</Text>
        <View style={s.card}>
          {checklist.map((c, i) => (
            <View
              key={c.key}
              testID={`check-${c.key}`}
              style={[s.checkRow, i < checklist.length - 1 && s.checkBorder]}
            >
              <View style={[s.checkIcon, c.done ? s.checkIconDone : s.checkIconPending]}>
                <Icon
                  name={c.done ? 'checkCircle' : 'alertCircle'}
                  size={15}
                  color={c.done ? colors.surfie : colors.warn}
                  filled={c.done}
                />
              </View>
              <Text style={[typeStyles.body, [s.checkText, !c.done && s.checkTextPending]]}>{c.label}</Text>
              <Text style={[typeStyles.body, [s.checkState, !c.done && s.checkStatePending]]}>
                {c.done ? 'Done' : 'Pending'}
              </Text>
            </View>
          ))}
        </View>
      </Screen>

      {/* -------------------------------- footer --------------------------------- */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          testID="submit-summary"
          onPress={() => canSubmit && onSubmit(summary)}
          disabled={!canSubmit}
          style={[s.cta, !canSubmit && s.ctaOff]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
        >
          <Text style={[typeStyles.body, s.ctaText]}>Submit Summary &amp; Complete</Text>
          <View style={[s.ctaArrow, !canSubmit && s.ctaArrowOff]}>
            <Icon name="arrowRight" size={18} color={colors.white} />
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },
  flex: { flex: 1 },
  // the footer is a sibling, not an overlay — nothing to scroll clear of
  content: { paddingBottom: spacing.md },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  barBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barLogo: { flex: 1, alignItems: 'center' },

  titleWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  title: { ...typeStyles.pageTitle, color: colors.ink },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 3 },

  patient: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  patientTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typeStyles.avatar, fontSize: 19, color: colors.surfie },
  name: { ...typeStyles.name, color: colors.ink },
  meta: { ...typeStyles.caption, color: colors.inkMuted },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  metaId: { ...typeStyles.caption, color: colors.inkFaint },
  specPill: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  specText: { ...typeStyles.caption, color: colors.surfie },
  patientFoot: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  footCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: spacing.sm },
  footIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footRule: { width: 1, alignSelf: 'stretch', backgroundColor: colors.surface.line, marginRight: spacing.md },
  footLabel: { ...typeStyles.label, color: colors.inkFaint },
  footValue: { ...typeStyles.bodySmall, color: colors.ink, marginTop: 2, fontWeight: fontWeight.semibold },
  riskPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: 3,
  },
  riskPillHigh: { backgroundColor: colors.dangerSoft },
  riskPillText: { ...typeStyles.caption, color: colors.surfie },
  riskPillTextHigh: { color: colors.danger },

  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { ...typeStyles.cardTitle, color: colors.ink },
  required: { ...typeStyles.caption, color: colors.surfie },
  helper: { ...typeStyles.helper, color: colors.inkMuted, marginTop: 6 },
  input: {
    minHeight: 180,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    backgroundColor: colors.white,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  inputFilled: { backgroundColor: colors.surface.mintSoft },
  inputTextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  inputText: { ...typeStyles.input, color: colors.ink },
  inputPlaceholder: { color: colors.inkFaint },
  countRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  countHint: { ...typeStyles.number, color: colors.warn },
  counter: { ...typeStyles.number, color: colors.inkFaint },
  counterOver: { color: colors.danger, fontWeight: fontWeight.semibold },

  listTitle: { ...typeStyles.sectionTitle, color: colors.ink, marginHorizontal: spacing.lg, marginTop: spacing.xl },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 11 },
  checkBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconDone: { backgroundColor: colors.successSoft },
  checkIconPending: { backgroundColor: colors.warnSoft },
  checkText: { ...typeStyles.body, flex: 1, color: colors.ink },
  checkTextPending: { color: colors.inkMuted },
  checkState: { ...typeStyles.caption, color: colors.surfie },
  checkStatePending: { color: colors.warn },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    paddingLeft: spacing.lg,
    paddingRight: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfie,
  },
  ctaOff: { backgroundColor: colors.inkFaint },
  ctaText: { ...typeStyles.button, flex: 1, textAlign: 'center', color: colors.white },
  ctaArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.paris,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaArrowOff: { backgroundColor: 'rgba(255,255,255,0.24)' },
});

export default CaseSummaryScreen;
