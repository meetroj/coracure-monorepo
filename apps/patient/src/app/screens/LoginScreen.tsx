import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';

import {
  ApiError,
  authApi,
  DomainCode,
  messageFor,
  retryAfterSeconds,
  useMutation,
} from '@coracure/api';
import { colors, radius, spacing, typography } from '@coracure/brand';
import {
  Banner,
  BrandBackground,
  Button,
  COUNTRY_CODES,
  Icon,
  LogoTile,
  PhoneField,
  Screen,
  Sheet,
  StepDots,
  type CountryCode,
} from '@coracure/ui';

import { Mark } from '../../components/Brand';
import { useT } from '@coracure/i18n';
import { useNavigator } from '../navigation/Navigator';
import { useSession } from '../session/SessionProvider';

/**
 * Mobile-number entry — the whole of sign-in and sign-up (FR-1.1).
 *
 * *** THIS SCREEN MUST NOT REVEAL WHETHER A NUMBER IS REGISTERED. *** The
 * backend deliberately returns an identical response either way so the endpoint
 * cannot be used to enumerate who holds an account. The copy therefore never
 * says "welcome back" conditionally, never says "no account found", and the CTA
 * is the same for both. The heading is the fixed one from the design.
 */
export const LoginScreen = () => {
  const { navigate } = useNavigator();
  const { endedReason, clearEndedReason } = useSession();
  const t = useT();

  const [country, setCountry] = useState<CountryCode>(COUNTRY_CODES[0]!);
  const [digits, setDigits] = useState('');
  const [touched, setTouched] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const e164 = useMemo(() => authApi.toE164(country.dial, digits), [country.dial, digits]);

  /** Local validation, so an obviously wrong number never costs a round trip. */
  const validation = useMemo(() => {
    if (digits.length === 0) return t('login.enterNumber');
    if (digits.length < country.digits) {
      return t('login.numberLength', { country: country.name, digits: country.digits });
    }
    if (!authApi.isValidE164(e164)) return t('login.numberInvalid');
    return null;
  }, [digits, country, e164, t]);

  const requestOtp = useMutation<string, { challengeId: string }>(authApi.requestPatientOtp);

  const serverError = requestOtp.error;
  const waitSeconds = retryAfterSeconds(serverError);

  const serverMessage = useMemo(() => {
    if (!serverError) return null;
    // Branch on `code`, never on `message`.
    if (serverError.code === DomainCode.TOO_MANY_ATTEMPTS) {
      const minutes = waitSeconds ? Math.max(1, Math.ceil(waitSeconds / 60)) : null;
      if (!minutes) return t('login.tooManyAttemptsNoWait');
      return minutes === 1
        ? t('login.tooManyAttemptsOne')
        : t('login.tooManyAttempts', { minutes });
    }
    if (serverError.code === DomainCode.ACCOUNT_NOT_ACTIVE) {
      // Plain, and deliberately not a statement about whether the account exists.
      return t('login.accountNotActive');
    }
    if (serverError.code === 'VALIDATION_FAILED') {
      return t('login.numberInvalid');
    }
    return messageFor(serverError);
  }, [serverError, waitSeconds, t]);

  const submit = async () => {
    setTouched(true);
    if (validation) return;
    clearEndedReason();
    try {
      const { challengeId } = await requestOtp.mutate(e164);
      navigate('verify-otp', {
        mobileNumber: e164,
        displayNumber: `${country.dial} ${digits}`,
        challengeId,
      });
    } catch {
      // Rendered from `requestOtp.error`; nothing to do here. Deliberately not
      // logged — the number is personal data.
    }
  };

  const showValidation = touched && !!validation;

  return (
    <BrandBackground intensity="soft">
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Screen
          background="transparent"
          bottomInset
          testID="login"
          footer={
            <View style={s.footer}>
              <Button
                label={t('common.continue')}
                onPress={submit}
                trailingArrow
                loading={requestOtp.isPending}
                disabled={requestOtp.isPending || (touched && !!validation)}
                testID="continue"
                accessibilityHint={t('login.continueHint')}
              />
              <Text style={s.legal}>
                {t('login.termsPrefix')}
                <Text
                  style={s.legalLink}
                  onPress={() => navigate('legal', { documentType: 'terms_of_use' })}
                  accessibilityRole="link"
                >
                  {t('login.termsOfUse')}
                </Text>
                {t('login.and')}
                <Text
                  style={s.legalLink}
                  onPress={() => navigate('legal', { documentType: 'privacy_policy' })}
                  accessibilityRole="link"
                >
                  {t('login.privacyPolicy')}
                </Text>
                .
              </Text>
              <StepDots total={5} index={1} />
            </View>
          }
        >
          <View style={s.brand}>
            <LogoTile mark={<Mark size={44} />} size={76} />
          </View>

          <View style={s.headings}>
            <Text style={s.title} accessibilityRole="header">
              {t('login.title')}
            </Text>
            <Text style={s.subtitle}>{t('login.subtitle')}</Text>
          </View>

          {endedReason === 'expired' && (
            <Banner
              tone="warn"
              body={t('login.sessionExpired')}
              onDismiss={clearEndedReason}
            />
          )}
          {endedReason === 'revoked' && (
            <Banner
              tone="warn"
              body={t('login.sessionRevoked')}
              onDismiss={clearEndedReason}
            />
          )}

          <PhoneField
            country={country}
            onCountryPress={() => setPickerOpen(true)}
            label={t('login.mobileNumber')}
            value={digits}
            onChangeText={(v) => {
              setDigits(v);
              if (serverError) requestOtp.reset();
            }}
            onSubmitEditing={submit}
            error={showValidation ? validation : null}
            editable={!requestOtp.isPending}
            autoFocus
            testID="mobile-number"
          />

          {!!serverMessage && (
            <Banner
              tone={serverError?.isNetwork ? 'warn' : 'danger'}
              body={serverMessage}
              actionLabel={serverError?.isRetryable ? t('common.retry') : undefined}
              onAction={serverError?.isRetryable ? submit : undefined}
            />
          )}

          <View style={s.notice}>
            <View style={s.noticeIcon}>
              <Icon name="shieldCheck" size={17} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={s.noticeTitle}>{t('login.secureVerification')}</Text>
              <Text style={s.noticeBody}>{t('login.secureVerificationBody')}</Text>
            </View>
          </View>

          <View style={s.notice}>
            <View style={s.noticeIcon}>
              <Icon name="stethoscope" size={17} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={s.noticeTitle}>{t('login.areYouADoctor')}</Text>
              <Text style={s.noticeBody}>{t('login.areYouADoctorBody')}</Text>
            </View>
          </View>
        </Screen>
      </KeyboardAvoidingView>

      <Sheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title={t('login.selectCountry')}>
        {COUNTRY_CODES.map((c) => {
          const on = c.iso === country.iso;
          return (
            <Pressable
              key={c.iso}
              onPress={() => {
                setCountry(c);
                // A number valid for one country is rarely valid for another.
                setDigits('');
                setTouched(false);
                setPickerOpen(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${c.name}, ${c.dial}`}
              style={({ pressed }) => [s.countryRow, pressed && s.pressed]}
            >
              <Text style={s.countryFlag} allowFontScaling={false}>
                {c.flag}
              </Text>
              <Text style={s.countryName}>{c.name}</Text>
              <Text style={s.countryDial}>{c.dial}</Text>
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

  brand: { alignItems: 'center', paddingTop: spacing.xl },
  headings: { gap: spacing.xs, alignItems: 'center' },
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
    textAlign: 'center',
  },

  notice: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
  },
  noticeIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeTitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '800',
    color: colors.ink,
  },
  noticeBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 18,
    marginTop: 2,
  },

  footer: { gap: spacing.md, paddingTop: spacing.sm },
  legal: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    textAlign: 'center',
    lineHeight: 17,
  },
  legalLink: { color: colors.surfie, fontWeight: '700' },

  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  countryFlag: { fontSize: 22 },
  countryName: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
    fontWeight: '600',
  },
  countryDial: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
  },
});

export default LoginScreen;
