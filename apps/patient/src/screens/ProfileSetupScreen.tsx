import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput as RNTextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, typography, radius } from '@coracure/brand';
import { PillButton, Icon, BackgroundWatermarks, StepBadge } from '@coracure/ui';
import { profileApi } from '@coracure/api';
import LogoMark from '../assets/brand/logo-mark.svg';
import { useAuth } from '../hooks/useAuth';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male', icon: '♂' },
  { label: 'Female', value: 'female', icon: '♀' },
  { label: 'Prefer not to say', value: 'undisclosed', icon: '⚧' },
];

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'English' },
  { label: 'Hindi', value: 'Hindi' },
  { label: 'Hinglish', value: 'Hinglish' },
];

type Nav = NativeStackNavigationProp<RootStackParamList, 'ProfileSetup'>;

export const ProfileSetupScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user, loginAsDemo, refreshProfile } = useAuth();

  const nameInputRef = useRef<RNTextInput>(null);
  const ageInputRef = useRef<RNTextInput>(null);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [gender, setGender] = useState<string>(user?.gender && user.gender !== 'undisclosed' ? user.gender : 'male');
  const [preferredLanguage, setPreferredLanguage] = useState<string>(user?.preferredLanguage || 'English');

  const [activeFocus, setActiveFocus] = useState<'name' | 'age' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError('Please enter your full name to continue');
      nameInputRef.current?.focus();
      return;
    }

    const numAge = parseInt(age.trim(), 10);
    if (!age.trim() || isNaN(numAge) || numAge < 1 || numAge > 120) {
      setError('Please enter a valid age between 1 and 120');
      ageInputRef.current?.focus();
      return;
    }

    setError(null);
    setLoading(true);

    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - numAge;
    const dateOfBirth = `${birthYear}-01-01`;

    const profileData = {
      fullName: trimmedName,
      age: numAge,
      dateOfBirth,
      gender: (gender as any) || 'male',
      preferredLanguage: preferredLanguage || 'English',
      isComplete: true,
    };

    try {
      try {
        await profileApi.updateProfile(profileData);
        await refreshProfile();
      } catch {
        await loginAsDemo(profileData);
      }
      navigation.navigate('Consent');
    } catch {
      navigation.navigate('Consent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <BackgroundWatermarks />

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header with Back Button */}
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={12}>
            <Icon name="arrowLeft" size={20} color={colors.ink} />
          </Pressable>
          <View style={s.brandRow}>
            <LogoMark width={34} height={34} />
            <View style={s.brandTextCol}>
              <Text style={s.brandName}>CoraCure</Text>
              <Text style={s.brandTagline}>Care. Connected.</Text>
            </View>
          </View>
          <View style={s.headerSpacer} />
        </View>

        {/* Step Indicator */}
        <View style={s.stepRow}>
          <StepBadge current={1} total={3} />
        </View>

        {/* Headline */}
        <View style={s.titleSection}>
          <Text style={s.title}>Let's set up</Text>
          <Text style={s.title}>your profile</Text>
          <Text style={s.subtitle}>
            Tell us a bit about yourself so we can personalize your care experience.
          </Text>
        </View>

        {error ? (
          <View style={s.errorBox}>
            <Icon name="alertCircle" size={16} color={colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form Fields */}
        <View style={s.form}>
          {/* Full Name */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Full Name</Text>
            <Pressable
              style={[
                s.inputContainer,
                activeFocus === 'name' && s.inputContainerFocused,
                Boolean(error && !fullName.trim()) && s.inputContainerError,
              ]}
              onPress={() => nameInputRef.current?.focus()}
            >
              <Icon
                name="user"
                size={18}
                color={activeFocus === 'name' ? colors.surfie : colors.inkFaint}
              />
              <RNTextInput
                ref={nameInputRef}
                style={s.input}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (error) setError(null);
                }}
                onFocus={() => setActiveFocus('name')}
                onBlur={() => setActiveFocus(null)}
                placeholder="Enter your full name"
                placeholderTextColor={colors.inkFaint}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => ageInputRef.current?.focus()}
              />
              {fullName.length > 0 && (
                <Pressable
                  onPress={() => setFullName('')}
                  style={s.clearBtn}
                  hitSlop={8}
                >
                  <Icon name="x" size={16} color={colors.inkFaint} />
                </Pressable>
              )}
            </Pressable>
          </View>

          {/* Age */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Age</Text>
            <Pressable
              style={[
                s.inputContainer,
                activeFocus === 'age' && s.inputContainerFocused,
                Boolean(error && (!age.trim() || isNaN(Number(age)))) && s.inputContainerError,
              ]}
              onPress={() => ageInputRef.current?.focus()}
            >
              <Icon
                name="calendar"
                size={18}
                color={activeFocus === 'age' ? colors.surfie : colors.inkFaint}
              />
              <RNTextInput
                ref={ageInputRef}
                style={s.input}
                value={age}
                onChangeText={(text) => {
                  setAge(text.replace(/[^0-9]/g, ''));
                  if (error) setError(null);
                }}
                onFocus={() => setActiveFocus('age')}
                onBlur={() => setActiveFocus(null)}
                placeholder="Enter your age"
                placeholderTextColor={colors.inkFaint}
                keyboardType="numeric"
                maxLength={3}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              <Text style={s.unitText}>years</Text>
            </Pressable>
          </View>

          {/* Gender */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Gender</Text>
            <View style={s.chipRow}>
              {GENDER_OPTIONS.map((g) => {
                const active = gender === g.value;
                return (
                  <Pressable
                    key={g.value}
                    accessibilityRole="button"
                    accessibilityLabel={g.label}
                    style={[s.genderChip, active && s.genderChipActive]}
                    onPress={() => setGender(g.value)}
                  >
                    <Text style={[s.genderIcon, active && s.genderIconActive]}>
                      {g.icon}
                    </Text>
                    <Text style={[s.genderLabel, active && s.genderLabelActive]}>
                      {g.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Preferred Language */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Preferred Language</Text>
            <View style={s.chipRow}>
              {LANGUAGE_OPTIONS.map((l) => {
                const active = preferredLanguage === l.value;
                return (
                  <Pressable
                    key={l.value}
                    accessibilityRole="button"
                    accessibilityLabel={l.label}
                    style={[s.langChip, active && s.langChipActive]}
                    onPress={() => setPreferredLanguage(l.value)}
                  >
                    {active && <Text style={s.checkMark}>✓ </Text>}
                    <Text style={[s.langLabel, active && s.langLabelActive]}>
                      {l.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Quick Sample Profile Pill for Instant Testing */}
          <Pressable
            style={s.sampleProfileBtn}
            onPress={() => {
              setFullName('Alex Morgan');
              setAge('34');
              setGender('male');
              setPreferredLanguage('English');
              setError(null);
            }}
          >
            <Text style={s.sampleProfileText}>⚡ Quick fill sample profile (Alex Morgan, 34)</Text>
          </Pressable>

          {/* Personalized Care Card */}
          <View style={s.infoCard}>
            <View style={s.infoCardHeader}>
              <View style={s.infoIconCircle}>
                <Icon name="sparkles" size={16} color={colors.surfie} />
              </View>
              <Text style={s.infoCardTitle}>Personalized care, just for you</Text>
            </View>
            <Text style={s.infoCardBody}>
              This helps us suggest the right doctors, content, and support in your preferred language.
            </Text>
          </View>
        </View>

        {/* Action Button & Secure Tag */}
        <View style={s.footer}>
          <PillButton
            label="Save & Continue"
            onPress={handleSave}
            loading={loading}
          />
          <View style={s.secureRow}>
            <Icon name="lock" size={14} color={colors.inkFaint} />
            <Text style={s.secureText}>Your information is secure and private</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandTextCol: {
    gap: 1,
  },
  brandName: {
    fontFamily: typography.heading.family,
    fontWeight: '800',
    fontSize: typography.size.md,
    color: colors.surfie,
  },
  brandTagline: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
  },
  stepRow: {
    marginBottom: spacing.sm,
  },
  titleSection: {
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.heading.family,
    fontWeight: '800',
    fontSize: 28,
    color: '#111827',
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.danger,
    fontWeight: '600',
  },
  form: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: '#374151',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    height: 52,
    gap: spacing.sm,
  },
  inputContainerFocused: {
    borderColor: colors.surfie,
    borderWidth: 1.5,
  },
  inputContainerError: {
    borderColor: colors.danger,
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: '#111827',
    height: '100%',
    paddingVertical: 0,
    outlineStyle: 'none' as any,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  unitText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
  },
  clearBtn: {
    padding: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  genderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  genderChipActive: {
    backgroundColor: colors.surface.selected,
    borderColor: colors.surfie,
  },
  genderIcon: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  genderIconActive: {
    color: colors.surfie,
    fontWeight: '700',
  },
  genderLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '500',
    color: '#374151',
  },
  genderLabelActive: {
    color: colors.surfie,
    fontWeight: '700',
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  langChipActive: {
    backgroundColor: colors.surface.selected,
    borderColor: colors.surfie,
  },
  checkMark: {
    color: colors.surfie,
    fontWeight: '800',
    fontSize: 12,
  },
  langLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '500',
    color: '#374151',
  },
  langLabelActive: {
    color: colors.surfie,
    fontWeight: '700',
  },
  sampleProfileBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF8F5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#D1EAE0',
  },
  sampleProfileText: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.surfie,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#EEF8F5',
    borderWidth: 1,
    borderColor: '#D4EFE5',
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.xs,
    gap: 6,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D7F1E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardTitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.surfie,
  },
  infoCardBody: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
    paddingLeft: 32,
  },
  footer: {
    marginTop: spacing.xl,
    gap: spacing.md,
    alignItems: 'stretch',
  },
  secureRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingBottom: spacing.sm,
  },
  secureText: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkFaint,
  },
});

export default ProfileSetupScreen;
