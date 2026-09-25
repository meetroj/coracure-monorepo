import React, { useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image,
  Keyboard,
  TextInput,
  type ViewStyle,
  type StyleProp,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

import { useResponsive, MAX_CONTENT_WIDTH } from '../theme/responsive';
import { colors, radius, spacing, shadow } from '../theme/brand';
import { typeStyles, fontWeight } from '../theme/typography';
import { Icon, type IconName } from './Icon';
import { useKeyboardHeight } from './useKeyboard';

/* --------------------------------- screen --------------------------------- */

type Measurable = {
  measureLayout: (rel: unknown, ok: (x: number, y: number, w: number, h: number) => void, fail: () => void) => void;
};

/**
 * Keeps whichever field has focus above the keyboard.
 *
 * The screen's container shrinks by the keyboard's height (so a sticky footer
 * rides up with it). Once the scroll view has taken its new, shorter size, the
 * focused input is measured against the visible part of it and scrolled into
 * view if it ended up underneath. On Android the keyboard event can arrive
 * before that resize, so the measurement waits for the new layout, with a
 * short fallback for when the size does not change at all.
 */
const useScrollFocusedIntoView = () => {
  const scrollRef = useRef<ScrollView | null>(null);
  const offset = useRef(0);
  const viewport = useRef(0);
  const pending = useRef(false);

  const reveal = useCallback(() => {
    const input = TextInput.State?.currentlyFocusedInput?.() as unknown as Measurable | null;
    const scroller = scrollRef.current as unknown as { getInnerViewRef?: () => unknown } | null;
    const inner = scroller?.getInnerViewRef?.();
    if (!input || !inner || typeof input.measureLayout !== 'function') return;
    input.measureLayout(
      inner,
      (_x, y, _w, h) => {
        const top = offset.current;
        const bottom = top + viewport.current;
        const margin = spacing.lg;
        if (y + h + margin > bottom) {
          scrollRef.current?.scrollTo({ y: Math.max(0, y + h + margin - viewport.current), animated: true });
        } else if (y - margin < top) {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - margin), animated: true });
        }
      },
      // an input that has gone away cannot be scrolled to; nothing to do
      () => undefined
    );
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      pending.current = true;
      timer = setTimeout(() => {
        if (!pending.current) return;
        pending.current = false;
        reveal();
      }, 250);
    });
    return () => {
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, [reveal]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
  }, []);
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      viewport.current = e.nativeEvent.layout.height;
      if (pending.current) {
        pending.current = false;
        requestAnimationFrame(reveal);
      }
    },
    [reveal]
  );

  return { scrollRef, onScroll, onLayout };
};

/**
 * Every screen sits inside the safe area — never under the status bar, notch,
 * home indicator or navigation bar. Insets come from the device.
 *
 * The bottom inset follows the tab bar: a tab screen sits above the bar, which
 * already absorbs it, while a pushed screen has no bar and pads its own end so
 * the last row never lands in the home-indicator zone. A `footer` is pinned
 * under the content and carries the inset itself. With the keyboard up the
 * whole screen shrinks above it, footer included, and the focused field is
 * scrolled into view.
 */
