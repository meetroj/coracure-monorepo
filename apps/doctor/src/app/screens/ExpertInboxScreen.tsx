import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, EmptyState } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SkeletonRowList, SectionError } from '../../components/skeletons';
import { URGENCY_SHORT, type Urgency } from '../../data/clarification';
import { REVIEW_STATUS_LABEL, type ReviewCase } from '../../data/clarifications';
import type { Resource } from '../../data/useResource';

const URGENCY_TONE: Record<Urgency, { fg: string; bg: string }> = {
  urgent: { fg: colors.danger, bg: colors.dangerSoft },
  priority: { fg: colors.warn, bg: colors.warnSoft },
  routine: { fg: colors.surfie, bg: colors.successSoft },
};

const FILTERS: { key: Urgency | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'urgent', label: URGENCY_SHORT.urgent },
  { key: 'priority', label: URGENCY_SHORT.priority },
  { key: 'routine', label: URGENCY_SHORT.routine },
];

/**
 * Expert Inbox — clarification cases an administrator assigned to me.
 *
 * Every case here is de-identified: no patient name, initials, contact or
 * consultation. The backend sends none of them to an expert, and this screen
 * does not invent any. Open cases only (the server's default), most urgent
 * first; tapping one opens it to read and answer.
 *
 * The route owns the data (`useExpertReviews`) so it can refresh the list
 * when the doctor comes back from answering a case.
 */
export const ExpertInboxScreen = ({
  reviews,
  onBack,
  onOpen,
}: {
  reviews: Resource<ReviewCase[]>;
  onBack: () => void;
  onOpen: (caseId: string) => void;
}) => {
  const { data, showSkeleton, error, retry } = reviews;
  const [filter, setFilter] = useState<Urgency | 'all'>('all');
  const all = useMemo(() => data ?? [], [data]);
  const list = filter === 'all' ? all : all.filter((c) => c.urgency === filter);
  const countOf = (k: Urgency | 'all') => (k === 'all' ? all.length : all.filter((c) => c.urgency === k).length);

  return (
    <Screen
      testID="expert-inbox"
      header={<ScreenHeader onBack={onBack} title="Expert Inbox" subtitle="Clarification cases assigned to you" />}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <Pressable
              key={f.key}
              testID={`inbox-filter-${f.key}`}
              onPress={() => setFilter(f.key)}
              style={[s.chip, on && s.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[s.chipText, on && s.chipTextOn]}>
                {f.label} · {countOf(f.key)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {showSkeleton ? (
        <SkeletonRowList rows={3} avatar="none" />
      ) : error ? (
        <SectionError testID="inbox-error" message="Could not load the cases assigned to you." onRetry={retry} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="checkCircle"
          title={all.length === 0 ? 'No cases assigned' : 'Nothing at this urgency'}
          body={all.length === 0 ? 'An administrator assigns cases to you; they appear here.' : 'Try another filter.'}
          {...(all.length > 0 ? { actionLabel: 'Show all', onAction: () => setFilter('all') } : {})}
        />
      ) : (
        <View style={s.list}>
          {list.map((c) => (
            <InboxRow key={c.id} item={c} onPress={() => onOpen(c.id)} />
          ))}
        </View>
      )}

      <View style={s.scope}>
        <Icon name="shield" size={14} color={colors.inkMuted} />
        <Text style={s.scopeText}>De-identified cases only. You never see who the patient is.</Text>
      </View>
    </Screen>
  );
};

const InboxRow = ({ item, onPress }: { item: ReviewCase; onPress: () => void }) => {
  const tone = URGENCY_TONE[item.urgency];
  const yourTurn = item.status === 'awaiting_response';
  return (
    <Pressable
      testID={`inbox-case-${item.id}`}
      onPress={onPress}
      style={({ pressed }) => [s.card, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${URGENCY_SHORT[item.urgency]} urgency, ${REVIEW_STATUS_LABEL[item.status]}`}
    >
      <View style={s.cardTop}>
        <Text style={s.ref}>{item.ref}</Text>
        <View style={[s.urgency, { backgroundColor: tone.bg }]}>
          <Text style={[s.urgencyText, { color: tone.fg }]}>{URGENCY_SHORT[item.urgency]}</Text>
        </View>
        <View style={s.flex} />
        <Text style={s.ago}>{item.assignedAgo}</Text>
      </View>
      <Text style={s.title} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={s.meta} numberOfLines={1}>
        {item.ageLabel} • {item.gender}
        {item.guidanceArea ? ` • ${item.guidanceArea}` : ''}
      </Text>
      <Text style={s.question} numberOfLines={2}>
        {item.question}
      </Text>
      <View style={s.cardFoot}>
        <View style={[s.status, yourTurn && s.statusYours]}>
          <Text style={[s.statusText, yourTurn && s.statusTextYours]}>{REVIEW_STATUS_LABEL[item.status]}</Text>
        </View>
        <View style={s.flex} />
        <Icon name="chevronRight" size={16} color={colors.inkFaint} />
      </View>
    </Pressable>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },

  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  chipText: { ...typeStyles.caption, fontWeight: fontWeight.semibold, color: colors.ink },
  chipTextOn: { color: colors.white },

  list: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    gap: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ref: { ...typeStyles.caption, fontWeight: fontWeight.semibold, color: colors.inkMuted },
  urgency: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 1 },
  urgencyText: { ...typeStyles.caption, fontSize: 11, fontWeight: fontWeight.bold },
  ago: { ...typeStyles.caption, color: colors.inkFaint },
  title: { ...typeStyles.cardTitle, color: colors.ink },
  meta: { ...typeStyles.caption, color: colors.inkMuted },
  question: { ...typeStyles.bodySmall, color: colors.ink },
  cardFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  status: { backgroundColor: colors.surface.selected, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  statusYours: { backgroundColor: colors.warnSoft },
  statusText: { ...typeStyles.caption, fontSize: 11, fontWeight: fontWeight.bold, color: colors.surfie },
  statusTextYours: { color: colors.warn },

  scope: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  scopeText: { ...typeStyles.caption, color: colors.inkMuted },
});

export default ExpertInboxScreen;
