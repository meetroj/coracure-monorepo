import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon, type IconName } from '../../components/Icon';
import { Screen, EmptyState } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ActionSheet } from '../../components/BottomSheet';
import { confirm } from '../../components/confirm';
import { toast } from '../../components/Toast';
import { useStore } from '../../state/store';
import { selectDoctor } from '../../state/selectors';
import { deleteTemplate, duplicateTemplate } from '../../state/actions';
import {
  TEMPLATE_FILTERS,
  canPrescribe,
  templateCounts,
  type ClinicalTemplate,
  type ProfessionalType,
  type TemplateKind,
} from '../../data/clinical';

/** "2 medicines" -> "2 Medicines" — the chips read as short labels, not sentences. */
const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

const FILTER_ICON: Partial<Record<(typeof TEMPLATE_FILTERS)[number]['key'], IconName>> = {
  medication: 'prescription',
  advice: 'heart',
  therapy: 'message',
  followUp: 'calendar',
  mine: 'user',
};

const SPECIALTY_ICON: Record<string, IconName> = {
  Psychiatry: 'brain',
  Psychology: 'headset',
  'De-addiction': 'anchor',
  Counselling: 'message',
};

const KIND_ICON: Record<TemplateKind, IconName> = {
  medication: 'prescription',
  advice: 'heart',
  therapy: 'message',
  followUp: 'calendar',
};

/**
 * Clinical Templates — DOC-CLN-03.
 *
 * Filtered by prescribing permission before anything is drawn: a
 * non-prescriber never sees a medication template, because showing one
 * disabled would imply it can be unlocked. Tapping a template applies it to
 * the open prescription — its medicines and advice are merged into the draft,
 * which stays editable; nothing is finalised. Duplicate and Delete live in the
 * card's menu, and only the doctor's own templates can be deleted.
 */
