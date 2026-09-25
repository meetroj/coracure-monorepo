import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, Button, StatusPill } from '../../components/ui';
import { ScreenHeader, HeaderAction } from '../../components/ScreenHeader';
import { NoteInput } from '../../components/clinical';
import { useStore } from '../../state/store';
import { selectDoctor, type AlertView } from '../../state/selectors';
import { patientById } from '../../data/patients';
import {
  ALERT_ACTIONS,
  ALERT_CATEGORY,
  ALERT_STATUS,
  DAY_STATE,
  NOTE_LIMIT,
  actionsFor,
  alertCheckInLabel,
  pathwayByKey,
  type AlertAction,
  type DayState,
} from '../../data/followup';

const STATE_COLOR: Record<DayState, string> = {
  stable: colors.paris,
  attention: '#E9A93B',
  redFlag: colors.danger,
  pending: '#C9D4D0',
};

/**
 * Patient Follow-up Detail — Critical Findings.
 *
 * Read top to bottom the way a clinician triages:
 *   1. what happened — the alert, when, in the patient's own words;
 *   2. why it fired — the answers that triggered it;
 *   3. what to do — reach the patient, then record what was done;
 * with the plan and the week's check-ins underneath as context.
 *
 * Marking the alert reviewed records who acted, how and when. It does not
 * assert that the concern is resolved, and the screen says so.
 */
