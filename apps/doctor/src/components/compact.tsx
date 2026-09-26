import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Keyboard, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../theme/brand';
import { typeStyles, fontWeight } from '../theme/typography';
import { Icon, type IconName } from './Icon';
import { Checkbox } from './Checkbox';
import { BackButton } from './ScreenHeader';

/**
 * Compact primitives for the clarification and document flows.
 *
 * These screens run a denser layout than the tab screens, but never a smaller
 * type size: every text role here comes from the shared scale, which bottoms
 * out at 11pt.
 */
export const C = {
  mint: '#E8F8F2',
  line: '#E1EDE8',
  ink: '#16232B',
  muted: '#6B7C86',
  amber: '#C97F1B',
  amberSoft: '#FDF4E5',
} as const;

/* --------------------------------- header --------------------------------- */

/** The compact bar: the shared back button, a centred title, the screen's actions. */
export const SlimHeader = ({
  title,
  onBack,
  right,
  center,
}: {
  title?: string;
  onBack: () => void;
  right?: ReactNode;
  center?: ReactNode;
}) => (
  <View style={s.header}>
    <View style={s.headerSide}>
      <BackButton onPress={onBack} />
    </View>
    <View style={s.headerCenter}>
      {center ??
        (!!title && (
          <Text style={s.headerTitle} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        ))}
    </View>
    <View style={[s.headerSide, s.headerRight]}>{right}</View>
  </View>
);

/* --------------------------------- stepper -------------------------------- */

export const Stepper = ({
  steps,
  current,
}: {
  steps: string[];
  /** zero-based */
  current: number;
}) => (
  <View style={s.stepper} accessible accessibilityLabel={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}>
    {steps.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <React.Fragment key={label}>
          {i > 0 && <View style={[s.stepLine, done && s.stepLineDone]} />}
          <View style={s.stepItem}>
            <View style={[s.stepDot, done && s.stepDotDone, active && s.stepDotActive]}>
              {done ? (
                <Icon name="check" size={12} weight={3} color={colors.white} />
              ) : (
                <Text style={[s.stepNum, active && s.stepNumActive]}>{i + 1}</Text>
              )}
            </View>
            <Text style={[s.stepLabel, (active || done) && s.stepLabelOn]}>{label}</Text>
          </View>
        </React.Fragment>
      );
    })}
  </View>
);

/** Progress tracker for a case's lifecycle — done / active / todo. */
export const Tracker = ({ steps }: { steps: { label: string; state: 'done' | 'active' | 'todo' }[] }) => (
  <View style={s.tracker}>
    {steps.map((st, i) => (
      <React.Fragment key={st.label}>
        {i > 0 && <View style={[s.trackLine, steps[i - 1].state === 'done' && s.trackLineDone]} />}
        <View style={s.trackItem}>
          <View style={[s.trackDot, st.state === 'done' && s.trackDotDone, st.state === 'active' && s.trackDotActive]}>
            {st.state === 'done' && <Icon name="check" size={12} weight={3} color={colors.white} />}
          </View>
          <Text style={[s.trackLabel, st.state === 'active' && s.trackLabelActive]}>{st.label}</Text>
        </View>
      </React.Fragment>
    ))}
  </View>
);

/* --------------------------------- fields --------------------------------- */

export const Label = ({ children }: { children: ReactNode }) => <Text style={s.label}>{children}</Text>;

/** A real text input in the compact frame, with an optional live counter. */
export const Field = ({
  value,
  onChangeText,
  placeholder,
  testID,
  multiline,
  height,
  max,
  accessibilityLabel,
  editable = true,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  testID?: string;
  multiline?: boolean;
  height?: number;
  max?: number;
  accessibilityLabel?: string;
  editable?: boolean;
}) => (
  <View style={[s.field, multiline && { minHeight: height ?? 88, paddingVertical: 10 }, !editable && s.fieldReadOnly]}>
    <TextInput
      testID={testID}
      style={[multiline ? s.inputMulti : s.input]}
      value={value}
      onChangeText={(t) => onChangeText(max ? t.slice(0, max) : t)}
      placeholder={placeholder}
      placeholderTextColor={C.muted}
      multiline={multiline}
      scrollEnabled={false}
      editable={editable}
      accessibilityLabel={accessibilityLabel ?? placeholder}
    />
    {!!max && (
      <Text style={s.counter}>
        {value.length}/{max}
      </Text>
    )}
  </View>
);

