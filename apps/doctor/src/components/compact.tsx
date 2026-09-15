import { typeStyles, fontWeight } from '../../../../libs/typography/src';
import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '../theme/brand';
import { Icon, type IconName } from './Icon';

/**
 * Compact primitives for the clarification and document flows.
 *
 * These screens run at a denser type scale than the tab screens, so the sizes
 * are literal rather than drawn from `typography.size` — the shared scale
 * bottoms out around 10px and these need 8–9px captions.
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

export const SlimHeader = ({
  title,
  onBack,
  right,
  center,
}: {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
  center?: ReactNode;
}) => (
  <View style={s.header}>
    <Pressable testID="back" onPress={onBack} hitSlop={10} accessibilityLabel="Back" style={s.headerSide}>
      <Icon name="arrowLeft" size={20} color={C.ink} />
    </Pressable>
    <View style={s.headerCenter}>
      {center ?? (!!title && <Text style={[typeStyles.body, s.headerTitle]}>{title}</Text>)}
    </View>
    <View style={[s.headerSide, s.headerRight]}>{right}</View>
  </View>
);

export const OverflowButton = ({ onPress }: { onPress?: () => void }) => (
  <Pressable onPress={onPress} hitSlop={10} accessibilityLabel="More options">
    <Icon name="more" size={18} color={C.ink} />
  </Pressable>
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
  <View style={s.stepper}>
    {steps.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <React.Fragment key={label}>
          {i > 0 && <View style={[s.stepLine, done && s.stepLineDone]} />}
          <View style={s.stepItem}>
            <View style={[s.stepDot, done && s.stepDotDone, active && s.stepDotActive]}>
              {done ? (
                <Icon name="checkCircle" size={11} color={colors.white} filled />
              ) : (
                <Text style={[typeStyles.body, [s.stepNum, active && s.stepNumActive]]}>{i + 1}</Text>
              )}
            </View>
            <Text style={[typeStyles.body, [s.stepLabel, (active || done) && s.stepLabelOn]]}>
              {label}
            </Text>
          </View>
        </React.Fragment>
      );
    })}
  </View>
);

/** Progress tracker for a case's lifecycle — done / active / todo. */
export const Tracker = ({
  steps,
}: {
  steps: { label: string; state: 'done' | 'active' | 'todo' }[];
}) => (
  <View style={s.tracker}>
    {steps.map((st, i) => (
      <React.Fragment key={st.label}>
        {i > 0 && <View style={[s.trackLine, steps[i - 1].state === 'done' && s.trackLineDone]} />}
        <View style={s.trackItem}>
          <View
            style={[
              s.trackDot,
              st.state === 'done' && s.trackDotDone,
              st.state === 'active' && s.trackDotActive,
            ]}
          >
            {st.state === 'done' && <Icon name="checkCircle" size={12} color={colors.white} filled />}
          </View>
          <Text style={[typeStyles.body, [s.trackLabel, st.state === 'active' && s.trackLabelActive]]}>
            {st.label}
          </Text>
        </View>
      </React.Fragment>
    ))}
  </View>
);

/* --------------------------------- fields --------------------------------- */

export const Label = ({ children }: { children: ReactNode }) => <Text style={[typeStyles.body, s.label]}>{children}</Text>;

export const Field = ({
  value,
  onChangeText,
  placeholder,
  testID,
  multiline,
  height,
  max,
}: {
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  testID?: string;
  multiline?: boolean;
  height?: number;
  max?: number;
}) => (
  <View style={[s.field, multiline && { minHeight: height ?? 88, paddingVertical: 8 }]}>
    <TextInput
      testID={testID}
      style={[typeStyles.input, [s.input, multiline && s.inputMulti]]}
      value={value}
      onChangeText={(t) => onChangeText?.(max ? t.slice(0, max) : t)}
      placeholder={placeholder}
      placeholderTextColor={C.muted}
      multiline scrollEnabled={false}
    />
    {!!max && (
      <Text style={[typeStyles.body, s.counter]}>
        {value.length}/{max}
      </Text>
    )}
  </View>
);

export const SelectRow = ({
  value,
  testID,
  onPress,
}: {
  value: string;
  testID?: string;
  onPress?: () => void;
}) => (
  <Pressable testID={testID} onPress={onPress} style={s.select}>
    <Text style={[typeStyles.body, s.selectText]}>
      {value}
    </Text>
    <Icon name="chevronDown" size={14} color={C.muted} />
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
          onPress={() => onChange(o.key)}
          style={[s.segItem, on && s.segItemOn]}
          accessibilityRole="radio"
          accessibilityState={{ selected: on }}
        >
          <View style={[s.radio, on && s.radioOn]}>{on && <View style={s.radioDot} />}</View>
          <Text style={[typeStyles.body, [s.segText, on && s.segTextOn]]}>
            {o.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

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
  <Pressable
    testID={testID}
    onPress={onToggle}
    style={s.checkRow}
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
  >
    <View style={[s.checkbox, checked && s.checkboxOn]}>
      {checked && <Icon name="checkCircle" size={12} color={colors.white} filled />}
    </View>
    <Text style={[typeStyles.body, s.checkText]}>{children}</Text>
  </Pressable>
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
      <Text style={[typeStyles.body, [s.noteText, tone === 'grey' && { color: C.muted }]]}>{children}</Text>
      {!!sub && <Text style={[typeStyles.body, s.noteSub]}>{sub}</Text>}
    </View>
  </View>
);

export const ScanLine = ({ clean = true, label }: { clean?: boolean; label?: string }) => (
  <View style={s.scanRow}>
    <Icon name={clean ? 'shieldCheck' : 'alertTriangle'} size={13} color={clean ? colors.surfie : C.amber} />
    <Text style={[typeStyles.body, [s.scanText, !clean && { color: C.amber }]]}>
      {label ?? (clean ? 'No direct identifiers detected' : 'Possible identifier found — please review')}
    </Text>
  </View>
);

export const Caption = ({ children }: { children: ReactNode }) => <Text style={[typeStyles.body, s.caption]}>{children}</Text>;

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <Text style={[typeStyles.body, s.section]}>{children}</Text>
);

