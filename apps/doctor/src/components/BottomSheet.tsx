import React, { useEffect, useRef, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  BackHandler,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../theme/brand';
import { typeStyles, fontWeight } from '../theme/typography';
import { Icon, type IconName } from './Icon';
import { Portal } from './Portal';
import { useKeyboardHeight } from './useKeyboard';

/**
 * The one bottom sheet.
 *
 * Every sheet in the app — pickers, editors, menus — is this frame, so they
 * all clear the home indicator, lift above the keyboard, close on the X, the
 * backdrop and Android's back button, and never draw a control inside the
 * safe area.
 */
export const BottomSheet = ({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
  footerAboveKeyboard = false,
  scroll = true,
  testID,
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  /** X, backdrop and hardware back. Callers decide whether that discards. */
  onClose: () => void;
  children: ReactNode;
  /** Pinned under the content — the sheet's actions. */
  footer?: ReactNode;
  /** The footer is an input (a composer) and rides above the keyboard with the content. */
  footerAboveKeyboard?: boolean;
  scroll?: boolean;
  testID?: string;
}) => {
  if (!visible) return null;
  return (
    <Portal>
      <SheetFrame
        title={title}
        subtitle={subtitle}
        onClose={onClose}
        footer={footer}
        footerAboveKeyboard={footerAboveKeyboard}
        scroll={scroll}
        testID={testID}
      >
        {children}
      </SheetFrame>
    </Portal>
  );
};

const SheetFrame = ({
  title,
  subtitle,
  onClose,
  children,
  footer,
  footerAboveKeyboard,
  scroll,
  testID,
}: {
  title?: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  footerAboveKeyboard: boolean;
  scroll: boolean;
  testID?: string;
}) => {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const { height } = useWindowDimensions();
  const slide = useRef(new Animated.Value(1)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // the field that had the keyboard when this sheet opened — it is outside the
  // sheet, since the sheet's own fields have not mounted yet
  const typingOutside = useRef(TextInput.State?.currentlyFocusedInput?.() ?? null);

  // a picker or menu opened from a form takes over from the keyboard
  useEffect(() => {
    const field = typingOutside.current;
    if (field) TextInput.State?.blurTextInput?.(field);
  }, []);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slide]);

  // Android back closes the sheet, not the screen behind it
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCloseRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  // With the keyboard up the home indicator is behind it, so its inset would
  // only leave a gap between the sheet and the keys. The keyboard is taken
  // once, as padding under the content; the cap is the window below the
  // status bar, so the fields keep the room above the keys.
  const bottom = keyboard > 0 ? keyboard + spacing.sm : Math.max(insets.bottom, spacing.md) + spacing.sm;
  const maxHeight = height - insets.top - spacing.xl;

  const body = scroll ? (
    <ScrollView
      style={s.body}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={s.bodyStatic}>{children}</View>
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={s.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
        testID={testID ? `${testID}-backdrop` : undefined}
      />
      <Animated.View
        testID={testID}
        style={[
          s.sheet,
          { paddingBottom: bottom, maxHeight },
          { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 400] }) }] },
        ]}
      >
        <View style={s.handle} />
        {(!!title || !!subtitle) && (
          <View style={s.head}>
            <View style={s.flex}>
              {!!title && (
                <Text style={s.title} accessibilityRole="header">
                  {title}
                </Text>
              )}
              {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
            </View>
            <Pressable
              testID={testID ? `${testID}-close` : undefined}
              onPress={onClose}
              hitSlop={12}
              style={s.close}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Icon name="close" size={19} color={colors.ink} />
            </Pressable>
          </View>
        )}
        {body}
        {/* the actions wait under the keys while the doctor types, unless they are the input */}
        {!!footer && <View style={[s.footer, keyboard > 0 && !footerAboveKeyboard && s.away]}>{footer}</View>}
      </Animated.View>
    </View>
  );
};

/* ------------------------------- action sheet ------------------------------ */

export type SheetAction = {
  key: string;
  label: string;
  icon?: IconName;
  hint?: string;
  destructive?: boolean;
  onPress: () => void;
};

/**
 * A menu of real actions — what every ⋮ opens. A menu with nothing real to
 * offer is not drawn at all; the ⋮ goes with it.
 */
export const ActionSheet = ({
  visible,
  title,
  actions,
  onClose,
  testID,
}: {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
  testID?: string;
}) => (
  <BottomSheet visible={visible} title={title} onClose={onClose} testID={testID}>
    <View style={s.actionList}>
      {actions.map((a, i) => (
        <Pressable
          key={a.key}
          testID={`sheet-action-${a.key}`}
          onPress={() => {
            onClose();
            a.onPress();
          }}
          style={({ pressed }) => [s.action, i < actions.length - 1 && s.actionRule, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel={a.label}
        >
          {!!a.icon && (
            <View style={[s.actionIcon, a.destructive && s.actionIconDanger]}>
              <Icon name={a.icon} size={17} color={a.destructive ? colors.danger : colors.surfie} />
            </View>
          )}
          <View style={s.flex}>
            <Text style={[s.actionText, a.destructive && s.actionTextDanger]}>{a.label}</Text>
            {!!a.hint && <Text style={s.actionHint}>{a.hint}</Text>}
          </View>
        </Pressable>
      ))}
    </View>
  </BottomSheet>
);

/* --------------------------------- footer --------------------------------- */

/** The two-button footer most sheets end with: a quiet cancel and the action. */
export const SheetActions = ({
  cancelLabel = 'Cancel',
  onCancel,
  confirmLabel,
  onConfirm,
  confirmDisabled,
  destructive,
  testID,
}: {
  cancelLabel?: string;
  onCancel: () => void;
  confirmLabel: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  destructive?: boolean;
  testID?: string;
}) => (
  <View style={s.sheetActions}>
    <Pressable
      testID={testID ? `${testID}-cancel` : undefined}
      onPress={onCancel}
      style={({ pressed }) => [s.btn, s.btnGhost, pressed && s.pressed]}
      accessibilityRole="button"
    >
      <Text style={s.btnGhostText}>{cancelLabel}</Text>
    </Pressable>
    <Pressable
      testID={testID ? `${testID}-confirm` : undefined}
      onPress={onConfirm}
      disabled={confirmDisabled}
      style={({ pressed }) => [
        s.btn,
        destructive ? s.btnDanger : s.btnSolid,
        confirmDisabled && s.btnOff,
        pressed && !confirmDisabled && s.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!confirmDisabled }}
    >
      <Text style={s.btnSolidText}>{confirmLabel}</Text>
    </Pressable>
  </View>
);

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.75 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,32,29,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface.inputBorder,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  title: { ...typeStyles.sectionTitle, color: colors.ink },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 2 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.page,
  },
  body: { flexGrow: 0 },
  bodyStatic: {},
  footer: { marginTop: spacing.md },
  away: { display: 'none' },

  actionList: {
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  actionRule: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconDanger: { backgroundColor: colors.dangerSoft },
  actionText: { ...typeStyles.body, fontWeight: fontWeight.medium, color: colors.ink },
  actionTextDanger: { color: colors.danger },
  actionHint: { ...typeStyles.caption, color: colors.inkMuted },

  sheetActions: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  btnGhost: { borderWidth: 1.5, borderColor: colors.surfie, backgroundColor: colors.white },
  btnGhostText: { ...typeStyles.button, color: colors.surfie },
  btnSolid: { backgroundColor: colors.surfie },
  btnDanger: { backgroundColor: colors.danger },
  btnOff: { opacity: 0.45 },
  btnSolidText: { ...typeStyles.button, color: colors.white },
});

export default BottomSheet;
