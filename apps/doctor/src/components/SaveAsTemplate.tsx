import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { colors, radius, spacing } from '../theme/brand';
import { typeStyles } from '../theme/typography';
import { Icon } from './Icon';
import { BottomSheet } from './BottomSheet';
import { Button } from './ui';
import { toast } from './Toast';
import { useStore } from '../state/store';
import { selectDoctor, selectRecord } from '../state/selectors';
import { canPrescribe } from '../data/clinical';
import { createTemplate, templateMessage } from '../data/templates';

/**
 * "Save as template" for the open prescription: asks for a name, then POSTs the
 * draft's medicines, advice and warning signs. A non-prescriber's draft carries
 * no medicines, so none are saved.
 */
export const SaveAsTemplate = ({ appointmentId }: { appointmentId: string }) => {
  const record = useStore((st) => selectRecord(st, appointmentId));
  const prescriber = canPrescribe(useStore(selectDoctor).professionalType);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const meds = prescriber ? record.medicines : [];
  const empty = meds.length + record.advice.length + record.donts.length === 0;

  const save = async () => {
    if (saving || !name.trim()) return;
    setSaving(true);
    try {
      const made = await createTemplate({
        name,
        kind: meds.length > 0 ? 'medication' : 'advice',
        content: { meds, advice: record.advice, donts: record.donts },
      });
      if (made) {
        toast.show(`Saved "${made.name}" to your templates`);
        setOpen(false);
        setName('');
      }
    } catch (e) {
      toast.show(templateMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Pressable
        testID="save-as-template"
        onPress={() => (empty ? toast.show('Add a medicine or advice first', 'info') : setOpen(true))}
        style={s.row}
        accessibilityRole="button"
        accessibilityLabel="Save as template"
      >
        <Icon name="copy" size={16} color={colors.surfie} />
        <Text style={s.rowText}>Save as Template</Text>
      </Pressable>
      <BottomSheet
        visible={open}
        title="Save as template"
        subtitle="Saves the medicines, advice and warning signs on this prescription."
        onClose={() => setOpen(false)}
        testID="save-template-sheet"
        footer={
          <Button testID="save-template-confirm" label="Save template" onPress={save} loading={saving} disabled={!name.trim()} />
        }
      >
        <TextInput
          testID="template-name"
          value={name}
          onChangeText={setName}
          maxLength={80}
          placeholder="Template name"
          placeholderTextColor={colors.inkFaint}
          style={s.input}
          accessibilityLabel="Template name"
          underlineColorAndroid="transparent"
        />
      </BottomSheet>
    </>
  );
};

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  rowText: { ...typeStyles.body, flex: 1, color: colors.surfie },
  input: {
    ...typeStyles.inputSingle,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
});