export const Screen = ({
  children,
  scroll = true,
  contentStyle,
  footer,
  header,
  background = colors.surface.page,
  topColor,
  testID,
  scrollRef: externalRef,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Pinned below the scroll area, above the home indicator and the keyboard. */
  footer?: ReactNode;
  /** Pinned above the scroll area — a header that must not scroll away. */
  header?: ReactNode;
  background?: string;
  /** Fills the status-bar strip, for a screen whose first block is a card of another colour. */
  topColor?: string;
  testID?: string;
  scrollRef?: React.RefObject<ScrollView | null>;
}) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const keyboard = useKeyboardHeight();
  const { isTablet } = useResponsive();
  const { scrollRef, onScroll, onLayout } = useScrollFocusedIntoView();

  const underTabBar = tabBarHeight !== undefined;
  // with the keyboard up the home indicator sits behind it
  const endInset = keyboard > 0 || underTabBar ? 0 : insets.bottom;
  const cap = isTablet ? { maxWidth: MAX_CONTENT_WIDTH, width: '100%' as const, alignSelf: 'center' as const } : null;
  // the tab bar is behind the keyboard too, so only the part above it is lost
  const lift = keyboard > 0 ? Math.max(0, keyboard - (underTabBar ? tabBarHeight ?? 0 : 0)) : 0;

  const setRef = (r: ScrollView | null) => {
    scrollRef.current = r;
    if (externalRef) (externalRef as React.MutableRefObject<ScrollView | null>).current = r;
  };

  return (
    <View testID={testID} style={[s.screen, { backgroundColor: background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={topColor ?? background} />
      {topColor ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: topColor }} />
      ) : null}
      <View
        style={[
          s.flex,
          { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right, paddingBottom: lift },
        ]}
      >
        {header}
        {scroll ? (
          <ScrollView
            ref={setRef}
            style={s.flex}
            contentContainerStyle={[
              { paddingBottom: (footer ? spacing.lg : spacing.xxxl) + (footer ? 0 : endInset) },
              cap,
              contentStyle,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onScroll={onScroll}
            onLayout={onLayout}
            scrollEventThrottle={32}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[s.flex, cap, contentStyle]}>{children}</View>
        )}
        {!!footer && (
          <View
            style={[
              s.footer,
              { paddingBottom: keyboard > 0 || underTabBar ? spacing.md : Math.max(insets.bottom, spacing.md) },
            ]}
          >
            {footer}
          </View>
        )}
      </View>
    </View>
  );
};

/* ------------------------------ header buttons ---------------------------- */

/**
 * A 40pt squircle with a 44pt touch target. `badge` draws a count, capped at
 * 9+, or a dot when it is `true`.
 */
