import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ActivityIndicator } from 'react-native';

import { colors, spacing, typography } from '@coracure/brand';
import { BrandBackground, Screen, TrustRow } from '@coracure/ui';
import { useT } from '@coracure/i18n';


import { StackedLockup } from '../../components/Brand';

/**
 * The splash.
 *
 * It is a *state*, not a timer: it renders while the session is being read out
 * of the keychain and the first authenticated reads are in flight, and the root
 * router replaces it the moment it knows where to go. There is no artificial
 * delay — `MIN_VISIBLE_MS` only stops the logo from flashing for two frames on
 * a warm start, which reads as a glitch rather than as a launch.
 */
const MIN_VISIBLE_MS = 600;

export const SplashScreen = ({
  /** Called once the minimum visible time has elapsed. */
  onMinimumElapsed,
  message,
}: {
  onMinimumElapsed?: () => void;
  message?: string;
}) => {
  const t = useT();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise]);

  useEffect(() => {
    const id = setTimeout(() => onMinimumElapsed?.(), MIN_VISIBLE_MS);
    return () => clearTimeout(id);
  }, [onMinimumElapsed]);

  return (
    <BrandBackground>
      <Screen scroll={false} background="transparent" bottomInset testID="splash">
        <View style={s.root}>
          <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
            <StackedLockup size={92} />
          </Animated.View>

          <View style={s.loading} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.surfie} />
            <Text style={s.loadingText}>{message ?? t('splash.checkingSession')}</Text>
          </View>
        </View>

        <View style={s.footer}>
          <TrustRow
            items={[
              { icon: 'lock', label: t('splash.private') },
              { icon: 'shieldCheck', label: t('splash.secure') },
              { icon: 'checkCircle', label: t('splash.verified') },
            ]}
          />
        </View>
      </Screen>
    </BrandBackground>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xxxl },
  loading: { alignItems: 'center', gap: spacing.sm },
  loadingText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  footer: { paddingBottom: spacing.xl },
});

export default SplashScreen;
