import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, typography, radius } from '@coracure/brand';
import { PillButton, Icon } from '@coracure/ui';
import { legalApi } from '@coracure/api';
import LogoMark from '../assets/brand/logo-mark.svg';
import { ScreenBackground } from '../components/ScreenBackground';
import { useAuth } from '../hooks/useAuth';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Consent'>;

export const ConsentScreen = () => {
  const navigation = useNavigation<Nav>();
  const { loginAsDemo, refreshProfile } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      try {
        await legalApi.acceptConsent('teleconsultation_consent');
        await refreshProfile();
      } catch {
        // Fallback for offline preview: ensure demo account is active and complete
        await loginAsDemo({ isComplete: true });
      }
      navigation.navigate('MainTabs');
    } catch {
      navigation.navigate('MainTabs');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    navigation.goBack();
  };

  return (
    <View style={s.container}>
      <ScreenBackground name="auth" />

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Header with Back Arrow & Brand */}
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={12}>
            <Icon name="arrowLeft" size={20} color={colors.ink} />
          </Pressable>
          <View style={s.brandRow}>
            <LogoMark width={32} height={32} />
            <Text style={s.brandName}>CoraCure</Text>
          </View>
          <View style={s.headerSpacer} />
        </View>

        {/* Title Section */}
        <View style={s.titleSection}>
          <Text style={s.title}>Teleconsultation</Text>
          <Text style={s.title}>Consent</Text>
        </View>

        {/* Section 1: What is stored */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardIconBadge}>
              <Icon name="shieldCheck" size={16} color={colors.surfie} />
            </View>
            <Text style={s.cardTitle}>What is stored</Text>
          </View>

          <View style={s.itemsList}>
            <View style={s.itemRow}>
              <View style={s.checkCircle}>
                <Text style={s.checkSymbol}>✓</Text>
              </View>
              <View style={s.itemTextCol}>
                <Text style={s.itemTitle}>Your profile and contact information</Text>
                <Text style={s.itemSubtitle}>Name, age, email, phone number</Text>
              </View>
            </View>

            <View style={s.itemRow}>
              <View style={s.checkCircle}>
                <Text style={s.checkSymbol}>✓</Text>
              </View>
              <View style={s.itemTextCol}>
                <Text style={s.itemTitle}>Consultation notes and prescriptions</Text>
                <Text style={s.itemSubtitle}>Summary of your consultation and treatment plan</Text>
              </View>
            </View>

            <View style={s.itemRow}>
              <View style={s.checkCircle}>
                <Text style={s.checkSymbol}>✓</Text>
              </View>
              <View style={s.itemTextCol}>
                <Text style={s.itemTitle}>Payment and billing information</Text>
                <Text style={s.itemSubtitle}>Transaction details and receipts</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 2: What is not stored */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardIconBadge}>
              <Icon name="lock" size={16} color={colors.surfie} />
            </View>
            <Text style={s.cardTitle}>What is not stored</Text>
          </View>

          <View style={s.itemsList}>
            <View style={s.itemRow}>
              <View style={s.checkCircle}>
                <Text style={s.checkSymbol}>✓</Text>
              </View>
              <View style={s.itemTextCol}>
                <Text style={s.itemTitle}>No video recording</Text>
                <Text style={s.itemSubtitle}>Your teleconsultation video is never recorded or saved</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Agreement Checkbox */}
        <Pressable style={s.agreementRow} onPress={() => setAgreed(!agreed)}>
          <View style={[s.checkbox, agreed && s.checkboxChecked]}>
            {agreed && <Text style={s.checkboxCheck}>✓</Text>}
          </View>
          <View style={s.agreementTextCol}>
            <Text style={s.agreementText}>
              By continuing, you agree to our <Text style={s.linkText}>Privacy Policy</Text> and <Text style={s.linkText}>Terms of Service</Text>.
            </Text>
            <Text style={s.versionText}>Consent version 1.0 • Updated 09 May 2024</Text>
          </View>
        </Pressable>

        {/* Action Button & Decline */}
        <View style={s.footer}>
          <PillButton
            label="Accept & Continue"
            onPress={handleAccept}
            loading={loading}
          />
          <Pressable onPress={handleDecline} style={s.declineBtn}>
            <Text style={s.declineText}>Decline</Text>
          </Pressable>
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
    /* Clears the artwork sitting behind the header. */
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandName: {
    fontFamily: typography.heading.family,
    fontWeight: '800',
    fontSize: typography.size.md,
    color: colors.surfie,
  },
  headerSpacer: {
    width: 40,
  },
  titleSection: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: typography.heading.family,
    fontWeight: '600',
    fontSize: 28,
    color: '#111827',
    lineHeight: 34,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
  },
  cardIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: typography.heading.family,
    fontWeight: '700',
    fontSize: typography.size.sm,
    color: '#111827',
  },
  itemsList: {
    gap: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DEF7EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkSymbol: {
    color: '#0E766C',
    fontSize: 11,
    fontWeight: '800',
  },
  itemTextCol: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontFamily: typography.body.family,
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemSubtitle: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 16,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  checkboxCheck: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  agreementTextCol: {
    flex: 1,
    gap: 4,
  },
  agreementText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  linkText: {
    color: colors.surfie,
    fontWeight: '600',
  },
  versionText: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkFaint,
  },
  footer: {
    gap: spacing.md,
    alignItems: 'stretch',
  },
  declineBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  declineText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    fontWeight: '600',
  },
});

export default ConsentScreen;

