import React, { type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const pad = {
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
    paddingBottom: bottomInset ? insets.bottom : 0,
  };
  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface.page} />
      <View style={[s.flex, pad]}>
        {scroll ? (
          <ScrollView
            style={s.flex}
            contentContainerStyle={[s.scrollContent, contentStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[s.flex, contentStyle]}>{children}</View>
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
}: {
  name: IconName;
  onPress?: () => void;
  badge?: boolean;
  label?: string;
}) => (
  <Pressable onPress={onPress} hitSlop={8} style={s.iconBtn} accessibilityRole="button" accessibilityLabel={label ?? name}>
    <Icon name={name} size={21} color={colors.ink} />
    {badge && <View style={s.badgeDot} />}
  </Pressable>
);

/* ---------------------------------- text ---------------------------------- */

export const PageTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={s.pageTitleWrap}>
    <Text style={s.pageTitle}>{title}</Text>
    {!!subtitle && <Text style={s.pageSubtitle}>{subtitle}</Text>}
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
      <Text style={s.sectionTitle}>{title}</Text>
      {!!subtitle && <Text style={s.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {!!actionLabel && (
      <Pressable onPress={onAction} hitSlop={8} style={s.sectionAction}>
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
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'default' | 'mint' | 'warn' | 'danger';
}) => {
  const toneStyle =
    tone === 'mint' ? s.cardMint : tone === 'warn' ? s.cardWarn : tone === 'danger' ? s.cardDanger : null;
  const content = <View style={[s.card, toneStyle, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && s.pressed}>
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
  <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]} accessibilityRole="button">
    <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
  </Pressable>
);

/* -------------------------------- avatar ---------------------------------- */

export const Avatar = ({
  initials,
  size = 46,
  online,
}: {
  initials: string;
  size?: number;
  online?: boolean;
}) => (
  <View>
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.avatarText, { fontSize: size * 0.34 }]}>{initials}</Text>
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
  disabled,
  loading,
  size = 'md',
  style,
  testID,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) => {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const fg = isPrimary || isDanger ? colors.white : colors.surfie;
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
        (disabled || loading) && s.btnDisabled,
        pressed && !disabled && s.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} color={fg} />}
          <Text style={[s.btnText, size === 'sm' && s.btnTextSm, { color: fg }]}>{label}</Text>
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
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) => (
  <Pressable onPress={onPress} style={({ pressed }) => [s.row, !last && s.rowBorder, pressed && s.pressed]}>
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
    {!!actionLabel && <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" style={s.stateBtn} />}
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

export const OfflineBanner = () => (
  <View style={s.offline}>
    <Icon name="alertCircle" size={15} color={colors.warn} />
    <Text style={s.offlineText}>You are offline. Showing last synced data.</Text>
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
    borderRadius: 19,
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
  pageTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '700',
    color: colors.ink,
  },
  pageSubtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    marginTop: 2,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.ink,
  },
  sectionSubtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
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
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  chipActive: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  chipText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  chipTextActive: { color: colors.white },

  avatar: {
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.heading.family,
    fontWeight: '700',
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
  btnDisabled: { opacity: 0.45 },
  btnText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
  },
  btnTextSm: { fontSize: typography.size.md },

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
  rowTitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.lg,
    fontWeight: '600',
    color: colors.ink,
  },
  rowSubtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 1,
  },

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
  stateTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  stateBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  stateBtn: { marginTop: spacing.sm, alignSelf: 'center' },

  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warnSoft,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  offlineText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.warn,
    fontWeight: '600',
  },
});

export default {};
