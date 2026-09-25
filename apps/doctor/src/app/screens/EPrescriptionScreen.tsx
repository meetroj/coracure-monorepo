import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon, type IconName } from '../../components/Icon';
import { Screen } from '../../components/ui';
import { ScreenHeader, HeaderTextAction } from '../../components/ScreenHeader';
import { PatientStrip, Section, NoteInput, Notice } from '../../components/clinical';
import { ActionSheet } from '../../components/BottomSheet';
import { confirm } from '../../components/confirm';
import { toast } from '../../components/Toast';
import { MedicineSheet } from './MedicineSheet';
import { useStore } from '../../state/store';
import { selectDoctor, selectRecord } from '../../state/selectors';
import {
  addMedicine,
  finaliseRx,
  removeMedicine,
  saveRxDraft,
  setAdvice,
  setAllergies,
  setDonts,
  updateMedicine,
} from '../../state/actions';
import { detailFor, type Appointment } from '../../data/doctor';
import {
  ADVICE_ITEM_MAX,
  canPrescribe,
  outputLabel,
  PROFESSIONAL_LABEL,
  type Medicine,
  type ProfessionalType,
} from '../../data/clinical';

/**
 * E-Prescription & Advice — DOC-CLN-02.
 *
 * The medication section exists only for a professional whose type carries
 * prescribing permission; a psychologist, therapist or counsellor completes an
 * advice and therapy plan instead — a different document, not a disabled
 * version of this one.
 *
 * Everything here edits this consultation's record. Save Draft stamps it;
 * Finalise checks there is something to issue, asks, then locks the version.
 */

const HISTORY_MAX = 1000;

/* ------------------------------ medicine card ------------------------------ */

const MedicineCard = ({
  medicine,
  index,
  onMenu,
  locked,
}: {
  medicine: Medicine;
  index: number;
  onMenu: () => void;
  locked: boolean;
}) => (
  <View testID={`medicine-${medicine.id}`} style={s.med}>
    <View style={s.medHead}>
      <View style={s.medNum}>
        <Text style={s.medNumText}>{index + 1}</Text>
      </View>
      <View style={s.flex}>
        <Text style={s.medName}>{medicine.name}</Text>
        {!!medicine.generic && <Text style={s.medGeneric}>{medicine.generic}</Text>}
      </View>
      {!locked && (
        <Pressable
          testID={`med-menu-${medicine.id}`}
          onPress={onMenu}
          hitSlop={8}
          style={s.menuBtn}
          accessibilityRole="button"
          accessibilityLabel={`Options for ${medicine.name}`}
        >
          <Icon name="moreVertical" size={18} color={colors.inkMuted} />
        </Pressable>
      )}
    </View>

    <View style={s.medGrid}>
      {(
        [
          { label: 'Dose', value: medicine.dose, icon: 'prescription' },
          { label: 'Frequency', value: medicine.frequency, icon: 'clock' },
          { label: 'Duration', value: medicine.duration, icon: 'calendar' },
        ] as { label: string; value: string; icon: IconName }[]
      ).map((f) => (
        <View key={f.label} style={s.medCell}>
          <View style={s.medCellHead}>
            <Icon name={f.icon} size={12} color={colors.surfie} />
            <Text style={s.medCellLabel} numberOfLines={1}>
              {f.label}
            </Text>
          </View>
          <Text style={s.medCellValue}>{f.value || '—'}</Text>
        </View>
      ))}
    </View>
    <View style={[s.medGrid, s.medGridSecond]}>
      <View style={s.medCell}>
        <View style={s.medCellHead}>
          <Icon name="heart" size={12} color={colors.surfie} />
          <Text style={s.medCellLabel}>Take it</Text>
        </View>
        <Text style={s.medCellValue}>{medicine.route || '—'}</Text>
      </View>
      <View style={s.medCell}>
        <View style={s.medCellHead}>
          <Icon name="document" size={12} color={colors.surfie} />
          <Text style={s.medCellLabel}>Quantity</Text>
        </View>
        <Text style={s.medCellValue}>{medicine.quantity || '—'}</Text>
      </View>
    </View>
    {!!medicine.instruction && (
      <View style={[s.medCell, s.medInstruction]}>
        <View style={s.medCellHead}>
          <Icon name="message" size={12} color={colors.surfie} />
          <Text style={s.medCellLabel}>Instruction</Text>
        </View>
        <Text style={s.medCellValue}>{medicine.instruction}</Text>
      </View>
    )}
  </View>
);

