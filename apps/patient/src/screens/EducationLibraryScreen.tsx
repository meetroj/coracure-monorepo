import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon, type IconName } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import SleepScienceImg from '../assets/sleep-science.jpg';
import PatientTabBar from '../components/PatientTabBar';

const CATEGORIES = [
  'All',
  'Rehabilitation',
  'Nutrition',
  'Sleep',
  'Mental Wellness',
  'Pain Management',
];

interface GuideItem {
  id: string;
  title: string;
  desc: string;
  readTime: string;
  icon: IconName;
  progress?: number;
}

const GUIDES: GuideItem[] = [
  {
    id: '1',
    title: 'Understanding Knee Cartilage & Healing',
    desc: 'How joint cartilage repairs under controlled physical exercise.',
    readTime: '12 min read',
    icon: 'shieldCheck',
    progress: 75,
  },
  {
    id: '2',
    title: 'Diet & Joint Inflammation Secrets',
    desc: 'Anti-inflammatory nutrition that speeds post-consultation recovery.',
    readTime: '8 min read',
    icon: 'heart',
    progress: 40,
  },
  {
    id: '3',
    title: 'Proper Walking Posture with Knee Strain',
    desc: 'Ergonomic alignment techniques to protect knee and hip joints.',
    readTime: '5 min read',
    icon: 'mapPin',
  },
];

export const EducationLibraryScreen = () => {
  const navigation = useNavigation<any>();

  const [selectedCat, setSelectedCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={s.container}>
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
        {/* Title */}
        <View style={s.titleWrap}>
          <Text style={s.pageTitle}>Education Library 📚</Text>
          <Text style={s.pageSubtitle}>
            Clinician-authored guides to power your physical recovery
          </Text>
        </View>

        {/* Search Bar */}
        <View style={s.searchBar}>
          <Icon name="search" size={18} color={colors.inkFaint} />
          <TextInput
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search guides, recovery topics, nutrition..."
            placeholderTextColor={colors.inkFaint}
          />
          <View style={s.filterIconCircle}>
            <Icon name="filter" size={14} color={colors.white} />
          </View>
        </View>

        {/* Category Chips Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
        keyboardShouldPersistTaps="handled"
      >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCat === cat;
            return (
              <Pressable
                key={cat}
                style={[s.catChip, isSelected && s.catChipActive]}
                onPress={() => setSelectedCat(cat)}
                accessibilityRole="button"
                accessibilityLabel={cat}
              >
                <Text style={[s.catChipText, isSelected && s.catChipTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Featured Hero Card: The Science of Sleep */}
        <View style={s.featuredCard}>
          <View style={s.featuredContent}>
            <View style={s.featuredTag}>
              <Text style={s.featuredTagText}>FEATURED GUIDE</Text>
            </View>
            <Text style={s.featuredTitle}>The Science of Sleep</Text>
            <Text style={s.featuredDesc}>
              Quality deep sleep accelerates cellular cartilage restoration.
            </Text>
            <View style={s.featuredMetaRow}>
              <Icon name="clock" size={13} color="#A7F3D0" />
              <Text style={s.featuredMetaText}>5 min read • Dr. Richard Parker</Text>
            </View>
          </View>
          <Image
            source={SleepScienceImg}
            style={s.featuredImg}
            resizeMode="cover"
          />
        </View>

        {/* Guides List */}
        <Text style={s.sectionHeading}>Recommended Reading</Text>
        <View style={s.guidesList}>
          {GUIDES.map((guide) => (
            <Pressable
              key={guide.id}
              style={s.guideCard}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel={guide.title}
            >
              <View style={s.guideIconCircle}>
                <Icon name={guide.icon || 'clipboard'} size={20} color={colors.surfie} />
              </View>
              <View style={s.guideTextCol}>
                <Text style={s.guideTitle}>{guide.title}</Text>
                <Text style={s.guideDesc}>{guide.desc}</Text>
                <View style={s.guideMetaRow}>
                  <Text style={s.guideTime}>{guide.readTime}</Text>
                  {guide.progress !== undefined && (
                    <View style={s.progressRow}>
                      <View style={s.progressBar}>
                        <View style={[s.progressFill, { width: `${guide.progress}%` }]} />
                      </View>
                      <Text style={s.progressText}>{guide.progress}%</Text>
                    </View>
                  )}
                </View>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkFaint} />
            </Pressable>
          ))}
        </View>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
  },
  filterIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  catChipActive: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  catChipText: {
    fontSize: 12,
    color: colors.ink,
    fontWeight: '500',
  },
  catChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  featuredCard: {
    flexDirection: 'row',
    backgroundColor: '#0E766C',
    borderRadius: radius.card,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  featuredContent: {
    flex: 1.2,
    padding: spacing.md,
    justifyContent: 'space-between',
    gap: 4,
  },
  featuredTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  featuredTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A7F3D0',
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    marginTop: 2,
  },
  featuredDesc: {
    fontSize: 11,
    color: '#E6F3EE',
    lineHeight: 15,
  },
  featuredMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  featuredMetaText: {
    fontSize: 11,
    color: '#A7F3D0',
    fontWeight: '600',
  },
  featuredImg: {
    flex: 0.8,
    height: 125,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 4,
  },
  guidesList: {
    gap: 10,
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  guideIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideTextCol: {
    flex: 1,
    gap: 2,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  guideDesc: {
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 15,
  },
  guideMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  guideTime: {
    fontSize: 11,
    color: colors.surfie,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.surfie,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: colors.inkFaint,
  },
});

export default EducationLibraryScreen;
