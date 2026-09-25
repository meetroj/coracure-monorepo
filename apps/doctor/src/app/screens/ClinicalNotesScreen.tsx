import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon, type IconName } from '../../components/Icon';
import { Screen, Button } from '../../components/ui';
import { ScreenHeader, HeaderTextAction } from '../../components/ScreenHeader';
import { PatientStrip, Section, NoteInput, Notice } from '../../components/clinical';
import { toast } from '../../components/Toast';
import { useStore } from '../../state/store';
import { selectRecord } from '../../state/selectors';
import { saveNotes, setRisk, updateNote } from '../../state/actions';
import { detailFor, type Appointment } from '../../data/doctor';
import {
  NOTE_FIELDS,
  RISK_CATEGORIES,
  RISK_LABEL,
  missingNoteFields,
  type NoteKey,
} from '../../data/clinical';

/**
 * Clinical Notes & Diagnosis — DOC-CLN-01.
 *
 * Every field is a real input bound to this consultation's record. Each edit
 * is written to the record as it happens, and the header says when that last
 * happened — "Draft saved" is a statement about a save that took place, never
 * a label printed on arrival. Saving checks that every required field is
 * filled and names the ones that are not.
 *
 * Once the case summary is submitted the consultation is closed and the notes
 * are read-only (DR-11-01).
 */

const ICONS: Record<NoteKey, IconName> = {
  complaint: 'message',
  history: 'folder',
  observations: 'stethoscope',
  diagnosis: 'document',
  advice: 'heart',
  followUp: 'calendar',
};

