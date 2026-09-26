import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { spacing } from '@coracure/brand';

/**
 * The per-page background artwork.
 *
 * Each key matches a file in `assets/bg` by the page it belongs to, so a screen
 * asks for its own name and never picks an image by index.
 *
 * Two mounting modes, because the art means two different things:
 *
 * - default (`absoluteFill`): the art is the whole page's ground. Correct for
 *   short, non-scrolling screens like splash, sign-in and OTP.
 * - `scrolls`: the art belongs to the HEADER only. Mounted as the first child
 *   inside the scroll content so it travels up with the page. Pinning it meant
 *   body content slid over the icons and sat on top of them, which is the bug
 *   this mode exists to fix.
 *
 * The art lives in a `pointerEvents="none"` wrapper rather than on the `Image`
 * itself: that is the shape Fabric reliably paints and it swallows no touches.
 */
const BG = {
  splash: require('../assets/bg/splash (2).png'),
  auth: require('../assets/bg/auth (5).png'),
  otp: require('../assets/bg/otp.png'),
  appointments: require('../assets/bg/appointments.png'),
  appointmentDetails: require('../assets/bg/appoinment-details.png'),
  cancel: require('../assets/bg/cancel.png'),
  dailyCheckIn: require('../assets/bg/daily check in.png'),
  joinCall: require('../assets/bg/join call.png'),
  selfHelp: require('../assets/bg/self-help.png'),
  slot: require('../assets/bg/slot.png'),
} as const;

export type ScreenBgName = keyof typeof BG;

export const ScreenBackground = ({
  name,
  scrolls = false,
  height = 320,
}: {
  name: ScreenBgName;
  /** Mount inside the scroll content so the art scrolls away with the header. */
  scrolls?: boolean;
  /** How far down the art reaches when scrolling. Ignored when pinned. */
  height?: number;
}) => {
  if (scrolls) {
    return (
      <View pointerEvents="none" style={[s.scrolling, { height }]}>
        <Image source={BG[name]} style={s.art} resizeMode="cover" />
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={BG[name]} style={s.art} resizeMode="cover" />
    </View>
  );
};

const s = StyleSheet.create({
  art: { width: '100%', height: '100%' },
  /**
   * Absolute *within the scroll content*, so it moves with it. The negative
   * insets cancel the content's horizontal padding so the art still bleeds to
   * both edges.
   */
  scrolling: {
    position: 'absolute',
    top: 0,
    left: -spacing.lg,
    right: -spacing.lg,
  },
});

export default ScreenBackground;
