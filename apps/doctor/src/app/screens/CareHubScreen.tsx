import { typeStyles, fontWeight } from '../../../../../libs/typography/src';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon, type IconName } from '../../components/Icon';
import {
  careResources,
  CARE_CONDITIONS,
  NOTE_MAX,
  type CareResource,
} from '../../data/followup';

/**
 * Care Hub Recommendations — DOC-FUP-04 / DR-15-06.
 *
 * Opened from the advice step of the write-up, so the picks belong to one
 * consultation. Only published, clinically reviewed content can be selected:
 * anything else renders locked rather than hidden, so the doctor can see it
 * exists and why it cannot be sent. Deselecting removes the recommendation —
 * it never deletes the underlying resource.
 */

type Tab = 'tool' | 'education';

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'tool', label: 'Tools', icon: 'tools' },
  { key: 'education', label: 'Modules', icon: 'notes' },
];

/** How many cards show before "View more". */
const PAGE = 6;

const ResourceCard = ({
  resource,
  selected,
  onToggle,
}: {
  resource: CareResource;
  selected: boolean;
  onToggle: () => void;
}) => {
  const locked = !resource.reviewed;
  return (
    <Pressable
      testID={`care-${resource.id}`}
      onPress={locked ? undefined : onToggle}
      disabled={locked}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: locked }}
      accessibilityLabel={resource.title}
      style={({ pressed }) => [
        s.card,
        selected && s.cardOn,
        locked && s.cardLocked,
        pressed && !locked && s.pressed,
      ]}
    >
      <View style={s.cardTop}>
        <View style={s.cardIcon}>
          <Icon name={resource.icon} size={17} color={locked ? colors.inkFaint : colors.surfie} />
        </View>
        {locked ? (
          <Icon name="lock" size={14} color={colors.inkFaint} />
        ) : selected ? (
          <View style={s.tick}>
            <Icon name="check" size={11} color={colors.white} />
          </View>
        ) : (
          <View style={s.tickEmpty} />
        )}
      </View>
      <Text style={[typeStyles.body, s.cardTitle]} numberOfLines={2}>{resource.title}</Text>
      <Text style={[typeStyles.body, s.cardBlurb]} numberOfLines={3}>{resource.blurb}</Text>
      {locked && <Text style={[typeStyles.body, s.lockedNote]}>Awaiting review</Text>}
      {/* Consent-gated material says so on the card, not after the fact. */}
      {resource.requiresConsent && (
        <Text style={[typeStyles.body, s.consentNote]}>
          Requires patient consent before sharing
        </Text>
      )}
    </Pressable>
  );
};

