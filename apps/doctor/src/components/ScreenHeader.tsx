import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import LogoWide from '../assets/brand/logo-wide.svg';
import { colors, radius, spacing } from '../theme/brand';
import { typeStyles } from '../theme/typography';
import { Icon, type IconName } from './Icon';

/**
 * The header every pushed screen uses.
 *
 * One back affordance — the arrow in a squircle, 44pt to touch — replaces the
 * arrow, chevron and tap-the-logo variants the screens had drifted into. The
 * bar carries the wordmark (or, where the screen is dense, its own name), and
 * the page title sits under it. There is no bell on a pushed screen:
 * notifications live on the tab roots, and a bell that goes nowhere is worse
 * than none.
 */
export const BackButton = ({
  onPress,
  label = 'Back',
  testID = 'back',
  icon = 'arrowLeft',
}: {
  onPress: () => void;
  label?: string;
  testID?: string;
  icon?: IconName;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    hitSlop={6}
    style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Icon name={icon} size={19} color={colors.ink} />
  </Pressable>
);

/** A header action: 40pt squircle, 44pt target, always labelled. */
export const HeaderAction = ({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID?: string;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    hitSlop={6}
    style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Icon name={icon} size={18} color={colors.ink} />
  </Pressable>
);

/** A header action that reads as text — "Save Draft", "Mark all read". */
export const HeaderTextAction = ({
  label,
  onPress,
  testID,
  icon,
  disabled,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
  icon?: IconName;
  disabled?: boolean;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    disabled={disabled}
    hitSlop={8}
    style={({ pressed }) => [s.textAction, pressed && s.pressed, disabled && s.disabled]}
    accessibilityRole="button"
    accessibilityState={{ disabled: !!disabled }}
  >
    {!!icon && <Icon name={icon} size={15} color={colors.surfie} />}
    <Text style={s.textActionLabel} numberOfLines={1} maxFontSizeMultiplier={1.3}>
      {label}
    </Text>
  </Pressable>
);

export const ScreenHeader = ({
  onBack,
  title,
  subtitle,
  right,
  inline = false,
  backLabel,
  badge,
}: {
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  /** Actions for this screen only. */
  right?: ReactNode;
  /** Put the title in the bar instead of the wordmark — for dense screens. */
  inline?: boolean;
  backLabel?: string;
  /** A status pill or similar shown beside the page title. */
  badge?: ReactNode;
}) => (
  <View>
    <View style={s.bar}>
      <View style={s.side}>{onBack ? <BackButton onPress={onBack} label={backLabel} /> : null}</View>
      <View style={s.center}>
        {inline && title ? (
          <>
            <Text style={s.barTitle} numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
            {!!subtitle && (
              <Text style={s.barSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </>
        ) : (
          <LogoWide width={104} height={26} accessibilityLabel="CoraCure" />
        )}
      </View>
      <View style={[s.side, s.sideRight]}>{right}</View>
    </View>
    {!inline && !!title && (
      <View style={s.heading}>
        <View style={s.headingRow}>
          <Text style={s.title} accessibilityRole="header">
            {title}
          </Text>
          {badge}
        </View>
        {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      </View>
    )}
  </View>
);

const s = StyleSheet.create({
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  side: { minWidth: 44, flexDirection: 'row', alignItems: 'center' },
  sideRight: { justifyContent: 'flex-end', gap: spacing.sm, flexShrink: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  barTitle: { ...typeStyles.cardTitle, color: colors.ink, textAlign: 'center' },
  barSubtitle: { ...typeStyles.caption, color: colors.surfie, textAlign: 'center' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  textActionLabel: { ...typeStyles.buttonSmall, color: colors.surfie },
  heading: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  title: { ...typeStyles.pageTitle, color: colors.ink, flexShrink: 1 },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 3 },
});

export default ScreenHeader;
