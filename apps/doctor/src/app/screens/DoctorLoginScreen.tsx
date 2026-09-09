import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Keyboard,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing, typography } from '../../theme/brand';

const PHONE_LENGTH = 10;
const OTP_LENGTH = 6;
const DIAL_CODE = '+91';
const RESEND_SECONDS = 24;

/** Intrinsic size of banner-doctor.png, used to preserve its aspect. */
const BANNER_ART_RATIO = 1596 / 880;
/** Artwork is drawn smaller than the banner box and pinned to the bottom,
 *  so it reads as a lighter accent sitting low behind the copy. */
const BANNER_ART_SCALE = 0.88;
/** Share of the usable screen height given to the banner; the card takes the rest. */
const BANNER_SHARE = 0.4;

type Step = 'phone' | 'otp';

/* ---------------------------------- icons --------------------------------- */

const PersonIcon = ({ color = colors.surfie, size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="8" r="4" fill={color} />
    <Path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7v1H4v-1z" fill={color} />
  </Svg>
);

const ShieldCheckIcon = ({ size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 2l8 3.5v6c0 5-3.4 9.3-8 10.5-4.6-1.2-8-5.5-8-10.5v-6L12 2z"
      fill={colors.paris}
      opacity={0.22}
    />
    <Path
      d="M8.6 12.2l2.3 2.3 4.6-4.6"
      stroke={colors.surfie}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const LockIcon = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="4" y="10" width="16" height="11" rx="3" fill={colors.surfie} opacity={0.18} />
    <Path
      d="M8 10V7.5a4 4 0 118 0V10"
      stroke={colors.surfie}
      strokeWidth={1.8}
      strokeLinecap="round"
      fill="none"
    />
    <Circle cx="12" cy="15.5" r="1.6" fill={colors.surfie} />
  </Svg>
);

const ArrowRightIcon = ({ size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M5 12h13M13 6l6 6-6 6"
      stroke={colors.white}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const BackArrowIcon = ({ size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M19 12H5M11 18l-6-6 6-6"
      stroke={colors.ink}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const ChevronDownIcon = ({ size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M6 9l6 6 6-6"
      stroke={colors.inkMuted}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

/* --------------------------------- screen --------------------------------- */

export const DoctorLoginScreen = ({
  onAuthenticated,
}: {
  onAuthenticated?: () => void;
}) => {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [focusedBox, setFocusedBox] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [bannerHeight, setBannerHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const { height: winHeight } = useWindowDimensions();

  // Fixed 40 / 60 split of the usable height, so the seam sits in the same
  // place on every device instead of drifting with content length.
  const usableHeight = winHeight - insets.top - insets.bottom;
  const bannerBoxHeight = Math.round(usableHeight * BANNER_SHARE);
  const cardMinHeight = usableHeight - bannerBoxHeight;

  const otpRefs = useRef<Array<TextInput | null>>([]);

  const phoneValid = phone.length === PHONE_LENGTH;
  const otpValue = otp.join('');
  const otpValid = otpValue.length === OTP_LENGTH;

  const formattedPhone = useMemo(() => {
    if (phone.length <= 5) return phone;
    return `${phone.slice(0, 5)} ${phone.slice(5)}`;
  }, [phone]);

  /* countdown for the resend link, only while the OTP step is showing */
  useEffect(() => {
    if (step !== 'otp' || secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [step, secondsLeft]);

  const countdown = useMemo(() => {
    const m = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const s = String(secondsLeft % 60).padStart(2, '0');
    return `${m}:${s}`;
  }, [secondsLeft]);

  const onChangePhone = (raw: string) => {
    setPhone(raw.replace(/\D/g, '').slice(0, PHONE_LENGTH));
  };

  /** phone step -> otp step, on the same screen */
  const requestCode = () => {
    if (!phoneValid || submitting) return;
    setSubmitting(true);
    // TODO: POST the number to the OTP endpoint once the backend route exists.
    setTimeout(() => {
      setSubmitting(false);
      setOtp(Array(OTP_LENGTH).fill(''));
      setSecondsLeft(RESEND_SECONDS);
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
    }, 700);
  };

  const backToPhone = useCallback(() => {
    setStep('phone');
    setOtp(Array(OTP_LENGTH).fill(''));
    setFocusedBox(0);
  }, []);

  const onChangeOtp = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setOtp((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }
    // built outside the state updater so we can tell, in this same tick,
    // whether the code is now complete
    const next = [...otp];
    // handles paste / autofill of the whole code as well as single digits
    for (let i = 0; i < digits.length && index + i < OTP_LENGTH; i++) {
      next[index + i] = digits[i];
    }
    setOtp(next);

    if (next.every((d) => d !== '')) {
      // last digit entered — drop the keyboard so the Verify button is visible
      otpRefs.current[OTP_LENGTH - 1]?.blur();
      Keyboard.dismiss();
      return;
    }

    const landing = Math.min(index + digits.length, OTP_LENGTH - 1);
    otpRefs.current[landing]?.focus();
  };

  const onOtpKeyPress = (
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      setOtp((prev) => {
        const next = [...prev];
        next[index - 1] = '';
        return next;
      });
    }
  };

  const verify = () => {
    if (!otpValid || submitting) return;
    setSubmitting(true);
    // TODO: POST the code for verification once the backend route exists.
    setTimeout(() => {
      setSubmitting(false);
      onAuthenticated?.();
    }, 900);
  };

  const resend = () => {
    if (secondsLeft > 0) return;
    setSecondsLeft(RESEND_SECONDS);
    setOtp(Array(OTP_LENGTH).fill(''));
    otpRefs.current[0]?.focus();
  };

  const isOtp = step === 'otp';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface.mint} />
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ------------------------------ banner ------------------------------ */}
            <View
              style={[styles.banner, { height: bannerBoxHeight }]}
              onLayout={(e) => setBannerHeight(e.nativeEvent.layout.height)}
            >
              {bannerHeight > 0 && (
                <Image
                  source={require('../../assets/banner-doctor.png')}
                  style={[
                    styles.bannerArt,
                    {
                      height: bannerHeight * BANNER_ART_SCALE,
                      width: bannerHeight * BANNER_ART_SCALE * BANNER_ART_RATIO,
                    },
                  ]}
                  resizeMode="cover"
                  accessible={false}
                />
              )}

              <View style={styles.bannerTopRow}>
                <View style={styles.bannerTopLeft}>
                  {isOtp && (
                    <Pressable
                      testID="back"
                      onPress={backToPhone}
                      hitSlop={10}
                      style={styles.backBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Back to mobile number"
                    >
                      <BackArrowIcon />
                    </Pressable>
                  )}
                  <LogoWide width={132} height={33} />
                </View>

                <View style={styles.portalPill}>
                  <View style={styles.portalAvatar}>
                    <PersonIcon />
                  </View>
                  <Text style={styles.portalText}>Doctor Portal</Text>
                </View>
              </View>

              {isOtp ? (
                <>
                  <Text testID="heading" style={styles.heading}>
                    Verify your{'\n'}
                    <Text style={styles.headingAccent}>number</Text>
                  </Text>
                  <Text style={styles.subheading}>
                    Enter the {OTP_LENGTH}-digit code sent to
                  </Text>
                  <Text style={styles.phoneEcho}>
                    {DIAL_CODE} {formattedPhone}
                  </Text>
                </>
              ) : (
                <>
                  <Text testID="heading" style={styles.heading}>
                    Doctor login
                  </Text>
                  <Text style={styles.subheading}>
                    Access your Coracure account to continue providing better care.
                  </Text>
                  <View style={styles.bannerDivider} />
                  <Text style={styles.bannerNote}>
                    Only verified Coracure doctors can sign in.
                  </Text>
                </>
              )}
            </View>

            {/* ------------------------------- card ------------------------------- */}
            {/* bottom padding is the safe-area inset plus a small gap, so the
                "Need access?" and footer rows sit low without ever entering
                the gesture/navigation bar */}
            <View
              style={[
                styles.card,
                { minHeight: cardMinHeight, paddingBottom: insets.bottom + spacing.sm },
              ]}
            >
              {isOtp ? (
                /* ------------------------- OTP step ------------------------- */
                <>
                  <View style={styles.otpRow}>
                    {otp.map((digit, i) => (
                      <TextInput
                        key={i}
                        testID={`otp-${i}`}
                        ref={(r) => {
                          otpRefs.current[i] = r;
                        }}
                        style={[
                          styles.otpBox,
                          focusedBox === i && styles.otpBoxActive,
                          digit !== '' && styles.otpBoxFilled,
                        ]}
                        value={digit}
                        onChangeText={(t) => onChangeOtp(i, t)}
                        onKeyPress={(e) => onOtpKeyPress(i, e)}
                        onFocus={() => setFocusedBox(i)}
                        keyboardType="number-pad"
                        maxLength={OTP_LENGTH}
                        selectTextOnFocus
                        textAlign="center"
                        returnKeyType="done"
                      />
                    ))}
                  </View>

                  <Pressable hitSlop={8} onPress={backToPhone}>
                    <Text style={styles.changeNumber}>Change mobile number</Text>
                  </Pressable>

                  <Text style={styles.resendTitle}>Didn&apos;t receive the code?</Text>
                  {secondsLeft > 0 ? (
                    <Text style={styles.resendTimer}>Resend in {countdown}</Text>
                  ) : (
                    <Pressable hitSlop={8} onPress={resend}>
                      <Text style={styles.resendLink}>Resend code</Text>
                    </Pressable>
                  )}

                  <Pressable
                    testID="verify"
                    accessibilityRole="button"
                    onPress={verify}
                    disabled={!otpValid || submitting}
                    style={({ pressed }) => [
                      styles.cta,
                      (!otpValid || submitting) && styles.ctaDisabled,
                      pressed && otpValid && styles.ctaPressed,
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <>
                        <Text style={styles.ctaText}>Verify &amp; Continue</Text>
                        <ArrowRightIcon />
                      </>
                    )}
                  </Pressable>

                  <View style={styles.secureRow}>
                    <LockIcon />
                    <View style={styles.secureCopy}>
                      <Text style={styles.secureBody}>
                        OTP verification keeps your doctor account secure.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.spacer} />

                  <View style={styles.needAccessRow}>
                    <Text style={styles.needAccessText}>Need help? </Text>
                    <Pressable hitSlop={8}>
                      <Text style={styles.needAccessLink}>Contact administrator</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                /* ------------------------ phone step ------------------------ */
                <>
                  <Text style={styles.fieldLabel}>Mobile Number</Text>
                  <Text style={styles.fieldHelp}>Enter your registered mobile number</Text>

                  <View style={styles.inputRow}>
                    <Pressable style={styles.countryBox} hitSlop={4}>
                      <Text style={styles.flag}>🇮🇳</Text>
                      <ChevronDownIcon />
                    </Pressable>

                    <View style={styles.dialDivider} />
                    <Text style={styles.dialCode}>{DIAL_CODE}</Text>

                    <TextInput
                      testID="phone-input"
                      style={styles.input}
                      value={formattedPhone}
                      onChangeText={onChangePhone}
                      placeholder="98765 43210"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="number-pad"
                      maxLength={PHONE_LENGTH + 1}
                      returnKeyType="done"
                      onSubmitEditing={requestCode}
                    />
                  </View>

                  <Pressable
                    testID="cta"
                    accessibilityRole="button"
                    onPress={requestCode}
                    disabled={!phoneValid || submitting}
                    style={({ pressed }) => [
                      styles.cta,
                      (!phoneValid || submitting) && styles.ctaDisabled,
                      pressed && phoneValid && styles.ctaPressed,
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <>
                        <Text style={styles.ctaText}>Get verification code</Text>
                        <ArrowRightIcon />
                      </>
                    )}
                  </Pressable>

                  <View style={styles.secureRow}>
                    <ShieldCheckIcon />
                    <View style={styles.secureCopy}>
                      <Text style={styles.secureTitle}>Secure login</Text>
                      <Text style={styles.secureBody}>
                        Your information is encrypted and accessible only to authorized
                        Coracure doctors.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.spacer} />

                  <View style={styles.needAccessRow}>
                    <Text style={styles.needAccessText}>Need access? </Text>
                    <Pressable hitSlop={8}>
                      <Text style={styles.needAccessLink}>Contact administrator</Text>
                    </Pressable>
                  </View>
                </>
              )}

              <View style={styles.footerDivider} />

              <View style={styles.footerRow}>
                <Pressable hitSlop={8}>
                  <Text style={styles.footerLink}>Privacy Policy</Text>
                </Pressable>
                <Text style={styles.footerSep}>|</Text>
                <Pressable hitSlop={8}>
                  <Text style={styles.footerLink}>Support</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

/* --------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.mint },
  // top inset applied inline from the real device inset
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },

  /* banner */
  banner: {
    paddingHorizontal: spacing.xl,
    // logo + Doctor Portal sit at the very top of the banner; the safe-area
    // inset above already keeps them clear of the status bar
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.surface.mint,
    overflow: 'hidden',
  },
  bannerArt: {
    position: 'absolute',
    bottom: 0,
    right: -44,
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerTopLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: spacing.md, paddingVertical: 4 },
  portalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  portalAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  portalText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.surfie,
    fontWeight: '600',
  },
  heading: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    lineHeight: 33,
    fontWeight: typography.heading.weight,
    color: colors.ink,
    // Gap below the pinned logo row. This is the ONLY control for how far the
    // left-hand copy sits down the banner — the banner's own paddingTop must
    // stay small so the logo row stays pinned at the top. Applies to both the
    // phone and OTP states.
    marginTop: 74,
  },
  headingAccent: { color: colors.surfie },
  subheading: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    lineHeight: 22,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    maxWidth: 172,
  },
  phoneEcho: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  bannerDivider: {
    width: 34,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.paris,
    marginTop: spacing.lg,
  },
  bannerNote: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    marginTop: spacing.sm,
    maxWidth: 178,
  },

  /* card */
  card: {
    flex: 1,
    backgroundColor: colors.surface.card,
    // deliberately larger than the shared `radius.card` (18) — the auth sheet
    // reads as a sheet rising over the banner, not as a content card
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: spacing.xl,
    paddingTop: 46,
    // paddingBottom applied inline from the real safe-area inset
  },

  /* otp */
  otpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  otpBox: {
    width: 50,
    height: 58,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: radius.md,
    fontFamily: typography.heading.family,
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    backgroundColor: colors.white,
    padding: 0,
  },
  otpBoxFilled: { borderColor: colors.surface.line },
  otpBoxActive: { borderColor: colors.paris, borderWidth: 2 },
  changeNumber: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
    marginTop: spacing.xl,
  },
  resendTitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.xl,
  },
  resendTimer: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    marginTop: 2,
  },
  resendLink: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
    marginTop: 2,
    textDecorationLine: 'underline',
  },

  /* phone */
  fieldLabel: {
    fontFamily: typography.heading.family,
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
  },
  fieldHelp: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    height: 54,
    marginTop: spacing.md,
    backgroundColor: colors.white,
  },
  countryBox: { flexDirection: 'row', alignItems: 'center' },
  flag: { fontSize: 18, marginRight: 4 },
  dialDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.surface.line,
    marginHorizontal: spacing.md,
  },
  dialCode: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    marginLeft: spacing.md,
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
    padding: 0,
  },

  /* shared */
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfie,
    borderRadius: radius.input,
    height: 54,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  ctaDisabled: { opacity: 0.45 },
  ctaPressed: { opacity: 0.85 },
  ctaText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.white,
  },
  secureRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  secureCopy: { flex: 1, marginLeft: spacing.md },
  secureTitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  secureBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    lineHeight: 16,
    color: colors.inkMuted,
    marginTop: 2,
  },
  spacer: { flex: 1, minHeight: spacing.xl },
  needAccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  needAccessText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  needAccessLink: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.surfie,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  footerDivider: { height: 1, backgroundColor: colors.surface.line },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.md,
    // small nudge left of centre (shifts the pair by half this value)
    paddingRight: 16,
  },
  footerLink: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  footerSep: { color: colors.surface.line },
});

export default DoctorLoginScreen;