export const PatientFollowUpDetailScreen = ({
  alert,
  onBack,
  onReview,
  onMessage,
  onOpenConsultation,
}: {
  alert: AlertView;
  onBack: () => void;
  onReview: (action: AlertAction, note: string) => void;
  /** Opens this patient's chat thread. */
  onMessage: () => void;
  /** The consultation whose follow-up plan raised the alert. */
  onOpenConsultation: () => void;
}) => {
  const a = alert;
  const patient = patientById(a.patientId);
  const doctor = useStore(selectDoctor);
  const tone = ALERT_CATEGORY[a.category].tone;
  const fg = tone === 'danger' ? colors.danger : tone === 'warn' ? colors.warn : colors.surfie;
  const bg = tone === 'danger' ? colors.dangerSoft : tone === 'warn' ? colors.warnSoft : colors.successSoft;
  const options = actionsFor(a.category);
  const reviewed = a.live.status === 'reviewed' || a.live.status === 'escalated';
  const [action, setAction] = useState<AlertAction | null>(null);
  const [note, setNote] = useState('');
  const redFlag = a.category === 'redFlag';
  const flagged = a.responses.filter((r) => r.flagged);
  const pathway = pathwayByKey(a.pathway);
  // a red flag needs a written account of what was done
  const canSave = !!action && (!redFlag || note.trim().length >= 10);

  return (
    <Screen
      testID="alert-detail"
      background={colors.white}
      header={
        <ScreenHeader
          onBack={onBack}
          inline
          title="Critical Findings"
          subtitle={patient?.name}
          right={<HeaderAction testID="open-chat" icon="message" label={`Message ${patient?.name}`} onPress={onMessage} />}
        />
      }
      footer={
        reviewed ? undefined : (
          <View>
            <Button
              testID="save"
              label="Save & mark as reviewed"
              icon="check"
              onPress={() => action && onReview(action, note.trim())}
              disabled={!canSave}
              variant={redFlag ? 'secondary' : 'primary'}
            />
            <Text style={s.footNote}>Reviewing records your action. It does not close the safety concern.</Text>
          </View>
        )
      }
    >
      {/* ------------------------------- 1. what -------------------------------- */}
      <View testID="alert-banner" style={[s.banner, { backgroundColor: bg, borderColor: fg }]}>
        <View style={s.bannerTop}>
          <View style={[s.severity, { backgroundColor: fg }]}>
            <Icon name={redFlag ? 'flag' : 'alertTriangle'} size={14} color={colors.white} />
            <Text style={s.severityText}>{ALERT_CATEGORY[a.category].label.toUpperCase()}</Text>
          </View>
          <Text style={s.bannerTime}>{alertCheckInLabel(a)}</Text>
        </View>
        <Text style={[s.trigger, { color: fg }]}>{a.trigger}</Text>
        <Text style={s.patientLine}>
          {patient?.name} · {patient?.gender}, {patient?.age} · {a.patientId}
        </Text>
        {a.checkIn ? (
          <View style={s.quote}>
            <Text style={s.quoteLabel}>In the patient&apos;s words</Text>
            <Text testID="alert-quote" style={s.quoteText}>
              &ldquo;{a.checkIn}&rdquo;
            </Text>
          </View>
        ) : (
          <Text style={s.quoteLabel}>No check-in was submitted.</Text>
        )}
      </View>

      {/* -------------------------------- 2. why -------------------------------- */}
      {a.responses.length > 0 && (
        <View style={s.block}>
          <Text style={s.blockTitle}>{redFlag ? 'Answers triggering the red flag' : 'Check-in answers'}</Text>
          <Text style={s.blockSub}>
            Today&apos;s check-in · {flagged.length} {flagged.length === 1 ? 'answer' : 'answers'} flagged
          </Text>
          <View style={s.answers}>
            {a.responses.map((r, i) => (
              <View
                key={r.id}
                testID={`response-${r.id}`}
                style={[s.answerRow, i < a.responses.length - 1 && s.answerRule]}
                accessible
                accessibilityLabel={`${r.question} ${r.answer}${r.flagged ? ', flagged' : ''}`}
              >
                <View style={[s.answerIcon, r.flagged && { backgroundColor: bg }]}>
                  <Icon name={r.icon} size={14} color={r.flagged ? fg : colors.surfie} />
                </View>
                <Text style={s.answerQ}>{r.question}</Text>
                <Text style={[s.answerA, r.flagged && { color: fg }]}>{r.answer}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ------------------------------ 3. what to do ---------------------------- */}
      {reviewed ? (
        <View testID="alert-reviewed" style={[s.block, s.reviewedBox]}>
          <View style={s.reviewedHead}>
            <Icon name="checkCircle" size={18} color={colors.surfie} filled />
            <Text style={s.reviewedTitle}>
              {ALERT_STATUS[a.live.status]} {a.live.reviewedAt ? `· ${a.live.reviewedAt}` : ''}
            </Text>
          </View>
          {!!a.live.action && <Text style={s.reviewedLine}>Action: {ALERT_ACTIONS[a.live.action].label}</Text>}
          {!!a.live.note && <Text style={s.reviewedLine}>Note: {a.live.note}</Text>}
          <Text style={s.reviewedLine}>Recorded by {doctor.name}</Text>
        </View>
      ) : (
        <View style={s.block}>
          <Text style={s.blockTitle}>What to do now</Text>
          {redFlag && (
            <Text style={s.urgent}>
              Contact the patient now. If there is an immediate risk to life, advise emergency services (112) or the
              Tele-MANAS helpline (14416).
            </Text>
          )}
          <Button
            testID="message-now"
            label={`Message ${patient?.name.split(' ')[0] ?? 'patient'}`}
            icon="message"
            onPress={onMessage}
            variant={redFlag ? 'primary' : 'secondary'}
            style={s.messageBtn}
          />

          <Text style={s.fieldLabel}>What did you do?</Text>
          <View style={s.actionList}>
            {options.map((k) => {
              const on = action === k;
              return (
                <Pressable
                  key={k}
                  testID={`action-${k}`}
                  onPress={() => setAction(k)}
                  style={[s.actionRow, on && s.actionRowOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <Icon name={ALERT_ACTIONS[k].icon} size={17} color={on ? colors.surfie : colors.inkMuted} />
                  <Text style={[s.actionText, on && s.actionTextOn]}>{ALERT_ACTIONS[k].label}</Text>
                  <View style={[s.radio, on && s.radioOn]}>{on && <View style={s.radioDot} />}</View>
                </Pressable>
              );
            })}
          </View>

          <Text style={s.fieldLabel}>Doctor note{redFlag ? ' (required)' : ''}</Text>
          <NoteInput
            testID="note"
            value={note}
            onChangeText={setNote}
            placeholder={redFlag ? 'What was discussed, safety plan, next contact…' : 'Your observations about this check-in'}
            max={NOTE_LIMIT}
            minHeight={72}
            accessibilityLabel="Doctor note"
          />
        </View>
      )}

      {/* -------------------------------- context -------------------------------- */}
      <View style={s.block}>
        <Text style={s.blockTitle}>Follow-up plan</Text>
        <View style={s.factRow}>
          <View style={s.fact}>
            <Text style={s.factLabel}>Pathway</Text>
            <Text style={s.factValue}>{pathway?.label}</Text>
          </View>
          <View style={s.fact}>
            <Text style={s.factLabel}>Day</Text>
            <Text style={s.factValue}>
              {a.dayOf} of {a.dayTotal}
            </Text>
          </View>
          <View style={s.fact}>
            <Text style={s.factLabel}>Assigned to</Text>
            <Text style={s.factValue} numberOfLines={1}>
              You
            </Text>
          </View>
        </View>
        <Pressable
          testID="open-consultation"
          onPress={onOpenConsultation}
          hitSlop={6}
          style={s.linkRow}
          accessibilityRole="button"
        >
          <Text style={s.linkText}>Open the consultation record</Text>
          <Icon name="chevronRight" size={14} color={colors.surfie} />
        </Pressable>

        <Text style={[s.fieldLabel, s.historyLabel]}>Last {a.history.length} check-ins</Text>
        <View style={s.trend} accessible accessibilityLabel={`Check-in history: ${a.history.map((h) => `${h.label} ${DAY_STATE[h.state].label}`).join(', ')}`}>
          {a.history.map((h) => (
            <View key={h.day} style={s.trendDay}>
              <View style={[s.trendBar, { backgroundColor: STATE_COLOR[h.state] }]} />
              <Text style={s.trendLabel}>{h.label}</Text>
              <Text style={s.trendDate}>{h.date}</Text>
            </View>
          ))}
        </View>
        <View style={s.legend}>
          {(['stable', 'attention', 'redFlag', 'pending'] as DayState[]).map((k) => (
            <View key={k} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: STATE_COLOR[k] }]} />
              <Text style={s.legendText}>{DAY_STATE[k].label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.statusFoot}>
        <StatusPill label={`Status: ${ALERT_STATUS[a.live.status]}`} tone={reviewed ? 'success' : 'warn'} dot={false} />
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  footNote: { ...typeStyles.caption, color: colors.inkMuted, textAlign: 'center', marginTop: 6 },

  banner: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.md,
    gap: 6,
  },
  bannerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  severity: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  severityText: { ...typeStyles.caption, fontWeight: fontWeight.bold, color: colors.white, letterSpacing: 0.4 },
  bannerTime: { ...typeStyles.caption, color: colors.inkMuted },
  trigger: { ...typeStyles.sectionTitle, fontSize: 19, lineHeight: 25 },
  patientLine: { ...typeStyles.caption, color: colors.inkMuted },
  quote: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginTop: 4 },
  quoteLabel: { ...typeStyles.caption, color: colors.inkMuted },
  quoteText: { ...typeStyles.body, color: colors.ink, marginTop: 2 },

  block: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  blockTitle: { ...typeStyles.sectionTitle, fontSize: 16, lineHeight: 22, color: colors.ink },
  blockSub: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
  answers: { marginTop: spacing.sm, borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.md },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  answerRule: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  answerIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  answerQ: { ...typeStyles.bodySmall, flex: 1, color: colors.ink },
  answerA: { ...typeStyles.bodySmall, fontWeight: fontWeight.bold, color: colors.ink },

  urgent: { ...typeStyles.bodySmall, color: colors.danger, marginTop: 4 },
  messageBtn: { marginTop: spacing.md },
  fieldLabel: { ...typeStyles.label, color: colors.ink, marginTop: spacing.lg, marginBottom: spacing.sm },
  actionList: { gap: spacing.sm },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  actionRowOn: { borderColor: colors.surfie, backgroundColor: colors.surface.mintSoft },
  actionText: { ...typeStyles.body, flex: 1, color: colors.ink },
  actionTextOn: { fontWeight: fontWeight.semibold, color: colors.surfie },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.surface.inputBorder, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.surfie },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surfie },

  reviewedBox: { backgroundColor: colors.surface.mintSoft, borderRadius: radius.md, padding: spacing.md, gap: 4 },
  reviewedHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewedTitle: { ...typeStyles.cardTitle, color: colors.surfie },
  reviewedLine: { ...typeStyles.bodySmall, color: colors.ink },

  factRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  fact: { flex: 1, borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.md, padding: spacing.sm },
  factLabel: { ...typeStyles.caption, color: colors.inkMuted },
  factValue: { ...typeStyles.bodySmall, fontWeight: fontWeight.semibold, color: colors.ink },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 40, marginTop: 4 },
  linkText: { ...typeStyles.buttonSmall, color: colors.surfie },
  historyLabel: { marginTop: spacing.sm },
  trend: { flexDirection: 'row', gap: 4 },
  trendDay: { flex: 1, alignItems: 'center', gap: 3 },
  trendBar: { width: '100%', height: 8, borderRadius: 4 },
  trendLabel: { ...typeStyles.caption, fontSize: 11, lineHeight: 14, color: colors.ink },
  trendDate: { ...typeStyles.caption, fontSize: 11, lineHeight: 14, color: colors.inkFaint },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typeStyles.caption, fontSize: 11, color: colors.inkMuted },

  statusFoot: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
});

export default PatientFollowUpDetailScreen;
