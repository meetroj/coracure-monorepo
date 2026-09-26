import React, { type ReactNode, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography, shadow, gradient } from '@coracure/brand';
import { Icon, type IconName } from './Icon';
export { Icon, type IconName } from './Icon';


/* --------------------------------- screen --------------------------------- */

export const Screen = ({
  children,
  scroll = true,
  contentStyle,
  backdrop,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Page artwork painted over the flat page colour and under the content.
   * Pass `<ScreenBackground name="…" />`; anything `absoluteFill` works.
   */
  backdrop?: ReactNode;
}) => {
  const insets = useSafeAreaInsets();
  /**
   * Top inset is owned by the app's navigator, which wraps every screen —
   * applying it here too double-padded every screen that uses this component.
   * Bottom stays here: screens with a footer CTA and no tab bar need it, and
   * the tab bars apply their own.
   */
  const pad = { paddingLeft: insets.left, paddingRight: insets.right };
  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface.page} />
      {backdrop}
      {/* Lifts the content so the keyboard never covers the field being typed in. */}
      {/*
        iOS needs the view lifted explicitly. Android already resizes the window
        (`windowSoftInputMode="adjustResize"` in the manifest), so setting a
        behavior there fights it and makes the layout jump.
      */}
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[s.flex, pad]}>
          {scroll ? (
            <ScrollView
              style={s.flex}
              contentContainerStyle={[s.scrollContent, contentStyle]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[s.flex, contentStyle]}>{children}</View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export const AppHeader = ({
  right,
  onBack,
  logo,
}: {
  right?: ReactNode;
  onBack?: () => void;
  /**
   * The wide logo element, e.g. `<LogoWide width={120} height={30} />`. The
   * consuming app passes its own copy because Metro resolves `.svg` per app.
   * Without it the header falls back to the wordmark set in type.
   */
  logo?: ReactNode;
}) => (
  <View style={s.header}>
    <View style={s.headerLeft}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={10} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Icon name="arrowLeft" size={22} color={colors.ink} />
        </Pressable>
      )}
      {logo ?? <Text style={s.headerLogoText}>Coracure</Text>}
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
  style,
}: {
  label: string;
  tone?: Tone;
  dot?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) => {
  const c = toneColors[tone];
  return (
    <View style={[s.pill, { backgroundColor: c.bg }, style]}>
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
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}) => {
  const isPrimary = variant === 'primary' || variant === 'gradient';
  const isDanger = variant === 'danger';
  const fg = isPrimary || isDanger ? colors.white : colors.surfie;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [
        s.btn,
        size === 'sm' && s.btnSm,
        variant === 'primary' && s.btnPrimary,
        variant === 'secondary' && s.btnSecondary,
        variant === 'ghost' && s.btnGhost,
        variant === 'danger' && s.btnDanger,
        variant === 'gradient' && s.btnGradient,
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

/* ------------------------- Patient specific components ------------------------- */

export const TextInput = ({ label, error, icon, value, onChangeText, onFocus, onBlur, ...props }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={s.textInputWrapper}>
      {label && <Text style={s.textInputLabel}>{label}</Text>}
      <View style={[s.textInputContainer, isFocused && s.textInputFocused, error && s.textInputError]}>
        {icon && <Icon name={icon} size={20} color={isFocused ? colors.surfie : colors.inkMuted} />}
        <RNTextInput
          style={s.textInput}
          value={value}
          onChangeText={onChangeText}
          onFocus={(e) => { setIsFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); onBlur?.(e); }}
          placeholderTextColor={colors.inkMuted}
          {...props}
        />
      </View>
      {error && <Text style={s.textInputErrorText}>{error}</Text>}
    </View>
  );
};

