import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/ui';
import { ScreenHeader, HeaderTextAction } from '../../components/ScreenHeader';
import { SelectField } from '../../components/form';
import { FilePickerSheet, type PickedFile } from '../../components/upload';
import { confirm, confirmDiscard } from '../../components/confirm';
import {
  C,
  Stepper,
  Label,
  Field,
  Segmented,
  CheckRow,
  ShieldNote,
  ScanLine,
  SectionTitle,
  SummaryRow,
  GhostButton,
  SolidButton,
} from '../../components/compact';
import { useStore } from '../../state/store';
import { selectCases, selectRecord } from '../../state/selectors';
import {
  GUIDANCE_AREAS,
  URGENCIES,
  HISTORY_MAX,
  QUESTION_MAX,
  hasIdentifiers,
  deIdentify,
  type Clarification,
  type ClarificationDraft,
  type Urgency,
} from '../../data/clarification';
import type { ConsultationRecord } from '../../data/clinical';
import type { PatientCase } from '../../data/doctor';

const STEPS = ['Case Details', 'Clinical Doubt', 'Review & Share'];

/** Age is shared as a band, not a birthday — one less identifier. */
export const AGE_BANDS = ['18–24 years', '25–34 years', '35–44 years', '45–54 years', '55–64 years', '65+ years'];
const ageBand = (age: number) =>
  age < 25 ? AGE_BANDS[0] : age < 35 ? AGE_BANDS[1] : age < 45 ? AGE_BANDS[2] : age < 55 ? AGE_BANDS[3] : age < 65 ? AGE_BANDS[4] : AGE_BANDS[5];
const GENDERS = ['Female', 'Male'] as const;

const draftFromCase = (c: PatientCase, r: ConsultationRecord): ClarificationDraft => ({
  caseId: '',
  appointmentId: c.appointmentId,
  patientName: c.name,
  patientId: c.patientId,
  consultationId: c.caseId,
  title: r.notes.complaint.trim() || c.concern,
  ageLabel: ageBand(c.age),
  gender: c.gender,
  history: r.notes.history.trim() || c.concern,
  provisionalDiagnosis: r.notes.diagnosis.trim(),
  currentPlan: r.medicines.length ? r.medicines.map((m) => `${m.name} ${m.frequency.toLowerCase()}`).join(', ') : 'No medicines started',
  question: '',
  guidanceArea: GUIDANCE_AREAS[0],
  urgency: 'routine',
  speciality: 'Psychiatry',
  files: [],
});

const draftFromClarification = (c: Clarification, pc: PatientCase | undefined): ClarificationDraft => ({
  caseId: c.caseId,
  appointmentId: c.appointmentId,
  patientName: pc?.name ?? '',
  patientId: pc?.patientId ?? '',
  consultationId: pc?.caseId ?? '',
  title: c.title,
  ageLabel: c.shared.ageLabel,
  gender: c.shared.gender,
  history: c.shared.history,
  provisionalDiagnosis: c.shared.provisionalDiagnosis,
  currentPlan: c.shared.currentPlan,
  question: c.shared.question,
  guidanceArea: c.shared.guidanceArea,
  urgency: c.urgency,
  speciality: 'Psychiatry',
  files: c.shared.files,
});

/**
 * Create Clarification — three steps, one screen each.
 *
 * Identifiers are checked as the doctor types, and the review step shows
 * exactly what the expert will receive — built by `deIdentify`, so the preview
 * cannot drift from what is shared. Save Draft keeps the work in the
 * Clarifications list; Submit posts it to the expert.
 */
