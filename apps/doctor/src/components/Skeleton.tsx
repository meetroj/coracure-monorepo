import React, { useEffect, useState, type ReactNode } from 'react';
import {
  View,
  Animated,
  Easing,
  StyleSheet,
  AccessibilityInfo,
  type ViewStyle,
  type StyleProp,
  type DimensionValue,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { skeleton, SHIMMER_MS } from '../theme/skeleton';

/**
 * Skeleton primitives.
 *
 * Two rules shape this file:
 *
 * 1. A skeleton must occupy exactly the space its content will, so nothing
 *    moves when data lands. Every primitive therefore takes explicit
 *    dimensions rather than sizing to its (absent) content.
 * 2. Motion is a courtesy, not a requirement. One shared driver runs the
 *    sweep for the whole tree, and it stops entirely under Reduce Motion.
 */

/* ------------------------------ shared driver ----------------------------- */

/**
 * A single Animated.Value drives every skeleton on screen. Per-box loops would
 * multiply timers and let boxes drift out of phase, which reads as noise.
 */
const driver = new Animated.Value(0);
let mounted = 0;
let loop: Animated.CompositeAnimation | null = null;

const startDriver = () => {
  if (loop) return;
  loop = Animated.loop(
    Animated.timing(driver, {
      toValue: 1,
      duration: SHIMMER_MS,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    })
  );
  loop.start();
};

const stopDriver = () => {
  loop?.stop();
  loop = null;
  driver.setValue(0);
};

/** True when the OS asks us not to animate. */
const useReduceMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduced(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);
  return reduced;
};

const useShimmer = () => {
  const reduced = useReduceMotion();
  useEffect(() => {
    if (reduced) return;
    mounted += 1;
    startDriver();
    return () => {
      mounted -= 1;
      if (mounted <= 0) stopDriver();
    };
  }, [reduced]);
  return !reduced;
};

/* -------------------------------- primitive ------------------------------- */

export type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  /** Sits on a white card; slightly warmer so it does not disappear. */
  tinted?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * One placeholder block. `width` accepts a percentage so a skeleton can track
 * a flexible parent without hardcoding pixels.
 */
export const Skeleton = ({
  width = '100%',
  height = 12,
  radius = 6,
  tinted = false,
  style,
  testID,
}: SkeletonProps) => {
  const animate = useShimmer();
  const [box, setBox] = useState(0);

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setBox(e.nativeEvent.layout.width)}
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: tinted ? skeleton.tint : skeleton.base,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {animate && box > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                {
                  // sweep from fully off the left edge to fully off the right
                  translateX: driver.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-box, box],
                  }),
                },
              ],
            },
          ]}
        >
          <Svg width={box} height={height}>
            <Defs>
              <LinearGradient id="sk" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={skeleton.highlight} stopOpacity="0" />
                <Stop offset="0.5" stopColor={skeleton.highlight} stopOpacity="1" />
                <Stop offset="1" stopColor={skeleton.highlight} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={box} height={height} fill="url(#sk)" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
};

/* ------------------------------- convenience ------------------------------ */

export const SkeletonCircle = ({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) => (
  <Skeleton width={size} height={size} radius={size / 2} style={style} />
);

/**
 * A run of text lines. The last line is short by default, the way a real
 * paragraph ends mid-measure.
 */
export const SkeletonText = ({
  lines = 1,
  lineHeight = 11,
  gap = 7,
  lastWidth = '62%',
  width = '100%',
  style,
}: {
  lines?: number;
  lineHeight?: number;
  gap?: number;
  lastWidth?: DimensionValue;
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[{ gap }, style]}>
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton
        key={i}
        width={i === lines - 1 && lines > 1 ? lastWidth : width}
        height={lineHeight}
        radius={lineHeight / 2}
      />
    ))}
  </View>
);

/**
 * Repeats a row skeleton `count` times with the list's own divider, so the
 * placeholder list is exactly as tall as the real one.
 */
export const SkeletonRows = ({
  count,
  children,
  divider,
}: {
  count: number;
  children: (index: number) => ReactNode;
  divider?: StyleProp<ViewStyle>;
}) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <View key={i} style={i < count - 1 ? divider : undefined}>
        {children(i)}
      </View>
    ))}
  </>
);

export default Skeleton;
