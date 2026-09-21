import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';

import {
  DomainCode,
  LANGUAGES,
  LANGUAGE_LABELS,
  messageFor,
  useProfile,
  useRegions,
  useUpdateProfile,
  type Gender,
  type Language,
} from '@coracure/api';
import { colors, radius, spacing, typography } from '@coracure/brand';
import {
  ageFromISO,
  Banner,
  BrandBackground,
  Button,
  ChoiceGroup,
  DateOfBirthField,
  ErrorState,
  Icon,
  Screen,
  Sheet,
  Skeleton,
  StepDots,
  TextField,
  type Choice,
} from '@coracure/ui';

import { useNavigator } from '../navigation/Navigator';
import { useT, type TranslationKey } from '@coracure/i18n';

/**
 * First-run profile completion (FR-2.2).
 *
 * Two deviations from the reference design, both forced by the contract:
 *
 * - **"Age" is a date of birth.** `PATCH /me/profile` takes `dateOfBirth` and
 *   derives `age` on every read; age is never stored. A field that collected
 *   the number would be wrong within a year and could not be corrected from the
 *   record. The control still shows the derived age back, which is what the
 *   mock was communicating.
 * - **Two languages, not three.** `LANGUAGES` is `['en','hi']` and the DTO's
 *   `@IsIn` rejects anything else with a 400. Offering a third chip would build
 *   a button that cannot succeed.
 *
 * Completing name and date of birth is what moves the account from `pending` to
 * `active` server-side, so the response's `isComplete` is what routes onward —
 * not a local flag.
 */

const GENDER_KEYS: { value: Gender; key: TranslationKey }[] = [
  { value: 'male', key: 'profile.male' },
  { value: 'female', key: 'profile.female' },
  { value: 'other', key: 'profile.other' },
  { value: 'undisclosed', key: 'profile.undisclosed' },
];

/**
 * The language chips carry the language's OWN name (English / हिन्दी), which is
 * the one label that must not be translated — a Hindi speaker looking for Hindi
 * needs to see "हिन्दी", whatever the interface language happens to be.
 */
const LANGUAGE_CHOICES: Choice<Language>[] = LANGUAGES.map((l) => ({
  value: l,
  label: LANGUAGE_LABELS[l],
  icon: 'language' as const,
}));

/** Oldest plausible patient, matching the backend's own sanity check. */
const MAX_AGE = 120;