const TemplateCard = ({
  template,
  onApply,
  onMenu,
}: {
  template: ClinicalTemplate;
  onApply: () => void;
  onMenu: () => void;
}) => {
  const counts = templateCounts(template);
  return (
    <Pressable
      testID={`template-${template.id}`}
      onPress={onApply}
      style={({ pressed }) => [s.card, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Apply ${template.name}`}
      accessibilityHint="Adds its medicines and advice to this prescription"
    >
      <View style={s.cardIcon}>
        <Icon name={KIND_ICON[template.kind]} size={19} color={colors.surfie} />
      </View>
      <View style={s.cardCenter}>
        <Text style={s.cardTitle} numberOfLines={2}>
          {template.name}
        </Text>
        <View style={s.specRow}>
          <Icon name={SPECIALTY_ICON[template.specialty] ?? 'tag'} size={12} color={colors.surfie} />
          <Text style={s.spec}>{template.specialty}</Text>
          {template.mine && (
            <View style={s.mine}>
              <Text style={s.mineText}>Mine</Text>
            </View>
          )}
        </View>
        <Text style={s.cardBody} numberOfLines={2}>
          {template.description}
        </Text>
        <View style={s.countRow}>
          {counts.map((c) => (
            <View key={c} style={s.count}>
              <Text style={s.countText} numberOfLines={1}>
                {capitalize(c)}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Pressable
        testID={`template-menu-${template.id}`}
        onPress={onMenu}
        hitSlop={8}
        style={s.menuBtn}
        accessibilityRole="button"
        accessibilityLabel={`More options for ${template.name}`}
      >
        <Icon name="moreVertical" size={18} color={colors.inkMuted} />
      </Pressable>
    </Pressable>
  );
};

export const ClinicalTemplatesScreen = ({
  onBack,
  professionalType: typeProp,
  onApply,
  patientName,
}: {
  onBack: () => void;
  professionalType?: ProfessionalType;
  onApply: (id: string) => void;
  /** Whose prescription the template is applied to, for the subtitle. */
  patientName?: string;
}) => {
  const doctor = useStore(selectDoctor);
  const professionalType = typeProp ?? doctor.professionalType;
  const templates = useStore((st) => st.templates);
  const [filter, setFilter] = useState<(typeof TEMPLATE_FILTERS)[number]['key']>('all');
  const [query, setQuery] = useState('');
  const [menuFor, setMenuFor] = useState<ClinicalTemplate | null>(null);

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

  const filters = TEMPLATE_FILTERS.filter((f) => f.key !== 'medication' || canPrescribe(professionalType));

  return (
    <Screen
      testID="templates"
      header={
        <ScreenHeader
          onBack={onBack}
          title="Clinical Templates"
          subtitle={
            patientName
              ? `Tap a template to add it to ${patientName}'s prescription. You can edit everything afterwards.`
              : 'Manage your reusable prescription, advice and therapy-plan templates.'
          }
        />
      }
    >
      <View style={s.search}>
        <Icon name="search" size={16} color={colors.inkFaint} />
        <TextInput
          testID="template-search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search templates by name or keyword"
          placeholderTextColor={colors.inkFaint}
          style={s.searchInput}
          returnKeyType="search"
          accessibilityLabel="Search templates"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
            <Icon name="close" size={16} color={colors.inkFaint} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {filters.map((f) => {
          const on = filter === f.key;
          const icon = FILTER_ICON[f.key];
          return (
            <Pressable
              key={f.key}
              testID={`filter-${f.key}`}
              onPress={() => setFilter(f.key)}
              hitSlop={{ top: 4, bottom: 4 }}
              style={[s.chip, on && s.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              {icon && <Icon name={icon} size={13} color={on ? colors.white : colors.surfie} />}
              <Text style={[s.chipText, on && s.chipTextOn]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {visible.length === 0 ? (
        <EmptyState
          icon="notes"
          title="No templates"
          body={query ? `Nothing matches "${query}".` : 'No templates match this filter.'}
          actionLabel="Show all"
          onAction={() => {
            setQuery('');
            setFilter('all');
          }}
        />
      ) : (
        visible.map((t) => (
          <TemplateCard key={t.id} template={t} onApply={() => onApply(t.id)} onMenu={() => setMenuFor(t)} />
        ))
      )}

      {!canPrescribe(professionalType) && (
        <View testID="no-medication-templates" style={s.note}>
          <Icon name="lock" size={14} color={colors.surfie} />
          <Text style={s.noteText}>Medication templates are available only to authorised prescribing doctors.</Text>
        </View>
      )}

      <ActionSheet
        visible={!!menuFor}
        title={menuFor?.name}
        onClose={() => setMenuFor(null)}
        testID="template-actions"
        actions={
          menuFor
            ? [
                {
                  key: 'apply',
                  label: 'Apply to prescription',
                  icon: 'checkCircle',
                  onPress: () => onApply(menuFor.id),
                },
                {
                  key: 'duplicate',
                  label: 'Duplicate as my template',
                  icon: 'copy',
                  onPress: () => {
                    duplicateTemplate(menuFor.id);
                    toast.show(`${menuFor.name} duplicated`);
                  },
                },
                ...(menuFor.mine
                  ? [
                      {
                        key: 'delete',
                        label: 'Delete template',
                        icon: 'trash' as IconName,
                        destructive: true,
                        onPress: () =>
                          confirm({
                            title: `Delete ${menuFor.name}?`,
                            message: 'Prescriptions already written from it are not changed.',
                            confirmLabel: 'Delete',
                            destructive: true,
                            onConfirm: () => {
                              deleteTemplate(menuFor.id);
                              toast.show('Template deleted', 'info');
                            },
                          }),
                      },
                    ]
                  : []),
              ]
            : []
        }
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  pressed: { opacity: 0.8 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  searchInput: { ...typeStyles.inputSingle, flex: 1, height: 46, color: colors.ink },

  chips: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  chipOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  chipText: { ...typeStyles.status, color: colors.inkMuted },
  chipTextOn: { color: colors.white, fontWeight: fontWeight.semibold },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: 14,
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardCenter: { flex: 1, minWidth: 0 },
  cardTitle: { ...typeStyles.cardTitle, color: colors.ink },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  spec: { ...typeStyles.caption, color: colors.surfie },
  mine: {
    backgroundColor: colors.surface.selected,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 1,
    marginLeft: 2,
  },
  mineText: { ...typeStyles.caption, fontSize: 11, lineHeight: 15, color: colors.surfie },
  cardBody: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 4 },
  countRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  count: {
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countText: { ...typeStyles.caption, fontSize: 11, lineHeight: 15, color: colors.surfie },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -10, marginRight: -10 },

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
});

export default ClinicalTemplatesScreen;