/* ------------------------------- item editor ------------------------------- */

/** An editable bullet list: remove a line, add a line. */
const EditableList = ({
  items,
  onChange,
  addPlaceholder,
  testID,
  locked,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  addPlaceholder: string;
  testID: string;
  locked: boolean;
}) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft('');
  };
  return (
    <View style={s.list}>
      {items.length === 0 && <Text style={s.listEmpty}>Nothing added yet.</Text>}
      {items.map((it, i) => (
        <View key={`${i}-${it}`} style={s.listRow}>
          <View style={s.bulletDot} />
          <Text style={s.listText}>{it}</Text>
          {!locked && (
            <Pressable
              testID={`${testID}-remove-${i}`}
              onPress={() => onChange(items.filter((_, j) => j !== i))}
              hitSlop={10}
              style={s.listRemove}
              accessibilityRole="button"
              accessibilityLabel={`Remove: ${it}`}
            >
              <Icon name="close" size={14} color={colors.inkMuted} />
            </Pressable>
          )}
        </View>
      ))}
      {!locked && (
        <View style={s.addRow}>
          <TextInput
            testID={`${testID}-input`}
            value={draft}
            onChangeText={(t) => setDraft(t.slice(0, ADVICE_ITEM_MAX))}
            placeholder={addPlaceholder}
            placeholderTextColor={colors.inkFaint}
            style={s.addInput}
            onSubmitEditing={add}
            returnKeyType="done"
            accessibilityLabel={addPlaceholder}
          />
          <Pressable
            testID={`${testID}-add`}
            onPress={add}
            disabled={!draft.trim()}
            style={[s.addBtnSmall, !draft.trim() && s.off]}
            accessibilityRole="button"
            accessibilityLabel="Add line"
          >
            <Icon name="plus" size={16} color={colors.white} />
          </Pressable>
        </View>
      )}
    </View>
  );
};

/* --------------------------------- screen --------------------------------- */