export const CreateClarificationScreen = ({
  initialAppointmentId,
  existing,
  onCancel,
  onSubmit,
  onSaveDraft,
  onDirtyChange,
}: {
  /** Raised from a consultation: the case is chosen already. */
  initialAppointmentId?: string;
  /** A saved draft being continued. */
  existing?: Clarification;
  onCancel: () => void;
  onSubmit: (draft: ClarificationDraft) => void;
  onSaveDraft: (draft: ClarificationDraft) => void;
  /** Reports unsaved work so the route can ask before it is dropped — on Back, swipe or Android back. */
  onDirtyChange?: (dirty: boolean) => void;
}) => {
  const cases = useStore(selectCases).filter((c) => c.state !== 'noShow');
  const records = useStore((st) => st.records);
  const initialCase = cases.find((c) => c.appointmentId === (existing?.appointmentId ?? initialAppointmentId));
  const start = useMemo<ClarificationDraft | null>(() => {
    if (existing) return draftFromClarification(existing, initialCase);
    if (initialCase) return draftFromCase(initialCase, selectRecordFor(records, initialCase.appointmentId));
    return null;
    // computed once: later store updates must not reset the doctor's draft
  }, []);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ClarificationDraft | null>(start);
  const [confirmed, setConfirmed] = useState(false);
  const [picking, setPicking] = useState(false);

  const set = <K extends keyof ClarificationDraft>(k: K, v: ClarificationDraft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(start);
  const flagged = useMemo(
    () => !!draft && hasIdentifiers(`${draft.history} ${draft.question} ${draft.title} ${draft.provisionalDiagnosis}`),
    [draft]
  );
  const shared = draft ? deIdentify(draft) : null;

  const chooseCase = (c: PatientCase) => setDraft(draftFromCase(c, selectRecordFor(records, c.appointmentId)));
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const back = () => {
    if (step > 0) return setStep((v) => v - 1);
    // the route guards removal when it listens; on its own the screen asks itself
    if (dirty && !onDirtyChange) return confirmDiscard(onCancel, 'this clarification');
    onCancel();
  };

  const canContinue =
    step === 0
      ? !!draft && !!draft.title.trim() && !!draft.history.trim() && !!draft.provisionalDiagnosis.trim()
      : step === 1
        ? !!draft && draft.question.trim().length >= 10
        : false;

  return (
    <Screen
      testID="create-clarification"
      background={colors.white}
      header={
        <View>
          <ScreenHeader
            onBack={back}
            title={step === 2 ? 'Review & Share' : 'Create Clarification'}
            subtitle={
              step === 2 ? 'Check the details below before sharing with an expert.' : 'Prepare a de-identified case for expert guidance.'
            }
            right={
              draft ? <HeaderTextAction testID="save-draft" label="Save Draft" onPress={() => onSaveDraft(draft)} /> : undefined
            }
          />
          <Stepper steps={STEPS} current={step} />
        </View>
      }
      footer={
        <View>
          <Text style={s.footNote}>Step {step + 1} of 3</Text>
          <View style={s.footRow}>
            <GhostButton testID={step === 0 ? 'cancel' : 'back-step'} label={step === 0 ? 'Cancel' : 'Back'} onPress={back} />
            {step < 2 ? (
              <SolidButton testID="continue" label="Continue" disabled={!canContinue} onPress={() => setStep((v) => v + 1)} />
            ) : (
              <SolidButton
                testID="submit"
                label="Submit to Expert"
                // the identifier confirmation is a hard gate, not a nudge
                disabled={!confirmed || flagged}
                onPress={() =>
                  draft &&
                  confirm({
                    title: 'Submit to expert?',
                    message: 'The de-identified case is shared with an expert reviewer. The patient does not see this discussion.',
                    confirmLabel: 'Submit',
                    onConfirm: () => onSubmit(draft),
                  })
                }
              />
            )}
          </View>
        </View>
      }
    >
      <View style={s.body}>
        {step === 0 && (
          <>
            {!draft && (
              <>
                <SectionTitle>Select an existing case</SectionTitle>
                <Text style={s.caseHelp}>Clinical details are filled in from the consultation record.</Text>
                <View style={s.caseList}>
                  {cases.map((c) => (
                    <Pressable
                      key={c.id}
                      testID={`select-case-${c.appointmentId}`}
                      onPress={() => chooseCase(c)}
                      style={({ pressed }) => [s.caseOption, pressed && s.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`${c.name}, ${c.caseId}`}
                    >
                      <View style={s.caseAvatar}>
                        <Text style={s.caseInitials}>{c.initials}</Text>
                      </View>
                      <View style={s.flex}>
                        <Text style={s.caseName}>{c.name}</Text>
                        <Text style={s.caseMeta}>
                          {c.caseId} • {c.dateLabel}
                        </Text>
                      </View>
                      <Icon name="chevronRight" size={17} color={C.muted} />
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {draft && (
              <>
                <View style={s.sourceStrip}>
                  <View style={s.avatar}>
                    <Icon name="user" size={18} color={colors.surfie} />
                  </View>
                  <View style={s.flex}>
                    <Text style={s.sourceName}>{draft.patientName}</Text>
                    <Text style={s.sourceMeta}>Consultation {draft.consultationId}</Text>
                  </View>
                  <View style={s.privateTag}>
                    <Icon name="lock" size={12} color={C.amber} />
                    <Text style={s.privateText}>Private</Text>
                  </View>
                  {!existing && (
                    <Pressable
                      testID="change-case"
                      onPress={() => setDraft(null)}
                      hitSlop={10}
                      style={s.changeBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Choose a different case"
                    >
                      <Text style={s.changeText}>Change</Text>
                    </Pressable>
                  )}
                </View>
                <Text style={s.privateNote}>Name and IDs above stay with you. Only the fields below are shared.</Text>

                <SectionTitle>Case title</SectionTitle>
                <Field testID="title" value={draft.title} onChangeText={(t) => set('title', t)} accessibilityLabel="Case title" />

                <SectionTitle>Patient profile</SectionTitle>
                <View style={s.twoCol}>
                  <View style={s.flex}>
                    <SelectField testID="age" label="Age" value={draft.ageLabel} options={AGE_BANDS} onChange={(v) => set('ageLabel', v)} />
                  </View>
                  <View style={s.flex}>
                    <SelectField
                      testID="gender"
                      label="Gender"
                      inline
                      value={draft.gender}
                      options={GENDERS}
                      onChange={(v) => set('gender', v as ClarificationDraft['gender'])}
                    />
                  </View>
                </View>

                <SectionTitle>Brief clinical history</SectionTitle>
                <Field
                  testID="history"
                  value={draft.history}
                  onChangeText={(t) => set('history', t)}
                  multiline
                  height={100}
                  max={HISTORY_MAX}
                  accessibilityLabel="Brief clinical history"
                />
                <ScanLine clean={!flagged} />

                <SectionTitle>Diagnosis or provisional diagnosis</SectionTitle>
                <Field
                  testID="diagnosis"
                  value={draft.provisionalDiagnosis}
                  onChangeText={(t) => set('provisionalDiagnosis', t)}
                  placeholder="e.g. Generalised anxiety disorder, provisional"
                  accessibilityLabel="Provisional diagnosis"
                />

                <SectionTitle>Current plan</SectionTitle>
                <Field
                  testID="plan"
                  value={draft.currentPlan}
                  onChangeText={(t) => set('currentPlan', t)}
                  multiline
                  height={64}
                  accessibilityLabel="Current plan"
                />
              </>
            )}
          </>
        )}

        {step === 1 && draft && (
          <>
            <View style={s.previewStrip}>
              <View style={s.avatarSm}>
                <Icon name="user" size={16} color={colors.white} />
              </View>
              <Text style={s.previewText} numberOfLines={1}>
                {draft.ageLabel} • {draft.gender}
              </Text>
              <View style={s.flex} />
              <Icon name="shield" size={14} color={colors.surfie} />
              <Text style={s.deidText}>De-identified</Text>
            </View>

            <SectionTitle>What guidance do you need?</SectionTitle>
            <Label>Specific clinical question</Label>
            <Field
              testID="question"
              value={draft.question}
              onChangeText={(t) => set('question', t)}
              placeholder="Ask one clear question the expert can answer."
              multiline
              height={96}
              max={QUESTION_MAX}
              accessibilityLabel="Specific clinical question"
            />
            <ScanLine clean={!flagged} />

            <View style={s.spacer} />
            <SelectField
              testID="area"
              label="Guidance area"
              value={draft.guidanceArea}
              options={GUIDANCE_AREAS}
              onChange={(v) => set('guidanceArea', v)}
            />

            <SectionTitle>Urgency</SectionTitle>
            <Segmented<Urgency> options={URGENCIES} value={draft.urgency} onChange={(v) => set('urgency', v)} idPrefix="urgency" />

            <SectionTitle>Supporting files</SectionTitle>
            <Pressable
              testID="upload"
              onPress={() => setPicking(true)}
              style={({ pressed }) => [s.upload, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Attach a supporting file"
            >
              <View style={s.uploadIcon}>
                <Icon name="upload" size={16} color={colors.surfie} />
              </View>
              <View style={s.flex}>
                <Text style={s.uploadTitle}>Attach a file</Text>
                <Text style={s.uploadMeta}>PDF or image, up to 10 MB. Remove identifiers first.</Text>
              </View>
            </Pressable>
            {draft.files.map((f) => (
              <View key={f.id} style={s.fileChip}>
                <Icon name="document" size={14} color={colors.surfie} />
                <Text style={s.fileName} numberOfLines={1}>
                  {f.name} · {f.size}
                </Text>
                <Pressable
                  testID={`remove-${f.id}`}
                  onPress={() =>
                    confirm({
                      title: 'Remove this file?',
                      message: f.name,
                      confirmLabel: 'Remove',
                      destructive: true,
                      onConfirm: () => set('files', draft.files.filter((x) => x.id !== f.id)),
                    })
                  }
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${f.name}`}
                >
                  <Icon name="trash" size={15} color={colors.danger} />
                </Pressable>
              </View>
            ))}
            <FilePickerSheet
              visible={picking}
              kind="document"
              maxMb={10}
              testID="clarification-file"
              onClose={() => setPicking(false)}
              onPick={(f: PickedFile) => {
                setPicking(false);
                set('files', [...draft.files, { id: `f-${Date.now().toString(36)}`, name: f.name, size: f.size }]);
              }}
            />
          </>
        )}

        {step === 2 && draft && shared && (
          <>
            {flagged ? (
              <ShieldNote icon="alertTriangle">Possible identifier found — edit the case before sharing.</ShieldNote>
            ) : (
              <ShieldNote icon="shieldCheck">Ready to share • Direct identifiers removed</ShieldNote>
            )}

            <ReviewGroup title="Case details" onEdit={() => setStep(0)}>
              <SummaryRow label="Case title" value={shared.title} />
              <SummaryRow label="Patient" value={`${shared.ageLabel} • ${shared.gender}`} last />
            </ReviewGroup>
            <ReviewGroup title="Clinical overview" onEdit={() => setStep(0)}>
              <SummaryRow label="Brief history" value={shared.history} />
              <SummaryRow label="Provisional diagnosis" value={shared.provisionalDiagnosis} />
              <SummaryRow label="Current plan" value={shared.currentPlan} last />
            </ReviewGroup>
            <ReviewGroup title="Expert question" onEdit={() => setStep(1)}>
              <SummaryRow label="Question" value={shared.question} last />
            </ReviewGroup>
            <ReviewGroup title="Additional information" onEdit={() => setStep(1)}>
              <SummaryRow
                label="Details"
                value={`${URGENCIES.find((u) => u.key === draft.urgency)!.label} • ${draft.guidanceArea} • ${shared.attachments} attachment${shared.attachments === 1 ? '' : 's'}`}
                last
              />
            </ReviewGroup>

            <View style={s.confirmWrap}>
              <CheckRow testID="confirm" checked={confirmed} onToggle={() => setConfirmed((v) => !v)}>
                I confirm the case and attachments contain no direct patient identifiers.
              </CheckRow>
              <Text style={s.audit}>Submission, doctor and time will be recorded.</Text>
            </View>
          </>
        )}
      </View>
    </Screen>
  );
};

const selectRecordFor = (records: Record<string, ConsultationRecord>, appointmentId: string) =>
  selectRecord({ records } as never, appointmentId);

const ReviewGroup = ({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) => (
  <View style={s.group}>
    <View style={s.groupHead}>
      <Text style={s.groupTitle}>{title}</Text>
      <Pressable onPress={onEdit} hitSlop={10} style={s.editBtn} accessibilityRole="button" accessibilityLabel={`Edit ${title}`}>
        <Text style={s.editLink}>Edit</Text>
      </Pressable>
    </View>
    <View style={s.groupBody}>{children}</View>
  </View>
);

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.75 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  spacer: { height: spacing.md },
  footNote: { ...typeStyles.helper, color: C.muted, textAlign: 'center', marginBottom: 6 },
  footRow: { flexDirection: 'row', gap: spacing.sm },

  caseHelp: { ...typeStyles.caption, color: C.muted, marginTop: -2, marginBottom: spacing.sm },
  caseList: { gap: spacing.sm, marginBottom: spacing.md },
  caseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 60,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    padding: spacing.sm,
    backgroundColor: colors.white,
  },
  caseAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  caseInitials: { ...typeStyles.avatar, lineHeight: undefined, color: colors.surfie },
  caseName: { ...typeStyles.name, color: C.ink },
  caseMeta: { ...typeStyles.caption, color: C.muted, marginTop: 2 },

  sourceStrip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#F7FAF9', borderRadius: 12, padding: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  sourceName: { ...typeStyles.cardTitle, color: C.ink },
  sourceMeta: { ...typeStyles.caption, color: C.muted, marginTop: 2 },
  privateTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  privateText: { ...typeStyles.caption, color: C.amber },
  changeBtn: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 4 },
  changeText: { ...typeStyles.buttonSmall, color: colors.surfie },
  privateNote: { ...typeStyles.caption, color: C.muted, marginTop: 6 },

  twoCol: { flexDirection: 'row', gap: spacing.sm },

  previewStrip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: C.mint, borderRadius: 10, padding: 11 },
  avatarSm: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfie, alignItems: 'center', justifyContent: 'center' },
  previewText: { ...typeStyles.bodySmall, color: C.ink, fontWeight: fontWeight.medium, flexShrink: 1 },
  deidText: { ...typeStyles.buttonSmall, color: colors.surfie },

  upload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    borderWidth: 1,
    borderColor: C.line,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: spacing.sm,
  },
  uploadIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { ...typeStyles.cardTitle, fontSize: 14, color: C.ink },
  uploadMeta: { ...typeStyles.caption, color: C.muted },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    backgroundColor: C.mint,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    marginTop: 6,
  },
  fileName: { ...typeStyles.caption, flex: 1, color: C.ink },

  group: { marginTop: spacing.md },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  groupTitle: { ...typeStyles.cardTitle, fontSize: 14, color: C.ink },
  editBtn: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 4 },
  editLink: { ...typeStyles.buttonSmall, color: colors.surfie },
  groupBody: { backgroundColor: '#F2F5F4', borderRadius: 10, paddingHorizontal: 10 },

  confirmWrap: { marginTop: spacing.md, gap: 4 },
  audit: { ...typeStyles.helper, color: C.muted, marginLeft: 34 },
});

export default CreateClarificationScreen;
