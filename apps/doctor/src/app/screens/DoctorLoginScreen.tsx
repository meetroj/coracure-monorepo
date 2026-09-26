import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Image,
  Keyboard,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { BottomSheet } from '../../components/BottomSheet';
import { useKeyboardHeight } from '../../components/useKeyboard';
import { doneBar } from '../../components/KeyboardDoneBar';
import { supportContact } from '../../data/support';
import { openContact } from './HelpSupportScreen';

const PHONE_LENGTH = 10;
const OTP_LENGTH = 6;
const DIAL_CODE = '+91';
const RESEND_SECONDS = 30;

/** Intrinsic size of banner-doctor.png, used to preserve its aspect. */
const BANNER_ART_RATIO = 1596 / 880;
/** The artwork sits low behind the copy, smaller than the banner box. */
const BANNER_ART_SCALE = 0.88;
/** Share of the usable height given to the banner; the card takes the rest. */
const BANNER_SHARE = 0.4;
/** Below this the banner copy would clip, so the banner grows instead. */
const BANNER_MIN = 236;

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
    <Path d="M12 2l8 3.5v6c0 5-3.4 9.3-8 10.5-4.6-1.2-8-5.5-8-10.5v-6L12 2z" fill={colors.paris} opacity={0.22} />
    <Path d="M8.6 12.2l2.3 2.3 4.6-4.6" stroke={colors.surfie} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

const LockIcon = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="4" y="10" width="16" height="11" rx="3" fill={colors.surfie} opacity={0.18} />
    <Path d="M8 10V7.5a4 4 0 118 0V10" stroke={colors.surfie} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    <Circle cx="12" cy="15.5" r="1.6" fill={colors.surfie} />
  </Svg>
);

const ArrowRightIcon = ({ size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 12h13M13 6l6 6-6 6" stroke={colors.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

/* --------------------------------- sheets --------------------------------- */

const ContactRow = ({ icon, label, onPress, testID }: { icon: 'mail' | 'phone' | 'message'; label: string; onPress: () => void; testID: string }) => (
  <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]} accessibilityRole="link">
    <View style={styles.contactIcon}>
      <Icon name={icon} size={17} color={colors.surfie} />
    </View>
    <Text style={styles.contactText}>{label}</Text>
    <Icon name="externalLink" size={15} color={colors.inkMuted} />
  </Pressable>
);

const ContactOptions = () => (
  <View style={styles.contactBox}>
    <ContactRow testID="login-contact-email" icon="mail" label={supportContact.email} onPress={() => openContact(`mailto:${supportContact.email}`, 'mail')} />
    <ContactRow
      testID="login-contact-phone"
      icon="phone"
      label={supportContact.phone}
      onPress={() => openContact(`tel:${supportContact.phone.replace(/\s/g, '')}`, 'the phone app')}
    />
    <ContactRow
      testID="login-contact-whatsapp"
      icon="message"
      label={`WhatsApp ${supportContact.whatsapp}`}
      onPress={() => openContact(`https://wa.me/${supportContact.whatsapp.replace(/[^\d]/g, '')}`, 'WhatsApp')}
    />
  </View>
);

/* --------------------------------- screen --------------------------------- */

/**
 * Sign in with a mobile number and a one-time code.
 *
 * The phone field and its button are kept above the keyboard on every phone
 * size: the page shrinks by the keyboard's height and scrolls the button into
 * view. There are no artificial waits — this build has no OTP service, so the
 * code step opens straight away and any six digits sign in.
 */
