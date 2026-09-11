import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, AppHeader, FilterChip, ProgressBar, Icon } from '@coracure/ui';
import SleepScienceImg from '../assets/sleep-science.jpg';
import type { RootStackParamList } from '../navigation/RootNavigator';

type EduNavProp = NativeStackNavigationProp<RootStackParamList, 'EducationLibrary'>;

const TOPIC_CHIPS = [
  'All Guides',
  'Sleep',
  'Anxiety',
  'Depression',
  'Diet & Nutrition',
  'Recovery Exercises',
  'Women\'s Health',
  'Elderly Care',
];

interface GuideItem {
  id: string;
  title: string;
  desc: string;
  readTime: string;
  clinicallyReviewed: boolean;
  progress?: number;
}

const GUIDES: GuideItem[] = [
  {
    id: '1',
    title: 'Understanding Sleep Problems',
    desc: 'Learn about common sleep difficulties and what might be affecting your rest.',
    readTime: '12 min read',
    clinicallyReviewed: true,
    progress: 40,
  },
  {
    id: '2',
    title: 'Sleep Hygiene Basics',
    desc: 'Simple daily habits to improve sleep quality and build a healthier routine.',
    readTime: '8 min read',
    clinicallyReviewed: true,
    progress: 100,
  },
  {
    id: '3',
    title: 'When to Seek Help',
    desc: 'Know the signs when it is time to consult your doctor or specialist.',
    readTime: '5 min read',
    clinicallyReviewed: true,
  },
];

export const EducationLibraryScreen = () => {
  const navigation = useNavigation<EduNavProp>();

  const [selectedTopic, setSelectedTopic] = useState('Sleep');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Screen bottomInset contentStyle={s.container}>
      <AppHeader
        onBack={() => navigation.goBack()}
        right={<Icon name="search" size={20} color={colors.inkMuted} />}
      />

      <View style={s.headerWrap}>
        <Text style={s.pageTitle}>Education Library</Text>
        <Text style={s.pageSubtitle}>
          Trusted knowledge to support your overall well-being.
        </Text>
      </View>

      {/* Search Input Bar */}
      <View style={s.searchBar}>
        <Icon name="search" size={18} color={colors.inkMuted} />
        <TextInput
          style={s.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search topics, keywords or conditions..."
          placeholderTextColor={colors.inkMuted}
        />
      </View>

      {/* Topic Chips Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsScroll}>
        {TOPIC_CHIPS.map((chip) => {
          const isSelected = selectedTopic === chip;
          return (
            <FilterChip
              key={chip}
              label={chip}
              active={isSelected}
              onPress={() => setSelectedTopic(chip)}
            />
          );
        })}
      </ScrollView>

      {/* Featured Guide Banner Card */}
      <View style={s.featuredCard}>
        <View style={s.featuredContent}>
          <Text style={s.featuredTag}>FEATURED GUIDE</Text>
          <Text style={s.featuredTitle}>The Science of Sleep</Text>
          <Text style={s.featuredDesc}>
            Explore how sleep works, why it matters, and what happens when you don't get enough.
          </Text>
        </View>
        <View style={s.featuredGraphic}>
          <Image
            source={SleepScienceImg}
            style={s.featuredGraphicImage}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Structured Guides List */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Curated Guides</Text>
        <View style={s.guidesList}>
          {GUIDES.map((guide) => (
            <Pressable
              key={guide.id}
              style={s.guideCard}
              onPress={() => Alert.alert(guide.title, 'Opening interactive clinical guide...')}
            >
              <View style={s.guideHeaderRow}>
                <View style={s.guideIconBox}>
                  <Icon name="clipboard" size={20} color={colors.surfie} />
                </View>
                <View style={s.guideTitleWrap}>
                  <Text style={s.guideTitle}>{guide.title}</Text>
                  <Text style={s.guideDesc}>{guide.desc}</Text>
                </View>
                <Icon name="chevronRight" size={16} color={colors.inkFaint} />
              </View>

              <View style={s.guideMetaRow}>
                <Text style={s.readTime}>{guide.readTime}</Text>
                {guide.clinicallyReviewed && (
                  <Text style={s.reviewedTag}>✓ Clinically reviewed</Text>
                )}
                {guide.progress !== undefined && (
                  <Text style={s.progressText}>{guide.progress}% complete</Text>
                )}
              </View>

              {guide.progress !== undefined && (
                <View style={s.progressBarWrap}>
                  <ProgressBar percent={guide.progress} />
                </View>
              )}
            </Pressable>
          ))}
        </View>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.ink,
  },
  chipsScroll: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  featuredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F2B22',
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  featuredContent: {
    flex: 1,
  },
  featuredTag: {
    fontFamily: typography.body.family,
    fontSize: 9,
    fontWeight: '700',
    color: colors.paris,
    marginBottom: 2,
  },
  featuredTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.white,
  },
  featuredDesc: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    lineHeight: 16,
  },
  featuredGraphic: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  featuredGraphicImage: {
    width: '100%',
    height: '100%',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  guidesList: {
    gap: spacing.md,
  },
  guideCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    ...shadow.card,
  },
  guideHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  guideIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideTitleWrap: {
    flex: 1,
  },
  guideTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  guideDesc: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  guideMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.xs,
  },
  readTime: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
  },
  reviewedTag: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.surfie,
    fontWeight: '600',
  },
  progressText: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.ink,
    fontWeight: '700',
  },
  progressBarWrap: {
    marginTop: spacing.xs,
  },
});

export default EducationLibraryScreen;

