import { typeStyles } from '../../../../../libs/typography/src';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import {
  C,
  SlimHeader,
  Stepper,
  Label,
  Field,
  SelectRow,
  Segmented,
  CheckRow,
  ShieldNote,
  ScanLine,
  SectionTitle,
  SummaryRow,
  StickyFooter,
  GhostButton,
  SolidButton,
} from '../../components/compact';
import {
  initialDraft,
  URGENCIES,
  HISTORY_MAX,
  QUESTION_MAX,
  hasIdentifiers,
  deIdentify,
  type ClarificationDraft,
  type Urgency,
} from '../../data/clarification';
import { cases, caseDetailFor, type PatientCase } from '../../data/doctor';

const STEPS = ['Case Details', 'Clinical Doubt', 'Review & Share'];

const draftFromCase = (patientCase: PatientCase): ClarificationDraft => {
  const detail = caseDetailFor(patientCase);
  return {
    ...initialDraft,
    caseId: detail.ref,
    patientName: patientCase.name,
    patientId: patientCase.caseId,
    consultationId: patientCase.appointmentId.toUpperCase(),
    title: patientCase.concern,
    ageLabel: `${patientCase.age} years`,
    gender: patientCase.gender,
    history: detail.notes?.excerpt ?? patientCase.concern,
    provisionalDiagnosis: detail.notes?.primaryDiagnosis ?? 'To be confirmed',
    currentPlan: detail.prescription?.names.join(', ') || detail.summary || 'No current plan recorded',
    question: '',
    files: [],
  };
};

/**
 * Create Clarification — three steps, one screen each.
 *
 * The wizard exists so the form is never one long page: each step asks for one
 * kind of thing. Identifiers are checked as the doctor types rather than only
 * at submit, and the review step shows exactly what the expert will receive —
 * built by `deIdentify`, so the preview cannot drift from what is shared.
 */
