import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, BackHandler, Image } from 'react-native';

import { colors, radius, spacing } from '../../../theme/brand';
import { typeStyles, fontWeight } from '../../../theme/typography';
import { Icon } from '../../../components/Icon';
import { Screen, Button } from '../../../components/ui';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { confirm, confirmDiscard } from '../../../components/confirm';
import { toast } from '../../../components/Toast';
import { FilePickerSheet, photoPreview, useUpload, type PickedFile } from '../../../components/upload';
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
import { TODAY } from '../../../data/calendar';
import {
  GENDERS,
  ID_TYPES,
  OTHER_ID,
  CONSULT_LANGUAGES,
  QUALIFICATION_OPTIONS,
  POSITION_OPTIONS,
  UPLOAD_HINT,
  STEPS,
  emptyDraft,
  isStepComplete,
  maskId,
  totalExperienceYears,
  validateBasic,
  validateIdentity,
  validateQualification,
  validateExperience,
  type Experience,
  type FieldErrors,
  type Qualification,
  type RegistrationDraft,
  type StepKey,
} from '../../../data/registration';

/**
 * Doctor onboarding — the four sections completed after OTP sign-in, then a
 * review screen and submission. Submitting leads straight to Account Status,
 * which shows the review under way.
 *
 * One draft is held here and handed down; each step is a view over it. A
 * step's button always works: pressing it either moves on or shows exactly
 * what is missing, rather than sitting disabled with no explanation. Field
 * errors also appear once a field is left.
 *
 * `resubmit` mode opens on Review with the doctor's previous submission, for a
 * verification that came back with issues.
 */

