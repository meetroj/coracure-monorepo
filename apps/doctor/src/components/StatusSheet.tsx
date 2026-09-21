import { typeStyles } from '../../../../libs/typography/src';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../theme/brand';
import { Icon } from './Icon';
import { Button } from './ui';
import {
  MANUAL_STATUSES,
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
  // The hours "Schedule Appointments" applies to — only meaningful while that status is picked.
  const [fromTime, setFromTime] = useState('09:00 AM');
  const [toTime, setToTime] = useState('06:00 PM');

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

      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <View style={s.handle} />

        <Text style={[typeStyles.body, s.title]}>Doctor Status</Text>
        <Text style={[typeStyles.body, s.subtitle]}>Manage how you receive consultations</Text>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {MANUAL_STATUSES.map((m) => {
            const selected = draft === m.key;
            const meta = STATUS_META[m.key];
            return (
              <View key={m.key}>
                <Pressable
                  testID={`sheet-status-${m.key}`}
                  onPress={() => setDraft(m.key)}
                  style={[s.row, selected && s.rowSelected, m.key === 'scheduledOnly' && selected && s.rowNoBottom]}
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

                {/* Only "Schedule Appointments" needs hours — the doctor picks the window it applies to. */}
                {m.key === 'scheduledOnly' && selected && (
                  <View style={s.hoursBox}>
                    <Text style={[typeStyles.body, s.hoursLabel]}>Available hours</Text>
                    <View style={s.hoursRow}>
                      <View style={s.timeField}>
                        <Text style={[typeStyles.body, s.timeFieldLabel]}>From</Text>
                        <TextInput
                          testID="scheduled-from"
                          value={fromTime}
                          onChangeText={setFromTime}
                          style={s.timeInput}
                          placeholder="09:00 AM"
                          placeholderTextColor={colors.inkFaint}
                        />
                      </View>
                      <Icon name="arrowRight" size={16} color={colors.inkFaint} />
                      <View style={s.timeField}>
                        <Text style={[typeStyles.body, s.timeFieldLabel]}>To</Text>
                        <TextInput
                          testID="scheduled-to"
                          value={toTime}
                          onChangeText={setToTime}
                          style={s.timeInput}
                          placeholder="06:00 PM"
                          placeholderTextColor={colors.inkFaint}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
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
  // The hours box sits flush under the row it belongs to, so the pair reads as one control.
  rowNoBottom: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 },
  hoursBox: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.paris,
    backgroundColor: colors.surface.mintSoft,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  hoursLabel: { ...typeStyles.label, color: colors.inkMuted, marginBottom: spacing.sm },
  hoursRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  timeField: { flex: 1 },
  timeFieldLabel: { ...typeStyles.caption, color: colors.inkFaint, marginBottom: 3 },
  timeInput: {
    ...typeStyles.body,
    color: colors.ink,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
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
  saveBtn: { marginTop: spacing.lg },
});

export default StatusSheet;
