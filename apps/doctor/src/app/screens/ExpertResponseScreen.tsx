import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SelectField } from '../../components/form';
import { BottomSheet } from '../../components/BottomSheet';
import { confirm } from '../../components/confirm';
import { Field, CheckRow, ShieldNote, SectionTitle, SummaryRow, GhostButton, SolidButton } from '../../components/compact';
import { useStore } from '../../state/store';
import { selectDoctor } from '../../state/selectors';
import { nowLabel } from '../../state/actions';
import {
  experts,
  OUTCOMES,
  DECISION_MAX,
  LIST_STATUS_LABEL,
  RESPONSE_TYPE_LABEL,
  type Clarification,
} from '../../data/clarification';

/**
 * Expert Response (DOC-CAS-05) — the treating doctor reads the guidance and
 * decides.
 *
 * A document to read, not a dashboard: the guidance sits in open reading
 * space. The decision is one real dropdown and one note. Nothing here writes
 * to the patient record — the doctor remains responsible for the care
 * decision, and the confirmation says so rather than implying it.
 */
export const ExpertResponseScreen = ({
  clarification,
  onBack,
  onDecide,
  onDirtyChange,
}: {
  clarification: Clarification;
  onBack: () => void;
  /** Records the decision; `close` also closes the thread. */
  onDecide: (outcome: string, note: string, close: boolean) => void;
  /** Reports an unsaved decision so the route can ask before it is dropped. */
  onDirtyChange?: (dirty: boolean) => void;
}) => {
  const c = useStore((st) => st.clarifications.find((x) => x.id === clarification.id)) ?? clarification;
  const doctor = useStore(selectDoctor);
  const guidance = c.guidance;
  const expert = experts[c.expertId];
  const [start] = useState(() => ({ outcome: c.outcome?.value ?? '', note: c.outcome?.note ?? '' }));
  const [outcome, setOutcome] = useState(start.outcome);
  const [note, setNote] = useState(start.note);
  const [confirmed, setConfirmed] = useState(false);
  const [sheet, setSheet] = useState<'case' | 'files' | null>(null);
  const ready = confirmed && !!outcome;
  const dirty = outcome !== start.outcome || note !== start.note;
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  return (
    <Screen
      testID="expert-response"
      background={colors.white}
      header={<ScreenHeader onBack={onBack} inline title="Expert Response" subtitle={c.caseId} />}
      footer={
        <View style={s.footRow}>
          <GhostButton testID="keep-open" label="Save, keep open" disabled={!ready} onPress={() => onDecide(outcome, note.trim(), false)} />
          <SolidButton
            testID="close-thread"
            label="Save & close"
            disabled={!ready}
            onPress={() =>
              confirm({
                title: 'Close this clarification?',
                message: 'Your decision is recorded and the discussion is kept for audit.',
                confirmLabel: 'Close thread',
                onConfirm: () => onDecide(outcome, note.trim(), true),
              })
            }
          />
        </View>
      }
    >
      <View style={s.body}>
        <View style={s.caseBlock}>
          <View style={s.caseTop}>
            <View style={s.flex}>
              <Text style={s.caseId}>
                {c.caseId} • Psychiatry
              </Text>
              <Text style={s.caseTitle}>{c.title}</Text>
            </View>
            <View style={s.greenBadge}>
              <Icon name="checkCircle" size={13} color={colors.surfie} filled />
              <Text style={s.greenText}>{LIST_STATUS_LABEL[c.status]}</Text>
            </View>
          </View>
          <Text style={s.caseMeta}>De-identified case{guidance ? ` • ${guidance.at}` : ''}</Text>
        </View>

        {guidance ? (
          <>
            <Text style={s.guidanceHead}>Guidance from {expert?.name ?? 'the expert'}</Text>
            <Text testID="guidance-body" style={s.guidanceBody}>
              {guidance.body}
            </Text>
            <Text style={s.guidanceMeta}>
              {RESPONSE_TYPE_LABEL[guidance.kind]} • {expert?.role ?? 'Expert'}
            </Text>
          </>
        ) : (
          <Text style={s.guidanceHead}>No guidance has been sent yet.</Text>
        )}

        <View style={s.linkRow}>
          <Pressable testID="shared-case" style={s.linkBtn} hitSlop={8} onPress={() => setSheet('case')} accessibilityRole="button">
            <Icon name="document" size={15} color={colors.surfie} />
            <Text style={s.linkText}>Shared case</Text>
          </Pressable>
          <View style={s.linkDivider} />
          <Pressable testID="attachments" style={s.linkBtn} hitSlop={8} onPress={() => setSheet('files')} accessibilityRole="button">
            <Icon name="clip" size={15} color={colors.surfie} />
            <Text style={s.linkText}>
              {c.shared.files.length} attachment{c.shared.files.length === 1 ? '' : 's'}
            </Text>
          </Pressable>
        </View>

        <View style={s.divider} />

        <SectionTitle>Your decision</SectionTitle>
        <SelectField
          testID="outcome"
          label="Outcome"
          required
          value={outcome}
          options={OUTCOMES}
          onChange={setOutcome}
          placeholder="Choose an outcome"
        />
        <Field
          testID="decision-note"
          value={note}
          onChangeText={setNote}
          placeholder="Record your decision or next step…"
          multiline
          height={84}
          max={DECISION_MAX}
          accessibilityLabel="Decision note"
        />

        <View style={s.divider} />

        <CheckRow testID="confirm" checked={confirmed} onToggle={() => setConfirmed((v) => !v)}>
          I reviewed the guidance and remain responsible for the final care decision.
        </CheckRow>

        <View style={s.closeNote}>
          <ShieldNote tone="grey" sub="Nothing is added to the patient record automatically.">
            Closing keeps the complete discussion and audit history.
          </ShieldNote>
        </View>

        <View style={[s.stamp, !confirmed && s.stampOff]}>
          <Icon name="user" size={14} color={colors.inkMuted} />
          <Text style={s.stampText}>
            Reviewed by {doctor.name} • Today, {nowLabel()}
          </Text>
        </View>
        <Text style={s.audit}>Reviewer and closure time will be recorded.</Text>
      </View>

      <BottomSheet visible={sheet === 'case'} title="Shared case" subtitle="Exactly what the expert received" onClose={() => setSheet(null)} testID="shared-case-sheet">
        <View style={s.sharedBox}>
          <SummaryRow label="Patient" value={`${c.shared.ageLabel} • ${c.shared.gender}`} />
          <SummaryRow label="History" value={c.shared.history} />
          <SummaryRow label="Provisional diagnosis" value={c.shared.provisionalDiagnosis} />
          <SummaryRow label="Current plan" value={c.shared.currentPlan} />
          <SummaryRow label="Question" value={c.shared.question} last />
        </View>
      </BottomSheet>
      <BottomSheet visible={sheet === 'files'} title="Attachments" onClose={() => setSheet(null)} testID="attachments-sheet">
        {c.shared.files.length === 0 ? (
          <Text style={s.noFiles}>No files were shared with this case.</Text>
        ) : (
          c.shared.files.map((f) => (
            <View key={f.id} style={s.fileRow}>
              <Icon name="document" size={16} color={colors.surfie} />
              <Text style={s.fileName}>{f.name}</Text>
              <Text style={s.fileSize}>{f.size}</Text>
            </View>
          ))
        )}
      </BottomSheet>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  body: { paddingHorizontal: spacing.lg },
  footRow: { flexDirection: 'row', gap: spacing.sm },

  caseBlock: { backgroundColor: '#E8F8F2', borderRadius: 10, padding: spacing.md },
  caseTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  caseId: { ...typeStyles.caption, color: colors.ink },
  caseTitle: { ...typeStyles.cardTitle, color: colors.ink, marginTop: 2 },
  greenBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D6F0E4', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  greenText: { ...typeStyles.caption, fontSize: 11, color: colors.surfie },
  caseMeta: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 5 },

  guidanceHead: { ...typeStyles.label, color: colors.ink, marginTop: spacing.lg },
  guidanceBody: { ...typeStyles.body, color: colors.ink, marginTop: 6 },
  guidanceMeta: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 40 },
  linkText: { ...typeStyles.buttonSmall, color: colors.surfie },
  linkDivider: { width: 1, height: 16, backgroundColor: colors.surface.line },
  divider: { height: 1, backgroundColor: colors.surface.line, marginTop: spacing.md },

  closeNote: { marginTop: spacing.md },
  stamp: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F4F6F5', borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm },
  stampOff: { opacity: 0.5 },
  stampText: { ...typeStyles.caption, color: colors.inkMuted },
  audit: { ...typeStyles.helper, color: colors.inkMuted, marginTop: 8 },

  sharedBox: { backgroundColor: '#F2F5F4', borderRadius: 10, paddingHorizontal: 10 },
  noFiles: { ...typeStyles.bodySmall, color: colors.inkMuted },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  fileName: { ...typeStyles.bodySmall, flex: 1, color: colors.ink },
  fileSize: { ...typeStyles.caption, color: colors.inkMuted },
});

export default ExpertResponseScreen;
