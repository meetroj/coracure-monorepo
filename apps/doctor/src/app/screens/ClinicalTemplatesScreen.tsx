import { typeStyles, fontWeight } from '../../../../../libs/typography/src';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing, typography, shadow } from '../../theme/brand';
import { Icon, type IconName } from '../../components/Icon';
import { Screen } from '../../components/ui';
import { doctor } from '../../data/doctor';
import {
  TEMPLATE_FILTERS,
  canPrescribe,
  clinicalTemplates,
  templateCounts,
  type ClinicalTemplate,
  type ProfessionalType,
  type TemplateKind,
} from '../../data/clinical';

/** "2 medicines" -> "2 Medicines" — the chips read as short labels, not sentences. */
const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

/** Below this width the action captions would start crowding the description. */
const ACTION_LABEL_MIN_WIDTH = 340;

/** Icon per filter chip — purely presentational, layered onto the existing kind/mine filters. */
const FILTER_ICON: Partial<Record<(typeof TEMPLATE_FILTERS)[number]['key'], IconName>> = {
  medication: 'prescription',
  advice: 'heart',
  therapy: 'message',
  followUp: 'calendar',
  mine: 'user',
};

/** Icon per specialty, shown inline on the card next to the specialty name. */
const SPECIALTY_ICON: Record<string, IconName> = {
  Psychiatry: 'brain',
  Psychology: 'headset',
  'De-addiction': 'anchor',
  Counselling: 'message',
};

/**
 * Clinical Templates — DOC-CLN-03.
 *
 * Templates are filtered by prescribing permission before anything is drawn: a
 * non-prescriber never sees a medication template at all, because showing one
 * disabled would imply it can be unlocked.
 *
 * Applying a template produces editable consultation-specific content — it
 * never finalises a record, and editing a template does not rewrite records
 * already finalised from it.
 */

const KIND_ICON: Record<TemplateKind, IconName> = {
  medication: 'prescription',
  advice: 'heart',
  therapy: 'message',
  followUp: 'calendar',
};