export const PillButton = ({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
  accessibilityLabel,
  cornerRadius,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Overrides the stadium shape; pass a small number for a squared button. */
  cornerRadius?: number;
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={({ pressed }) => [
        s.pillButton,
        variant === 'secondary' && s.pillButtonSecondary,
        variant === 'ghost' && s.pillButtonGhost,
        (disabled || loading) && s.pillButtonDisabled,
        pressed && !disabled && s.pressed,
        cornerRadius !== undefined && { borderRadius: cornerRadius },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? colors.surfie : colors.white} size="small" />
      ) : (
        <>
          <Text
            style={[
              s.pillButtonText,
              variant === 'secondary' && s.pillButtonTextSecondary,
              variant === 'ghost' && s.pillButtonTextGhost,
            ]}
          >
            {label}
          </Text>
          {variant !== 'ghost' && (
            <View style={[s.pillCircleArrow, variant === 'secondary' && s.pillCircleArrowSecondary]}>
              <Icon name="arrowRight" size={16} color={colors.surfie} />
            </View>
          )}
        </>
      )}
    </Pressable>
  );
};

export const StepBadge = ({ current = 1, total = 3 }: { current?: number; total?: number }) => (
  <View style={s.stepBadge}>
    <Text style={s.stepBadgeText}>Step {current} of {total}</Text>
  </View>
);

export const BackgroundWatermarks = () => (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {/* Top Right Dot Grid Pattern */}
    <View style={s.dotGridTopRight}>
      {Array(16).fill(0).map((_, i) => (
        <View key={i} style={s.dotGridCell} />
      ))}
    </View>
    {/* Soft Medical Plus Watermark Top Left */}
    <View style={s.watermarkTopLeft}>
      <View style={s.watermarkCrossV} />
      <View style={s.watermarkCrossH} />
    </View>
    {/* Soft Medical Plus Watermark Bottom Right */}
    <View style={s.watermarkBottomRight}>
      <View style={s.watermarkCrossV} />
      <View style={s.watermarkCrossH} />
    </View>
  </View>
);

export const OTPInput = ({
  value,
  onChange,
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
}) => {
  const inputs = useRef<(RNTextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);

  const handleTextChange = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, '');
    if (!cleaned) {
      const arr = (value || '').padEnd(6, ' ').split('');
      arr[index] = ' ';
      const next = arr.join('').trimEnd();
      onChange(next);
      return;
    }

    if (cleaned.length > 1) {
      // Pasted full OTP code
      const pasted = cleaned.slice(0, 6);
      onChange(pasted);
      if (pasted.length === 6) {
        onComplete?.(pasted);
      }
      return;
    }

    const arr = (value || '').padEnd(6, ' ').split('');
    arr[index] = cleaned;
    const next = arr.join('').replace(/\s+$/g, '');
    onChange(next);

    if (index < 5 && cleaned) {
      inputs.current[index + 1]?.focus();
    }
    if (next.replace(/\s/g, '').length === 6) {
      onComplete?.(next.replace(/\s/g, ''));
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!value[index] && index > 0) {
        inputs.current[index - 1]?.focus();
      }
    }
  };

  return (
    <View style={s.otpContainer}>
      {Array(6).fill(0).map((_, i) => (
        <RNTextInput
          key={i}
          ref={(ref) => {
            inputs.current[i] = ref;
          }}
          style={[
            s.otpCell,
            focusedIndex === i && s.otpCellFocused,
            !!value[i] && value[i] !== ' ' && s.otpCellFilled,
          ]}
          maxLength={6}
          keyboardType="number-pad"
          value={value[i] && value[i] !== ' ' ? value[i] : ''}
          onChangeText={(t) => handleTextChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          onFocus={() => setFocusedIndex(i)}
          onBlur={() => setFocusedIndex(null)}
          selectTextOnFocus
        />
      ))}
    </View>
  );
};

export const CountryCodePicker = ({ onPress }: { onPress?: () => void }) => (
  <Pressable style={s.countryCodePicker} onPress={onPress}>
    <Text style={s.countryCodeEmoji}>🇮🇳</Text>
    <Text style={s.countryCodeText}>+91</Text>
    <Icon name="chevronDown" size={14} color={colors.inkMuted} />
  </Pressable>
);

