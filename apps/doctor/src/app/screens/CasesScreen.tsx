import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import {
  Screen,
  AppHeader,
  IconButton,
  PageTitle,
  FilterChip,
  StatusPill,
  Button,
  Avatar,
  EmptyState,
} from '../../components/ui';
import { cases, TOTAL_CASES, isClinicallyComplete, type PatientCase, type CaseState } from '../../data/doctor';

type Filter = 'all' | 'needsAction' | 'followUp' | 'completed';

const stateMeta: Record<CaseState, { label: string; tone: 'success' | 'warn' | 'danger' | 'neutral'; edge: string }> = {
  complete: { label: 'Complete', tone: 'success', edge: colors.paris },
  followUp: { label: 'Follow-up', tone: 'warn', edge: colors.warn },
  pending: { label: 'Pending', tone: 'danger', edge: colors.danger },
  noShow: { label: 'No-show', tone: 'neutral', edge: colors.surface.line },
};

export const CasesScreen = ({ onOpenCase }: { onOpenCase: (c: PatientCase) => void }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    let out = cases;
    if (filter === 'needsAction') out = out.filter((c) => !isClinicallyComplete(c) && c.state !== 'noShow');
    if (filter === 'followUp') out = out.filter((c) => c.state === 'followUp');
    if (filter === 'completed') out = out.filter((c) => isClinicallyComplete(c));
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((c) => c.name.toLowerCase().includes(q) || c.caseId.toLowerCase().includes(q));
    return out;
  }, [filter, query]);

  return (
    <Screen>
      <AppHeader right={<IconButton name="bell" badge label="Notifications" />} />
      <PageTitle title="Cases" subtitle="Manage consultation records" />

      {/* search */}
      <View style={s.searchWrap}>
        <Icon name="search" size={19} color={colors.inkFaint} />
        <TextInput
          testID="case-search"
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search patient or case ID"
          placeholderTextColor={colors.inkFaint}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Icon name="close" size={17} color={colors.inkFaint} />
          </Pressable>
        )}
      </View>

      {/* filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        <FilterChip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterChip label="Needs action" active={filter === 'needsAction'} onPress={() => setFilter('needsAction')} />
        <FilterChip label="Follow-up" active={filter === 'followUp'} onPress={() => setFilter('followUp')} />
        <FilterChip label="Completed" active={filter === 'completed'} onPress={() => setFilter('completed')} />
        <Pressable style={s.filterBtn} accessibilityLabel="More filters">
          <Icon name="filter" size={18} color={colors.surfie} />
        </Pressable>
      </ScrollView>

      {/* count + sort */}
      <View style={s.countRow}>
        <Text style={s.countText}>{TOTAL_CASES} patient cases</Text>
        <Pressable style={s.sortBtn} hitSlop={8}>
          <Text style={s.sortText}>Latest first</Text>
          <Icon name="chevronDown" size={15} color={colors.inkMuted} />
        </Pressable>
      </View>

      {list.length === 0 ? (
        <EmptyState
          icon="folder"
          title="No cases found"
          body={query ? `Nothing matches “${query}”.` : 'No cases match this filter.'}
          actionLabel="Reset"
          onAction={() => {
            setQuery('');
            setFilter('all');
          }}
        />
      ) : (
        list.map((c) => {
          const meta = stateMeta[c.state];
          const docsShort = c.docsDone < c.docsTotal;
          return (
            <View key={c.id} style={[s.caseCard, { borderLeftColor: meta.edge }]}>
              <View style={s.caseTop}>
                <Avatar initials={c.initials} size={44} />
                <View style={s.caseBody}>
                  <Text style={s.caseId}>{c.caseId}</Text>
                  <Text style={s.caseName}>{c.name}</Text>
                  <Text style={s.caseMeta}>
                    {c.dateLabel}  |  {c.gender} · {c.age} years
                  </Text>
                </View>
                <View style={s.caseRight}>
                  <StatusPill label={meta.label} tone={meta.tone} />
                  <Text style={[s.docs, docsShort && { color: colors.danger }]}>
                    Docs {c.docsDone}/{c.docsTotal}
                  </Text>
                </View>
              </View>

              <View style={s.concernRow}>
                <Icon name="stethoscope" size={15} color={colors.inkMuted} />
                <Text style={s.concernText} numberOfLines={1}>
                  {c.concern}
                </Text>
              </View>

              {/* clinical completeness is advice + summary, not just documents */}
              <View style={s.completeRow}>
                <View style={s.completeItem}>
                  <Icon
                    name={c.prescriptionFinalised ? 'checkCircle' : 'alertCircle'}
                    size={14}
                    color={c.prescriptionFinalised ? colors.surfie : colors.warn}
                  />
                  <Text style={s.completeText}>Advice</Text>
                </View>
                <View style={s.completeItem}>
                  <Icon
                    name={c.summarySubmitted ? 'checkCircle' : 'alertCircle'}
                    size={14}
                    color={c.summarySubmitted ? colors.surfie : colors.warn}
                  />
                  <Text style={s.completeText}>Summary</Text>
                </View>
                <View style={s.flex} />
                <Button label="Open" size="sm" variant="secondary" onPress={() => onOpenCase(c)} style={s.openBtn} />
              </View>
            </View>
          );
        })
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 50,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    backgroundColor: colors.white,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
    padding: 0,
  },
  chipRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  filterBtn: {
    width: 42,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  countText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.inkMuted },

  caseCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: colors.surface.line,
    padding: spacing.md,
  },
  caseTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  caseBody: { flex: 1 },
  caseId: { fontFamily: typography.body.family, fontSize: typography.size.xxs, color: colors.inkFaint },
  caseName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  caseMeta: { fontFamily: typography.body.family, fontSize: typography.size.xs, color: colors.inkMuted, marginTop: 1 },
  caseRight: { alignItems: 'flex-end', gap: 4 },
  docs: { fontFamily: typography.body.family, fontSize: typography.size.xs, color: colors.inkMuted, fontWeight: '600' },

  concernRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  concernText: { flex: 1, fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.inkMuted },

  completeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  completeItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  completeText: { fontFamily: typography.body.family, fontSize: typography.size.xxs, color: colors.inkMuted },
  openBtn: { minWidth: 90 },
});

export default CasesScreen;
