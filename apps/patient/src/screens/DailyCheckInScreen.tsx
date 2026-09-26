import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon, type IconName } from '@coracure/ui';
import { ScreenBackground } from '../components/ScreenBackground';
import LogoWide from '../assets/brand/logo-wide.svg';
import CheckinClipboardImg from '../assets/checkin-clipboard.jpg';
import GradientButton from '../components/GradientButton';
import { checkinApi } from '@coracure/api';

const MOODS = [
  { id: 'very_good', emoji: '😄', label: 'Very Good' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'okay', emoji: '😐', label: 'Okay' },
  { id: 'not_great', emoji: '😕', label: 'Not Great' },
  { id: 'very_poor', emoji: '😞', label: 'Very Poor' },
] as const;

const SYMPTOMS_LIST: { label: string; icon: IconName }[] = [
  { label: 'Headache', icon: 'user' },
  { label: 'Fatigue', icon: 'clock' },
  { label: 'Pain', icon: 'sparkles' },
  { label: 'Nausea', icon: 'heart' },
  { label: 'Dizziness', icon: 'refresh' },
  { label: 'Shortness of breath', icon: 'stethoscope' },
  { label: 'None', icon: 'checkCircle' },
];

export const DailyCheckInScreen = () => {
  const navigation = useNavigation<any>();

  type Mood = 'very_good' | 'good' | 'okay' | 'not_great' | 'very_poor';
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [otherSymptom, setOtherSymptom] = useState('');
  const [medicationTaken, setMedicationTaken] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleSymptom = (sym: string) => {
    if (sym === 'None') {
      setSelectedSymptoms(['None']);
      return;
    }
    const filtered = selectedSymptoms.filter((s) => s !== 'None');
    setSelectedSymptoms(
      filtered.includes(sym) ? filtered.filter((s) => s !== sym) : [...filtered, sym]
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await checkinApi.submitCheckIn({
        mood: selectedMood ?? 'okay',
        symptoms: otherSymptom.trim()
          ? [...selectedSymptoms, otherSymptom.trim()]
          : selectedSymptoms,
        medicationTaken: medicationTaken ?? false,
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
        keyboardShouldPersistTaps="handled"
      >
        <ScreenBackground name="dailyCheckIn" scrolls />
        {/* Title & Graphic Header Row */}
        <View style={s.heroRow}>
          <View style={s.heroTextCol}>
            <Text style={s.pageTitle}>Daily Check-In</Text>
            <Text style={s.pageSubtitle}>
              A quick check-in helps{'\n'}your care team support you better.
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
          <View style={s.questionRow}>
            <View style={s.questionIcon}>
              <Icon name="heart" size={20} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={s.sectionQuestion}>How are you feeling today?</Text>
              <Text style={s.sectionHint}>Select the option that best describes you.</Text>
            </View>
          </View>

          <View style={s.moodRow}>
            {MOODS.map((m) => {
              const isSelected = selectedMood === m.id;
              return (
                <Pressable
                  key={m.id}
                  style={[s.moodCard, isSelected && s.moodCardActive]}
                  onPress={() => setSelectedMood(m.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Mood: ${m.label}`}
                >
                  {isSelected && (
                    <View style={s.moodCheckBadge}>
                      <Icon name="check" size={12} color={colors.white} />
                    </View>
                  )}
                  <Text style={s.moodEmoji}>{m.emoji}</Text>
                  <Text style={[s.moodLabel, isSelected && s.moodLabelActive]}>
                    {m.label.split(' ').join('\n')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 2. Discomfort & Symptoms Multi-select */}
        <View style={s.cardSection}>
          <View style={s.questionRow}>
            <View style={s.questionIcon}>
              <Icon name="clipboard" size={20} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={s.sectionQuestion}>Any new or worsening symptoms?</Text>
              <Text style={s.sectionHint}>Select all that apply.</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.symptomsWrap}
            keyboardShouldPersistTaps="handled"
          >
            {SYMPTOMS_LIST.map((sym) => {
              const isSelected = selectedSymptoms.includes(sym.label);
              return (
                <Pressable
                  key={sym.label}
                  style={[s.symptomChip, isSelected && s.symptomChipActive]}
                  onPress={() => toggleSymptom(sym.label)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={sym.label}
                >
                  <Icon name={sym.icon} size={16} color={colors.surfie} />
                  <Text style={[s.symptomText, isSelected && s.symptomTextActive]}>
                    {sym.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={s.otherRow}>
            <TextInput
              style={s.otherInput}
              value={otherSymptom}
              onChangeText={setOtherSymptom}
              placeholder="Other (please specify)"
              placeholderTextColor={colors.inkFaint}
              accessibilityLabel="Other symptom"
            />
            <Icon name="plus" size={18} color={colors.inkFaint} />
          </View>
        </View>

        {/* 3. Medication Adherence */}
        <View style={s.cardSection}>
          <View style={s.questionRow}>
            <View style={s.questionIcon}>
              <Icon name="prescription" size={20} color={colors.surfie} />
            </View>
            <Text style={[s.sectionQuestion, s.flex]} numberOfLines={1}>
              Did you take your medication today?
            </Text>
          </View>

          <View style={s.medToggleRow}>
            <Pressable
              style={[s.medToggleBtn, medicationTaken === true && s.medToggleBtnActive]}
              onPress={() => setMedicationTaken(true)}
              accessibilityRole="button"
              accessibilityLabel="Yes, medication taken"
            >
              <Text style={[s.medToggleText, medicationTaken === true && s.medToggleTextActive]}>
                Yes
              </Text>
              {medicationTaken === true && (
                <Icon name="checkCircle" size={14} color={colors.surfie} filled />
              )}
            </Pressable>
            <Pressable
              style={[s.medToggleBtn, medicationTaken === false && s.medToggleBtnActive]}
              onPress={() => setMedicationTaken(false)}
              accessibilityRole="button"
              accessibilityLabel="No, medication not taken"
            >
              <Text style={[s.medToggleText, medicationTaken === false && s.medToggleTextActive]}>
                No
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 4. Notes Textarea */}
        <View style={s.cardSection}>
          <View style={s.questionRow}>
            <View style={s.questionIcon}>
              <Icon name="document" size={20} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={s.sectionQuestion} numberOfLines={1}>Anything else to share?</Text>
              <Text style={s.sectionHint}>Add any notes for your care team (optional).</Text>
            </View>
          </View>

          <View style={s.textAreaBox}>
            <TextInput
              style={s.textArea}
              value={notes}
              onChangeText={setNotes}
              placeholder="Type your notes here..."
              placeholderTextColor={colors.inkFaint}
              multiline
              numberOfLines={3}
              maxLength={500}
              accessibilityLabel="Notes for your care team"
            />
            <Text style={s.charCount}>{notes.length}/500</Text>
          </View>
        </View>

        {/* Privacy Note */}
        <View style={s.privacyNotice}>
          <Icon name="shieldCheck" size={20} color={colors.surfie} />
          <View style={s.flex}>
            <Text style={s.privacyTitle}>Your information is secure</Text>
            <Text style={s.privacyText}>
              Your check-in is private and only visible to your care team.
            </Text>
          </View>
        </View>

        <GradientButton
          label="Submit Check-In"
          onPress={handleSubmit}
          loading={submitting}
          accessibilityHint="Sends today's check-in to your care team"
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    /* Transparent so the page artwork runs behind it unbroken. */
    backgroundColor: 'transparent',
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
    paddingTop: spacing.xxl,
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
  flex: { flex: 1 },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  questionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionQuestion: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '500',
    color: colors.ink,
  },
  sectionHint: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 2,
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
    fontSize: 26,
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
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  symptomChipActive: {
    backgroundColor: colors.surface.mintSoft,
    borderColor: colors.surfie,
  },
  symptomText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.ink,
  },
  symptomTextActive: {
    color: colors.surfie,
    fontWeight: '700',
  },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.surface.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  otherInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  medToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  medToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
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
  textAreaBox: {
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  textArea: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    textAlign: 'right',
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  privacyTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },
  privacyText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 1,
  },
});

export default DailyCheckInScreen;