/** A dropdown trigger. Always opens something — there is no inert variant. */
export const SelectRow = ({
  value,
  placeholder = 'Select',
  testID,
  onPress,
  accessibilityLabel,
}: {
  value: string;
  placeholder?: string;
  testID?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) => (
  <Pressable
    testID={testID}
    onPress={() => {
      Keyboard.dismiss();
      onPress();
    }}
    style={({ pressed }) => [s.select, pressed && s.pressed]}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? value ?? placeholder}
  >
    <Text style={[s.selectText, !value && s.placeholder]} numberOfLines={2}>
      {value || placeholder}
    </Text>
    <Icon name="chevronDown" size={15} color={C.muted} />
  </Pressable>
);

export const Segmented = <T extends string>({
  options,
  value,
  onChange,
  idPrefix,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  idPrefix: string;
}) => (
  <View style={s.segRow}>
    {options.map((o) => {
      const on = o.key === value;
      return (
        <Pressable
          key={o.key}
          testID={`${idPrefix}-${o.key}`}
          onPress={() => {
            Keyboard.dismiss();
            onChange(o.key);
          }}
          style={[s.segItem, on && s.segItemOn]}
          accessibilityRole="radio"
          accessibilityState={{ selected: on }}
        >
          <View style={[s.radio, on && s.radioOn]}>{on && <View style={s.radioDot} />}</View>
          <Text style={[s.segText, on && s.segTextOn]} numberOfLines={1}>
            {o.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

/** Kept for existing call sites; it is the shared Checkbox. */
export const CheckRow = ({
  checked,
  onToggle,
  children,
  testID,
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
  testID?: string;
}) => (
  <Checkbox testID={testID} checked={checked} onToggle={onToggle}>
    {children}
  </Checkbox>
);

/* --------------------------------- notices -------------------------------- */

export const ShieldNote = ({
  children,
  sub,
  tone = 'mint',
  icon = 'shield',
}: {
  children: ReactNode;
  sub?: string;
  tone?: 'mint' | 'grey';
  icon?: IconName;
}) => (
  <View style={[s.note, tone === 'grey' && s.noteGrey]}>
    <Icon name={icon} size={15} color={tone === 'grey' ? C.muted : colors.surfie} />
    <View style={s.flex}>
      <Text style={[s.noteText, tone === 'grey' && { color: C.muted }]}>{children}</Text>
      {!!sub && <Text style={s.noteSub}>{sub}</Text>}
    </View>
  </View>
);

export const ScanLine = ({ clean = true, label }: { clean?: boolean; label?: string }) => (
  <View style={s.scanRow}>
    <Icon name={clean ? 'shieldCheck' : 'alertTriangle'} size={14} color={clean ? colors.surfie : C.amber} />
    <Text style={[s.scanText, !clean && { color: C.amber }]}>
      {label ?? (clean ? 'No direct identifiers detected' : 'Possible identifier found — please review')}
    </Text>
  </View>
);

export const Caption = ({ children }: { children: ReactNode }) => <Text style={s.caption}>{children}</Text>;

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <Text style={s.section} accessibilityRole="header">
    {children}
  </Text>
);

/** Two-column summary row used by the review and shared-context blocks. */
export const SummaryRow = ({ label, value, last }: { label: string; value: string; last?: boolean }) => (
  <View style={[s.sumRow, !last && s.sumBorder]}>
    <Text style={s.sumLabel}>{label}</Text>
    <Text style={s.sumValue}>{value}</Text>
  </View>
);

/* --------------------------------- footer --------------------------------- */

export const StickyFooter = ({
  children,
  note,
  bottomInset,
}: {
  children: ReactNode;
  note?: string;
  bottomInset: number;
}) => (
  <View style={[s.footer, { paddingBottom: Math.max(bottomInset, 8) + 8 }]}>
    {!!note && <Text style={s.footNote}>{note}</Text>}
    <View style={s.footRow}>{children}</View>
  </View>
);

export const GhostButton = ({
  label,
  onPress,
  testID,
  style,
  disabled,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [s.ghost, disabled && s.solidOff, pressed && s.pressed, style]}
    accessibilityRole="button"
    accessibilityState={{ disabled: !!disabled }}
  >
    <Text style={s.ghostText}>{label}</Text>
  </Pressable>
);

export const SolidButton = ({
  label,
  onPress,
  testID,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [s.solid, disabled && s.solidOff, pressed && !disabled && s.pressed, style]}
    accessibilityRole="button"
    accessibilityState={{ disabled: !!disabled }}
  >
    <Text style={s.solidText}>{label}</Text>
  </Pressable>
);

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.75 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  headerSide: { width: 56, justifyContent: 'center' },
  /* a text action needs more than the back arrow does, so this side grows to
     fit rather than wrapping "Save Draft" onto a second line */
  headerRight: { width: 'auto', minWidth: 56, flexShrink: 0, alignItems: 'flex-end' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...typeStyles.cardTitle, color: C.ink },

  stepper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  stepDotDone: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  stepNum: { ...typeStyles.number, fontSize: 12, lineHeight: 16, color: C.muted },
  stepNumActive: { color: colors.white },
  stepLabel: { ...typeStyles.caption, color: C.muted },
  stepLabelOn: { color: C.ink, fontWeight: fontWeight.semibold },
  stepLine: { flex: 1, height: 1.5, backgroundColor: C.line, marginHorizontal: 4, marginBottom: 18 },
  stepLineDone: { backgroundColor: colors.paris },

  tracker: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16 },
  trackItem: { alignItems: 'center', gap: 4, width: 88 },
  trackDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackDotDone: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  trackDotActive: { borderColor: C.amber, backgroundColor: C.amberSoft, borderWidth: 4 },
  trackLabel: { ...typeStyles.caption, color: C.muted, textAlign: 'center' },
  trackLabelActive: { color: C.amber, fontWeight: fontWeight.semibold },
  trackLine: { flex: 1, height: 2, backgroundColor: C.line, marginTop: 10 },
  trackLineDone: { backgroundColor: colors.paris },

  label: { ...typeStyles.label, color: C.muted, marginBottom: 4 },
  section: { ...typeStyles.cardTitle, color: C.ink, marginTop: 16, marginBottom: 6 },
  field: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  fieldReadOnly: { backgroundColor: '#F7FAF9' },
  input: { ...typeStyles.inputSingle, color: C.ink, height: 46 },
  inputMulti: { ...typeStyles.input, color: C.ink, minHeight: 62, padding: 0, textAlignVertical: 'top' },
  counter: { ...typeStyles.caption, color: C.muted, textAlign: 'right', marginTop: 2 },

  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  selectText: { ...typeStyles.bodySmall, flex: 1, color: C.ink },
  placeholder: { color: C.muted },

  segRow: { flexDirection: 'row', gap: 6 },
  segItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 8,
    minHeight: 44,
  },
  segItemOn: { borderColor: colors.surfie, backgroundColor: '#F4FBF8' },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D3E2DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.surfie },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfie },
  segText: { ...typeStyles.status, flex: 1, color: C.muted },
  segTextOn: { color: C.ink, fontWeight: fontWeight.semibold },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.mint,
    borderRadius: 10,
    padding: 10,
  },
  noteGrey: { backgroundColor: '#F2F5F4' },
  noteText: { ...typeStyles.caption, color: C.ink },
  noteSub: { ...typeStyles.caption, color: C.muted, marginTop: 2 },

  scanRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  scanText: { ...typeStyles.helper, color: colors.surfie },

  caption: { ...typeStyles.caption, color: C.muted },

  sumRow: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  sumBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
  sumLabel: { ...typeStyles.caption, width: 110, color: C.muted, fontWeight: fontWeight.medium },
  sumValue: { ...typeStyles.caption, flex: 1, color: C.ink },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: colors.white,
    gap: 6,
  },
  footNote: { ...typeStyles.helper, color: C.muted, textAlign: 'center' },
  footRow: { flexDirection: 'row', gap: 8 },
  ghost: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: { ...typeStyles.button, textAlign: 'center', flexShrink: 1, color: colors.surfie },
  solid: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidOff: { opacity: 0.45 },
  solidText: { ...typeStyles.button, textAlign: 'center', flexShrink: 1, color: colors.white },
});

export default C;