let idSeq = 0;
const newId = (prefix: string) => {
  idSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeq}`;
};

const formatMobile = (m: string) => {
  const d = m.replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : m;
};

const monthNow = () => `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}`;

type Step = StepKey | 'review';

/* -------------------------------- chrome ---------------------------------- */

const Layout = ({
  stepIndex,
  title,
  subtitle,
  children,
  onBack,
  backLabel,
  primaryLabel,
  onPrimary,
  secondary,
  testID,
}: {
  stepIndex: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondary?: ReactNode;
  testID?: string;
}) => (
  <Screen
    testID={testID}
    background={colors.white}
    header={
      <View>
        <ScreenHeader onBack={onBack} backLabel={backLabel} />
        {stepIndex >= 0 && (
          <View style={s.stepWrap}>
            <View style={s.titleRow}>
              <Text style={s.title} accessibilityRole="header">
                {title}
              </Text>
              <Text style={s.stepCount}>
                {stepIndex + 1} of {STEPS.length}
              </Text>
            </View>
            <StepProgress steps={STEPS} index={stepIndex} />
          </View>
        )}
      </View>
    }
    footer={
      <View style={s.footerRow}>
        {secondary}
        <Button testID="onboarding-primary" label={primaryLabel} onPress={onPrimary} icon="arrowRight" iconRight style={s.flex} />
      </View>
    }
  >
    <View style={s.content}>
      {stepIndex < 0 && (
        <Text style={[s.title, s.titleStandalone]} accessibilityRole="header">
          {title}
        </Text>
      )}
      {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  </Screen>
);

const CancelButton = ({ onPress }: { onPress: () => void }) => (
  <Button testID="onboarding-cancel" label="Cancel" variant="secondary" onPress={onPress} style={s.cancelBtn} />
);

/** A saved qualification / experience entry. */
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
        <Text style={s.entryTitle}>{title}</Text>
        <Text style={s.entryMeta}>{meta}</Text>
      </View>
      <Icon name="checkCircle" size={17} color={colors.surfie} />
    </View>
    <Text style={s.entryProof}>{proofLabel}</Text>
    <View style={s.entryActions}>
      <Pressable testID={testID ? `${testID}-edit` : undefined} onPress={onEdit} hitSlop={8} style={s.entryBtn} accessibilityRole="button" accessibilityLabel={`Edit ${title}`}>
        <Icon name="pencil" size={14} color={colors.surfie} />
        <Text style={s.entryAction}>Edit</Text>
      </Pressable>
      <View style={s.entryRule} />
      <Pressable testID={testID ? `${testID}-remove` : undefined} onPress={onRemove} hitSlop={8} style={s.entryBtn} accessibilityRole="button" accessibilityLabel={`Remove ${title}`}>
        <Icon name="trash" size={14} color={colors.danger} />
        <Text style={s.entryRemove}>Remove</Text>
      </Pressable>
    </View>
  </View>
);

const AddButton = ({ label, onPress, testID, invalid }: { label: string; onPress: () => void; testID?: string; invalid?: boolean }) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    style={({ pressed }) => [s.addBtn, invalid && s.addBtnInvalid, pressed && s.pressed]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Icon name="plus" size={14} color={colors.surfie} />
    <Text style={s.addBtnText}>{label}</Text>
  </Pressable>
);

const Err = ({ children }: { children?: string }) => (children ? <Text style={s.error}>{children}</Text> : null);

/* --------------------------------- photo ---------------------------------- */

const PHOTO_MAX_MB = 5;

/** The profile photo, with the same pick → upload → attached lifecycle as documents. */
const PhotoField = ({ file, onChange, error }: { file: PickedFile | null; onChange: (f: PickedFile | null) => void; error?: string }) => {
  const up = useUpload({ maxMb: PHOTO_MAX_MB, onDone: (f) => onChange(f) });
  const uploading = up.status === 'uploading' && !!up.pending;
  const picture = photoPreview(file);

  return (
    <View style={s.photoField}>
      <View style={s.photoRow}>
        <Pressable
          testID="photo"
          onPress={up.select}
          disabled={uploading}
          style={[s.photo, !!file && s.photoOn, !!error && !file && s.photoInvalid]}
          accessibilityRole="button"
          accessibilityLabel={file ? 'Change profile photo' : 'Add profile photo'}
        >
          {uploading ? (
            <Text style={s.photoProgress}>{up.progress}%</Text>
          ) : picture ? (
            <Image testID="photo-image" source={picture} style={s.photoImage} accessibilityIgnoresInvertColors />
          ) : (
            <Icon name={file ? 'user' : 'plus'} size={file ? 30 : 22} color={colors.surfie} />
          )}
          {!!file && !uploading && (
            <View style={s.photoBadge}>
              <Icon name="check" size={11} weight={3} color={colors.white} />
            </View>
          )}
        </Pressable>

        <View style={s.flex}>
          <Text style={s.photoTitle}>
            Profile Photo <Text style={s.star}>*</Text>
          </Text>
          <Text testID="photo-status" style={s.photoHint} numberOfLines={1}>
            {uploading
              ? `${file ? 'Replacing' : 'Uploading'} ${up.pending?.name}…`
              : file
                ? `${file.name} · ${file.size}`
                : `JPG or PNG · Max ${PHOTO_MAX_MB} MB`}
          </Text>
          {/* No separate Remove: the photo is required anyway, so Change is the
              only action that leads anywhere useful. */}
        </View>

        {uploading ? (
          <Pressable testID="photo-cancel" onPress={up.cancel} hitSlop={6} style={s.photoBtn} accessibilityRole="button" accessibilityLabel="Cancel photo upload">
            <Text style={s.photoBtnText}>Cancel</Text>
          </Pressable>
        ) : (
          <Pressable
            testID={file ? 'photo-change' : 'photo-add'}
            onPress={up.select}
            hitSlop={6}
            style={s.photoBtn}
            accessibilityRole="button"
            accessibilityLabel={file ? 'Change profile photo' : 'Add profile photo'}
          >
            <Text style={s.photoBtnText}>{file ? 'Change' : 'Add photo'}</Text>
          </Pressable>
        )}
      </View>

      {up.status === 'error' && (
        <View testID="photo-error" style={s.photoError}>
          <Icon name="alertCircle" size={16} color={colors.danger} />
          <Text style={s.photoErrorText}>{up.error}</Text>
          <Pressable testID="photo-retry" onPress={up.select} hitSlop={6} accessibilityRole="button">
            <Text style={s.photoErrorAction}>Try again</Text>
          </Pressable>
          <Pressable onPress={up.dismissError} hitSlop={6} accessibilityRole="button" accessibilityLabel="Dismiss">
            <Icon name="close" size={15} color={colors.danger} />
          </Pressable>
        </View>
      )}

      {!file && up.status === 'idle' && <Err>{error}</Err>}

      <FilePickerSheet visible={up.status === 'selecting'} kind="photo" maxMb={PHOTO_MAX_MB} onPick={up.choose} onClose={up.closePicker} testID="photo" />
    </View>
  );
};

/* ------------------------------- the flow --------------------------------- */

export const OnboardingFlow = ({
  mobile,
  email = '',
  initialDraft,
  mode = 'register',
  flagged = [],
  onSubmitted,
  onExit,
  now = monthNow(),
}: {
  /** The number the doctor signed in with — shown verified, never asked again. */
  mobile: string;
  email?: string;
  /** A previous submission, for resubmitting after a rejection. */
  initialDraft?: RegistrationDraft;
  mode?: 'register' | 'resubmit';
  /** Sections the verification team asked to correct, with the reason shown. */
  flagged?: { step: StepKey; label: string }[];
  onSubmitted: (draft: RegistrationDraft) => void;
  /** Leaves the flow (sign-in, or back to Account Status when resubmitting). */
  onExit: () => void;
  /** Current month as `YYYY-MM`; injected so totals do not drift with the clock. */
  now?: string;
}) => {
  // created once; a later prop change must not reset the doctor's work
  const [start] = useState<RegistrationDraft>(() => initialDraft ?? emptyDraft(formatMobile(mobile), email));
  const [draft, setDraft] = useState<RegistrationDraft>(start);
  const [step, setStep] = useState<Step>(mode === 'resubmit' ? 'review' : 'basic');
  /** Set when a step was opened from Review: its button returns there. */
  const [fromReview, setFromReview] = useState(mode === 'resubmit');
  const [editingQual, setEditingQual] = useState<{ entry: Qualification; original?: Qualification } | null>(null);
  const [editingExp, setEditingExp] = useState<{ entry: Experience; original?: Experience } | null>(null);
  /** Fields left at least once, or every field after a failed continue. */
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(false);
  const [idFocused, setIdFocused] = useState(false);
  const [reviewError, setReviewError] = useState('');
  /** Flagged sections the doctor has opened since arriving. */
  const [revisited, setRevisited] = useState<StepKey[]>([]);

  const years = useMemo(() => totalExperienceYears(draft.experience, now), [draft.experience, now]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(start);

  const setBasic = (p: Partial<RegistrationDraft['basic']>) => setDraft((d) => ({ ...d, basic: { ...d.basic, ...p } }));
  const setIdentity = (p: Partial<RegistrationDraft['identity']>) => setDraft((d) => ({ ...d, identity: { ...d.identity, ...p } }));
  const touch = (field: string) => () => setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  const shown = (errors: FieldErrors, field: string) => (showAll || touched[field] ? errors[field] : undefined);

  const goto = (k: Step) => {
    setTouched({});
    setShowAll(false);
    setReviewError('');
    setStep(k);
  };

  const exit = () => {
    if (!dirty) return onExit();
    confirm({
      title: mode === 'resubmit' ? 'Discard your changes?' : 'Leave registration?',
      message: mode === 'resubmit' ? 'Your corrections will not be submitted.' : 'The details you have entered will be lost.',
      confirmLabel: mode === 'resubmit' ? 'Discard' : 'Leave',
      destructive: true,
      onConfirm: onExit,
    });
  };

  const closeQual = () => {
    const changed = editingQual && JSON.stringify(editingQual.entry) !== JSON.stringify(editingQual.original ?? blankQual(editingQual.entry.id));
    const close = () => {
      setEditingQual(null);
      setTouched({});
      setShowAll(false);
    };
    if (changed) confirmDiscard(close, 'this qualification');
    else close();
  };
  const closeExp = () => {
    const changed = editingExp && JSON.stringify(editingExp.entry) !== JSON.stringify(editingExp.original ?? blankExp(editingExp.entry.id));
    const close = () => {
      setEditingExp(null);
      setTouched({});
      setShowAll(false);
    };
    if (changed) confirmDiscard(close, 'this experience');
    else close();
  };

  const back = () => {
    if (editingQual) return closeQual();
    if (editingExp) return closeExp();
    if (step === 'review') return mode === 'resubmit' ? exit() : goto('experience');
    if (fromReview) return goto('review');
    const i = STEPS.findIndex((x) => x.key === step);
    if (i > 0) return goto(STEPS[i - 1].key);
    exit();
  };

  // Android's back button walks the same path as the on-screen one
  const backRef = useRef(back);
  backRef.current = back;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      backRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  /** Continue from a step: move on when complete, otherwise show every error. */
  const advance = (key: StepKey, next: Step) => {
    if (!isStepComplete(draft, key)) {
      setShowAll(true);
      return;
    }
    if (fromReview || next === 'review') {
      setFromReview(false);
      goto('review');
      return;
    }
    goto(next);
  };
  const continueLabel = fromReview ? 'Save & return to review' : 'Save & Continue';

  /* ------------------------------ 1. basic ------------------------------- */
  if (step === 'basic') {
    const b = draft.basic;
    const e = validateBasic(b);
    return (
      <Layout
        key="basic"
        testID="onboarding-basic"
        stepIndex={0}
        title="Basic Details"
        onBack={back}
        backLabel={fromReview ? 'Back to review' : 'Leave registration'}
        primaryLabel={continueLabel}
        onPrimary={() => advance('basic', 'identity')}
      >
        <PhotoField file={b.photo} onChange={(photo) => setBasic({ photo })} error={shown(e, 'photo')} />

        <TextField
          testID="fullName"
          label="Full Name"
          required
          value={b.fullName}
          onChangeText={(v) => setBasic({ fullName: v })}
          onBlur={touch('fullName')}
          placeholder="Enter your full name"
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
          error={shown(e, 'fullName')}
        />

        {/* date and gender are one fact about the doctor, so they share a row */}
        <View style={s.duo}>
          <View style={s.flex}>
            <DateField testID="dob" label="Date of Birth" required value={b.dob} onChange={(v) => setBasic({ dob: v })} onBlur={touch('dob')} error={shown(e, 'dob')} />
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
              error={shown(e, 'gender')}
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
          onChangeText={(v) => setBasic({ email: v.trim() })}
          onBlur={touch('email')}
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
          autoComplete="email"
          error={shown(e, 'email')}
        />
        <MultiSelectField
          testID="languages"
          label="Languages for Consultation"
          required
          values={b.languages}
          options={CONSULT_LANGUAGES}
          onChange={(v) => setBasic({ languages: v })}
          addLabel="Add language"
          searchPlaceholder="Search languages"
          error={shown(e, 'languages')}
        />

        <PrivacyNote>Your date of birth, mobile number and email are used only for verification and are not shown to patients.</PrivacyNote>
      </Layout>
    );
  }

  /* ----------------------------- 2. identity ----------------------------- */
  if (step === 'identity') {
    const idp = draft.identity;
    const e = validateIdentity(idp);
    const other = idp.idType === OTHER_ID;
    const masked = !idFocused && !e.idNumber && idp.idNumber ? `Saved as ${maskId(idp.idNumber.replace(/\s/g, ''))}` : undefined;
    return (
      <Layout
        key="identity"
        testID="onboarding-identity"
        stepIndex={1}
        title="Proof of Identity"
        subtitle="Upload one valid government-issued identity document for verification."
        onBack={back}
        backLabel={fromReview ? 'Back to review' : 'Back to basic details'}
        primaryLabel={continueLabel}
        onPrimary={() => advance('identity', 'qualifications')}
      >
        <SelectField
          testID="idType"
          label="Government ID Type"
          required
          value={idp.idType}
          options={ID_TYPES}
          onChange={(v) => setIdentity({ idType: v, idTypeName: v === OTHER_ID ? idp.idTypeName : '' })}
          placeholder="Select ID type"
          error={shown(e, 'idType')}
        />
        {other && (
          <TextField
            testID="idTypeName"
            label="Name of the ID document"
            required
            value={idp.idTypeName ?? ''}
            onChangeText={(v) => setIdentity({ idTypeName: v })}
            onBlur={touch('idTypeName')}
            placeholder="e.g. PAN card"
            autoCapitalize="words"
            maxLength={60}
            error={shown(e, 'idTypeName')}
          />
        )}
        <TextField
          testID="idNumber"
          label="Government ID Number"
          required
          value={idp.idNumber}
          onChangeText={(v) => setIdentity({ idNumber: v.toUpperCase() })}
          onFocus={() => setIdFocused(true)}
          onBlur={() => {
            setIdFocused(false);
            touch('idNumber')();
          }}
          placeholder="Enter ID number"
          autoCapitalize="characters"
          maxLength={24}
          helper={masked}
          error={shown(e, 'idNumber')}
        />
        <UploadField
          testID="idDocument"
          label="Government ID Document"
          required
          hint={UPLOAD_HINT}
          file={idp.document}
          onChange={(document) => setIdentity({ document })}
          error={shown(e, 'document')}
        />

        <PrivacyNote icon="shieldCheck">Your identity document is used only for verification and is never shown to patients.</PrivacyNote>
      </Layout>
    );
  }

  /* --------------------------- 3. qualifications -------------------------- */
  if (step === 'qualifications') {
    if (editingQual) {
      const q = editingQual.entry;
      const e = validateQualification(q);
      const set = (p: Partial<Qualification>) => setEditingQual({ ...editingQual, entry: { ...q, ...p } });
      return (
        <Layout
          key={`qual-${q.id}`}
          testID="qualification-editor"
          stepIndex={2}
          title={editingQual.original ? 'Edit Qualification' : 'Add Qualification'}
          subtitle="Each qualification needs its own degree certificate."
          onBack={closeQual}
          backLabel="Cancel"
          primaryLabel="Save Qualification"
          secondary={<CancelButton onPress={closeQual} />}
          onPrimary={() => {
            if (Object.keys(e).length) {
              setShowAll(true);
              return;
            }
            setDraft((d) => ({
              ...d,
              qualifications: editingQual.original ? d.qualifications.map((x) => (x.id === q.id ? q : x)) : [...d.qualifications, q],
            }));
            setEditingQual(null);
            setTouched({});
            setShowAll(false);
          }}
        >
          <SelectField
            testID="degree"
            label="Qualification / Degree"
            required
            searchable
            value={q.degree}
            options={QUALIFICATION_OPTIONS}
            onChange={(v) => set({ degree: v })}
            placeholder="e.g. MBBS"
            error={shown(e, 'degree')}
          />
          <TextField
            testID="specialty"
            label="Specialty / Subject"
            value={q.specialty ?? ''}
            onChangeText={(v) => set({ specialty: v })}
            placeholder="Where applicable"
            helper="Optional"
          />
          <TextField
            testID="institution"
            label="Institution / College"
            required
            value={q.institution}
            onChangeText={(v) => set({ institution: v })}
            onBlur={touch('institution')}
            placeholder="e.g. AIIMS New Delhi"
            autoCapitalize="words"
            error={shown(e, 'institution')}
          />
          <TextField
            testID="university"
            label="University"
            required
            value={q.university}
            onChangeText={(v) => set({ university: v })}
            onBlur={touch('university')}
            placeholder="Awarding university"
            autoCapitalize="words"
            error={shown(e, 'university')}
          />
          <TextField
            testID="year"
            label="Year of Passing"
            required
            value={q.year}
            onChangeText={(v) => set({ year: v.replace(/\D/g, '').slice(0, 4) })}
            onBlur={touch('year')}
            placeholder="YYYY"
            keyboardType="number-pad"
            maxLength={4}
            error={shown(e, 'year')}
          />
          <UploadField
            testID="certificate"
            label="Degree Certificate"
            required
            hint={UPLOAD_HINT}
            file={q.certificate}
            onChange={(certificate) => set({ certificate })}
            error={shown(e, 'certificate')}
          />
          <PrivacyNote>
            Patients see the degree name only. Institution, university, year of passing and the certificate itself are used for
            verification and stay private.
          </PrivacyNote>
        </Layout>
      );
    }

    const hasAny = draft.qualifications.length > 0;
    return (
      <Layout
        key="qualifications"
        testID="onboarding-qualifications"
        stepIndex={2}
        title="Professional Qualifications"
        subtitle="Add your medical qualifications, starting with your basic qualification."
        onBack={back}
        backLabel={fromReview ? 'Back to review' : 'Back to proof of identity'}
        primaryLabel={continueLabel}
        onPrimary={() => advance('qualifications', 'experience')}
      >
        {!hasAny && <Text style={s.empty}>No qualifications added yet. Start with your basic medical qualification.</Text>}
        {draft.qualifications.map((q) => (
          <EntryCard
            key={q.id}
            testID={`qual-${q.id}`}
            title={q.degree}
            meta={`${q.institution} · ${q.year}`}
            proofLabel={q.certificate ? `Certificate · ${q.certificate.name}` : 'Certificate missing'}
            onEdit={() => setEditingQual({ entry: q, original: q })}
            onRemove={() =>
              confirm({
                title: `Remove ${q.degree}?`,
                message: 'Its certificate is removed with it.',
                confirmLabel: 'Remove',
                destructive: true,
                onConfirm: () => setDraft((d) => ({ ...d, qualifications: d.qualifications.filter((x) => x.id !== q.id) })),
              })
            }
          />
        ))}
        <AddButton
          testID="add-qualification"
          label={hasAny ? 'Add Another Qualification' : 'Add Qualification'}
          invalid={showAll && !hasAny}
          onPress={() => {
            setTouched({});
            setShowAll(false);
            setEditingQual({ entry: blankQual(newId('q')) });
          }}
        />
        {showAll && !hasAny && <Err>Add at least one qualification to continue.</Err>}
      </Layout>
    );
  }

  /* ----------------------------- 4. experience ---------------------------- */
  if (step === 'experience') {
    if (editingExp) {
      const x = editingExp.entry;
      const e = validateExperience(x);
      const set = (p: Partial<Experience>) => setEditingExp({ ...editingExp, entry: { ...x, ...p } });
      return (
        <Layout
          key={`exp-${x.id}`}
          testID="experience-editor"
          stepIndex={3}
          title={editingExp.original ? 'Edit Experience' : 'Add Experience'}
          subtitle="Employment proof is required for each role."
          onBack={closeExp}
          backLabel="Cancel"
          primaryLabel="Save Experience"
          secondary={<CancelButton onPress={closeExp} />}
          onPrimary={() => {
            if (Object.keys(e).length) {
              setShowAll(true);
              return;
            }
            setDraft((d) => ({
              ...d,
              experience: editingExp.original ? d.experience.map((y) => (y.id === x.id ? x : y)) : [...d.experience, x],
            }));
            setEditingExp(null);
            setTouched({});
            setShowAll(false);
          }}
        >
          <SelectField
            testID="position"
            label="Position / Designation"
            required
            searchable
            value={x.position}
            options={POSITION_OPTIONS}
            onChange={(v) => set({ position: v })}
            placeholder="e.g. Consultant Psychiatrist"
            error={shown(e, 'position')}
          />
          <TextField
            testID="workplace"
            label="Institution / Hospital / Clinic"
            required
            value={x.institution}
            onChangeText={(v) => set({ institution: v })}
            onBlur={touch('institution')}
            placeholder="Where you worked"
            autoCapitalize="words"
            error={shown(e, 'institution')}
          />
          <TextField
            testID="start"
            label="Start Month"
            required
            value={x.start}
            onChangeText={(v) => set({ start: monthMask(v) })}
            onBlur={touch('start')}
            placeholder="YYYY / MM"
            keyboardType="number-pad"
            maxLength={9}
            error={shown(e, 'start')}
          />
          <CheckField testID="current" checked={x.current} onToggle={() => set({ current: !x.current, end: x.current ? '' : null })}>
            I currently work here
          </CheckField>
          {!x.current && (
            <View style={s.endWrap}>
              <TextField
                testID="end"
                label="End Month"
                required
                value={x.end ?? ''}
                onChangeText={(v) => set({ end: monthMask(v) })}
                onBlur={touch('end')}
                placeholder="YYYY / MM"
                keyboardType="number-pad"
                maxLength={9}
                error={shown(e, 'end')}
              />
            </View>
          )}
          <UploadField
            testID="proof"
            label="Experience / Employment Proof"
            required
            hint="Experience certificate, appointment letter or employment certificate"
            file={x.proof}
            onChange={(proof) => set({ proof })}
            error={shown(e, 'proof')}
          />
          <PrivacyNote>
            Patients see only your total verified years of experience. Positions, institutions, employment dates and certificates
            stay private.
          </PrivacyNote>
        </Layout>
      );
    }

    const hasAny = draft.experience.length > 0;
    return (
      <Layout
        key="experience"
        testID="onboarding-experience"
        stepIndex={3}
        title="Experience Details"
        subtitle="Add your current and previous roles. Your total is calculated automatically."
        onBack={back}
        backLabel={fromReview ? 'Back to review' : 'Back to qualifications'}
        primaryLabel={fromReview ? continueLabel : 'Save & Review'}
        onPrimary={() => advance('experience', 'review')}
      >
        {hasAny && (
          <View testID="total-experience" style={s.totalCard}>
            <View style={s.totalIcon}>
              <Icon name="star" size={17} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={s.totalValue}>
                {years} {years === 1 ? 'Year' : 'Years'}
              </Text>
              <Text style={s.totalLabel}>Total experience · overlapping roles counted once</Text>
            </View>
          </View>
        )}
        {!hasAny && <Text style={s.empty}>No experience added yet. Add your current role first.</Text>}
        {draft.experience.map((x) => (
          <EntryCard
            key={x.id}
            testID={`exp-${x.id}`}
            title={x.position}
            meta={`${x.institution} · ${x.start} – ${x.current ? 'Present' : x.end}`}
            proofLabel={x.proof ? `Proof · ${x.proof.name}` : 'Proof missing'}
            onEdit={() => setEditingExp({ entry: x, original: x })}
            onRemove={() =>
              confirm({
                title: `Remove ${x.position}?`,
                message: 'Its employment proof is removed with it.',
                confirmLabel: 'Remove',
                destructive: true,
                onConfirm: () => setDraft((d) => ({ ...d, experience: d.experience.filter((y) => y.id !== x.id) })),
              })
            }
          />
        ))}
        <AddButton
          testID="add-experience"
          label={hasAny ? 'Add Another Experience' : 'Add Experience'}
          invalid={showAll && !hasAny}
          onPress={() => {
            setTouched({});
            setShowAll(false);
            setEditingExp({ entry: blankExp(newId('e')) });
          }}
        />
        {showAll && !hasAny && <Err>Add at least one role to continue.</Err>}
      </Layout>
    );
  }

  /* ------------------------------- 5. review ------------------------------ */
  const idLabel = draft.identity.idType === OTHER_ID ? draft.identity.idTypeName || OTHER_ID : draft.identity.idType;
  const rows: { key: StepKey; label: string; value: string }[] = [
    {
      key: 'basic',
      label: 'Basic Details',
      value: [draft.basic.fullName, draft.basic.gender, draft.basic.languages.join(', ')].filter(Boolean).join(' · ') || 'Not started',
    },
    {
      key: 'identity',
      label: 'Proof of Identity',
      value: draft.identity.idType ? `${idLabel} · ${maskId(draft.identity.idNumber.replace(/\s/g, ''))}` : 'Not started',
    },
    {
      key: 'qualifications',
      label: 'Professional Qualifications',
      value: draft.qualifications.length ? draft.qualifications.map((q) => q.degree).join(', ') : 'None added',
    },
    {
      key: 'experience',
      label: 'Experience Details',
      value: draft.experience.length ? `${years} ${years === 1 ? 'year' : 'years'} · ${draft.experience.length} ${draft.experience.length === 1 ? 'role' : 'roles'}` : 'None added',
    },
  ];
  const incomplete = STEPS.filter((st) => !isStepComplete(draft, st.key));

  const submit = () => {
    if (incomplete.length) {
      setReviewError(`Complete ${incomplete.map((x) => x.label).join(', ')} before submitting.`);
      return;
    }
    if (!draft.confirmed) {
      setReviewError('Confirm the declaration to submit.');
      return;
    }
    confirm({
      title: mode === 'resubmit' ? 'Resubmit for verification?' : 'Submit for verification?',
      message: 'Your details are locked while the verification team reviews them.',
      confirmLabel: 'Submit',
      // straight on to Account Status, which shows the review under way
      onConfirm: () => {
        toast.show(mode === 'resubmit' ? 'Resubmitted for verification' : 'Details submitted for verification');
        onSubmitted(draft);
      },
    });
  };

  return (
    <Layout
      key="review"
      testID="onboarding-review"
      stepIndex={-1}
      title={mode === 'resubmit' ? 'Update & Resubmit' : 'Review Your Details'}
      subtitle={mode === 'resubmit' ? 'Correct the sections flagged by the verification team, then resubmit.' : 'Check everything before submitting. You can edit any section.'}
      onBack={back}
      backLabel={mode === 'resubmit' ? 'Close' : 'Back to experience'}
      primaryLabel={mode === 'resubmit' ? 'Resubmit for Verification' : 'Submit for Verification'}
      onPrimary={submit}
    >
      <View style={s.reviewCard}>
        {rows.map((r, i) => {
          const done = isStepComplete(draft, r.key);
          const flag = flagged.find((f) => f.step === r.key && !revisited.includes(r.key));
          const ok = done && !flag;
          return (
            <View key={r.key} testID={`review-${r.key}`} style={[s.reviewRow, i < rows.length - 1 && s.reviewBorder]}>
              <Icon name={ok ? 'checkCircle' : 'alertCircle'} size={18} color={ok ? colors.surfie : colors.warn} filled={ok} />
              <View style={s.flex}>
                <Text style={s.reviewLabel}>{r.label}</Text>
                <Text style={s.reviewValue}>{r.value}</Text>
                {!done && <Text style={s.reviewTodo}>Needs attention</Text>}
                {done && !!flag && <Text testID={`flag-${r.key}`} style={s.reviewTodo}>Flagged: {flag.label}</Text>}
              </View>
              <Pressable
                testID={`edit-${r.key}`}
                onPress={() => {
                  setRevisited((v) => (v.includes(r.key) ? v : [...v, r.key]));
                  setFromReview(true);
                  goto(r.key);
                }}
                hitSlop={8}
                style={s.reviewEditBtn}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${r.label}`}
              >
                <Text style={s.reviewEdit}>Edit</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={s.confirmWrap}>
        <CheckField
          testID="confirm"
          checked={draft.confirmed}
          onToggle={() => {
            setReviewError('');
            setDraft((d) => ({ ...d, confirmed: !d.confirmed }));
          }}
        >
          I confirm that the information and documents provided are accurate and authentic.
        </CheckField>
      </View>
      {!!reviewError && (
        <Text testID="review-error" style={s.error}>
          {reviewError}
        </Text>
      )}

      <PrivacyNote icon="shieldCheck">
        Once approved, patients see your name, photo, specialty, degree names, total experience, languages, bio, fee and
        availability. Everything else stays private.
      </PrivacyNote>
    </Layout>
  );
};

