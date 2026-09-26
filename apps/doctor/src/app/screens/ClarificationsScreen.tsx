import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, PageTitle, EmptyState } from '../../components/ui';
import { TabHeader } from '../navigation/TabHeader';
import { useStore } from '../../state/store';
import {
  CLARIFICATION_FILTERS,
  LIST_STATUS_LABEL,
  URGENCY_SHORT,
  type Clarification,
  type ListStatus,
  type Urgency,
} from '../../data/clarification';

/**
 * Case Clarifications — DR-17-01 and DR-17-02.
 *
 * The doctor's own queue. A clarification lives for days — posted, answered,
 * discussed, closed — which is why it has a tab of its own. Each row opens
 * that clarification: a draft reopens in the editor, guidance waiting for a
 * decision opens the response, anything else opens its thread.
 */

const URGENCY_TONE: Record<Urgency, { fg: string; bg: string }> = {
  urgent: { fg: colors.danger, bg: colors.dangerSoft },
  priority: { fg: colors.warn, bg: colors.warnSoft },
  routine: { fg: colors.surfie, bg: colors.successSoft },
};

/** Waiting on someone else is quiet; action-on-me is not. */
const STATUS_TONE: Record<ListStatus, { fg: string; bg: string }> = {
  draft: { fg: colors.inkMuted, bg: '#EFF3F1' },
  posted: { fg: colors.inkMuted, bg: '#EFF3F1' },
  expertReview: { fg: colors.inkMuted, bg: '#EFF3F1' },
  clarificationNeeded: { fg: '#5B4BA8', bg: '#F0EDFB' },
  responseReceived: { fg: colors.surfie, bg: colors.successSoft },
  reviewed: { fg: colors.surfie, bg: colors.successSoft },
  closed: { fg: colors.inkMuted, bg: '#EFF3F1' },
};

const STATUS_ICON: Record<ListStatus, 'pencil' | 'sort' | 'clock' | 'message' | 'checkCircle'> = {
  draft: 'pencil',
  posted: 'sort',
  expertReview: 'clock',
  clarificationNeeded: 'message',
  responseReceived: 'message',
  reviewed: 'checkCircle',
  closed: 'checkCircle',
};

const CaseRow = ({ item, onPress }: { item: Clarification; onPress: () => void }) => {
  const urg = URGENCY_TONE[item.urgency];
  const st = STATUS_TONE[item.status];
  return (
    <Pressable
      testID={`clarification-${item.id}`}
      onPress={onPress}
      style={({ pressed }) => [s.card, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${LIST_STATUS_LABEL[item.status]}, ${URGENCY_SHORT[item.urgency]} urgency`}
    >
      <View style={s.cardTop}>
        <View style={s.cardIcon}>
          <Icon name={item.icon} size={17} color={colors.surfie} />
        </View>
        <View style={s.flex}>
          <View style={s.titleLine}>
            <Text style={s.cardTitle} numberOfLines={2}>
              {item.title || 'Untitled draft'}
            </Text>
            <View style={[s.urg, { backgroundColor: urg.bg }]}>
              <View style={[s.urgDot, { backgroundColor: urg.fg }]} />
              <Text style={[s.urgText, { color: urg.fg }]}>{URGENCY_SHORT[item.urgency]}</Text>
            </View>
          </View>
          <Text style={s.caseId}>Case ID: {item.caseId}</Text>
          <Text style={s.blurb} numberOfLines={2}>
            {item.blurb || 'No question written yet.'}
          </Text>
        </View>
      </View>
      <View style={s.cardRule} />
      <View style={s.cardFoot}>
        <Icon name="calendar" size={13} color={colors.inkFaint} />
        <Text style={s.footText} numberOfLines={1}>
          {item.lastActivity}
        </Text>
        <View style={[s.status, { backgroundColor: st.bg }]}>
          <Icon name={STATUS_ICON[item.status]} size={12} color={st.fg} />
          <Text style={[s.statusText, { color: st.fg }]} numberOfLines={1}>
            {LIST_STATUS_LABEL[item.status]}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

export const ClarificationsScreen = ({
  onOpen,
  onNewQuery,
}: {
  onOpen: (c: Clarification) => void;
  onNewQuery: () => void;
}) => {
  const all = useStore((st) => st.clarifications);
  const [filter, setFilter] = useState<ListStatus | 'all'>('all');

  const list = useMemo(() => (filter === 'all' ? all : all.filter((c) => c.status === filter)), [all, filter]);
  const countOf = (k: ListStatus | 'all') => (k === 'all' ? all.length : all.filter((c) => c.status === k).length);

  return (
    <View style={s.root}>
      <Screen testID="clarifications" contentStyle={s.content}>
        <TabHeader />
        <PageTitle title="Case Clarifications" subtitle="Track and manage clarification queries" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {CLARIFICATION_FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <Pressable
                key={f.key}
                testID={`clarification-filter-${f.key}`}
                onPress={() => setFilter(f.key)}
                style={[s.chip, on && s.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Icon name={f.icon} size={13} color={on ? colors.white : colors.inkMuted} />
                <Text style={[s.chipText, on && s.chipTextOn]}>
                  {f.label} · {countOf(f.key)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {list.length === 0 ? (
          <EmptyState icon="message" title="Nothing here" body="No clarifications match this filter." actionLabel="Show all" onAction={() => setFilter('all')} />
        ) : (
          <View style={s.list}>
            {list.map((c) => (
              <CaseRow key={c.id} item={c} onPress={() => onOpen(c)} />
            ))}
          </View>
        )}
      </Screen>

      {/* floating above the list, clear of the tab bar */}
      <Pressable
        testID="new-clarification"
        onPress={onNewQuery}
        style={({ pressed }) => [s.fab, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel="New clarification query"
      >
        <Icon name="plus" size={18} color={colors.white} />
        <Text style={s.fabText}>New Query</Text>
      </Pressable>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  content: { paddingBottom: 104 },
  pressed: { opacity: 0.8 },

  filterRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  chipText: { ...typeStyles.caption, color: colors.inkMuted },
  chipTextOn: { color: colors.white, fontWeight: fontWeight.semibold },

  list: { marginTop: spacing.lg, gap: spacing.md },
  card: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  cardTop: { flexDirection: 'row', gap: spacing.md },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleLine: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardTitle: { ...typeStyles.cardTitle, fontSize: 14, lineHeight: 19, fontWeight: fontWeight.bold, flex: 1, color: colors.ink },
  urg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    flexShrink: 0,
  },
  urgDot: { width: 6, height: 6, borderRadius: 3 },
  urgText: { ...typeStyles.caption, fontSize: 11, lineHeight: 15, fontWeight: fontWeight.semibold },
  caseId: { ...typeStyles.caption, fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  blurb: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 4 },
  cardRule: { height: 1, backgroundColor: colors.surface.line, marginTop: spacing.md },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: spacing.sm },
  footText: { ...typeStyles.caption, fontSize: 11, color: colors.inkMuted, flex: 1 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    flexShrink: 0,
  },
  statusText: { ...typeStyles.caption, fontSize: 11, lineHeight: 15, fontWeight: fontWeight.semibold },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfie,
    shadowColor: '#0E766C',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: { ...typeStyles.button, color: colors.white },
});

export default ClarificationsScreen;