export const EPrescriptionScreen = ({
  appointment,
  onBack,
  professionalType: typeProp,
  onFinalised,
  onLoadTemplate,
  onPreview,
  onRecommendResources,
  onOpenNotes,
}: {
  appointment: Appointment;
  onBack: () => void;
  professionalType?: ProfessionalType;
  /** After finalising: the next step, the case summary. */
  onFinalised: () => void;
  onLoadTemplate: () => void;
  onPreview: () => void;
  /** Opens the Care Hub picker for this consultation (DR-15-06). */
  onRecommendResources: () => void;
  onOpenNotes: () => void;
}) => {
  const a = appointment;
  const d = detailFor(a);
  const doctor = useStore(selectDoctor);
  const professionalType = typeProp ?? doctor.professionalType;
  const record = useStore((st) => selectRecord(st, a.id));
  const prescriber = canPrescribe(professionalType);
  const locked = record.rxStatus === 'finalised';

  const [sheet, setSheet] = useState<{ open: boolean; editing?: Medicine }>({ open: false });
  const [menuFor, setMenuFor] = useState<Medicine | null>(null);
  const [closed, setClosed] = useState<string[]>([]);
  const toggle = (k: string) => setClosed((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  const open = (k: string) => !closed.includes(k);
  const [ctaSize, setCtaSize] = useState({ w: 0, h: 0 });

  const medicines = prescriber ? record.medicines : [];
  const hasContent = medicines.length > 0 || record.advice.length > 0;
  const docLabel = outputLabel(professionalType);

  const finalise = () => {
    if (!hasContent) {
      toast.show(prescriber ? 'Add a medicine or an advice item first' : 'Add at least one advice item first', 'error');
      return;
    }
    confirm({
      title: `Finalise ${docLabel.toLowerCase()}?`,
      message: `${medicines.length ? `${medicines.length} medicine${medicines.length > 1 ? 's' : ''}, ` : ''}${record.advice.length} advice item${record.advice.length === 1 ? '' : 's'}. Once finalised it is locked and shared with ${a.name} as a PDF.`,
      confirmLabel: 'Finalise',
      onConfirm: () => {
        finaliseRx(a.id);
        toast.show(`${docLabel} finalised`);
        onFinalised();
      },
    });
  };

  const removeMed = (m: Medicine) =>
    confirm({
      title: `Remove ${m.name}?`,
      message: 'It will be taken off this prescription.',
      confirmLabel: 'Remove',
      destructive: true,
      onConfirm: () => {
        removeMedicine(a.id, m.id);
        toast.show(`${m.name} removed`, 'info');
      },
    });

  const savedLine = locked
    ? `Finalised ${record.rxFinalisedAt ?? ''}`.trim()
    : record.rxSavedAt
      ? `Draft saved ${record.rxSavedAt}`
      : 'Not saved yet';

  return (
    <Screen
      testID="prescription"
      header={
        <ScreenHeader
          onBack={onBack}
          inline
          title={prescriber ? 'E-Prescription' : 'Therapy Plan'}
          subtitle={savedLine}
          right={
            locked ? undefined : (
              <HeaderTextAction
                testID="save-draft"
                label="Save Draft"
                icon="document"
                onPress={() => {
                  saveRxDraft(a.id);
                  toast.show('Draft saved');
                }}
              />
            )
          }
        />
      }
      footer={
        locked ? (
          <Pressable
            testID="view-finalised"
            onPress={onPreview}
            style={({ pressed }) => [s.lockedCta, pressed && s.pressed]}
            accessibilityRole="button"
          >
            <Icon name="lock" size={16} color={colors.surfie} />
            <Text style={s.lockedCtaText}>Finalised · View patient PDF</Text>
          </Pressable>
        ) : (
          <Pressable
            testID="finalise"
            onPress={finalise}
            style={({ pressed }) => [s.cta, !hasContent && s.ctaOff, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityHint={hasContent ? undefined : 'Add a medicine or advice item first'}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setCtaSize((p) => (p.w === width && p.h === height ? p : { w: width, h: height }));
            }}
          >
            {/* Surfie → Paris: both brand greens, painted as SVG since RN has no gradient fill */}
            {ctaSize.w > 0 && (
              <Svg style={StyleSheet.absoluteFill} width={ctaSize.w} height={ctaSize.h}>
                <Defs>
                  <LinearGradient id="finaliseGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={colors.surfie} />
                    <Stop offset="0.8" stopColor={colors.paris} />
                    <Stop offset="1" stopColor={colors.paris} />
                  </LinearGradient>
                </Defs>
                <Rect x={0} y={0} width={ctaSize.w} height={ctaSize.h} fill="url(#finaliseGrad)" />
              </Svg>
            )}
            <View style={s.ctaContent}>
              <Text style={s.ctaText}>Finalise {docLabel}</Text>
              <View style={s.ctaLock}>
                <Icon name="lock" size={18} color={colors.surfie} />
              </View>
            </View>
          </Pressable>
        )
      }
    >
      <PatientStrip
        initials={a.initials}
        name={a.name}
        meta={`${a.gender} · ${a.age} years`}
        ids={[`Consultation ID: ${d.consultationId}`]}
      />

      {locked && (
        <Notice icon="lock" testID="rx-locked">
          Finalised {record.rxFinalisedAt}. This version is locked; the patient has the PDF.
        </Notice>
      )}

      <Section
        testID="section-complaint"
        icon="message"
        title="Presenting Complaint"
        open={open('complaint')}
        onToggle={() => toggle('complaint')}
      >
        <Text style={s.readText}>{record.notes.complaint || 'Not written yet.'}</Text>
        <Pressable testID="edit-in-notes" onPress={onOpenNotes} hitSlop={8} style={s.inlineLink} accessibilityRole="button">
          <Text style={s.inlineLinkText}>From clinical notes · Edit</Text>
          <Icon name="chevronRight" size={13} color={colors.surfie} />
        </Pressable>
      </Section>

      <Section
        testID="section-history-allergies"
        icon="folder"
        title="Diagnosis History & Allergies"
        open={open('history')}
        onToggle={() => toggle('history')}
      >
        <NoteInput
          testID="history-allergies"
          value={record.allergies}
          onChangeText={(v) => setAllergies(a.id, v)}
          placeholder="Past diagnoses, ongoing conditions and known allergies…"
          max={HISTORY_MAX}
          minHeight={64}
          editable={!locked}
          accessibilityLabel="Diagnosis history and allergies"
        />
      </Section>

      {!locked && (
        <>
          <Pressable
            testID="load-template"
            onPress={onLoadTemplate}
            style={({ pressed }) => [s.rowBtn, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Load from template"
          >
            <Icon name="notes" size={16} color={colors.surfie} />
            <Text style={s.rowBtnText}>Load from Template</Text>
            <Icon name="chevronRight" size={16} color={colors.inkFaint} />
          </Pressable>
          <Pressable
            testID="recommend-resources"
            onPress={onRecommendResources}
            style={({ pressed }) => [s.rowBtn, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Recommend Care Hub resources"
          >
            <Icon name="sparkle" size={16} color={colors.surfie} />
            <Text style={s.rowBtnText}>Recommend Resources</Text>
            {record.recommendations.ids.length > 0 && (
              <View style={s.countPill}>
                <Text style={s.countPillText}>{record.recommendations.ids.length}</Text>
              </View>
            )}
            <Icon name="chevronRight" size={16} color={colors.inkFaint} />
          </Pressable>
        </>
      )}

      {/* ------------------------------ medication ------------------------------- */}
      {prescriber ? (
        <>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Medications</Text>
            {!locked && (
              <Pressable
                testID="add-medicine"
                onPress={() => setSheet({ open: true })}
                hitSlop={8}
                style={({ pressed }) => [s.addBtn, pressed && s.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Add medicine"
              >
                <Icon name="plus" size={15} color={colors.surfie} />
                <Text style={s.addText}>Add Medicine</Text>
              </Pressable>
            )}
          </View>

          {medicines.length === 0 ? (
            <Notice tone="warn" icon="alertCircle" testID="no-medicines">
              No medicines added. Add at least one medicine or an advice item before finalising.
            </Notice>
          ) : (
            medicines.map((m, i) => (
              <MedicineCard key={m.id} medicine={m} index={i} locked={locked} onMenu={() => setMenuFor(m)} />
            ))
          )}
        </>
      ) : (
        <Notice testID="no-prescribe" icon="lock">
          Your professional type is {PROFESSIONAL_LABEL[professionalType]}, which does not include prescribing.
          Complete the advice and therapy plan below — it becomes the patient document for this consultation.
        </Notice>
      )}

      <Section
        testID="section-advice"
        icon="heart"
        title="Advice & Lifestyle Instructions"
        open={open('advice')}
        onToggle={() => toggle('advice')}
      >
        <EditableList
          testID="advice"
          items={record.advice}
          onChange={(next) => setAdvice(a.id, next)}
          addPlaceholder="Add advice for the patient"
          locked={locked}
        />
      </Section>

      <Section
        testID="section-warnings"
        icon="alertTriangle"
        title="Don'ts"
        open={open('warnings')}
        onToggle={() => toggle('warnings')}
      >
        <Text style={s.warnLead}>Seek urgent help if any of the following occur:</Text>
        <EditableList
          testID="donts"
          items={record.donts}
          onChange={(next) => setDonts(a.id, next)}
          addPlaceholder="Add a warning for the patient"
          locked={locked}
        />
      </Section>

      <View style={s.preview}>
        <View style={s.previewIcon}>
          <Icon name="document" size={15} color={colors.surfie} />
        </View>
        <View style={s.flex}>
          <Text style={s.previewTitle}>Patient PDF Preview</Text>
          <Text style={s.previewSub}>How the {docLabel.toLowerCase()} will read for the patient</Text>
        </View>
        <Pressable
          testID="preview-pdf"
          onPress={onPreview}
          style={({ pressed }) => [s.previewBtn, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Preview patient PDF"
        >
          <Text style={s.previewBtnText}>Preview</Text>
        </Pressable>
      </View>

      <MedicineSheet
        visible={sheet.open}
        initial={sheet.editing}
        onClose={() => setSheet({ open: false })}
        onSave={(m) => {
          if (sheet.editing) {
            updateMedicine(a.id, { ...m, id: sheet.editing.id });
            toast.show(`${m.name} updated`);
          } else {
            addMedicine(a.id, m);
            toast.show(`${m.name} added`);
          }
          setSheet({ open: false });
        }}
      />

      <ActionSheet
        visible={!!menuFor}
        title={menuFor?.name}
        onClose={() => setMenuFor(null)}
        testID="medicine-menu"
        actions={
          menuFor
            ? [
                { key: 'edit', label: 'Edit medicine', icon: 'pencil', onPress: () => setSheet({ open: true, editing: menuFor }) },
                { key: 'remove', label: 'Remove from prescription', icon: 'trash', destructive: true, onPress: () => removeMed(menuFor) },
              ]
            : []
        }
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.75 },
  off: { opacity: 0.4 },

  readText: { ...typeStyles.body, color: colors.ink },
  inlineLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing.sm, minHeight: 32 },
  inlineLinkText: { ...typeStyles.buttonSmall, color: colors.surfie },

  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  rowBtnText: { ...typeStyles.body, flex: 1, color: colors.surfie },
  countPill: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
  },
  countPillText: { ...typeStyles.caption, color: colors.surfie, fontWeight: fontWeight.semibold },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typeStyles.sectionTitle, fontSize: 16, lineHeight: 22, color: colors.ink },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.surfie,
  },
  addText: { ...typeStyles.buttonSmall, color: colors.surfie },

  med: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  medHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  medNum: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  medNumText: { ...typeStyles.number, fontSize: 15, color: colors.surfie },
  medName: { ...typeStyles.name, color: colors.ink },
  medGeneric: { ...typeStyles.caption, color: colors.inkFaint },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -spacing.sm },
  medGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  medGridSecond: { marginTop: spacing.sm },
  medCell: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: 10,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
  },
  medInstruction: { marginTop: spacing.sm, flex: 0 },
  medCellHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  medCellLabel: { ...typeStyles.caption, fontSize: 11, color: colors.inkFaint, flexShrink: 1 },
  medCellValue: { ...typeStyles.bodySmall, color: colors.ink, marginTop: 2 },

  list: { gap: spacing.sm },
  listEmpty: { ...typeStyles.caption, color: colors.inkMuted },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.paris, marginTop: 9 },
  listText: { ...typeStyles.bodySmall, flex: 1, color: colors.ink },
  listRemove: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  addInput: {
    ...typeStyles.inputSingle,
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    color: colors.ink,
  },
  addBtnSmall: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnLead: { ...typeStyles.caption, color: colors.danger, marginBottom: spacing.sm },

  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  previewIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  previewTitle: { ...typeStyles.cardTitle, color: colors.ink },
  previewSub: { ...typeStyles.caption, color: colors.inkMuted },
  previewBtn: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.surfie,
    flexShrink: 0,
  },
  previewBtnText: { ...typeStyles.buttonSmall, color: colors.surfie },

  cta: { height: 60, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.surfie },
  ctaOff: { opacity: 0.55 },
  ctaContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.lg, paddingRight: 6 },
  ctaLock: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ctaText: { ...typeStyles.button, flex: 1, textAlign: 'center', color: colors.white },
  lockedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 54,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.surfie,
  },
  lockedCtaText: { ...typeStyles.button, color: colors.surfie },
});

export default EPrescriptionScreen;
