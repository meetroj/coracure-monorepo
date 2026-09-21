import { typeStyles, fontWeight } from '../../../../libs/typography/src';
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
  type KeyboardTypeOptions,
} from 'react-native';

import { colors, radius, spacing, typography } from '../theme/brand';
import { Icon, type IconName } from './Icon';

/**
 * Form primitives for doctor onboarding.
 *
 * The app had no input components — every screen so far displayed values
 * rather than collecting them. These are deliberately plain: one label, one
 * control, one error slot, so a long registration form reads as a list rather
 * than a wall of boxes.
 */

/* --------------------------------- label ---------------------------------- */

const Label = ({ children, required }: { children: ReactNode; required?: boolean }) => (
  <Text style={[typeStyles.body, s.label]}>
    {children}
    {required && <Text style={s.star}> *</Text>}
  </Text>
);

const Helper = ({ children, error }: { children?: ReactNode; error?: boolean }) =>
  children ? (
    <Text style={[typeStyles.body, error ? s.error : s.helper]}>{children}</Text>
  ) : null;

/* -------------------------------- text field ------------------------------ */

export const TextField = ({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  required,
  keyboardType,
  autoCapitalize = 'sentences',
  maxLength,
  right,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  helper?: string;
  required?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  /** Trailing adornment inside the box — a calendar glyph, a unit, a toggle. */
  right?: ReactNode;
  testID?: string;
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <Label required={required}>{label}</Label>
      {/* the border lives on the wrapper so an adornment can sit inside it */}
      <View style={[s.input, focused && s.inputFocused]}>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          style={[typeStyles.body, s.inputText, s.bare]}
        />
        {right}
      </View>
      <Helper>{helper}</Helper>
    </View>
  );
};

/* ---------------------------- shared option sheet -------------------------- */

/**
 * One sheet shape for every dropdown in the app: handle, title with a close
 * control, the options in a bordered list, and an Apply button that commits.
 *
 * The sheet hugs its content, so a four-option list is a short sheet rather
 * than a tall one with dead space, and its floor clears the gesture bar — no
 * control is ever drawn inside the safe area.
 */
