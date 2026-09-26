import { typeStyles } from '../../../../libs/typography/src';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, ScrollView } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/brand';
import { Icon } from './Icon';
import { RESCHEDULE_CUTOFF_HOURS, type Appointment } from '../data/doctor';

/**
 * Reschedule and Cancel flows shared by the Appointments list and the
 * Appointment Details screen, so a doctor sees the same rules and the same
 * form wherever they open it from.
 */

const HOURS = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
const MINUTES = ['00', '15', '30', '45'];
const PERIODS: ('AM' | 'PM')[] = ['AM', 'PM'];

/* ------------------------------- time wheel -------------------------------- */

const TimeWheel = ({
  visible,
  initial,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  initial: string;
  onConfirm: (v: string) => void;
  onClose: () => void;
}) => {
  const parsed = initial.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const [hour, setHour] = useState(parsed ? parsed[1].padStart(2, '0') : '09');
  const [minute, setMinute] = useState(parsed ? parsed[2] : '00');
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed ? (parsed[3].toUpperCase() as 'AM' | 'PM') : 'AM');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Select Time</Text>
          <View style={s.pickerRow}>
            <View style={s.pickerCol}>
              <Text style={s.pickerColLabel}>Hour</Text>
              <ScrollView style={s.pickerScroll} showsVerticalScrollIndicator={false}>
                {HOURS.map((h) => (
                  <Pressable key={h} onPress={() => setHour(h)} style={[s.pickerItem, hour === h && s.pickerItemActive]}>
                    <Text style={[s.pickerItemText, hour === h && s.pickerItemTextActive]}>{h}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <Text style={s.pickerColon}>:</Text>
            <View style={s.pickerCol}>
              <Text style={s.pickerColLabel}>Min</Text>
              <ScrollView style={s.pickerScroll} showsVerticalScrollIndicator={false}>
                {MINUTES.map((m) => (
                  <Pressable key={m} onPress={() => setMinute(m)} style={[s.pickerItem, minute === m && s.pickerItemActive]}>
                    <Text style={[s.pickerItemText, minute === m && s.pickerItemTextActive]}>{m}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={s.pickerCol}>
              <Text style={s.pickerColLabel}>Period</Text>
              {PERIODS.map((p) => (
                <Pressable key={p} onPress={() => setPeriod(p)} style={[s.pickerItem, period === p && s.pickerItemActive]}>
                  <Text style={[s.pickerItemText, period === p && s.pickerItemTextActive]}>{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Pressable style={s.confirmBtn} onPress={() => { onConfirm(`${hour}:${minute} ${period}`); onClose(); }}>
            <Text style={s.confirmBtnText}>Confirm</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

/* ------------------------------ reschedule ---------------------------------- */

export const RescheduleModal = ({
  visible,
  appointment,
  blockedReason,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  appointment: Appointment;
  /** Set when the cutoff window has already closed: shown instead of the form. */
  blockedReason?: string;
  onClose: () => void;
  onConfirm: (dateLabel: string, time: string, reason: string) => void;
}) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  const reset = () => {
    setDate('');
    setTime('');
    setReason('');
    setError('');
  };

  const submit = () => {
    if (!date.trim()) { setError('Enter a new date'); return; }
    if (!time.trim()) { setError('Choose a new time'); return; }
    onConfirm(date.trim(), time, reason.trim());
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <Pressable style={s.backdrop} onPress={() => { reset(); onClose(); }}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Reschedule Appointment</Text>
          <Text style={s.sheetSubtitle}>{appointment.name} · currently {appointment.time}</Text>

          {blockedReason ? (
            <>
              <View style={s.blockedNotice}>
                <Icon name="alertTriangle" size={16} color={colors.danger} />
                <Text style={s.blockedText}>{blockedReason}</Text>
              </View>
              <Pressable style={s.confirmBtn} onPress={() => { reset(); onClose(); }}>
                <Text style={s.confirmBtnText}>Got it</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={s.inputLabel}>New date</Text>
              <TextInput
                testID="reschedule-date"
                style={s.textInput}
                value={date}
                onChangeText={setDate}
                placeholder="e.g. 20 May 2024"
                placeholderTextColor={colors.inkFaint}
              />

              <Text style={s.inputLabel}>New time</Text>
              <Pressable
                testID="reschedule-time"
                onPress={() => setTimePickerVisible(true)}
                style={s.timeSelector}
                accessibilityRole="button"
              >
                <Text style={[s.timeSelectorText, !time && s.timeSelectorPlaceholder]}>
                  {time || 'Select a time'}
                </Text>
                <Icon name="chevronDown" size={14} color={colors.inkFaint} />
              </Pressable>

              <Text style={s.inputLabel}>Reason for rescheduling (optional)</Text>
              <TextInput
                testID="reschedule-reason"
                style={[s.textInput, s.textArea]}
                value={reason}
                onChangeText={setReason}
                multiline
                placeholder="e.g. Patient requested a different time slot"
                placeholderTextColor={colors.inkFaint}
              />

              <View style={s.cutoffNote}>
                <Icon name="info" size={13} color={colors.inkMuted} />
                <Text style={s.cutoffNoteText}>
                  Can be rescheduled up to {RESCHEDULE_CUTOFF_HOURS} hours before the appointment.
                </Text>
              </View>

              {!!error && <Text style={s.modalError}>{error}</Text>}

              <Pressable testID="reschedule-submit" style={s.confirmBtn} onPress={submit}>
                <Text style={s.confirmBtnText}>Confirm Reschedule</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>

      <TimeWheel
        visible={timePickerVisible}
        initial={time || appointment.time}
        onConfirm={setTime}
        onClose={() => setTimePickerVisible(false)}
      />
    </Modal>
  );
};

/* -------------------------------- cancel ------------------------------------ */

export const CancelModal = ({
  visible,
  appointment,
  blockedReason,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  appointment: Appointment;
  blockedReason?: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setReason('');
    setError('');
  };

  const submit = () => {
    if (!reason.trim()) { setError('Please tell the patient why this is being cancelled'); return; }
    onConfirm(reason.trim());
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <Pressable style={s.backdrop} onPress={() => { reset(); onClose(); }}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.sheetHandle} />
          <View style={s.cancelIconWrap}>
            <Icon name="banCircle" size={26} color={colors.danger} />
          </View>
          <Text style={[s.sheetTitle, s.cancelTitle]}>Cancel Appointment?</Text>
          <Text style={s.sheetSubtitle}>{appointment.name} · {appointment.time}</Text>

          {blockedReason ? (
            <>
              <View style={s.blockedNotice}>
                <Icon name="alertTriangle" size={16} color={colors.danger} />
                <Text style={s.blockedText}>{blockedReason}</Text>
              </View>
              <Pressable style={s.confirmBtn} onPress={() => { reset(); onClose(); }}>
                <Text style={s.confirmBtnText}>Got it</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={s.inputLabel}>Reason for cancellation</Text>
              <TextInput
                testID="cancel-reason"
                style={[s.textInput, s.textArea]}
                value={reason}
                onChangeText={setReason}
                multiline
                placeholder="e.g. Doctor unavailable, patient requested cancellation…"
                placeholderTextColor={colors.inkFaint}
              />
              {!!error && <Text style={s.modalError}>{error}</Text>}

              <View style={s.cancelActions}>
                <Pressable style={s.keepBtn} onPress={() => { reset(); onClose(); }}>
                  <Text style={s.keepBtnText}>Keep Appointment</Text>
                </Pressable>
                <Pressable testID="cancel-submit" style={s.cancelBtn} onPress={submit}>
                  <Text style={s.cancelBtnText}>Cancel Appointment</Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

/* --------------------------------- styles ------------------------------------ */

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.surface.line, alignSelf: 'center', marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg, fontWeight: '700', color: colors.ink,
    textAlign: 'center',
  },
  sheetSubtitle: {
    ...typeStyles.caption,
    color: colors.inkMuted, textAlign: 'center', marginTop: 4, marginBottom: spacing.lg,
  },

  inputLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.inkMuted, marginBottom: 4, marginTop: spacing.md,
  },
  textInput: {
    borderWidth: 1, borderColor: colors.surface.inputBorder, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.ink,
    minHeight: 44,
  },
  textArea: { minHeight: 72, textAlignVertical: 'top' },

  timeSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 44, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.surface.inputBorder, paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  timeSelectorText: { fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.ink },
  timeSelectorPlaceholder: { color: colors.inkFaint },

  cutoffNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: spacing.md,
  },
  cutoffNoteText: { ...typeStyles.caption, flex: 1, color: colors.inkMuted },

  modalError: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.danger, marginTop: spacing.sm,
  },

  confirmBtn: {
    marginTop: spacing.xl, height: 50, borderRadius: radius.input,
    backgroundColor: colors.surfie, alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md, fontWeight: '700', color: colors.white,
  },

  blockedNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.dangerSoft, borderRadius: radius.md,
    padding: spacing.md,
  },
  blockedText: { ...typeStyles.body, flex: 1, color: colors.danger },

  cancelIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.dangerSoft, alignSelf: 'center',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  cancelTitle: { marginTop: 0 },
  cancelActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  keepBtn: {
    flex: 1, height: 50, borderRadius: radius.input,
    borderWidth: 1.5, borderColor: colors.surface.line,
    alignItems: 'center', justifyContent: 'center',
  },
  keepBtnText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm, fontWeight: '700', color: colors.ink,
  },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: radius.input,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm, fontWeight: '700', color: colors.white,
  },

  /* time wheel */
  pickerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  pickerColon: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl, fontWeight: '700', color: colors.ink, marginTop: spacing.xxxl,
  },
  pickerCol: { flex: 1, alignItems: 'center' },
  pickerColLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.inkMuted, marginBottom: spacing.sm,
  },
  pickerScroll: { maxHeight: 160 },
  pickerItem: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.md, width: '100%', alignItems: 'center',
  },
  pickerItemActive: { backgroundColor: colors.surface.selected },
  pickerItemText: {
    fontFamily: typography.body.family, fontSize: typography.size.md, color: colors.inkMuted,
  },
  pickerItemTextActive: { color: colors.surfie, fontWeight: '700' },
});

export default { RescheduleModal, CancelModal };
