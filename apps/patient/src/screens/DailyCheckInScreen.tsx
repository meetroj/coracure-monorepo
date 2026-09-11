import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ScrollView, Image } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, AppHeader, Button, FilterChip, Icon } from '@coracure/ui';
import CheckinClipboardImg from '../assets/checkin-clipboard.jpg';
import { checkinApi } from '@coracure/api';
import type { RootStackParamList } from '../navigation/RootNavigator';

type CheckInNavProp = NativeStackNavigationProp<RootStackParamList, 'DailyCheckIn'>;

const MOODS = [
  { id: 'very_good', emoji: '😄', label: 'Very Good' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'okay', emoji: '😐', label: 'Okay' },
  { id: 'not_great', emoji: '🙁', label: 'Not Great' },
  { id: 'very_poor', emoji: '😫', label: 'Very Poor' },
] as const;

const SYMPTOMS_LIST = [
  'Headache',
  'Fatigue',
  'Pain',
  'Nausea',
  'Dizziness',
  'Shortness of breath',
  'None',
];

export const DailyCheckInScreen = () => {
  const navigation = useNavigation<CheckInNavProp>();

  const [selectedMood, setSelectedMood] = useState<'very_good' | 'good' | 'okay' | 'not_great' | 'very_poor'>('good');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['None']);
  const [otherSymptom, setOtherSymptom] = useState('');
  const [medicationTaken, setMedicationTaken] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleSymptom = (sym: string) => {
    if (sym === 'None') {
      setSelectedSymptoms(['None']);
      return;
    }
    const filtered = selectedSymptoms.filter((s) => s !== 'None');
    if (filtered.includes(sym)) {
      const next = filtered.filter((s) => s !== sym);
      setSelectedSymptoms(next.length === 0 ? ['None'] : next);
    } else {
      setSelectedSymptoms([...filtered, sym]);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await checkinApi.submitCheckIn({
        mood: selectedMood,
        symptoms: selectedSymptoms,
        otherSymptoms: otherSymptom.trim() || undefined,
        medicationTaken,
        notes: notes.trim() || undefined,
      });
      navigation.replace('CheckInComplete', { status: 'low_risk' });
    } catch {
      navigation.replace('CheckInComplete', { status: 'low_risk' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen bottomInset contentStyle={s.container}>
      <AppHeader
        onBack={() => navigation.goBack()}
        right={<Icon name="bell" size={20} color={colors.inkMuted} />}
      />

      <View style={s.headerRow}>
        <View style={s.headerTextCol}>
          <Text style={s.pageTitle}>Daily Check-In</Text>
          <Text style={s.pageSubtitle}>
            A quick check-in helps your Care Team support your recovery.
          </Text>
        </View>
        <View style={s.badgeGraphic}>
          <Image
            source={CheckinClipboardImg}
            style={s.badgeGraphicImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* 1. Mood Sentiment Selector */}
      <View style={s.section}>
        <Text style={s.sectionQuestion}>How are you feeling today?</Text>
        <Text style={s.sectionHelper}>Select the option that best describes you.</Text>
        <View style={s.moodRow}>
          {MOODS.map((m) => {
            const isSelected = selectedMood === m.id;
            return (
              <Pressable
                key={m.id}
                style={[s.moodCard, isSelected && s.moodCardActive]}
                onPress={() => setSelectedMood(m.id)}
              >
                <Text style={s.moodEmoji}>{m.emoji}</Text>
                <Text style={[s.moodLabel, isSelected && s.moodLabelActive]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 2. Symptoms Multi-select */}
      <View style={s.section}>
        <Text style={s.sectionQuestion}>Any new or worsening symptoms?</Text>
        <Text style={s.sectionHelper}>Select all that apply.</Text>
        <View style={s.symptomsGrid}>
          {SYMPTOMS_LIST.map((sym) => {
            const isSelected = selectedSymptoms.includes(sym);
            return (
              <FilterChip
                key={sym}
                label={sym}
                active={isSelected}
                onPress={() => toggleSymptom(sym)}
              />
            );
          })}
        </View>

        <TextInput
          style={s.otherInput}
          value={otherSymptom}
          onChangeText={setOtherSymptom}
          placeholder="Other (please specify) +"
          placeholderTextColor={colors.inkMuted}
        />
      </View>

      {/* 3. Medication Adherence */}
      <View style={s.section}>
        <Text style={s.sectionQuestion}>Did you take your medication today?</Text>
        <Text style={s.sectionHelper}>If multiple medications, mark yes if you took all as prescribed.</Text>
        <View style={s.medToggleRow}>
          <Pressable
            style={[s.medToggleBtn, medicationTaken && s.medToggleBtnActive]}
            onPress={() => setMedicationTaken(true)}
          >
            <Text style={[s.medToggleText, medicationTaken && s.medToggleTextActive]}>Yes</Text>
          </Pressable>
          <Pressable
            style={[s.medToggleBtn, !medicationTaken && s.medToggleBtnActive]}
            onPress={() => setMedicationTaken(false)}
          >
            <Text style={[s.medToggleText, !medicationTaken && s.medToggleTextActive]}>No</Text>
          </Pressable>
        </View>
      </View>

      {/* 4. Notes Textarea */}
      <View style={s.section}>
        <Text style={s.sectionQuestion}>Anything else you'd like to share?</Text>
        <Text style={s.sectionHelper}>Add any notes for your care team (optional).</Text>
        <View style={s.textAreaWrap}>
          <TextInput
            style={s.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Type your notes here..."
            placeholderTextColor={colors.inkMuted}
            multiline
            numberOfLines={3}
            maxLength={150}
          />
          <Text style={s.charCount}>{notes.length}/150</Text>
        </View>
      </View>

      {/* Privacy Notice */}
      <View style={s.privacyNotice}>
        <Icon name="lock" size={14} color={colors.surfie} />
        <Text style={s.privacyText}>
          Your information is secure. Your check-in is private and only shared with your Care Team.
        </Text>
      </View>

      {/* Submit Button */}
      <View style={s.footer}>
        <Button
          label="Submit Check-In →"
          onPress={handleSubmit}
          loading={submitting}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  headerTextCol: {
    flex: 1,
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
    lineHeight: 18,
  },
  badgeGraphic: {
    width: 54,
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  badgeGraphicImage: {
    width: '100%',
    height: '100%',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionQuestion: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  sectionHelper: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  moodCard: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    gap: 4,
  },
  moodCardActive: {
    backgroundColor: colors.surface.mintSoft,
    borderColor: colors.surfie,
    borderWidth: 2,
  },
  moodEmoji: {
    fontSize: 22,
  },
  moodLabel: {
    fontFamily: typography.body.family,
    fontSize: 9,
    color: colors.inkMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
  moodLabelActive: {
    color: colors.surfie,
    fontWeight: '700',
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  otherInput: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.ink,
  },
  medToggleRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  medToggleBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  medToggleBtnActive: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  medToggleText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  medToggleTextActive: {
    color: colors.white,
  },
  textAreaWrap: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
  },
  textArea: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.ink,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkFaint,
    textAlign: 'right',
    marginTop: 4,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.mintSoft,
    padding: spacing.md,
    borderRadius: radius.card,
    marginBottom: spacing.xl,
  },
  privacyText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.surfie,
    lineHeight: 15,
  },
  footer: {
    marginTop: spacing.xs,
  },
});

export default DailyCheckInScreen;

