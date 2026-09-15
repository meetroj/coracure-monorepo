import { typeStyles, fontWeight } from '../../../../../libs/typography/src';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { Icon, type IconName } from '../../components/Icon';
import { Screen, AppHeader } from '../../components/ui';
import {
  clinicalTaskList,
  TASK_CATEGORY_LABEL,
  type ClinicalTask,
  type TaskCategory,
} from '../../data/doctor';

/**
 * Pending Tasks Worklist — opened from the Dashboard tasks card.
 *
 * A worklist, not the Cases tab, and deliberately not a navigation tab: it
 * lists what the doctor still owes, oldest debt first, so the longest-waiting
 * patient record surfaces without hunting. Documentation debt gates instant
 * consultation requests, which is why the footer says so.
 *
 * Every count is derived from `clinicalTaskList`.
 */

type CategoryMeta = { icon: IconName; accent: string };

/** Follow-ups are a patient reply, not documentation, so they read blue. */
const CATEGORY: Record<TaskCategory, CategoryMeta> = {
  summary: { icon: 'notes', accent: colors.paris },
  prescription: { icon: 'prescription', accent: colors.paris },
  note: { icon: 'document', accent: colors.paris },
  followUp: { icon: 'message', accent: '#57A7E3' },
};

const CATEGORIES: TaskCategory[] = ['summary', 'prescription', 'note', 'followUp'];

type ChipKey = 'all' | TaskCategory;

/* -------------------------------- task card ------------------------------- */

