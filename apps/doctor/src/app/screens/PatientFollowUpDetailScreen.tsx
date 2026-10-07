import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import type { SafetyAlert } from '@coracure/api';
import { messageFor } from '@coracure/api/errors';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, Button, StatusPill } from '../../components/ui';
import { ScreenHeader, HeaderAction } from '../../components/ScreenHeader';
import { NoteInput } from '../../components/clinical';
import { ALERT_STATE_LABEL, ALERT_TYPE_LABEL, acknowledgeAlert, closeAlert, NOTE_LIMIT } from '../../data/safetyAlerts';
import { useCheckins, useFollowupPlan } from '../../data/followupPlan';

const STATUS_COLOR: Record<'green' | 'amber' | 'red', string> = {
  green: colors.paris,
  amber: '#E9A93B',
  red: colors.danger,
};

const CLOSE_NOTE_MIN = 10;

/**
 * Patient Follow-up Detail — Critical Findings.
 *
 * The real alert carries a `reason` in the patient's own words and nothing
 * more structured underneath it — there is no per-question breakdown to show.
 * The workflow is exactly the two steps the backend models: acknowledge, then
 * close with a note of what was done. Closing records an outcome; it does not
 * assert the underlying concern is resolved.
 */
export const PatientFollowUpDetailScreen = ({
  alert,
  onBack,
  onAcknowledged,
  onClosed,
  onMessage,
  onOpenConsultation,
  onDirtyChange,
}: {
  alert: SafetyAlert;
  onBack: () => void;
  onAcknowledged: () => void;
  onClosed: () => void;
  /** Opens this patient's chat thread. Absent when the consultation isn't one of this doctor's loaded days. */
  onMessage?: () => void;
  onOpenConsultation?: () => void;
  /** Reports an unsaved closing note so the route can ask before it is dropped. */
  onDirtyChange?: (dirty: boolean) => void;
}) => {
  const a = alert;
  const redFlag = a.alertType === 'red_flag';
  const fg = redFlag ? colors.danger : a.alertType === 'amber' || a.alertType === 'medication_side_effect' ? colors.warn : colors.surfie;
  const bg = redFlag ? colors.dangerSoft : a.alertType === 'amber' || a.alertType === 'medication_side_effect' ? colors.warnSoft : colors.successSoft;

  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const canClose = note.trim().length >= CLOSE_NOTE_MIN;
  const dirty = a.state === 'acknowledged' && note.trim().length > 0;
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const plan = useFollowupPlan(a.consultationId);
  const checkins = useCheckins(a.consultationId);

  const planDays = useMemo(() => {
    const starts = plan.data?.startsOn;
    const total = plan.data?.durationDays;
    if (!starts || !total) return [];
    const start = new Date(starts);
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const c = checkins.data?.find((r) => r.checkinDate.slice(0, 10) === iso);
      return { day: i + 1, iso, status: c?.status };
    });
  }, [plan.data?.startsOn, plan.data?.durationDays, checkins.data]);

  const [error, setError] = useState<string | undefined>();

  const acknowledge = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await acknowledgeAlert(a.id);
      onAcknowledged();
    } catch (e) {
      // left on screen — the error surfaces inline below, not as a toast that vanishes
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await closeAlert(a.id, note.trim());
      onClosed();
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  const footer =
    a.state === 'open' ? (
      <View>
        <Button testID="acknowledge" label="Acknowledge" icon="check" onPress={acknowledge} disabled={busy} />
        {!!error && <Text style={s.errorText}>{error}</Text>}
      </View>
    ) : a.state === 'acknowledged' ? (
      <View>
        <Button testID="save" label="Close & record outcome" icon="check" onPress={close} disabled={!canClose || busy} />
        <Text style={s.footNote}>Closing records what you did. It does not assert the concern is resolved.</Text>
        {!!error && <Text style={s.errorText}>{error}</Text>}
      </View>
    ) : undefined;

  return (
    <Screen
      testID="alert-detail"
      background={colors.white}
      header={
        <ScreenHeader
          onBack={onBack}
          inline
          title="Critical Findings"
          subtitle={a.patientName ?? a.patientInitials ?? undefined}
          right={onMessage ? <HeaderAction testID="open-chat" icon="message" label={`Message ${a.patientName ?? 'patient'}`} onPress={onMessage} /> : undefined}
        />
      }
      footer={footer}
    >
      {/* ------------------------------- 1. what -------------------------------- */}
      <View testID="alert-banner" style={[s.banner, { backgroundColor: bg, borderColor: fg }]}>
        <View style={s.bannerTop}>
          <View style={[s.severity, { backgroundColor: fg }]}>
            <Icon name={redFlag ? 'flag' : 'alertTriangle'} size={14} color={colors.white} />
            <Text style={s.severityText}>{ALERT_TYPE_LABEL[a.alertType].toUpperCase()}</Text>
          </View>
        </View>
        <Text style={[s.trigger, { color: fg }]}>{ALERT_TYPE_LABEL[a.alertType]}</Text>
        <Text style={s.patientLine}>
          {a.patientName ?? a.patientInitials} · {a.patientGender}, {a.patientAge ?? '—'} · {a.patientId}
        </Text>
        {a.reason ? (
          <View style={s.quote}>
            <Text style={s.quoteLabel}>In the patient&apos;s words</Text>
            <Text testID="alert-quote" style={s.quoteText}>
              &ldquo;{a.reason}&rdquo;
            </Text>
          </View>
        ) : (
          <Text style={s.quoteLabel}>No check-in was submitted.</Text>
        )}
      </View>

      {/* ------------------------------ what to do ---------------------------- */}
      {a.state === 'closed' ? (
        <View testID="alert-reviewed" style={[s.block, s.reviewedBox]}>
          <View style={s.reviewedHead}>
            <Icon name="checkCircle" size={18} color={colors.surfie} filled />
            <Text style={s.reviewedTitle}>Closed{a.closedAt ? ` · ${new Date(a.closedAt).toLocaleDateString()}` : ''}</Text>
          </View>
          {!!a.closingNote && <Text style={s.reviewedLine}>Note: {a.closingNote}</Text>}
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
          {onMessage && (
            <Button
              testID="message-now"
              label={`Message ${(a.patientName ?? 'patient').split(' ')[0]}`}
              icon="message"
              onPress={onMessage}
              variant={redFlag ? 'primary' : 'secondary'}
              style={s.messageBtn}
            />
          )}

          {a.state === 'open' ? (
            <Text style={s.helper}>Acknowledge this alert once you have seen it, then record what you did to close it.</Text>
          ) : (
            <>
              <Text style={s.fieldLabel}>What did you do?{redFlag ? ' (required)' : ''}</Text>
              <NoteInput
                testID="note"
                value={note}
                onChangeText={setNote}
                placeholder="What was discussed, safety plan, next contact…"
                max={NOTE_LIMIT}
                minHeight={72}
                accessibilityLabel="Closing note"
              />
            </>
          )}
        </View>
      )}

      {/* -------------------------------- context -------------------------------- */}
      <View style={s.block}>
        <Text style={s.blockTitle}>Follow-up plan</Text>
        {plan.data?.pathway ? (
          <View style={s.factRow}>
            <View style={s.fact}>
              <Text style={s.factLabel}>Pathway</Text>
              <Text style={s.factValue}>{plan.data.pathway.name}</Text>
            </View>
            <View style={s.fact}>
              <Text style={s.factLabel}>Day</Text>
              <Text style={s.factValue}>
                {plan.data.todayIsDay ?? '—'} of {plan.data.durationDays}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={s.helper}>No follow-up plan is assigned to this consultation.</Text>
        )}
        {onOpenConsultation && (
          <Pressable testID="open-consultation" onPress={onOpenConsultation} hitSlop={6} style={s.linkRow} accessibilityRole="button">
            <Text style={s.linkText}>Open the consultation record</Text>
            <Icon name="chevronRight" size={14} color={colors.surfie} />
          </Pressable>
        )}

        {planDays.length > 0 && (
          <>
            <Text style={[s.fieldLabel, s.historyLabel]}>Check-ins</Text>
            <View
              style={s.trend}
              accessible
              accessibilityLabel={`Check-in history: ${planDays.map((d) => `day ${d.day} ${d.status ?? 'no entry'}`).join(', ')}`}
            >
              {planDays.map((d) => (
                <View key={d.day} style={s.trendDay}>
                  <View style={[s.trendBar, { backgroundColor: d.status ? STATUS_COLOR[d.status] : '#E3E9E7' }]} />
                  <Text style={s.trendLabel}>D{d.day}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      <View style={s.statusFoot}>
        <StatusPill label={`Status: ${ALERT_STATE_LABEL[a.state]}`} tone={a.state === 'closed' ? 'success' : 'warn'} dot={false} />
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  footNote: { ...typeStyles.caption, color: colors.inkMuted, textAlign: 'center', marginTop: 6 },
  errorText: { ...typeStyles.caption, color: colors.danger, textAlign: 'center', marginTop: 6 },
  helper: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: spacing.sm },

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
  trigger: { ...typeStyles.sectionTitle, fontSize: 19, lineHeight: 25 },
  patientLine: { ...typeStyles.caption, color: colors.inkMuted },
  quote: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginTop: 4 },
  quoteLabel: { ...typeStyles.caption, color: colors.inkMuted },
  quoteText: { ...typeStyles.body, color: colors.ink, marginTop: 2 },

  block: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  blockTitle: { ...typeStyles.sectionTitle, fontSize: 16, lineHeight: 22, color: colors.ink },

  urgent: { ...typeStyles.bodySmall, color: colors.danger, marginTop: 4 },
  messageBtn: { marginTop: spacing.md },
  fieldLabel: { ...typeStyles.label, color: colors.ink, marginTop: spacing.lg, marginBottom: spacing.sm },

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
  trend: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  trendDay: { width: 28, alignItems: 'center', gap: 3 },
  trendBar: { width: '100%', height: 8, borderRadius: 4 },
  trendLabel: { ...typeStyles.caption, fontSize: 11, lineHeight: 14, color: colors.ink },

  statusFoot: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
});

export default PatientFollowUpDetailScreen;
