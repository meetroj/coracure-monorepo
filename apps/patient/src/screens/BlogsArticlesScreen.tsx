import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, AppHeader, FilterChip, Icon } from '@coracure/ui';
import MentalHealthImg from '../assets/mental-health.jpg';
import type { RootStackParamList } from '../navigation/RootNavigator';

type BlogNavProp = NativeStackNavigationProp<RootStackParamList, 'BlogsArticles'>;

const FILTER_TABS = [
  'All Articles',
  'Treatment Literacy',
  'Medicine Facts',
  'Stigma',
  'Family Support',
  'Recovery',
];

interface ArticleItem {
  id: string;
  title: string;
  excerpt: string;
  readTime: string;
  author: string;
  category: string;
}

const ARTICLES: ArticleItem[] = [
  {
    id: '1',
    title: 'The Power of Sleep in Mental Wellness',
    excerpt: 'Good sleep is more than rest—it plays a vital role in mood, focus, and long-term healing.',
    readTime: '4 min read',
    author: 'Dr. Richard Parker',
    category: 'Recovery',
  },
  {
    id: '2',
    title: 'Journaling for Clarity and Calm',
    excerpt: 'Putting your thoughts on paper can reduce anxiety, improve self-awareness, and support emotional health.',
    readTime: '5 min read',
    author: 'CoraCure Clinical Team',
    category: 'Self-Care',
  },
  {
    id: '3',
    title: 'Mindfulness Techniques to Try Daily',
    excerpt: 'Simple grounded exercises to bring calm awareness to the present moment and ease stress.',
    readTime: '7 min read',
    author: 'Dr. Ananya Sharma',
    category: 'Mindfulness',
  },
];

const RELATED_TOPICS = [
  { id: '1', title: 'How to Support a Loved One in Recovery' },
  { id: '2', title: 'Nutrition and Healing: What is the Link?' },
  { id: '3', title: 'Understanding Pain Cycles & Relief' },
];

export const BlogsArticlesScreen = () => {
  const navigation = useNavigation<BlogNavProp>();

  const [activeTab, setActiveTab] = useState('All Articles');
  const [search, setSearch] = useState('');

  return (
    <Screen bottomInset contentStyle={s.container}>
      <AppHeader
        onBack={() => navigation.goBack()}
        right={<Icon name="search" size={20} color={colors.inkMuted} />}
      />

      <View style={s.headerWrap}>
        <Text style={s.pageTitle}>Blogs & Articles</Text>
        <Text style={s.pageSubtitle}>
          Expert insights and clinical knowledge for your recovery journey.
        </Text>
      </View>

      {/* Search Input */}
      <View style={s.searchBar}>
        <Icon name="search" size={18} color={colors.inkMuted} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search articles, topics or authors..."
          placeholderTextColor={colors.inkMuted}
        />
      </View>

      {/* Categories Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsScroll}>
        {FILTER_TABS.map((tab) => {
          const isSelected = activeTab === tab;
          return (
            <FilterChip
              key={tab}
              label={tab}
              active={isSelected}
              onPress={() => setActiveTab(tab)}
            />
          );
        })}
      </ScrollView>

      {/* Featured Article Card */}
      <Pressable
        style={s.featuredCard}
        onPress={() => Alert.alert('Understanding Mental Health', 'Opening full clinically reviewed article...')}
      >
        <View style={s.featuredHeaderRow}>
          <View style={s.featuredIconBox}>
            <Image
              source={MentalHealthImg}
              style={s.featuredImage}
              resizeMode="cover"
            />
          </View>
          <View style={s.featuredTextCol}>
            <Text style={s.featuredBadge}>FEATURED ARTICLE</Text>
            <Text style={s.featuredTitle}>Understanding Mental Health: More Than Just Stress</Text>
            <Text style={s.featuredMeta}>Dr. Ananya Sharma • 6 min read • Clinically reviewed</Text>
          </View>
        </View>
      </Pressable>

      {/* Articles Feed */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Latest Articles</Text>
        <View style={s.articlesList}>
          {ARTICLES.map((art) => (
            <Pressable
              key={art.id}
              style={s.articleCard}
              onPress={() => Alert.alert(art.title, `Opening article by ${art.author}...`)}
            >
              <View style={s.articleTextCol}>
                <Text style={s.articleCategory}>{art.category}</Text>
                <Text style={s.articleTitle}>{art.title}</Text>
                <Text style={s.articleExcerpt} numberOfLines={2}>{art.excerpt}</Text>
                <Text style={s.articleMeta}>{art.author} • {art.readTime}</Text>
              </View>
              <View style={s.articleThumb}>
                <Icon name="document" size={22} color={colors.surfie} />
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Related Topics Horizontal Carousel */}
      <View style={s.section}>
        <View style={s.relatedHeaderRow}>
          <Text style={s.sectionTitle}>Related Articles</Text>
          <Text style={s.viewAllLink}>View All &gt;</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.relatedScroll}>
          {RELATED_TOPICS.map((item) => (
            <Pressable key={item.id} style={s.relatedCard}>
              <View style={s.relatedIconBox}>
                <Icon name="clipboard" size={18} color={colors.surfie} />
              </View>
              <Text style={s.relatedTitle} numberOfLines={2}>{item.title}</Text>
            </Pressable>
          ))}
        </ScrollView>
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
  tabsScroll: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  featuredCard: {
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.selected,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadow.card,
  },
  featuredHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featuredIconBox: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: colors.white,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredTextCol: {
    flex: 1,
  },
  featuredBadge: {
    fontFamily: typography.body.family,
    fontSize: 9,
    fontWeight: '700',
    color: colors.surfie,
    marginBottom: 2,
  },
  featuredTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 18,
  },
  featuredMeta: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 3,
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
  articlesList: {
    gap: spacing.md,
  },
  articleCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    gap: spacing.md,
    ...shadow.card,
  },
  articleTextCol: {
    flex: 1,
  },
  articleCategory: {
    fontFamily: typography.body.family,
    fontSize: 9,
    fontWeight: '700',
    color: colors.surfie,
    marginBottom: 2,
  },
  articleTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 18,
  },
  articleExcerpt: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  articleMeta: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 4,
  },
  articleThumb: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  relatedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  viewAllLink: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.surfie,
  },
  relatedScroll: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  relatedCard: {
    width: 140,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  relatedIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedTitle: {
    fontFamily: typography.body.family,
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
    lineHeight: 15,
  },
});

export default BlogsArticlesScreen;

