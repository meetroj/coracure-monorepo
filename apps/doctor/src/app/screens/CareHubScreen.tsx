import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon, type IconName } from '../../components/Icon';
import { Screen, Button } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { confirmDiscard } from '../../components/confirm';
import { SkeletonRowList, SectionError } from '../../components/skeletons';
import { NOTE_MAX } from '../../data/followup';
import type { Resource } from '../../data/useResource';
import type { CareHubItem, ContentItemType } from '@coracure/api';

/**
 * Care Hub Recommendations — DOC-FUP-04 / DR-15-06.
 *
 * Opened from the advice step of the write-up, so the picks belong to one
 * consultation. The library is the server's published shelf, so every card
 * is selectable; drafts never reach the app. Saving with nothing selected
 * clears the recommendations — it never deletes a resource. A pick that has
 * left the shelf since it was made is dropped on save rather than sent, so
 * the write-up does not trip `CONTENT_NOT_RECOMMENDABLE`.
 */

type Tab = Extract<ContentItemType, 'self_help_tool' | 'education_module'>;

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'self_help_tool', label: 'Tools', icon: 'tools' },
  { key: 'education_module', label: 'Modules', icon: 'notes' },
];

const iconFor = (t: ContentItemType): IconName => (t === 'self_help_tool' ? 'tools' : 'notes');

/** How many cards show before "View more". */
const PAGE = 6;

const ResourceCard = ({ resource, selected, onToggle }: { resource: CareHubItem; selected: boolean; onToggle: () => void }) => {
  return (
    <Pressable
      testID={`care-${resource.id}`}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={resource.title}
      style={({ pressed }) => [s.card, selected && s.cardOn, pressed && s.pressed]}
    >
      <View style={s.cardTop}>
        <View style={s.cardIcon}>
          <Icon name={iconFor(resource.itemType)} size={17} color={colors.surfie} />
        </View>
        {selected ? (
          <View style={s.tick}>
            <Icon name="check" size={12} weight={3} color={colors.white} />
          </View>
        ) : (
          <View style={s.tickEmpty} />
        )}
      </View>
      <Text style={s.cardTitle} numberOfLines={2}>
        {resource.title}
      </Text>
      {!!resource.summary && (
        <Text style={s.cardBlurb} numberOfLines={3}>
          {resource.summary}
        </Text>
      )}
    </Pressable>
  );
};

