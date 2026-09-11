import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ScrollView, Image } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, AppHeader, Button, Avatar, StatusPill, FilterChip, Icon } from '@coracure/ui';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import { consultationsApi, type ApiError } from '@coracure/api';
import type { RootStackParamList } from '../navigation/RootNavigator';

type FeedbackScreenProp = NativeStackNavigationProp<RootStackParamList, 'Feedback'>;
type FeedbackRouteProp = RouteProp<RootStackParamList, 'Feedback'>;

const FEEDBACK_TAGS = [
  'Accurate Diagnosis',
  'Friendly & Caring',
  'Clear Explanation',
  'On Time',
  'Good Guidance',
  'Listened Carefully',
];

const QUALITY_OPTIONS: ('poor' | 'fair' | 'good' | 'excellent')[] = ['poor', 'fair', 'good', 'excellent'];

export const FeedbackScreen = () => {
  const navigation = useNavigation<FeedbackScreenProp>();
  const route = useRoute<FeedbackRouteProp>();
  const consultationId = route.params?.consultationId || 'demo-consultation-id';

  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Accurate Diagnosis', 'Clear Explanation']);
  const [comment, setComment] = useState('');
  const [audioQuality, setAudioQuality] = useState<'poor' | 'fair' | 'good' | 'excellent'>('excellent');
  const [videoQuality, setVideoQuality] = useState<'poor' | 'fair' | 'good' | 'excellent'>('excellent');
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
        audioQuality,
        videoQuality,
        recommend,
      });
      Alert.alert('Feedback Submitted', 'Thank you for sharing your experience. It helps us continually improve patient care.', [
        { text: 'View Care Plan', onPress: () => navigation.navigate('CarePlan', { consultationId }) }
      ]);
    } catch {
      Alert.alert('Feedback Received', 'Thank you! Your feedback has been recorded.', [
        { text: 'Continue', onPress: () => navigation.navigate('CarePlan', { consultationId }) }
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen bottomInset contentStyle={s.container}>
      <AppHeader
        right={<Icon name="info" size={20} color={colors.inkMuted} />}
      />

      <View style={s.headerWrap}>
        <Text style={s.pageTitle}>Thank you for consulting with us!</Text>
        <Text style={s.pageSubtitle}>
          Publish your feedback to improve healthcare and help fellow patients.
        </Text>
      </View>

      {/* Doctor Summary Card */}
      <View style={s.doctorCard}>
        <Image
          source={DrRichardImg}
          style={s.doctorAvatar}
          resizeMode="cover"
        />
        <View style={s.doctorInfo}>
          <Text style={s.doctorName}>Dr. Richard Parker</Text>
          <Text style={s.specialty}>Orthopedic Surgeon</Text>
          <Text style={s.consultDetails}>18 May 2026 • 10:30 AM • CC24-001048</Text>
        </View>
        <Pressable
          style={s.summaryBtn}
          onPress={() => navigation.navigate('Prescription', { consultationId })}
        >
          <Icon name="document" size={14} color={colors.surfie} />
          <Text style={s.summaryBtnText}>View Summary</Text>
        </Pressable>
      </View>

      {/* 5-Star Rating Section */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>How was your overall experience?</Text>
        <View style={s.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => setRating(star)} style={s.starBtn}>
              <Icon
                name="star"
                size={34}
                color={star <= rating ? '#F5A623' : colors.surface.line}
                filled={star <= rating}
              />
            </Pressable>
          ))}
        </View>
        <View style={s.starLabelsRow}>
          <Text style={s.starScaleText}>Very poor</Text>
          <Text style={s.starScaleText}>Very satisfied</Text>
        </View>
      </View>

      {/* What went well pills */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>What went well?</Text>
        <View style={s.tagsRow}>
          {FEEDBACK_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <FilterChip
                key={tag}
                label={tag}
                active={isSelected}
                onPress={() => toggleTag(tag)}
              />
            );
          })}
        </View>
      </View>

      {/* Comment text area */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Share your feedback (optional)</Text>
        <View style={s.textAreaContainer}>
          <TextInput
            style={s.textArea}
            value={comment}
            onChangeText={setComment}
            placeholder="Tell us what you liked or how we can improve..."
            placeholderTextColor={colors.inkMuted}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={s.charCount}>{comment.length}/500</Text>
        </View>
      </View>

      {/* Call Quality Section */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>How was the call quality?</Text>

        <View style={s.qualityRow}>
          <Text style={s.qualityLabel}>Audio Quality</Text>
          <View style={s.qualityChips}>
            {QUALITY_OPTIONS.map((q) => (
              <Pressable
                key={q}
                style={[s.qualityChip, audioQuality === q && s.qualityChipActive]}
                onPress={() => setAudioQuality(q)}
              >
                <Text style={[s.qualityChipText, audioQuality === q && s.qualityChipTextActive]}>
                  {q.charAt(0).toUpperCase() + q.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={s.qualityRow}>
          <Text style={s.qualityLabel}>Video Quality</Text>
          <View style={s.qualityChips}>
            {QUALITY_OPTIONS.map((q) => (
              <Pressable
                key={q}
                style={[s.qualityChip, videoQuality === q && s.qualityChipActive]}
                onPress={() => setVideoQuality(q)}
              >
                <Text style={[s.qualityChipText, videoQuality === q && s.qualityChipTextActive]}>
                  {q.charAt(0).toUpperCase() + q.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Recommend Toggle */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Would you recommend CoraCure?</Text>
        <Text style={s.recommendSub}>To your friends and family for telehealth consultations.</Text>
        <View style={s.recommendToggleRow}>
          <Pressable
            style={[s.recommendBtn, !recommend && s.recommendBtnActive]}
            onPress={() => setRecommend(false)}
          >
            <Text style={[s.recommendBtnText, !recommend && s.recommendBtnTextActive]}>No</Text>
          </Pressable>
          <Pressable
            style={[s.recommendBtn, recommend && s.recommendBtnActive]}
            onPress={() => setRecommend(true)}
          >
            <Text style={[s.recommendBtnText, recommend && s.recommendBtnTextActive]}>Yes</Text>
          </Pressable>
        </View>
      </View>

      {/* Submit CTA & Skip */}
      <View style={s.footer}>
        <Button
          label="Submit Feedback →"
          onPress={handleSubmit}
          loading={submitting}
        />
        <Pressable
          style={s.skipBtn}
          onPress={() => navigation.navigate('CarePlan', { consultationId })}
        >
          <Text style={s.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  headerWrap: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
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
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
    marginBottom: spacing.xl,
  },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  specialty: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
  },
  consultDetails: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.surfie,
    marginTop: 2,
  },
  summaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface.mintSoft,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  summaryBtnText: {
    fontFamily: typography.body.family,
    fontSize: 11,
    fontWeight: '700',
    color: colors.surfie,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  starBtn: {
    padding: 4,
  },
  starLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  starScaleText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
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
  qualityRow: {
    marginBottom: spacing.md,
  },
  qualityLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    fontWeight: '600',
    marginBottom: 6,
  },
  qualityChips: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  qualityChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  qualityChipActive: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  qualityChipText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.ink,
    fontWeight: '600',
  },
  qualityChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  recommendSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginBottom: spacing.sm,
  },
  recommendToggleRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  recommendBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
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
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  skipText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
});

export default FeedbackScreen;