export const BottomTabBar = ({ activeTab, onTabPress }: { activeTab: string, onTabPress: (tab: string) => void }) => {
  const tabs = [
    { key: 'home', icon: 'home' as IconName },
    { key: 'calendar', icon: 'calendar' as IconName },
    { key: 'folder', icon: 'folder' as IconName },
    { key: 'user', icon: 'user' as IconName }
  ];
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable key={tab.key} onPress={() => onTabPress(tab.key)} style={s.tabItem}>
            {isActive && <View style={s.tabIndicator} />}
            <Icon name={tab.icon} size={24} color={isActive ? colors.surfie : colors.inkMuted} filled={isActive} />
          </Pressable>
        );
      })}
    </View>
  );
};

export const ConsentSection = ({ title, children }: { title: string; children: ReactNode }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={s.consentSection}>
      <Pressable style={s.consentHeader} onPress={() => setExpanded(!expanded)}>
        <Text style={s.consentTitle}>{title}</Text>
        <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={18} color={colors.ink} />
      </Pressable>
      {expanded && <View style={s.consentContent}>{children}</View>}
    </View>
  );
};

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
  headerLogoText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.surfie,
  },
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
  btnGradient: { backgroundColor: gradient.brand[0] },
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

  textInputWrapper: {
    marginBottom: spacing.md,
  },
  textInputLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  textInputFocused: {
    borderColor: colors.surfie,
    borderWidth: 1.5,
  },
  textInputError: {
    borderColor: colors.danger,
  },
  textInput: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
    height: '100%',
  },
  textInputErrorText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.danger,
    marginTop: spacing.xs,
  },

  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  otpCell: {
    width: 48,
    height: 56,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    backgroundColor: colors.white,
    textAlign: 'center',
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '700',
    color: colors.ink,
  },
  otpCellFocused: {
    borderColor: colors.surfie,
    borderWidth: 1.5,
  },

  countryCodePicker: {
    /*
     * No border of its own: it sits inside the phone field alongside the
     * number, so its own box would read as a second field.
     */
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  countryCodeEmoji: {
    fontSize: typography.size.lg,
  },
  countryCodeText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
    marginRight: 4,
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    position: 'relative',
    flex: 1,
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.paris,
  },

  consentSection: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  consentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  consentTitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '600',
    color: colors.ink,
  },
  consentContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },

  /* PillButton styles */
  pillButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surfie,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: spacing.xl,
  },
  pillButtonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.surfie,
  },
  pillButtonGhost: {
    backgroundColor: 'transparent',
    height: 44,
  },
  pillButtonDisabled: {
    opacity: 0.5,
  },
  pillButtonText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.white,
  },
  pillButtonTextSecondary: {
    color: colors.surfie,
  },
  pillButtonTextGhost: {
    color: colors.inkMuted,
    fontWeight: '600',
  },
  pillCircleArrow: {
    position: 'absolute',
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillCircleArrowSecondary: {
    backgroundColor: colors.surface.selected,
  },

  /* StepBadge */
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface.selected,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  stepBadgeText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.surfie,
  },

  /* Background watermarks */
  dotGridTopRight: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 72,
    height: 72,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    opacity: 0.18,
  },
  dotGridCell: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfie,
  },
  watermarkTopLeft: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 140,
    height: 140,
    opacity: 0.06,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermarkBottomRight: {
    position: 'absolute',
    bottom: 20,
    right: -20,
    width: 160,
    height: 160,
    opacity: 0.06,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermarkCrossV: {
    position: 'absolute',
    width: 36,
    height: 120,
    borderRadius: 18,
    backgroundColor: colors.surfie,
  },
  watermarkCrossH: {
    position: 'absolute',
    width: 120,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfie,
  },

  otpCellFilled: {
    borderColor: colors.surfie,
    backgroundColor: colors.surface.selected,
  },
});