export const IconButton = ({
  name,
  onPress,
  badge,
  label,
  testID,
}: {
  name: IconName;
  onPress: () => void;
  badge?: boolean | number;
  label: string;
  testID?: string;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    hitSlop={4}
    style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
    accessibilityRole="button"
    accessibilityLabel={typeof badge === 'number' && badge > 0 ? `${label}, ${badge} unread` : label}
  >
    <Icon name={name} size={20} color={colors.ink} />
    {badge === true && <View style={s.badgeDot} />}
    {typeof badge === 'number' && badge > 0 && (
      <View style={s.badgeCount}>
        <Text style={s.badgeCountText} maxFontSizeMultiplier={1.2}>
          {badge > 9 ? '9+' : badge}
        </Text>
      </View>
    )}
  </Pressable>
);

/* ---------------------------------- text ---------------------------------- */

export const PageTitle = ({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) => (
  <View style={s.pageTitleWrap}>
    <View style={s.flex}>
      <Text style={s.pageTitle} accessibilityRole="header">
        {title}
      </Text>
      {!!subtitle && <Text style={s.pageSubtitle}>{subtitle}</Text>}
    </View>
    {right}
  </View>
);

export const SectionHeader = ({
  title,
  subtitle,
  actionLabel,
  onAction,
  testID,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}) => (
  <View style={s.sectionHeader}>
    <View style={s.flex}>
      <Text style={s.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {!!subtitle && <Text style={s.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {!!actionLabel && !!onAction && (
      <Pressable testID={testID} onPress={onAction} hitSlop={10} style={s.sectionAction} accessibilityRole="button">
        <Text style={s.sectionActionText}>{actionLabel}</Text>
        <Icon name="chevronRight" size={15} color={colors.surfie} />
      </Pressable>
    )}
  </View>
);

/* ---------------------------------- card ---------------------------------- */

export const Card = ({
  children,
  style,
  onPress,
  tone = 'default',
  testID,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'default' | 'mint' | 'warn' | 'danger';
  testID?: string;
  accessibilityLabel?: string;
}) => {
  const toneStyle =
    tone === 'mint' ? s.cardMint : tone === 'warn' ? s.cardWarn : tone === 'danger' ? s.cardDanger : null;

  // The card styles must land on the OUTERMOST node, so layout props like
  // `flex: 1` size the pressable itself rather than an inner view.
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [s.card, toneStyle, style, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={[s.card, toneStyle, style]}>
      {children}
    </View>
  );
};

/* --------------------------------- pills ---------------------------------- */

export type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'brand';

export const toneColors: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: '#EFF3F1', fg: colors.inkMuted },
  success: { bg: colors.successSoft, fg: colors.surfie },
  warn: { bg: colors.warnSoft, fg: colors.warn },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  brand: { bg: colors.surface.selected, fg: colors.surfie },
};

export const StatusPill = ({
  label,
  tone = 'neutral',
  dot = true,
  icon,
  testID,
}: {
  label: string;
  tone?: Tone;
  dot?: boolean;
  icon?: IconName;
  testID?: string;
}) => {
  const c = toneColors[tone];
  return (
    <View testID={testID} style={[s.pill, { backgroundColor: c.bg }]}>
      {icon ? <Icon name={icon} size={13} color={c.fg} /> : dot && <View style={[s.pillDot, { backgroundColor: c.fg }]} />}
      <Text style={[s.pillText, { color: c.fg }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </View>
  );
};

export const FilterChip = ({
  label,
  active,
  onPress,
  testID,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  testID?: string;
  icon?: IconName;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    style={({ pressed }) => [s.chip, active && s.chipActive, pressed && s.pressed]}
    accessibilityRole="button"
    accessibilityState={{ selected: !!active }}
  >
    {!!icon && <Icon name={icon} size={13} color={active ? colors.white : colors.surfie} />}
    <Text style={[s.chipText, active && s.chipTextActive]} maxFontSizeMultiplier={1.3}>
      {label}
    </Text>
  </Pressable>
);

/* -------------------------------- avatar ---------------------------------- */

/**
 * `photo` wins when supplied; `initials` is the fallback and stays required so
 * an avatar can never render empty while an image is missing or still loading.
 * `online` is the signed-in doctor's own availability — never drawn on a
 * patient, whose presence the app does not know.
 */
export const Avatar = ({
  initials,
  size = 46,
  online,
  photo,
  tone = 'mint',
}: {
  initials: string;
  size?: number;
  online?: boolean;
  photo?: ImageSourcePropType;
  tone?: 'mint' | 'brand';
}) => (
  <View>
    <View
      style={[s.avatar, tone === 'brand' && s.avatarBrand, { width: size, height: size, borderRadius: size / 2 }]}
    >
      {photo ? (
        <Image
          source={photo}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text
          style={[
            s.avatarText,
            tone === 'brand' && s.avatarTextBrand,
            { fontSize: Math.max(13, Math.round(size * 0.34)) },
          ]}
          maxFontSizeMultiplier={1.1}
        >
          {initials}
        </Text>
      )}
    </View>
    {online !== undefined && <View style={[s.avatarDot, !online && s.avatarDotOff]} />}
  </View>
);

/* -------------------------------- buttons --------------------------------- */

/**
 * Presses closer together than this are the same tap bouncing, not intent.
 * Tests set it to 0 so a spec can press the same button twice.
 */
export const tapGuard = { ms: 500 };

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconRight = false,
  disabled,
  loading,
  size = 'md',
  style,
  testID,
  accessibilityHint,
}: {
  label: string;
  onPress?: () => void;
  /**
   * `accent` is the Paris Green CTA used on dark Surfie surfaces. Ink label,
   * not white — white on Paris Green fails contrast. `outlineLight` is the
   * secondary action beside it on that same dark surface.
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'outlineLight';
  icon?: IconName;
  iconRight?: boolean;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityHint?: string;
}) => {
  const lastTap = useRef(0);
  const fg =
    variant === 'accent'
      ? colors.ink
      : variant === 'outlineLight' || variant === 'primary' || variant === 'danger'
        ? colors.white
        : colors.surfie;
  const off = !!disabled || !!loading;
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        // a double tap must not save twice or push the same screen twice
        const now = Date.now();
        if (now - lastTap.current < tapGuard.ms) return;
        lastTap.current = now;
        onPress?.();
      }}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: !!loading }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        s.btn,
        size === 'sm' && s.btnSm,
        variant === 'primary' && s.btnPrimary,
        variant === 'secondary' && s.btnSecondary,
        variant === 'ghost' && s.btnGhost,
        variant === 'danger' && s.btnDanger,
        variant === 'accent' && s.btnAccent,
        variant === 'outlineLight' && s.btnOutlineLight,
        off && s.btnDisabled,
        pressed && !off && s.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon && !iconRight && <Icon name={icon} size={size === 'sm' ? 15 : 17} color={fg} />}
          <Text
            style={[s.btnText, size === 'sm' && s.btnTextSm, { color: fg }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {label}
          </Text>
          {icon && iconRight && <Icon name={icon} size={size === 'sm' ? 15 : 17} color={fg} />}
        </>
      )}
    </Pressable>
  );
};

/* --------------------------------- rows ----------------------------------- */

/**
 * A settings-style row. The trailing element sits on the title's line, never
 * under the subtitle. A row with no `onPress` is information, not a control:
 * it draws no chevron and does not react to touch.
 */
export const ListRow = ({
  icon,
  title,
  subtitle,
  right,
  onPress,
  danger,
  last,
  compact = false,
  testID,
  accessibilityHint,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
  compact?: boolean;
  testID?: string;
  accessibilityHint?: string;
}) => {
  const body = (
    <>
      {icon && (
        <View style={[s.rowIcon, compact && s.rowIconCompact, danger && s.rowIconDanger]}>
          <Icon name={icon} size={compact ? 17 : 19} color={danger ? colors.danger : colors.surfie} />
        </View>
      )}
      <View style={s.flex}>
        <Text style={[s.rowTitle, compact && s.rowTitleCompact, danger && { color: colors.danger }]}>{title}</Text>
        {!!subtitle && <Text style={s.rowSubtitle}>{subtitle}</Text>}
      </View>
      {right}
      {onPress && !danger && <Icon name="chevronRight" size={17} color={colors.inkFaint} />}
    </>
  );
  const style = [s.row, compact && s.rowCompact, !last && s.rowBorder];
  if (!onPress) {
    return (
      <View testID={testID} style={style} accessible accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [...style, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
    >
      {body}
    </Pressable>
  );
};

export const ProgressBar = ({ percent }: { percent: number }) => (
  <View style={s.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }}>
    <View style={[s.progressFill, { width: `${Math.max(0, Math.min(100, percent))}%` }]} />
  </View>
);

export const Divider = () => <View style={s.divider} />;

/* ------------------------- loading / empty / error ------------------------ */

export const LoadingState = ({ label = 'Loading…' }: { label?: string }) => (
  <View style={s.stateWrap}>
    <ActivityIndicator color={colors.surfie} />
    <Text style={s.stateBody}>{label}</Text>
  </View>
);

export const EmptyState = ({
  icon = 'folder',
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <View style={s.stateWrap}>
    <View style={s.stateIcon}>
      <Icon name={icon} size={26} color={colors.surfie} />
    </View>
    <Text style={s.stateTitle}>{title}</Text>
    {!!body && <Text style={s.stateBody}>{body}</Text>}
    {!!actionLabel && !!onAction && (
      <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" style={s.stateBtn} />
    )}
  </View>
);

export const ErrorState = ({ onRetry, body }: { onRetry?: () => void; body?: string }) => (
  <View style={s.stateWrap}>
    <View style={[s.stateIcon, { backgroundColor: colors.dangerSoft }]}>
      <Icon name="alertCircle" size={26} color={colors.danger} />
    </View>
    <Text style={s.stateTitle}>Something went wrong</Text>
    <Text style={s.stateBody}>{body ?? 'We could not load this right now.'}</Text>
    {onRetry && <Button label="Try again" onPress={onRetry} variant="secondary" size="sm" style={s.stateBtn} />}
  </View>
);

/** A short explanatory note in a soft tint — the app's info banner. */
export const Note = ({
  children,
  icon = 'info',
  tone = 'brand',
  testID,
  style,
}: {
  children: ReactNode;
  icon?: IconName;
  tone?: 'brand' | 'warn' | 'danger' | 'neutral';
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const c =
    tone === 'warn'
      ? { bg: colors.warnSoft, fg: colors.warn }
      : tone === 'danger'
        ? { bg: colors.dangerSoft, fg: colors.danger }
        : tone === 'neutral'
          ? { bg: '#F2F5F4', fg: colors.inkMuted }
          : { bg: colors.surface.mint, fg: colors.surfie };
  return (
    <View testID={testID} style={[s.note, { backgroundColor: c.bg }, style]}>
      <Icon name={icon} size={15} color={c.fg} />
      <Text style={[s.noteText, { color: tone === 'brand' ? colors.ink : c.fg }]}>{children}</Text>
    </View>
  );
};

/** A local on/off with a stable toggle function. */
export const useToggle = (initial = false) => {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((v) => !v), []);
  return [on, toggle, setOn] as const;
};

/* --------------------------------- styles --------------------------------- */

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.75 },
  screen: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },

  iconBtn: {
    width: 40,
    height: 40,
    // Squircle, not a pill — a full radius reads as a badge rather than a button.
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  badgeDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.paris,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeCount: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCountText: { ...typeStyles.caption, fontSize: 11, lineHeight: 13, fontWeight: fontWeight.semibold, color: colors.white },

  pageTitleWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  pageTitle: { ...typeStyles.pageTitle, color: colors.ink },
  pageSubtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typeStyles.sectionTitle, color: colors.ink },
  sectionSubtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 1 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  sectionActionText: { ...typeStyles.button, color: colors.surfie },

  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    ...shadow.card,
  },
  cardMint: { backgroundColor: colors.surface.mintSoft, borderColor: colors.surface.selected },
  cardWarn: { backgroundColor: colors.warnSoft, borderColor: '#F5E3C4' },
  cardDanger: { backgroundColor: colors.dangerSoft, borderColor: '#F7D5D3' },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    flexShrink: 1,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { ...typeStyles.status },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  chipActive: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  chipText: { ...typeStyles.status, color: colors.inkMuted },
  chipTextActive: { color: colors.white },

  avatar: {
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
    // Android does not clip a child to the parent radius without this.
    overflow: 'hidden',
  },
  avatarBrand: { backgroundColor: colors.surfie },
  avatarText: { ...typeStyles.avatar, lineHeight: undefined, color: colors.surfie },
  avatarTextBrand: { color: colors.white },
  avatarDot: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.paris,
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarDotOff: { backgroundColor: colors.inkFaint },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
  },
  btnSm: { minHeight: 44, borderRadius: radius.md, paddingHorizontal: spacing.md },
  btnPrimary: { backgroundColor: colors.surfie },
  btnSecondary: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.surfie },
  btnGhost: { backgroundColor: 'transparent' },
  btnDanger: { backgroundColor: colors.danger },
  btnAccent: { backgroundColor: colors.paris },
  btnOutlineLight: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' },
  // one disabled look everywhere: the same button, faded
  btnDisabled: { opacity: 0.45 },
  btnText: { ...typeStyles.button },
  btnTextSm: { ...typeStyles.buttonSmall },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.md,
  },
  rowCompact: { minHeight: 52, paddingVertical: spacing.sm + 2 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconCompact: { width: 34, height: 34, borderRadius: 10 },
  rowIconDanger: { backgroundColor: colors.dangerSoft },
  rowTitle: { ...typeStyles.cardTitle, color: colors.ink },
  rowTitleCompact: { ...typeStyles.body, fontFamily: typeStyles.cardTitle.fontFamily, fontWeight: fontWeight.medium },
  rowSubtitle: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },

  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#E3EBE8', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.paris },
  divider: { height: 1, backgroundColor: colors.surface.line, marginVertical: spacing.md },

  stateWrap: { alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.sm },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  stateTitle: { ...typeStyles.cardTitle, color: colors.ink, textAlign: 'center' },
  stateBody: { ...typeStyles.body, color: colors.inkMuted, textAlign: 'center' },
  stateBtn: { marginTop: spacing.sm, alignSelf: 'center' },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  noteText: { ...typeStyles.caption, flex: 1 },
});

export default Screen;
