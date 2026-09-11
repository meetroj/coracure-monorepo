import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, typography } from '@coracure/brand';

import LogoWide from '../assets/brand/logo-wide.svg';
import LogoWideWhite from '../assets/brand/logo-wide-white.svg';
import LogoMark from '../assets/brand/logo-mark.svg';

/**
 * The official logo assets, used unmodified.
 *
 * The brand guidelines supply these as SVGs and they are never recreated from
 * text or icons. `@coracure/ui` cannot import them directly because Metro
 * resolves `.svg` per app, so the app passes the element in.
 */

export const WideLogo = ({ width = 128 }: { width?: number }) => (
  // The asset's own aspect ratio is 240.4 x 60.3.
  <LogoWide width={width} height={width * (60.3 / 240.4)} />
);

export const WideLogoWhite = ({ width = 128 }: { width?: number }) => (
  <LogoWideWhite width={width} height={width * (60.3 / 240.4)} />
);

export const Mark = ({ size = 44 }: { size?: number }) => <LogoMark width={size} height={size} />;

/**
 * The stacked lockup on the splash: the mark, the wordmark and the tagline.
 *
 * "Care Connected" is the tagline from the brand deck and is set in the body
 * face at a wide tracking, which is how the guidelines specify it.
 */
export const StackedLockup = ({ size = 84 }: { size?: number }) => (
  <View style={s.stack} accessible accessibilityRole="image" accessibilityLabel="CoraCure, Care Connected">
    <Mark size={size} />
    <Text style={s.word}>CoraCure</Text>
    <Text style={s.tagline}>Care Connected</Text>
  </View>
);

const s = StyleSheet.create({
  stack: { alignItems: 'center', gap: 6 },
  word: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '800',
    color: colors.surfie,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  tagline: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
});
