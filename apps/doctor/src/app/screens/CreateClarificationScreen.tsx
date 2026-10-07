import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, ActivityIndicator } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/ui';
import { ScreenHeader, HeaderTextAction } from '../../components/ScreenHeader';
import { SelectField } from '../../components/form';
import { confirmDiscard } from '../../components/confirm';
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
import { selectCases, selectRecord, selectReferableCase } from '../../state/selectors';
import {
  GUIDANCE_AREAS,
  URGENCIES,
  DIAGNOSIS_MAX,
  HISTORY_MAX,
  PLAN_MAX,
  QUESTION_MAX,
  TITLE_MAX,
  hasIdentifiers,
  deIdentify,
  type Clarification,
  type ClarificationDraft,
  type Urgency,
} from '../../data/clarification';
import { useExperts } from '../../data/clarifications';
import type { ConsultationRecord } from '../../data/clinical';
import type { PatientCase } from '../../data/doctor';

const STEPS = ['Case Details', 'Clinical Doubt', 'Review & Share'];

const GENDERS = ['Female', 'Male'] as const;

/** The backend stores an age in years (0–120) — not a band, and never a date of birth. */
const ageLabelOf = (age: number | null) => (age === null ? 'Age not given' : `${age} years`);

/** "35 years" → 35. An old band ("25–34 years") has no single age, so it reads as unknown. */
const ageFromLabel = (label: string): number | null => {
  const m = label.match(/^(\d{1,3}) years$/);
  return m ? Number(m[1]) : null;
};

