import React, { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
  Keyboard,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import { doneBar } from './KeyboardDoneBar';

import { colors, radius, spacing } from '../theme/brand';
import { typeStyles, fontWeight } from '../theme/typography';
import { Icon, type IconName } from './Icon';
import { BottomSheet } from './BottomSheet';
import { Checkbox } from './Checkbox';

export { UploadField } from './upload';

/**
 * Form primitives.
 *
 * Deliberately plain: one label, one control, one message slot, so a long
 * registration form reads as a list rather than a wall of boxes. Every
 * single-line input uses `typeStyles.inputSingle`, which has no line height —
 * iOS drew single-line text below the centre of the field when one was set.
 */

/* --------------------------------- label ---------------------------------- */

export const FieldLabel = ({ children, required }: { children: ReactNode; required?: boolean }) => (
  <Text style={s.label}>
    {children}
    {required && <Text style={s.star}> *</Text>}
  </Text>
);

const Helper = ({ children, error }: { children?: ReactNode; error?: boolean }) =>
  children ? <Text style={error ? s.error : s.helper}>{children}</Text> : null;

/* -------------------------------- text field ------------------------------ */

export const TextField = ({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  error,
  required,
  keyboardType,
  autoCapitalize = 'sentences',
  maxLength,
  right,
  testID,
  onBlur,
  onFocus,
  returnKeyType,
  textContentType,
  autoComplete,
  multiline,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  helper?: string;
  /** Shown instead of the helper, in red, with the field outlined. */
  error?: string;
  required?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  /** Trailing adornment inside the box — a calendar glyph, a unit, a toggle. */
  right?: ReactNode;
  testID?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  returnKeyType?: TextInputProps['returnKeyType'];
  textContentType?: TextInputProps['textContentType'];
  autoComplete?: TextInputProps['autoComplete'];
  multiline?: boolean;
  editable?: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <FieldLabel required={required}>{label}</FieldLabel>
      {/* the border lives on the wrapper so an adornment can sit inside it */}
      <View style={[s.input, multiline && s.inputMulti, focused && s.inputFocused, !!error && s.inputInvalid]}>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          keyboardType={keyboardType}
          {...doneBar(keyboardType)}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          returnKeyType={returnKeyType}
          textContentType={textContentType}
          autoComplete={autoComplete}
          multiline={multiline}
          editable={editable}
          accessibilityLabel={label}
          style={[multiline ? s.inputTextMulti : s.inputText, s.bare]}
        />
        {right}
      </View>
      <Helper error={!!error}>{error ?? helper}</Helper>
    </View>
  );
};

/* ---------------------------- shared option sheet -------------------------- */

/**
 * One option row. The selection reads as a tick on the right — the same mark
 * in the same place whether the list takes one answer or several.
 */
const OptionRow = ({
  label,
  selected,
  onPress,
  last,
  multi,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  last: boolean;
  multi?: boolean;
  testID?: string;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    style={[s.option, !last && s.optionRule, selected && s.optionOn]}
    accessibilityRole={multi ? 'checkbox' : 'radio'}
    accessibilityState={multi ? { checked: selected } : { selected }}
  >
    <View style={[multi ? s.pickBox : s.radio, selected && s.pickOn]}>
      {selected && (multi ? <Icon name="check" size={12} weight={3} color={colors.white} /> : <View style={s.radioDot} />)}
    </View>
    <Text style={[s.optionText, selected && s.optionTextOn]}>{label}</Text>
    {selected && <Icon name="check" size={20} weight={3} color={colors.paris} />}
  </Pressable>
);

/**
 * The sheet every dropdown opens. The pick is held until Apply: closing with
 * the X, the backdrop or back leaves the field exactly as it was.
 */
const OptionSheet = ({
  visible,
  title,
  onClose,
  onApply,
  search,
  children,
  count,
  onClear,
  applyDisabled,
  testID,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onApply: () => void;
  search?: ReactNode;
  children: ReactNode;
  /** Shown on the Apply button once anything is picked. */
  count?: number;
  /** Adds a Clear all beside Apply. Only offered when there is something to clear. */
  onClear?: () => void;
  applyDisabled?: boolean;
  testID?: string;
}) => (
  <BottomSheet
    visible={visible}
    title={title}
    onClose={onClose}
    testID={testID ? `${testID}-sheet` : undefined}
    footer={
      <View style={s.sheetFoot}>
        {!!onClear && !!count && (
          <Pressable
            testID={testID ? `${testID}-clear` : undefined}
            onPress={onClear}
            hitSlop={8}
            style={s.sheetClear}
            accessibilityRole="button"
          >
            <Text style={s.sheetClearText}>Clear all</Text>
          </Pressable>
        )}
        <Pressable
          testID={testID ? `${testID}-done` : undefined}
          onPress={onApply}
          disabled={applyDisabled}
          style={[s.sheetDone, applyDisabled && s.sheetDoneOff]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!applyDisabled }}
        >
          <Text style={s.sheetDoneText}>{count ? `Apply (${count})` : 'Apply'}</Text>
        </Pressable>
      </View>
    }
  >
    {search}
    <View style={s.optionBox}>{children}</View>
  </BottomSheet>
);

/* --------------------------------- select --------------------------------- */

/**
 * Two shapes, one control.
 *
 * `inline` anchors a compact menu under the field — right for a handful of
 * one-word options, and it commits on the tap. Everything else opens the
 * shared sheet, which holds the pick until Apply.
 */
export const SelectField = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  required,
  searchable,
  inline,
  error,
  helper,
  testID,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  searchable?: boolean;
  /** Anchored menu instead of a sheet. For short, self-evident option lists. */
  inline?: boolean;
  error?: string;
  helper?: string;
  testID?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(value);
  const trigger = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = () => {
    setQuery('');
    setOpen(false);
  };

  // a choice list takes over from the keyboard
  const openSheet = () => {
    Keyboard.dismiss();
    setDraft(value);
    setOpen(true);
  };

  const openMenu = () => {
    Keyboard.dismiss();
    setOpen(true);
    // measurement is best-effort: without it the menu falls back to centred
    trigger.current?.measureInWindow?.((x, y, w, h) => setAnchor({ x, y, w, h }));
  };

  /** Flip above the field when there is not enough room beneath it. */
  const menuStyle = () => {
    if (!anchor) return s.menuFallback;
    const screen = Dimensions.get('window').height;
    const height = Math.min(list.length * 48 + 8, 280);
    const below = anchor.y + anchor.h;
    const fits = below + height < screen - 24;
    return {
      position: 'absolute' as const,
      left: anchor.x,
      width: anchor.w,
      top: fits ? below : Math.max(24, anchor.y - height),
    };
  };

  return (
    <View style={s.field}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Pressable
        ref={trigger}
        testID={testID}
        onPress={inline ? openMenu : openSheet}
        style={[s.input, open && s.inputFocused, !!error && s.inputInvalid]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
      >
        <Text style={[s.selectText, !value && s.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} color={colors.inkMuted} />
      </Pressable>
      <Helper error={!!error}>{error ?? helper}</Helper>

      {!inline && (
        <OptionSheet
          visible={open}
          title={`Select ${label.toLowerCase()}`}
          onClose={close}
          onApply={() => {
            if (draft) onChange(draft);
            close();
          }}
          applyDisabled={!draft}
          testID={testID}
          search={
            searchable ? (
              <TextInput
                testID={testID ? `${testID}-search` : undefined}
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={colors.inkFaint}
                style={[s.input, s.search, s.inputText]}
                accessibilityLabel={`Search ${label.toLowerCase()}`}
              />
            ) : undefined
          }
        >
          {list.map((o, i) => (
            <OptionRow
              key={o}
              testID={testID ? `${testID}-${o}` : undefined}
              label={o}
              selected={o === draft}
              last={i === list.length - 1}
              onPress={() => setDraft(o)}
            />
          ))}
          {list.length === 0 && <Text style={s.noMatch}>No match for “{query}”.</Text>}
        </OptionSheet>
      )}

      {inline && (
        <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
          {/* a bare catcher, not a scrim: the form stays visible behind the menu */}
          <Pressable style={s.menuCatcher} onPress={close} accessibilityLabel="Close menu">
            {/* claims the touch so a tap inside the menu does not reach the catcher */}
            <View style={[s.menu, menuStyle()]} onStartShouldSetResponder={() => true}>
              <ScrollView keyboardShouldPersistTaps="handled">
                {list.map((o, i) => {
                  const on = o === value;
                  return (
                    <Pressable
                      key={o}
                      testID={testID ? `${testID}-${o}` : undefined}
                      onPress={() => {
                        onChange(o);
                        close();
                      }}
                      style={[s.menuRow, i < list.length - 1 && s.optionRule, on && s.optionOn]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[s.menuText, on && s.optionTextOn]}>{o}</Text>
                      {on && <Icon name="check" size={20} weight={3} color={colors.paris} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
};

/* ------------------------------ multi select ------------------------------ */

export const MultiSelectField = ({
  label,
  values,
  options,
  onChange,
  required,
  helper,
  error,
  addLabel = 'Add',
  searchPlaceholder = 'Search',
  testID,
}: {
  label: string;
  values: string[];
  options: readonly string[];
  onChange: (v: string[]) => void;
  required?: boolean;
  helper?: string;
  error?: string;
  /** The add control's text, e.g. "Add language". */
  addLabel?: string;
  searchPlaceholder?: string;
  testID?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<string[]>(values);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggleDraft = (o: string) => setDraft((d) => (d.includes(o) ? d.filter((v) => v !== o) : [...d, o]));
  const close = () => {
    setQuery('');
    setOpen(false);
  };

  /** Past three chips the row is too tight to hold the Add control as well. */
  const dropAdd = values.length > 3;

  const add = (
    <Pressable
      testID={testID}
      onPress={() => {
        Keyboard.dismiss();
        setDraft(values);
        setOpen(true);
      }}
      style={s.addChip}
      accessibilityRole="button"
      accessibilityLabel={`${addLabel} — ${label}`}
    >
      <Icon name="plus" size={13} color={colors.surfie} />
      <Text style={s.addChipText}>{addLabel}</Text>
    </Pressable>
  );

  return (
    <View style={s.field}>
      <FieldLabel required={required}>{label}</FieldLabel>
      {(values.length > 0 || !dropAdd) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipScroll}
          contentContainerStyle={s.chipWrap}
          keyboardShouldPersistTaps="handled"
        >
          {values.map((v) => (
            <View key={v} style={s.chip}>
              <Text style={s.chipText}>{v}</Text>
              <Pressable
                testID={testID ? `${testID}-remove-${v}` : undefined}
                onPress={() => onChange(values.filter((x) => x !== v))}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${v}`}
              >
                <Icon name="close" size={13} color={colors.surfie} />
              </Pressable>
            </View>
          ))}
          {!dropAdd && add}
        </ScrollView>
      )}
      {dropAdd && <View style={s.addRow}>{add}</View>}
      <Helper error={!!error}>{error ?? helper}</Helper>

      <OptionSheet
        visible={open}
        title={label}
        onClose={close}
        onApply={() => {
          onChange(draft);
          close();
        }}
        testID={testID}
        count={draft.length}
        onClear={() => setDraft([])}
        search={
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.inkFaint}
            style={[s.input, s.search, s.inputText]}
            accessibilityLabel={searchPlaceholder}
          />
        }
      >
        {list.map((o, i) => (
          <OptionRow
            key={o}
            testID={testID ? `${testID}-option-${o}` : undefined}
            label={o}
            selected={draft.includes(o)}
            last={i === list.length - 1}
            multi
            onPress={() => toggleDraft(o)}
          />
        ))}
        {list.length === 0 && <Text style={s.noMatch}>No match for “{query}”.</Text>}
      </OptionSheet>
    </View>
  );
};

/* ------------------------------- date field -------------------------------- */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Digits only, regrouped as DD / MM / YYYY while the doctor types. */
export const dateMask = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join(' / ');
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Digits only, regrouped as YYYY / MM — for a month a doctor started work. */
export const monthMask = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 6);
  return [d.slice(0, 4), d.slice(4, 6)].filter(Boolean).join(' / ');
};

/**
 * A calendar sheet behind a date. Built in-app rather than pulled from a
 * picker library: the platforms disagree on what a native date picker looks
 * like, and a birth date needs year stepping more than it needs a spinner.
 * A day tap commits and closes.
 */
export const CalendarSheet = ({
  visible,
  title,
  selected,
  initialView,
  onPick,
  onClose,
  isDisabled,
  testID,
}: {
  visible: boolean;
  title: string;
  selected: { day: number; month: number; year: number } | null;
  initialView: { month: number; year: number };
  onPick: (d: { day: number; month: number; year: number }) => void;
  onClose: () => void;
  /** Days that cannot be chosen, e.g. dates in the past. */
  isDisabled?: (d: { day: number; month: number; year: number }) => boolean;
  testID?: string;
}) => {
  const [view, setView] = useState(initialView);
  const [openedFor, setOpenedFor] = useState(false);
  // re-initialise every time the sheet opens, never from a stale value
  if (visible && !openedFor) {
    setOpenedFor(true);
    setView(initialView);
  } else if (!visible && openedFor) {
    setOpenedFor(false);
  }

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const step = (field: 'month' | 'year', by: number) =>
    setView((v) => {
      if (field === 'year') return { ...v, year: Math.min(2100, Math.max(1900, v.year + by)) };
      const m = v.month + by;
      if (m < 0) return { month: 11, year: v.year - 1 };
      if (m > 11) return { month: 0, year: v.year + 1 };
      return { ...v, month: m };
    });

  return (
    <BottomSheet visible={visible} title={title} onClose={onClose} testID={testID ? `${testID}-calendar-sheet` : undefined}>
      <View style={s.calHead}>
        <Stepper
          testID={testID ? `${testID}-month` : undefined}
          label={MONTHS[view.month]}
          onBack={() => step('month', -1)}
          onNext={() => step('month', 1)}
        />
        <Stepper
          testID={testID ? `${testID}-year` : undefined}
          label={String(view.year)}
          onBack={() => step('year', -1)}
          onNext={() => step('year', 1)}
        />
      </View>

      <View style={s.calRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={`${d}${i}`} style={s.calWeekday}>
            {d}
          </Text>
        ))}
      </View>

      <View style={s.calGrid}>
        {cells.map((d, i) => {
          if (d === null) return <View key={`b${i}`} style={s.calCell} />;
          const date = { day: d, month: view.month, year: view.year };
          const on = !!selected && selected.day === d && selected.month === view.month && selected.year === view.year;
          const off = isDisabled?.(date) ?? false;
          return (
            <Pressable
              key={d}
              testID={testID ? `${testID}-day-${d}` : undefined}
              onPress={() => onPick(date)}
              disabled={off}
              style={s.calCell}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: off }}
              accessibilityLabel={`${d} ${MONTHS[view.month]} ${view.year}`}
            >
              <View style={[s.calDay, on && s.calDayOn]}>
                <Text style={[s.calDayText, on && s.calDayTextOn, off && s.calDayTextOff]}>{d}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
};

export const DateField = ({
  label,
  value,
  onChange,
  required,
  placeholder = 'DD / MM / YYYY',
  error,
  onBlur,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  error?: string;
  onBlur?: () => void;
  testID?: string;
}) => {
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);

  /** Parsed from the field when it holds a full date, else a sane start. */
  const parsed = useMemo(() => {
    const d = value.replace(/\D/g, '');
    if (d.length !== 8) return null;
    const day = Number(d.slice(0, 2));
    const month = Number(d.slice(2, 4));
    const year = Number(d.slice(4, 8));
    if (!day || month < 1 || month > 12 || year < 1900) return null;
    return { day, month: month - 1, year };
  }, [value]);

  return (
    <View style={s.field}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <View style={[s.input, focused && s.inputFocused, !!error && s.inputInvalid]}>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={(v) => onChange(dateMask(v))}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          keyboardType="number-pad"
          {...doneBar('number-pad')}
          maxLength={14}
          accessibilityLabel={label}
          style={[s.inputText, s.bare]}
        />
        <Pressable
          testID={testID ? `${testID}-calendar` : undefined}
          onPress={() => {
            Keyboard.dismiss();
            setOpen(true);
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Pick ${label}`}
        >
          <Icon name="calendar" size={18} color={colors.surfie} />
        </Pressable>
      </View>
      <Helper error={!!error}>{error}</Helper>

      <CalendarSheet
        visible={open}
        title={`Select ${label.toLowerCase()}`}
        selected={parsed}
        initialView={parsed ? { month: parsed.month, year: parsed.year } : { month: 0, year: 1990 }}
        onPick={(d) => {
          onChange(`${pad2(d.day)} / ${pad2(d.month + 1)} / ${d.year}`);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
        testID={testID}
      />
    </View>
  );
};

const Stepper = ({
  label,
  onBack,
  onNext,
  testID,
}: {
  label: string;
  onBack: () => void;
  onNext: () => void;
  testID?: string;
}) => (
  <View style={s.stepper}>
    <Pressable
      testID={testID ? `${testID}-back` : undefined}
      onPress={onBack}
      hitSlop={10}
      style={s.stepperBtn}
      accessibilityRole="button"
      accessibilityLabel={`Previous ${label}`}
    >
      <Icon name="chevronLeft" size={16} color={colors.ink} />
    </Pressable>
    <Text style={s.stepperLabel}>{label}</Text>
    <Pressable
      testID={testID ? `${testID}-next` : undefined}
      onPress={onNext}
      hitSlop={10}
      style={s.stepperBtn}
      accessibilityRole="button"
      accessibilityLabel={`Next ${label}`}
    >
      <Icon name="chevronRight" size={16} color={colors.ink} />
    </Pressable>
  </View>
);

/* ----------------------------- verified value ----------------------------- */

/** A value already confirmed at sign-in. Shown, never asked for again. */
export const VerifiedField = ({ label, value, testID }: { label: string; value: string; testID?: string }) => (
  <View style={s.field}>
    <FieldLabel>{label}</FieldLabel>
    <View testID={testID} style={[s.input, s.verified]} accessible accessibilityLabel={`${label}: ${value}, verified`}>
      <Text style={s.selectText} numberOfLines={1}>
        {value}
      </Text>
      <View style={s.verifiedTag}>
        <Icon name="checkCircle" size={17} color={colors.paris} filled />
        <Text style={s.verifiedText}>Verified</Text>
      </View>
    </View>
  </View>
);

/* -------------------------------- checkbox -------------------------------- */

/** Kept for existing call sites; it is the shared Checkbox. */
export const CheckField = ({
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

/* ------------------------------ privacy note ------------------------------ */

/** States plainly that something collected here is never shown to patients. */
export const PrivacyNote = ({ children, icon = 'lock' }: { children: ReactNode; icon?: IconName }) => (
  <View style={s.privacy}>
    <Icon name={icon} size={14} color={colors.surfie} />
    <Text style={s.privacyText}>{children}</Text>
  </View>
);

/* -------------------------------- stepper --------------------------------- */

export const StepProgress = ({ steps, index }: { steps: { key: string; short: string }[]; index: number }) => (
  <View accessible accessibilityLabel={`Step ${index + 1} of ${steps.length}`}>
    {/* one bar per step: filled up to and including the current one */}
    <View style={s.stepBars}>
      {steps.map((st, i) => (
        <View key={st.key} style={[s.stepBar, i <= index && s.stepBarOn]} />
      ))}
    </View>
    <View style={s.stepBars}>
      {steps.map((st, i) => (
        <Text key={st.key} style={[s.stepLabel, i === index && s.stepLabelOn]} numberOfLines={1}>
          {st.short}
        </Text>
      ))}
    </View>
  </View>
);

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },

  field: { marginBottom: spacing.lg },
  /* anchored menu */
  menuCatcher: { flex: 1 },
  menu: {
    maxHeight: 280,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#0B2B25',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  menuFallback: { alignSelf: 'center', marginTop: 160, width: '80%' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  menuText: { ...typeStyles.body, color: colors.ink },
  label: { ...typeStyles.label, color: colors.ink, marginBottom: 6 },
  star: { color: colors.danger },
  helper: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 5 },
  error: { ...typeStyles.caption, color: colors.danger, marginTop: 5 },

  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    backgroundColor: colors.white,
  },
  inputMulti: { alignItems: 'flex-start', paddingVertical: spacing.md },
  inputFocused: { borderColor: colors.surfie },
  inputInvalid: { borderColor: colors.danger },
  inputText: { ...typeStyles.inputSingle, flex: 1, color: colors.ink, height: 48 },
  inputTextMulti: { ...typeStyles.input, flex: 1, color: colors.ink, minHeight: 72, textAlignVertical: 'top' },
  selectText: { ...typeStyles.body, flex: 1, color: colors.ink },
  /* the wrapper already carries the box, so the field itself draws nothing */
  bare: { margin: 0, paddingHorizontal: 0 },
  placeholder: { color: colors.inkFaint },

  verified: { backgroundColor: colors.surface.page },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  verifiedText: { ...typeStyles.caption, color: colors.surfie, fontWeight: fontWeight.semibold },

  /* multi-select chips */
  chipScroll: { flexGrow: 0 },
  chipWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surface.selected,
    backgroundColor: colors.surface.mintSoft,
  },
  chipText: { ...typeStyles.caption, color: colors.surfie, fontWeight: fontWeight.semibold },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.surfie,
  },
  addChipText: { ...typeStyles.caption, color: colors.surfie, fontWeight: fontWeight.semibold },
  addRow: { flexDirection: 'row', marginTop: spacing.sm },

  /* privacy */
  privacy: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface.mintSoft,
  },
  privacyText: { ...typeStyles.caption, flex: 1, color: colors.surfie },

  /* stepper */
  stepBars: { flexDirection: 'row', gap: 6 },
  stepBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surface.line },
  stepBarOn: { backgroundColor: colors.surfie },
  stepLabel: { ...typeStyles.caption, flex: 1, fontSize: 11, color: colors.inkFaint, marginTop: 6 },
  stepLabelOn: { color: colors.ink, fontWeight: fontWeight.semibold },

  /* option sheet */
  optionBox: {
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  search: { marginBottom: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  optionRule: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.surface.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.surface.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickOn: { borderColor: colors.surfie, backgroundColor: colors.surfie },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
  optionOn: { backgroundColor: colors.surface.mintSoft },
  optionText: { ...typeStyles.body, flex: 1, color: colors.ink },
  optionTextOn: { color: colors.surfie, fontWeight: fontWeight.semibold },
  noMatch: { ...typeStyles.caption, color: colors.inkMuted, padding: spacing.md },
  sheetFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sheetClear: { minHeight: 44, justifyContent: 'center', paddingRight: spacing.sm },
  sheetClearText: { ...typeStyles.buttonSmall, color: colors.surfie },
  sheetDone: {
    flex: 1,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDoneOff: { opacity: 0.45 },
  sheetDoneText: { ...typeStyles.button, color: colors.white },

  /* calendar */
  calHead: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stepper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  stepperBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepperLabel: { ...typeStyles.label, color: colors.ink },
  calRow: { flexDirection: 'row' },
  calWeekday: { ...typeStyles.caption, flex: 1, textAlign: 'center', color: colors.inkFaint, marginBottom: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2 },
  calDay: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  calDayOn: { backgroundColor: colors.surfie },
  calDayText: { ...typeStyles.body, color: colors.ink },
  calDayTextOn: { color: colors.white, fontWeight: fontWeight.semibold },
  calDayTextOff: { color: colors.surface.inputBorder },
});