export const DoctorLoginScreen = ({ onAuthenticated }: { onAuthenticated: (mobile: string) => void }) => {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [focusedBox, setFocusedBox] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [sheet, setSheet] = useState<'contact' | 'privacy' | null>(null);
  const [viewport, setViewport] = useState(0);
  const [ctaBottom, setCtaBottom] = useState(0);
  const [topRowBottom, setTopRowBottom] = useState(0);
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const { height: winHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const otpRefs = useRef<Array<TextInput | null>>([]);

  // a 40 / 60 split of the usable height, so the seam sits in the same place
  // on every phone — but never so short that the banner copy clips
  const usableHeight = winHeight - insets.top - insets.bottom;
  const bannerBoxHeight = Math.max(BANNER_MIN, Math.round(usableHeight * BANNER_SHARE));
  const cardMinHeight = Math.max(0, usableHeight - bannerBoxHeight);

  const phoneValid = phone.length === PHONE_LENGTH;
  const otpValue = otp.join('');
  const otpValid = otpValue.length === OTP_LENGTH;
  const formattedPhone = useMemo(() => (phone.length <= 5 ? phone : `${phone.slice(0, 5)} ${phone.slice(5)}`), [phone]);

  // the resend countdown runs only while the code step shows
  useEffect(() => {
    if (step !== 'otp' || secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [step, secondsLeft]);

  // keep the primary button above the keyboard; once scrolling, clear the whole
  // logo row so it never sits half-cut at the top edge
  useEffect(() => {
    if (keyboard <= 0 || !viewport || !ctaBottom) return;
    const target = bannerBoxHeight + ctaBottom + spacing.lg - viewport;
    if (target > 0) scrollRef.current?.scrollTo({ y: Math.max(target, topRowBottom), animated: true });
  }, [keyboard, viewport, ctaBottom, bannerBoxHeight, topRowBottom, step]);

  useEffect(() => {
    if (step === 'otp') otpRefs.current[0]?.focus();
  }, [step]);

  const countdown = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;

  const requestCode = () => {
    if (!phoneValid) return;
    setOtp(Array(OTP_LENGTH).fill(''));
    setFocusedBox(0);
    setSecondsLeft(RESEND_SECONDS);
    setStep('otp');
  };

  const backToPhone = () => {
    setStep('phone');
    setOtp(Array(OTP_LENGTH).fill(''));
    setFocusedBox(0);
  };

  const onChangeOtp = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setOtp((prev) => prev.map((d, i) => (i === index ? '' : d)));
      return;
    }
    // built outside the updater so this same tick knows whether the code is complete
    const next = [...otp];
    // a paste or one-time-code autofill fills the following boxes too
    for (let i = 0; i < digits.length && index + i < OTP_LENGTH; i++) next[index + i] = digits[i];
    setOtp(next);
    if (next.every((d) => d !== '')) {
      // last digit entered — drop the keyboard so Verify is in view
      otpRefs.current[OTP_LENGTH - 1]?.blur();
      Keyboard.dismiss();
      return;
    }
    otpRefs.current[Math.min(index + digits.length, OTP_LENGTH - 1)]?.focus();
  };

  const onOtpKeyPress = (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      setOtp((prev) => prev.map((d, i) => (i === index - 1 ? '' : d)));
    }
  };

  const verify = () => {
    if (!otpValid) return;
    Keyboard.dismiss();
    onAuthenticated(phone);
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
      <View style={[styles.flex, { paddingTop: insets.top, paddingBottom: keyboard }]}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          onLayout={(e) => setViewport(e.nativeEvent.layout.height)}
        >
          {/* ------------------------------ banner ------------------------------ */}
          <View style={[styles.banner, { height: bannerBoxHeight }]}>
            <Image
              source={require('../../assets/banner-doctor.png')}
              style={[
                styles.bannerArt,
                { height: bannerBoxHeight * BANNER_ART_SCALE, width: bannerBoxHeight * BANNER_ART_SCALE * BANNER_ART_RATIO },
              ]}
              resizeMode="cover"
              accessible={false}
            />

            <View style={styles.bannerTopRow} onLayout={(e) => setTopRowBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
              <View style={styles.bannerTopLeft}>
                {isOtp && (
                  <Pressable
                    testID="back"
                    onPress={backToPhone}
                    hitSlop={8}
                    style={styles.backBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Back to mobile number"
                  >
                    <Icon name="arrowLeft" size={19} color={colors.ink} />
                  </Pressable>
                )}
                <LogoWide width={124} height={31} accessibilityLabel="CoraCure" />
              </View>
              <View style={styles.portalPill}>
                <View style={styles.portalAvatar}>
                  <PersonIcon />
                </View>
                <Text style={styles.portalText}>Doctor Portal</Text>
              </View>
            </View>

            <View style={styles.bannerCopy}>
              <View style={styles.bannerLead} />
              {isOtp ? (
                <>
                  <Text testID="heading" style={styles.heading} accessibilityRole="header">
                    Verify your{'\n'}
                    <Text style={styles.headingAccent}>number</Text>
                  </Text>
                  <Text style={styles.subheading}>Enter the {OTP_LENGTH}-digit code sent to</Text>
                  <Text style={styles.phoneEcho}>
                    {DIAL_CODE} {formattedPhone}
                  </Text>
                </>
              ) : (
                <>
                  <Text testID="heading" style={styles.heading} accessibilityRole="header">
                    Doctor login
                  </Text>
                  <Text style={styles.subheading}>Sign in to your CoraCure account to continue caring for your patients.</Text>
                  <View style={styles.bannerDivider} />
                  <Text style={styles.bannerNote}>Only verified CoraCure doctors can sign in.</Text>
                </>
              )}
            </View>
          </View>

          {/* ------------------------------- card ------------------------------- */}
          <View style={[styles.card, { minHeight: cardMinHeight, paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.sm }]}>
            {isOtp ? (
              <>
                <View style={styles.otpRow}>
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      testID={`otp-${i}`}
                      ref={(r) => {
                        otpRefs.current[i] = r;
                      }}
                      style={[styles.otpBox, focusedBox === i && styles.otpBoxActive, digit !== '' && styles.otpBoxFilled]}
                      value={digit}
                      onChangeText={(t) => onChangeOtp(i, t)}
                      onKeyPress={(e) => onOtpKeyPress(i, e)}
                      onFocus={() => setFocusedBox(i)}
                      keyboardType="number-pad"
                      {...doneBar('number-pad')}
                      // iOS offers the SMS code above the keyboard; Android autofills it
                      textContentType={i === 0 ? 'oneTimeCode' : 'none'}
                      autoComplete={i === 0 ? 'sms-otp' : 'off'}
                      maxLength={OTP_LENGTH}
                      selectTextOnFocus
                      textAlign="center"
                      accessibilityLabel={`Digit ${i + 1} of ${OTP_LENGTH}`}
                    />
                  ))}
                </View>

                <Pressable testID="change-number" hitSlop={8} onPress={backToPhone} style={styles.linkBtn} accessibilityRole="button">
                  <Text style={styles.changeNumber}>Change mobile number</Text>
                </Pressable>

                <Text style={styles.resendTitle}>Didn’t receive the code?</Text>
                {secondsLeft > 0 ? (
                  <Text testID="resend-timer" style={styles.resendTimer}>
                    Resend in {countdown}
                  </Text>
                ) : (
                  <Pressable testID="resend" hitSlop={8} onPress={resend} style={styles.linkBtn} accessibilityRole="button">
                    <Text style={styles.resendLink}>Resend code</Text>
                  </Pressable>
                )}

                <View
                  onLayout={(e) => {
                    const { y, height } = e.nativeEvent.layout;
                    setCtaBottom(y + height);
                  }}
                >
                  <Pressable
                    testID="verify"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !otpValid }}
                    onPress={verify}
                    disabled={!otpValid}
                    style={({ pressed }) => [styles.cta, !otpValid && styles.ctaDisabled, pressed && otpValid && styles.pressed]}
                  >
                    <Text style={styles.ctaText}>Verify &amp; Continue</Text>
                    <ArrowRightIcon />
                  </Pressable>
                </View>

                <View style={styles.secureRow}>
                  <LockIcon />
                  <Text style={[styles.secureBody, styles.secureCopy]}>A new code is needed every time you sign in.</Text>
                </View>

                <View style={styles.spacer} />
                <View style={styles.needAccessRow}>
                  <Text style={styles.needAccessText}>Need help? </Text>
                  <Pressable testID="contact-admin" hitSlop={8} onPress={() => setSheet('contact')} accessibilityRole="button">
                    <Text style={styles.needAccessLink}>Contact administrator</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Mobile Number</Text>
                <Text style={styles.fieldHelp}>Enter your registered mobile number</Text>

                <View style={styles.inputRow}>
                  {/* India only for now — a label, not a picker */}
                  <Text style={styles.flag} accessibilityLabel="India">
                    🇮🇳
                  </Text>
                  <Text style={styles.dialCode}>{DIAL_CODE}</Text>
                  <View style={styles.dialDivider} />
                  <TextInput
                    testID="phone-input"
                    style={styles.input}
                    value={formattedPhone}
                    onChangeText={(raw) => setPhone(raw.replace(/\D/g, '').slice(0, PHONE_LENGTH))}
                    placeholder="98765 43210"
                    placeholderTextColor={colors.inkFaint}
                    keyboardType="number-pad"
                    {...doneBar('number-pad')}
                    textContentType="telephoneNumber"
                    autoComplete="tel-national"
                    maxLength={PHONE_LENGTH + 1}
                    returnKeyType="done"
                    onSubmitEditing={requestCode}
                    accessibilityLabel="Mobile number"
                  />
                </View>

                <View
                  onLayout={(e) => {
                    const { y, height } = e.nativeEvent.layout;
                    setCtaBottom(y + height);
                  }}
                >
                  <Pressable
                    testID="cta"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !phoneValid }}
                    onPress={requestCode}
                    disabled={!phoneValid}
                    style={({ pressed }) => [styles.cta, !phoneValid && styles.ctaDisabled, pressed && phoneValid && styles.pressed]}
                  >
                    <Text style={styles.ctaText}>Get verification code</Text>
                    <ArrowRightIcon />
                  </Pressable>
                </View>

                <View style={styles.secureRow}>
                  <ShieldCheckIcon />
                  <View style={styles.secureCopy}>
                    <Text style={styles.secureTitle}>Secure login</Text>
                    <Text style={styles.secureBody}>We send a one-time code to your registered number. There is no password to remember.</Text>
                  </View>
                </View>

                <View style={styles.spacer} />
                <View style={styles.needAccessRow}>
                  <Text style={styles.needAccessText}>Need access? </Text>
                  <Pressable testID="contact-admin" hitSlop={8} onPress={() => setSheet('contact')} accessibilityRole="button">
                    <Text style={styles.needAccessLink}>Contact administrator</Text>
                  </Pressable>
                </View>
              </>
            )}

            <View style={styles.footerDivider} />
            <View style={styles.footerRow}>
              <Pressable testID="privacy-link" hitSlop={8} onPress={() => setSheet('privacy')} accessibilityRole="button">
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </Pressable>
              <Text style={styles.footerSep}>|</Text>
              <Pressable testID="support-link" hitSlop={8} onPress={() => setSheet('contact')} accessibilityRole="button">
                <Text style={styles.footerLink}>Support</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>

      <BottomSheet
        visible={sheet === 'contact'}
        title="Contact CoraCure"
        subtitle="Doctor accounts are created by a CoraCure administrator. Reach us if you cannot sign in or need access."
        onClose={() => setSheet(null)}
        testID="contact-sheet"
      >
        <ContactOptions />
      </BottomSheet>

      <BottomSheet visible={sheet === 'privacy'} title="Privacy Policy" onClose={() => setSheet(null)} testID="privacy-sheet">
        <Text style={styles.sheetBody}>
          For a copy of the CoraCure privacy policy, or a question about how your information is handled, contact CoraCure support.
        </Text>
        <ContactOptions />
      </BottomSheet>
    </View>
  );
};

