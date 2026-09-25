import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, Avatar, EmptyState } from '../../components/ui';
import { BottomSheet } from '../../components/BottomSheet';
import { TabHeader } from '../navigation/TabHeader';
import { useStore } from '../../state/store';
import { selectCases } from '../../state/selectors';
import { RISK_LABEL, type RiskCategory } from '../../data/clinical';
import type { CaseState, PatientCase } from '../../data/doctor';

type StatusFilter = 'all' | CaseState;
type RiskFilter = 'all' | RiskCategory | 'none';
type Sort = 'newest' | 'oldest' | 'name';

const STATE_META: Record<CaseState, { label: string; fg: string; bg: string }> = {
  complete: { label: 'Complete', fg: colors.surfie, bg: '#E7F7F0' },
  followUp: { label: 'Follow-up Needed', fg: colors.warn, bg: '#FDF4E5' },
  pending: { label: 'Pending', fg: colors.danger, bg: '#FDECEA' },
  noShow: { label: 'No-show', fg: colors.inkMuted, bg: '#EFF3F1' },
};

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All statuses' },
  { key: 'pending', label: 'Pending' },
  { key: 'followUp', label: 'Follow-up needed' },
  { key: 'complete', label: 'Complete' },
  { key: 'noShow', label: 'No-show' },
];

const RISK_OPTIONS: { key: RiskFilter; label: string }[] = [
  { key: 'all', label: 'All risk levels' },
  { key: 'high', label: 'High' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'low', label: 'Low' },
  { key: 'none', label: 'Not assessed' },
];

const SORT_OPTIONS: { key: Sort; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'name', label: 'Patient name A–Z' },
];

const docsColor = (done: number, total: number) => (done < total ? colors.warn : colors.surfie);

/** One sheet for the three pickers: tapping an option applies it. */
const PickerSheet = <T extends string>({
  visible,
  title,
  options,
  value,
  onPick,
  onClose,
  testID,
}: {
  visible: boolean;
  title: string;
  options: { key: T; label: string }[];
  value: T;
  onPick: (v: T) => void;
  onClose: () => void;
  testID: string;
}) => (
  <BottomSheet visible={visible} title={title} onClose={onClose} testID={testID}>
    <View style={s.pickList}>
      {options.map((o, i) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            testID={`${testID}-${o.key}`}
            onPress={() => {
              onPick(o.key);
              onClose();
            }}
            style={[s.pickRow, i < options.length - 1 && s.pickRule, on && s.pickRowOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <Text style={[s.pickText, on && s.pickTextOn]}>{o.label}</Text>
            {on && <Icon name="check" size={18} weight={3} color={colors.paris} />}
          </Pressable>
        );
      })}
    </View>
  </BottomSheet>
);

/**
 * Cases — every held consultation, as a record the doctor can reopen.
 *
 * The count, filters and search all run over the same derived list, so the
 * number at the top is always the number of rows underneath it.
 */
