import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Modal,
  ScrollView,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography, shadow } from '@coracure/brand';
import { Icon, type IconName } from './Icon';
import { Button } from './layout';

/* ------------------------------- skeletons -------------------------------- */

/**
 * A shimmering placeholder block.
 *
 * Skeletons exist so a screen that is loading looks like the screen it is
 * about to become — a spinner in the middle of an empty page tells the user
 * nothing about what is coming.
 */
export const Skeleton = ({
  width = '100%',
  height = 16,
  radius: r = radius.sm,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) => {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        s.skeleton,
        { width, height, borderRadius: r, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] }) },
        style,
      ]}
    />
  );
};

/** The skeleton for a card that will hold a title, two lines and a chip. */
export const SkeletonCard = ({ lines = 2 }: { lines?: number }) => (
  <View style={s.skeletonCard}>
    <View style={s.skeletonHead}>
      <Skeleton width={44} height={44} radius={22} />
      <View style={s.flex}>
        <Skeleton width="62%" height={14} />
        <Skeleton width="40%" height={11} style={{ marginTop: 8 }} />
      </View>
    </View>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} width={i === lines - 1 ? '70%' : '100%'} height={11} style={{ marginTop: 10 }} />
    ))}
  </View>
);

/* --------------------------- loading / empty / error ---------------------- */

export const LoadingState = ({ label = 'Loading…' }: { label?: string }) => (
  <View style={s.stateWrap} accessibilityLiveRegion="polite">
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
  compact,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) => (
  <View style={[s.stateWrap, compact && s.stateCompact]}>
    <View style={s.stateIcon}>
      <Icon name={icon} size={26} color={colors.surfie} />
    </View>
    <Text style={s.stateTitle} accessibilityRole="header">
      {title}
    </Text>
    {!!body && <Text style={s.stateBody}>{body}</Text>}
    {!!actionLabel && (
      <Button label={actionLabel} onPress={onAction} variant="secondary" size="md" full={false} />
    )}
  </View>
);

/**
 * The failure state.
 *
 * `requestId` is rendered, quietly, because every backend response carries an
 * `x-request-id` and it is the only thing that ties a screenshot from a user to
 * a log line. A raw stack trace is never shown.
 */
export const ErrorState = ({
  title = 'Something went wrong',
  body = 'We could not load this just now. Please try again.',
  onRetry,
  requestId,
  compact,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
  requestId?: string | null;
  compact?: boolean;
}) => (
  <View style={[s.stateWrap, compact && s.stateCompact]} accessibilityLiveRegion="polite">
    <View style={[s.stateIcon, s.stateIconDanger]}>
      <Icon name="alertCircle" size={26} color={colors.danger} />
    </View>
    <Text style={s.stateTitle} accessibilityRole="header">
      {title}
    </Text>
    <Text style={s.stateBody}>{body}</Text>
    {!!onRetry && (
      <Button
        label="Try again"
        icon="refresh"
        onPress={onRetry}
        variant="secondary"
        size="md"
        full={false}
      />
    )}
    {!!requestId && <Text style={s.requestId}>Reference: {requestId}</Text>}
  </View>
);

export const OfflineBanner = ({ onRetry }: { onRetry?: () => void }) => (
  <View style={s.offline} accessibilityLiveRegion="polite">
    <Icon name="wifiOff" size={16} color={colors.warn} />
    <Text style={s.offlineText}>You are offline. Some things will not be up to date.</Text>
    {!!onRetry && (
      <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button" accessibilityLabel="Retry">
        <Icon name="refresh" size={16} color={colors.warn} />
      </Pressable>
    )}
  </View>
);

/* ---------------------------------- banner -------------------------------- */

export type BannerTone = 'info' | 'success' | 'warn' | 'danger';

const bannerStyle: Record<BannerTone, { bg: string; fg: string; border: string; icon: IconName }> = {
  info: { bg: colors.surface.selected, fg: colors.surfie, border: '#CDEBDF', icon: 'info' },
  success: { bg: colors.successSoft, fg: colors.surfie, border: '#CDEBDF', icon: 'checkCircle' },
  warn: { bg: colors.warnSoft, fg: colors.warn, border: '#F5E3C4', icon: 'alertTriangle' },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: '#F6D5D3', icon: 'alertCircle' },
};