export const ProfileSetupScreen = () => {
  const { replace } = useNavigator();
  const t = useT();
  const profile = useProfile();
  const regions = useRegions();
  const save = useUpdateProfile();

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [regionId, setRegionId] = useState<string | null>(null);
  const [regionOpen, setRegionOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  // Prefill from the server once it arrives. A returning user editing a partial
  // profile should not have to retype what is already stored.
  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setFullName((v) => (v === '' && p.fullName ? p.fullName : v));
    setDateOfBirth((v) => (v === '' && p.dateOfBirth ? p.dateOfBirth : v));
    setGender((v) => v ?? (p.gender === 'undisclosed' ? null : p.gender));
    setLanguage((v) =>
      v === 'en' && (LANGUAGES as readonly string[]).includes(p.preferredLanguage)
        ? (p.preferredLanguage as Language)
        : v,
    );
    setRegionId((v) => v ?? p.regionId);
  }, [profile.data]);

  const errors = useMemo(() => {
    const trimmed = fullName.trim();
    const age = dateOfBirth ? ageFromISO(dateOfBirth) : null;
    return {
      fullName:
        trimmed.length === 0
          ? t('profile.enterFullName')
          : trimmed.length > 160
            ? t('profile.nameTooLong')
            : null,
      dateOfBirth:
        dateOfBirth === ''
          ? t('profile.enterDob')
          : age === null
            ? t('profile.dobInvalid')
            : age > MAX_AGE
              ? t('profile.dobTooOld')
              : null,
    };
  }, [fullName, dateOfBirth, t]);

  const isValid = !errors.fullName && !errors.dateOfBirth;

  const selectedRegion = regions.data?.find((r) => r.id === regionId) ?? null;

  const submit = async () => {
    setTouched(true);
    if (!isValid || save.isPending) return;
    try {
      // Built field by field. Spreading this screen's state would send
      // `touched` and `regionOpen` straight into a `forbidNonWhitelisted` 400.
      const updated = await save.mutate({
        fullName: fullName.trim(),
        dateOfBirth,
        ...(gender ? { gender } : {}),
        preferredLanguage: language,
        ...(regionId ? { regionId } : {}),
      });
      // The server decides whether the profile is complete, not this screen.
      if (updated.isComplete) replace('splash');
    } catch {
      // Rendered from `save.error`.
    }
  };

  const saveMessage = useMemo(() => {
    if (!save.error) return null;
    if (save.error.code === DomainCode.INVALID_DATE_OF_BIRTH) {
      return t('profile.saveDobError');
    }
    if (save.error.code === 'VALIDATION_FAILED') {
      return t('profile.saveValidationError');
    }
    return messageFor(save.error);
  }, [save.error, t]);

  if (profile.isLoading) {
    return (
      <BrandBackground intensity="soft">
        <Screen background="transparent" testID="profile-setup-loading">
          <View style={s.skeleton}>
            <Skeleton width="60%" height={28} />
            <Skeleton width="85%" height={16} />
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={s.skeletonField}>
                <Skeleton width="35%" height={13} />
                <Skeleton height={54} radius={radius.input} />
              </View>
            ))}
          </View>
        </Screen>
      </BrandBackground>
    );
  }

  if (profile.isError) {
    return (
      <BrandBackground intensity="soft">
        <Screen background="transparent" scroll={false}>
          <ErrorState
            title={t('profile.loadError')}
            body={messageFor(profile.error)}
            requestId={profile.error?.requestId}
            onRetry={profile.refetch}
          />
        </Screen>
      </BrandBackground>
    );
  }

  return (
    <BrandBackground intensity="soft">
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen
          background="transparent"
          bottomInset
          testID="profile-setup"
          footer={
            <View style={s.footer}>
              <Button
                label={t('profile.saveContinue')}
                onPress={submit}
                trailingArrow
                loading={save.isPending}
                disabled={save.isPending || (touched && !isValid)}
                testID="save-profile"
              />
              <Text style={s.footNote}>{t('profile.privacyNote')}</Text>
              <StepDots total={5} index={3} />
            </View>
          }
        >
          <View style={s.headings}>
            <Text style={s.title} accessibilityRole="header">
              {t('profile.title')}
            </Text>
            <Text style={s.subtitle}>{t('profile.subtitle')}</Text>
          </View>

          {!!saveMessage && (
            <Banner
              tone={save.error?.isNetwork ? 'warn' : 'danger'}
              body={saveMessage}
              actionLabel={save.error?.isRetryable ? t('common.retry') : undefined}
              onAction={save.error?.isRetryable ? submit : undefined}
            />
          )}

          <TextField
            label={t('profile.fullName')}
            required
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('profile.fullNamePlaceholder')}
            icon="user"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            maxLength={160}
            editable={!save.isPending}
            error={touched ? errors.fullName : null}
          />

          <DateOfBirthField
            label={t('profile.dateOfBirth')}
            required
            value={dateOfBirth}
            onChange={setDateOfBirth}
            error={touched ? errors.dateOfBirth : null}
          />

          <ChoiceGroup<Gender>
            label={t('profile.gender')}
            choices={GENDER_KEYS.map((g) => ({ value: g.value, label: t(g.key) }))}
            value={gender}
            onChange={setGender}
            hint={t('profile.genderHint')}
          />

          <ChoiceGroup<Language>
            label={t('profile.preferredLanguage')}
            choices={LANGUAGE_CHOICES}
            value={language}
            onChange={setLanguage}
            hint={t('profile.languageHint')}
          />

          {/* ---- Personalisation ------------------------------------------ */}
          <View style={s.personalise}>
            <View style={s.personaliseHead}>
              <View style={s.personaliseIcon}>
                <Icon name="sparkle" size={17} color={colors.surfie} />
              </View>
              <View style={s.flex}>
                <Text style={s.personaliseTitle}>{t('profile.personalisation')}</Text>
                <Text style={s.personaliseBody}>{t('profile.personalisationBody')}</Text>
              </View>
            </View>

            <Pressable
              onPress={() => setRegionOpen(true)}
              disabled={!regions.data?.length}
              accessibilityRole="button"
              accessibilityLabel={
                selectedRegion ? selectedRegion.name : t('profile.selectState')
              }
              accessibilityHint={t('profile.selectStateTitle')}
              style={({ pressed }) => [s.select, pressed && s.pressed]}
            >
              <Icon name="mapPin" size={18} color={colors.inkFaint} />
              <Text style={[s.selectText, !selectedRegion && s.selectPlaceholder]}>
                {regions.isLoading
                  ? t('profile.loadingStates')
                  : (selectedRegion?.name ?? t('profile.selectState'))}
              </Text>
              <Icon name="chevronDown" size={16} color={colors.inkMuted} />
            </Pressable>

            {regions.isError && (
              <Text style={s.regionError}>{t('profile.statesError')}</Text>
            )}
          </View>
        </Screen>
      </KeyboardAvoidingView>

      <Sheet visible={regionOpen} onClose={() => setRegionOpen(false)} title={t('profile.selectStateTitle')}>
        {(regions.data ?? []).map((r) => {
          const on = r.id === regionId;
          return (
            <Pressable
              key={r.id}
              onPress={() => {
                setRegionId(r.id);
                setRegionOpen(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={r.name}
              style={({ pressed }) => [s.regionRow, pressed && s.pressed]}
            >
              <Text style={s.regionName}>{r.name}</Text>
              {on && <Icon name="check" size={18} color={colors.surfie} />}
            </Pressable>
          );
        })}
      </Sheet>
    </BrandBackground>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },

  skeleton: { gap: spacing.lg, paddingTop: spacing.xl },
  skeletonField: { gap: spacing.sm },

  headings: { gap: spacing.xs, paddingTop: spacing.lg },
  title: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxxl,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 21,
  },

  personalise: {
    backgroundColor: colors.surface.mint,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#D8F2E7',
    padding: spacing.lg,
    gap: spacing.md,
  },
  personaliseHead: { flexDirection: 'row', gap: spacing.md },
  personaliseIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaliseTitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.ink,
  },
  personaliseBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 18,
    marginTop: 2,
  },

  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.surface.inputBorder,
  },
  selectText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
    fontWeight: '600',
  },
  selectPlaceholder: { color: colors.inkFaint, fontWeight: '400' },
  regionError: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.warn,
  },

  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  regionName: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
    fontWeight: '600',
  },

  footer: { gap: spacing.md, paddingTop: spacing.sm },
  footNote: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    textAlign: 'center',
  },
});

export default ProfileSetupScreen;
