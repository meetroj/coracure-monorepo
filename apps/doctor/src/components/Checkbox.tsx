import React, { type ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../theme/brand';
import { typeStyles } from '../theme/typography';
import { Icon } from './Icon';

/**
 * The one checkbox.
 *
 * The whole row is the target — at least 44pt tall — not the 20pt box, and
 * the box always draws the same tick in the same place. Three variants with
 * different sizes, radii and glyphs used to share the app.
 */
export const Checkbox = ({
  checked,
  onToggle,
  children,
  testID,
  disabled,
  style,
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
  testID?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) => (
  <Pressable
    testID={testID}
    onPress={() => {
      // a tick ends the typing that came before it
      Keyboard.dismiss();
      onToggle();
    }}
    disabled={disabled}
    hitSlop={{ top: 4, bottom: 4 }}
    style={({ pressed }) => [s.row, pressed && s.pressed, disabled && s.disabled, style]}
    accessibilityRole="checkbox"
    accessibilityState={{ checked, disabled: !!disabled }}
  >
    <View style={[s.box, checked && s.boxOn]}>
      {checked && <Icon name="check" size={13} weight={3} color={colors.white} />}
    </View>
    {typeof children === 'string' ? <Text style={s.label}>{children}</Text> : <View style={s.flex}>{children}</View>}
  </Pressable>
);

const s = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44, paddingVertical: spacing.xs },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.sm - 2,
    borderWidth: 1.5,
    borderColor: colors.surface.inputBorder,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  boxOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  label: { ...typeStyles.bodySmall, flex: 1, color: colors.ink },
});

export default Checkbox;
