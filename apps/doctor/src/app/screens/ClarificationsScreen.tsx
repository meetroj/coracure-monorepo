import { typeStyles, fontWeight } from '../../../../../libs/typography/src';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import { Screen, AppHeader, IconButton, PageTitle, EmptyState } from '../../components/ui';
import {
  clarificationList,
  CLARIFICATION_FILTERS,
  LIST_STATUS_LABEL,
  URGENCY_SHORT,
  type ClarificationSummary,
  type ListStatus,
  type Urgency,
} from '../../data/clarification';

/**
 * Case Clarifications — DR-17-01 and DR-17-02.
 *
 * The doctor's own queue, not the expert queue. A clarification lives for days
 * rather than minutes — posted, answered, discussed, closed — which is why it
 * has a tab of its own rather than sitting inside a single consultation.
 *
 * Nothing here reaches the patient: the thread is between the treating doctor
 * and the expert, and the case is de-identified before it is shared.
 */

const URGENCY_TONE: Record<Urgency, { fg: string; bg: string }> = {
  urgent: { fg: colors.danger, bg: colors.dangerSoft },
  priority: { fg: colors.warn, bg: colors.warnSoft },
  routine: { fg: colors.surfie, bg: colors.successSoft },
};

/** Status tint: waiting on someone else is quiet, action-on-me is not. */
const STATUS_TONE: Record<ListStatus, { fg: string; bg: string }> = {
  draft: { fg: colors.inkMuted, bg: '#EFF3F1' },
  posted: { fg: colors.inkMuted, bg: '#EFF3F1' },
  expertReview: { fg: colors.inkMuted, bg: '#EFF3F1' },
  clarificationNeeded: { fg: '#6B5BB5', bg: '#F0EDFB' },
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

const CaseRow = ({ item, onPress }: { item: ClarificationSummary; onPress: () => void }) => {
  const urg = URGENCY_TONE[item.urgency];
  const st = STATUS_TONE[item.status];
  return (
    <Pressable
      testID={`clarification-${item.id}`}
      onPress={onPress}
      style={({ pressed }) => [s.card, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${LIST_STATUS_LABEL[item.status]}`}
    >
      <View style={s.cardTop}>
        <View style={s.cardIcon}>
          <Icon name={item.icon} size={17} color={colors.surfie} />
        </View>
        <View style={s.flex}>
          <View style={s.titleLine}>
            <Text style={[typeStyles.body, s.cardTitle]} numberOfLines={2}>{item.title}</Text>
            <View style={[s.urg, { backgroundColor: urg.bg }]}>
              <View style={[s.urgDot, { backgroundColor: urg.fg }]} />
              <Text style={[typeStyles.body, s.urgText, { color: urg.fg }]}>
                {URGENCY_SHORT[item.urgency]}
              </Text>
            </View>
            <Icon name="chevronRight" size={16} color={colors.inkFaint} />
          </View>
          <Text style={[typeStyles.body, s.caseId]}>Case ID: {item.caseId}</Text>
          <Text style={[typeStyles.body, s.blurb]} numberOfLines={2}>{item.blurb}</Text>
        </View>
      </View>

      <View style={s.cardRule} />
      <View style={s.cardFoot}>
        <Icon name="calendar" size={13} color={colors.inkFaint} />
        <Text style={[typeStyles.body, s.footText]} numberOfLines={1}>
          Last activity: {item.lastActivity}
        </Text>
        <View style={[s.status, { backgroundColor: st.bg }]}>
          <Icon name={STATUS_ICON[item.status]} size={11} color={st.fg} />
          <Text style={[typeStyles.body, s.statusText, { color: st.fg }]} numberOfLines={1}>
            {LIST_STATUS_LABEL[item.status]}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

export const ClarificationsScreen = ({
  onOpenCase = () => undefined,
  onNewQuery = () => undefined,
  onOpenNotifications,
  onOpenMessages,
}: {
  onOpenCase?: (c: ClarificationSummary) => void;
  onNewQuery?: () => void;
  onOpenNotifications?: () => void;
  onOpenMessages?: () => void;
}) => {
  const [filter, setFilter] = useState<ListStatus | 'all'>('all');

  const list = useMemo(
    () => (filter === 'all' ? clarificationList : clarificationList.filter((c) => c.status === filter)),
    [filter]
  );

  return (
    <View style={s.root}>
      <Screen contentStyle={s.content}>
        <AppHeader
          right={
            <>
              <IconButton testID="nav-notifications" name="bell" badge label="Notifications" onPress={onOpenNotifications} />
              <IconButton testID="nav-messages" name="message" label="Messages" onPress={onOpenMessages} />
            </>
          }
        />

        {/* The status chips below are the only filter — a second control in the
            header would have offered the same thing twice. */}
        <PageTitle
          title="Case Clarifications"
          subtitle="Track and manage clarification queries"
        />

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
                <Text style={[typeStyles.body, s.chipText, on && s.chipTextOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {list.length === 0 ? (
          <EmptyState
            icon="message"
            title="Nothing here"
            body="No clarifications match this filter."
            actionLabel="Clear filter"
            onAction={() => setFilter('all')}
          />
        ) : (
          <View style={s.list}>
            {list.map((c) => (
              <CaseRow key={c.id} item={c} onPress={() => onOpenCase(c)} />
            ))}
          </View>
        )}
      </Screen>

      {/* Floating above the list, clear of the tab bar. */}
      <Pressable
        testID="new-clarification"
        onPress={onNewQuery}
        style={({ pressed }) => [s.fab, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel="New clarification query"
      >
        <Icon name="plus" size={17} color={colors.white} />
        <Text style={[typeStyles.body, s.fabText]}>New Query</Text>
      </Pressable>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  content: { paddingBottom: 96 },
  pressed: { opacity: 0.8 },


  filterRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 2, marginTop: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
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
    borderRadius: 14,
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
  cardTitle: {
    flex: 1,
    fontFamily: typography.heading.family,
    fontSize: 14,
    lineHeight: 18,
    // 700 now that a real Bold file is bundled — at semibold the query title
    // did not stand out from the blurb beneath it.
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  urg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    flexShrink: 0,
  },
  urgDot: { width: 5, height: 5, borderRadius: 3 },
  urgText: { ...typeStyles.caption, fontSize: 10, fontWeight: fontWeight.semibold },
  caseId: { ...typeStyles.caption, fontSize: 10.5, color: colors.inkFaint, marginTop: 2 },
  blurb: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 4 },

  cardRule: { height: 1, backgroundColor: colors.surface.line, marginTop: spacing.md },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: spacing.sm,
  },
  footText: { ...typeStyles.caption, fontSize: 10.5, color: colors.inkMuted, flex: 1 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    flexShrink: 0,
  },
  statusText: { ...typeStyles.caption, fontSize: 10, fontWeight: fontWeight.semibold },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: spacing.lg,
    // Minimal radius, matching the chips and buttons elsewhere in the app.
    borderRadius: radius.sm,
    backgroundColor: colors.surfie,
  },
  fabText: { ...typeStyles.button, color: colors.white },
});

export default ClarificationsScreen;
