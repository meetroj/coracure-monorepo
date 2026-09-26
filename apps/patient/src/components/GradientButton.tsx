import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors, radius, spacing, typography, shadow } from '@coracure/brand';
import { Icon } from '@coracure/ui';

/**
 * A bespoke gradient pill CTA, used only where a mock explicitly calls for
 * one (onboarding's "Get Started", sign-in's "Continue"). The rest of the
 * app keeps `Button`'s flat `colors.cta` fill — see that component's own
 * note on why — so this is deliberately a separate component rather than a
 * new `Button` variant, the same way `AvailabilityScreen`'s Save button is a
 * one-off rather than a shared style.
 *
 * The gradient is a measured Svg rect behind the label because RN has no
 * gradient background. `arrow` picks between the two treatments the mocks
 * use: a white circle pinned to the trailing edge (onboarding) or a plain
 * white glyph next to the label (sign-in).
 */
export const GradientButton = ({
  label,
  onPress,
  disabled,
  loading,
  testID,
  accessibilityHint,
  cornerRadius = radius.pill,
  arrow = 'circle',
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  accessibilityHint?: string;
  /** Corner radius of the pill. Defaults to a full stadium shape. */
  cornerRadius?: number;
  /** 'circle' pins a white-circle arrow to the trailing edge; 'plain' sets a plain white arrow beside the label. */
  arrow?: 'circle' | 'plain';
}) => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const inert = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inert}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inert, busy: !!loading }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={({ pressed }) => [
        s.cta,
        { borderRadius: cornerRadius },
        inert && s.ctaDisabled,
        pressed && !inert && s.pressed,
      ]}
    >
      {size.w > 0 && (
        <Svg style={StyleSheet.absoluteFill} width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id="ctaGrad" x1="1" y1="0" x2="0" y2="0">
              {/* Both stops are greens now: the light mint end was dropped. */}
              <Stop offset="0" stopColor={colors.surfie} />
              <Stop offset="1" stopColor={colors.cta} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size.w} height={size.h} fill="url(#ctaGrad)" />
        </Svg>
      )}
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : arrow === 'circle' ? (
        <>
          <Text style={s.ctaLabel}>{label}</Text>
          <View style={s.ctaArrowCircle}>
            <Icon name="arrowRight" size={16} color={colors.surfie} />
          </View>
        </>
      ) : (
        <>
          <Text style={s.ctaLabel}>{label}</Text>
          <View style={s.ctaArrowPlain}>
            <Icon name="arrowRight" size={18} color={colors.white} />
          </View>
        </>
      )}
    </Pressable>
  );
};

const s = StyleSheet.create({
  cta: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    overflow: 'hidden',
    ...shadow.floating,
  },
  ctaDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  pressed: { opacity: 0.85 },
  ctaLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.body.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.1,
  },
  ctaArrowCircle: {
    position: 'absolute',
    right: 6,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaArrowPlain: { position: 'absolute', right: spacing.xl, top: 0, bottom: 0, justifyContent: 'center' },
});

export default GradientButton;
