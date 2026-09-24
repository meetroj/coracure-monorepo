import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon, PillButton } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import CheckinClipboardImg from '../assets/checkin-clipboard.jpg';
import { checkinApi } from '@coracure/api';

const MOODS = [
  { id: 'very_good', emoji: '😄', label: 'Great' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'okay', emoji: '😐', label: 'Okay' },
  { id: 'not_great', emoji: '🙁', label: 'Poor' },
  { id: 'very_poor', emoji: '😫', label: 'Bad' },
] as const;

const SYMPTOMS_LIST = [
  'Headache',
  'Fatigue',
  'Mild',
  'None',
  'Joint Stiffness',
  'Swelling',
  'Nausea',
];

export const DailyCheckInScreen = () => {
  const navigation = useNavigation<any>();

  const [selectedMood, setSelectedMood] = useState<'very_good' | 'good' | 'okay' | 'not_great' | 'very_poor'>('okay');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['None']);
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
    <View style={s.container}>
      {/* Top Header Bar */}
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
          onPress={() => navigation.navigate('Notifications')}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Icon name="bell" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Graphic Header Row */}
        <View style={s.heroRow}>
          <View style={s.heroTextCol}>
            <Text style={s.pageTitle}>Daily Check-In</Text>
            <Text style={s.pageSubtitle}>
              Quick 2-min update helps your care team tailor recovery.
            </Text>
          </View>
          <View style={s.clipboardFrame}>
            <Image
              source={CheckinClipboardImg}
              style={s.clipboardImg}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* 1. Mood Sentiment Selector */}
        <View style={s.cardSection}>
          <Text style={s.sectionQuestion}>How are you feeling today?</Text>
          <View style={s.moodRow}>
            {MOODS.map((m) => {
              const isSelected = selectedMood === m.id;
              return (
                <Pressable
                  key={m.id}
                  style={[s.moodCard, isSelected && s.moodCardActive]}
                  onPress={() => setSelectedMood(m.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Mood: ${m.label}`}
                >
                  {isSelected && (
                    <View style={s.moodCheckBadge}>
                      <Icon name="check" size={12} color={colors.white} />
                    </View>
                  )}
                  <Text style={s.moodEmoji}>{m.emoji}</Text>
                  <Text style={[s.moodLabel, isSelected && s.moodLabelActive]}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 2. Discomfort & Symptoms Multi-select */}
        <View style={s.cardSection}>
          <Text style={s.sectionQuestion}>Any other discomfort or pain?</Text>
          <View style={s.symptomsWrap}>
            {SYMPTOMS_LIST.map((sym) => {
              const isSelected = selectedSymptoms.includes(sym);
              return (
                <Pressable
                  key={sym}
                  style={[s.symptomChip, isSelected && s.symptomChipActive]}
                  onPress={() => toggleSymptom(sym)}
                  accessibilityRole="button"
                  accessibilityLabel={sym}
                >
                  {isSelected && <Icon name="check" size={13} color={colors.white} />}
                  <Text style={[s.symptomText, isSelected && s.symptomTextActive]}>
                    {sym}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 3. Medication Adherence */}
        <View style={s.cardSection}>
          <Text style={s.sectionQuestion}>Did you take your medication today?</Text>
          <View style={s.medToggleRow}>
            <Pressable
              style={[s.medToggleBtn, medicationTaken && s.medToggleBtnActive]}
              onPress={() => setMedicationTaken(true)}
              accessibilityRole="button"
              accessibilityLabel="Yes, medication taken"
            >
              <Text style={[s.medToggleText, medicationTaken && s.medToggleTextActive]}>
                Yes
              </Text>
            </Pressable>
            <Pressable
              style={[s.medToggleBtn, !medicationTaken && s.medToggleBtnActive]}
              onPress={() => setMedicationTaken(false)}
              accessibilityRole="button"
              accessibilityLabel="No, medication not taken"
            >
              <Text style={[s.medToggleText, !medicationTaken && s.medToggleTextActive]}>
                No
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 4. Notes Textarea */}
        <View style={s.cardSection}>
          <Text style={s.sectionQuestion}>Anything else you'd like to share?</Text>
          <TextInput
            style={s.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Type your notes here for your doctor..."
            placeholderTextColor={colors.inkFaint}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Privacy Note */}
        <View style={s.privacyNotice}>
          <Icon name="lock" size={14} color={colors.surfie} />
          <Text style={s.privacyText}>
            Your data is kept secure and private.
          </Text>
        </View>

        {/* Submit Pill Button */}
        <PillButton
          label={submitting ? "SUBMITTING..." : "SUBMIT CHECK-IN"}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityLabel="Submit daily check-in"
        />
      </ScrollView>
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
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  heroTextCol: {
    flex: 1,
    paddingRight: spacing.sm,
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
    lineHeight: 18,
  },
  clipboardFrame: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: '#EEF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  clipboardImg: {
    width: '100%',
    height: '100%',
  },
  cardSection: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    gap: spacing.sm,
  },
  sectionQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  moodCard: {
    width: '18%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.card,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    position: 'relative',
    gap: 4,
  },
  moodCardActive: {
    borderColor: colors.surfie,
    backgroundColor: '#EEF8F5',
  },
  moodCheckBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 22,
  },
  moodLabel: {
    fontSize: 11,
    color: colors.inkMuted,
    fontWeight: '500',
  },
  moodLabelActive: {
    color: colors.surfie,
    fontWeight: '700',
  },
  symptomsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  symptomChipActive: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  symptomText: {
    fontSize: 12,
    color: colors.ink,
    fontWeight: '500',
  },
  symptomTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  medToggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  medToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.input,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  medToggleBtnActive: {
    backgroundColor: '#EEF8F5',
    borderColor: colors.surfie,
  },
  medToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  medToggleTextActive: {
    color: colors.surfie,
    fontWeight: '700',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radius.input,
    padding: 10,
    fontSize: 13,
    color: colors.ink,
    minHeight: 70,
    textAlignVertical: 'top',
    backgroundColor: '#F9FAFB',
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginVertical: 2,
  },
  privacyText: {
    fontSize: 12,
    color: colors.inkMuted,
  },
});

export default DailyCheckInScreen;
