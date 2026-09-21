import React, { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';

import { colors, radius, spacing, typography } from '@coracure/brand';
import { Icon, type IconName } from './Icon';

/* -------------------------------- field shell ----------------------------- */

/**
 * The label / control / message sandwich every field uses.
 *
 * The error message carries `accessibilityLiveRegion="polite"` so a screen
 * reader announces a validation failure when it appears rather than only when
 * the user happens to focus the field again.
 */
export const Field = ({
  label,
  error,
  hint,
  required,
  children,
  style,
}: {
  label?: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[s.field, style]}>
    {!!label && (
      <Text style={s.label}>
        {label}
        {required && <Text style={s.required}> *</Text>}
      </Text>
    )}
    {children}
    {!!error && (
      <View style={s.msgRow} accessibilityLiveRegion="polite">
        <Icon name="alertCircle" size={13} color={colors.danger} />
        <Text style={s.errorText}>{error}</Text>
      </View>
    )}
    {!error && !!hint && <Text style={s.hintText}>{hint}</Text>}
  </View>
);

/* -------------------------------- text field ------------------------------ */

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  icon?: IconName;
  /** Rendered at the trailing edge — a unit, a toggle, a clear button. */
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export const TextField = ({
  label,
  error,
  hint,
  required,
  icon,
  right,
  containerStyle,
  onFocus,
  onBlur,
  ...input
}: TextFieldProps) => {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} error={error} hint={hint} required={required} style={containerStyle}>
      <View style={[s.control, focused && s.controlFocused, !!error && s.controlError]}>
        {icon && <Icon name={icon} size={18} color={focused ? colors.surfie : colors.inkFaint} />}
        <TextInput
          {...input}
          style={s.input}
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel={input.accessibilityLabel ?? label}
          // Announcing the message here covers the case where focus lands on
          // the input itself rather than on the message below it.
          accessibilityHint={error ?? input.accessibilityHint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {right}
      </View>
    </Field>
  );
};

/* ------------------------------- phone field ------------------------------ */

export type CountryCode = { dial: string; iso: string; flag: string; name: string; digits: number };

/**
 * The dial codes offered in the picker. India is the launch market and is the
 * default; the rest are here so a returning NRI patient is not locked out.
 * `digits` is the national significant number length, which is what local
 * validation checks before the backend's E.164 rule ever sees the value.
 */
export const COUNTRY_CODES: CountryCode[] = [
  { dial: '+91', iso: 'IN', flag: '🇮🇳', name: 'India', digits: 10 },
  { dial: '+1', iso: 'US', flag: '🇺🇸', name: 'United States', digits: 10 },
  { dial: '+44', iso: 'GB', flag: '🇬🇧', name: 'United Kingdom', digits: 10 },
  { dial: '+971', iso: 'AE', flag: '🇦🇪', name: 'United Arab Emirates', digits: 9 },
  { dial: '+61', iso: 'AU', flag: '🇦🇺', name: 'Australia', digits: 9 },
  { dial: '+65', iso: 'SG', flag: '🇸🇬', name: 'Singapore', digits: 8 },
];

