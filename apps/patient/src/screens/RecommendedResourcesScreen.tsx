import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '@coracure/brand';
import { Icon } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import {
  doctorRecommendation,
  recommendedResources,
  type CareResource,
  type ResourceKind,
} from '../data/careResources';

/**
 * The patient side of the doctor's Care Hub Recommendation
 * (`apps/doctor/.../CareHubScreen.tsx`): the tools and modules the doctor
 * actually picked for this patient, split the same way the doctor picked them,
 * plus the note they wrote. It is not the Care Hub services list — nothing
 * here is browsable, the doctor chose it.
 */

const TABS: { key: ResourceKind; label: string }[] = [
  { key: 'tool', label: 'Tools' },
  { key: 'education', label: 'Modules' },
];

/** Read-only: the doctor picked these, the patient does not open them from here. */
const ResourceCard = ({ resource }: { resource: CareResource }) => (
  <View style={s.card}>
    <View style={s.cardIcon}>
      <Icon name={resource.icon} size={18} color={colors.surfie} />
    </View>
    <View style={s.cardBody}>
      <Text style={s.cardTitle} numberOfLines={2}>{resource.title}</Text>
      <Text style={s.cardBlurb} numberOfLines={3}>{resource.blurb}</Text>
      <Text style={s.cardMeta}>{resource.meta}</Text>
    </View>
  </View>
);

export const RecommendedResourcesScreen = () => {
  const navigation = useNavigation<any>();

  const [tab, setTab] = useState<ResourceKind>('tool');
  const visible = recommendedResources.filter((r) => r.kind === tab);

  return (
    <View style={s.container}>
      <View style={s.headerBar}>
        <Pressable
          style={s.headerIconBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrowLeft" size={20} color={colors.ink} />
        </Pressable>

        <LogoWide width={120} height={30} />

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
        <View>
          <Text style={s.pageTitle} accessibilityRole="header">Resources & Recommendations</Text>
          <Text style={s.pageSubtitle}>
            Chosen for you by {doctorRecommendation.doctorName}
          </Text>
        </View>

        {recommendedResources.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>
              Your doctor has not recommended anything yet. Anything they pick during a
              consultation shows up here.
            </Text>
          </View>
        ) : (
          <>
            {doctorRecommendation.note ? (
              <View style={s.noteCard}>
                <Text style={s.noteTitle}>Note from {doctorRecommendation.doctorName}</Text>
                <Text style={s.noteText}>{doctorRecommendation.note}</Text>
              </View>
            ) : null}

            <View style={s.tabs}>
              {TABS.map((t) => {
                const on = tab === t.key;
                const count = recommendedResources.filter((r) => r.kind === t.key).length;
                return (
                  <Pressable
                    key={t.key}
                    style={[s.tab, on && s.tabOn]}
                    onPress={() => setTab(t.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[s.tabText, on && s.tabTextOn]}>
                      {t.label} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={s.section}>
              {visible.length === 0 ? (
                <Text style={s.emptyText}>
                  Nothing recommended in this section yet.
                </Text>
              ) : (
                visible.map((r) => <ResourceCard key={r.id} resource={r} />)
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FBF9' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  pageTitle: {
    fontFamily: typography.heading.family,
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontFamily: typography.body.family,
    fontSize: 13,
    color: colors.inkMuted,
  },

  noteCard: {
    backgroundColor: '#EEF8F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4EFE5',
    padding: spacing.md,
    gap: 4,
  },
  noteTitle: {
    fontFamily: typography.body.family,
    fontSize: 12,
    fontWeight: '700',
    color: colors.surfie,
  },
  noteText: {
    fontFamily: typography.body.family,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabOn: { borderBottomColor: colors.surfie },
  tabText: {
    fontFamily: typography.body.family,
    fontSize: 13,
    color: colors.inkFaint,
  },
  tabTextOn: { color: colors.surfie, fontWeight: '700' },

  section: { gap: spacing.sm },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: {
    fontFamily: typography.body.family,
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  cardBlurb: {
    fontFamily: typography.body.family,
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkMuted,
  },
  cardMeta: {
    fontFamily: typography.body.family,
    fontSize: 11,
    fontWeight: '600',
    color: colors.surfie,
    marginTop: 2,
  },

  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.lg,
  },
  emptyText: {
    fontFamily: typography.body.family,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
    textAlign: 'center',
  },
});

export default RecommendedResourcesScreen;
