import { typeStyles, fontWeight } from '../../../../libs/typography/src';
import React, { type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image,
  type ViewStyle,
  type StyleProp,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsive, MAX_CONTENT_WIDTH } from '../theme/responsive';

import LogoWide from '../assets/brand/logo-wide.svg';
import { colors, radius, spacing, typography, shadow } from '../theme/brand';
import { Icon, type IconName } from './Icon';

/* --------------------------------- screen --------------------------------- */

/**
 * Every screen sits fully inside the safe area — never under the status bar,
 * notch, gesture bar or navigation bar, top or bottom. Insets come from the
 * device, never from hardcoded numbers.
 *
 * `bottomInset` is false when the screen sits above the tab bar, since the tab
 * bar already absorbs the bottom inset — applying it twice double-pads.
 */
export const Screen = ({
  children,
  scroll = true,
  contentStyle,
  bottomInset = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  bottomInset?: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const pad = {
    paddingTop: insets.top,
    // landscape notches eat into the sides, so honour those insets too
    paddingLeft: insets.left,
    paddingRight: insets.right,
    paddingBottom: bottomInset ? insets.bottom : 0,
  };
  // Past tablet width a single column of clinical text becomes unreadable, so
  // cap it and centre rather than stretching every row edge to edge.
  const cap = isTablet ? { maxWidth: MAX_CONTENT_WIDTH, width: '100%' as const, alignSelf: 'center' as const } : null;

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface.page} />
      <View style={[s.flex, pad]}>
        {scroll ? (
          <ScrollView
            style={s.flex}
            contentContainerStyle={[s.scrollContent, cap, contentStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            // large accessibility text needs the extra room at the bottom
            keyboardDismissMode="on-drag"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[s.flex, cap, contentStyle]}>{children}</View>
        )}
      </View>
    </View>
  );
};

/**
 * App header. Renders the official wide logo asset supplied with the brand
 * guidelines — never a text or icon recreation of it.
 */
export const AppHeader = ({
  right,
  onBack,
}: {
  right?: ReactNode;
  onBack?: () => void;
}) => (
  <View style={s.header}>
    <View style={s.headerLeft}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={10} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Icon name="arrowLeft" size={22} color={colors.ink} />
        </Pressable>
      )}
      {/* official asset, unmodified — clear space preserved by the padding */}
      <LogoWide width={124} height={31} />
    </View>
    <View style={s.headerRight}>{right}</View>
  </View>
);

export const IconButton = ({
  name,
  onPress,
  badge = false,
  label,
  testID,
}: {
  name: IconName;
  onPress?: () => void;
  badge?: boolean;
  label?: string;
  testID?: string;
}) => (
  <Pressable testID={testID} onPress={onPress} hitSlop={8} style={s.iconBtn} accessibilityRole="button" accessibilityLabel={label ?? name}>
    <Icon name={name} size={21} color={colors.ink} />
    {badge && <View style={s.badgeDot} />}
  </Pressable>
);

/* ---------------------------------- text ---------------------------------- */

export const PageTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={s.pageTitleWrap}>
    <Text style={[typeStyles.body, s.pageTitle]}>{title}</Text>
    {!!subtitle && <Text style={[typeStyles.body, s.pageSubtitle]}>{subtitle}</Text>}
  </View>
);