export const CreateClarificationScreen = ({
  onCancel,
  onSubmit,
  onSaveDraft,
}: {
  onCancel: () => void;
  onSubmit: (draft: ClarificationDraft) => void;
  onSaveDraft?: (draft: ClarificationDraft) => void;
}) => {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(initialDraft);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const set = <K extends keyof ClarificationDraft>(k: K, v: ClarificationDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  // scanned live, so a pasted identifier is caught while typing
  const dirty = useMemo(
    () => hasIdentifiers(`${draft.history} ${draft.question} ${draft.title}`),
    [draft.history, draft.question, draft.title]
  );

  const shared = useMemo(() => deIdentify(draft), [draft]);
  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  const chooseCase = (patientCase: PatientCase) => {
    setSelectedCaseId(patientCase.id);
    setDraft(draftFromCase(patientCase));
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={{ paddingTop: insets.top }}>
        <SlimHeader
          onBack={() => (step === 0 ? onCancel() : setStep((v) => v - 1))}
          center={<LogoWide width={96} height={24} />}
          right={
            <Pressable testID="save-draft" onPress={() => onSaveDraft?.(draft)} hitSlop={8}>
              <Text style={[typeStyles.body, s.saveDraft]} numberOfLines={1}>
                Save Draft
              </Text>
            </Pressable>
          }
        />
      </View>

      <View style={s.titleWrap}>
        <Text style={[typeStyles.body, s.h1]}>{step === 2 ? 'Review & Share' : 'Create Clarification'}</Text>
        <Text style={[typeStyles.body, s.sub]}>
          {step === 2
            ? 'Check the details below before sharing with an expert.'
            : 'Prepare a de-identified case for expert guidance.'}
        </Text>
      </View>

      <Stepper steps={STEPS} current={step} />

      {/* Android no longer resizes the window for the keyboard under
          edge-to-edge, so the last fields — diagnosis and current plan — sat
          behind it. Lifting the scroll area and the footer together keeps the
          focused field and Continue both reachable. */}
      <KeyboardAvoidingView style={s.fill} behavior="padding">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            {/* The picker is a means to an end: once a case is chosen the list
                is replaced by that case's details, so the page never shows a
                patient's details underneath a list of other patients. */}
            {!selectedCase && (
              <>
            <SectionTitle>Select an existing case</SectionTitle>
            <Text style={[typeStyles.body, s.caseHelp]}>
              Patient and consultation details will be filled automatically.
            </Text>
            <View style={s.caseList}>
              {cases.map((patientCase) => {
                const active = selectedCaseId === patientCase.id;
                return (
                  <Pressable
                    key={patientCase.id}
                    testID={`select-case-${patientCase.id}`}
                    onPress={() => chooseCase(patientCase)}
                    style={[s.caseOption, active && s.caseOptionActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <View style={[s.caseAvatar, active && s.caseAvatarActive]}>
                      <Text style={[typeStyles.body, s.caseInitials]}>{patientCase.initials}</Text>
                    </View>
                    <View style={s.flex}>
                      <Text style={[typeStyles.body, s.caseName]}>{patientCase.name}</Text>
                      <Text style={[typeStyles.body, s.caseMeta]}>
                        {patientCase.caseId} • {patientCase.age}y • {patientCase.gender}
                      </Text>
                    </View>
                    <Icon name={active ? 'checkCircle' : 'chevronRight'} size={17} color={active ? colors.surfie : C.muted} />
                  </Pressable>
                );
              })}
            </View>
              </>
            )}

            {selectedCase && (
              <>
              <View style={s.sourceStrip}>
              <View style={s.avatar}>
                <Text style={[typeStyles.body, s.avatarText]}>{selectedCase.initials}</Text>
              </View>
              <View style={s.flex}>
                <Text style={[typeStyles.body, s.sourceName]}>{draft.patientName}</Text>
                <Text style={[typeStyles.body, s.sourceMeta]}>Consultation {draft.consultationId}</Text>
              </View>
              <Icon name="lock" size={13} color={C.amber} />
              <Text style={[typeStyles.body, s.privateText]}>Private</Text>
              {/* the only way back to the picker, now that the list is gone */}
              <Pressable
                testID="change-case"
                onPress={() => setSelectedCaseId(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Choose a different case"
              >
                <Text style={[typeStyles.body, s.changeText]}>Change</Text>
              </Pressable>
            </View>

            <SectionTitle>Case title</SectionTitle>
            <Field testID="title" value={draft.title} onChangeText={(t) => set('title', t)} />

            <SectionTitle>Patient profile</SectionTitle>
            <View style={s.twoCol}>
              <View style={s.flex}>
                <Label>Age</Label>
                <SelectRow testID="age" value={draft.ageLabel} />
              </View>
              <View style={s.flex}>
                <Label>Gender</Label>
                <SelectRow testID="gender" value={draft.gender} />
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
            />
            <ScanLine clean={!dirty} />

            <SectionTitle>Diagnosis or provisional diagnosis</SectionTitle>
            <Field
              testID="diagnosis"
              value={draft.provisionalDiagnosis}
              onChangeText={(t) => set('provisionalDiagnosis', t)}
            />

            <SectionTitle>Current plan</SectionTitle>
            <SelectRow testID="plan" value={draft.currentPlan} />
              </>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <View style={s.previewStrip}>
              <View style={s.avatarSm}>
                <Text style={[typeStyles.body, s.avatarTextSm]}>RS</Text>
              </View>
              <Text style={[typeStyles.body, s.previewText]}>
                Case preview • {draft.ageLabel} • {draft.gender}
              </Text>
              <View style={s.flex} />
              <Icon name="shield" size={14} color={colors.surfie} />
              <Text style={[typeStyles.body, s.deidText]}>De-identified</Text>
            </View>

            <Text style={[typeStyles.body, s.h2]}>What guidance do you need?</Text>

            <Label>Specific clinical question</Label>
            <Field
              testID="question"
              value={draft.question}
              onChangeText={(t) => set('question', t)}
              multiline
              height={92}
              max={QUESTION_MAX}
            />

            <SectionTitle>Guidance area</SectionTitle>
            <SelectRow testID="area" value={draft.guidanceArea} />

            <SectionTitle>Urgency</SectionTitle>
            <Segmented<Urgency>
              options={URGENCIES}
              value={draft.urgency}
              onChange={(v) => set('urgency', v)}
              idPrefix="urgency"
            />

            <SectionTitle>Supporting files</SectionTitle>
            <Pressable testID="upload" style={s.upload}>
              <View style={s.uploadIcon}>
                <Icon name="upload" size={15} color={colors.surfie} />
              </View>
              <View style={s.flex}>
                <Text style={[typeStyles.body, s.uploadTitle]}>Upload files</Text>
                <Text style={[typeStyles.body, s.uploadMeta]}>PDF, DOC, JPG or PNG (max 10 MB)</Text>
              </View>
            </Pressable>
            {draft.files.map((f) => (
              <View key={f.id} style={s.fileChip}>
                <Icon name="document" size={13} color={colors.surfie} />
                <Text style={[typeStyles.body, s.fileName]}>{f.name}</Text>
                <Pressable
                  testID={`remove-${f.id}`}
                  onPress={() => set('files', draft.files.filter((x) => x.id !== f.id))}
                  hitSlop={6} accessibilityLabel="Remove attached file"
                >
                  <Icon name="close" size={13} color={C.muted} />
                </Pressable>
              </View>
            ))}
          </>
        )}

        {step === 2 && (
          <>
            <ShieldNote icon="shieldCheck">Ready to share • Direct identifiers removed</ShieldNote>

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
              <Text style={[typeStyles.body, s.audit]}>Submission, doctor and time will be recorded.</Text>
            </View>
          </>
        )}
      </ScrollView>

      <StickyFooter note={`Step ${step + 1} of 3`} bottomInset={insets.bottom}>
        {/* Cancel and Back sit in the same slot across the three steps, so they
            share one treatment — an outlined button, not bare text on step 0. */}
        {step === 0 ? (
          <GhostButton testID="cancel" label="Cancel" onPress={onCancel} />
        ) : (
          <GhostButton testID="back-step" label="Back" onPress={() => setStep((v) => v - 1)} />
        )}
        {step < 2 ? (
          <SolidButton
            testID="continue"
            label="Continue"
            disabled={step === 0 && !selectedCaseId}
            onPress={() => setStep((v) => v + 1)}
          />
        ) : (
          <SolidButton
            testID="submit"
            label="Submit to Expert"
            // the identifier confirmation is a hard gate, not a nudge
            disabled={!confirmed}
            onPress={() => onSubmit(draft)}
          />
        )}
      </StickyFooter>
      </KeyboardAvoidingView>
    </View>
  );
};

const ReviewGroup = ({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) => (
  <View style={s.group}>
    <View style={s.groupHead}>
      <Text style={[typeStyles.body, s.groupTitle]}>{title}</Text>
      <Pressable onPress={onEdit} hitSlop={8}>
        <Text style={[typeStyles.body, s.editLink]}>Edit</Text>
      </Pressable>
    </View>
    <View style={s.groupBody}>{children}</View>
  </View>
);

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  fill: { flex: 1 },
  root: { flex: 1, backgroundColor: colors.white },
  saveDraft: { ...typeStyles.buttonSmall, color: colors.surfie },

  titleWrap: { paddingHorizontal: 16, marginBottom: 10 },
  h1: { ...typeStyles.pageTitle, color: C.ink },
  sub: { ...typeStyles.caption, color: C.muted, marginTop: 1 },
  h2: { ...typeStyles.sectionTitle, color: C.ink, marginTop: 12, marginBottom: 6 },

  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 },
  caseHelp: { ...typeStyles.caption, color: C.muted, marginTop: -2, marginBottom: 8 },
  caseList: { gap: 7, marginBottom: 12 },
  caseOption: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 9, backgroundColor: colors.white },
  caseOptionActive: { borderColor: colors.surfie, backgroundColor: '#F3FBF8' },
  caseAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  caseAvatarActive: { backgroundColor: '#DDF4EC' },
  caseInitials: { ...typeStyles.avatar, color: colors.surfie },
  caseName: { ...typeStyles.name, color: C.ink },
  caseMeta: { ...typeStyles.caption, color: C.muted, marginTop: 2 },

  sourceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F7FAF9',
    borderRadius: 12,
    padding: 12,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typeStyles.avatar, fontSize: 15, color: colors.surfie },
  sourceName: { ...typeStyles.cardTitle, color: C.ink },
  sourceMeta: { ...typeStyles.bodySmall, color: C.muted, marginTop: 2 },
  privateText: { ...typeStyles.caption, color: C.amber },
  changeText: { ...typeStyles.buttonSmall, color: colors.surfie },

  twoCol: { flexDirection: 'row', gap: 8 },

  previewStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.mint,
    borderRadius: 10,
    padding: 11,
  },
  avatarSm: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfie, alignItems: 'center', justifyContent: 'center' },
  avatarTextSm: { ...typeStyles.avatar, color: colors.white },
  previewText: { ...typeStyles.button, color: C.ink },
  deidText: { ...typeStyles.buttonSmall, color: colors.surfie },

  upload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: C.line,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 9,
  },
  uploadIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { ...typeStyles.cardTitle, color: C.ink },
  uploadMeta: { ...typeStyles.caption, color: C.muted },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.mint,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginTop: 6,
  },
  fileName: { ...typeStyles.caption, flex: 1, color: C.ink },

  group: { marginTop: 12 },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  groupTitle: { ...typeStyles.sectionTitle, color: C.ink },
  editLink: { ...typeStyles.buttonSmall, color: colors.surfie },
  // Filled rather than outlined: the review step is a read-back of what will be
  // sent, so each block reads as a panel of settled values, not an input group.
  groupBody: { backgroundColor: '#F2F5F4', borderRadius: 10, paddingHorizontal: 10 },

  confirmWrap: { marginTop: 14, gap: 4 },
  audit: { ...typeStyles.helper, color: C.muted, marginLeft: 27 },

});

export default CreateClarificationScreen;
