import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, AppHeader, Avatar, StatusPill, Icon, type IconName } from '@coracure/ui';
import type { RootStackParamList } from '../navigation/RootNavigator';

type CareHubNavProp = NativeStackNavigationProp<RootStackParamList, 'CareHub'>;

interface HubCategory {
  id: string;
  title: string;
  desc: string;
  icon: IconName;
  screen?: keyof RootStackParamList;
  isEmergency?: boolean;
}

const CATEGORIES: HubCategory[] = [
  {
    id: 'self_help',
    title: 'Self-Help Tools',
    desc: 'Guided exercises, timers, and symptom tools anytime',
    icon: 'heart',
    screen: 'SelfHelpTool',
  },
  {
    id: 'education',
    title: 'Education Library',
    desc: 'Expert-approved guides and learning resources',
    icon: 'clipboard',
    screen: 'EducationLibrary',
  },
  {
    id: 'blogs',
    title: 'Blogs & Articles',
    desc: 'Stories, tips, and updates to keep you informed',
    icon: 'document',
    screen: 'BlogsArticles',
  },
  {
    id: 'caregiver',
    title: 'Caregiver & Family',
    desc: 'Support tools for your family and care network',
    icon: 'user',
  },
  {
    id: 'ngo',
    title: 'NGO & Support Directory',
    desc: 'Find local groups and patient support network',
    icon: 'globe',
  },
  {
    id: 'emergency',
    title: 'Emergency Guidance',
    desc: 'What to do and who to contact in an emergency',
    icon: 'emergency',
    isEmergency: true,
  },
];

export const CareHubScreen = () => {
  const navigation = useNavigation<CareHubNavProp>();

  const handleCategoryPress = (cat: HubCategory) => {
    if (cat.screen) {
      navigation.navigate(cat.screen as any);
    } else if (cat.isEmergency) {
      Alert.alert('Emergency Assistance', 'National Helpline: 108\nCoraCure Priority Emergency: 1800-CORACURE');
    } else {
      Alert.alert(cat.title, `Opening ${cat.title} directory...`);
    }
  };

  return (
    <Screen bottomInset contentStyle={s.container}>
      <AppHeader
        right={<Icon name="bell" size={20} color={colors.inkMuted} />}
      />

      <View style={s.headerWrap}>
        <Text style={s.pageTitle}>Care Hub ✨</Text>
        <Text style={s.pageSubtitle}>Recommended support and learning for your recovery.</Text>
      </View>

      {/* Recommended by Doctor Card */}
      <View style={s.recommendedCard}>
        <View style={s.recommendedHeader}>
          <Avatar initials="RP" size={36} />
          <Text style={s.recommendedDoctor}>Recommended by Dr. Richard Parker</Text>
        </View>

        <Pressable
          style={s.recItem}
          onPress={() => navigation.navigate('EducationLibrary')}
        >
          <View style={s.recIconBox}>
            <Icon name="clipboard" size={18} color={colors.surfie} />
          </View>
          <View style={s.recTextCol}>
            <Text style={s.recItemTitle}>Knee Rehab Basics</Text>
            <Text style={s.recItemSub}>A quick guide to your recovery journey • 10 min read</Text>
          </View>
          <Icon name="chevronRight" size={16} color={colors.inkFaint} />
        </Pressable>

        <View style={s.divider} />

        <Pressable
          style={s.recItem}
          onPress={() => navigation.navigate('SelfHelpTool')}
        >
          <View style={s.recIconBox}>
            <Icon name="video" size={18} color={colors.surfie} />
          </View>
          <View style={s.recTextCol}>
            <Text style={s.recItemTitle}>Daily Recovery Routine</Text>
            <Text style={s.recItemSub}>Simple steps for faster healing • Video • 8 min</Text>
          </View>
          <Icon name="chevronRight" size={16} color={colors.inkFaint} />
        </Pressable>
      </View>

      {/* 2x3 Grid Categories */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Explore Resources</Text>
        <View style={s.grid}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              style={[s.gridCard, cat.isEmergency && s.gridCardEmergency]}
              onPress={() => handleCategoryPress(cat)}
            >
              <View style={[s.gridIconWrap, cat.isEmergency && s.gridIconWrapEmergency]}>
                <Icon
                  name={cat.icon}
                  size={22}
                  color={cat.isEmergency ? colors.danger : colors.surfie}
                />
              </View>
              <Text style={[s.gridTitle, cat.isEmergency && s.gridTitleEmergency]}>
                {cat.title}
              </Text>
              <Text style={s.gridDesc} numberOfLines={2}>
                {cat.desc}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Recently Viewed */}
      <Pressable
        style={s.listLinkCard}
        onPress={() => navigation.navigate('EducationLibrary')}
      >
        <View style={s.listLinkIcon}>
          <Icon name="clock" size={18} color={colors.surfie} />
        </View>
        <View style={s.listLinkTextCol}>
          <Text style={s.listLinkHeading}>Recently viewed</Text>
          <Text style={s.listLinkSub} numberOfLines={1}>
            Knee Rehab Basics • Sleep Better Guide • Pain Management 101
          </Text>
        </View>
        <Icon name="chevronRight" size={16} color={colors.inkFaint} />
      </Pressable>

      {/* Saved for Later */}
      <Pressable
        style={s.listLinkCard}
        onPress={() => navigation.navigate('BlogsArticles')}
      >
        <View style={s.listLinkIcon}>
          <Icon name="heart" size={18} color={colors.surfie} />
        </View>
        <View style={s.listLinkTextCol}>
          <Text style={s.listLinkHeading}>Saved for later</Text>
          <Text style={s.listLinkSub} numberOfLines={1}>
            Nutrition for Healing • Breathing Exercises • Return to Work Guide
          </Text>
        </View>
        <Icon name="chevronRight" size={16} color={colors.inkFaint} />
      </Pressable>
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
  recommendedCard: {
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.selected,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  recommendedDoctor: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.surfie,
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  recIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recTextCol: {
    flex: 1,
  },
  recItemTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.ink,
  },
  recItemSub: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: spacing.xs,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridCard: {
    width: '47.5%',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    gap: 6,
    ...shadow.card,
  },
  gridCardEmergency: {
    backgroundColor: colors.dangerSoft,
    borderColor: '#F7D5D3',
  },
  gridIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  gridIconWrapEmergency: {
    backgroundColor: colors.white,
  },
  gridTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.ink,
  },
  gridTitleEmergency: {
    color: colors.danger,
  },
  gridDesc: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
    lineHeight: 14,
  },
  listLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  listLinkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listLinkTextCol: {
    flex: 1,
  },
  listLinkHeading: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.ink,
  },
  listLinkSub: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 2,
  },
});

export default CareHubScreen;

