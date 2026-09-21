import React, { type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  useWindowDimensions,
  type ViewStyle,
  type StyleProp,
  type ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { colors, radius, spacing, typography, breakpoint, gradient, shadow } from '@coracure/brand';
import { Icon, type IconName } from './Icon';

/* ------------------------------- responsive ------------------------------- */

export type Layout = {
  /** Viewport width in points. */
  width: number;
  /** iPhone SE and narrower — tighten padding, never reflow. */
  isCompact: boolean;
  /** Tablet / desktop — centre the column instead of stretching it. */
  isWide: boolean;
  /** Horizontal page padding for this viewport. */
  gutter: number;
  /** Max width of the readable column. */
  maxWidth: number;
};

/**
 * One hook decides every responsive value, so a screen never re-derives a
 * breakpoint by hand and the app cannot disagree with itself about what
 * "compact" means.
 */
export const useLayout = (): Layout => {
  const { width } = useWindowDimensions();
  const isCompact = width < breakpoint.compact;
  const isWide = width >= breakpoint.wide;
  return {
    width,
    isCompact,
    isWide,
    gutter: isCompact ? spacing.lg : isWide ? spacing.xxxl : spacing.xl,
    maxWidth: breakpoint.maxContentWidth,
  };
};

/* -------------------------------- gradient -------------------------------- */

/**
 * A linear gradient without a native dependency: `react-native-svg` is already
 * in the workspace, and adding `react-native-linear-gradient` would mean a
 * rebuild for something one absolutely-positioned Svg does.
 */
export const GradientFill = ({
  colors: stops = gradient.brand as unknown as string[],
  radius: r = 0,
  /** 'diagonal' matches the brand tile; 'horizontal' the CTA. */
  direction = 'diagonal',
}: {
  colors?: readonly string[];
  radius?: number;
  direction?: 'diagonal' | 'horizontal' | 'vertical';
}) => {
  const id = React.useId();
  const [x2, y2] = direction === 'horizontal' ? [1, 0] : direction === 'vertical' ? [0, 1] : [1, 1];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2={String(x2)} y2={String(y2)}>
            {stops.map((c, i) => (
              <Stop key={c + i} offset={String(i / Math.max(stops.length - 1, 1))} stopColor={c} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" rx={r} ry={r} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
};

/* --------------------------------- screen --------------------------------- */

/**
 * Every screen sits fully inside the safe area — never under the status bar,
 * notch, gesture bar or navigation bar, top or bottom. Insets come from the
 * device, never from hardcoded numbers.
 *
 * `bottomInset` is false when the screen sits above the tab bar, since the tab
 * bar already absorbs the bottom inset — applying it twice double-pads.
 *
 * On a tablet or a desktop browser the children are centred in a column of
 * `maxWidth` rather than stretched edge to edge.
 */
export const Screen = ({
  children,
  scroll = true,
  contentStyle,
  bottomInset = false,
  background = 'page',
  header,
  footer,
  refreshControl,
  testID,
  wide = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  bottomInset?: boolean;
  /** 'transparent' lets a BrandBackground behind it show through. */
  background?: 'page' | 'white' | 'transparent';
  /** Pinned above the scroll area. */
  header?: ReactNode;
  /** Pinned below it — primary CTAs that must not scroll away. */
  footer?: ReactNode;
  refreshControl?: ScrollViewProps['refreshControl'];
  testID?: string;
  /** Composed screens can use a wider, responsive content grid. */
  wide?: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const { gutter, maxWidth, isWide } = useLayout();

  const bg =
    background === 'transparent'
      ? 'transparent'
      : background === 'white'
        ? colors.white
        : colors.surface.page;

  const column: StyleProp<ViewStyle> = [
    { paddingHorizontal: gutter, width: '100%' },
    isWide && { maxWidth: wide ? 1120 : maxWidth, alignSelf: 'center' as const },
  ];

  return (
    <View style={[s.screen, { backgroundColor: bg }]} testID={testID}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface.page} translucent={false} />
      <View
        style={[
          s.flex,
          {
            paddingTop: insets.top,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            paddingBottom: bottomInset ? insets.bottom : 0,
          },
        ]}
      >
        {header ? <View style={column}>{header}</View> : null}

        {scroll ? (
          <ScrollView
            style={s.flex}
            contentContainerStyle={[s.scrollContent, column, contentStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={refreshControl}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[s.flex, column, contentStyle]}>{children}</View>
        )}

        {footer ? <View style={[s.footer, column]}>{footer}</View> : null}
      </View>
    </View>
  );
};

/**
 * App header. Renders the official wide logo asset supplied with the brand
 * guidelines — never a text or icon recreation of it. The consuming app passes
 * its own copy of the asset because Metro resolves `.svg` per app.
 */
export const AppHeader = ({
  logo,
  right,
  onBack,
  title,
}: {
  /** The wide logo element, e.g. `<LogoWide width={124} height={31} />`. */
  logo?: ReactNode;
  right?: ReactNode;
  onBack?: () => void;
  /** Used instead of the logo on interior screens. */
  title?: string;
}) => (
  <View style={s.header}>
    <View style={s.headerLeft}>
      {onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={s.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrowLeft" size={22} color={colors.ink} />
        </Pressable>
      )}
      {title ? <Text style={s.headerTitle}>{title}</Text> : logo}
    </View>
    <View style={s.headerRight}>{right}</View>
  </View>
);

export const IconButton = ({
  name,
  onPress,
  badge = false,
  label,
  tone = 'plain',
  size = 21,
}: {
  name: IconName;
  onPress?: () => void;
  /** True shows the unread dot; a number shows a count. */
  badge?: boolean | number;
  label: string;
  tone?: 'plain' | 'surface';
  size?: number;
}) => (
  <Pressable
    onPress={onPress}
    hitSlop={10}
    style={({ pressed }) => [s.iconBtn, tone === 'surface' && s.iconBtnSurface, pressed && s.pressed]}
    accessibilityRole="button"
    accessibilityLabel={
      typeof badge === 'number' && badge > 0 ? `${label}, ${badge} unread` : label
    }
  >
    <Icon name={name} size={size} color={colors.ink} />
    {badge === true && <View style={s.badgeDot} />}
    {typeof badge === 'number' && badge > 0 && (
      <View style={s.badgeCount}>
        <Text style={s.badgeCountText} numberOfLines={1}>
          {badge > 99 ? '99+' : badge}
        </Text>
      </View>
    )}
  </Pressable>
);

/* ---------------------------------- text ---------------------------------- */

export const PageTitle = ({
  title,
  subtitle,
  align = 'left',
}: {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
}) => (
  <View style={[s.pageTitleWrap, align === 'center' && s.center]}>
    <Text style={[s.pageTitle, align === 'center' && s.textCenter]} accessibilityRole="header">
      {title}
    </Text>
    {!!subtitle && (
      <Text style={[s.pageSubtitle, align === 'center' && s.textCenter]}>{subtitle}</Text>
    )}
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
      <Text style={s.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {!!subtitle && <Text style={s.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {!!actionLabel && (
      <Pressable
        onPress={onAction}
        hitSlop={10}
        style={s.sectionAction}
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel}, ${title}`}
      >
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
  elevation = 'card',
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'default' | 'mint' | 'warn' | 'danger' | 'brand';
  elevation?: 'none' | 'card' | 'raised';
  accessibilityLabel?: string;
}) => {
  const toneStyle =
    tone === 'mint'
      ? s.cardMint
      : tone === 'warn'
        ? s.cardWarn
        : tone === 'danger'
          ? s.cardDanger
          : tone === 'brand'
            ? s.cardBrand
            : null;
  const elevStyle = elevation === 'raised' ? s.raised : elevation === 'card' ? s.elevCard : null;
  const content = <View style={[s.card, elevStyle, toneStyle, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => pressed && s.pressed}
    >
      {content}
    </Pressable>
  );
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
      <Text style={[s.pillText, { color: c.fg }]}>{label}</Text>
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
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [s.chip, active && s.chipActive, pressed && s.pressed]}
    accessibilityRole="button"
    accessibilityState={{ selected: !!active }}
  >
    <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
  </Pressable>
);

/** The "Private · Secure · Verified" trust row under the splash mark. */
export const TrustRow = ({ items }: { items: { icon: IconName; label: string }[] }) => (
  <View style={s.trustRow}>
    {items.map((it, i) => (
      <React.Fragment key={it.label}>
        {i > 0 && <View style={s.trustDivider} />}
        <View style={s.trustItem}>
          <Icon name={it.icon} size={13} color={colors.surfie} />
          <Text style={s.trustText}>{it.label}</Text>
        </View>
      </React.Fragment>
    ))}
  </View>
);

/* -------------------------------- avatar ---------------------------------- */

export const Avatar = ({
  initials,
  size = 46,
  online,
  tone = 'brand',
}: {
  initials: string;
  size?: number;
  online?: boolean;
  tone?: 'brand' | 'light';
}) => (
  <View>
    <View
      style={[
        s.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        tone === 'light' && s.avatarLight,
      ]}
    >
      <Text
        style={[s.avatarText, { fontSize: size * 0.34 }, tone === 'light' && s.avatarTextLight]}
        allowFontScaling={false}
      >
        {initials}
      </Text>
    </View>
    {online && <View style={[s.avatarDot, { right: 0, bottom: 0 }]} />}
  </View>
);

/**
 * The logo tile: the brand mark on the gradient rounded square used on the
 * splash and the auth screens.
 */
export const LogoTile = ({ mark, size = 76 }: { mark: ReactNode; size?: number }) => (
  <View
    style={[s.logoTile, { width: size, height: size, borderRadius: size * 0.3 }]}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    <GradientFill radius={size * 0.3} />
    <View style={s.logoTileInner}>{mark}</View>
  </View>
);

/* -------------------------------- buttons --------------------------------- */

/**
 * The primary CTA in the visual direction carries a trailing arrow in a circle
 * ("Get Started →", "Continue →"). `trailingArrow` is that treatment; it is a
 * decoration inside the button, never a separate control, so the whole pill is
 * one 56pt touch target.
 */
export const Button = ({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  size = 'lg',
  trailingArrow = false,
  full = true,
  style,
  testID,
  accessibilityHint,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  trailingArrow?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityHint?: string;
}) => {
  const isFilled = variant === 'primary' || variant === 'danger';
  const fg = isFilled ? colors.white : variant === 'quiet' ? colors.inkMuted : colors.cta;
  const inert = disabled || loading;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inert, busy: !!loading }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        s.btn,
        size === 'sm' && s.btnSm,
        size === 'md' && s.btnMd,
        !full && s.btnAuto,
        variant === 'secondary' && s.btnSecondary,
        variant === 'ghost' && s.btnGhost,
        variant === 'quiet' && s.btnQuiet,
        variant === 'danger' && s.btnDanger,
        variant === 'primary' && s.btnPrimary,
        inert && s.btnDisabled,
        pressed && !inert && s.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityDots color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={size === 'sm' ? 15 : 18} color={fg} />}
          <Text
            style={[s.btnText, size === 'sm' && s.btnTextSm, { color: fg }]}
          >
            {label}
          </Text>
          {trailingArrow && (
            <View style={[s.btnArrow, !isFilled && s.btnArrowOutline]}>
              <Icon name="arrowRight" size={15} color={isFilled ? colors.cta : colors.white} />
            </View>
          )}
        </>
      )}
    </Pressable>
  );
};

/**
 * Three pulsing dots instead of a spinner inside buttons — an ActivityIndicator
 * changes the button's intrinsic height on Android and makes the CTA jump.
 */
const ActivityDots = ({ color }: { color: string }) => (
  <View style={s.dots} accessibilityLabel="Working">
    {[0, 1, 2].map((i) => (
      <View key={i} style={[s.dot, { backgroundColor: color, opacity: 1 - i * 0.28 }]} />
    ))}
  </View>
);

/* --------------------------------- rows ----------------------------------- */

export const ListRow = ({
  icon,
  title,
  subtitle,
  right,
  onPress,
  danger,
  last,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
    style={({ pressed }) => [s.row, !last && s.rowBorder, pressed && !!onPress && s.pressed]}
  >
    {icon && (
      <View style={[s.rowIcon, danger && s.rowIconDanger]}>
        <Icon name={icon} size={19} color={danger ? colors.danger : colors.surfie} />
      </View>
    )}
    <View style={s.flex}>
      <Text style={[s.rowTitle, danger && { color: colors.danger }]}>{title}</Text>
      {!!subtitle && <Text style={s.rowSubtitle}>{subtitle}</Text>}
    </View>
    {right}
    {onPress && !danger && !right && (
      <Icon name="chevronRight" size={17} color={colors.inkFaint} />
    )}
  </Pressable>
);

export const ProgressBar = ({ percent, label }: { percent: number; label?: string }) => {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  return (
    <View
      style={s.progressTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      accessibilityLabel={label}
    >
      <View style={[s.progressFill, { width: `${clamped}%` }]} />
    </View>
  );
};

export const Divider = ({ style }: { style?: StyleProp<ViewStyle> }) => (
  <View style={[s.divider, style]} />
);

/** "Step 1 of 5" progress dots under the onboarding CTA. */
export const StepDots = ({ total, index }: { total: number; index: number }) => (
  <View style={s.stepDots} accessibilityLabel={`Step ${index + 1} of ${total}`}>
    {Array.from({ length: total }).map((_, i) => (
      <View key={i} style={[s.stepDot, i === index && s.stepDotActive]} />
    ))}
  </View>
);

const s = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center' },
  textCenter: { textAlign: 'center' },
  screen: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxxl, gap: spacing.lg },
  pressed: { opacity: 0.75 },
  footer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: 'transparent',
    gap: spacing.sm,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  backBtn: { padding: spacing.xs, marginLeft: -spacing.xs },

  iconBtn: { padding: spacing.sm },
  iconBtnSurface: {
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  badgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.paris,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeCount: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeCountText: { color: colors.white, fontSize: 9, fontWeight: '800' },

  pageTitleWrap: { gap: spacing.xs },
  pageTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 21,
  },

  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  sectionSubtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    marginTop: 1,
  },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },

  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  elevCard: { ...shadow.card },
  raised: { ...shadow.raised },
  cardMint: { backgroundColor: colors.surface.mint, borderColor: '#D8F2E7' },
  cardWarn: { backgroundColor: colors.warnSoft, borderColor: '#F5E3C4' },
  cardDanger: { backgroundColor: colors.dangerSoft, borderColor: '#F6D5D3' },
  cardBrand: { backgroundColor: colors.surface.selected, borderColor: '#CDEBDF' },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
  },

  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
  },
  chipActive: { backgroundColor: colors.surface.selected, borderColor: colors.surfie },
  chipText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    fontWeight: '600',
  },
  chipTextActive: { color: colors.surfie, fontWeight: '700' },

  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustDivider: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.inkFaint },
  trustText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    fontWeight: '600',
  },

  avatar: {
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLight: { backgroundColor: 'rgba(255,255,255,0.22)' },
  avatarText: { color: colors.surfie, fontWeight: '800' },
  avatarTextLight: { color: colors.white },
  avatarDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.paris,
    borderWidth: 2,
    borderColor: colors.white,
  },

  logoTile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadow.floating,
  },
  logoTileInner: { alignItems: 'center', justifyContent: 'center' },

  btn: {
    minHeight: 56,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    overflow: 'hidden',
  },
  btnAuto: { alignSelf: 'flex-start' },
  btnMd: { minHeight: 48 },
  btnSm: { minHeight: 40, paddingHorizontal: spacing.lg, gap: 6 },
  // Flat, not a gradient — see the note on `colors.cta`.
  btnPrimary: { backgroundColor: colors.cta, ...shadow.floating },
  btnSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.cta,
  },
  btnGhost: { backgroundColor: colors.surface.selected },
  btnQuiet: { backgroundColor: 'transparent', minHeight: 44 },
  btnDanger: { backgroundColor: colors.danger },
  btnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
  btnText: {
    flexShrink: 1,
    textAlign: 'center',
    fontFamily: typography.body.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  btnTextSm: { fontSize: typography.size.sm },
  btnArrow: {
    flexShrink: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  btnArrowOutline: { backgroundColor: colors.cta },

  dots: { flexDirection: 'row', gap: 5, height: 22, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
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
  rowTitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '600',
    color: colors.ink,
  },
  rowSubtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    marginTop: 1,
  },

  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface.line,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.paris },

  divider: { height: 1, backgroundColor: colors.surface.line },

  stepDots: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.surface.inputBorder },
  stepDotActive: { width: 20, backgroundColor: colors.surfie },
});

export { s as layoutStyles };
