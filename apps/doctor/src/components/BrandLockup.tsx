import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

import LogoWord from '../assets/brand/logo-word.svg';

const APP_ICON = require('../assets/brand/app-icon.png');

/**
 * The Coracure lockup: the doctor app icon followed by the wordmark.
 *
 * Replaces the old `logo-wide.svg`, whose glyph was the two-tone green mark.
 * The icon changed to a white knockout on a Surfie disc, so the glyph and the
 * wordmark are now two files — `logo-word.svg` is `logo-wide.svg` with its
 * glyph paths removed. The proportions below are lifted from that original
 * lockup (glyph 56 tall, 12.4 gap, wordmark 168 x 37.9) so the spacing is
 * unchanged from the artwork.
 *
 * `height` sizes the icon; everything else scales off it.
 */
export const BrandLockup = ({
  height = 31,
  accessibilityLabel,
}: {
  height?: number;
  /** Omit when the caller already labels a wrapping pressable. */
  accessibilityLabel?: string;
}) => (
  <View
    style={[s.row, { gap: height * 0.221 }]}
    accessible={!!accessibilityLabel}
    accessibilityLabel={accessibilityLabel}
  >
    <Image source={APP_ICON} style={{ width: height, height }} />
    <LogoWord width={height * 3.0} height={height * 0.677} />
  </View>
);

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
