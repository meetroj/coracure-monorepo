import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Image, ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, AppHeader, Icon, type IconName } from '@coracure/ui';
import { ScreenBackground } from '../components/ScreenBackground';
import LogoWide from '../assets/brand/logo-wide.svg';
import GradientButton from '../components/GradientButton';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import { consultationsApi } from '@coracure/api';
import type { RootStackParamList } from '../navigation/RootNavigator';

type FeedbackScreenProp = NativeStackNavigationProp<RootStackParamList, 'Feedback'>;
type FeedbackRouteProp = RouteProp<RootStackParamList, 'Feedback'>;

const FEEDBACK_TAGS: { label: string; icon: IconName }[] = [
  { label: 'Doctor Explanation', icon: 'user' },
  { label: 'Treatment Plan', icon: 'clipboard' },
  { label: 'Time Spent', icon: 'clock' },
  { label: 'Staff Support', icon: 'heart' },
  { label: 'Other', icon: 'message' },
];

const QUALITY_OPTIONS: ('poor' | 'fair' | 'good' | 'excellent')[] = ['poor', 'fair', 'good', 'excellent'];

/** The call-quality scale is drawn as faces, not words. */
const QUALITY_FACES: Record<(typeof QUALITY_OPTIONS)[number] | 'ok', string> = {
  poor: '😞',
  fair: '😕',
  ok: '😐',
  good: '🙂',
  excellent: '😄',
};

