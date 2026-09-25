import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon, type IconName } from '../../components/Icon';
import { Screen, EmptyState } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useStore } from '../../state/store';
import { TASK_CATEGORY_LABEL, selectTasks, type ClinicalTask, type TaskCategory } from '../../state/selectors';

/**
 * Pending Tasks Worklist — what the doctor still owes, oldest first.
 *
 * Every task is derived from a real record: a consultation whose notes,
 * prescription or summary is unfinished, or a check-in response not yet read.
 * Opening one goes straight to the step that clears it, for that patient, and
 * the task disappears once the step is done.
 */

type CategoryMeta = { icon: IconName; accent: string; action: string };

const CATEGORY: Record<TaskCategory, CategoryMeta> = {
  summary: { icon: 'notes', accent: colors.paris, action: 'Write summary' },
  prescription: { icon: 'prescription', accent: colors.paris, action: 'Finish prescription' },
  note: { icon: 'document', accent: colors.paris, action: 'Complete notes' },
  followUp: { icon: 'message', accent: '#57A7E3', action: 'Review check-in' },
};

const CATEGORIES: TaskCategory[] = ['summary', 'prescription', 'note', 'followUp'];

type ChipKey = 'all' | TaskCategory;

const TaskCard = ({ task, onOpen }: { task: ClinicalTask; onOpen: () => void }) => {
  const meta = CATEGORY[task.category];
  return (
    <Pressable
      testID={`task-${task.id}`}
      onPress={onOpen}
      style={({ pressed }) => [s.card, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${task.title} for ${task.patient}, waiting ${task.pendingFor}. ${meta.action}`}
    >
      <View style={[s.accent, { backgroundColor: meta.accent }]} />
      <View style={s.cardBody}>
        <View style={s.tile}>
          <Icon name={meta.icon} size={17} color={colors.surfie} />
        </View>
        <View style={s.flex}>
          <Text style={s.title} numberOfLines={1}>
            {task.title}
          </Text>
          <Text style={s.patient} numberOfLines={1}>
            {task.patient}
          </Text>
          <Text style={s.caseId} numberOfLines={1}>
            Case ID: {task.caseId} · {task.specialty}
          </Text>
          <View style={s.ageRow}>
            <Icon name="clock" size={12} color={colors.warn} />
            <Text style={s.ageText}>Waiting {task.pendingFor}</Text>
            <Text style={s.opened}>· Opened {task.openedOn}</Text>
          </View>
        </View>
        <View testID={`task-action-${task.id}`} style={s.openBtn}>
          <Text style={s.openText}>Open</Text>
          <Icon name="chevronRight" size={13} color={colors.surfie} />
        </View>
      </View>
    </Pressable>
  );
};

export const PendingTasksScreen = ({
  onBack,
  onOpenTask,
}: {
  onBack: () => void;
  onOpenTask: (task: ClinicalTask) => void;
}) => {
  const tasks = useStore(selectTasks);
  const [chip, setChip] = useState<ChipKey>('all');
  const [oldestFirst, setOldestFirst] = useState(true);

  const countFor = (c: TaskCategory) => tasks.filter((t) => t.category === c).length;

  const visible = useMemo(() => {
    const list = chip === 'all' ? tasks : tasks.filter((t) => t.category === chip);
    // the derived list is oldest first, so newest is the reverse
    return oldestFirst ? list : list.slice().reverse();
  }, [tasks, chip, oldestFirst]);

  return (
    <Screen
      testID="pending-tasks"
      header={
        <ScreenHeader onBack={onBack} title="Pending Tasks Worklist" subtitle="Stay on top of your unfinished clinical work." />
      }
    >
      <ScrollView horizontal style={s.chipScroll} contentContainerStyle={s.chipRow} showsHorizontalScrollIndicator={false}>
        {(['all', ...CATEGORIES] as ChipKey[]).map((k) => {
          const on = chip === k;
          const count = k === 'all' ? tasks.length : countFor(k);
          return (
            <Pressable
              key={k}
              testID={`chip-${k}`}
              onPress={() => setChip(k)}
              style={[s.chip, on && s.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${k === 'all' ? 'All' : TASK_CATEGORY_LABEL[k]}, ${count}`}
            >
              {k !== 'all' && <Icon name={CATEGORY[k].icon} size={14} color={on ? colors.white : colors.ink} />}
              <Text style={[s.chipText, on && s.chipTextOn]}>
                {k === 'all' ? 'All' : TASK_CATEGORY_LABEL[k]} · {count}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={s.summary}>
        <View style={s.summaryLead}>
          <View style={s.summaryDisc}>
            <Icon name="checklist" size={20} color={colors.surfie} />
          </View>
          <View>
            <Text testID="task-total" style={s.summaryValue}>
              {tasks.length}
            </Text>
            <Text style={s.summaryLabel}>Total pending</Text>
          </View>
        </View>
        <View style={s.breakdown}>
          {CATEGORIES.map((c) => (
            <View key={c} style={s.breakItem}>
              <Text testID={`task-count-${c}`} style={s.breakValue}>
                {countFor(c)}
              </Text>
              <Text style={s.breakLabel} numberOfLines={1}>
                {TASK_CATEGORY_LABEL[c]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.toolRow}>
        <Pressable
          testID="sort-toggle"
          onPress={() => setOldestFirst((v) => !v)}
          hitSlop={8}
          style={s.tool}
          accessibilityRole="button"
          accessibilityLabel={oldestFirst ? 'Showing oldest first. Show newest first' : 'Showing newest first. Show oldest first'}
        >
          <Icon name="sort" size={15} color={colors.inkMuted} />
          <Text style={s.toolText}>{oldestFirst ? 'Oldest pending first' : 'Newest pending first'}</Text>
        </Pressable>
      </View>

      {visible.length === 0 ? (
        <EmptyState
          icon="checkCircle"
          title="Nothing outstanding"
          body={chip === 'all' ? 'Every consultation is written up.' : 'No tasks in this category.'}
        />
      ) : (
        visible.map((t) => <TaskCard key={t.id} task={t} onOpen={() => onOpenTask(t)} />)
      )}

      {tasks.length > 0 && (
        <View style={s.notice}>
          <Icon name="lock" size={14} color={colors.warn} />
          <Text style={s.noticeText}>Instant requests pause while a consultation you just finished is still being written up.</Text>
        </View>
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.8 },

  chipScroll: { flexGrow: 0 },
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
  },
  chipOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  chipText: { ...typeStyles.status, color: colors.ink },
  chipTextOn: { color: colors.white, fontWeight: fontWeight.semibold },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: '#F4FAF8',
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  summaryLead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: { ...typeStyles.metricSmall, fontWeight: fontWeight.bold, color: colors.ink },
  summaryLabel: { ...typeStyles.caption, fontSize: 11, lineHeight: 14, color: colors.inkMuted },
  breakdown: { flexDirection: 'row', flex: 1, minWidth: 0 },
  breakItem: { flex: 1, alignItems: 'center', minWidth: 0 },
  breakValue: { ...typeStyles.number, fontSize: 16, fontWeight: fontWeight.bold, color: colors.ink },
  breakLabel: { ...typeStyles.caption, fontSize: 11, lineHeight: 14, color: colors.inkMuted },

  toolRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 40 },
  toolText: { ...typeStyles.caption, color: colors.inkMuted },

  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  accent: { width: 4 },
  cardBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  tile: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  title: { ...typeStyles.cardTitle, fontSize: 14, color: colors.ink },
  patient: { ...typeStyles.bodySmall, color: colors.ink, marginTop: 1 },
  caseId: { ...typeStyles.caption, fontSize: 11, color: colors.inkFaint, marginTop: 1 },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  ageText: { ...typeStyles.caption, fontSize: 11, color: colors.warn, fontWeight: fontWeight.semibold },
  opened: { ...typeStyles.caption, fontSize: 11, color: colors.inkFaint },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.surfie,
    backgroundColor: colors.white,
  },
  openText: { ...typeStyles.buttonSmall, color: colors.surfie },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warn,
    backgroundColor: colors.warnSoft,
  },
  noticeText: { ...typeStyles.caption, flex: 1, color: colors.warn },
});

export default PendingTasksScreen;
