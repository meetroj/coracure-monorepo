import { typeStyles } from '../../../../../libs/typography/src';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import { Screen, AppHeader, IconButton, Avatar, EmptyState } from '../../components/ui';
import { cases, TOTAL_CASES, type PatientCase, type CaseState } from '../../data/doctor';

type Filter = 'all' | 'followUp' | 'pending' | 'noShow' | 'complete';

const stateMeta: Record<CaseState, { label: string; fg: string; bg: string; dot: string }> = {
  complete:  { label: 'Complete',        fg: colors.surfie,  bg: '#E7F7F0', dot: colors.surfie },
  followUp:  { label: 'Follow-up Needed',fg: colors.warn,    bg: '#FDF4E5', dot: colors.warn },
  pending:   { label: 'Pending',         fg: colors.danger,  bg: '#FDECEA', dot: colors.danger },
  noShow:    { label: 'No-show',         fg: colors.inkMuted,bg: '#EFF3F1', dot: colors.inkFaint },
};

const docsColor = (done: number, total: number) =>
  done < total ? colors.warn : colors.surfie;

export const CasesScreen = ({
  onOpenCase,
}: {
  onOpenCase: (c: PatientCase) => void;
  onOpenDocuments?: () => void;
  onRequestReport?: () => void;
  onNewClarification?: () => void;
}) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    let out = cases;
    if (filter !== 'all') out = out.filter((c) => c.state === filter);
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((c) => c.name.toLowerCase().includes(q) || c.caseId.toLowerCase().includes(q));
    return out;
  }, [filter, query]);

  const filterChips: { key: Filter; label: string }[] = [
    { key: 'all',      label: 'All Cases' },
    { key: 'followUp', label: 'Status' },
    { key: 'pending',  label: 'Risk Level' },
  ];

  return (
    <Screen scroll={false}>
      {/* ── sticky white header ── */}
      <View style={s.headerCard}>
        <AppHeader right={<IconButton name="bell" badge label="Notifications" />} />

        <View style={s.pageTitleWrap}>
          <Text style={s.pageTitle}>Cases</Text>
          <Text style={s.pageSubtitle}>Browse and manage all your consultations</Text>
        </View>

        {/* search bar */}
        <View style={s.searchWrap}>
          <Icon name="search" size={17} color={colors.inkFaint} />
          <TextInput
            testID="case-search"
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by patient name, Case ID or date..."
            placeholderTextColor={colors.inkFaint}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="close" size={16} color={colors.inkFaint} />
            </Pressable>
          )}
        </View>

        {/* filter chips — three, sharing the row evenly */}
        <View style={s.chipRow}>
          {filterChips.map(({ key, label }) => {
            const active = filter === key;
            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                style={[s.chip, active && s.chipActive]}
              >
                {key === 'all' && (
                  <View style={[s.chipIconWrap, active && s.chipIconWrapActive]}>
                    <Icon name="calendar" size={12} color={active ? colors.white : colors.surfie} />
                  </View>
                )}
                <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* count + sort */}
      <View style={s.countRow}>
        <Text style={s.countText}>{TOTAL_CASES} Cases</Text>
        <Pressable style={s.sortBtn} hitSlop={8}>
          <Text style={s.sortText}>Sort by: Newest</Text>
          <Icon name="chevronDown" size={14} color={colors.ink} />
        </Pressable>
      </View>

      {/* list */}
      {list.length === 0 ? (
        <EmptyState
          icon="folder"
          title="No cases found"
          body={query ? `Nothing matches "${query}".` : 'No cases match this filter.'}
          actionLabel="Reset"
          onAction={() => { setQuery(''); setFilter('all'); }}
        />
      ) : (
        <ScrollView style={s.listScroll} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          {list.map((c, i) => {
            const meta = stateMeta[c.state];
            return (
              <Pressable
                key={c.id}
                testID={`case-${c.id}`}
                onPress={() => onOpenCase(c)}
                style={[s.row, i < list.length - 1 && s.rowBorder]}
                accessibilityRole="button"
                accessibilityLabel={`${c.name}, case ${c.caseId}`}
              >
                {/* avatar */}
                <View style={s.avatarWrap}>
                  <Avatar initials={c.initials} size={46} online />
                </View>

                {/* body */}
                <View style={s.rowBody}>
                  <Text style={s.caseId}>{c.caseId}</Text>
                  <Text style={s.caseName}>{c.name}</Text>
                  <Text style={s.caseMeta}>{c.dateLabel}</Text>
                  <View style={s.concernRow}>
                    <Icon name="heart" size={12} color={colors.inkFaint} />
                    <Text style={s.concernText} numberOfLines={1}>{c.concern}</Text>
                  </View>
                </View>

                {/* right: status + docs + menu */}
                <View style={s.rowRight}>
                  <View style={s.statusRow}>
                    <View style={[s.statusPill, { backgroundColor: meta.bg }]}>
                      <View style={[s.statusDot, { backgroundColor: meta.dot }]} />
                      <Text style={[s.statusText, { color: meta.fg }]}>{meta.label}</Text>
                    </View>
                    <Pressable hitSlop={8} style={s.moreBtn}>
                      <View style={s.moreDot} />
                      <View style={s.moreDot} />
                      <View style={s.moreDot} />
                    </Pressable>
                  </View>
                  <View style={s.rowRightBottom}>
                    <Text style={[s.docsText, { color: docsColor(c.docsDone, c.docsTotal) }]}>
                      Docs: {c.docsDone}/{c.docsTotal}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  /* sticky header */
  headerCard: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  pageTitleWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  pageTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl, fontWeight: '700', color: colors.ink,
  },
  pageSubtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm, color: colors.inkMuted, marginTop: 2,
  },

  /* search */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    paddingHorizontal: spacing.md, height: 48,
    borderRadius: radius.input, borderWidth: 1,
    borderColor: colors.surface.inputBorder, backgroundColor: colors.white,
  },
  searchInput: {
    flex: 1, fontFamily: typography.body.family,
    fontSize: typography.size.sm, color: colors.ink, padding: 0,
  },
  /* filter chips */
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  chip: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.pill, borderWidth: 1.5,
    borderColor: colors.surface.line, backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  chipIconWrap: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.surface.selected,
    alignItems: 'center', justifyContent: 'center',
  },
  chipIconWrapActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.inkMuted, fontWeight: '600',
  },
  chipTextActive: { color: colors.white },

  /* count + sort */
  countRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  countText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm, fontWeight: '700', color: colors.ink,
  },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.ink, fontWeight: '600',
  },

  /* list */
  listScroll: { flex: 1 },
  listContent: { paddingBottom: spacing.xxxl },
  row: {
    flexDirection: 'row', alignItems: 'stretch',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, gap: spacing.sm,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },

  avatarWrap: { paddingTop: 2 },

  rowBody: { flex: 1, minWidth: 0 },
  caseId: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs, color: colors.inkFaint, marginBottom: 1,
  },
  caseName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md, fontWeight: '700', color: colors.ink,
  },
  caseMeta: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.inkMuted, marginTop: 1,
  },
  concernRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  concernText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.inkMuted, flex: 1,
  },

  rowRight: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs, fontWeight: '600',
  },
  moreBtn: { padding: 2, gap: 3, alignItems: 'center', justifyContent: 'center' },
  moreDot: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: colors.inkFaint },
  rowRightBottom: { alignItems: 'flex-end' },
  docsText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, fontWeight: '600',
  },
});

export default CasesScreen;