const blankQual = (id: string): Qualification => ({ id, degree: '', institution: '', university: '', year: '', certificate: null });
const blankExp = (id: string): Experience => ({ id, position: '', institution: '', start: '', end: null, current: false, proof: null });

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.8 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },

  stepWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 10 },
  stepCount: { ...typeStyles.caption, color: colors.inkMuted },
  title: { ...typeStyles.pageTitle, flex: 1, color: colors.ink },
  titleStandalone: { flex: 0 },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 4, marginBottom: spacing.xl },
  duo: { flexDirection: 'row', gap: spacing.md },
  star: { color: colors.danger },
  empty: { ...typeStyles.bodySmall, color: colors.inkMuted, marginBottom: spacing.md },
  error: { ...typeStyles.helper, color: colors.danger, marginTop: 4, marginBottom: spacing.md },

  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cancelBtn: { paddingHorizontal: spacing.lg },

  photoField: { marginBottom: spacing.xl },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
  photoInvalid: { borderColor: colors.danger },
  photoProgress: { ...typeStyles.number, color: colors.surfie },
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
  photoBtn: { paddingHorizontal: spacing.md, minHeight: 40, justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.surfie },
  photoBtnText: { ...typeStyles.buttonSmall, color: colors.surfie },
  photoError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  photoErrorText: { ...typeStyles.caption, color: colors.danger, flex: 1 },
  photoErrorAction: { ...typeStyles.buttonSmall, color: colors.danger, textDecorationLine: 'underline' },
  photoImage: { width: '100%', height: '100%', borderRadius: 37 },
  photoRemove: { alignSelf: 'flex-start', marginTop: 2, minHeight: 28, justifyContent: 'center' },
  photoRemoveText: { ...typeStyles.caption, fontWeight: fontWeight.semibold, color: colors.inkMuted, textDecorationLine: 'underline' },

  entry: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.surface.line, backgroundColor: colors.white, marginBottom: spacing.sm },
  entryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  entryTitle: { ...typeStyles.cardTitle, color: colors.ink },
  entryMeta: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },
  entryProof: { ...typeStyles.caption, color: colors.surfie, marginTop: 6 },
  entryActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.surface.line },
  entryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 40 },
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
    marginBottom: spacing.sm,
  },
  addBtnInvalid: { borderColor: colors.danger },
  addBtnText: { ...typeStyles.buttonSmall, color: colors.surfie },

  endWrap: { marginTop: spacing.lg },

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
  totalIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  totalValue: { ...typeStyles.metricSmall, color: colors.ink },
  totalLabel: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },

  reviewCard: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.surface.line, backgroundColor: colors.white, marginBottom: spacing.lg },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md },
  reviewBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  reviewLabel: { ...typeStyles.cardTitle, color: colors.ink },
  reviewValue: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },
  reviewTodo: { ...typeStyles.caption, color: colors.warn, fontWeight: fontWeight.semibold, marginTop: 2 },
  reviewEditBtn: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing.xs },
  reviewEdit: { ...typeStyles.buttonSmall, color: colors.surfie },
  confirmWrap: { marginBottom: spacing.sm },

});

export default OnboardingFlow;