export const CasesScreen = ({ onOpenCase }: { onOpenCase: (appointmentId: string) => void }) => {
  const cases = useStore(selectCases);
  const risks = useStore((st) => st.records);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [risk, setRisk] = useState<RiskFilter>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [query, setQuery] = useState('');
  const [picker, setPicker] = useState<'status' | 'risk' | 'sort' | null>(null);

  const riskOf = (c: PatientCase): RiskCategory | null => risks[c.appointmentId]?.risk.category ?? null;

  const list = useMemo(() => {
    let out = cases;
    if (status !== 'all') out = out.filter((c) => c.state === status);
    if (risk !== 'all') out = out.filter((c) => (risk === 'none' ? !riskOf(c) : riskOf(c) === risk));
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.caseId.toLowerCase().includes(q) || c.dateLabel.toLowerCase().includes(q)
      );
    }
    const sorted = [...out];
    if (sort === 'oldest') sorted.reverse();
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [cases, status, risk, query, sort, risks]);

  const statusLabel = STATUS_OPTIONS.find((o) => o.key === status)!.label;
  const riskLabel = RISK_OPTIONS.find((o) => o.key === risk)!.label;
  const filtered = status !== 'all' || risk !== 'all' || query.trim().length > 0;

  return (
    <Screen scroll={false} testID="cases" topColor={colors.white}>
      <View style={s.headerCard}>
        <TabHeader />
        <View style={s.pageTitleWrap}>
          <Text style={s.pageTitle} accessibilityRole="header">
            Cases
          </Text>
          <Text style={s.pageSubtitle}>Browse and manage your consultation records</Text>
        </View>

        <View style={s.searchWrap}>
          <Icon name="search" size={17} color={colors.inkFaint} />
          <TextInput
            testID="case-search"
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, case ID or date"
            placeholderTextColor={colors.inkFaint}
            returnKeyType="search"
            accessibilityLabel="Search cases"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
              <Icon name="close" size={16} color={colors.inkFaint} />
            </Pressable>
          )}
        </View>

        <View style={s.chipRow}>
          <Pressable
            testID="filter-status"
            onPress={() => setPicker('status')}
            style={[s.chip, status !== 'all' && s.chipActive]}
            accessibilityRole="button"
            accessibilityLabel={`Status filter: ${statusLabel}`}
          >
            <Text style={[s.chipText, status !== 'all' && s.chipTextActive]} numberOfLines={1}>
              {status === 'all' ? 'Status' : statusLabel}
            </Text>
            <Icon name="chevronDown" size={13} color={status !== 'all' ? colors.white : colors.inkMuted} />
          </Pressable>
          <Pressable
            testID="filter-risk"
            onPress={() => setPicker('risk')}
            style={[s.chip, risk !== 'all' && s.chipActive]}
            accessibilityRole="button"
            accessibilityLabel={`Risk filter: ${riskLabel}`}
          >
            <Text style={[s.chipText, risk !== 'all' && s.chipTextActive]} numberOfLines={1}>
              {risk === 'all' ? 'Risk level' : `Risk: ${riskLabel}`}
            </Text>
            <Icon name="chevronDown" size={13} color={risk !== 'all' ? colors.white : colors.inkMuted} />
          </Pressable>
        </View>
      </View>

      <View style={s.countRow}>
        <Text testID="case-count" style={s.countText}>
          {list.length} {list.length === 1 ? 'case' : 'cases'}
          {filtered ? ` of ${cases.length}` : ''}
        </Text>
        <Pressable
          testID="sort-cases"
          style={s.sortBtn}
          hitSlop={8}
          onPress={() => setPicker('sort')}
          accessibilityRole="button"
          accessibilityLabel={`Sort: ${SORT_OPTIONS.find((o) => o.key === sort)!.label}`}
        >
          <Icon name="sort" size={14} color={colors.ink} />
          <Text style={s.sortText}>{SORT_OPTIONS.find((o) => o.key === sort)!.label}</Text>
        </Pressable>
      </View>

      {list.length === 0 ? (
        <EmptyState
          icon="folder"
          title="No cases found"
          body={query ? `Nothing matches "${query}".` : 'No cases match these filters.'}
          actionLabel="Reset filters"
          onAction={() => {
            setQuery('');
            setStatus('all');
            setRisk('all');
          }}
        />
      ) : (
        <ScrollView style={s.listScroll} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          {list.map((c, i) => {
            const meta = STATE_META[c.state];
            const r = riskOf(c);
            return (
              <Pressable
                key={c.id}
                testID={`case-${c.appointmentId}`}
                onPress={() => onOpenCase(c.appointmentId)}
                style={({ pressed }) => [s.row, i < list.length - 1 && s.rowBorder, pressed && s.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`${c.name}, case ${c.caseId}, ${meta.label}`}
              >
                <Avatar initials={c.initials} size={46} />
                <View style={s.rowBody}>
                  <Text style={s.caseId}>{c.caseId}</Text>
                  <Text style={s.caseName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={s.caseMeta}>{c.dateLabel}</Text>
                  <Text style={s.concernText} numberOfLines={1}>
                    {c.concern}
                  </Text>
                </View>
                <View style={s.rowRight}>
                  <View style={[s.statusPill, { backgroundColor: meta.bg }]}>
                    <View style={[s.statusDot, { backgroundColor: meta.fg }]} />
                    <Text style={[s.statusText, { color: meta.fg }]}>{meta.label}</Text>
                  </View>
                  {!!r && <Text style={[s.riskText, r === 'high' && s.riskHigh]}>{RISK_LABEL[r]} risk</Text>}
                  <Text style={[s.docsText, { color: docsColor(c.docsDone, c.docsTotal) }]}>
                    Docs {c.docsDone}/{c.docsTotal}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <PickerSheet<StatusFilter>
        visible={picker === 'status'}
        title="Filter by status"
        options={STATUS_OPTIONS}
        value={status}
        onPick={setStatus}
        onClose={() => setPicker(null)}
        testID="status-option"
      />
      <PickerSheet<RiskFilter>
        visible={picker === 'risk'}
        title="Filter by risk level"
        options={RISK_OPTIONS}
        value={risk}
        onPick={setRisk}
        onClose={() => setPicker(null)}
        testID="risk-option"
      />
      <PickerSheet<Sort>
        visible={picker === 'sort'}
        title="Sort cases"
        options={SORT_OPTIONS}
        value={sort}
        onPick={setSort}
        onClose={() => setPicker(null)}
        testID="sort-option"
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  pressed: { opacity: 0.75 },
  headerCard: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  pageTitleWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  pageTitle: { ...typeStyles.pageTitle, color: colors.ink },
  pageSubtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 2 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    backgroundColor: colors.white,
  },
  searchInput: { ...typeStyles.inputSingle, flex: 1, height: 46, color: colors.ink },

  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  chipText: { ...typeStyles.caption, color: colors.inkMuted, fontWeight: fontWeight.semibold, flexShrink: 1 },
  chipTextActive: { color: colors.white },

  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  countText: { ...typeStyles.label, fontWeight: fontWeight.bold, color: colors.ink },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 },
  sortText: { ...typeStyles.caption, color: colors.ink, fontWeight: fontWeight.semibold },

  listScroll: { flex: 1 },
  listContent: { paddingBottom: spacing.xxxl },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    gap: spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  rowBody: { flex: 1, minWidth: 0 },
  caseId: { ...typeStyles.caption, fontSize: 11, color: colors.inkFaint },
  caseName: { ...typeStyles.name, fontWeight: fontWeight.bold, color: colors.ink },
  caseMeta: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
  concernText: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4, maxWidth: 140 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...typeStyles.caption, fontSize: 11, lineHeight: 15, fontWeight: fontWeight.semibold },
  riskText: { ...typeStyles.caption, fontSize: 11, color: colors.inkMuted },
  riskHigh: { color: colors.danger, fontWeight: fontWeight.semibold },
  docsText: { ...typeStyles.caption, fontWeight: fontWeight.semibold },

  pickList: { borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.md, overflow: 'hidden' },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  pickRule: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  pickRowOn: { backgroundColor: colors.surface.mintSoft },
  pickText: { ...typeStyles.body, color: colors.ink },
  pickTextOn: { color: colors.surfie, fontWeight: fontWeight.semibold },
});

export default CasesScreen;