export const FeedbackScreen = () => {
  const navigation = useNavigation<FeedbackScreenProp>();
  const route = useRoute<FeedbackRouteProp>();
  const consultationId = route.params?.consultationId || 'demo-consultation-id';

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [audioQuality, setAudioQuality] = useState<'poor' | 'fair' | 'good' | 'excellent' | null>(null);
  const [videoQuality, setVideoQuality] = useState<'poor' | 'fair' | 'good' | 'excellent' | null>(null);
  const [recommend, setRecommend] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await consultationsApi.submitFeedback(consultationId, {
        rating,
        tags: selectedTags,
        comment: comment.trim(),
        audioQuality: audioQuality ?? 'good',
        videoQuality: videoQuality ?? 'good',
        recommend,
      });
      navigation.navigate('CarePlan', { consultationId });
    } catch {
      navigation.navigate('CarePlan', { consultationId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen contentStyle={s.container}>
      <ScreenBackground name="auth" scrolls />
      <AppHeader
        onBack={() => navigation.goBack()}
        logo={<LogoWide width={120} height={30} />}
        right={
          <Pressable
            style={s.helpBtn}
            hitSlop={10}
            onPress={() => navigation.navigate('HelpSupport')}
            accessibilityRole="button"
            accessibilityLabel="Help"
          >
            <Icon name="headset" size={20} color={colors.ink} />
            <Text style={s.helpText}>Help</Text>
          </Pressable>
        }
      />

      <View style={s.headerWrap}>
        <Text style={s.pageTitle} accessibilityRole="header">Thank you for</Text>
        <Text style={s.pageTitle}>consulting with us!</Text>

      </View>

      {/* Everything from the doctor down to the CTA lives in one card. */}
      <View style={s.sheet}>
        <View style={s.doctorRow}>
          <View>
            <Image source={DrRichardImg} style={s.doctorAvatar} resizeMode="cover" />
            <View style={s.onlineDot} />
          </View>

          <View style={s.doctorInfo}>
            <Text style={s.doctorName}>Dr. Richard Parker</Text>
            <Text style={s.specialty}>Orthopedic Surgeon</Text>

            <View style={s.detailRow}>
              <Icon name="calendar" size={14} color={colors.surfie} />
              <Text style={s.consultDetails} numberOfLines={1}>
                18 May 2026 · 10:30 AM
              </Text>
            </View>
            <View style={s.idBox}>
              <Text style={s.idBoxText} numberOfLines={1}>CC24-001048</Text>
            </View>
          </View>

          <Pressable
            style={s.summaryBtn}
            onPress={() => navigation.navigate('Prescription', { consultationId })}
            accessibilityRole="button"
            accessibilityLabel="View summary"
          >
            <Icon name="document" size={22} color={colors.surfie} />
            <Text style={s.summaryBtnText}>View Summary</Text>
          </Pressable>
        </View>

        <View style={s.sheetRule} />

        {/* 5-Star Rating Section */}
        <Text style={s.sectionTitle}>How was your overall experience?</Text>
        <View style={s.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => setRating(star)}
              style={s.starBtn}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${star} out of 5`}
            >
              <Icon
                name="star"
                size={38}
                color={star <= rating ? colors.surfie : colors.surface.selected}
                filled
              />
            </Pressable>
          ))}
        </View>
        <View style={s.starLabelsRow}>
          <Text style={s.starScaleText}>Very Dissatisfied</Text>
          <Text style={s.starScaleText}>Very Satisfied</Text>
        </View>

        <View style={s.sheetRule} />

        {/* What went well pills */}
        <Text style={s.sectionTitle}>What went well?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tagsRow}
          keyboardShouldPersistTaps="handled"
        >
          {FEEDBACK_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag.label);
            return (
              <Pressable
                key={tag.label}
                style={[s.tagChip, isSelected && s.tagChipOn]}
                onPress={() => toggleTag(tag.label)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={tag.label}
              >
                <Icon name={tag.icon} size={17} color={colors.surfie} />
                <Text style={[s.tagText, isSelected && s.tagTextOn]}>{tag.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={s.sheetRule} />

        {/* Comment text area */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            Share your feedback <Text style={s.optional}>(optional)</Text>
          </Text>
          <View style={s.textAreaContainer}>
            <TextInput
              style={s.textArea}
              value={comment}
              onChangeText={setComment}
              placeholder="Tell us about your experience..."
              placeholderTextColor={colors.inkFaint}
              multiline
              numberOfLines={4}
              maxLength={500}
              accessibilityLabel="Share your feedback"
            />
            <Text style={s.charCount}>{comment.length}/500</Text>
          </View>
        </View>

        <View style={s.sheetRule} />

        {/* Call Quality Section */}
        <Text style={s.sectionTitle}>How was the call quality?</Text>
        <View style={s.qualitySplit}>
          <View style={s.qualityCol}>
            <View style={s.qualityHead}>
              <Icon name="mic" size={16} color={colors.surfie} />
              <Text style={s.qualityLabel}>Audio Quality</Text>
            </View>
            <View style={s.faceRow}>
              {QUALITY_OPTIONS.map((q) => (
                <Pressable
                  key={q}
                  style={[s.face, audioQuality === q && s.faceOn]}
                  onPress={() => setAudioQuality(q)}
                  accessibilityRole="button"
                  accessibilityLabel={`Audio quality ${q}`}
                >
                  <Text style={[s.faceText, audioQuality === q && s.faceTextOn]}>
                    {QUALITY_FACES[q]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={s.qualityRule} />

          <View style={s.qualityCol}>
            <View style={s.qualityHead}>
              <Icon name="video" size={16} color={colors.surfie} />
              <Text style={s.qualityLabel}>Video Quality</Text>
            </View>
            <View style={s.faceRow}>
              {QUALITY_OPTIONS.map((q) => (
                <Pressable
                  key={q}
                  style={[s.face, videoQuality === q && s.faceOn]}
                  onPress={() => setVideoQuality(q)}
                  accessibilityRole="button"
                  accessibilityLabel={`Video quality ${q}`}
                >
                  <Text style={[s.faceText, videoQuality === q && s.faceTextOn]}>
                    {QUALITY_FACES[q]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={s.sheetRule} />

        {/* Recommend Toggle */}
        <View style={s.recommendRow}>
          <View style={s.flex}>
            <Text style={s.sectionTitle}>Would you recommend CoraCure?</Text>
            <Text style={s.recommendSub}>Your recommendation means a lot to us.</Text>
          </View>
          <View style={s.recommendToggleRow}>
            <Pressable
              style={[s.recommendBtn, !recommend && s.recommendBtnActive]}
              onPress={() => setRecommend(false)}
              accessibilityRole="button"
              accessibilityLabel="No"
            >
              <Text style={[s.recommendBtnText, !recommend && s.recommendBtnTextActive]}>No</Text>
            </Pressable>
            <Pressable
              style={[s.recommendBtn, recommend && s.recommendBtnActive]}
              onPress={() => setRecommend(true)}
              accessibilityRole="button"
              accessibilityLabel="Yes"
            >
              <Text style={[s.recommendBtnText, recommend && s.recommendBtnTextActive]}>Yes</Text>
            </Pressable>
          </View>
        </View>

        {/* Submit CTA & Skip */}
        <View style={s.footer}>
          <GradientButton
            label="Submit Feedback"
            cornerRadius={radius.pill}
            loading={submitting}
            onPress={handleSubmit}
          />
          <Pressable
            style={s.skipBtn}
            onPress={() => navigation.navigate('CarePlan', { consultationId })}
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
          >
            <Text style={s.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  helpBtn: {
    width: 48,
    alignItems: 'center',
    gap: 1,
  },
  helpText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.ink,
  },
  headerWrap: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  pageTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '600',
    color: colors.ink,
    lineHeight: 32,
  },
  pageSubtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.lg,
    ...shadow.card,
  },
  sheetRule: {
    height: 1,
    backgroundColor: colors.surface.line,
    marginVertical: spacing.lg,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  doctorAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surface.mintSoft,
  },
  onlineDot: {
    position: 'absolute',
    right: 2,
    bottom: 4,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.surfie,
    borderWidth: 2,
    borderColor: colors.white,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  idBox: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surface.line,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginTop: 6,
  },
  idBoxText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.surfie,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  specialty: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '600',
    color: colors.surfie,
    marginTop: 1,
  },
  consultDetails: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  summaryBtn: {
    width: 84,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface.mintSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  summaryBtnText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  optional: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '400',
    color: colors.inkFaint,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  starBtn: {
    padding: 2,
  },
  starLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  starScaleText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  tagChipOn: {
    borderColor: colors.surfie,
    backgroundColor: colors.surface.mintSoft,
  },
  tagText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.ink,
  },
  tagTextOn: { color: colors.surfie, fontWeight: '700' },
  textAreaContainer: {
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.inkFaint,
    textAlign: 'right',
    marginTop: 4,
  },
  qualitySplit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  qualityCol: { flex: 1, gap: spacing.sm },
  qualityHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qualityLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.surfie,
    fontWeight: '600',
  },
  qualityRule: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.surface.line,
    marginHorizontal: spacing.md,
  },
  faceRow: {
    flexDirection: 'row',
    gap: 6,
  },
  face: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  faceOn: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  faceText: {
    fontSize: 17,
  },
  faceTextOn: {},
  recommendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  recommendSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  recommendToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  recommendBtn: {
    minWidth: 62,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  recommendBtnActive: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  recommendBtnText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  recommendBtnTextActive: {
    color: colors.white,
  },
  footer: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  skipText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.surfie,
  },
});

export default FeedbackScreen;

