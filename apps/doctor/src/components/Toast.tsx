import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../theme/brand';
import { typeStyles } from '../theme/typography';
import { Icon } from './Icon';

/**
 * Confirmation that something happened — "Fee saved", "Request sent".
 *
 * Shown only after the change has actually been made, never as a promise. It
 * sits under the status bar rather than at the bottom, where it would cover
 * the footer buttons and the keyboard.
 */
export type ToastTone = 'success' | 'info' | 'error';

type Message = { id: number; text: string; tone: ToastTone };

let listener: ((m: Message) => void) | null = null;
let seq = 0;

export const toast = {
  show: (text: string, tone: ToastTone = 'success') => {
    seq += 1;
    listener?.({ id: seq, text, tone });
    AccessibilityInfo.announceForAccessibility?.(text);
  },
};

const DURATION_MS = 2600;

const TONE: Record<ToastTone, { icon: 'checkCircle' | 'info' | 'alertCircle'; fg: string }> = {
  success: { icon: 'checkCircle', fg: colors.paris },
  info: { icon: 'info', fg: colors.white },
  error: { icon: 'alertCircle', fg: '#FFB4B0' },
};

export const ToastHost = () => {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<Message | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    listener = setMessage;
    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    const id = setTimeout(() => setMessage(null), DURATION_MS);
    return () => clearTimeout(id);
  }, [message, opacity]);

  if (!message) return null;
  const tone = TONE[message.tone];

  return (
    <View pointerEvents="none" style={[s.wrap, { top: insets.top + spacing.sm }]}>
      <Animated.View testID="toast" style={[s.toast, { opacity }]} accessibilityLiveRegion="polite">
        <Icon name={tone.icon} size={18} color={tone.fg} filled={message.tone === 'success'} />
        <Text style={s.text}>{message.text}</Text>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 480,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { ...typeStyles.bodySmall, color: colors.white, flexShrink: 1 },
});

export default ToastHost;
