import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing } from '../theme/brand';
import { typeStyles } from '../theme/typography';
import { Icon } from './Icon';
import { Button } from './ui';
import { BottomSheet } from './BottomSheet';
import { MANUAL_STATUSES, STATUS_META, type LiveStatus, type ManualStatus } from '../data/doctor';

/**
 * Doctor status picker.
 *
 * Manual statuses are selectable; the automatic ones (in a consultation,
 * completing notes) belong to the system and are never offered. The pick is
 * staged and only committed on "Save status", so dismissing the sheet leaves
 * the live status untouched.
 *
 * "Scheduled only" does not take its own hours: it follows the weekly
 * schedule, which is shown here for today with a way to edit it — one source
 * of truth for when the doctor can be booked.
 */
export const StatusSheet = ({
  visible,
  current,
  onClose,
  onSave,
  todayHours,
  onEditSchedule,
}: {
  visible: boolean;
  current: LiveStatus;
  onClose: () => void;
  onSave: (s: ManualStatus) => void;
  /** Today's bookable hours from the weekly schedule, already formatted. */
  todayHours: string;
  onEditSchedule: () => void;
}) => {
  const initial = (MANUAL_STATUSES.find((m) => m.key === current)?.key ?? 'offline') as ManualStatus;
  const [draft, setDraft] = useState<ManualStatus>(initial);
  const [wasVisible, setWasVisible] = useState(false);
  // re-sync every time the sheet opens, so a dismissed edit is discarded
  if (visible && !wasVisible) {
    setWasVisible(true);
    setDraft(initial);
  } else if (!visible && wasVisible) {
    setWasVisible(false);
  }

  const renderIcon = (key: LiveStatus) => {
    const meta = STATUS_META[key];
    if (meta.icon === 'dot') return <View style={[s.dot, { backgroundColor: meta.fg }]} />;
    return <Icon name={meta.icon} size={18} color={meta.fg} />;
  };

  return (
    <BottomSheet
      visible={visible}
      title="Doctor Status"
      subtitle="Choose how new consultations reach you"
      onClose={onClose}
      testID="status-sheet"
      footer={<Button testID="save-status" label="Save status" onPress={() => onSave(draft)} />}
    >
      {MANUAL_STATUSES.map((m) => {
        const selected = draft === m.key;
        const meta = STATUS_META[m.key];
        return (
          <View key={m.key}>
            <Pressable
              testID={`sheet-status-${m.key}`}
              onPress={() => setDraft(m.key)}
              style={[s.row, selected && s.rowSelected, m.key === 'scheduledOnly' && selected && s.rowJoined]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${m.label}. ${meta.description}`}
            >
              <View style={[s.rowIcon, { backgroundColor: meta.bg }]}>{renderIcon(m.key)}</View>
              <View style={s.flex}>
                <Text style={s.rowTitle}>{m.label}</Text>
                <Text style={s.rowBody}>{meta.description}</Text>
              </View>
              {selected ? (
                <Icon name="checkCircle" size={24} color={colors.surfie} filled />
              ) : (
                <View style={s.radio} />
              )}
            </Pressable>

            {m.key === 'scheduledOnly' && selected && (
              <View style={s.hoursBox}>
                <Text style={s.hoursLabel}>Today&apos;s bookable hours</Text>
                <Text testID="today-hours" style={s.hoursValue}>
                  {todayHours}
                </Text>
                <Pressable
                  testID="edit-schedule"
                  onPress={onEditSchedule}
                  hitSlop={8}
                  style={s.link}
                  accessibilityRole="button"
                >
                  <Icon name="calendar" size={14} color={colors.surfie} />
                  <Text style={s.linkText}>Edit weekly schedule</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </BottomSheet>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    marginBottom: spacing.sm,
  },
  rowSelected: { borderColor: colors.paris, backgroundColor: colors.surface.mintSoft },
  // the hours box sits flush under the row it belongs to, so the pair reads as one
  rowJoined: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 },
  hoursBox: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.paris,
    backgroundColor: colors.surface.mintSoft,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
  hoursLabel: { ...typeStyles.caption, color: colors.inkMuted },
  hoursValue: { ...typeStyles.body, color: colors.ink },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36 },
  linkText: { ...typeStyles.buttonSmall, color: colors.surfie },
  rowIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  rowTitle: { ...typeStyles.cardTitle, color: colors.ink },
  rowBody: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 1 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.surface.inputBorder },
});

export default StatusSheet;