export const Banner = ({
  tone = 'info',
  title,
  body,
  actionLabel,
  onAction,
  onDismiss,
  icon,
}: {
  tone?: BannerTone;
  title?: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  icon?: IconName;
}) => {
  const t = bannerStyle[tone];
  return (
    <View
      style={[s.banner, { backgroundColor: t.bg, borderColor: t.border }]}
      accessibilityLiveRegion="polite"
    >
      <Icon name={icon ?? t.icon} size={18} color={t.fg} />
      <View style={s.flex}>
        {!!title && <Text style={[s.bannerTitle, { color: t.fg }]}>{title}</Text>}
        <Text style={s.bannerBody}>{body}</Text>
        {!!actionLabel && (
          <Pressable
            onPress={onAction}
            hitSlop={8}
            accessibilityRole="button"
            style={s.bannerAction}
          >
            <Text style={[s.bannerActionText, { color: t.fg }]}>{actionLabel}</Text>
            <Icon name="arrowRight" size={14} color={t.fg} />
          </Pressable>
        )}
      </View>
      {!!onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss">
          <Icon name="close" size={16} color={colors.inkFaint} />
        </Pressable>
      )}
    </View>
  );
};

/* -------------------------------- accordion ------------------------------- */

/**
 * The expandable sections the consent screen is built from.
 *
 * Collapsed by default, but the summary line is always visible: a consent
 * screen that hides what is being agreed to behind a tap is not consent.
 */
export const Accordion = ({
  title,
  icon,
  children,
  defaultOpen = false,
  tone = 'default',
}: {
  title: string;
  icon?: IconName;
  children: ReactNode;
  defaultOpen?: boolean;
  tone?: 'default' | 'danger';
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const fg = tone === 'danger' ? colors.danger : colors.surfie;
  return (
    <View style={[s.accordion, tone === 'danger' && s.accordionDanger]}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        accessibilityHint={open ? 'Collapses this section' : 'Expands this section'}
        style={({ pressed }) => [s.accordionHead, pressed && s.pressed]}
      >
        {icon && (
          <View style={[s.accordionIcon, tone === 'danger' && s.accordionIconDanger]}>
            <Icon name={icon} size={17} color={fg} />
          </View>
        )}
        <Text style={s.accordionTitle}>{title}</Text>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={18} color={colors.inkFaint} />
      </Pressable>
      {open && <View style={s.accordionBody}>{children}</View>}
    </View>
  );
};

/* ---------------------------------- sheet --------------------------------- */

/** A bottom sheet. Used for the country picker and any short confirmation. */
export const Sheet = ({
  visible,
  onClose,
  title,
  children,
  maxHeightRatio = 0.75,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxHeightRatio?: number;
}) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={s.sheetScrim} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={s.sheetGrip} />
        <View style={s.sheetHead}>
          <Text style={s.sheetTitle} accessibilityRole="header">
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Icon name="close" size={20} color={colors.inkMuted} />
          </Pressable>
        </View>
        <ScrollView
          style={{ maxHeight: `${Math.round(maxHeightRatio * 100)}%` }}
          contentContainerStyle={s.sheetBody}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
};

/* -------------------------------- countdown ------------------------------- */

/**
 * A ticking mm:ss. Used for the OTP resend timer and, later, for the
 * `pending_payment` slot hold — a `holdExpiresAt` the user cannot see is a
 * booking that vanishes without explanation.
 */
export const useCountdown = (until: number | null) => {
  const [remaining, setRemaining] = useState(() =>
    until ? Math.max(0, Math.ceil((until - Date.now()) / 1000)) : 0,
  );

  useEffect(() => {
    if (!until) {
      setRemaining(0);
      return;
    }
    const tick = () => setRemaining(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);

  return remaining;
};

export const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },

  skeleton: { backgroundColor: colors.surface.line },
  skeletonCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  skeletonHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  stateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  stateCompact: { paddingVertical: spacing.xl },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateIconDanger: { backgroundColor: colors.dangerSoft },
  stateTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  stateBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },
  requestId: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.inkFaint,
  },

  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warnSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  offlineText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.warn,
    fontWeight: '600',
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  bannerTitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '800',
    marginBottom: 2,
  },
  bannerBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 19,
  },
  bannerAction: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  bannerActionText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
  },

  accordion: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    overflow: 'hidden',
  },
  accordionDanger: { borderColor: '#F6D5D3', backgroundColor: colors.dangerSoft },
  accordionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    minHeight: 60,
  },
  accordionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionIconDanger: { backgroundColor: '#FBDDDB' },
  accordionTitle: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  accordionBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: 2,
    gap: spacing.sm,
  },

  sheetScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,32,28,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    ...shadow.raised,
  },
  sheetGrip: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface.inputBorder,
    marginBottom: spacing.md,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  sheetTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '800',
    color: colors.ink,
  },
  sheetBody: { paddingBottom: spacing.md, gap: 2 },
});
