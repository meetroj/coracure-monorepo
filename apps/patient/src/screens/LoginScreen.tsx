import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, radius } from '@coracure/brand';
import { PillButton, CountryCodePicker, Icon, BackgroundWatermarks } from '@coracure/ui';
import { authApi } from '@coracure/api';
import LogoMark from '../assets/brand/logo-mark.svg';
import { useAuth } from '../hooks/useAuth';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type LoginScreenProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenProp>();
  const { loginAsDemo } = useAuth();
  const [mobileNumber, setMobileNumber] = useState('98765 43210');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onContinue = async () => {
    let clean = mobileNumber.replace(/[\s-]/g, '');
    if (!clean.startsWith('+')) {
      clean = '+91' + clean;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.requestOtp(clean);
      navigation.navigate('VerifyOtp', {
        mobileNumber: clean,
        challengeId: response.challengeId,
      });
    } catch {
      // Seamless preview fallback
      navigation.navigate('VerifyOtp', {
        mobileNumber: clean,
        challengeId: 'demo-challenge-' + Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
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
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue to your account.</Text>
        </View>

        {/* Floating Input Card */}
        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Mobile Number</Text>
          
          <View style={styles.phoneInputRow}>
            <CountryCodePicker />
            <View style={styles.textInputBox}>
              <TextInput
                value={mobileNumber}
                onChangeText={(t) => {
                  setMobileNumber(t);
                  setError(null);
                }}
                placeholder="98765 43210"
                placeholderTextColor={colors.inkMuted}
                keyboardType="phone-pad"
                style={styles.textInput}
              />
            </View>
          </View>

          <View style={styles.btnWrap}>
            <PillButton
              label="Continue"
              onPress={onContinue}
              loading={isLoading}
            />
          </View>

          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>

        {/* Doctor Notice Card */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorIconCircle}>
            <Icon name="user" size={20} color={colors.surfie} />
          </View>
          <View style={styles.doctorCardContent}>
            <Text style={styles.doctorCardTitle}>Doctor accounts are created by the admin.</Text>
            <Text style={styles.doctorCardSub}>
              If you're a doctor, please contact your clinic administrator.
            </Text>
          </View>
        </View>

        {/* Quick Demo Option */}
        <Pressable onPress={() => loginAsDemo()} style={styles.demoLink}>
          <Text style={styles.demoLinkText}>⚡ Quick Demo Login (Skip OTP)</Text>
        </Pressable>
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
    marginBottom: spacing.xl,
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
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  textInputBox: {
    flex: 1,
    height: 52,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  textInput: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
    height: '100%',
  },
  btnWrap: {
    marginTop: spacing.xs,
  },
  termsText: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  termsLink: {
    color: colors.surfie,
    fontWeight: '600',
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
  doctorCard: {
    backgroundColor: '#E6F3EE',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1EAE0',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.lg,
  },
  doctorIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorCardContent: {
    flex: 1,
  },
  doctorCardTitle: {
    fontFamily: typography.heading.family,
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  doctorCardSub: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  demoLink: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  demoLinkText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.surfie,
    fontWeight: '600',
  },
});

export default LoginScreen;
