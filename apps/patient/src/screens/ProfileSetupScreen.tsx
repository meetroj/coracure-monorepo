import React, { useState } from 'react';
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

  const [fullName, setFullName] = useState(user?.fullName || 'Alex Morgan');
  const [age, setAge] = useState(user?.age ? String(user.age) : '34');
  const [gender, setGender] = useState<string>(user?.gender || 'male');
  const [preferredLanguage, setPreferredLanguage] = useState<string>(user?.preferredLanguage || 'English');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setLoading(true);
    try {
      try {
        await profileApi.updateProfile({
          fullName: fullName.trim() || 'Alex Morgan',
          gender: (gender as any) || 'male',
          preferredLanguage: preferredLanguage || 'English',
        });
        await refreshProfile();
      } catch {
        // Fallback for offline / demo mode
        await loginAsDemo({
          fullName: fullName.trim() || 'Alex Morgan',
          age: parseInt(age, 10) || 34,
          gender: (gender as any) || 'male',
          preferredLanguage,
          isComplete: true,
        });
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
      >
        {/* Brand Header */}
        <View style={s.header}>
          <View style={s.brandRow}>
            <LogoMark width={34} height={34} />
            <View style={s.brandTextCol}>
              <Text style={s.brandName}>CoraCure</Text>
              <Text style={s.brandTagline}>Care. Connected.</Text>
            </View>
          </View>
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
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form Fields */}
        <View style={s.form}>
          {/* Full Name */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Full Name</Text>
            <View style={s.inputContainer}>
              <Icon name="user" size={18} color={colors.inkFaint} />
              <RNTextInput
                style={s.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.inkFaint}
              />
            </View>
          </View>

          {/* Age */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Age</Text>
            <View style={s.inputContainer}>
              <Icon name="calendar" size={18} color={colors.inkFaint} />
              <RNTextInput
                style={s.input}
                value={age}
                onChangeText={setAge}
                placeholder="Enter your age"
                placeholderTextColor={colors.inkFaint}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={s.unitText}>years</Text>
            </View>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.md,
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
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: {
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
  input: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: '#111827',
    outlineStyle: 'none' as any,
  },
  unitText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
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