const TaskCard = ({ task, onAction }: { task: ClinicalTask; onAction: (id: string) => void }) => {
  const meta = CATEGORY[task.category];

  return (
    <View style={s.card}>
      <View style={[s.accent, { backgroundColor: meta.accent }]} />

      <View style={s.cardBody}>
        <View style={s.tile}>
          <Icon name={meta.icon} size={16} color={colors.surfie} />
        </View>

        <View style={s.flex}>
          <Text style={[typeStyles.body, s.title]} numberOfLines={1}>
            {task.title}
          </Text>
          <Text style={[typeStyles.body, s.patient]} numberOfLines={1}>
            {task.patient}
          </Text>
          <Text style={[typeStyles.body, s.caseId]} numberOfLines={1}>
            Case ID: {task.caseId}
          </Text>
          <View style={s.specChip}>
            <Icon name="stethoscope" size={10} color={colors.inkMuted} />
            <Text style={[typeStyles.body, s.specText]} numberOfLines={1}>
              {task.specialty}
            </Text>
          </View>
        </View>

        <View style={s.right}>
          {/* the age sits on the title line, with the menu at the far edge */}
          <View style={s.ageRow}>
            <Icon name="clock" size={11} color={colors.warn} />
            <Text style={[typeStyles.body, s.ageText]}>{task.pendingFor}</Text>
            <Pressable
              testID={`task-more-${task.id}`}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`More options for ${task.title}, ${task.patient}`}
            >
              <Icon name="moreVertical" size={15} color={colors.inkFaint} />
            </Pressable>
          </View>
          <Text style={[typeStyles.body, s.opened]} numberOfLines={1}>
            Opened on {task.openedOn}
          </Text>

          <Pressable
            testID={`task-action-${task.id}`}
            onPress={() => onAction(task.id)}
            style={s.openBtn}
            accessibilityRole="button"
            accessibilityLabel={`Open ${task.title} for ${task.patient}`}
          >
            <Text style={[typeStyles.body, s.openText]}>Open</Text>
            <Icon name="chevronRight" size={12} color={colors.surfie} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

/* --------------------------------- screen --------------------------------- */

export const PendingTasksScreen = ({
  onBack,
  onAction = () => undefined,
  onNotifications = () => undefined,
}: {
  onBack: () => void;
  onAction?: (id: string) => void;
  onNotifications?: () => void;
}) => {
  const [chip, setChip] = useState<ChipKey>('all');
  const [oldestFirst, setOldestFirst] = useState(true);

  const countFor = (c: TaskCategory) => clinicalTaskList.filter((t) => t.category === c).length;

  const visible = useMemo(() => {
    const list = chip === 'all' ? clinicalTaskList : clinicalTaskList.filter((t) => t.category === chip);
    // the fixture is authored oldest first, so newest is simply the reverse
    return oldestFirst ? list : list.slice().reverse();
  }, [chip, oldestFirst]);

  return (
    <Screen contentStyle={s.content}>
      {/* the shared header carries the wordmark; back and bell sit beside it */}
      <AppHeader
        onBack={onBack}
        right={
          <Pressable
            onPress={onNotifications}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Icon name="bell" size={21} color={colors.ink} />
            <View style={s.bellDot} />
          </Pressable>
        }
      />

      <View style={s.titleBlock}>
        <Text style={[typeStyles.body, s.screenTitle]}>Pending Tasks Worklist</Text>
        <Text style={[typeStyles.body, s.screenSub]}>Stay on top of your unfinished clinical work.</Text>
      </View>

      {/* ------------------------------- category chips -------------------------- */}
      <ScrollView
        horizontal
        style={s.chipScroll}
        contentContainerStyle={s.chipRow}
        showsHorizontalScrollIndicator={false}
      >
        {(['all', ...CATEGORIES] as ChipKey[]).map((k) => {
          const on = chip === k;
          return (
            <Pressable
              key={k}
              testID={`chip-${k}`}
              onPress={() => setChip(k)}
              style={[s.chip, on && s.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              {k !== 'all' && (
                <Icon name={CATEGORY[k].icon} size={14} color={on ? colors.white : colors.ink} />
              )}
              <Text style={[typeStyles.body, s.chipText, on && s.chipTextOn]}>
                {k === 'all' ? 'All' : TASK_CATEGORY_LABEL[k]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* -------------------------------- summary -------------------------------- */}
      <View style={s.summary}>
        {/* one row: the disc and the total on the left, the four categories
            beside them. Type is sized so every label prints in full. */}
        <View style={s.summaryLead}>
          <View style={s.summaryDisc}>
            <Icon name="checklist" size={20} color={colors.surfie} />
          </View>
          <View style={s.summaryText}>
            <Text style={[typeStyles.body, s.summaryLabel]} numberOfLines={1}>
              Total Pending Tasks
            </Text>
            <Text style={[typeStyles.body, s.summaryValue]}>{clinicalTaskList.length}</Text>
            <Text style={[typeStyles.body, s.summaryHint]} numberOfLines={1}>
              Across all categories
            </Text>
          </View>
        </View>

        <View style={s.breakdown}>
          {CATEGORIES.map((c) => (
            <View key={c} style={s.breakItem}>
              <View style={s.breakTile}>
                <Icon name={CATEGORY[c].icon} size={12} color={colors.surfie} />
              </View>
              <Text style={[typeStyles.body, s.breakValue]}>{countFor(c)}</Text>
              <Text style={[typeStyles.body, s.breakLabel]}>{TASK_CATEGORY_LABEL[c]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ------------------------------- sort + stamp ---------------------------- */}
      <View style={s.toolRow}>
        <Pressable
          testID="sort-toggle"
          onPress={() => setOldestFirst((v) => !v)}
          hitSlop={8}
          style={s.tool}
          accessibilityRole="button"
          accessibilityLabel={oldestFirst ? 'Oldest pending first' : 'Newest pending first'}
        >
          <Icon name="sort" size={14} color={colors.inkMuted} />
          <Text style={[typeStyles.body, s.toolText]}>
            {oldestFirst ? 'Oldest pending first' : 'Newest pending first'}
          </Text>
        </Pressable>

        <View style={s.tool}>
          <Text style={[typeStyles.body, s.toolText]}>Last updated: 7:30 AM</Text>
          <Icon name="refresh" size={14} color={colors.inkMuted} />
        </View>
      </View>

      {/* -------------------------------- worklist ------------------------------- */}
      {visible.length === 0 ? (
        <View style={s.empty}>
          <Text style={[typeStyles.body, s.emptyText]}>Nothing outstanding here.</Text>
        </View>
      ) : (
        visible.map((t) => <TaskCard key={t.id} task={t} onAction={onAction} />)
      )}

      {/* -------------------------------- notice --------------------------------- */}
      <View style={s.notice}>
        <Icon name="lock" size={14} color={colors.warn} />
        <Text style={[typeStyles.body, s.noticeText]}>
          New instant requests resume after required documentation is completed.
        </Text>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  content: { paddingBottom: spacing.lg },

  bellDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.paris,
    borderWidth: 1.5,
    borderColor: colors.surface.page,
  },

  /* title */
  titleBlock: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  screenTitle: { ...typeStyles.pageTitle, color: colors.ink },
  screenSub: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 3 },

  /* chips — one line, scrolled sideways rather than wrapped */
  chipScroll: { flexGrow: 0 },
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  chipOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  chipText: { ...typeStyles.status, color: colors.ink },
  chipTextOn: { color: colors.white, fontWeight: fontWeight.semibold },

  /* summary card */
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    /* a hint of mint, not a filled panel */
    backgroundColor: '#F4FAF8',
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  summaryLead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  summaryDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { alignItems: 'flex-start' },
  summaryLabel: { ...typeStyles.label, fontSize: 8.5, fontWeight: fontWeight.regular, color: colors.inkMuted },
  summaryValue: { ...typeStyles.name, fontSize: 19, fontWeight: fontWeight.semibold, color: colors.ink },
  summaryHint: { ...typeStyles.label, fontSize: 7.5, fontWeight: fontWeight.regular, color: colors.inkFaint },

  /* four equal columns sharing whatever the total block leaves */
  breakdown: { flexDirection: 'row', flex: 1, minWidth: 0 },
  breakItem: { flex: 1, alignItems: 'center', gap: 1, minWidth: 0 },
  breakTile: {
    width: 21,
    height: 21,
    borderRadius: 7,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakValue: { ...typeStyles.name, fontSize: 12.5, fontWeight: fontWeight.semibold, color: colors.ink },
  breakLabel: { ...typeStyles.label, fontSize: 7.5, fontWeight: fontWeight.regular, color: colors.inkMuted },

  /* sort + stamp */
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  toolText: { ...typeStyles.caption, fontSize: 11, fontWeight: fontWeight.regular, color: colors.inkMuted },

  /* task card */
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  accent: { width: 4 },
  cardBody: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 10, paddingVertical: 10 },
  tile: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typeStyles.cardTitle, fontSize: 12.5, color: colors.ink },
  patient: { ...typeStyles.name, fontSize: 11, fontWeight: fontWeight.regular, color: colors.inkMuted, marginTop: 1 },
  caseId: { ...typeStyles.label, fontSize: 9.5, fontWeight: fontWeight.regular, color: colors.inkFaint, marginTop: 1 },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface.page,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 5,
    maxWidth: '100%',
  },
  specText: { ...typeStyles.label, fontSize: 9, fontWeight: fontWeight.regular, color: colors.inkMuted, flexShrink: 1 },

  /* right rail: age + menu, opened stamp, the action */
  right: { alignItems: 'flex-end', gap: 2, width: 106 },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ageText: { ...typeStyles.label, fontSize: 10, color: colors.warn },
  opened: { ...typeStyles.label, fontSize: 9, fontWeight: fontWeight.regular, color: colors.inkFaint },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    alignSelf: 'stretch',
    marginTop: 7,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surfie,
    backgroundColor: colors.white,
  },
  openText: { ...typeStyles.button, fontSize: 11.5, color: colors.surfie },

  /* notice */
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warn,
    backgroundColor: colors.warnSoft,
  },
  noticeText: { ...typeStyles.caption, flex: 1, color: colors.warn },

  /* empty */
  empty: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xxxl, alignItems: 'center' },
  emptyText: { ...typeStyles.body, color: colors.inkMuted },
});

export default PendingTasksScreen;
