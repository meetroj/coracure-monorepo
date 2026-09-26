import React from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, Text, View, type KeyboardTypeOptions } from 'react-native';

import { colors, spacing } from '../theme/brand';
import { typeStyles, fontWeight } from '../theme/typography';

/**
 * iOS number pads have no return key, so a doctor typing a number had no way
 * to put the keyboard away. Numeric fields opt into this one bar, which sits
 * on the keyboard and closes it. Android's number pad has its own Done key.
 */
export const DONE_BAR_ID = 'coracure-keyboard-done';

const NUMERIC: KeyboardTypeOptions[] = ['number-pad', 'decimal-pad', 'phone-pad', 'numeric'];

/** Props that give a numeric field the Done bar on iOS; nothing anywhere else. */
export const doneBar = (keyboardType?: KeyboardTypeOptions) =>
  Platform.OS === 'ios' && !!keyboardType && NUMERIC.includes(keyboardType) ? { inputAccessoryViewID: DONE_BAR_ID } : {};

/** Rendered once, at the app root. */
export const KeyboardDoneBar = () =>
  Platform.OS === 'ios' ? (
    <InputAccessoryView nativeID={DONE_BAR_ID}>
      <View style={s.bar}>
        <Pressable testID="keyboard-done" onPress={() => Keyboard.dismiss()} hitSlop={10} style={s.done} accessibilityRole="button" accessibilityLabel="Done">
          <Text style={s.doneText}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  ) : null;

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface.page,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surface.inputBorder,
  },
  done: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs },
  doneText: { ...typeStyles.body, fontWeight: fontWeight.semibold, color: colors.surfie },
});
