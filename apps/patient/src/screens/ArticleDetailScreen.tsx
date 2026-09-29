import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { colors, spacing, radius } from '@coracure/brand';
import { Screen, Icon } from '@coracure/ui';
import FlowHeader from '../components/FlowHeader';
import { ARTICLES, articleById } from '../data/articles';
import type { RootStackParamList } from '../navigation/RootNavigator';

type R = RouteProp<RootStackParamList, 'ArticleDetail'>;

/**
 * The reading view behind every card on Blogs & Articles. Cards used to open an
 * Alert; they open this.
 */
export const ArticleDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<R>();
  const article = articleById(route.params?.articleId);

  if (!article) {
    return (
      <Screen contentStyle={s.content}>
        <FlowHeader />
        <Text style={s.title} accessibilityRole="header">
          Article unavailable
        </Text>
        <Text style={s.summary}>This article is no longer published. Go back to browse the library.</Text>
      </Screen>
    );
  }

  const more = ARTICLES.filter((a) => a.id !== article.id).slice(0, 3);

  return (
    <Screen contentStyle={s.content}>
      <FlowHeader />

      <Image source={article.thumbnail} style={s.hero} resizeMode="cover" />

      <View style={s.badge}>
        <Text style={s.badgeText}>{article.category}</Text>
      </View>

      <Text style={s.title} accessibilityRole="header">
        {article.title}
      </Text>
      <Text style={s.meta}>
        By {article.author} • {article.readTime}
      </Text>
      <Text style={s.summary}>{article.summary}</Text>

      {article.body.map((section) => (
        <View key={section.heading} style={s.section}>
          <Text style={s.sectionHeading} accessibilityRole="header">
            {section.heading}
          </Text>
          <Text style={s.paragraph}>{section.text}</Text>
        </View>
      ))}

      <View style={s.note}>
        <Icon name="shield" size={16} color={colors.surfie} />
        <Text style={s.noteText}>
          Clinically reviewed general guidance. It is not advice about your own condition — ask your doctor in the app.
        </Text>
      </View>

      <Text style={s.moreHeading} accessibilityRole="header">
        More to read
      </Text>
      {more.map((a) => (
        <Pressable
          key={a.id}
          style={s.moreCard}
          onPress={() => navigation.push('ArticleDetail', { articleId: a.id })}
          accessibilityRole="button"
          accessibilityLabel={a.title}
        >
          <Image source={a.thumbnail} style={s.moreThumb} resizeMode="cover" />
          <View style={s.moreTextCol}>
            <Text style={s.moreCategory}>{a.category}</Text>
            <Text style={s.moreTitle} numberOfLines={2}>
              {a.title}
            </Text>
            <Text style={s.moreMeta}>{a.readTime}</Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.inkFaint} />
        </Pressable>
      ))}
    </Screen>
  );
};

const s = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },

  hero: { width: '100%', height: 180, borderRadius: radius.lg, marginTop: spacing.sm },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.mintSoft,
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: colors.surfie },

  title: { fontSize: 22, fontWeight: '800', lineHeight: 29, color: colors.ink },
  meta: { fontSize: 13, color: colors.inkMuted },
  summary: { fontSize: 15, lineHeight: 23, color: colors.inkMuted, marginTop: spacing.xs },

  section: { gap: 4, marginTop: spacing.md },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: colors.ink },
  paragraph: { fontSize: 15, lineHeight: 24, color: colors.ink },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface.mintSoft,
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.inkMuted },

  moreHeading: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: spacing.lg },
  moreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  moreThumb: { width: 56, height: 56, borderRadius: radius.md },
  moreTextCol: { flex: 1, minWidth: 0, gap: 2 },
  moreCategory: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: colors.surfie },
  moreTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  moreMeta: { fontSize: 12, color: colors.inkMuted },
});

export default ArticleDetailScreen;