const TemplateCard = ({
  template,
  onApply,
  onEdit,
  onDuplicate,
  onDelete,
  showActionLabels,
}: {
  template: ClinicalTemplate;
  onApply: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  showActionLabels: boolean;
}) => {
  const counts = templateCounts(template);

  return (
    <Pressable
      testID={`template-${template.id}`}
      onPress={() => onApply(template.id)}
      style={s.card}
      accessibilityRole="button"
      accessibilityLabel={template.name}
    >
      <Pressable
        onPress={(e) => e.stopPropagation()}
        hitSlop={8}
        style={s.moreBtn}
        accessibilityRole="button"
        accessibilityLabel={`More options for ${template.name}`}
      >
        <Icon name="moreVertical" size={16} color={colors.inkFaint} />
      </Pressable>

      <View style={s.cardIcon}>
        <Icon name={KIND_ICON[template.kind]} size={19} color={colors.surfie} />
      </View>

      {/* flex: 1 + minWidth: 0 — the only way this column actually shrinks
          instead of pushing the fixed-width actions off the card. */}
      <View style={s.cardCenter}>
        <Text style={[typeStyles.body, s.cardTitle]} numberOfLines={1}>
          {template.name}
        </Text>
        <View style={s.specRow}>
          <Icon name={SPECIALTY_ICON[template.specialty] ?? 'tag'} size={11} color={colors.surfie} />
          <Text style={[typeStyles.body, s.spec]}>{template.specialty}</Text>
          {template.mine && (
            <View style={s.mine}>
              <Text style={[typeStyles.body, s.mineText]}>Mine</Text>
            </View>
          )}
        </View>
        <Text style={[typeStyles.body, s.cardBody]} numberOfLines={2}>
          {template.description}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.countRow}
        >
          {counts.map((c) => (
            <View key={c} style={s.count}>
              <Text style={[typeStyles.body, s.countText]} numberOfLines={1}>{capitalize(c)}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Fixed-width, never a flex item — this is what actually reserves the
          space so cardCenter shrinks around it instead of the reverse. */}
      <View style={s.actions}>
        {(
          [
            ['Edit', 'pencil', onEdit],
            ['Duplicate', 'copy', onDuplicate],
            ['Delete', 'trash', onDelete],
          ] as [string, IconName, (id: string) => void][]
        ).map(([label, icon, fn]) => (
          <View key={label} style={s.action}>
            <Pressable
              testID={`${label.toLowerCase()}-${template.id}`}
              onPress={(e) => {
                // The whole card is itself a Pressable (apply-on-tap) — without
                // this, Android sometimes resolves the touch to the card
                // underneath instead of this nested button.
                e.stopPropagation();
                fn(template.id);
              }}
              hitSlop={6}
              style={[s.actionIcon, label === 'Delete' && s.actionIconDanger]}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${template.name}`}
            >
              <Icon name={icon} size={15} color={label === 'Delete' ? colors.danger : colors.surfie} />
            </Pressable>
            {/* Label hides below ACTION_LABEL_MIN_WIDTH, but accessibilityLabel
                above stays — screen readers never lose the action's name. */}
            {showActionLabels && (
              <Text
                style={[typeStyles.body, [s.actionText, label === 'Delete' && s.actionDanger]]}
                numberOfLines={1}
              >
                {label}
              </Text>
            )}
          </View>
        ))}
      </View>
    </Pressable>
  );
};

export const ClinicalTemplatesScreen = ({
  onBack,
  professionalType = doctor.professionalType,
  onApply = () => undefined,
  onCreate = () => undefined,
  // No template-editor screen exists yet anywhere in the app — this is a
  // placeholder seam for whoever wires one up, not a working action.
  onEdit = () => undefined,
}: {
  onBack: () => void;
  professionalType?: ProfessionalType;
  onApply?: (id: string) => void;
  onCreate?: () => void;
  onEdit?: (id: string) => void;
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<(typeof TEMPLATE_FILTERS)[number]['key']>('all');
  const [query, setQuery] = useState('');
  // Local, mutable copy — Duplicate and Delete act on this, never on the
  // shared fixture array, so other screens' data stays untouched.
  const [templates, setTemplates] = useState<ClinicalTemplate[]>(clinicalTemplates);

  // Permission is applied before any other filter, never after.
  const permitted = useMemo(
    () => templates.filter((tpl) => (tpl.medicines > 0 ? canPrescribe(professionalType) : true)),
    [templates, professionalType]
  );

  const visible = useMemo(() => {
    let list = permitted;
    if (filter === 'mine') list = list.filter((t) => t.mine);
    else if (filter !== 'all') list = list.filter((t) => t.kind === filter);

    const q = query.trim().toLowerCase();
    if (q) list = list.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    return list;
  }, [permitted, filter, query]);

  const filters = TEMPLATE_FILTERS.filter(
    (f) => f.key !== 'medication' || canPrescribe(professionalType)
  );

  const handleDuplicate = (id: string) => {
    setTemplates((list) => {
      const i = list.findIndex((t) => t.id === id);
      if (i === -1) return list;
      const copy: ClinicalTemplate = {
        ...list[i],
        id: `${list[i].id}-copy-${list.length}`,
        name: `${list[i].name} (Copy)`,
        mine: true,
      };
      return [...list.slice(0, i + 1), copy, ...list.slice(i + 1)];
    });
  };

  const handleDelete = (id: string) => {
    setTemplates((list) => list.filter((t) => t.id !== id));
  };

  return (
    <View style={s.root}>
      <Screen contentStyle={s.content}>
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
            <LogoWide width={100} height={25} />
          </View>
          <Pressable
            hitSlop={8}
            style={s.barBtn}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Icon name="bell" size={18} color={colors.ink} />
          </Pressable>
        </View>

        <View style={s.titleWrap}>
          <Text style={[typeStyles.body, s.title]}>Clinical Templates</Text>
          <Text style={[typeStyles.body, s.subtitle]}>
            Manage your reusable prescription, advice and therapy-plan templates.
          </Text>
        </View>

        <View style={s.searchRow}>
          <View style={s.search}>
            <Icon name="search" size={16} color={colors.inkFaint} />
            <TextInput
              testID="template-search"
              value={query}
              onChangeText={setQuery}
              placeholder="Search templates by name or keyword..."
              placeholderTextColor={colors.inkFaint}
              style={s.searchInput}
            />
          </View>
          <Pressable hitSlop={8} style={s.sortBtn} accessibilityRole="button" accessibilityLabel="Sort templates">
            <Icon name="sort" size={16} color={colors.surfie} />
          </Pressable>
        </View>

        <View style={s.chipRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chips}
          >
            {filters.map((f) => {
              const on = filter === f.key;
              const icon = FILTER_ICON[f.key];
              return (
                <Pressable
                  key={f.key}
                  testID={`filter-${f.key}`}
                  onPress={() => setFilter(f.key)}
                  style={[s.chip, on && s.chipOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  {icon && <Icon name={icon} size={13} color={on ? colors.white : colors.surfie} />}
                  <Text style={[typeStyles.body, [s.chipText, on && s.chipTextOn]]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {visible.length === 0 ? (
          <View style={s.empty}>
            <Text style={[typeStyles.body, s.emptyText]}>No templates match this filter.</Text>
          </View>
        ) : (
          visible.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onApply={onApply}
              onEdit={onEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              showActionLabels={width >= ACTION_LABEL_MIN_WIDTH}
            />
          ))
        )}

        {!canPrescribe(professionalType) && (
          <View testID="no-medication-templates" style={s.note}>
            <Icon name="lock" size={14} color={colors.surfie} />
            <Text style={[typeStyles.body, s.noteText]}>
              Medication templates are available only to authorised prescribing doctors.
            </Text>
          </View>
        )}
      </Screen>

      <Pressable
        testID="create-template"
        onPress={onCreate}
        style={[s.fab, { bottom: Math.max(insets.bottom, spacing.lg) + spacing.md }]}
        accessibilityRole="button"
        accessibilityLabel="Create template"
      >
        <Icon name="plus" size={24} color={colors.white} />
      </Pressable>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },
  content: { paddingBottom: 96 },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
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

  titleWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { ...typeStyles.pageTitle, color: colors.ink },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 3 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  searchInput: { ...typeStyles.body, flex: 1, color: colors.ink, padding: 0 },
  sortBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chipRow: { flexDirection: 'row', alignItems: 'center' },
  chips: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  chipOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  chipText: { ...typeStyles.status, color: colors.inkMuted },
  chipTextOn: { color: colors.white, fontWeight: fontWeight.semibold },

  // One row: icon, flexible content, fixed-width actions. Compact by design —
  // ~14px padding + a tight type scale keeps the whole card near 105-115px
  // regardless of how many metadata chips a given template has.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: 14,
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  moreBtn: { position: 'absolute', top: 10, right: 10, zIndex: 1 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // flex: 1 + minWidth: 0 is what actually lets this column shrink for the
  // fixed-width actions instead of pushing them past the card's edge.
  cardCenter: { flex: 1, minWidth: 0 },
  // paddingRight clears the absolutely-positioned three-dot button above.
  cardTitle: { ...typeStyles.cardTitle, fontSize: 14, lineHeight: 17, color: colors.ink, paddingRight: 18 },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  spec: { ...typeStyles.caption, fontSize: 11, color: colors.surfie },
  mine: {
    backgroundColor: colors.surface.selected,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 2,
  },
  mineText: { ...typeStyles.caption, fontSize: 9.5, color: colors.surfie },

  cardBody: {
    ...typeStyles.caption,
    fontSize: 11,
    lineHeight: 14,
    color: colors.inkMuted,
    marginTop: 4,
  },
  // A horizontal scroller, not a wrap: extra count chips scroll off to the
  // right instead of stacking onto their own lines below the card body.
  countRow: { flexDirection: 'row', gap: 6, marginTop: 5 },
  count: {
    flexShrink: 0,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countText: { ...typeStyles.number, fontSize: 10, color: colors.surfie },

  // Never a flex item — this fixed width is the "reserved space" for the
  // three actions; cardCenter (flex: 1, minWidth: 0) yields around it.
  actions: { flexDirection: 'row', flexShrink: 0, gap: spacing.sm },
  action: { width: 40, alignItems: 'center', gap: 2 },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconDanger: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
  actionText: { fontSize: 9, lineHeight: 11, color: colors.surfie, textAlign: 'center' },
  actionDanger: { color: colors.danger },

  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface.mint,
    borderRadius: 12,
  },
  noteText: { ...typeStyles.caption, flex: 1, color: colors.surfie },

  empty: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xxxl, alignItems: 'center' },
  emptyText: { ...typeStyles.body, color: colors.inkMuted },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
});

export default ClinicalTemplatesScreen;
