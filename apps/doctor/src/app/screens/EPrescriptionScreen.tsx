import { typeStyles } from '../../../../../libs/typography/src';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon, type IconName } from '../../components/Icon';
import { Screen } from '../../components/ui';
import { PatientStrip, Section, Bullets, Notice } from '../../components/clinical';
import { detailFor, doctor, type Appointment } from '../../data/doctor';
import {
  canPrescribe,
  draftMedicines,
  adviceItems,
  warningSigns,
  outputLabel,
  PROFESSIONAL_LABEL,
  type Medicine,
  type ProfessionalType,
} from '../../data/clinical';

/**
 * E-Prescription & Advice — DOC-CLN-02.
 *
 * The medication section exists only for a professional whose type carries
 * prescribing permission. A psychologist, therapist or counsellor never sees a
 * medicine field: they get an Advice & Therapy Plan instead, which is a
 * different document, not a disabled version of this one.
 *
 * Finalising locks the version and generates the access-controlled patient
 * PDF, linked to the consultation.
 */

const MedicineCard = ({
  medicine,
  index,
  onEdit,
  onDelete,
}: {
  medicine: Medicine;
  index: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) => (
  <View style={s.med}>
    <View style={s.medHead}>
      <View style={s.medNum}>
        <Text style={[typeStyles.body, s.medNumText]}>{index + 1}</Text>
      </View>
      <View style={s.flex}>
        <Text style={[typeStyles.body, s.medName]}>
          {medicine.name}
        </Text>
        <Text style={[typeStyles.body, s.medGeneric]}>
          {medicine.generic}
        </Text>
      </View>
      <Pressable
        onPress={() => onEdit(medicine.id)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${medicine.name}`}
      >
        <Icon name="moreVertical" size={16} color={colors.inkFaint} />
      </Pressable>
    </View>

    {/* Each value is its own bordered tile, led by an icon. */}
    <View style={s.medGrid}>
      {([
        { label: 'Dose', value: medicine.dose, icon: 'prescription' },
        { label: 'Frequency', value: medicine.frequency, icon: 'clock' },
        { label: 'Duration', value: medicine.duration, icon: 'calendar' },
      ] as { label: string; value: string; icon: IconName }[]).map((f) => (
        <View key={f.label} style={s.medCell}>
          <View style={s.medCellHead}>
            <Icon name={f.icon} size={12} color={colors.surfie} />
            <Text style={[typeStyles.body, s.medCellLabel]} numberOfLines={1}>{f.label}</Text>
          </View>
          <Text style={[typeStyles.body, s.medCellValue]}>{f.value}</Text>
        </View>
      ))}
    </View>

    {/* Delete sits at the bottom, beside the instruction tile. */}
    <View style={s.medFoot}>
      <View style={[s.medCell, s.flex]}>
        <View style={s.medCellHead}>
          <Icon name="message" size={12} color={colors.surfie} />
          <Text style={[typeStyles.body, s.medCellLabel]}>Instruction (optional)</Text>
        </View>
        <Text style={[typeStyles.body, s.medCellValue]}>{medicine.instruction}</Text>
      </View>
      <Pressable
        testID={`delete-${medicine.id}`}
        onPress={() => onDelete(medicine.id)}
        hitSlop={8}
        style={s.medDelete}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${medicine.name}`}
      >
        <Icon name="trash" size={15} color={colors.danger} />
      </Pressable>
    </View>
  </View>
);

export const EPrescriptionScreen = ({
  appointment,
  onBack,
  professionalType = doctor.professionalType,
  onSaveDraft = () => undefined,
  onFinalise = () => undefined,
  onLoadTemplate = () => undefined,
  onPreviewPdf = () => undefined,
  onRecommendResources = () => undefined,
  recommendedCount = 0,
}: {
  appointment: Appointment;
  onBack: () => void;
  professionalType?: ProfessionalType;
  onSaveDraft?: () => void;
  onFinalise?: () => void;
  onLoadTemplate?: () => void;
  onPreviewPdf?: () => void;
  /** Opens the Care Hub picker for this consultation (DR-15-06). */
  onRecommendResources?: () => void;
  /** How many resources are already recommended, shown as a badge. */
  recommendedCount?: number;
}) => {
  const d = detailFor(appointment);
  const insets = useSafeAreaInsets();
  const prescriber = canPrescribe(professionalType);

  const [medicines, setMedicines] = useState<Medicine[]>(prescriber ? draftMedicines : []);
  // Both sections start expanded — the doctor fills them in every time.
  const [open, setOpen] = useState<string[]>(['advice', 'warnings']);
  /** Measured CTA size — percentage widths left a sliver of the fill uncovered. */
  const [ctaSize, setCtaSize] = useState({ w: 0, h: 0 });
  const toggle = (k: string) =>
    setOpen((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]));

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
          <Text style={[typeStyles.body, s.title]} numberOfLines={1}>
            {prescriber ? 'E-Prescription' : 'Therapy Plan'}
          </Text>
          <Pressable
            testID="save-draft"
            onPress={onSaveDraft}
            hitSlop={8}
            style={s.draftBtn}
            accessibilityRole="button"
            accessibilityLabel="Save draft"
          >
            <Icon name="document" size={14} color={colors.surfie} />
            <Text style={[typeStyles.body, s.draftText]}>Save Draft</Text>
          </Pressable>
        </View>

        <PatientStrip
          initials={appointment.initials}
          name={appointment.name}
          meta={`${appointment.gender} · ${appointment.age} years`}
          ids={[`Consultation ID: ${d.consultationId}`]}
        />

        <Pressable
          testID="load-template"
          onPress={onLoadTemplate}
          style={({ pressed }) => [s.template, pressed && s.templatePressed]}
          accessibilityRole="button"
          accessibilityLabel="Load from template"
        >
          <Icon name="notes" size={16} color={colors.surfie} />
          <Text style={[typeStyles.body, s.templateText]}>Load from Template</Text>
          <Icon name="chevronRight" size={16} color={colors.inkFaint} />
        </Pressable>

        {/* DR-15-06: self-help belongs with the advice, so it is picked here
            rather than being a destination the doctor goes looking for. */}
        <Pressable
          testID="recommend-resources"
          onPress={onRecommendResources}
          style={({ pressed }) => [s.template, pressed && s.templatePressed]}
          accessibilityRole="button"
          accessibilityLabel="Recommend Care Hub resources"
        >
          <Icon name="sparkle" size={16} color={colors.surfie} />
          <Text style={[typeStyles.body, s.templateText]}>Recommend Resources</Text>
          {recommendedCount > 0 && (
            <View style={s.countPill}>
              <Text style={[typeStyles.body, s.countPillText]}>{recommendedCount}</Text>
            </View>
          )}
          <Icon name="chevronRight" size={16} color={colors.inkFaint} />
        </Pressable>

        {/* ------------------------------ medication ------------------------------- */}
        {prescriber ? (
          <>
            <View style={s.sectionHead}>
              <Text style={[typeStyles.body, s.sectionTitle]}>Medications</Text>
              <Pressable
                testID="add-medicine"
                hitSlop={8}
                style={s.addBtn}
                accessibilityRole="button"
                accessibilityLabel="Add medicine"
              >
                <Icon name="plus" size={14} color={colors.surfie} />
                <Text style={[typeStyles.body, s.addText]}>Add Medicine</Text>
              </Pressable>
            </View>

            {medicines.length === 0 ? (
              <Notice tone="warn" icon="alertCircle">
                No medicines added. A prescription needs at least one entry, or complete an advice
                plan instead.
              </Notice>
            ) : (
              medicines.map((m, i) => (
                <MedicineCard
                  key={m.id}
                  medicine={m}
                  index={i}
                  onEdit={() => undefined}
                  onDelete={(id) => setMedicines((list) => list.filter((x) => x.id !== id))}
                />
              ))
            )}
          </>
        ) : (
          <Notice testID="no-prescribe" icon="lock">
            Your professional type is {PROFESSIONAL_LABEL[professionalType]}, which does not include
            prescribing. Complete the advice and therapy plan below — it becomes the patient
            document for this consultation.
          </Notice>
        )}

        {/* ------------------------------- sections -------------------------------- */}
        {/* No `required` prop — the badge is gone from every section. */}
        <Section
          testID="section-advice"
          icon="heart"
          title="Advice & Lifestyle Instructions"
          open={open.includes('advice')}
          onToggle={() => toggle('advice')}
        >
          <Bullets items={adviceItems} />
        </Section>

        <Section
          testID="section-warnings"
          icon="alertTriangle"
          title="Warning Signs"
          open={open.includes('warnings')}
          onToggle={() => toggle('warnings')}
        >
          <Text style={[typeStyles.body, s.warnLead]}>Seek urgent help if any of the following occur:</Text>
          <Bullets items={warningSigns} />
        </Section>

        <View style={s.preview}>
          <View style={s.previewIcon}>
            <Icon name="document" size={15} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={[typeStyles.body, s.previewTitle]}>Patient PDF Preview</Text>
            <Text style={[typeStyles.body, s.previewSub]}>
              Preview how the prescription will appear
            </Text>
          </View>
          {/* An explicit button rather than a chevron — the action is named. */}
          <Pressable
            testID="preview-pdf"
            onPress={onPreviewPdf}
            style={({ pressed }) => [s.previewBtn, pressed && s.templatePressed]}
            accessibilityRole="button"
            accessibilityLabel="Preview patient PDF"
          >
            <Text style={[typeStyles.body, s.previewBtnText]}>Preview PDF</Text>
          </Pressable>
        </View>
      </Screen>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          testID="finalise"
          onPress={onFinalise}
          style={s.cta}
          accessibilityRole="button"
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setCtaSize((p) => (p.w === width && p.h === height ? p : { w: width, h: height }));
          }}
        >
          {/* Surfie → Paris gradient. React Native has no gradient background,
              so it is painted as an SVG rect behind the label. */}
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
          {/* Padding lives on the inner row: an absolutely-positioned child is
              laid out inside the parent's padding, which would inset the fill. */}
          <View style={s.ctaContent}>
            <Text style={[typeStyles.body, s.ctaText]}>
              Finalise {outputLabel(professionalType)}
            </Text>
            <View style={s.ctaLock}>
              <Icon name="lock" size={18} color={colors.surfie} />
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },
  flex: { flex: 1 },
  // The footer is a sibling below the scroll view, so it needs no reserved
  // space here — 112 was leaving a dead band above the Finalise button.
  content: { paddingBottom: spacing.lg },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
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
  title: { ...typeStyles.pageTitle, flex: 1, color: colors.ink },
  draftBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  draftText: { ...typeStyles.caption, color: colors.surfie },

  // Full-width card row: icon, label, chevron.
  template: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  templatePressed: { opacity: 0.7 },
  countPill: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
  },
  countPillText: { ...typeStyles.caption, fontSize: 10, color: colors.surfie },
  templateText: { ...typeStyles.body, flex: 1, color: colors.surfie },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typeStyles.sectionTitle, fontSize: 14, lineHeight: 18, color: colors.ink },
  // Outlined button rather than a bare icon + label.
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surfie,
  },
  addText: { ...typeStyles.buttonSmall, color: colors.surfie },

  /* medicine card */
  med: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 14,
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
  medNumText: { ...typeStyles.body, fontSize: 15, color: colors.surfie },
  medName: { ...typeStyles.name, color: colors.ink },
  medGeneric: { ...typeStyles.caption, color: colors.inkFaint },

  /**
   * MED_INDENT aligns the detail block with the medicine name rather than the
   * number: the 32px badge plus the 8px head gap.
   */
  medGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginLeft: 32 + spacing.sm },
  // Bordered tile per value — outline, not a fill.
  medCell: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: 10,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
  },
  medCellHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  medCellLabel: { ...typeStyles.label, color: colors.inkFaint, flexShrink: 1 },
  medCellValue: { ...typeStyles.body, color: colors.ink, marginTop: 2 },
  medFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginLeft: 32 + spacing.sm,
  },
  medDelete: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.dangerSoft,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  previewIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  previewTitle: { ...typeStyles.cardTitle, color: colors.ink },
  previewSub: { ...typeStyles.caption, color: colors.inkMuted },
  previewBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surfie,
    flexShrink: 0,
  },
  previewBtnText: { ...typeStyles.buttonSmall, color: colors.surfie },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  cta: {
    height: 60,
    // Clips the gradient rect to the radius; solid surfie is the fallback fill.
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfie,
  },
  ctaContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: 6,
  },
  ctaLock: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ctaText: { ...typeStyles.button, flex: 1, textAlign: 'center', color: colors.white },
});

export default EPrescriptionScreen;