export const PhoneField = ({
  country,
  onCountryPress,
  value,
  onChangeText,
  error,
  label = 'Mobile Number',
  autoFocus,
  onSubmitEditing,
  editable = true,
  testID,
}: {
  country: CountryCode;
  onCountryPress?: () => void;
  /** National significant digits only — the dial code is not part of it. */
  value: string;
  onChangeText: (next: string) => void;
  error?: string | null;
  label?: string;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  editable?: boolean;
  testID?: string;
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} error={error}>
      <View style={[s.control, s.phoneControl, focused && s.controlFocused, !!error && s.controlError]}>
        <Pressable
          onPress={onCountryPress}
          disabled={!onCountryPress || !editable}
          style={s.dial}
          accessibilityRole="button"
          accessibilityLabel={`Country code, ${country.name}, ${country.dial}`}
          accessibilityHint={onCountryPress ? 'Opens the country list' : undefined}
        >
          <Text style={s.dialFlag} allowFontScaling={false}>
            {country.flag}
          </Text>
          <Text style={s.dialText}>{country.dial}</Text>
          {!!onCountryPress && <Icon name="chevronDown" size={14} color={colors.inkMuted} />}
        </Pressable>
        <View style={s.dialDivider} />
        <TextInput
          testID={testID}
          style={s.input}
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, country.digits))}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          inputMode="numeric"
          maxLength={country.digits}
          editable={editable}
          autoFocus={autoFocus}
          returnKeyType="done"
          onSubmitEditing={onSubmitEditing}
          placeholder={'0'.repeat(country.digits).replace(/(.{5})/, '$1 ')}
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel={label}
          accessibilityHint={error ?? undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </Field>
  );
};

/* --------------------------------- OTP input ------------------------------ */

/**
 * A fixed-length code entry.
 *
 * Three behaviours matter and each is easy to get wrong:
 *
 * - **Paste.** A code arriving from the clipboard or an SMS autofill lands in
 *   ONE box as a whole string. Splitting it across the boxes is handled in
 *   `handleChange` rather than assuming one character per event.
 * - **Backspace on an empty box** moves focus back and clears the previous
 *   digit, which is what every native OTP field does. `onKeyPress` is the only
 *   place this is observable, because deleting nothing fires no change event.
 * - **Autofill.** The first box carries `textContentType="oneTimeCode"` (iOS)
 *   and `autoComplete="sms-otp"` (Android) so the platform can offer the code.
 */
