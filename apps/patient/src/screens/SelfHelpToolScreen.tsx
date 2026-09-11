import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, AppHeader, Button, StatusPill, Icon } from '@coracure/ui';
import type { RootStackParamList } from '../navigation/RootNavigator';

type ToolNavProp = NativeStackNavigationProp<RootStackParamList, 'SelfHelpTool'>;

const MORE_TOOLS = [
  { id: 'grounding', label: '5-4-3-2-1 Grounding', icon: 'checkCircle' as const },
  { id: 'sleep', label: 'Sleep Reset', icon: 'clock' as const },
  { id: 'journal', label: 'Mood Journal', icon: 'heart' as const },
];

export const SelfHelpToolScreen = () => {
  const navigation = useNavigation<ToolNavProp>();

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
        message: 'Try this Guided Breathing exercise on CoraCure to calm anxiety and relax.',
      });
    } catch {
      // ignore
    }
  };

  const handleDone = () => {
    Alert.alert('Session Complete', 'Great job! Taking time to breathe supports your recovery.', [
      { text: 'Done', onPress: () => navigation.navigate('CareHub') },
    ]);
  };

  return (
    <Screen bottomInset contentStyle={s.container}>
      <AppHeader
        onBack={() => navigation.goBack()}
        right={
          <Pressable onPress={handleShare}>
            <Icon name="share" size={20} color={colors.inkMuted} />
          </Pressable>
        }
      />

      <View style={s.tagWrap}>
        <StatusPill label="Guided Tool" tone="brand" />
      </View>

      <View style={s.headerWrap}>
        <Text style={s.pageTitle}>Guided Breathing</Text>
        <Text style={s.pageSubtitle}>A 4-minute exercise to reduce anxiety and calm the body.</Text>
      </View>

      {/* Breathing Circle Timer Card */}
      <View style={s.timerCard}>
        <View style={s.circleOuter}>
          <View style={[s.circlePulse, phase === 'Inhale' && s.circlePulseInhale, phase === 'Hold' && s.circlePulseHold]}>
            <Text style={s.timerText}>{formatTimer(countdown)}</Text>
            <Text style={s.phaseActiveText}>{phase}</Text>
          </View>
        </View>

        {/* Phase Indicators */}
        <View style={s.phasesRow}>
          <View style={[s.phasePill, phase === 'Inhale' && s.phasePillActive]}>
            <Text style={[s.phaseNum, phase === 'Inhale' && s.phaseTextActive]}>1</Text>
            <Text style={[s.phaseLabel, phase === 'Inhale' && s.phaseTextActive]}>Inhale (4s)</Text>
          </View>
          <View style={[s.phasePill, phase === 'Hold' && s.phasePillActive]}>
            <Text style={[s.phaseNum, phase === 'Hold' && s.phaseTextActive]}>2</Text>
            <Text style={[s.phaseLabel, phase === 'Hold' && s.phaseTextActive]}>Hold (4s)</Text>
          </View>
          <View style={[s.phasePill, phase === 'Exhale' && s.phasePillActive]}>
            <Text style={[s.phaseNum, phase === 'Exhale' && s.phaseTextActive]}>3</Text>
            <Text style={[s.phaseLabel, phase === 'Exhale' && s.phaseTextActive]}>Exhale (4s)</Text>
          </View>
        </View>

        <Text style={s.breathingTip}>
          "Sit comfortably, relax your shoulders, and gently focus on each breath."
        </Text>
      </View>

      {/* Step Guide Tracker */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Your Steps</Text>
        <View style={s.stepsList}>
          <View style={s.stepRow}>
            <View style={s.stepBullet}>
              <Text style={s.stepBulletText}>1</Text>
            </View>
            <View style={s.stepTextCol}>
              <Text style={s.stepHeading}>Inhale Deeply</Text>
              <Text style={s.stepSub}>Breathe in slowly through your nose, filling your lungs.</Text>
            </View>
          </View>

          <View style={s.stepRow}>
            <View style={s.stepBullet}>
              <Text style={s.stepBulletText}>2</Text>
            </View>
            <View style={s.stepTextCol}>
              <Text style={s.stepHeading}>Hold Gently</Text>
              <Text style={s.stepSub}>Hold your breath comfortably without straining.</Text>
            </View>
          </View>

          <View style={s.stepRow}>
            <View style={s.stepBullet}>
              <Text style={s.stepBulletText}>3</Text>
            </View>
            <View style={s.stepTextCol}>
              <Text style={s.stepHeading}>Exhale Completely</Text>
              <Text style={s.stepSub}>Release the breath slowly through your mouth.</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Reflection Input */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Reflection</Text>
        <View style={s.reflectionWrap}>
          <TextInput
            style={s.reflectionInput}
            value={reflection}
            onChangeText={setReflection}
            placeholder="How do you feel after this exercise?"
            placeholderTextColor={colors.inkMuted}
            maxLength={200}
          />
          <Text style={s.charCount}>{reflection.length}/200</Text>
        </View>
      </View>

      {/* More Tools */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>More tools you may find helpful</Text>
        <View style={s.moreToolsRow}>
          {MORE_TOOLS.map((tool) => (
            <Pressable
              key={tool.id}
              style={s.moreToolCard}
              onPress={() => Alert.alert(tool.label, 'Loading exercise...')}
            >
              <Icon name={tool.icon} size={16} color={colors.surfie} />
              <Text style={s.moreToolText}>{tool.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={s.actionsRow}>
        <Button
          label="Save Tool"
          variant="secondary"
          onPress={() => Alert.alert('Saved', 'Guided Breathing saved to your favorites.')}
          style={s.actionBtn}
        />
        <Button
          label="Mark as Done →"
          onPress={handleDone}
          style={s.actionBtn}
        />
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  tagWrap: {
    marginTop: spacing.xs,
  },
  headerWrap: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  pageTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '700',
    color: colors.ink,
  },
  pageSubtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 2,
  },
  timerCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
    marginBottom: spacing.xl,
  },
  circleOuter: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 6,
    borderColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  circlePulse: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePulseInhale: {
    backgroundColor: '#D1EBE1',
    transform: [{ scale: 1.05 }],
  },
  circlePulseHold: {
    backgroundColor: '#C5E6DB',
  },
  timerText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxxl,
    fontWeight: '700',
    color: colors.surfie,
  },
  phaseActiveText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  phasesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.page,
  },
  phasePillActive: {
    backgroundColor: colors.surfie,
  },
  phaseNum: {
    fontFamily: typography.heading.family,
    fontSize: 10,
    fontWeight: '700',
    color: colors.inkMuted,
  },
  phaseLabel: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
  },
  phaseTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  breathingTip: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  stepsList: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    overflow: 'hidden',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
    gap: spacing.md,
  },
  stepBullet: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBulletText: {
    fontFamily: typography.heading.family,
    fontSize: 11,
    fontWeight: '700',
    color: colors.surfie,
  },
  stepTextCol: {
    flex: 1,
  },
  stepHeading: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.ink,
  },
  stepSub: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 1,
  },
  reflectionWrap: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  reflectionInput: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.ink,
    minHeight: 40,
  },
  charCount: {
    fontFamily: typography.body.family,
    fontSize: 9,
    color: colors.inkFaint,
    textAlign: 'right',
    marginBottom: 4,
  },
  moreToolsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  moreToolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  moreToolText: {
    fontFamily: typography.body.family,
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});

export default SelfHelpToolScreen;

