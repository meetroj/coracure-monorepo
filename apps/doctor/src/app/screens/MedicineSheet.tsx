import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { BottomSheet, SheetActions } from '../../components/BottomSheet';
import { TextField, SelectField } from '../../components/form';
import { confirmDiscard } from '../../components/confirm';
import {
  FORMULARY,
  FREQUENCIES,
  ROUTES,
  emptyMedicine,
  missingMedicineFields,
  type Medicine,
} from '../../data/clinical';

/**
 * Add or edit one medicine. Name, dose, frequency and duration are required;
 * the search offers the local formulary but never overrides what the doctor
 * types. Cancel with changes asks before discarding them.
 */
export const MedicineSheet = ({
  visible,
  initial,
  onSave,
  onClose,
}: {
  visible: boolean;
  /** The medicine being edited; absent for a new one. */
  initial?: Medicine;
  onSave: (m: Omit<Medicine, 'id'>) => void;
  onClose: () => void;
}) => {
  const start = useMemo(() => (initial ? { ...initial } : emptyMedicine()), [initial]);
  const [draft, setDraft] = useState(start);
  const [attempted, setAttempted] = useState(false);
  const [wasVisible, setWasVisible] = useState(false);
  // a fresh form every time the sheet opens
  if (visible && !wasVisible) {
    setWasVisible(true);
    setDraft(start);
    setAttempted(false);
  } else if (!visible && wasVisible) {
    setWasVisible(false);
  }

  const set = <K extends keyof Omit<Medicine, 'id'>>(k: K, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const missing = missingMedicineFields(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(start);

  const q = draft.name.trim().toLowerCase();
  const suggestions =
    q.length >= 2 && !FORMULARY.some((f) => f.name.toLowerCase() === q)
      ? FORMULARY.filter((f) => f.name.toLowerCase().includes(q) || f.generic.toLowerCase().includes(q)).slice(0, 4)
      : [];

  const close = () => (dirty ? confirmDiscard(onClose, 'this medicine') : onClose());
  const err = (k: string, msg: string) => (attempted && missing.includes(k) ? msg : undefined);

  return (
    <BottomSheet
      visible={visible}
      title={initial ? 'Edit medicine' : 'Add medicine'}
      onClose={close}
      testID="medicine-sheet"
      footer={
        <SheetActions
          testID="medicine"
          onCancel={close}
          confirmLabel={initial ? 'Save changes' : 'Add medicine'}
          onConfirm={() => {
            setAttempted(true);
            if (missing.length === 0) onSave(draft);
          }}
        />
      }
    >
      <TextField
        testID="med-name"
        label="Medicine name"
        required
        value={draft.name}
        onChangeText={(v) => set('name', v)}
        placeholder="Search or type, e.g. Sertraline 50 mg"
        autoCapitalize="words"
        error={err('name', 'Enter the medicine name.')}
      />
      {suggestions.length > 0 && (
        <View style={s.suggest}>
          {suggestions.map((f, i) => (
            <Pressable
              key={f.name}
              testID={`med-suggest-${i}`}
              onPress={() => setDraft((d) => ({ ...d, name: f.name, generic: f.generic, dose: f.dose }))}
              style={({ pressed }) => [s.suggestRow, i < suggestions.length - 1 && s.suggestRule, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Use ${f.name}`}
            >
              <Text style={s.suggestName}>{f.name}</Text>
              <Text style={s.suggestGeneric}>{f.generic}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <TextField
        testID="med-generic"
        label="Generic name"
        value={draft.generic}
        onChangeText={(v) => set('generic', v)}
        placeholder="e.g. Sertraline hydrochloride"
      />
      <View style={s.duo}>
        <View style={s.flex}>
          <TextField
            testID="med-dose"
            label="Dose"
            required
            value={draft.dose}
            onChangeText={(v) => set('dose', v)}
            placeholder="50 mg"
            error={err('dose', 'Enter the dose.')}
          />
        </View>
        <View style={s.flex}>
          <TextField
            testID="med-duration"
            label="Duration"
            required
            value={draft.duration}
            onChangeText={(v) => set('duration', v)}
            placeholder="14 days"
            error={err('duration', 'Enter the duration.')}
          />
        </View>
      </View>
      <SelectField
        testID="med-frequency"
        label="Frequency"
        required
        value={draft.frequency}
        options={FREQUENCIES}
        onChange={(v) => set('frequency', v)}
        placeholder="How often"
        error={err('frequency', 'Choose how often it is taken.')}
      />
      <View style={s.duo}>
        <View style={s.flex}>
          <SelectField testID="med-route" label="Take it" value={draft.route} options={ROUTES} onChange={(v) => set('route', v)} />
        </View>
        <View style={s.flex}>
          <TextField
            testID="med-quantity"
            label="Quantity"
            value={draft.quantity}
            onChangeText={(v) => set('quantity', v)}
            placeholder="28 tablets"
          />
        </View>
      </View>
      <TextField
        testID="med-instruction"
        label="Instruction (optional)"
        value={draft.instruction}
        onChangeText={(v) => set('instruction', v)}
        placeholder="e.g. Take after breakfast"
      />
      {attempted && missing.length > 0 && (
        <Text testID="medicine-missing" style={s.missing}>
          Still required: {missing.join(', ')}.
        </Text>
      )}
    </BottomSheet>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.75 },
  duo: { flexDirection: 'row', gap: spacing.md },
  suggest: {
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  suggestRow: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: 6 },
  suggestRule: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  suggestName: { ...typeStyles.body, fontWeight: fontWeight.semibold, color: colors.ink },
  suggestGeneric: { ...typeStyles.caption, color: colors.inkMuted },
  missing: { ...typeStyles.caption, color: colors.danger, marginTop: -spacing.sm },
});

export default MedicineSheet;
