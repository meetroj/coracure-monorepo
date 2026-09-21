import { typeStyles, fontWeight } from '../../../../../../libs/typography/src';
import React, { useMemo, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../../assets/brand/logo-wide.svg';
import { colors, radius, spacing, typography } from '../../../theme/brand';
import { Icon } from '../../../components/Icon';
import { useKeyboardHeight } from '../../../components/useKeyboard';
import {
  TextField,
  DateField,
  monthMask,
  SelectField,
  MultiSelectField,
  UploadField,
  VerifiedField,
  CheckField,
  PrivacyNote,
  StepProgress,
} from '../../../components/form';
import {
  GENDERS,
  ID_TYPES,
  CONSULT_LANGUAGES,
  QUALIFICATION_OPTIONS,
  POSITION_OPTIONS,
  UPLOAD_HINT,
  STEPS,
  emptyDraft,
  isStepComplete,
  maskId,
  totalExperienceYears,
  type Experience,
  type Qualification,
  type RegistrationDraft,
  type StepKey,
  type UploadedFile,
} from '../../../data/registration';

/**
 * Doctor onboarding — the four sections completed after OTP sign-in, then a
 * review screen and submission for verification.
 *
 * One draft is held here and handed down; each step is a pure view over it.
 * That keeps "can I continue?" in one place (`isStepComplete`) rather than
 * each screen inventing its own answer.
 *
 * File picking is not wired — `pick()` stands in for a real picker, so the
 * attached / replace states are exercisable without a native module.
 */

/** Stand-in for a file picker. Replace when a native picker is added. */
const pick = (name: string, kind: 'pdf' | 'image' = 'pdf'): UploadedFile => ({
  name,
  kind,
  size: kind === 'pdf' ? '1.2 MB' : '840 KB',
});

const uid = (p: string, n: number) => `${p}${n}`;

/* -------------------------------- chrome ---------------------------------- */

const Layout = ({
  stepIndex,
  title,
  subtitle,
  children,
  onBack,
  primaryLabel,
  primaryEnabled,
  onPrimary,
  secondary,
}: {
  stepIndex: number;
  title: string;
  /** Omitted where the step needs no explanation above the first field. */
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  primaryLabel: string;
  primaryEnabled: boolean;
  onPrimary: () => void;
  secondary?: ReactNode;
}) => {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  return (
    <View style={s.root}>
      <View style={[s.bar, { paddingTop: insets.top + spacing.sm }]}>
        {onBack ? (
          <Pressable
            testID="onboarding-back"
            onPress={onBack}
            hitSlop={8}
            style={s.barBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Icon name="arrowLeft" size={19} color={colors.ink} />
          </Pressable>
        ) : (
          <View style={s.barBtn} />
        )}
        <View style={s.barLogo}>
          <LogoWide width={104} height={26} />
        </View>
        <View style={s.barBtn} />
      </View>

      {stepIndex >= 0 && (
        <View style={s.stepWrap}>
          {/* the count sits with the title, the bars read as the progress */}
          <View style={s.titleRow}>
            <Text style={[typeStyles.body, s.title]}>{title}</Text>
            <Text style={[typeStyles.body, s.stepCount]}>
              {stepIndex + 1} of {STEPS.length}
            </Text>
          </View>
          <StepProgress steps={STEPS} index={stepIndex} />
        </View>
      )}

      {/* the focused field is scrolled clear of the keyboard rather than sitting
          under it — every step here is a form */}
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={s.flex}
          contentContainerStyle={[s.content, { paddingBottom: spacing.lg + keyboard }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          {stepIndex < 0 && <Text style={[typeStyles.body, s.title]}>{title}</Text>}
          {!!subtitle && <Text style={[typeStyles.body, s.subtitle]}>{subtitle}</Text>}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {secondary}
        <Pressable
          testID="onboarding-primary"
          onPress={onPrimary}
          disabled={!primaryEnabled}
          style={[s.cta, !primaryEnabled && s.ctaOff]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !primaryEnabled }}
        >
          <Text style={[typeStyles.body, s.ctaText]}>{primaryLabel}</Text>
          <Icon name="arrowRight" size={17} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
};

/** A repeatable qualification / experience entry, collapsed after saving. */
const EntryCard = ({
  title,
  meta,
  proofLabel,
  onEdit,
  onRemove,
  testID,
}: {
  title: string;
  meta: string;
  proofLabel: string;
  onEdit: () => void;
  onRemove: () => void;
  testID?: string;
}) => (
  <View testID={testID} style={s.entry}>
    <View style={s.entryTop}>
      <View style={s.flex}>
        <Text style={[typeStyles.body, s.entryTitle]} numberOfLines={2}>{title}</Text>
        <Text style={[typeStyles.body, s.entryMeta]} numberOfLines={1}>{meta}</Text>
      </View>
      <Icon name="checkCircle" size={17} color={colors.surfie} />
    </View>
    <Text style={[typeStyles.body, s.entryProof]}>{proofLabel}</Text>
    <View style={s.entryActions}>
      <Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Edit ${title}`}>
        <Text style={[typeStyles.body, s.entryAction]}>Edit</Text>
      </Pressable>
      <View style={s.entryRule} />
      <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${title}`}>
        <Text style={[typeStyles.body, s.entryRemove]}>Remove</Text>
      </Pressable>
    </View>
  </View>
);

const AddButton = ({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    style={s.addBtn}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Icon name="plus" size={14} color={colors.surfie} />
    <Text style={[typeStyles.body, s.addBtnText]}>{label}</Text>
  </Pressable>
);

/* ------------------------------- the flow --------------------------------- */

export const OnboardingFlow = ({
  mobile = '+91 98765 43210',
  email = '',
  onSubmitted,
  onExit,
  /** Current month as `YYYY-MM`; injected so totals do not drift with the clock. */
  now = '2026-09',
}: {
  mobile?: string;
  email?: string;
  onSubmitted: () => void;
  onExit?: () => void;
  now?: string;
}) => {
  const [draft, setDraft] = useState<RegistrationDraft>(() => emptyDraft(mobile, email));
  const [step, setStep] = useState<StepKey | 'review'>('basic');
  /** The entry being edited, or null when the list is shown. */
  const [editingQual, setEditingQual] = useState<Qualification | null>(null);
  const [editingExp, setEditingExp] = useState<Experience | null>(null);

  const years = useMemo(() => totalExperienceYears(draft.experience, now), [draft.experience, now]);

  const setBasic = (p: Partial<RegistrationDraft['basic']>) =>
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...p } }));
  const setIdentity = (p: Partial<RegistrationDraft['identity']>) =>
    setDraft((d) => ({ ...d, identity: { ...d.identity, ...p } }));

  const goto = (k: StepKey | 'review') => setStep(k);
  const back = () => {
    if (step === 'review') return goto('experience');
    const i = STEPS.findIndex((x) => x.key === step);
    if (i > 0) return goto(STEPS[i - 1].key);
    onExit?.();
  };

  /* ------------------------------ 1. basic ------------------------------- */
  if (step === 'basic') {
    const b = draft.basic;
    return (
      <Layout
        stepIndex={0}
        title="Basic Details"
        onBack={onExit ? back : undefined}
        primaryLabel="Save & Continue"
        primaryEnabled={isStepComplete(draft, 'basic')}
        onPrimary={() => goto('identity')}
      >
        <View style={s.photoRow}>
          <Pressable
            testID="photo"
            onPress={() => setBasic({ photo: pick('profile-photo.jpg', 'image') })}
            style={[s.photo, !!b.photo && s.photoOn]}
            accessibilityRole="button"
            accessibilityLabel={b.photo ? 'Replace profile photo' : 'Add profile photo'}
          >
            <Icon name={b.photo ? 'user' : 'plus'} size={b.photo ? 30 : 22} color={colors.surfie} />
            {/* a tick, not a cross: the photo is attached, not pending removal */}
            {!!b.photo && (
              <View style={s.photoBadge}>
                <Icon name="check" size={11} color={colors.white} />
              </View>
            )}
          </Pressable>

          <View style={s.flex}>
            <Text style={[typeStyles.body, s.photoTitle]}>
              Profile Photo <Text style={s.star}>*</Text>
            </Text>
            <Text style={[typeStyles.body, s.photoHint]}>JPG or PNG · Max 5 MB</Text>
          </View>

          {!!b.photo && (
            <Pressable
              testID="photo-change"
              onPress={() => setBasic({ photo: pick('profile-photo.jpg', 'image') })}
              style={s.photoChange}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
            >
              <Text style={[typeStyles.body, s.photoChangeText]}>Change</Text>
            </Pressable>
          )}
        </View>

        <TextField
          testID="fullName"
          label="Full Name"
          required
          value={b.fullName}
          onChangeText={(v) => setBasic({ fullName: v })}
          placeholder="Enter your full name"
          autoCapitalize="words"
        />

        {/* date and gender are one fact about the doctor, so they share a row */}
        <View style={s.duo}>
          <View style={s.flex}>
            <DateField
              testID="dob"
              label="Date of Birth"
              required
              value={b.dob}
              onChange={(v) => setBasic({ dob: v })}
            />
          </View>
          <View style={s.flex}>
            <SelectField
              testID="gender"
              label="Gender"
              required
              inline
              value={b.gender}
              options={GENDERS}
              onChange={(v) => setBasic({ gender: v })}
              placeholder="Select"
            />
          </View>
        </View>

        <VerifiedField testID="mobile" label="Mobile Number" value={b.mobile} />
        {/* the email was never confirmed at sign-in, so it is asked for here */}
        <TextField
          testID="email"
          label="Email Address"
          required
          value={b.email}
          onChangeText={(v) => setBasic({ email: v })}
          placeholder="Enter your email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <MultiSelectField
          testID="languages"
          label="Languages for Consultation"
          required
          values={b.languages}
          options={CONSULT_LANGUAGES}
          onChange={(v) => setBasic({ languages: v })}
        />

        <PrivacyNote>
          Privacy note: Your date of birth, mobile number and email are used only for verification
          and are not displayed to patients.
        </PrivacyNote>
      </Layout>
    );
  }

  /* ----------------------------- 2. identity ----------------------------- */
  if (step === 'identity') {
    const idp = draft.identity;
    return (
      <Layout
        stepIndex={1}
        title="Proof of Identity"
        subtitle="Upload one valid government-issued identity document for verification."
        onBack={back}
        primaryLabel="Save & Continue"
        primaryEnabled={isStepComplete(draft, 'identity')}
        onPrimary={() => goto('qualifications')}
      >
        <SelectField
          testID="idType"
          label="Government ID Type"
          required
          value={idp.idType}
          options={ID_TYPES}
          onChange={(v) => setIdentity({ idType: v })}
          placeholder="Select ID type"
        />
        <TextField
          testID="idNumber"
          label="Government ID Number"
          required
          value={idp.idNumber}
          onChangeText={(v) => setIdentity({ idNumber: v })}
          placeholder="Enter ID number"
          autoCapitalize="characters"
          helper={idp.idNumber ? `Saved as ${maskId(idp.idNumber)}` : undefined}
        />
        <UploadField
          testID="idDocument"
          label="Government ID Document"
          required
          hint={UPLOAD_HINT}
          file={idp.document}
          onPick={() => setIdentity({ document: pick('government-id.pdf') })}
          onRemove={() => setIdentity({ document: null })}
        />

        <PrivacyNote icon="shieldCheck">
          Your identity document is used only for verification and is never displayed to patients.
        </PrivacyNote>
      </Layout>
    );
  }

  /* --------------------------- 3. qualifications -------------------------- */
  if (step === 'qualifications') {
    if (editingQual) {
      const q = editingQual;
      const valid = q.degree && q.institution && q.university && q.year && q.certificate;
      return (
        <Layout
          stepIndex={2}
          title={draft.qualifications.some((x) => x.id === q.id) ? 'Edit Qualification' : 'Add Qualification'}
          subtitle="Each qualification needs its own degree certificate."
          onBack={() => setEditingQual(null)}
          primaryLabel="Save Qualification"
          primaryEnabled={Boolean(valid)}
          onPrimary={() => {
            setDraft((d) => ({
              ...d,
              qualifications: d.qualifications.some((x) => x.id === q.id)
                ? d.qualifications.map((x) => (x.id === q.id ? q : x))
                : [...d.qualifications, q],
            }));
            setEditingQual(null);
          }}
        >
          <SelectField
            testID="degree"
            label="Qualification / Degree"
            required
            searchable
            value={q.degree}
            options={QUALIFICATION_OPTIONS}
            onChange={(v) => setEditingQual({ ...q, degree: v })}
            placeholder="e.g. MBBS"
          />
          <TextField
            testID="specialty"
            label="Specialty / Subject"
            value={q.specialty ?? ''}
            onChangeText={(v) => setEditingQual({ ...q, specialty: v })}
            placeholder="Where applicable"
          />
          <TextField
            testID="institution"
            label="Institution / College"
            required
            value={q.institution}
            onChangeText={(v) => setEditingQual({ ...q, institution: v })}
            placeholder="e.g. AIIMS New Delhi"
            autoCapitalize="words"
          />
          <TextField
            testID="university"
            label="University"
            required
            value={q.university}
            onChangeText={(v) => setEditingQual({ ...q, university: v })}
            placeholder="Awarding university"
            autoCapitalize="words"
          />
          <TextField
            testID="year"
            label="Year of Passing"
            required
            value={q.year}
            onChangeText={(v) => setEditingQual({ ...q, year: v.replace(/\D/g, '').slice(0, 4) })}
            placeholder="YYYY"
            keyboardType="number-pad"
            maxLength={4}
          />
          <UploadField
            testID="certificate"
            label="Degree Certificate"
            required
            hint={UPLOAD_HINT}
            file={q.certificate}
            onPick={() => setEditingQual({ ...q, certificate: pick('degree-certificate.pdf') })}
            onRemove={() => setEditingQual({ ...q, certificate: null })}
          />
          <PrivacyNote>
            Patients see the degree name only. Institution, university, year of passing and the
            certificate itself are used for verification and stay private.
          </PrivacyNote>
        </Layout>
      );
    }

    return (
      <Layout
        stepIndex={2}
        title="Professional Qualifications"
        subtitle="Add your medical qualifications. Start with your basic qualification and add others as required."
        onBack={back}
        primaryLabel="Save & Continue"
        primaryEnabled={isStepComplete(draft, 'qualifications')}
        onPrimary={() => goto('experience')}
      >
        {draft.qualifications.length === 0 && (
          <Text style={[typeStyles.body, s.empty]}>
            No qualifications added yet. Start with your basic medical qualification.
          </Text>
        )}
        {draft.qualifications.map((q) => (
          <EntryCard
            key={q.id}
            testID={`qual-${q.id}`}
            title={q.degree}
            meta={`${q.institution} · ${q.year}`}
            proofLabel="Degree certificate uploaded"
            onEdit={() => setEditingQual(q)}
            onRemove={() =>
              setDraft((d) => ({ ...d, qualifications: d.qualifications.filter((x) => x.id !== q.id) }))
            }
          />
        ))}
        <AddButton
          testID="add-qualification"
          label="Add Another Qualification"
          onPress={() =>
            setEditingQual({
              id: uid('q', draft.qualifications.length + 1),
              degree: '',
              institution: '',
              university: '',
              year: '',
              certificate: null,
            })
          }
        />
      </Layout>
    );
  }

  /* ----------------------------- 4. experience ---------------------------- */
  if (step === 'experience') {
    if (editingExp) {
      const e = editingExp;
      const valid = e.position && e.institution && e.start && (e.current || e.end) && e.proof;
      return (
        <Layout
          stepIndex={3}
          title={draft.experience.some((x) => x.id === e.id) ? 'Edit Experience' : 'Add Experience'}
          subtitle="Employment proof is required for each role."
          onBack={() => setEditingExp(null)}
          primaryLabel="Save Experience"
          primaryEnabled={Boolean(valid)}
          onPrimary={() => {
            setDraft((d) => ({
              ...d,
              experience: d.experience.some((x) => x.id === e.id)
                ? d.experience.map((x) => (x.id === e.id ? e : x))
                : [...d.experience, e],
            }));
            setEditingExp(null);
          }}
        >
          <SelectField
            testID="position"
            label="Position / Designation"
            required
            searchable
            value={e.position}
            options={POSITION_OPTIONS}
            onChange={(v) => setEditingExp({ ...e, position: v })}
            placeholder="e.g. Consultant Psychiatrist"
          />
          <TextField
            testID="workplace"
            label="Institution / Hospital / Clinic"
            required
            value={e.institution}
            onChangeText={(v) => setEditingExp({ ...e, institution: v })}
            placeholder="Where you worked"
            autoCapitalize="words"
          />
          <TextField
            testID="start"
            label="Start Date"
            required
            value={e.start}
            onChangeText={(v) => setEditingExp({ ...e, start: monthMask(v) })}
            placeholder="YYYY / MM"
            keyboardType="number-pad"
            maxLength={9}
          />
          <CheckField
            testID="current"
            checked={e.current}
            onToggle={() => setEditingExp({ ...e, current: !e.current, end: e.current ? e.end : null })}
          >
            I currently work here
          </CheckField>
          {!e.current && (
            <View style={s.endWrap}>
              <TextField
                testID="end"
                label="End Date"
                required
                value={e.end ?? ''}
                onChangeText={(v) => setEditingExp({ ...e, end: monthMask(v) })}
                placeholder="YYYY / MM"
                keyboardType="number-pad"
                maxLength={9}
              />
            </View>
          )}
          <UploadField
            testID="proof"
            label="Experience / Employment Proof"
            required
            hint="Experience certificate, appointment letter or employment certificate"
            file={e.proof}
            onPick={() => setEditingExp({ ...e, proof: pick('employment-proof.pdf') })}
            onRemove={() => setEditingExp({ ...e, proof: null })}
          />
          <PrivacyNote>
            Patients see only your total verified years of experience. Positions, institutions,
            employment dates and certificates stay private.
          </PrivacyNote>
        </Layout>
      );
    }

    return (
      <Layout
        stepIndex={3}
        title="Experience Details"
        subtitle="Add your current and previous professional experience. Your total is calculated automatically."
        onBack={back}
        primaryLabel="Save & Continue"
        primaryEnabled={isStepComplete(draft, 'experience')}
        onPrimary={() => goto('review')}
      >
        {draft.experience.length > 0 && (
          <View testID="total-experience" style={s.totalCard}>
            <View style={s.totalIcon}>
              <Icon name="star" size={17} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.totalValue]}>{years} Years</Text>
              <Text style={[typeStyles.body, s.totalLabel]}>
                Total verified experience · overlapping roles counted once
              </Text>
            </View>
          </View>
        )}
        {draft.experience.length === 0 && (
          <Text style={[typeStyles.body, s.empty]}>
            No experience added yet. Add your current role first.
          </Text>
        )}
        {draft.experience.map((e) => (
          <EntryCard
            key={e.id}
            testID={`exp-${e.id}`}
            title={e.position}
            meta={`${e.institution} · ${e.start} – ${e.current ? 'Present' : e.end}`}
            proofLabel="Employment proof uploaded"
            onEdit={() => setEditingExp(e)}
            onRemove={() =>
              setDraft((d) => ({ ...d, experience: d.experience.filter((x) => x.id !== e.id) }))
            }
          />
        ))}
        <AddButton
          testID="add-experience"
          label="Add Another Experience"
          onPress={() =>
            setEditingExp({
              id: uid('e', draft.experience.length + 1),
              position: '',
              institution: '',
              start: '',
              end: null,
              current: false,
              proof: null,
            })
          }
        />
      </Layout>
    );
  }

  /* ------------------------------- 5. review ------------------------------ */
  const rows: { key: StepKey; label: string; value: string }[] = [
    { key: 'basic', label: 'Basic Details', value: isStepComplete(draft, 'basic') ? 'Completed' : 'Incomplete' },
    {
      key: 'identity',
      label: 'Proof of Identity',
      value: draft.identity.document ? 'Document uploaded' : 'Not uploaded',
    },
    {
      key: 'qualifications',
      label: 'Professional Qualifications',
      value: `${draft.qualifications.length} ${draft.qualifications.length === 1 ? 'qualification' : 'qualifications'} added`,
    },
    { key: 'experience', label: 'Experience Details', value: `Total experience: ${years} years` },
  ];

  return (
    <Layout
      stepIndex={-1}
      title="Review Your Details"
      subtitle="Check everything before submitting. You can edit any section."
      onBack={back}
      primaryLabel="Submit for Verification"
      primaryEnabled={draft.confirmed && STEPS.every((st) => isStepComplete(draft, st.key))}
      onPrimary={onSubmitted}
    >
      <View style={s.reviewCard}>
        {rows.map((r, i) => (
          <View key={r.key} style={[s.reviewRow, i < rows.length - 1 && s.reviewBorder]}>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.reviewLabel]}>{r.label}</Text>
              <Text style={[typeStyles.body, s.reviewValue]}>{r.value}</Text>
            </View>
            <Pressable
              testID={`edit-${r.key}`}
              onPress={() => goto(r.key)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${r.label}`}
            >
              <Text style={[typeStyles.body, s.reviewEdit]}>Edit</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={s.confirmWrap}>
        <CheckField
          testID="confirm"
          checked={draft.confirmed}
          onToggle={() => setDraft((d) => ({ ...d, confirmed: !d.confirmed }))}
        >
          I confirm that the information and documents provided are accurate and authentic.
        </CheckField>
      </View>

      <PrivacyNote icon="shieldCheck">
        Once approved, patients see your name, photo, specialty, degree names, total experience,
        languages, bio, fee and availability. Everything else stays private.
      </PrivacyNote>
    </Layout>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  barBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barLogo: { flex: 1, alignItems: 'center' },

  stepWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 10 },
  stepCount: { ...typeStyles.caption, color: colors.inkMuted },
  /* two fields on one row, each taking half the width */
  duo: { flexDirection: 'row', gap: spacing.md },

  title: {
    flex: 1,
    fontFamily: typography.heading.family,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 4, marginBottom: spacing.xl },
  star: { color: colors.danger },
  empty: { ...typeStyles.caption, color: colors.inkMuted, marginBottom: spacing.md },

  /* photo */
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  photo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.surfie,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOn: { borderStyle: 'solid', borderColor: colors.surface.selected },
  photoBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.paris,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTitle: { ...typeStyles.label, color: colors.ink },
  photoHint: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },
  photoChange: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.surfie,
  },
  photoChangeText: { ...typeStyles.buttonSmall, color: colors.surfie },

  /* repeatable entries */
  entry: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  entryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  entryTitle: { ...typeStyles.cardTitle, color: colors.ink },
  entryMeta: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },
  entryProof: { ...typeStyles.caption, color: colors.surfie, marginTop: 6 },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  entryAction: { ...typeStyles.buttonSmall, color: colors.surfie },
  entryRemove: { ...typeStyles.buttonSmall, color: colors.danger },
  entryRule: { width: 1, height: 14, backgroundColor: colors.surface.line },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.surfie,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  addBtnText: { ...typeStyles.buttonSmall, color: colors.surfie },

  endWrap: { marginTop: spacing.lg },

  /* total experience */
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface.mintSoft,
    borderWidth: 1,
    borderColor: colors.surface.selected,
    marginBottom: spacing.lg,
  },
  totalIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalValue: {
    fontFamily: typography.heading.family,
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  totalLabel: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },

  /* review */
  reviewCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    marginBottom: spacing.lg,
  },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  reviewBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  reviewLabel: { ...typeStyles.cardTitle, color: colors.ink },
  reviewValue: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },
  reviewEdit: { ...typeStyles.buttonSmall, color: colors.surfie },
  confirmWrap: { marginBottom: spacing.lg },

  /* footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  cta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.surfie,
  },
  ctaOff: { backgroundColor: colors.inkFaint },
  ctaText: { ...typeStyles.button, color: colors.white },
});

export default OnboardingFlow;
