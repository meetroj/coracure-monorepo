import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon, type IconName } from '../../components/Icon';
import { Screen, StatusPill } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useStore } from '../../state/store';
import { selectAlerts, selectDoctor, selectRecord } from '../../state/selectors';
import { careResources, pathwayByKey, reviewDateFor, ALERT_CATEGORY } from '../../data/followup';
import { STAGE_LABEL, recordStage } from '../../data/clinical';
import { LIST_STATUS_LABEL } from '../../data/clarification';
import { isClinicallyComplete, modeLabel, type Appointment, type PatientCase } from '../../data/doctor';

/**
 * Case Detail — the complete consultation record behind one case (DR-11-01).
 *
 * This screen owns none of the clinical content. Each block summarises what
 * another module holds and opens that module, for this consultation only. A
 * block with nothing written yet says so plainly and offers the step that
 * fills it, because an unwritten record is exactly what the doctor needs to
 * see.
 */

const STATE_META: Record<PatientCase['state'], { label: string; tone: 'success' | 'warn' | 'neutral' }> = {
  complete: { label: 'Completed', tone: 'success' },
  pending: { label: 'Pending', tone: 'warn' },
  followUp: { label: 'Follow-up', tone: 'warn' },
  noShow: { label: 'No-show', tone: 'neutral' },
};