export const ClinicalNotesScreen = ({
  appointment,
  onBack,
  onSaved,
  onViewProfile,
  onReferForClarification,
  onOpenCaseSummary,
}: {
  appointment: Appointment;
  onBack: () => void;
  /** After a successful save: the next step of the write-up. */
  onSaved: () => void;
  onViewProfile: () => void;
  onReferForClarification: () => void;
  onOpenCaseSummary: () => void;
}) => {
  const a = appointment;
  const d = detailFor(a);
  const record = useStore((st) => selectRecord(st, a.id));
  const readOnly = record.summaryStatus === 'submitted';
  const [closed, setClosed] = useState<string[]>([]);
  const [attempted, setAttempted] = useState(false);

  const missing = missingNoteFields(record.notes, record.risk);
  const toggle = (k: string) => setClosed((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  const isOpen = (k: string) => !closed.includes(k);

  const status = readOnly
    ? 'Completed · read-only'
    : record.notesStatus === 'saved'
      ? `Saved ${record.notesSavedAt ?? ''}`.trim()
      : record.notesStatus === 'draft'
        ? `Draft saved ${record.notesSavedAt ?? ''}`.trim()
        : 'Not started';

  const save = () => {
    setAttempted(true);
    if (missing.length > 0) {
      // reopen everything so the outlined fields are visible
      setClosed([]);
      toast.show(`Complete ${missing.length === 1 ? missing[0] : `${missing.length} required fields`} to save`, 'error');
      return;
    }
    saveNotes(a.id);
    toast.show('Clinical notes saved');
    onSaved();
  };

  const field = (key: NoteKey) => {
    const f = NOTE_FIELDS.find((x) => x.key === key)!;
    const value = record.notes[key];
    const invalid = attempted && f.required && !value.trim();
    return (
      <Section
        key={f.key}
        testID={`section-${f.key}`}
        icon={ICONS[f.key]}
        title={f.label}
        required={f.required}
        done={!!value.trim()}
        open={isOpen(f.key)}
        onToggle={() => toggle(f.key)}
        invalid={invalid}
      >
        <NoteInput
          testID={`note-${f.key}`}
          value={value}
          onChangeText={(v) => updateNote(a.id, f.key, v)}
          placeholder={f.placeholder}
          max={f.max}
          editable={!readOnly}
          invalid={invalid}
          accessibilityLabel={f.label}
        />
        {invalid && <Text style={s.fieldError}>{f.label} is required.</Text>}
      </Section>
    );
  };

  return (
    <Screen
      testID="clinical-notes"
      header={
        <ScreenHeader
          onBack={onBack}
          right={
            readOnly ? undefined : (
              <HeaderTextAction testID="refer-clarification" label="Refer" icon="message" onPress={onReferForClarification} />
            )
          }
        />
      }
      footer={
        readOnly ? (
          <Button testID="open-summary-footer" label="View case summary" variant="secondary" onPress={onOpenCaseSummary} />
        ) : (
          <Button testID="save-notes" label="Save notes & continue" icon="arrowRight" iconRight onPress={save} />
        )
      }
    >
      <View style={s.titleRow}>
        <Text style={s.title} accessibilityRole="header">
          Clinical Notes &amp; Diagnosis
        </Text>
        <View style={s.statusRow}>
          <Icon
            name={readOnly ? 'lock' : record.notesStatus === 'empty' ? 'pencil' : 'checkCircle'}
            size={13}
            color={record.notesStatus === 'empty' && !readOnly ? colors.inkFaint : colors.surfie}
            filled={record.notesStatus !== 'empty' && !readOnly}
          />
          <Text testID="notes-status" style={s.statusText}>
            {status}
          </Text>
        </View>
      </View>

      <PatientStrip
        initials={a.initials}
        name={a.name}
        meta={`${a.age} • ${a.gender} • ID: ${d.patientId}`}
        ids={[`Consultation ${d.consultationId} · ${a.dateLabel}`]}
        action="View Profile"
        onAction={onViewProfile}
      />

      {readOnly && (
        <Notice icon="lock">This consultation is complete. Notes are kept as they were submitted.</Notice>
      )}
      {attempted && missing.length > 0 && !readOnly && (
        <Notice testID="notes-missing" tone="danger" icon="alertCircle">
          Still required: {missing.join(', ')}.
        </Notice>
      )}

      {(['complaint', 'history', 'observations', 'diagnosis'] as NoteKey[]).map(field)}

      {/* --------------------------- risk assessment ----------------------------- */}
      <Section
        testID="section-risk"
        icon="shield"
        title="Risk Assessment"
        required
        done={!!record.risk.category}
        open={isOpen('risk')}
        onToggle={() => toggle('risk')}
        invalid={attempted && !record.risk.category}
      >
        <Text style={s.fieldLabel}>Risk category</Text>
        <View style={s.riskRow}>
          {RISK_CATEGORIES.map((r) => {
            const on = record.risk.category === r;
            return (
              <Pressable
                key={r}
                testID={`risk-${r}`}
                onPress={() => setRisk(a.id, { category: r })}
                disabled={readOnly}
                style={[s.risk, on && s.riskOn, on && r === 'high' && s.riskHigh]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on, disabled: readOnly }}
              >
                <Text style={[s.riskText, on && s.riskTextOn]}>{RISK_LABEL[r]}</Text>
              </Pressable>
            );
          })}
        </View>
        {attempted && !record.risk.category && <Text style={s.fieldError}>Choose a risk category.</Text>}
      </Section>

      {(['advice', 'followUp'] as NoteKey[]).map(field)}

      <Pressable
        testID="open-case-summary"
        onPress={onOpenCaseSummary}
        style={({ pressed }) => [s.summaryLink, pressed && s.pressed]}
        accessibilityRole="button"
      >
        <View style={s.summaryLinkIcon}>
          <Icon name="clip" size={16} color={colors.surfie} />
        </View>
        <View style={s.flex}>
          <Text style={s.summaryLinkText}>Case Summary</Text>
          <Text style={s.summaryLinkSub}>
            {record.summaryStatus === 'submitted' ? 'Submitted' : 'Written after the prescription is finalised'}
          </Text>
        </View>
        <Icon name="chevronRight" size={17} color={colors.inkFaint} />
      </Pressable>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },

  titleRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: 4 },
  title: { ...typeStyles.pageTitle, color: colors.ink },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusText: { ...typeStyles.caption, color: colors.inkMuted },

  fieldLabel: { ...typeStyles.label, color: colors.inkMuted, marginBottom: spacing.sm },
  fieldError: { ...typeStyles.caption, color: colors.danger, marginTop: 4 },
  riskRow: { flexDirection: 'row', gap: spacing.sm },
  risk: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  riskOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  riskHigh: { backgroundColor: colors.danger, borderColor: colors.danger },
  riskText: { ...typeStyles.status, color: colors.inkMuted },
  riskTextOn: { color: colors.white, fontWeight: fontWeight.semibold },

  summaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    minHeight: 60,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  summaryLinkIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLinkText: { ...typeStyles.cardTitle, color: colors.ink },
  summaryLinkSub: { ...typeStyles.caption, color: colors.inkMuted },
});

export default ClinicalNotesScreen;
