import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';

import {
  authApi,
  DomainCode,
  messageFor,
  retryAfterSeconds,
  secureStorageAvailable,
  useMutation,
  type PatientVerifyResult,
} from '@coracure/api';
import { colors, radius, spacing, typography } from '@coracure/brand';
import {
  Banner,
  BrandBackground,
  Button,
  Icon,
  OTPInput,
  Screen,
  StepDots,
  formatDuration,
  useCountdown,
} from '@coracure/ui';

import { useNavigator, useRouteParams } from '../navigation/Navigator';
import { useT } from '@coracure/i18n';
import { useSession } from '../session/SessionProvider';

const CODE_LENGTH = 6;
/** How long before "Resend code" becomes available again. */
const RESEND_COOLDOWN_SECONDS = 30;

/**
 * OTP verification.
 *
 * Two things about this screen are contract, not taste:
 *
 * - **`challengeId` travels with the code.** The verify DTO requires it, and a
 *   resend issues a NEW challenge — so the id held here is replaced on every
 *   resend. Verifying a fresh code against a stale challenge fails as an
 *   invalid code, which is a confusing bug to chase.
 * - **The code is never logged.** Not to the console, not into an error
 *   message, not into analytics. It is a credential for the length of its life.
 */
export const VerifyOtpScreen = () => {
  const { back, replace } = useNavigator();
  const { mobileNumber, displayNumber, challengeId: initialChallengeId } =
    useRouteParams('verify-otp');
  const { signIn } = useSession();
  const t = useT();

  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState(initialChallengeId);
  const [resendAt, setResendAt] = useState(() => Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
  const [notice, setNotice] = useState<string | null>(null);

  const secondsToResend = useCountdown(resendAt);
  const canResend = secondsToResend <= 0;

  const verify = useMutation<string, PatientVerifyResult>((entered) =>
    authApi.verifyPatientOtp({ mobileNumber, challengeId, code: entered }),
  );

  const resend = useMutation<void, { challengeId: string }>(() =>
    authApi.requestPatientOtp(mobileNumber),
  );

  const error = verify.error ?? resend.error;
  const waitSeconds = retryAfterSeconds(error);

  const errorMessage = useMemo(() => {
    if (!error) return null;
    if (error.code === DomainCode.TOO_MANY_ATTEMPTS) {
      const minutes = waitSeconds ? Math.max(1, Math.ceil(waitSeconds / 60)) : null;
      if (!minutes) return t('login.tooManyAttemptsNoWait');
      return minutes === 1
        ? t('login.tooManyAttemptsOne')
        : t('login.tooManyAttempts', { minutes });
    }
    if (error.code === DomainCode.INVALID_CREDENTIALS || error.statusCode === 401) {
      // The backend returns one message for "wrong" and "expired" so a guesser
      // learns nothing; the UI offers the resend that fixes either.
      return t('otp.invalidCode');
    }
    if (error.code === DomainCode.ACCOUNT_NOT_ACTIVE) {
      return t('login.accountNotActive');
    }
    return messageFor(error);
  }, [error, waitSeconds, t]);

  const submit = useCallback(
    async (entered: string) => {
      if (entered.length !== CODE_LENGTH || verify.isPending) return;
      try {
        const result = await verify.mutate(entered);
        // Tokens are already in the keychain by this point; this flips the UI.
        signIn(result);
        // `replace`, not `navigate`: nobody should be able to go back into the
        // OTP screen with a consumed code.
        replace('splash');
      } catch {
        // Rendered from `verify.error`. Clearing the boxes gives the user an
        // obvious place to start again.
        setCode('');
      }
    },
    [verify, signIn, replace],
  );

  const doResend = async () => {
    if (!canResend || resend.isPending) return;
    try {
      const next = await resend.mutate();
      setChallengeId(next.challengeId);
      setCode('');
      setResendAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      setNotice(t('otp.resent', { number: displayNumber }));
      verify.reset();
    } catch {
      // Rendered from `resend.error`.
    }
  };

  // Clear the "code sent" note once the user starts typing the new one.
  useEffect(() => {
    if (code.length > 0 && notice) setNotice(null);
  }, [code, notice]);

  return (
    <BrandBackground intensity="soft">
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen
          background="transparent"
          bottomInset
          testID="verify-otp"
          header={
            <View style={s.header}>
              <Pressable
                onPress={back}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('common.goBack')}
                style={({ pressed }) => [s.backBtn, pressed && s.pressed]}
              >
                <Icon name="arrowLeft" size={22} color={colors.ink} />
              </Pressable>
            </View>
          }
          footer={
            <View style={s.footer}>
              <Button
                label={t('otp.verifyContinue')}
                onPress={() => submit(code)}
                trailingArrow
                loading={verify.isPending}
                disabled={code.length !== CODE_LENGTH || verify.isPending}
                testID="verify"
              />
              <StepDots total={5} index={2} />
            </View>
          }
        >
          <View style={s.headings}>
            <View style={s.badge}>
              <Icon name="message" size={20} color={colors.surfie} />
            </View>
            <Text style={s.title} accessibilityRole="header">
              {t('otp.title')}
            </Text>
            <Text style={s.subtitle}>{t('otp.subtitle', { length: CODE_LENGTH })}</Text>
            <View style={s.numberRow}>
              <Text style={s.number}>{displayNumber}</Text>
              <Pressable
                onPress={back}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('otp.editHint')}
              >
                <Text style={s.edit}>{t('otp.edit')}</Text>
              </Pressable>
            </View>
          </View>

          <OTPInput
            length={CODE_LENGTH}
            value={code}
            onChange={setCode}
            onComplete={submit}
            editable={!verify.isPending}
            error={errorMessage}
            testID="otp"
          />

          {!!notice && !errorMessage && <Banner tone="success" body={notice} />}

          <View style={s.resendRow}>
            {canResend ? (
              <Pressable
                onPress={doResend}
                disabled={resend.isPending}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('otp.resend')}
                style={({ pressed }) => [s.resendBtn, pressed && s.pressed]}
              >
                <Icon name="refresh" size={15} color={colors.surfie} />
                <Text style={s.resendActive}>
                  {resend.isPending ? t('otp.resending') : t('otp.resend')}
                </Text>
              </Pressable>
            ) : (
              <Text style={s.resendWait} accessibilityLiveRegion="polite">
                {t('otp.resendIn', { time: formatDuration(secondsToResend) })}
              </Text>
            )}
          </View>

          <View style={s.notice}>
            <View style={s.noticeIcon}>
              <Icon name="lock" size={17} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={s.noticeTitle}>{t('otp.neverShare')}</Text>
              <Text style={s.noticeBody}>{t('otp.neverShareBody')}</Text>
            </View>
          </View>

          {!secureStorageAvailable() && (
            <Banner
              tone="warn"
              title={t('otp.devBuild')}
              body={t('otp.devBuildBody')}
            />
          )}
        </Screen>
      </KeyboardAvoidingView>
    </BrandBackground>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },

  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, minHeight: 52 },
  backBtn: { padding: spacing.xs, marginLeft: -spacing.xs },

  headings: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
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
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  number: {
    fontFamily: typography.body.family,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.ink,
  },
  edit: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },

  resendRow: { alignItems: 'center' },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm },
  resendActive: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.surfie,
  },
  resendWait: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkFaint,
    padding: spacing.sm,
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
});

export default VerifyOtpScreen;
