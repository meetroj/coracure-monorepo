import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon, PillButton } from '@coracure/ui';
import { ScreenBackground } from '../components/ScreenBackground';
import LogoWide from '../assets/brand/logo-wide.svg';
import PatientTabBar from '../components/PatientTabBar';

export const SelfHelpToolScreen = () => {
  const navigation = useNavigation<any>();

  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [countdown, setCountdown] = useState(84); // 1:24
  const [isActive, setIsActive] = useState(true);
  const [reflection, setReflection] = useState('');

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    const phaseInterval = setInterval(() => {
      setPhase((prev) => (prev === 'Inhale' ? 'Hold' : prev === 'Hold' ? 'Exhale' : 'Inhale'));
    }, 4000);
    return () => clearInterval(phaseInterval);
  }, [isActive]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Try this Guided Breathing exercise on CoraCure to calm anxiety and ease pain flare-ups.',
      });
    } catch {}
  };

  const handleFinish = () => {
    Alert.alert('Session Complete', 'Great job! Taking time to breathe supports joint recovery and lowers stress.', [
      { text: 'Done', onPress: () => navigation.navigate('CareHub') },
    ]);
  };

  return (
    <View style={s.container}>
      <ScreenBackground name="selfHelp" />
      {/* Top Header */}
      <View style={s.headerBar}>
        <Pressable
          style={s.headerIconBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrowLeft" size={20} color={colors.ink} />
        </Pressable>

        <LogoWide width={110} height={28} />

        <Pressable
          style={s.headerIconBtn}
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel="Share exercise"
        >
          <Icon name="share" size={18} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={s.titleWrap}>
          <Text style={s.pageTitle}>Self-Help Tool 🌿</Text>
          <Text style={s.pageSubtitle}>
            Guided breathing exercise to relax and reduce joint stress
          </Text>
        </View>

        {/* Breathing Ring Timer Card */}
        <View style={s.timerCard}>
          <View style={s.circleOuter}>
            <View
              style={[
                s.circlePulse,
                phase === 'Inhale' && s.pulseInhale,
                phase === 'Hold' && s.pulseHold,
                phase === 'Exhale' && s.pulseExhale,
              ]}
            >
              <Text style={s.timerCountdown}>{formatTimer(countdown)}</Text>
              <Text style={s.phaseText}>{phase}</Text>
            </View>
          </View>

          {/* Phase Steps Row */}
          <View style={s.phasesRow}>
            <View style={[s.phasePill, phase === 'Inhale' && s.phasePillActive]}>
              <Text style={[s.phasePillText, phase === 'Inhale' && s.phasePillTextActive]}>
                Inhale (4s)
              </Text>
            </View>
            <View style={[s.phasePill, phase === 'Hold' && s.phasePillActive]}>
              <Text style={[s.phasePillText, phase === 'Hold' && s.phasePillTextActive]}>
                Hold (7s)
              </Text>
            </View>
            <View style={[s.phasePill, phase === 'Exhale' && s.phasePillActive]}>
              <Text style={[s.phasePillText, phase === 'Exhale' && s.phasePillTextActive]}>
                Exhale (8s)
              </Text>
            </View>
          </View>
        </View>

        {/* Metrics Row */}
        <View style={s.metricsRow}>
          <View style={s.metricCard}>
            <Text style={s.metricVal}>72 bpm</Text>
            <Text style={s.metricLabel}>Heart Rate</Text>
          </View>
          <View style={s.metricCard}>
            <Text style={s.metricVal}>3 Days</Text>
            <Text style={s.metricLabel}>Streak</Text>
          </View>
          <View style={s.metricCard}>
            <Text style={s.metricVal}>85%</Text>
            <Text style={s.metricLabel}>Calm Score</Text>
          </View>
        </View>

        {/* Reflection Input */}
        <View style={s.cardSection}>
          <Text style={s.sectionQuestion}>How did this exercise feel?</Text>
          <TextInput
            style={s.textArea}
            value={reflection}
            onChangeText={setReflection}
            placeholder="Record any notes on how your body or pain feels right now..."
            placeholderTextColor={colors.inkFaint}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Bottom Action Pill Button */}
        <PillButton
          label="FINISH SESSION"
          onPress={handleFinish}
          accessibilityLabel="Finish breathing session"
        />
      </ScrollView>

      {/* 5-Tab Bar */}
      <PatientTabBar activeTab="CarePlan" />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FBF9',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  titleWrap: {
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  timerCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: spacing.lg,
  },
  circleOuter: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 6,
    borderColor: '#A7F3D0',
    backgroundColor: '#EEF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePulse: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surfie,
    shadowColor: colors.surfie,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  pulseInhale: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  pulseHold: {
    borderColor: '#0E766C',
    backgroundColor: '#EEF8F5',
  },
  pulseExhale: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  timerCountdown: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
  },
  phaseText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.surfie,
    marginTop: 2,
  },
  phasesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phasePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  phasePillActive: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  phasePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  phasePillTextActive: {
    color: colors.white,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.surfie,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  cardSection: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  sectionQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radius.input,
    padding: 10,
    fontSize: 13,
    color: colors.ink,
    minHeight: 65,
    textAlignVertical: 'top',
    backgroundColor: '#F9FAFB',
  },
});

export default SelfHelpToolScreen;
