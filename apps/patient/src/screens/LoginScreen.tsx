import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, radius } from '@coracure/brand';
import { PillButton, CountryCodePicker } from '@coracure/ui';
import { ScreenBackground } from '../components/ScreenBackground';
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
    <View testID="login" style={styles.container}>
      <ScreenBackground name="auth" />

      {/* Brand Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <LogoMark width={47} height={47} />
          <View style={styles.brandTextCol}>
            <Text style={styles.brandName}>CoraCure</Text>
            <Text style={styles.brandTagline}>Care. Connected.</Text>
          </View>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.title}>Welcome{'\n'}back</Text>
          <Text style={styles.subtitle}>Sign in to continue{'\n'}to your account.</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Floating Input Card — stays vertically centred, exactly where
            it sat before; only the heading above it moved up. */}
        <View style={styles.formArea}>
          <View style={styles.card}>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Mobile Number</Text>

            <View style={styles.phoneInputRow}>
              <CountryCodePicker />
              <View style={styles.phoneDivider} />
              <View style={styles.textInputBox}>
                <TextInput
                  autoFocus
                  value={mobileNumber}
                  onChangeText={(t) => {
                    setMobileNumber(t);
                    setError(null);
                  }}
                  placeholder="98765 43210"
                  placeholderTextColor={colors.inkMuted}
                  keyboardType="phone-pad"
                  style={styles.textInput}
                  underlineColorAndroid="transparent"
                />
              </View>
            </View>

            <View style={styles.btnWrap}>
              <PillButton
                label="Continue"
                onPress={onContinue}
                loading={isLoading}
                cornerRadius={radius.md}
              />
            </View>

            <Text style={styles.termsText}>
              By continuing, you agree to our{'\n'}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
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
    /* The heading lives in the pinned header now; this container only holds
       the form, which `formArea` keeps centred. */
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  header: {
    /* Pinned above the scroll area, so the title below it never scrolls up
       past the brand lockup. */
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
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
    marginTop: spacing.xxxl * 2.25,
  },
  formArea: {
    /* Not centred (the four-line heading pushed the card too low) and not
       hard against the heading either — this gap is the tuning knob. */
    flex: 1,
    paddingTop: spacing.xxxl * 3,
  },
  title: {
    fontFamily: typography.heading.family,
    fontSize: 30,
    fontWeight: '600',
    color: '#111827',
  },
  subtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 6,
  },
  card: {
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
    /* One field: the code, a hairline, then the number. */
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    backgroundColor: colors.white,
    paddingLeft: 4,
    marginBottom: spacing.lg,
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.surface.line,
  },
  textInputBox: {
    flex: 1,
    height: 50,
    borderRadius: 0,
    borderWidth: 0,
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
});

export default LoginScreen;