/* --------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.mint },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  pressed: { opacity: 0.85 },

  banner: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface.mint,
    overflow: 'hidden',
  },
  bannerArt: { position: 'absolute', bottom: 0, right: -44 },
  bannerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  bannerTopLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  portalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: colors.surface.line,
    flexShrink: 0,
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
  portalText: { ...typeStyles.caption, color: colors.surfie },
  // the heading starts level with the top of the artwork, as the banner was
  // designed; on a short phone the lead-in gives way first, so the copy never clips
  bannerCopy: { flex: 1, justifyContent: 'flex-start', maxWidth: 200 },
  bannerLead: { height: 74, flexShrink: 1 },
  heading: { ...typeStyles.pageTitle, color: colors.ink },
  headingAccent: { color: colors.surfie },
  subheading: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: spacing.sm },
  phoneEcho: { ...typeStyles.body, fontWeight: fontWeight.medium, color: colors.ink, marginTop: 2 },
  bannerDivider: { width: 34, height: 2, borderRadius: 1, backgroundColor: colors.paris, marginTop: spacing.md },
  bannerNote: { ...typeStyles.caption, color: colors.inkMuted, marginTop: spacing.sm },

  card: {
    flexGrow: 1,
    backgroundColor: colors.surface.card,
    // larger than `radius.card` — the auth sheet reads as rising over the banner
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
  },

  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  otpBox: {
    ...typeStyles.inputSingle,
    fontSize: 20,
    flex: 1,
    maxWidth: 52,
    height: 56,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: radius.md,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  otpBoxFilled: { borderColor: colors.surface.line },
  otpBoxActive: { borderColor: colors.paris, borderWidth: 2 },
  linkBtn: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' },
  changeNumber: { ...typeStyles.button, color: colors.surfie, marginTop: spacing.md },
  resendTitle: { ...typeStyles.cardTitle, color: colors.ink, marginTop: spacing.lg },
  resendTimer: { ...typeStyles.number, color: colors.inkMuted, marginTop: 2 },
  resendLink: { ...typeStyles.button, color: colors.surfie, textDecorationLine: 'underline' },

  fieldLabel: { ...typeStyles.label, color: colors.ink },
  fieldHelp: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 2 },
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
  flag: { fontSize: 18, marginRight: 6 },
  dialCode: { ...typeStyles.inputSingle, color: colors.ink },
  dialDivider: { width: 1, height: 24, backgroundColor: colors.surface.line, marginHorizontal: spacing.md },
  input: { ...typeStyles.inputSingle, flex: 1, height: 52, color: colors.ink },

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
  ctaText: { ...typeStyles.button, color: colors.white },
  secureRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  secureCopy: { flex: 1, marginLeft: spacing.md },
  secureTitle: { ...typeStyles.cardTitle, color: colors.ink },
  secureBody: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },
  spacer: { flex: 1, minHeight: spacing.xl },
  needAccessRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginBottom: spacing.lg },
  needAccessText: { ...typeStyles.bodySmall, color: colors.inkMuted },
  needAccessLink: { ...typeStyles.button, color: colors.surfie, textDecorationLine: 'underline' },
  footerDivider: { height: 1, backgroundColor: colors.surface.line },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, gap: spacing.md, minHeight: 36 },
  footerLink: { ...typeStyles.buttonSmall, color: colors.inkMuted },
  footerSep: { ...typeStyles.caption, color: colors.surface.inputBorder },

  sheetBody: { ...typeStyles.body, color: colors.ink, marginBottom: spacing.md },
  contactBox: { borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.md, overflow: 'hidden' },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  contactIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface.selected, alignItems: 'center', justifyContent: 'center' },
  contactText: { ...typeStyles.body, color: colors.ink, flex: 1 },
});

export default DoctorLoginScreen;