/** Two-column summary row used by the review and shared-context blocks. */
export const SummaryRow = ({ label, value, last }: { label: string; value: string; last?: boolean }) => (
  <View style={[s.sumRow, !last && s.sumBorder]}>
    <Text style={[typeStyles.body, s.sumLabel]}>{label}</Text>
    <Text style={[typeStyles.body, s.sumValue]}>{value}</Text>
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
  <View style={[s.footer, { paddingBottom: bottomInset + 10 }]}>
    {!!note && <Text style={[typeStyles.body, s.footNote]}>{note}</Text>}
    <View style={s.footRow}>{children}</View>
  </View>
);

export const GhostButton = ({
  label,
  onPress,
  testID,
  style,
}: {
  label: string;
  onPress?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) => (
  <Pressable testID={testID} onPress={onPress} style={[s.ghost, style]} accessibilityRole="button">
    <Text style={[typeStyles.body, s.ghostText]}>{label}</Text>
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
  onPress?: () => void;
  testID?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    disabled={disabled}
    style={[s.solid, disabled && s.solidOff, style]}
    accessibilityRole="button"
  >
    <Text style={[typeStyles.body, s.solidText]}>{label}</Text>
  </Pressable>
);

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48, paddingVertical: 6,
    paddingHorizontal: 16,
  },
  headerSide: { width: 56, justifyContent: 'center' },
  headerRight: { alignItems: 'flex-end' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...typeStyles.pageTitle, color: C.ink },

  stepper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  stepItem: { alignItems: 'center', gap: 3 },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  stepDotDone: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  stepNum: { ...typeStyles.number, color: C.muted },
  stepNumActive: { color: colors.white },
  stepLabel: { ...typeStyles.label, color: C.muted },
  stepLabelOn: { color: C.ink, fontWeight: fontWeight.semibold },
  stepLine: { flex: 1, height: 1.5, backgroundColor: C.line, marginHorizontal: 4, marginBottom: 12 },
  stepLineDone: { backgroundColor: colors.paris },

  tracker: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16 },
  trackItem: { alignItems: 'center', gap: 4, width: 84 },
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
  trackLabel: { ...typeStyles.label, color: C.muted, textAlign: 'center' },
  trackLabelActive: { color: C.amber, fontWeight: fontWeight.semibold },
  trackLine: { flex: 1, height: 2, backgroundColor: C.line, marginTop: 10 },
  trackLineDone: { backgroundColor: colors.paris },

  label: { ...typeStyles.label, color: C.muted, marginBottom: 4 },
  section: { ...typeStyles.sectionTitle, color: C.ink, marginTop: 14, marginBottom: 6 },
  field: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  input: { ...typeStyles.input, color: C.ink, padding: 0 },
  inputMulti: { minHeight: 62, textAlignVertical: 'top' },
  counter: { ...typeStyles.number, color: C.muted, textAlign: 'right', marginTop: 2 },

  select: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 44, paddingVertical: 8,
  },
  selectText: { ...typeStyles.bodySmall, flex: 1, color: C.ink },

  segRow: { flexDirection: 'row', gap: 6 },
  segItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  segItemOn: { borderColor: colors.surfie, backgroundColor: '#F4FBF8' },
  radio: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D3E2DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.surfie },
  radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.surfie },
  segText: { ...typeStyles.status, flex: 1, color: C.muted },
  segTextOn: { color: C.ink, fontWeight: fontWeight.semibold },

  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#C9D8D2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  checkText: { ...typeStyles.caption, flex: 1, color: C.ink },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.mint,
    borderRadius: 10,
    padding: 9,
  },
  noteGrey: { backgroundColor: '#F2F5F4' },
  noteText: { ...typeStyles.caption, color: C.ink },
  noteSub: { ...typeStyles.caption, color: C.muted, marginTop: 2 },

  scanRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  scanText: { ...typeStyles.helper, color: colors.surfie },

  caption: { ...typeStyles.caption, color: C.muted },

  sumRow: { flexDirection: 'row', gap: 10, paddingVertical: 7 },
  sumBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
  sumLabel: { ...typeStyles.label, width: 104, color: C.muted },
  sumValue: { ...typeStyles.caption, flex: 1, color: C.ink },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: colors.white,
    gap: 6,
  },
  footNote: { ...typeStyles.helper, color: C.muted },
  footRow: { flexDirection: 'row', gap: 8 },
  ghost: {
    flex: 1,
    minHeight: 44, paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: { ...typeStyles.button, textAlign: 'center', flexShrink: 1, color: colors.surfie },
  solid: {
    flex: 1,
    minHeight: 44, paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidOff: { opacity: 0.45 },
  solidText: { ...typeStyles.button, textAlign: 'center', flexShrink: 1, color: colors.white },
});

export default C;