export const CareHubScreen = ({
  library,
  onBack,
  onSave,
  initialSelected = [],
  initialNote = '',
  patientName,
  onDirtyChange,
  readOnly = false,
}: {
  /** The published shelf — `useCareHubItems()`. */
  library: Resource<CareHubItem[]>;
  onBack: () => void;
  onSave: (ids: string[], note: string) => void;
  /** Reports unsaved picks so the route can ask before they are dropped — on Back, swipe or Android back. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Existing picks, so reopening the screen edits rather than starts over. */
  initialSelected?: string[];
  initialNote?: string;
  patientName?: string;
  /**
   * The record is finalised. Picks only reach the server inside the write-up
   * PUT, which a finalised record refuses — so they cannot change any more.
   */
  readOnly?: boolean;
}) => {
  const [tab, setTab] = useState<Tab>('self_help_tool');
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [note, setNote] = useState(initialNote);

  const items = library.data;
  const list = useMemo(() => (items ?? []).filter((r) => r.itemType === tab), [items, tab]);

  const visible = expanded ? list : list.slice(0, PAGE);
  const chosen = (items ?? []).filter((r) => selected.includes(r.id));
  const dirty =
    note.trim() !== initialNote.trim() ||
    selected.length !== initialSelected.length ||
    selected.some((x) => !initialSelected.includes(x));

  const toggle = (r: CareHubItem) => {
    if (readOnly) return;
    setSelected((v) => (v.includes(r.id) ? v.filter((x) => x !== r.id) : [...v, r.id]));
  };

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  // the route guards removal when it listens; on its own the screen asks itself
  const back = () => (dirty && !onDirtyChange ? confirmDiscard(onBack, 'your picks') : onBack());

  return (
    <Screen
      testID="care-hub"
      background={colors.white}
      header={
        <ScreenHeader
          onBack={back}
          title="Care Hub Recommendation"
          subtitle={`Select self-help tools and education modules to recommend${patientName ? ` to ${patientName}` : ''}.`}
        />
      }
      footer={
        readOnly ? (
          <Text testID="care-locked" style={s.lockedText}>
            This consultation is complete, so its recommendations can no longer be changed.
          </Text>
        ) : (
          <Button
            testID="save-recommendations"
            label={chosen.length === 0 && initialSelected.length > 0 ? 'Clear recommendations' : `Save Recommendations${chosen.length ? ` (${chosen.length})` : ''}`}
            onPress={() => onSave(chosen.map((r) => r.id), note.trim())}
            disabled={!items || (!dirty && chosen.length === 0)}
          />
        )
      }
    >
      <View style={s.tabs}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <Pressable
              key={t.key}
              testID={`care-tab-${t.key}`}
              onPress={() => {
                setTab(t.key);
                setExpanded(false);
              }}
              style={[s.tab, on && s.tabOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Icon name={t.icon} size={15} color={on ? colors.surfie : colors.inkFaint} />
              <Text style={[s.tabText, on && s.tabTextOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {library.showSkeleton ? (
        <SkeletonRowList rows={3} avatar="none" />
      ) : library.error && !items ? (
        <SectionError testID="care-error" message="Could not load the Care Hub library." onRetry={library.retry} />
      ) : visible.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>Nothing published on this shelf yet.</Text>
        </View>
      ) : (
        <View style={s.grid}>
          {visible.map((r) => (
            <ResourceCard key={r.id} resource={r} selected={selected.includes(r.id)} onToggle={() => toggle(r)} />
          ))}
        </View>
      )}

      {list.length > PAGE && (
        <Pressable testID="care-more" onPress={() => setExpanded((v) => !v)} hitSlop={8} style={s.more} accessibilityRole="button">
          <Text style={s.moreText}>{expanded ? 'Show fewer' : `View more ${tab === 'self_help_tool' ? 'tools' : 'modules'}`}</Text>
          <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={14} color={colors.surfie} />
        </Pressable>
      )}

      <Text style={s.fieldLabel}>Selected Items ({chosen.length})</Text>
      {chosen.length === 0 ? (
        <View style={s.noneCard}>
          <Text style={s.noneText}>Nothing selected. Tap a card above to recommend it.</Text>
        </View>
      ) : (
        <View style={s.chosenCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chosenRow}>
            {chosen.map((r) => (
              <View key={r.id} style={s.chosen}>
                <Icon name={iconFor(r.itemType)} size={13} color={colors.surfie} />
                <Text style={s.chosenText} numberOfLines={1}>
                  {r.title}
                </Text>
                {!readOnly && (
                  <Pressable
                    testID={`remove-${r.id}`}
                    onPress={() => setSelected((v) => v.filter((x) => x !== r.id))}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${r.title}`}
                  >
                    <Icon name="close" size={14} color={colors.inkMuted} />
                  </Pressable>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={s.noteCard}>
        <Text style={s.noteTitle}>
          Note to patient <Text style={s.noteOptional}>(optional)</Text>
        </Text>
        <Text style={s.noteHint}>Add a short note to personalise these recommendations.</Text>
        <View style={s.noteBox}>
          <TextInput
            testID="care-note"
            value={note}
            onChangeText={(t) => setNote(t.slice(0, NOTE_MAX))}
            editable={!readOnly}
            multiline
            placeholder="e.g. Start with the breathing exercise each evening."
            placeholderTextColor={colors.inkFaint}
            style={s.noteInput}
            accessibilityLabel="Note to patient"
            underlineColorAndroid="transparent"
          />
          <Text style={s.noteCount}>
            {note.length}/{NOTE_MAX}
          </Text>
        </View>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  pressed: { opacity: 0.75 },
  lockedText: { ...typeStyles.caption, color: colors.inkMuted, textAlign: 'center' },
  fieldLabel: { ...typeStyles.label, color: colors.ink, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },


  tabs: { flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabOn: { borderBottomColor: colors.surfie },
  tabText: { ...typeStyles.bodySmall, color: colors.inkFaint },
  tabTextOn: { color: colors.surfie, fontWeight: fontWeight.semibold },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  card: {
    width: '48.5%',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  cardOn: { borderColor: colors.paris, backgroundColor: colors.surface.mintSoft },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.paris, alignItems: 'center', justifyContent: 'center' },
  tickEmpty: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.surface.inputBorder },
  cardTitle: { ...typeStyles.cardTitle, fontSize: 14, color: colors.ink, marginTop: spacing.sm },
  cardBlurb: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 3 },

  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44, marginTop: spacing.sm },
  moreText: { ...typeStyles.buttonSmall, color: colors.surfie },

  empty: { marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface.page },
  emptyText: { ...typeStyles.bodySmall, color: colors.inkMuted, textAlign: 'center' },

  chosenCard: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.surface.mintSoft,
  },
  chosenRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.sm },
  chosen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    maxWidth: 220,
  },
  chosenText: { ...typeStyles.caption, color: colors.ink, flexShrink: 1 },
  noneCard: { marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface.page },
  noneText: { ...typeStyles.caption, color: colors.inkMuted },

  noteCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  noteTitle: { ...typeStyles.cardTitle, color: colors.ink },
  noteOptional: { ...typeStyles.caption, color: colors.inkMuted },
  noteHint: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
  noteBox: {
    marginTop: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  noteInput: { ...typeStyles.input, color: colors.ink, minHeight: 64, textAlignVertical: 'top', padding: 0 },
  noteCount: { ...typeStyles.caption, fontSize: 11, color: colors.inkFaint, alignSelf: 'flex-end', marginTop: 4 },
});

export default CareHubScreen;