const OptionSheet = ({
  visible,
  title,
  onClose,
  search,
  children,
  applyLabel = 'Apply',
  count,
  onClear,
  testID,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  search?: ReactNode;
  children: ReactNode;
  applyLabel?: string;
  /** Shown on the Apply button once anything is picked. */
  count?: number;
  /** Adds a Clear all beside Apply. Only offered when there is something to clear. */
  onClear?: () => void;
  testID?: string;
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable
          style={[s.sheet, { paddingBottom: spacing.sm }]}
          onPress={() => undefined}
        >
          <View style={s.handle} />
          <View style={s.sheetHead}>
            <Text style={[typeStyles.body, s.sheetTitle]}>{title}</Text>
            <Pressable
              testID={testID ? `${testID}-close` : undefined}
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Icon name="close" size={19} color={colors.ink} />
            </Pressable>
          </View>
          {search}
          <View style={s.optionBox}>
            <ScrollView style={s.sheetList} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </View>
          {/* Clear all only appears with something to clear, so the footer does
              not offer a dead control on an untouched list */}
          <View style={s.sheetFoot}>
            {!!onClear && !!count && (
              <Pressable
                testID={testID ? `${testID}-clear` : undefined}
                onPress={onClear}
                hitSlop={8}
                style={s.sheetClear}
                accessibilityRole="button"
              >
                <Text style={[typeStyles.body, s.sheetClearText]}>Clear all</Text>
              </Pressable>
            )}
            <Pressable
              testID={testID ? `${testID}-done` : undefined}
              onPress={onClose}
              style={s.sheetDone}
              accessibilityRole="button"
            >
              <Text style={[typeStyles.body, s.sheetDoneText]}>
                {count ? `${applyLabel} (${count})` : applyLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

/**
 * One option row. The selection reads as a tick on the right — the same mark
 * in the same place whether the list takes one answer or several, so scanning
 * a column of rows never means checking two different controls.
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
    <Text style={[typeStyles.body, s.optionText, selected && s.optionTextOn]}>{label}</Text>
    {selected && <Icon name="check" size={20} weight={3} color={colors.paris} />}
  </Pressable>
);

/* --------------------------------- select --------------------------------- */

/**
 * Two shapes, one control.
 *
 * `inline` anchors a compact menu under the field — right for a handful of
 * one-word options, where a full sheet is more ceremony than the choice
 * deserves. Everything else opens the shared sheet, which keeps long and
 * searchable lists readable.
 *
 * The menu is measured and drawn in a modal rather than positioned inside the
 * field: a child that overflows its parent is clipped on Android, and this one
 * has to sit over whatever follows it in the form.
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
  testID?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
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

  const openMenu = () => {
    setOpen(true);
    // measurement is best-effort: without it the menu falls back to centred
    trigger.current?.measureInWindow?.((x, y, w, h) => setAnchor({ x, y, w, h }));
  };

  /** Flip above the field when there is not enough room beneath it. */
  const menuStyle = () => {
    if (!anchor) return s.menuFallback;
    const screen = Dimensions.get('window').height;
    const height = Math.min(list.length * 46 + 8, 260);
    // flush against the field: the menu is part of the control, not a popover
    const below = anchor.y + anchor.h;
    const fits = below + height < screen - 24;
    return {
      position: 'absolute' as const,
      left: anchor.x,
      width: anchor.w,
      top: fits ? below : Math.max(24, anchor.y - height),
    };
  };

  const field = (
    <View style={s.field}>
      <Label required={required}>{label}</Label>
      <Pressable
        ref={trigger}
        testID={testID}
        onPress={inline ? openMenu : () => setOpen(true)}
        style={[s.input, open && s.inputFocused]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
      >
        <Text style={[typeStyles.body, s.inputText, !value && s.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} color={colors.inkMuted} />
      </Pressable>

      <OptionSheet
        visible={open && !inline}
        title={`Select ${label.toLowerCase()}`}
        onClose={close}
        testID={testID}
        search={
          searchable ? (
            <TextInput
              testID={testID ? `${testID}-search` : undefined}
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={colors.inkFaint}
              style={[typeStyles.body, s.input, s.search]}
            />
          ) : undefined
        }
      >
        {list.map((o, i) => (
          <OptionRow
            key={o}
            testID={testID ? `${testID}-${o}` : undefined}
            label={o}
            selected={o === value}
            last={i === list.length - 1}
            onPress={() => onChange(o)}
          />
        ))}
        {list.length === 0 && (
          <Text style={[typeStyles.body, s.noMatch]}>No match for “{query}”.</Text>
        )}
      </OptionSheet>
    </View>
  );

  if (!inline) return field;

  // the inner field already carries the spacing, so the wrapper adds none
  return (
    <View>
      {field}
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        {/* a bare catcher, not a scrim: the form stays visible behind the menu */}
        <Pressable style={s.menuCatcher} onPress={close}>
          <Pressable style={[s.menu, menuStyle()]} onPress={() => undefined}>
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
                    <Text style={[typeStyles.body, s.menuText, on && s.optionTextOn]}>{o}</Text>
                    {on && <Icon name="check" size={20} weight={3} color={colors.paris} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  testID,
}: {
  label: string;
  values: string[];
  options: readonly string[];
  onChange: (v: string[]) => void;
  required?: boolean;
  helper?: string;
  testID?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggle = (o: string) =>
    onChange(values.includes(o) ? values.filter((v) => v !== o) : [...values, o]);

  /** Past three chips the row is too tight to hold the Add control as well. */
  const dropAdd = values.length > 3;

  const add = (
    <Pressable
      testID={testID}
      onPress={() => setOpen(true)}
      style={s.addChip}
      accessibilityRole="button"
      accessibilityLabel={`Add ${label}`}
    >
      <Icon name="plus" size={12} color={colors.surfie} />
      <Text style={[typeStyles.body, s.addChipText]}>Add language</Text>
    </Pressable>
  );

  return (
    <View style={s.field}>
      <Label required={required}>{label}</Label>
      {/* The picks stay on one line, scrolled sideways, so a long list never
          pushes the rest of the form down. Past three the Add control drops to
          its own row — beside them it would leave the chips almost no width. */}
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
              <Text style={[typeStyles.body, s.chipText]}>{v}</Text>
              <Pressable
                testID={testID ? `${testID}-remove-${v}` : undefined}
                onPress={() => toggle(v)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${v}`}
              >
                <Icon name="close" size={12} color={colors.surfie} />
              </Pressable>
            </View>
          ))}
          {!dropAdd && add}
        </ScrollView>
      )}
      {dropAdd && <View style={s.addRow}>{add}</View>}
      <Helper>{helper}</Helper>

      <OptionSheet
        visible={open}
        title={label}
        onClose={() => {
          setQuery('');
          setOpen(false);
        }}
        testID={testID}
        count={values.length}
        onClear={() => onChange([])}
        search={
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search languages"
            placeholderTextColor={colors.inkFaint}
            style={[typeStyles.body, s.input, s.search]}
          />
        }
      >
        {list.map((o, i) => (
          <OptionRow
            key={o}
            testID={testID ? `${testID}-option-${o}` : undefined}
            label={o}
            selected={values.includes(o)}
            last={i === list.length - 1}
            multi
            onPress={() => toggle(o)}
          />
        ))}
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
 * A date field with a real calendar behind the glyph.
 *
 * Built in-app rather than pulled from a picker library: the two platforms
 * disagree on what a native date picker looks like, and a birth date needs
 * year stepping more than it needs a spinner.
 */
export const DateField = ({
  label,
  value,
  onChange,
  required,
  placeholder = 'DD / MM / YYYY',
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
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

  const [view, setView] = useState({ month: 0, year: 1990 });

  const openPicker = () => {
    setView(parsed ? { month: parsed.month, year: parsed.year } : { month: 0, year: 1990 });
    setOpen(true);
  };

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

  const choose = (day: number) => {
    onChange(`${pad2(day)} / ${pad2(view.month + 1)} / ${view.year}`);
    setOpen(false);
  };

  return (
    <View style={s.field}>
      <Label required={required}>{label}</Label>
      <View style={[s.input, focused && s.inputFocused]}>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={(v) => onChange(dateMask(v))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          keyboardType="number-pad"
          maxLength={14}
          style={[typeStyles.body, s.inputText, s.bare]}
        />
        <Pressable
          testID={testID ? `${testID}-calendar` : undefined}
          onPress={openPicker}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Pick ${label}`}
        >
          <Icon name="calendar" size={18} color={colors.surfie} />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[s.sheet, { paddingBottom: spacing.sm }]}
            onPress={() => undefined}
          >
            <View style={s.handle} />
            <View style={s.sheetHead}>
              <Text style={[typeStyles.body, s.sheetTitle]}>Select {label.toLowerCase()}</Text>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Icon name="close" size={19} color={colors.ink} />
              </Pressable>
            </View>

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
                <Text key={`${d}${i}`} style={[typeStyles.body, s.calWeekday]}>
                  {d}
                </Text>
              ))}
            </View>

            <View style={s.calGrid}>
              {cells.map((d, i) =>
                d === null ? (
                  <View key={`b${i}`} style={s.calCell} />
                ) : (
                  <Pressable
                    key={d}
                    testID={testID ? `${testID}-day-${d}` : undefined}
                    onPress={() => choose(d)}
                    style={s.calCell}
                    accessibilityRole="button"
                    accessibilityLabel={`${d} ${MONTHS[view.month]} ${view.year}`}
                  >
                    <View
                      style={[
                        s.calDay,
                        parsed &&
                          parsed.day === d &&
                          parsed.month === view.month &&
                          parsed.year === view.year &&
                          s.calDayOn,
                      ]}
                    >
                      <Text
                        style={[
                          typeStyles.body,
                          s.calDayText,
                          parsed &&
                            parsed.day === d &&
                            parsed.month === view.month &&
                            parsed.year === view.year &&
                            s.calDayTextOn,
                        ]}
                      >
                        {d}
                      </Text>
                    </View>
                  </Pressable>
                )
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Previous ${label}`}
    >
      <Icon name="chevronLeft" size={16} color={colors.ink} />
    </Pressable>
    <Text style={[typeStyles.body, s.stepperLabel]}>{label}</Text>
    <Pressable
      testID={testID ? `${testID}-next` : undefined}
      onPress={onNext}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Next ${label}`}
    >
      <Icon name="chevronRight" size={16} color={colors.ink} />
    </Pressable>
  </View>
);

/* --------------------------------- upload --------------------------------- */

/**
 * There is no file picker wired yet, so `onPick` is what a real picker would
 * call. The component owns the empty / attached / replace states so the rest
 * of the flow does not have to.
 */
export const UploadField = ({
  label,
  hint,
  file,
  onPick,
  onRemove,
  required,
  note,
  testID,
}: {
  label: string;
  hint?: string;
  file: { name: string; kind: 'pdf' | 'image'; size: string } | null;
  onPick: () => void;
  onRemove?: () => void;
  required?: boolean;
  note?: string;
  testID?: string;
}) => (
  <View style={s.field}>
    <Label required={required}>{label}</Label>
    {file ? (
      <View style={[s.dropzone, s.fileCard]}>
        <View style={s.fileTop}>
          {/* the page itself, with the kind written on it */}
          <View style={s.fileIcon}>
            <Icon
              name="pageFold"
              size={40}
              filled
              color={file.kind === 'pdf' ? '#E5493C' : colors.surfie}
            />
            <Text style={[typeStyles.body, s.fileKind]}>{file.kind === 'pdf' ? 'PDF' : 'IMG'}</Text>
          </View>

          <View style={s.flex}>
            <Text style={[typeStyles.body, s.fileName]} numberOfLines={1}>{file.name}</Text>
            <Text style={[typeStyles.body, s.fileMeta]}>
              {file.kind === 'pdf' ? 'PDF' : 'Image'} · {file.size}
            </Text>
          </View>

          {/* state and the way to change it stack on the right */}
          <View style={s.fileRight}>
            <View style={s.fileState}>
              <Icon name="checkCircle" size={19} color={colors.surfie} filled />
              <Text style={[typeStyles.body, s.fileOk]}>Uploaded</Text>
            </View>
            <Pressable
              testID={testID ? `${testID}-replace` : undefined}
              onPress={onPick}
              style={s.replaceBtn}
              accessibilityRole="button"
              accessibilityLabel={`Replace ${label}`}
            >
              <Text style={[typeStyles.body, s.replace]}>Replace</Text>
            </Pressable>
          </View>

          {onRemove && (
            <Pressable
              testID={testID ? `${testID}-remove` : undefined}
              onPress={onRemove}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${label}`}
            >
              <Icon name="moreVertical" size={16} color={colors.inkFaint} />
            </Pressable>
          )}
        </View>
      </View>
    ) : (
      <Pressable
        testID={testID}
        onPress={onPick}
        style={s.dropzone}
        accessibilityRole="button"
        accessibilityLabel={`Upload ${label}`}
      >
        <View style={s.uploadIcon}>
          <Icon name="upload" size={17} color={colors.surfie} />
        </View>
        <Text style={[typeStyles.body, s.dropText]}>Upload document</Text>
      </Pressable>
    )}
    {!!hint && <Text style={[typeStyles.body, s.dropHint]}>{hint}</Text>}
    <Helper>{note}</Helper>
  </View>
);

/* ----------------------------- verified value ----------------------------- */

/** A value already confirmed at sign-in. Shown, never asked for again. */
export const VerifiedField = ({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID?: string;
}) => (
  <View style={s.field}>
    <Label>{label}</Label>
    <View testID={testID} style={[s.input, s.verified]}>
      <Text style={[typeStyles.body, s.inputText]} numberOfLines={1}>{value}</Text>
      <View style={s.verifiedTag}>
        <Icon name="checkCircle" size={17} color={colors.paris} filled />
        <Text style={[typeStyles.body, s.verifiedText]}>Verified</Text>
      </View>
    </View>
  </View>
);

/* -------------------------------- checkbox -------------------------------- */

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
  <Pressable
    testID={testID}
    onPress={onToggle}
    style={s.checkRow}
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
  >
    <View style={[s.box, checked && s.boxOn]}>
      {checked && <Icon name="check" size={12} color={colors.white} />}
    </View>
    <Text style={[typeStyles.body, s.checkText]}>{children}</Text>
  </Pressable>
);

/* ------------------------------ privacy note ------------------------------ */

/** States plainly that something collected here is never shown to patients. */
export const PrivacyNote = ({ children, icon = 'lock' }: { children: ReactNode; icon?: IconName }) => (
  <View style={s.privacy}>
    <Icon name={icon} size={14} color={colors.surfie} />
    <Text style={[typeStyles.body, s.privacyText]}>{children}</Text>
  </View>
);

/* -------------------------------- stepper --------------------------------- */

export const StepProgress = ({
  steps,
  index,
}: {
  steps: { key: string; short: string }[];
  index: number;
}) => (
  <View>
    {/* one bar per step: filled up to and including the current one */}
    <View style={s.stepBars}>
      {steps.map((st, i) => (
        <View key={st.key} style={[s.stepBar, i <= index && s.stepBarOn]} />
      ))}
    </View>
    <View style={s.stepBars}>
      {steps.map((st, i) => (
        <Text
          key={st.key}
          style={[typeStyles.body, s.stepLabel, i === index && s.stepLabelOn]}
          numberOfLines={1}
        >
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
    maxHeight: 260,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
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
    paddingVertical: 13,
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
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    backgroundColor: colors.white,
    color: colors.ink,
  },
  inputFocused: { borderColor: colors.surfie },
  inputText: { flex: 1, color: colors.ink },
  /* the wrapper already carries the box, so the field itself draws nothing */
  bare: { padding: 0, margin: 0 },
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
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
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
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.surfie,
  },
  addChipText: { ...typeStyles.caption, color: colors.surfie, fontWeight: fontWeight.semibold },
  addRow: { flexDirection: 'row', marginTop: spacing.sm },

  /* upload */
  /* empty and filled share this box, so picking a file cannot resize the card */
  dropzone: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 132,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.surface.inputBorder,
    backgroundColor: colors.surface.page,
  },
  uploadIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  dropText: { ...typeStyles.cardTitle, color: colors.surfie },
  dropHint: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 6 },

  /* the attached state keeps the dropzone box, only its contents change */
  fileCard: {
    justifyContent: 'center',
    alignItems: 'stretch',
    borderStyle: 'solid',
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  fileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  fileIcon: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  /* sits on the lower half of the page shape, where a label would be printed */
  fileKind: {
    ...typeStyles.label,
    position: 'absolute',
    bottom: 9,
    fontSize: 8.5,
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  fileName: { ...typeStyles.cardTitle, color: colors.ink },
  fileMeta: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
  fileRight: { alignItems: 'flex-end', gap: 6 },
  fileState: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fileOk: { ...typeStyles.caption, color: colors.surfie, fontWeight: fontWeight.semibold },
  replaceBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.surfie,
    alignItems: 'center',
  },
  replace: { ...typeStyles.buttonSmall, color: colors.surfie },

  /* checkbox */
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.surface.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  boxOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  checkText: { ...typeStyles.bodySmall, flex: 1, color: colors.ink },

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
  stepLabel: {
    ...typeStyles.caption,
    flex: 1,
    fontSize: 10.5,
    color: colors.inkFaint,
    marginTop: 6,
  },
  stepLabelOn: { color: colors.ink, fontWeight: fontWeight.semibold },

  /* sheet */
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    maxHeight: '80%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.surface.line, alignSelf: 'center', marginBottom: spacing.md,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    flex: 1,
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
  },
  /* the options read as one list, not four loose rows */
  optionBox: {
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  search: { marginBottom: spacing.sm },
  /* grows with the content, so a short list is a short sheet */
  sheetList: { flexGrow: 0, maxHeight: 340 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 13,
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

  /* calendar */
  calHead: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stepper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  stepperLabel: { ...typeStyles.label, color: colors.ink },
  calRow: { flexDirection: 'row' },
  calWeekday: {
    ...typeStyles.caption,
    flex: 1,
    textAlign: 'center',
    color: colors.inkFaint,
    marginBottom: 4,
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  calDay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calDayOn: { backgroundColor: colors.surfie },
  calDayText: { ...typeStyles.body, color: colors.ink },
  calDayTextOn: { color: colors.white, fontWeight: fontWeight.semibold },
  optionText: { ...typeStyles.body, flex: 1, color: colors.ink },
  optionTextOn: { color: colors.surfie, fontWeight: fontWeight.semibold },
  noMatch: { ...typeStyles.caption, color: colors.inkMuted, padding: spacing.md },
  sheetFloor: { height: spacing.sm },
  sheetFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  sheetClear: { paddingVertical: spacing.sm, paddingRight: spacing.sm },
  sheetClearText: { ...typeStyles.buttonSmall, color: colors.surfie },
  sheetDone: {
    flex: 1,
    height: 50,
    borderRadius: radius.sm,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDoneText: { ...typeStyles.button, color: colors.white },
});
