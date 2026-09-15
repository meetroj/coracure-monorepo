import { typeStyles } from '../../../../libs/typography/src';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../theme/brand';
import { Icon } from './Icon';
import { Button } from './ui';
import {
  MANUAL_STATUSES,
  AUTO_STATUSES,
  STATUS_LABEL,
  STATUS_META,
  type LiveStatus,
  type ManualStatus,
} from '../data/doctor';

/**
 * Doctor status picker, presented as a bottom sheet.
 *
 * Manual statuses are selectable radios; the automatic ones are listed for
 * transparency but can never be chosen — the system owns them. The selection
 * is staged locally and only committed on "Save Status", so dismissing the
 * sheet leaves the live status untouched.
 */
export const StatusSheet = ({
  visible,
  current,
  onClose,
  onSave,
}: {
  visible: boolean;
  current: LiveStatus;
  onClose: () => void;
  onSave: (s: ManualStatus) => void;
}) => {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<ManualStatus>(
    (MANUAL_STATUSES.find((m) => m.key === current)?.key ?? 'offline') as ManualStatus
  );

  // re-sync whenever the sheet is reopened, so a dismissed edit is discarded
  useEffect(() => {
    if (visible) {
      setDraft((MANUAL_STATUSES.find((m) => m.key === current)?.key ?? 'offline') as ManualStatus);
    }
  }, [visible, current]);

  const renderIcon = (key: LiveStatus, size = 18) => {
    const meta = STATUS_META[key];
    if (meta.icon === 'dot') {
      return <View style={[s.dot, { backgroundColor: meta.fg }]} />;
    }
    return <Icon name={meta.icon} size={size} color={meta.fg} />;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close status picker" />

      <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={s.handle} />

        <Text style={[typeStyles.body, s.title]}>Doctor Status</Text>
        <Text style={[typeStyles.body, s.subtitle]}>Manage how you receive consultations</Text>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          <Text style={[typeStyles.body, s.sectionLabel]}>You can select</Text>

          {MANUAL_STATUSES.map((m) => {
            const selected = draft === m.key;
            const meta = STATUS_META[m.key];
            return (
              <Pressable
                key={m.key}
                testID={`sheet-status-${m.key}`}
                onPress={() => setDraft(m.key)}
                style={[s.row, selected && s.rowSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <View style={[s.rowIcon, { backgroundColor: meta.bg }]}>{renderIcon(m.key)}</View>
                <View style={s.flex}>
                  <Text style={[typeStyles.body, s.rowTitle]}>{m.label}</Text>
                  <Text style={[typeStyles.body, s.rowBody]}>{meta.description}</Text>
                </View>
                {selected ? (
                  <Icon name="checkCircle" size={24} color={colors.surfie} filled />
                ) : (
                  <View style={s.radio} />
                )}
              </Pressable>
            );
          })}

          <View style={s.divider} />
          <Text style={[typeStyles.body, s.sectionLabel]}>Updates automatically</Text>

          {AUTO_STATUSES.map((a) => {
            const meta = STATUS_META[a];
            return (
              <View key={a} style={s.row} testID={`sheet-auto-${a}`}>
                <View style={[s.rowIcon, { backgroundColor: meta.bg }]}>{renderIcon(a)}</View>
                <View style={s.flex}>
                  <Text style={[typeStyles.body, s.rowTitle]}>{STATUS_LABEL[a]}</Text>
                  <Text style={[typeStyles.body, s.rowBody]}>{meta.description}</Text>
                </View>
                <View style={s.autoBadge}>
                  <Text style={[typeStyles.body, s.autoBadgeText]}>Automatic</Text>
                </View>
              </View>
            );
          })}

          <View style={s.note}>
            <Icon name="info" size={18} color={colors.surfie} />
            <Text style={[typeStyles.body, s.noteText]}>
              Automatic statuses change based on your consultation activity and cannot be selected
              manually.
            </Text>
          </View>
        </ScrollView>

        <Button testID="save-status" label="Save Status" onPress={() => onSave(draft)} style={s.saveBtn} />
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,32,29,0.45)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface.inputBorder,
    marginBottom: spacing.lg,
  },
  title: { ...typeStyles.pageTitle, color: colors.ink },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 2, marginBottom: spacing.lg },
  sectionLabel: { ...typeStyles.label, color: colors.ink, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    marginBottom: spacing.sm,
  },
  rowSelected: { borderColor: colors.paris, backgroundColor: colors.surface.mintSoft },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  rowTitle: { ...typeStyles.cardTitle, color: colors.ink },
  rowBody: { ...typeStyles.body, color: colors.inkMuted, marginTop: 1 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.surface.inputBorder,
  },
  autoBadge: {
    backgroundColor: colors.surface.selected,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  autoBadgeText: { ...typeStyles.status, color: colors.surfie },
  divider: { height: 1, backgroundColor: colors.surface.line, marginVertical: spacing.md },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  noteText: { ...typeStyles.caption, flex: 1, color: colors.inkMuted },
  saveBtn: { marginTop: spacing.lg },
});

export default StatusSheet;
