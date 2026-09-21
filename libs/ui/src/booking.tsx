import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing, typography } from '@coracure/brand';
import { Icon, type IconName } from './Icon';
import { useCountdown, formatDuration } from './feedback';

/**
 * The controls the booking flow is built from.
 *
 * They live in `@coracure/ui` rather than in the patient app because the doctor
 * app's availability screen needs the same day strip and the same slot chip,
 * and two copies would drift within a sprint.
 */

/* -------------------------------- day strip ------------------------------- */

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type DayOption = {
  date: Date;
  /** Rendered instead of the weekday — "Today", "Tomorrow". */
  label?: string;
  /** Greyed and unselectable. */
  disabled?: boolean;
};

/**
 * A horizontal date picker.
 *
 * A strip rather than a calendar grid: booking horizons here are days, not
 * months, and a strip keeps the whole choice on one thumb-reachable row.
 */
export const DayStrip = ({
  days,
  selectedIndex,
  onSelect,
  style,
}: {
  days: DayOption[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={[s.dayStrip, style]}
    accessibilityRole="radiogroup"
  >
    {days.map((day, i) => {
      const on = i === selectedIndex;
      const label =
        day.label ?? `${DAY_SHORT[day.date.getDay()]} ${day.date.getDate()}`;
      return (
        <Pressable
          key={day.date.toISOString()}
          onPress={() => !day.disabled && onSelect(i)}
          disabled={day.disabled}
          accessibilityRole="radio"
          accessibilityState={{ checked: on, disabled: !!day.disabled }}
          accessibilityLabel={label}
          style={({ pressed }) => [
            s.day,
            on && s.dayOn,
            day.disabled && s.dayDisabled,
            pressed && !day.disabled && s.pressed,
          ]}
        >
          <Text style={[s.dayName, on && s.dayTextOn]} numberOfLines={1}>
            {day.label ?? DAY_SHORT[day.date.getDay()]}
          </Text>
          <Text style={[s.dayNum, on && s.dayTextOn]}>{day.date.getDate()}</Text>
        </Pressable>
      );
    })}
  </ScrollView>
);

/* -------------------------------- time slot ------------------------------- */

/**
 * One bookable time.
 *
 * `estimated` renders the chip with a dotted edge, which is how the UI keeps
 * the G-1 promise honest: a candidate time and a time the pool has actually
 * confirmed must not look identical.
 */
export const TimeSlot = ({
  label,
  selected,
  disabled,
  estimated,
  onPress,
  accessibilityHint,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  estimated?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="radio"
    accessibilityState={{ checked: !!selected, disabled: !!disabled }}
    accessibilityLabel={label}
    accessibilityHint={accessibilityHint}
    style={({ pressed }) => [
      s.slot,
      estimated && s.slotEstimated,
      selected && s.slotOn,
      disabled && s.slotDisabled,
      pressed && !disabled && s.pressed,
    ]}
  >
    <Text style={[s.slotText, selected && s.slotTextOn, disabled && s.slotTextDisabled]}>
      {label}
    </Text>
  </Pressable>
);

/* ------------------------------- countdown -------------------------------- */

/**
 * The slot-hold countdown.
 *
 * *** THIS IS SAFETY-CRITICAL UI, NOT DECORATION. *** A `pending_payment`
 * consultation IS the hold, and it expires. `onExpire` fires once, when the
 * clock reaches zero, so the screen can switch to the expired state instead of
 * leaving a Pay button that cannot work.
 */
export const CountdownTimer = ({
  until,
  onExpire,
  label,
  tone = 'warn',
  compact,
}: {
  /** Epoch ms, or null when nothing is being held. */
  until: number | null;
  onExpire?: () => void;
  /** Sentence around the clock; `{time}` is substituted by the caller. */
  label?: string;
  tone?: 'warn' | 'danger' | 'brand';
  compact?: boolean;
}) => {
  const remaining = useCountdown(until);
  const firedRef = React.useRef(false);

  React.useEffect(() => {
    if (until === null) {
      firedRef.current = false;
      return;
    }
    if (remaining <= 0 && !firedRef.current) {
      firedRef.current = true;
      onExpire?.();
    }
  }, [remaining, until, onExpire]);

  if (until === null) return null;

  const palette =
    tone === 'danger'
      ? { bg: colors.dangerSoft, fg: colors.danger, border: '#F6D5D3' }
      : tone === 'brand'
        ? { bg: colors.surface.selected, fg: colors.surfie, border: '#CDEBDF' }
        : { bg: colors.warnSoft, fg: colors.warn, border: '#F5E3C4' };

  return (
    <View
      style={[
        s.countdown,
        compact && s.countdownCompact,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
    >
      <Icon name="clock" size={compact ? 14 : 16} color={palette.fg} />
      <Text style={[s.countdownText, compact && s.countdownTextCompact, { color: palette.fg }]}>
        {label ?? formatDuration(remaining)}
      </Text>
      {!label && null}
    </View>
  );
};

/* --------------------------------- chips ---------------------------------- */

/** A tappable suggestion or recent search. */
export const SuggestionChip = ({
  label,
  icon,
  onPress,
  tone = 'default',
}: {
  label: string;
  icon?: IconName;
  onPress?: () => void;
  tone?: 'default' | 'brand';
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => [
      s.chip,
      tone === 'brand' && s.chipBrand,
      pressed && s.pressed,
    ]}
  >
    {icon && <Icon name={icon} size={14} color={colors.inkFaint} />}
    <Text style={[s.chipText, tone === 'brand' && s.chipTextBrand]} numberOfLines={1}>
      {label}
    </Text>
  </Pressable>
);

/* ----------------------------- step progress ------------------------------ */

/**
 * "Step 2 of 4" as a filled bar.
 *
 * Distinct from `StepDots`, which marks a position in onboarding. This one is
 * for a flow the user is working through and can go back in.
 */
export const StepProgress = ({
  step,
  total,
  label,
}: {
  /** 1-based. */
  step: number;
  total: number;
  label?: string;
}) => (
  <View
    style={s.progressWrap}
    accessibilityRole="progressbar"
    accessibilityValue={{ min: 0, max: total, now: step }}
    accessibilityLabel={label}
  >
    <View style={s.progressTrack}>
      <View style={[s.progressFill, { width: `${(step / Math.max(total, 1)) * 100}%` }]} />
    </View>
    {!!label && <Text style={s.progressLabel}>{label}</Text>}
  </View>
);

const s = StyleSheet.create({
  pressed: { opacity: 0.75 },

  dayStrip: { gap: spacing.sm, paddingRight: spacing.lg },
  day: {
    minWidth: 62,
    minHeight: 66,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.surface.inputBorder,
  },
  dayOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  dayDisabled: { opacity: 0.4 },
  dayName: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    fontWeight: '700',
  },
  dayNum: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    color: colors.ink,
    fontWeight: '800',
  },
  dayTextOn: { color: colors.white },

  slot: {
    minWidth: 92,
    minHeight: 48,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.surface.inputBorder,
  },
  // Dashed edge = a candidate time, confirmed at booking. See gap G-1.
  slotEstimated: { borderStyle: 'dashed' },
  slotOn: {
    backgroundColor: colors.surface.selected,
    borderColor: colors.surfie,
    borderStyle: 'solid',
  },
  slotDisabled: { opacity: 0.45, backgroundColor: colors.surface.page },
  slotText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
    fontWeight: '600',
  },
  slotTextOn: { color: colors.surfie, fontWeight: '800' },
  slotTextDisabled: { color: colors.inkFaint },

  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  countdownCompact: { paddingVertical: 4, paddingHorizontal: 9 },
  countdownText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '800',
  },
  countdownTextCompact: { fontSize: typography.size.xs },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    ...shadow.card,
  },
  chipBrand: { backgroundColor: colors.surface.selected, borderColor: '#CDEBDF' },
  chipText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    fontWeight: '600',
  },
  chipTextBrand: { color: colors.surfie, fontWeight: '700' },

  progressWrap: { gap: 6 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface.line,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.paris },
  progressLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    fontWeight: '600',
  },
});
