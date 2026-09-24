import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import DrNehaImg from '../assets/dr-neha-sharma.jpg';
import KneeJointImg from '../assets/knee-joint.jpg';
import MentalHealthImg from '../assets/mental-health.jpg';
import SleepScienceImg from '../assets/sleep-science.jpg';
import PatientTabBar from '../components/PatientTabBar';

const CATEGORIES = [
  'All',
  'Trending',
  'Specialist Advice',
  'Rehab Exercises',
  'Nutrition',
  'Mental Health',
];

interface ArticleItem {
  id: string;
  category: string;
  title: string;
  author: string;
  readTime: string;
  thumbnail: any;
}

const ARTICLES: ArticleItem[] = [
  {
    id: '1',
    category: 'REHABILITATION',
    title: '10 Exercises To Strengthen Your Quads at Home',
    author: 'Dr. Richard Parker',
    readTime: '4 min read',
    thumbnail: DrRichardImg,
  },
  {
    id: '2',
    category: 'MENTAL WELLNESS',
    title: 'How Mental Health Impacts Physical Healing',
    author: 'Dr. Neha Sharma',
    readTime: '6 min read',
    thumbnail: DrNehaImg,
  },
  {
    id: '3',
    category: 'CLINICAL SCIENCE',
    title: 'The Role of Collagen in Joint Repair',
    author: 'CoraCure Ortho Team',
    readTime: '5 min read',
    thumbnail: KneeJointImg,
  },
];

const TRENDING_TOPICS = [
  {
    id: 't1',
    title: 'Post-Op Physical Therapy',
    reads: '1.2k reads',
    thumbnail: SleepScienceImg,
  },
  {
    id: 't2',
    title: 'Joint Nutrition Guidelines',
    reads: '980 reads',
    thumbnail: MentalHealthImg,
  },
];

export const BlogsArticlesScreen = () => {
  const navigation = useNavigation<any>();

  const [selectedCat, setSelectedCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const handleArticlePress = (title: string, author: string) => {
    Alert.alert(title, `Opening clinically reviewed article by ${author}...`);
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
        {/* Title */}
        <View style={s.titleWrap}>
          <Text style={s.pageTitle}>Blogs & Articles 📖</Text>
          <Text style={s.pageSubtitle}>
            Evidence-based clinical insights & recovery guides
          </Text>
        </View>

        {/* Search Bar */}
        <View style={s.searchBar}>
          <TextInput
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search articles, symptoms, topics..."
            placeholderTextColor={colors.inkFaint}
          />
          <Pressable
            style={s.searchIconCircle}
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <Icon name="search" size={16} color={colors.white} />
          </Pressable>
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
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

        {/* Featured Hero Banner Card */}
        <Pressable
          style={s.featuredCard}
          onPress={() => handleArticlePress('Knee Recovery 101: What To Expect In Month 1', 'Dr. Richard Parker')}
          accessibilityRole="button"
          accessibilityLabel="Featured Post: Knee Recovery 101"
        >
          <View style={s.featuredRow}>
            <View style={s.featuredIconBox}>
              <Image
                source={MentalHealthImg}
                style={s.featuredIconImg}
                resizeMode="cover"
              />
            </View>
            <View style={s.featuredTextCol}>
              <View style={s.featuredBadgeWrap}>
                <Text style={s.featuredBadgeText}>FEATURED POST</Text>
              </View>
              <Text style={s.featuredTitle}>
                Knee Recovery 101: What To Expect In Month 1
              </Text>
              <Text style={s.featuredMeta}>
                By Dr. Richard Parker • 5 min read
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Latest Articles Feed */}
        <View style={s.feedHeaderRow}>
          <Text style={s.sectionHeading}>Latest Articles</Text>
          <Text style={s.seeAllLink}>See all</Text>
        </View>

        <View style={s.articlesList}>
          {ARTICLES.map((item) => (
            <Pressable
              key={item.id}
              style={s.articleCard}
              onPress={() => handleArticlePress(item.title, item.author)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <Image
                source={item.thumbnail}
                style={s.articleThumb}
                resizeMode="cover"
              />
              <View style={s.articleTextCol}>
                <Text style={s.articleCategory}>{item.category}</Text>
                <Text style={s.articleTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={s.articleMeta}>
                  {item.author} • {item.readTime}
                </Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkFaint} />
            </Pressable>
          ))}
        </View>

        {/* Trending Topics Horizontal Section */}
        <View style={s.trendingSection}>
          <Text style={s.sectionHeading}>Trending Topics</Text>
          <View style={s.trendingRow}>
            {TRENDING_TOPICS.map((topic) => (
              <Pressable
                key={topic.id}
                style={s.trendingCard}
                onPress={() => handleArticlePress(topic.title, 'Clinical Staff')}
                accessibilityRole="button"
                accessibilityLabel={topic.title}
              >
                <Image
                  source={topic.thumbnail}
                  style={s.trendingThumb}
                  resizeMode="cover"
                />
                <View style={s.trendingInfo}>
                  <Text style={s.trendingTitle} numberOfLines={2}>
                    {topic.title}
                  </Text>
                  <Text style={s.trendingReads}>{topic.reads}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* 5-Tab Bar */}
      <PatientTabBar activeTab="CareHub" />
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
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    paddingVertical: 4,
  },
  searchIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
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
    fontWeight: '600',
    color: colors.inkMuted,
  },
  catChipTextActive: {
    color: colors.white,
  },
  featuredCard: {
    backgroundColor: '#EEF8F5',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featuredIconBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  featuredIconImg: {
    width: '100%',
    height: '100%',
  },
  featuredTextCol: {
    flex: 1,
    gap: 3,
  },
  featuredBadgeWrap: {
    alignSelf: 'flex-start',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.surfie,
    letterSpacing: 0.4,
  },
  featuredTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 18,
  },
  featuredMeta: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  seeAllLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.surfie,
  },
  articlesList: {
    gap: 10,
  },
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  articleThumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
  },
  articleTextCol: {
    flex: 1,
    gap: 2,
  },
  articleCategory: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.surfie,
    letterSpacing: 0.3,
  },
  articleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 17,
  },
  articleMeta: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  trendingSection: {
    marginTop: 6,
    gap: 10,
  },
  trendingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  trendingCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  trendingThumb: {
    width: '100%',
    height: 72,
  },
  trendingInfo: {
    padding: 10,
    gap: 4,
  },
  trendingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 15,
  },
  trendingReads: {
    fontSize: 10,
    color: colors.inkFaint,
  },
});

export default BlogsArticlesScreen;