export const SectionHeader = ({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <View style={s.sectionHeader}>
    <View style={s.flex}>
      <Text style={[typeStyles.body, s.sectionTitle]}>{title}</Text>
      {!!subtitle && <Text style={[typeStyles.body, s.sectionSubtitle]}>{subtitle}</Text>}
    </View>
    {!!actionLabel && (
      <Pressable onPress={onAction} hitSlop={8} style={s.sectionAction}>
        <Text style={[typeStyles.body, s.sectionActionText]}>{actionLabel}</Text>
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
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'default' | 'mint' | 'warn' | 'danger';
  /** Lets a pressable card be targeted directly rather than through its label. */
  testID?: string;
}) => {
  const toneStyle =
    tone === 'mint' ? s.cardMint : tone === 'warn' ? s.cardWarn : tone === 'danger' ? s.cardDanger : null;

  // The card styles must land on the OUTERMOST node. Previously the pressable
  // variant wrapped a styled View, so layout props like `flex: 1` applied to
  // the inner view while the unflexed Pressable sized to content — which broke
  // side-by-side rows.
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [s.card, toneStyle, style, pressed && s.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View testID={testID} style={[s.card, toneStyle, style]}>{children}</View>;
};

/* --------------------------------- pills ---------------------------------- */

export type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'brand';

const toneColors: Record<Tone, { bg: string; fg: string }> = {
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
}: {
  label: string;
  tone?: Tone;
  dot?: boolean;
  icon?: IconName;
}) => {
  const c = toneColors[tone];
  return (
    <View style={[s.pill, { backgroundColor: c.bg }]}>
      {icon ? (
        <Icon name={icon} size={13} color={c.fg} />
      ) : (
        dot && <View style={[s.pillDot, { backgroundColor: c.fg }]} />
      )}
      <Text style={[typeStyles.body, [s.pillText, { color: c.fg }]]}>{label}</Text>
    </View>
  );
};

export const FilterChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]} accessibilityRole="button">
    <Text style={[typeStyles.body, [s.chipText, active && s.chipTextActive]]}>{label}</Text>
  </Pressable>
);

/* -------------------------------- avatar ---------------------------------- */

/**
 * `photo` wins when supplied; `initials` is the fallback and stays required so
 * an avatar can never render empty while an image is missing or still loading.
 */
export const Avatar = ({
  initials,
  size = 46,
  online,
  photo,
}: {
  initials: string;
  size?: number;
  online?: boolean;
  photo?: ImageSourcePropType;
}) => (
  <View>
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {photo ? (
        <Image
          source={photo}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text style={[typeStyles.body, [s.avatarText, { ...typeStyles.body }]]}>{initials}</Text>
      )}
    </View>
    {online && <View style={s.avatarDot} />}
  </View>
);

/* -------------------------------- buttons --------------------------------- */

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
}: {
  label: string;
  onPress?: () => void;
  /**
   * `accent` is the Paris Green CTA used on dark Surfie surfaces, where a
   * `primary` button would disappear into the background. Ink label, not
   * white — white on Paris Green fails contrast.
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  icon?: IconName;
  /** Place the icon after the label instead of before it. */
  iconRight?: boolean;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) => {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const fg = variant === 'accent' ? colors.ink : isPrimary || isDanger ? colors.white : colors.surfie;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btn,
        size === 'sm' && s.btnSm,
        variant === 'primary' && s.btnPrimary,
        variant === 'secondary' && s.btnSecondary,
        variant === 'ghost' && s.btnGhost,
        variant === 'danger' && s.btnDanger,
        variant === 'accent' && s.btnAccent,
        (disabled || loading) && s.btnDisabled,
        pressed && !disabled && s.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon && !iconRight && <Icon name={icon} size={size === 'sm' ? 15 : 17} color={fg} />}
          <Text style={[typeStyles.body, [s.btnText, size === 'sm' && s.btnTextSm, { color: fg }]]}>{label}</Text>
          {icon && iconRight && <Icon name={icon} size={size === 'sm' ? 15 : 17} color={fg} />}
        </>
      )}
    </Pressable>
  );
};

/* --------------------------------- rows ----------------------------------- */

export const ListRow = ({
  icon,
  title,
  subtitle,
  right,
  onPress,
  danger,
  last,
  compact = false,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
  compact?: boolean;
}) => (
  <Pressable onPress={onPress} style={({ pressed }) => [s.row, compact && { paddingVertical: 10, gap: 10 }, !last && s.rowBorder, pressed && s.pressed]}>
    {icon && (
      <View style={[s.rowIcon, compact && { width: 30, height: 30 }, danger && s.rowIconDanger]}>
        <Icon name={icon} size={19} color={danger ? colors.danger : colors.surfie} />
      </View>
    )}
    <View style={s.flex}>
      <Text style={[typeStyles.body, [s.rowTitle, compact && { ...typeStyles.body }, danger && { color: colors.danger }]]}>{title}</Text>
      {!!subtitle && <Text style={[typeStyles.body, [s.rowSubtitle, compact && { ...typeStyles.caption }]]}>{subtitle}</Text>}
      {compact && right ? <View style={{ marginTop: 4 }}>{right}</View> : null}
    </View>
    {!compact && right}
    {onPress && !danger && <Icon name="chevronRight" size={17} color={colors.inkFaint} />}
  </Pressable>
);

