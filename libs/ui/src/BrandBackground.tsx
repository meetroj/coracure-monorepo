import React from 'react';
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Rect, Circle, G } from 'react-native-svg';

import { colors, gradient } from '@coracure/brand';

/**
 * The onboarding backdrop, PAINTED — never the reference mock used as an image.
 *
 * It is the supplied artwork rebuilt from primitives: a white-to-mint vertical
 * wash, two soft waves, two rounded medical crosses bleeding off opposite
 * corners, and two dot grids. Everything scales with the viewport because the
 * SVG is drawn on a 1:2 viewBox with `preserveAspectRatio="none"` on the wash
 * and proportional placement for the motifs, so a 320pt phone and a 1440pt
 * desktop window both get the same composition rather than a cropped one.
 *
 * Purely decorative: `accessibilityElementsHidden` and `importantForAccessibility`
 * keep the whole thing out of the screen reader's path.
 */

/** A rounded medical cross as one path, drawn on a 100x100 box. */
const CROSS_PATH =
  'M36 4h28a8 8 0 018 8v24h24a8 8 0 018 8v28a8 8 0 01-8 8H72v24a8 8 0 01-8 8H36a8 8 0 01-8-8V80H4a8 8 0 01-8-8V44a8 8 0 018-8h24V12a8 8 0 018-8z';

const DotGrid = ({
  x,
  y,
  columns,
  rows,
  gap,
  color,
  opacity,
}: {
  x: number;
  y: number;
  columns: number;
  rows: number;
  gap: number;
  color: string;
  opacity: number;
}) => (
  <G opacity={opacity}>
    {Array.from({ length: rows }).map((_, r) =>
      Array.from({ length: columns }).map((__, c) => (
        <Circle key={`${r}-${c}`} cx={x + c * gap} cy={y + r * gap} r={2.2} fill={color} />
      )),
    )}
  </G>
);

export const BrandBackground = ({
  children,
  style,
  /** `soft` drops the motifs to near-invisible for content-heavy screens. */
  intensity = 'full',
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: 'full' | 'soft';
}) => {
  const { width, height } = useWindowDimensions();
  // The motifs are placed against the real viewport so the crosses always land
  // in the corners; only the wash is stretched.
  const w = Math.max(width, 1);
  const h = Math.max(height, 1);
  const k = intensity === 'soft' ? 0.18 : 0.35;
  const crossSize = Math.min(w, h) * 0.34;
  const scale = crossSize / 100;

  return (
    <View style={[styles.root, style]}>
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice">
          <Defs>
            <LinearGradient id="cc-wash" x1="0" y1="0" x2="0.15" y2="1">
              <Stop offset="0" stopColor={gradient.wash[0]} />
              <Stop offset="0.55" stopColor={gradient.wash[1]} />
              <Stop offset="1" stopColor={gradient.wash[2]} />
            </LinearGradient>
            <LinearGradient id="cc-wave" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.paris} stopOpacity={0.1 * k} />
              <Stop offset="1" stopColor={colors.surfie} stopOpacity={0.05 * k} />
            </LinearGradient>
          </Defs>

          <Rect x="0" y="0" width={w} height={h} fill="url(#cc-wash)" />

          {/* Two waves, mirrored, at the thirds. */}
          <Path
            d={`M0 ${h * 0.2} C ${w * 0.35} ${h * 0.34}, ${w * 0.62} ${h * 0.04}, ${w} ${h * 0.12} L ${w} 0 L 0 0 Z`}
            fill="url(#cc-wave)"
          />
          <Path
            d={`M0 ${h * 0.62} C ${w * 0.3} ${h * 0.5}, ${w * 0.7} ${h * 0.78}, ${w} ${h * 0.66} L ${w} ${h} L 0 ${h} Z`}
            fill="url(#cc-wave)"
          />

          {/* Crosses bleed off opposite corners, as in the supplied artwork. */}
          <G
            transform={`translate(${-crossSize * 0.22}, ${h * 0.06}) scale(${scale})`}
            opacity={0.5 * k}
          >
            <Path d={CROSS_PATH} fill={colors.paris} fillOpacity={0.16} />
          </G>
          <G
            transform={`translate(${w - crossSize * 0.72}, ${h * 0.76}) scale(${scale})`}
            opacity={0.5 * k}
          >
            <Path d={CROSS_PATH} fill={colors.paris} fillOpacity={0.16} />
          </G>

          <DotGrid
            x={w * 0.72}
            y={h * 0.07}
            columns={7}
            rows={7}
            gap={Math.min(w, h) * 0.038}
            color={colors.paris}
            opacity={0.32 * k}
          />
          <DotGrid
            x={w * 0.04}
            y={h * 0.74}
            columns={5}
            rows={5}
            gap={Math.min(w, h) * 0.038}
            color={colors.paris}
            opacity={0.26 * k}
          />
        </Svg>
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },
});

export default BrandBackground;
