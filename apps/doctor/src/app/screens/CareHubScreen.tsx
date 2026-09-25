import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon, type IconName } from '../../components/Icon';
import { Screen, Button } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { confirmDiscard } from '../../components/confirm';
import { careResources, CARE_CONDITIONS, NOTE_MAX, type CareResource } from '../../data/followup';

/**
 * Care Hub Recommendations — DOC-FUP-04 / DR-15-06.
 *
 * Opened from the advice step of the write-up, so the picks belong to one
 * consultation. Only published, clinically reviewed content can be selected;
 * anything awaiting review renders locked, so the doctor can see it exists and
 * why it cannot be sent. Saving with nothing selected clears the
 * recommendations — it never deletes a resource.
 */

type Tab = 'tool' | 'education';

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'tool', label: 'Tools', icon: 'tools' },
  { key: 'education', label: 'Modules', icon: 'notes' },
];

/** How many cards show before "View more". */
const PAGE = 6;

const ResourceCard = ({ resource, selected, onToggle }: { resource: CareResource; selected: boolean; onToggle: () => void }) => {
  const locked = !resource.reviewed;
  return (
    <Pressable
      testID={`care-${resource.id}`}
      onPress={locked ? undefined : onToggle}
      disabled={locked}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: locked }}
      accessibilityLabel={resource.title}
      style={({ pressed }) => [s.card, selected && s.cardOn, locked && s.cardLocked, pressed && !locked && s.pressed]}
    >
      <View style={s.cardTop}>
        <View style={s.cardIcon}>
          <Icon name={resource.icon} size={17} color={locked ? colors.inkFaint : colors.surfie} />
        </View>
        {locked ? (
          <Icon name="lock" size={14} color={colors.inkFaint} />
        ) : selected ? (
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
      <Text style={s.cardBlurb} numberOfLines={3}>
        {resource.blurb}
      </Text>
      {locked && <Text style={s.lockedNote}>Awaiting review</Text>}
      {resource.requiresConsent && <Text style={s.consentNote}>Requires patient consent before sharing</Text>}
    </Pressable>
  );
};

export const CareHubScreen = ({
  onBack,
  onSave,
  initialSelected = [],
  initialNote = '',
  patientName,
  onDirtyChange,
}: {
  onBack: () => void;
  onSave: (ids: string[], note: string) => void;
  /** Reports unsaved picks so the route can ask before they are dropped — on Back, swipe or Android back. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Existing picks, so reopening the screen edits rather than starts over. */
  initialSelected?: string[];
  initialNote?: string;
  patientName?: string;
}) => {
  const [tab, setTab] = useState<Tab>('tool');
  const [condition, setCondition] = useState<string>(CARE_CONDITIONS[0]);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [note, setNote] = useState(initialNote);

  const list = useMemo(() => {
    const all = careResources.filter((r) => r.published && r.kind === tab);
    if (condition === CARE_CONDITIONS[0]) return all;
    return all.filter((r) => r.conditions.includes(condition));
  }, [tab, condition]);

  const visible = expanded ? list : list.slice(0, PAGE);
  const chosen = careResources.filter((r) => selected.includes(r.id));
  const dirty =
    note.trim() !== initialNote.trim() ||
    selected.length !== initialSelected.length ||
    selected.some((x) => !initialSelected.includes(x));

  const toggle = (r: CareResource) => {
    if (!r.reviewed) return;
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
        <Button
          testID="save-recommendations"
          label={chosen.length === 0 && initialSelected.length > 0 ? 'Clear recommendations' : `Save Recommendations${chosen.length ? ` (${chosen.length})` : ''}`}
          onPress={() => onSave(selected, note.trim())}
          disabled={!dirty && chosen.length === 0}
        />
      }
    >
      <Text style={s.fieldLabel}>Filter by condition</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.condRow}>
        {CARE_CONDITIONS.map((cnd) => {
          const on = condition === cnd;
          return (
            <Pressable
              key={cnd}
              testID={`cond-${cnd}`}
              onPress={() => {
                setCondition(cnd);
                setExpanded(false);
              }}
              style={[s.cond, on && s.condOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              {cnd !== CARE_CONDITIONS[0] && <Icon name="tag" size={12} color={on ? colors.white : colors.inkMuted} />}
              <Text style={[s.condText, on && s.condTextOn]}>{cnd}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

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

      {visible.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No published resources for this condition yet.</Text>
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
          <Text style={s.moreText}>{expanded ? 'Show fewer' : `View more ${tab === 'tool' ? 'tools' : 'modules'}`}</Text>
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
                <Icon name={r.icon} size={13} color={colors.surfie} />
                <Text style={s.chosenText} numberOfLines={1}>
                  {r.title}
                </Text>
                <Pressable
                  testID={`remove-${r.id}`}
                  onPress={() => setSelected((v) => v.filter((x) => x !== r.id))}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${r.title}`}
                >
                  <Icon name="close" size={14} color={colors.inkMuted} />
                </Pressable>
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
            multiline
            placeholder="e.g. Start with the breathing exercise each evening."
            placeholderTextColor={colors.inkFaint}
            style={s.noteInput}
            accessibilityLabel="Note to patient"
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
  fieldLabel: { ...typeStyles.label, color: colors.ink, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },

  condRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 2 },
  cond: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  condOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  condText: { ...typeStyles.caption, color: colors.inkMuted },
  condTextOn: { color: colors.white, fontWeight: fontWeight.semibold },

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
  cardLocked: { backgroundColor: colors.surface.page },
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
  lockedNote: { ...typeStyles.caption, fontSize: 11, color: colors.warn, marginTop: 4 },
  consentNote: { ...typeStyles.caption, fontSize: 11, color: colors.warn, marginTop: 4 },

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