const RecordRow = ({
  icon,
  title,
  lines,
  chips,
  trailing,
  onPress,
  actionLabel,
  testID,
}: {
  icon: IconName;
  title: string;
  lines?: (string | null | undefined)[];
  chips?: string[];
  trailing?: React.ReactNode;
  onPress?: () => void;
  /** Shown instead of a chevron when the row starts something new. */
  actionLabel?: string;
  testID?: string;
}) => {
  const body = (
    <>
      <View style={s.rowIcon}>
        <Icon name={icon} size={17} color={colors.surfie} />
      </View>
      <View style={s.flex}>
        <View style={s.rowTitleLine}>
          <Text style={s.rowTitle} numberOfLines={1}>
            {title}
          </Text>
          {trailing}
        </View>
        {(lines ?? []).filter(Boolean).map((l) => (
          <Text key={l as string} style={s.rowLine} numberOfLines={2}>
            {l}
          </Text>
        ))}
        {!!chips?.length && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow} style={s.chipScroll}>
            {chips.map((c) => (
              <View key={c} style={s.chip}>
                <Text style={s.chipText} numberOfLines={1}>
                  {c}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      {onPress &&
        (actionLabel ? (
          <View style={s.rowAction}>
            <Text style={s.rowActionText}>{actionLabel}</Text>
          </View>
        ) : (
          <Icon name="chevronRight" size={16} color={colors.inkFaint} />
        ))}
    </>
  );

  if (!onPress) {
    return (
      <View testID={testID} style={s.row}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityLabel={actionLabel ? `${title}: ${actionLabel}` : title}
    >
      {body}
    </Pressable>
  );
};

export const CaseDetailScreen = ({
  patientCase,
  appointment,
  onBack,
  onOpenNotes,
  onOpenPrescription,
  onOpenSummary,
  onOpenAlert,
  onAssignPlan,
  onOpenClarification,
  onNewClarification,
  onOpenRecommended,
  onOpenDocuments,
  onOpenAppointment,
}: {
  patientCase: PatientCase;
  appointment: Appointment;
  onBack: () => void;
  onOpenNotes: () => void;
  onOpenPrescription: () => void;
  onOpenSummary: () => void;
  onOpenAlert: (alertId: string) => void;
  onAssignPlan: () => void;
  onOpenClarification: (clarificationId: string) => void;
  onNewClarification: () => void;
  onOpenRecommended: () => void;
  onOpenDocuments: () => void;
  onOpenAppointment: () => void;
}) => {
  const c = patientCase;
  const a = appointment;
  const doctor = useStore(selectDoctor);
  const record = useStore((st) => selectRecord(st, a.id));
  const alerts = useStore(selectAlerts).filter((al) => al.appointmentId === a.id);
  const clarification = useStore((st) =>
    record.clarificationId ? st.clarifications.find((x) => x.id === record.clarificationId) : undefined
  );
  const state = STATE_META[c.state];
  const complete = isClinicallyComplete(c);
  const noShow = c.state === 'noShow';
  const stage = recordStage(record, doctor.professionalType);

  const recommendedTitles = careResources.filter((r) => record.recommendations.ids.includes(r.id)).map((r) => r.title);
  const plan = record.plan ? pathwayByKey(record.plan.pathway) : undefined;
  const latestAlert = alerts[0];
  const lastUpdated = record.summarySubmittedAt ?? record.rxFinalisedAt ?? record.rxSavedAt ?? record.notesSavedAt;

  return (
    <Screen
      testID="case-detail"
      header={<ScreenHeader onBack={onBack} inline title={`${c.caseId} Case Detail`} subtitle="Complete consultation record" />}
    >
      {/* -------------------------------- patient -------------------------------- */}
      <Pressable
        testID="case-patient"
        onPress={onOpenAppointment}
        style={({ pressed }) => [s.patient, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${c.name}, open appointment details`}
      >
        <View style={s.patientTop}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{c.initials}</Text>
          </View>
          <View style={s.flex}>
            <Text style={s.caseRef} numberOfLines={1} selectable>
              {c.caseId} · {a.patientId}
            </Text>
            <Text style={s.name} numberOfLines={1}>
              {c.name}
            </Text>
            <Text style={s.meta}>
              {c.gender} · {c.age} years
            </Text>
          </View>
          <View style={s.patientRight}>
            <StatusPill testID="case-state" label={state.label} tone={state.tone} />
            <Text style={s.paidText}>{a.payment === 'paid' ? 'Paid' : a.payment === 'refunded' ? 'Refunded' : 'Not paid'}</Text>
          </View>
        </View>
        <View style={s.patientFoot}>
          <View style={s.footItem}>
            <Icon name="calendar" size={14} color={colors.surfie} />
            <Text style={s.footText} numberOfLines={1}>
              {c.dateLabel}
            </Text>
          </View>
          <View style={s.footRule} />
          <View style={s.footItem}>
            <Icon name={a.mode === 'audio' ? 'phone' : a.mode === 'inPerson' ? 'inPerson' : 'video'} size={14} color={colors.surfie} />
            <Text style={s.footText} numberOfLines={1}>
              {modeLabel[a.mode]}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* ---------------------------------- record -------------------------------- */}
      <RecordRow
        testID="row-audit"
        icon="shieldCheck"
        title="Record"
        lines={[
          `Treating doctor: ${doctor.name}`,
          noShow ? 'Patient did not join the consultation.' : `Status: ${STAGE_LABEL[stage]}`,
          lastUpdated ? `Last updated ${lastUpdated}` : undefined,
        ]}
      />

      {!noShow && (
        <>
          <RecordRow
            testID="row-notes"
            icon="stethoscope"
            title="Clinical Notes & Diagnosis"
            lines={[
              record.notes.complaint ? record.notes.complaint : 'Not yet written.',
              record.notes.diagnosis ? `Diagnosis: ${record.notes.diagnosis}` : undefined,
            ]}
            trailing={<StatusPill label={record.notesStatus === 'saved' ? 'Saved' : record.notesStatus === 'draft' ? 'Draft' : 'Empty'} tone={record.notesStatus === 'saved' ? 'success' : 'warn'} dot={false} />}
            onPress={onOpenNotes}
          />

          <RecordRow
            testID="row-prescription"
            icon="prescription"
            title={record.rxStatus === 'finalised' ? 'Prescription Issued' : 'Prescription'}
            lines={[
              record.rxStatus === 'finalised'
                ? `${record.medicines.length} medicine${record.medicines.length === 1 ? '' : 's'} · finalised ${record.rxFinalisedAt ?? ''}`
                : record.medicines.length
                  ? `${record.medicines.length} medicine${record.medicines.length === 1 ? '' : 's'} in draft`
                  : 'Not yet written.',
            ]}
            chips={record.medicines.map((m) => m.name)}
            onPress={onOpenPrescription}
          />

          <RecordRow
            testID="row-summary"
            icon="document"
            title="Case Summary"
            lines={[record.summaryStatus === 'submitted' ? record.summary : record.summary ? 'Draft in progress.' : 'Not yet submitted.']}
            onPress={onOpenSummary}
          />

          {plan && record.plan ? (
            <RecordRow
              testID="row-checkins"
              icon="heart"
              title="Follow-up Plan"
              lines={[
                `${plan.label} · ${record.plan.duration} days`,
                `Review ${reviewDateFor(record.plan.start, record.plan.duration)}`,
                latestAlert ? `Latest alert: ${ALERT_CATEGORY[latestAlert.category].label} — ${latestAlert.trigger}` : 'No alerts from check-ins.',
              ]}
              trailing={
                latestAlert ? (
                  <StatusPill
                    label={latestAlert.live.status === 'open' ? 'Open alert' : 'Reviewed'}
                    tone={latestAlert.live.status === 'open' ? (latestAlert.category === 'redFlag' ? 'danger' : 'warn') : 'success'}
                    dot={false}
                  />
                ) : undefined
              }
              onPress={latestAlert ? () => onOpenAlert(latestAlert.id) : complete ? undefined : onAssignPlan}
            />
          ) : (
            <RecordRow
              testID="row-checkins"
              icon="heart"
              title="Follow-up Plan"
              lines={['No plan assigned.']}
              onPress={complete ? undefined : onAssignPlan}
              actionLabel={complete ? undefined : 'Assign'}
            />
          )}

          {clarification ? (
            <RecordRow
              testID="row-clarification"
              icon="message"
              title="Clarification Thread"
              lines={[
                `${clarification.caseId} · ${LIST_STATUS_LABEL[clarification.status]}`,
                `${clarification.messages.length} message${clarification.messages.length === 1 ? '' : 's'} · ${clarification.lastActivity}`,
              ]}
              onPress={() => onOpenClarification(clarification.id)}
            />
          ) : (
            <RecordRow
              testID="row-clarification"
              icon="message"
              title="Clarification Thread"
              lines={['No clarification raised.']}
              onPress={onNewClarification}
              actionLabel="Ask expert"
            />
          )}

          <RecordRow
            testID="row-recommended"
            icon="sparkle"
            title="Recommended Resources"
            lines={[
              recommendedTitles.length
                ? `${recommendedTitles.length} recommended from the Care Hub`
                : 'Nothing recommended yet.',
            ]}
            chips={recommendedTitles}
            onPress={complete && recommendedTitles.length === 0 ? undefined : onOpenRecommended}
          />
        </>
      )}

      <RecordRow testID="row-documents" icon="folder" title="Patient Documents" lines={['Reports and files shared by the patient.']} onPress={onOpenDocuments} />

      <View style={s.footer}>
        <Icon name="lock" size={13} color={colors.surfie} />
        <Text style={s.footStrong} numberOfLines={1}>
          Visible only to your care team
        </Text>
        <View style={s.footRuleSmall} />
        <Text testID="case-closure" style={s.footFaint} numberOfLines={1}>
          {complete ? `Closed ${record.summarySubmittedAt ?? ''}`.trim() : noShow ? 'No-show' : 'Open · work outstanding'}
        </Text>
        <Icon
          name={complete ? 'checkCircle' : 'alertCircle'}
          size={15}
          color={complete ? colors.surfie : colors.warn}
          filled={complete}
        />
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.75 },

  patient: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.surface.mint,
    padding: spacing.md,
  },
  patientTop: { flexDirection: 'row', gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { ...typeStyles.avatar, fontSize: 18, lineHeight: undefined, color: colors.surfie },
  caseRef: { ...typeStyles.caption, color: colors.inkFaint },
  name: { ...typeStyles.name, color: colors.ink, marginTop: 1 },
  meta: { ...typeStyles.bodySmall, color: colors.inkMuted },
  patientRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  paidText: { ...typeStyles.caption, color: colors.inkMuted },
  patientFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  footItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0, paddingHorizontal: spacing.xs },
  footRule: { width: 1, height: 16, backgroundColor: colors.surface.line },
  footText: { ...typeStyles.bodySmall, color: colors.ink },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    minHeight: 64,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { ...typeStyles.cardTitle, fontSize: 14, flex: 1, color: colors.ink },
  rowLine: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },
  rowAction: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.surfie,
  },
  rowActionText: { ...typeStyles.buttonSmall, color: colors.surfie },
  chipScroll: { marginTop: spacing.sm, marginHorizontal: -2 },
  chipRow: { flexDirection: 'row', gap: 5, paddingHorizontal: 2 },
  chip: { backgroundColor: colors.surface.selected, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  chipText: { ...typeStyles.caption, fontSize: 11, lineHeight: 15, color: colors.surfie },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.selected,
  },
  footStrong: { ...typeStyles.caption, fontWeight: fontWeight.semibold, color: colors.ink, flexShrink: 1 },
  footRuleSmall: { width: 1, height: 16, backgroundColor: colors.surface.inputBorder },
  footFaint: { ...typeStyles.caption, color: colors.inkMuted, flex: 1 },
});

export default CaseDetailScreen;