export const ProgressBar = ({ percent }: { percent: number }) => (
  <View style={s.progressTrack}>
    <View style={[s.progressFill, { width: `${Math.max(0, Math.min(100, percent))}%` }]} />
  </View>
);

export const Divider = () => <View style={s.divider} />;

/* ------------------------- loading / empty / error ------------------------ */

export const LoadingState = ({ label = 'Loading…' }: { label?: string }) => (
  <View style={s.stateWrap}>
    <ActivityIndicator color={colors.surfie} />
    <Text style={[typeStyles.body, s.stateBody]}>{label}</Text>
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
    <Text style={[typeStyles.body, s.stateTitle]}>{title}</Text>
    {!!body && <Text style={[typeStyles.body, s.stateBody]}>{body}</Text>}
    {!!actionLabel && <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" style={s.stateBtn} />}
  </View>
);

export const ErrorState = ({ onRetry, body }: { onRetry?: () => void; body?: string }) => (
  <View style={s.stateWrap}>
    <View style={[s.stateIcon, { backgroundColor: colors.dangerSoft }]}>
      <Icon name="alertCircle" size={26} color={colors.danger} />
    </View>
    <Text style={[typeStyles.body, s.stateTitle]}>Something went wrong</Text>
    <Text style={[typeStyles.body, s.stateBody]}>{body ?? 'We could not load this right now.'}</Text>
    {onRetry && <Button label="Try again" onPress={onRetry} variant="secondary" size="sm" style={s.stateBtn} />}
  </View>
);

export const OfflineBanner = () => (
  <View style={s.offline}>
    <Icon name="alertCircle" size={15} color={colors.warn} />
    <Text style={[typeStyles.body, s.offlineText]}>You are offline. Showing last synced data.</Text>
  </View>
);

/* --------------------------------- styles --------------------------------- */

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  screen: { flex: 1, backgroundColor: colors.surface.page },
  scrollContent: { paddingBottom: spacing.xxxl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { marginRight: spacing.md },
  iconBtn: {
    width: 38,
    height: 38,
    // Squircle, not a pill — a full 19 reads as a circle badge rather than a button.
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

  pageTitleWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.lg },
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
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
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
    paddingVertical: 5,
    // Minimal radius, not a capsule — matches the squircle buttons and chips.
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { ...typeStyles.status },

  chip: {
    paddingHorizontal: spacing.lg,
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
  avatarText: {
    ...typeStyles.avatar,
    color: colors.surfie,
  },
  avatarDot: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.paris,
    borderWidth: 2,
    borderColor: colors.white,
  },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
  },
  btnSm: { height: 40, borderRadius: radius.md, paddingHorizontal: spacing.md },
  btnPrimary: { backgroundColor: colors.surfie },
  btnSecondary: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.surfie },
  btnGhost: { backgroundColor: 'transparent' },
  btnDanger: { backgroundColor: colors.danger },
  btnAccent: { backgroundColor: colors.paris },
  btnDisabled: { opacity: 0.45 },
  btnText: { ...typeStyles.button },
  btnTextSm: { ...typeStyles.buttonSmall },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: colors.dangerSoft },
  rowTitle: { ...typeStyles.cardTitle, color: colors.ink },
  rowSubtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 1 },

  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E3EBE8',
    overflow: 'hidden',
  },
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
  stateTitle: { ...typeStyles.cardTitle, color: colors.ink },
  stateBody: { ...typeStyles.body, color: colors.inkMuted, textAlign: 'center' },
  stateBtn: { marginTop: spacing.sm, alignSelf: 'center' },

  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warnSoft,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  offlineText: { ...typeStyles.body, color: colors.warn },
});

export default {};
