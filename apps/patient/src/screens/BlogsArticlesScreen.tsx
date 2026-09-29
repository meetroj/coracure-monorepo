import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import PatientTabBar from '../components/PatientTabBar';
import { ARTICLES, type Article } from '../data/articles';

const CATEGORIES = [
  'All',
  'Trending',
  'Specialist Advice',
  'Rehab Exercises',
  'Nutrition',
  'Mental Health',
];

const FEATURED = ARTICLES.find((a) => a.featured) as Article;
const FEED = ARTICLES.filter((a) => !a.featured && !a.trending);
const TRENDING_TOPICS = ARTICLES.filter((a) => a.trending);

export const BlogsArticlesScreen = () => {
  const navigation = useNavigation<any>();

  const [selectedCat, setSelectedCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const openArticle = (articleId: string) => {
    navigation.navigate('ArticleDetail', { articleId });
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
        {/* Title */}
        <View style={s.titleWrap}>
          <Text style={s.pageTitle}>Blogs & Articles</Text>
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
            underlineColorAndroid="transparent"
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

        {/* Featured Hero Banner Card */}
        <Pressable
          style={s.featuredCard}
          onPress={() => openArticle(FEATURED.id)}
          accessibilityRole="button"
          accessibilityLabel={`Featured Post: ${FEATURED.title}`}
        >
          <View style={s.featuredRow}>
            <View style={s.featuredIconBox}>
              <Image
                source={FEATURED.thumbnail}
                style={s.featuredIconImg}
                resizeMode="cover"
              />
            </View>
            <View style={s.featuredTextCol}>
              <View style={s.featuredBadgeWrap}>
                <Text style={s.featuredBadgeText}>FEATURED POST</Text>
              </View>
              <Text style={s.featuredTitle}>{FEATURED.title}</Text>
              <Text style={s.featuredMeta}>
                By {FEATURED.author} • {FEATURED.readTime}
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
          {FEED.map((item) => (
            <Pressable
              key={item.id}
              style={s.articleCard}
              onPress={() => openArticle(item.id)}
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
                onPress={() => openArticle(topic.id)}
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
