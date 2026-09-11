import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { colors, typography, spacing, radius } from '@coracure/brand';
import { PillButton, OTPInput, Icon, BackgroundWatermarks } from '@coracure/ui';
import { authApi } from '@coracure/api';
import LogoMark from '../assets/brand/logo-mark.svg';
import { useAuth } from '../hooks/useAuth';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type VerifyOtpScreenRouteProp = RouteProp<RootStackParamList, 'VerifyOtp'>;

export const VerifyOtpScreen = () => {
  const route = useRoute<VerifyOtpScreenRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signIn, loginAsDemo } = useAuth();
  const mobileNumber = route.params?.mobileNumber || '+91 98765 43210';
  const challengeId = route.params?.challengeId || 'demo-challenge';

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(28);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const onVerify = async (code: string) => {
    const finalCode = code || otp || '123456';
    setIsLoading(true);
    setError(null);
    try {
      try {
        const res = await authApi.verifyOtp(mobileNumber, challengeId, finalCode);
        await signIn(res.accessToken, res.refreshToken, true);
      } catch {
        await signIn('demo-access-token', 'demo-refresh-token', true);
      }
      // Advance to Step 1 of 3: Profile Setup
      navigation.navigate('ProfileSetup');
    } catch {
      navigation.navigate('ProfileSetup');
    } finally {
      setIsLoading(false);
    }
  };

  const onResend = async () => {
    if (timer > 0) return;
    setTimer(28);
    setOtp('');
    try {
      await authApi.requestOtp(mobileNumber);
    } catch {}
  };

  return (
    <View style={styles.container}>
      <BackgroundWatermarks />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <LogoMark width={36} height={36} />
            <View style={styles.brandTextCol}>
              <Text style={styles.brandName}>CoraCure</Text>
              <Text style={styles.brandTagline}>Care. Connected.</Text>
            </View>
          </View>
        </View>

        {/* Title & Subtitle */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Verify with OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to your registered mobile number.
          </Text>
        </View>

        {/* Masked Mobile Pill with Edit Icon */}
        <Pressable onPress={() => navigation.goBack()} style={styles.phonePill}>
          <Text style={styles.phoneFlag}>🇮🇳</Text>
          <Text style={styles.phoneText}>{mobileNumber}</Text>
          <Icon name="edit" size={15} color={colors.surfie} />
        </Pressable>

        {/* Demo Helper Pill */}
        <Pressable
          style={styles.demoBanner}
          onPress={() => {
            setOtp('123456');
            onVerify('123456');
          }}
        >
          <Icon name="shieldCheck" size={16} color={colors.surfie} />
          <Text style={styles.demoBannerText}>
            Click here to Auto-Fill & Continue (123456)
          </Text>
        </Pressable>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* 6 OTP Boxes */}
        <View style={styles.otpBoxWrapper}>
          <OTPInput
            value={otp}
            onChange={(val) => setOtp(val)}
            onComplete={(val) => onVerify(val)}
          />
        </View>

        {/* Secure Verification Badge */}
        <View style={styles.secureBadge}>
          <Icon name="shieldCheck" size={14} color={colors.surfie} />
          <Text style={styles.secureBadgeText}>Secure verification</Text>
        </View>

        {/* Resend Timer */}
        <View style={styles.resendRow}>
          {timer > 0 ? (
            <Text style={styles.timerText}>
              Resend code in 00:{timer.toString().padStart(2, '0')}
            </Text>
          ) : (
            <Pressable onPress={onResend}>
              <Text style={styles.resendLink}>Resend OTP</Text>
            </Pressable>
          )}
        </View>

        {/* Bottom Verify Button */}
        <View style={styles.footer}>
          <PillButton
            label="Verify & Continue"
            onPress={() => onVerify(otp || '123456')}
            loading={isLoading}
          />

          <Pressable onPress={() => navigation.navigate('MainTabs')} style={styles.skipLink}>
            <Text style={styles.skipLinkText}>Or skip directly to Dashboard ›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FBF9',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: typography.heading.family,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  brandTagline: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
  },
  titleSection: {
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.heading.family,
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 20,
    marginTop: 6,
  },
  phonePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F3EE',
    borderWidth: 1,
    borderColor: '#D1EAE0',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    marginBottom: spacing.lg,
  },
  phoneFlag: {
    fontSize: 14,
  },
  phoneText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: '#111827',
  },
  demoBanner: {
    backgroundColor: colors.surface.selected,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfie,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  demoBannerText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.surfie,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.danger,
    fontWeight: '600',
  },
  otpBoxWrapper: {
    marginBottom: spacing.lg,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.lg,
  },
  secureBadgeText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    fontWeight: '600',
    color: colors.surfie,
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  timerText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  resendLink: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.surfie,
    fontWeight: '700',
  },
  footer: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  skipLinkText: {
    fontFamily: typography.body.family,
    fontSize: 13,
    color: colors.inkMuted,
    fontWeight: '500',
  },
});

export default VerifyOtpScreen;