export const OTPInput = ({
  length = 6,
  value,
  onChange,
  onComplete,
  error,
  autoFocus = true,
  editable = true,
  testID = 'otp',
}: {
  length?: number;
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  error?: string | null;
  autoFocus?: boolean;
  editable?: boolean;
  testID?: string;
}) => {
  const refs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(autoFocus ? 0 : null);

  const digits = useMemo(
    () => Array.from({ length }, (_, i) => value[i] ?? ''),
    [value, length],
  );

  const commit = useCallback(
    (next: string) => {
      const clean = next.replace(/\D/g, '').slice(0, length);
      onChange(clean);
      if (clean.length === length) {
        refs.current[length - 1]?.blur();
        onComplete?.(clean);
      }
      return clean;
    },
    [length, onChange, onComplete],
  );

  const handleChange = (index: number, text: string) => {
    const typed = text.replace(/\D/g, '');
    if (!typed) return;

    // A paste (or SMS autofill) arrives as several characters in one event.
    if (typed.length > 1) {
      const next = commit((value.slice(0, index) + typed).slice(0, length));
      const focus = Math.min(next.length, length - 1);
      refs.current[focus]?.focus();
      return;
    }

    const chars = value.padEnd(length, ' ').split('');
    chars[index] = typed;
    const next = commit(chars.join('').replace(/ /g, ''));
    if (index < length - 1 && next.length > index) refs.current[index + 1]?.focus();
  };

  const handleKeyPress = (
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (e.nativeEvent.key !== 'Backspace') return;
    if (digits[index]) {
      // Deleting a filled box is an ordinary change; let onChangeText run.
      commit(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    if (index > 0) {
      commit(value.slice(0, index - 1));
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <Field error={error}>
      <View
        style={s.otpRow}
        accessibilityLabel={`Enter the ${length} digit code`}
        accessibilityHint={error ?? undefined}
      >
        {digits.map((d, i) => (
          <TextInput
            key={i}
            testID={`${testID}-${i}`}
            ref={(r) => {
              refs.current[i] = r;
            }}
            style={[
              s.otpBox,
              !!d && s.otpBoxFilled,
              focusedIndex === i && s.otpBoxFocused,
              !!error && s.otpBoxError,
            ]}
            value={d}
            editable={editable}
            onChangeText={(t) => handleChange(i, t)}
            onKeyPress={(e) => handleKeyPress(i, e)}
            onFocus={() => setFocusedIndex(i)}
            onBlur={() => setFocusedIndex((cur) => (cur === i ? null : cur))}
            keyboardType="number-pad"
            inputMode="numeric"
            returnKeyType="done"
            // maxLength 1 would silently truncate a pasted code on Android, so
            // the first box accepts the whole string and `handleChange` splits it.
            maxLength={i === 0 ? length : 1}
            selectTextOnFocus
            autoFocus={autoFocus && i === 0}
            textContentType={i === 0 ? 'oneTimeCode' : 'none'}
            autoComplete={i === 0 ? (Platform.OS === 'android' ? 'sms-otp' : 'one-time-code') : 'off'}
            accessibilityLabel={`Digit ${i + 1} of ${length}`}
          />
        ))}
      </View>
    </Field>
  );
};

/* --------------------------------- choices -------------------------------- */

export type Choice<T extends string> = { value: T; label: string; icon?: IconName };

/**
 * A single-select row of chips — gender, language, anything with a handful of
 * mutually exclusive options.
 *
 * `accessibilityRole="radio"` with `checked` is what makes a screen reader
 * announce "2 of 4, selected" rather than reading four unrelated buttons.
 */
export const ChoiceGroup = <T extends string>({
  label,
  choices,
  value,
  onChange,
  error,
  hint,
  required,
  columns,
}: {
  label?: string;
  choices: readonly Choice<T>[];
  value: T | null;
  onChange: (next: T) => void;
  error?: string | null;
  hint?: string;
  required?: boolean;
  /** Fixed columns instead of wrapping — keeps a 2x2 grid square. */
  columns?: number;
}) => (
  <Field label={label} error={error} hint={hint} required={required}>
    <View style={s.choiceWrap} accessibilityRole="radiogroup">
      {choices.map((c) => {
        const on = c.value === value;
        return (
          <Pressable
            key={c.value}
            onPress={() => onChange(c.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, selected: on }}
            accessibilityLabel={c.label}
            style={({ pressed }) => [
              s.choice,
              columns ? { flexBasis: `${100 / columns}%`, flexGrow: 0 } : null,
              on && s.choiceOn,
              pressed && s.pressed,
            ]}
          >
            {c.icon && (
              <Icon name={c.icon} size={16} color={on ? colors.surfie : colors.inkFaint} />
            )}
            <Text style={[s.choiceText, on && s.choiceTextOn]} numberOfLines={1}>
              {c.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </Field>
);

/* ----------------------------- date of birth ------------------------------ */

/** Age on today's date from a `YYYY-MM-DD` string, or null if unparseable. */
export const ageFromISO = (iso: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dob = new Date(Date.UTC(y, mo - 1, d));
  if (dob.getUTCFullYear() !== y || dob.getUTCMonth() !== mo - 1 || dob.getUTCDate() !== d) {
    return null;
  }
  const now = new Date();
  let age = now.getUTCFullYear() - y;
  const beforeBirthday =
    now.getUTCMonth() < mo - 1 || (now.getUTCMonth() === mo - 1 && now.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
};

/**
 * Date of birth, typed as DD / MM / YYYY and emitted as the `YYYY-MM-DD` the
 * backend stores.
 *
 * The reference design labels this field "Age", but `PATCH /me/profile` takes
 * `dateOfBirth` and derives age on every read — age is never stored. Collecting
 * the age instead would mean the record silently rots by a year. So the field
 * collects the date and shows the derived age back, which is what the mock was
 * communicating anyway.
 */
export const DateOfBirthField = ({
  value,
  onChange,
  error,
  label = 'Date of Birth',
  required,
}: {
  /** `YYYY-MM-DD`, or '' when empty. */
  value: string;
  onChange: (iso: string) => void;
  error?: string | null;
  label?: string;
  required?: boolean;
}) => {
  const [text, setText] = useState(() => (value ? isoToDisplay(value) : ''));
  const [focused, setFocused] = useState(false);
  const age = value ? ageFromISO(value) : null;

  const handle = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
    const display = parts.join(' / ');
    setText(display);
    onChange(digits.length === 8 ? `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}` : '');
  };

  return (
    <Field label={label} error={error} required={required}>
      <View style={[s.control, focused && s.controlFocused, !!error && s.controlError]}>
        <Icon name="calendar" size={18} color={focused ? colors.surfie : colors.inkFaint} />
        <TextInput
          style={s.input}
          value={text}
          onChangeText={handle}
          placeholder="DD / MM / YYYY"
          placeholderTextColor={colors.inkFaint}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={14}
          accessibilityLabel={`${label}, day month year`}
          accessibilityHint={error ?? 'Enter as two digits day, two digits month, four digits year'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {age !== null && (
          <View style={s.ageBadge}>
            <Text style={s.ageBadgeText}>{age} yrs</Text>
          </View>
        )}
      </View>
    </Field>
  );
};

const isoToDisplay = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]} / ${m[2]} / ${m[1]}` : '';
};

/* --------------------------------- checkbox ------------------------------- */

export const Checkbox = ({
  checked,
  onChange,
  label,
  sublabel,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}) => (
  <Pressable
    onPress={() => onChange(!checked)}
    disabled={disabled}
    accessibilityRole="checkbox"
    accessibilityState={{ checked, disabled: !!disabled }}
    accessibilityLabel={sublabel ? `${label}. ${sublabel}` : label}
    style={({ pressed }) => [s.checkRow, pressed && s.pressed, disabled && s.disabled]}
  >
    <View style={[s.check, checked && s.checkOn]}>
      {checked && <Icon name="check" size={13} color={colors.white} />}
    </View>
    <View style={s.flex}>
      <Text style={s.checkLabel}>{label}</Text>
      {!!sublabel && <Text style={s.checkSub}>{sublabel}</Text>}
    </View>
  </Pressable>
);

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },

  field: { gap: 6 },
  label: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  required: { color: colors.danger },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  errorText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.danger,
    fontWeight: '600',
  },
  hintText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
  },

  control: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.surface.inputBorder,
  },
  controlFocused: { borderColor: colors.surfie, backgroundColor: colors.white },
  controlError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  input: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.lg,
    color: colors.ink,
    // Android adds its own vertical padding that makes the control 64pt tall.
    paddingVertical: Platform.OS === 'android' ? 8 : 14,
  },

  phoneControl: { paddingLeft: spacing.md },
  dial: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: spacing.sm },
  dialFlag: { fontSize: 18 },
  dialText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  dialDivider: { width: 1, height: 24, backgroundColor: colors.surface.line },

  otpRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  otpBox: {
    flex: 1,
    aspectRatio: 0.86,
    maxWidth: 58,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.surface.inputBorder,
    backgroundColor: colors.white,
    textAlign: 'center',
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.ink,
    padding: 0,
  },
  otpBoxFilled: { borderColor: colors.paris, backgroundColor: colors.surface.selected },
  otpBoxFocused: { borderColor: colors.surfie, borderWidth: 2 },
  otpBoxError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },

  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.surface.inputBorder,
    flexGrow: 1,
  },
  choiceOn: { borderColor: colors.surfie, backgroundColor: colors.surface.selected },
  choiceText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    fontWeight: '600',
  },
  choiceTextOn: { color: colors.surfie, fontWeight: '700' },

  ageBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.selected,
  },
  ageBadgeText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.surfie,
  },

  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: 6 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.8,
    borderColor: colors.surface.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  checkLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
    lineHeight: 20,
  },
  checkSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    marginTop: 2,
    lineHeight: 18,
  },
});
