import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme/brand';
import { typeStyles, fontWeight } from '../theme/typography';
import { Icon, type IconName } from './Icon';

/**
 * The one confirmation dialog.
 *
 * Was `Alert.alert`, which on Android renders a bare Material box with
 * shouty uppercase text buttons — it read as the OS interrupting, not as the
 * product asking, and it ignored the brand entirely. This is the same question
 * in the app's own voice.
 *
 * The imperative API is unchanged, so every existing `confirm({...})` call site
 * keeps working: a module-level listener feeds `ConfirmHost`, mounted once at
 * the app root, exactly as `toast` / `ToastHost` do.
 *
 * Still always two buttons: a safe cancel and the action named for what it does
 * ("Remove", "End consultation"), never a bare "OK".
 */

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Overrides the default glyph (alertTriangle when destructive, else info). */
  icon?: IconName;
  onConfirm: () => void;
  onCancel?: () => void;
};

type Request = ConfirmOptions & { id: number };

let listener: ((r: Request) => void) | null = null;
let seq = 0;

export const confirm = (options: ConfirmOptions) => {
  seq += 1;
  // No host mounted (a test renderer, say): fall through rather than swallow
  // the action, so behaviour never silently changes.
  if (!listener) {
    options.onConfirm();
    return;
  }
  listener({ ...options, id: seq });
};

/** Asked before leaving a form whose edits would be lost. */
export const confirmDiscard = (onDiscard: () => void, what = 'your changes') =>
  confirm({
    title: 'Discard changes?',
    message: `You have unsaved changes. If you leave now, ${what} will be lost.`,
    confirmLabel: 'Discard',
    cancelLabel: 'Keep editing',
    destructive: true,
    onConfirm: onDiscard,
  });

export const ConfirmHost = () => {
  const [request, setRequest] = useState<Request | null>(null);
  const scale = useRef(new Animated.Value(0.94)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    listener = setRequest;
    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    if (!request) return;
    scale.setValue(0.94);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 18, stiffness: 240, useNativeDriver: true }),
    ]).start();
  }, [request, scale, fade]);

  if (!request) return null;

  const { title, message, confirmLabel, cancelLabel = 'Cancel', destructive, icon } = request;
  const glyph: IconName = icon ?? (destructive ? 'alertTriangle' : 'info');

  const close = (run?: () => void) => {
    setRequest(null);
    run?.();
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => close(request.onCancel)}
    >
      <Animated.View style={[s.scrim, { opacity: fade }]}>
        {/* Tapping the scrim cancels, matching the old `cancelable` alert. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => close(request.onCancel)}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />

        <Animated.View
          testID="confirm-dialog"
          style={[s.card, { transform: [{ scale }] }]}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          <View style={[s.iconWrap, destructive && s.iconWrapDanger]}>
            <Icon name={glyph} size={22} color={destructive ? colors.danger : colors.surfie} />
          </View>

          <Text style={s.title} accessibilityRole="header">
            {title}
          </Text>
          {!!message && <Text style={s.message}>{message}</Text>}

          <View style={s.actions}>
            <Pressable
              testID="confirm-cancel"
              onPress={() => close(request.onCancel)}
              style={({ pressed }) => [s.btn, s.btnGhost, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text style={s.btnGhostText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              testID="confirm-accept"
              onPress={() => close(request.onConfirm)}
              style={({ pressed }) => [
                s.btn,
                destructive ? s.btnDanger : s.btnPrimary,
                pressed && s.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              <Text style={s.btnSolidText} numberOfLines={1}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const s = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(16, 32, 28, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: radius.lg ?? 20,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface.selected ?? '#E7F7F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconWrapDanger: { backgroundColor: colors.dangerSoft },

  title: {
    ...typeStyles.cardTitle,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    textAlign: 'center',
  },
  message: {
    ...typeStyles.bodySmall,
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  btn: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  btnGhost: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.surface.line,
  },
  btnPrimary: { backgroundColor: colors.surfie },
  btnDanger: { backgroundColor: colors.danger },
  btnGhostText: {
    ...typeStyles.button,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
  },
  btnSolidText: {
    ...typeStyles.button,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  pressed: { opacity: 0.85 },
});

export default confirm;