const draftFromCase = (c: PatientCase, r: ConsultationRecord): ClarificationDraft => ({
  caseId: '',
  appointmentId: c.appointmentId,
  patientName: c.name,
  patientId: c.patientId,
  consultationId: c.caseId,
  // prefilled from the notes, so cut to what the backend takes — it refuses a longer field outright
  title: (r.notes.complaint.trim() || c.concern).slice(0, TITLE_MAX),
  age: c.age > 0 ? c.age : null,
  ageLabel: ageLabelOf(c.age > 0 ? c.age : null),
  gender: c.gender,
  history: (r.notes.history.trim() || c.concern).slice(0, HISTORY_MAX),
  provisionalDiagnosis: r.notes.diagnosis.trim().slice(0, DIAGNOSIS_MAX),
  currentPlan: (r.medicines.length ? r.medicines.map((m) => `${m.name} ${m.frequency.toLowerCase()}`).join(', ') : 'No medicines started').slice(0, PLAN_MAX),
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
  age: ageFromLabel(c.shared.ageLabel),
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
 * Clarifications list; Post sends it to the expert panel.
 *
 * The doctor does not choose the reviewer: posting puts the case in an
 * administrator's queue and the administrator assigns one. Nothing here names
 * an expert, because the backend never tells the author who it is.
 */
export const CreateClarificationScreen = ({
  initialAppointmentId,
  existing,
  onCancel,
  onSubmit,
  onSaveDraft,
  onDirtyChange,
  busy = false,
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
  /** A save or post is in flight — both actions wait for it. */
  busy?: boolean;
}) => {
  const targetId = existing?.appointmentId ?? initialAppointmentId;
  const held = useStore(selectCases).filter((c) => c.state !== 'noShow');
  // a consultation still in progress is offered too, first, so Refer mid-call
  // opens on this patient
  const current = useStore((st) => (targetId ? selectReferableCase(st, targetId) : undefined));
  const cases = current && !held.some((c) => c.appointmentId === current.appointmentId) ? [current, ...held] : held;
  const records = useStore((st) => st.records);
  const initialCase = current;
  const start = useMemo<ClarificationDraft | null>(() => {
    if (existing) return draftFromClarification(existing, initialCase);
    if (initialCase) return draftFromCase(initialCase, selectRecordFor(records, initialCase.appointmentId));
    return null;
    // computed once: later store updates must not reset the doctor's draft
  }, []);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ClarificationDraft | null>(start);
  const [confirmed, setConfirmed] = useState(false);

  // Posting asks who should review it first: the picker below, then onSubmit.
  const [picking, setPicking] = useState(false);
  const [expertId, setExpertId] = useState<string | null>(null);
  const post = () => setPicking(true);
  const send = () => {
    if (!draft) return;
    setPicking(false);
    onSubmit(expertId ? { ...draft, expertDoctorId: expertId } : { ...draft, expertDoctorId: undefined });
  };

  const set = <K extends keyof ClarificationDraft>(k: K, v: ClarificationDraft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(start);
  // every field the server scans — a field left out here is one it would refuse unannounced
  const flagged = useMemo(
    () =>
      !!draft &&
      hasIdentifiers(
        `${draft.history} ${draft.question} ${draft.title} ${draft.provisionalDiagnosis} ${draft.currentPlan} ${draft.guidanceArea}`
      ),
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
              draft ? (
                <HeaderTextAction testID="save-draft" label={busy ? 'Saving…' : 'Save Draft'} onPress={() => onSaveDraft(draft)} disabled={busy} />
              ) : undefined
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
                label={busy ? 'Posting…' : 'Select doctor'}
                // the identifier confirmation is a hard gate, not a nudge
                disabled={!confirmed || flagged || busy}
                onPress={post}
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
                <Field testID="title" value={draft.title} onChangeText={(t) => set('title', t)} max={TITLE_MAX} accessibilityLabel="Case title" />

                <SectionTitle>Patient profile</SectionTitle>
                <View style={s.twoCol}>
                  <View style={s.flex}>
                    <Label>Age (years)</Label>
                    <Field
                      testID="age"
                      value={draft.age === null ? '' : String(draft.age)}
                      onChangeText={(t) => {
                        const digits = t.replace(/\D/g, '').slice(0, 3);
                        const age = digits ? Math.min(120, Number(digits)) : null;
                        setDraft((d) => (d ? { ...d, age, ageLabel: ageLabelOf(age) } : d));
                      }}
                      keyboardType="number-pad"
                      accessibilityLabel="Age in years"
                    />
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
                  max={DIAGNOSIS_MAX}
                  accessibilityLabel="Provisional diagnosis"
                />

                <SectionTitle>Current plan</SectionTitle>
                <Field
                  testID="plan"
                  value={draft.currentPlan}
                  onChangeText={(t) => set('currentPlan', t)}
                  multiline
                  height={64}
                  max={PLAN_MAX}
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
            {/* ponytail: no supporting files — the backend has no route to attach one to a case.
                A file picked here would never reach the expert. Add an upload when the API has one. */}
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
                value={`${URGENCIES.find((u) => u.key === draft.urgency)!.label} • ${draft.guidanceArea}`}
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
      <ExpertPicker
        visible={picking}
        selected={expertId}
        onSelect={setExpertId}
        onCancel={() => setPicking(false)}
        onConfirm={send}
      />
    </Screen>
  );
};

/**
 * Who should review it. Opened by Post: the doctor picks an expert, or leaves
 * it to CoraCure's admin queue. The reviewer sees only the de-identified case.
 */
const ExpertPicker = ({
  visible,
  selected,
  onSelect,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const experts = useExperts(visible);
  const options = [
    { id: null, fullName: 'Let CoraCure choose', specialty: 'An administrator assigns an available expert' },
    ...(experts.data ?? []),
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={s.scrim}>
        <View style={s.sheet} testID="expert-picker">
          <Text style={s.sheetTitle}>Choose an expert</Text>
          <Text style={s.sheetSub}>They see only the de-identified case. The patient never sees this discussion.</Text>
          <ScrollView style={s.sheetList}>
            {experts.error ? (
              <Pressable onPress={experts.retry} accessibilityRole="button">
                <Text style={s.sheetNote}>
                  Could not load experts ({experts.error.message}). Tap to retry, or let CoraCure choose.
                </Text>
              </Pressable>
            ) : !experts.data ? (
              <ActivityIndicator color={colors.surfie} style={s.sheetLoading} />
            ) : null}
            {options.map((o) => (
              <Pressable
                key={o.id ?? 'any'}
                testID={`expert-${o.id ?? 'any'}`}
                onPress={() => onSelect(o.id)}
                style={[s.expertRow, selected === o.id && s.expertOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: selected === o.id }}
              >
                <View style={s.flex}>
                  <Text style={s.caseName}>{o.fullName}</Text>
                  {o.specialty ? <Text style={s.caseMeta}>{o.specialty}</Text> : null}
                </View>
                {selected === o.id && <Icon name="check" size={18} color={colors.surfie} />}
              </Pressable>
            ))}
            {experts.data && experts.data.length === 0 && <Text style={s.sheetNote}>No experts are available right now.</Text>}
          </ScrollView>
          <View style={s.footRow}>
            <GhostButton testID="expert-cancel" label="Cancel" onPress={onCancel} />
            <SolidButton testID="expert-confirm" label="Post" onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
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
  expertOff: { opacity: 0.45 },
  expertMeta: { ...typeStyles.caption, color: C.muted, marginTop: 1 },
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

  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: spacing.lg, maxHeight: '75%' },
  sheetTitle: { ...typeStyles.cardTitle, color: C.ink },
  sheetSub: { ...typeStyles.caption, color: C.muted, marginTop: 4, marginBottom: spacing.sm },
  sheetList: { marginBottom: spacing.md },
  sheetLoading: { marginVertical: spacing.md },
  sheetNote: { ...typeStyles.caption, color: C.muted, marginVertical: spacing.sm },
  expertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  expertOn: { borderColor: colors.surfie, backgroundColor: C.mint },

  confirmWrap: { marginTop: spacing.md, gap: 4 },
  audit: { ...typeStyles.helper, color: C.muted, marginLeft: 34 },
});

export default CreateClarificationScreen;