export const CareHubScreen = ({
  onBack,
  onSave,
  initialSelected = [],
  initialNote = '',
}: {
  onBack: () => void;
  onSave: (ids: string[], note: string) => void;
  /** Existing picks, so reopening the screen edits rather than starts over. */
  initialSelected?: string[];
  initialNote?: string;
}) => {
  const insets = useSafeAreaInsets();
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

  const toggle = (r: CareResource) => {
    if (!r.reviewed) return;
    setSelected((v) => (v.includes(r.id) ? v.filter((x) => x !== r.id) : [...v, r.id]));
  };

  return (
    <View style={s.root}>
      <ScrollView
        style={s.flex}
        contentContainerStyle={[s.content, { paddingTop: insets.top + spacing.sm }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ---------------------------------- bar ---------------------------------- */}
        <View style={s.bar}>
          <Pressable
            testID="back"
            onPress={onBack}
            hitSlop={8}
            style={s.barBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Icon name="arrowLeft" size={19} color={colors.ink} />
          </Pressable>
          <View style={s.barLogo}>
            <LogoWide width={104} height={26} />
          </View>
          <Pressable hitSlop={8} style={s.barBtn} accessibilityRole="button" accessibilityLabel="Notifications">
            <Icon name="bell" size={18} color={colors.ink} />
            <View style={s.barDot} />
          </Pressable>
        </View>

        <View style={s.titleWrap}>
          <Text style={[typeStyles.body, s.title]}>Care Hub Recommendation</Text>
          <Text style={[typeStyles.body, s.subtitle]}>
            Select self-help tools and education modules to recommend to your patient.
          </Text>
        </View>

        {/* ------------------------------- conditions ------------------------------ */}
        <Text style={[typeStyles.body, s.fieldLabel]}>Filter by Condition</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.condRow}
        >
          {CARE_CONDITIONS.map((cnd) => {
            const on = condition === cnd;
            return (
              <Pressable
                key={cnd}
                testID={`cond-${cnd}`}
                onPress={() => { setCondition(cnd); setExpanded(false); }}
                style={[s.cond, on && s.condOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                {cnd !== CARE_CONDITIONS[0] && (
                  <Icon name="tag" size={12} color={on ? colors.white : colors.inkMuted} />
                )}
                <Text style={[typeStyles.body, s.condText, on && s.condTextOn]}>{cnd}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ---------------------------------- tabs --------------------------------- */}
        <View style={s.tabs}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <Pressable
                key={t.key}
                testID={`care-tab-${t.key}`}
                onPress={() => { setTab(t.key); setExpanded(false); }}
                style={[s.tab, on && s.tabOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Icon name={t.icon} size={15} color={on ? colors.surfie : colors.inkFaint} />
                <Text style={[typeStyles.body, s.tabText, on && s.tabTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ---------------------------------- grid --------------------------------- */}
        {visible.length === 0 ? (
          <View style={s.empty}>
            <Text style={[typeStyles.body, s.emptyText]}>
              No published resources for this condition yet.
            </Text>
          </View>
        ) : (
          <View style={s.grid}>
            {visible.map((r) => (
              <ResourceCard
                key={r.id}
                resource={r}
                selected={selected.includes(r.id)}
                onToggle={() => toggle(r)}
              />
            ))}
          </View>
        )}

        {list.length > PAGE && (
          <Pressable
            testID="care-more"
            onPress={() => setExpanded((v) => !v)}
            hitSlop={8}
            style={s.more}
            accessibilityRole="button"
          >
            <Text style={[typeStyles.body, s.moreText]}>
              {expanded ? 'View fewer' : `View more ${tab === 'tool' ? 'tools' : 'modules'}`}
            </Text>
            <Icon name={expanded ? 'chevronDown' : 'chevronDown'} size={14} color={colors.surfie} />
          </Pressable>
        )}

        {/* -------------------------------- selected ------------------------------- */}
        <Text style={[typeStyles.body, s.fieldLabel]}>Selected Items ({chosen.length})</Text>
        {chosen.length === 0 ? (
          <View style={s.noneCard}>
            <Text style={[typeStyles.body, s.noneText]}>
              Nothing selected yet. Tap a card above to recommend it.
            </Text>
          </View>
        ) : (
          // One swipeable line inside a card — a long list scrolls sideways
          // rather than stacking and pushing the note off screen.
          <View style={s.chosenCard}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chosenRow}
            >
              {chosen.map((r) => (
                <View key={r.id} style={s.chosen}>
                  <Icon name={r.icon} size={13} color={colors.surfie} />
                  <Text style={[typeStyles.body, s.chosenText]} numberOfLines={1}>{r.title}</Text>
                  <Pressable
                    testID={`remove-${r.id}`}
                    onPress={() => setSelected((v) => v.filter((x) => x !== r.id))}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${r.title}`}
                  >
                    <Icon name="close" size={13} color={colors.inkMuted} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ---------------------------------- note --------------------------------- */}
        <View style={s.noteCard}>
          <View style={s.noteHead}>
            <View style={s.noteIcon}>
              <Icon name="message" size={13} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.noteTitle]}>
                Note to Patient <Text style={s.noteOptional}>(optional)</Text>
              </Text>
              <Text style={[typeStyles.body, s.noteHint]}>
                Add a short note to personalise these recommendations.
              </Text>
            </View>
          </View>
          <View style={s.noteBox}>
            <TextInput
              testID="care-note"
              value={note}
              onChangeText={(t) => setNote(t.slice(0, NOTE_MAX))}
              multiline
              placeholder="These resources can help you manage stress, improve sleep quality, and strengthen your support system."
              placeholderTextColor={colors.inkFaint}
              style={[typeStyles.body, s.noteInput]}
            />
            <Text style={[typeStyles.body, s.noteCount]}>{note.length}/{NOTE_MAX}</Text>
          </View>
        </View>
      </ScrollView>

      {/* --------------------------------- footer -------------------------------- */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          testID="save-recommendations"
          onPress={() => onSave(selected, note.trim())}
          disabled={chosen.length === 0}
          style={[s.cta, chosen.length === 0 && s.ctaOff]}
          accessibilityRole="button"
          accessibilityState={{ disabled: chosen.length === 0 }}
        >
          <Text style={[typeStyles.body, s.ctaText]}>Save Recommendations</Text>
          <View style={s.ctaArrow}>
            <Icon name="arrowRight" size={17} color={colors.ink} />
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  content: { paddingBottom: spacing.xl },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  barBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barLogo: { flex: 1, alignItems: 'center' },
  barDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.paris,
  },

  titleWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  title: { fontFamily: typography.heading.family, fontSize: 22, lineHeight: 28, fontWeight: fontWeight.semibold, color: colors.ink },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 4 },

  fieldLabel: {
    ...typeStyles.label,
    color: colors.ink,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  /* condition chips */
  condRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 2 },
  cond: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  condOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  condText: { ...typeStyles.caption, color: colors.inkMuted },
  condTextOn: { color: colors.white, fontWeight: fontWeight.semibold },

  /* tabs */
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabOn: { borderBottomColor: colors.surfie },
  tabText: { ...typeStyles.bodySmall, color: colors.inkFaint },
  tabTextOn: { color: colors.surfie, fontWeight: fontWeight.semibold },

  /* resource grid — two per row, wrapping */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  card: {
    // Two columns: half the row minus half the gap.
    width: '48.5%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  cardOn: { borderColor: colors.paris, backgroundColor: colors.surface.mintSoft },
  cardLocked: { backgroundColor: colors.surface.page },
  pressed: { opacity: 0.75 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.paris,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickEmpty: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.surface.inputBorder,
  },
  cardTitle: { ...typeStyles.cardTitle, color: colors.ink, marginTop: spacing.sm },
  cardBlurb: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 3 },
  lockedNote: { ...typeStyles.caption, fontSize: 10, color: colors.warn, marginTop: 4 },
  consentNote: { ...typeStyles.caption, fontSize: 10, color: colors.warn, marginTop: 4 },

  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: spacing.md },
  moreText: { ...typeStyles.buttonSmall, color: colors.surfie },

  empty: { marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg, borderRadius: 14, backgroundColor: colors.surface.page },
  emptyText: { ...typeStyles.bodySmall, color: colors.inkMuted, textAlign: 'center' },

  /* selected chips */
  // Minimal radius on the container; chips sit white on the mint field.
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
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    maxWidth: 200,
  },
  chosenText: { ...typeStyles.caption, color: colors.ink, flexShrink: 1 },
  noneCard: { marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: 14, backgroundColor: colors.surface.page },
  noneText: { ...typeStyles.caption, color: colors.inkMuted },

  /* note */
  noteCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  noteHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noteIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
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
  noteInput: { ...typeStyles.bodySmall, color: colors.ink, minHeight: 56, textAlignVertical: 'top', padding: 0 },
  noteCount: { ...typeStyles.caption, fontSize: 10, color: colors.inkFaint, alignSelf: 'flex-end', marginTop: 4 },

  /* footer */
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfie,
  },
  ctaOff: { backgroundColor: colors.inkFaint },
  ctaText: { ...typeStyles.button, flex: 1, textAlign: 'center', color: colors.white },
  ctaArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.paris,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CareHubScreen;
