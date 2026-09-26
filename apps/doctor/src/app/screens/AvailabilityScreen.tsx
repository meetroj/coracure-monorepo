import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, TextInput, Keyboard, type ScrollView } from 'react-native';

import { colors, radius, spacing, shadow } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon, type IconName } from '../../components/Icon';
import { Screen, Button, EmptyState, Note } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { BottomSheet, SheetActions } from '../../components/BottomSheet';
import { CalendarSheet } from '../../components/form';
import { confirm } from '../../components/confirm';
import { toast } from '../../components/Toast';
import { useStore, type AvailabilityState } from '../../state/store';
import { saveAvailability } from '../../state/actions';
import {
  TODAY,
  MONTHS_SHORT,
  WEEKDAYS_SHORT,
  isValidISODate,
  daysFromToday,
  fromISODate,
  toISODate,
  minutesToClock,
} from '../../data/calendar';
import { CONSULTATION_DURATIONS, type DaySchedule, type Leave, type ScheduleOverride } from '../../data/doctor';

type Draft = Omit<AvailabilityState, 'savedAt'>;
type Tab = 'schedule' | 'timeoff';

const DURATIONS = CONSULTATION_DURATIONS.map((d) => d.minutes);
const BUFFERS = [0, 5, 10, 15, 20, 30];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/* --------------------------------- clock ---------------------------------- */

/**
 * Lenient clock parsing: "9:00 am", "09:00AM", "9 am", "0930 pm" and 24-hour
 * "21:30" all read. Anything else is NaN.
 */
export const parseClock = (raw: string) => {
  const v = raw.trim().toUpperCase().replace(/\./g, '');
  let m = v.match(/^(\d{1,2})(?::?(\d{2}))?\s*(AM|PM)$/);
  if (m) {
    const h = Number(m[1]);
    const min = m[2] ? Number(m[2]) : 0;
    if (h < 1 || h > 12 || min > 59) return NaN;
    return ((h % 12) + (m[3] === 'PM' ? 12 : 0)) * 60 + min;
  }
  m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return NaN;
    return h * 60 + min;
  }
  return NaN;
};

/** A parsed clock in the one written form the schedule uses: "09:30 AM". */
const normaliseClock = (raw: string) => {
  const mins = parseClock(raw);
  return Number.isNaN(mins) ? raw : minutesToClock(mins);
};

/** "10:00 AM - 01:00 PM" (hyphen, en dash or "to") → a range, or null. */
const parseRange = (raw: string) => {
  const parts = raw.split(/\s*(?:-|–|—|\bto\b)\s*/i).filter(Boolean);
  if (parts.length !== 2) return null;
  const from = parseClock(parts[0]);
  const to = parseClock(parts[1]);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return { from, to };
};

const rangeLabel = (from: string, to: string) => `${from} - ${to}`;

const dayMonth = (iso: string) => {
  const d = fromISODate(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};
const weekday = (iso: string) => WEEKDAYS_SHORT[fromISODate(iso).getDay()];

const byDate = <T extends { date: string }>(list: T[]) => [...list].sort((a, b) => a.date.localeCompare(b.date));

const clone = (a: Draft): Draft => ({
  schedule: a.schedule.map((d) => ({ ...d, ranges: d.ranges.map((r) => ({ ...r })), modes: [...d.modes] })),
  overrides: a.overrides.map((o) => ({ ...o })),
  leave: a.leave.map((l) => ({ ...l })),
  durationMin: a.durationMin,
  bufferMin: a.bufferMin,
});

const same = (a: Draft, b: Draft) => JSON.stringify(clone(a)) === JSON.stringify(clone(b));

/* ------------------------------- validation ------------------------------- */

type DayCheck = { message?: string; badRanges: number[] };

/** One message per day, naming the day, so the doctor knows where to look. */
const checkDay = (d: DaySchedule, durationMin: number): DayCheck => {
  if (!d.enabled) return { badRanges: [] };
  if (d.ranges.length === 0) return { message: `Check ${d.day}: add hours, or turn the day off.`, badRanges: [] };
  const parsed = d.ranges.map((r) => ({ from: parseClock(r.from), to: parseClock(r.to) }));
  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];
    if (Number.isNaN(p.from) || Number.isNaN(p.to))
      return { message: `Check ${d.day}: enter range ${i + 1} as a time like 09:00 AM.`, badRanges: [i] };
    if (p.from >= p.to) return { message: `Check ${d.day}: range ${i + 1} must end after it starts.`, badRanges: [i] };
    if (p.to - p.from < durationMin)
      return { message: `Check ${d.day}: range ${i + 1} is shorter than one ${durationMin}-minute consultation.`, badRanges: [i] };
  }
  const order = parsed.map((p, i) => ({ ...p, i })).sort((a, b) => a.from - b.from);
  for (let k = 1; k < order.length; k++) {
    if (order[k].from < order[k - 1].to)
      return { message: `Check ${d.day}: ranges ${order[k - 1].i + 1} and ${order[k].i + 1} overlap.`, badRanges: [order[k - 1].i, order[k].i] };
  }
  return { badRanges: [] };
};

/* ------------------------------ small pieces ------------------------------ */

const SectionHead = ({
  icon,
  title,
  subtitle,
  onAdd,
  addTestID,
  addLabel,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onAdd?: () => void;
  addTestID?: string;
  addLabel?: string;
}) => (
  <View style={s.sectionHead}>
    <View style={s.sectionIcon}>
      <Icon name={icon} size={17} color={colors.surfie} />
    </View>
    <View style={s.flex}>
      <Text style={s.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {!!subtitle && <Text style={s.sectionSub}>{subtitle}</Text>}
    </View>
    {!!onAdd && (
      <Pressable
        testID={addTestID}
        onPress={onAdd}
        hitSlop={8}
        style={({ pressed }) => [s.addBtn, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel={addLabel}
      >
        <Icon name="plus" size={14} color={colors.surfie} />
        <Text style={s.addBtnText}>Add</Text>
      </Pressable>
    )}
  </View>
);

const TimeInput = ({
  label,
  value,
  onChange,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        const n = normaliseClock(value);
        if (n !== value) onChange(n);
      }}
      placeholder="09:00 AM"
      placeholderTextColor={colors.inkFaint}
      autoCapitalize="characters"
      autoCorrect={false}
      maxLength={9}
      returnKeyType="done"
      accessibilityLabel={label}
      style={[s.time, focused && s.timeFocused, invalid && s.timeInvalid]}
    />
  );
};

/* -------------------------------- editor ---------------------------------- */

type Editor = { kind: 'exception' | 'leave'; id?: string; date: string; details: string; error?: string };

const EntryEditor = ({
  editor,
  onChange,
  onApply,
  onClose,
}: {
  editor: Editor | null;
  onChange: (patch: Partial<Editor>) => void;
  onApply: () => void;
  onClose: () => void;
}) => {
  const [calendar, setCalendar] = useState(false);
  const exception = editor?.kind === 'exception';
  const picked = editor && isValidISODate(editor.date) ? fromISODate(editor.date) : null;

  return (
    <>
      <BottomSheet
        visible={!!editor}
        title={`${editor?.id ? 'Edit' : 'Add'} ${exception ? 'date exception' : 'time off'}`}
        subtitle={exception ? 'Custom hours that replace the weekly pattern on this date.' : 'Patients cannot book you on this date.'}
        onClose={onClose}
        testID="entry-editor"
        footer={<SheetActions testID="entry" onCancel={onClose} confirmLabel="Apply" onConfirm={onApply} />}
      >
        <Text style={s.editorLabel}>Date</Text>
        <View style={[s.editorInput, !!editor?.error && s.editorInputInvalid]}>
          <TextInput
            value={editor?.date ?? ''}
            onChangeText={(v) => onChange({ date: v.replace(/[^\d-]/g, '').slice(0, 10), error: undefined })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.inkFaint}
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
            accessibilityLabel="Entry date"
            accessibilityHint="Year, month and day, for example 2026-10-12"
            style={s.editorText}
          />
          <Pressable
            testID="entry-calendar"
            onPress={() => {
              Keyboard.dismiss();
              setCalendar(true);
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Pick date from calendar"
          >
            <Icon name="calendar" size={18} color={colors.surfie} />
          </Pressable>
        </View>

        <Text style={[s.editorLabel, s.editorGap]}>{exception ? 'Hours' : 'Reason'}</Text>
        <View style={s.editorInput}>
          <TextInput
            value={editor?.details ?? ''}
            onChangeText={(v) => onChange({ details: v, error: undefined })}
            placeholder={exception ? '09:00 AM - 01:00 PM' : 'e.g. Personal leave'}
            placeholderTextColor={colors.inkFaint}
            autoCapitalize={exception ? 'characters' : 'sentences'}
            autoCorrect={!exception}
            maxLength={60}
            accessibilityLabel="Entry details"
            accessibilityHint={exception ? 'Hours, for example 09:00 AM - 01:00 PM' : 'Reason for the time off'}
            style={s.editorText}
          />
        </View>
        {!!editor?.error && <Text style={s.editorError}>{editor.error}</Text>}
      </BottomSheet>

      <CalendarSheet
        visible={calendar}
        title="Select date"
        selected={picked ? { day: picked.getDate(), month: picked.getMonth(), year: picked.getFullYear() } : null}
        initialView={picked ? { month: picked.getMonth(), year: picked.getFullYear() } : { month: TODAY.getMonth(), year: TODAY.getFullYear() }}
        isDisabled={(d) => new Date(d.year, d.month, d.day) < TODAY}
        onPick={(d) => {
          onChange({ date: toISODate(new Date(d.year, d.month, d.day)), error: undefined });
          setCalendar(false);
        }}
        onClose={() => setCalendar(false)}
        testID="entry"
      />
    </>
  );
};

/* ---------------------------------- rows ---------------------------------- */

const DateRow = ({
  iso,
  primary,
  onPress,
  onRemove,
  removeLabel,
  testID,
  last,
}: {
  iso: string;
  primary: string;
  onPress: () => void;
  onRemove: () => void;
  removeLabel: string;
  testID: string;
  last: boolean;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    style={({ pressed }) => [s.dateRow, !last && s.rule, pressed && s.pressed]}
    accessibilityRole="button"
    accessibilityHint="Edit this entry"
  >
    <View style={s.dateBlock}>
      <Text style={s.dateWeekday}>{weekday(iso)}</Text>
      <Text style={s.dateDay}>{dayMonth(iso)}</Text>
    </View>
    <View style={s.flex}>
      <Text style={s.datePrimary}>{primary}</Text>
      <Text style={s.dateIso}>{iso}</Text>
    </View>
    <Pressable onPress={onRemove} hitSlop={8} style={s.removeBtn} accessibilityRole="button" accessibilityLabel={removeLabel}>
      <Icon name="close" size={16} color={colors.inkMuted} />
    </Pressable>
  </Pressable>
);

/* --------------------------------- screen --------------------------------- */

/**
 * Availability — the doctor's weekly hours, date exceptions, time off and
 * consultation settings.
 *
 * Everything edits a local draft; Save validates it and writes it to the
 * store, where the dashboard's "today's hours" and the status sheet read it.
 * Leaving with unsaved changes asks first (the route guards removal via
 * `onDirtyChange`).
 */
export const AvailabilityScreen = ({
  onBack,
  onSaved,
  onDirtyChange,
}: {
  onBack?: () => void;
  onSaved?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) => {
  const saved = useStore((st) => st.availability);
  const [draft, setDraft] = useState<Draft>(() => clone(saved));
  const [tab, setTab] = useState<Tab>('schedule');
  const [active, setActive] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [setting, setSetting] = useState<'duration' | 'buffer' | null>(null);

  // where each day row sits in the scroll content, to bring a failing day into view
  const scrollRef = useRef<ScrollView | null>(null);
  const bodyY = useRef(0);
  const cardY = useRef(0);
  const dayY = useRef<Record<string, number>>({});

  const dirty = !same(draft, saved);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const checks = useMemo(
    () => Object.fromEntries(draft.schedule.map((d) => [d.day, checkDay(d, draft.durationMin)])) as Record<string, DayCheck>,
    [draft.schedule, draft.durationMin]
  );

  /* ---- weekly hours ---- */
  const patchDay = (day: string, patch: (d: DaySchedule) => DaySchedule) => {
    setActive(day);
    setDraft((dr) => ({ ...dr, schedule: dr.schedule.map((d) => (d.day === day ? patch(d) : d)) }));
  };
  const setRange = (day: string, i: number, field: 'from' | 'to', value: string) =>
    patchDay(day, (d) => ({ ...d, ranges: d.ranges.map((r, k) => (k === i ? { ...r, [field]: value } : r)) }));
  const addRange = (day: string) => patchDay(day, (d) => ({ ...d, enabled: true, ranges: [...d.ranges, { from: '', to: '' }] }));
  const removeRange = (day: string, i: number) => patchDay(day, (d) => ({ ...d, ranges: d.ranges.filter((_, k) => k !== i) }));
  const toggleDay = (day: string, on: boolean) =>
    patchDay(day, (d) => ({
      ...d,
      enabled: on,
      // a day switched on with nothing in it starts from a sensible block
      ranges: on && d.ranges.length === 0 ? [{ from: '09:00 AM', to: '01:00 PM' }] : d.ranges,
    }));
  const copyToWeekdays = (src: DaySchedule) =>
    confirm({
      title: `Copy ${src.day}’s hours?`,
      message: `Monday to Friday will use ${src.ranges.map((r) => rangeLabel(r.from, r.to)).join(', ')}.`,
      confirmLabel: 'Copy',
      onConfirm: () =>
        setDraft((dr) => ({
          ...dr,
          schedule: dr.schedule.map((d) =>
            WEEKDAYS.includes(d.day) && d.day !== src.day ? { ...d, enabled: true, ranges: src.ranges.map((r) => ({ ...r })) } : d
          ),
        })),
    });

  /* ---- exceptions + time off ---- */
  const openEditor = (e: Editor) => setEditor(e);
  const applyEditor = () => {
    if (!editor) return;
    const date = editor.date.trim();
    const fail = (error: string) => setEditor({ ...editor, error });
    if (!isValidISODate(date)) return fail('Enter a valid date as YYYY-MM-DD.');
    if (daysFromToday(date) < 0) return fail('Choose today or a later date.');

    if (editor.kind === 'exception') {
      const range = parseRange(editor.details);
      if (!range) return fail('Enter the hours as 09:00 AM - 01:00 PM.');
      if (range.from >= range.to) return fail('The hours must end after they start.');
      if (draft.overrides.some((o) => o.date === date && o.id !== editor.id))
        return fail('This date already has an exception. Edit that one instead.');
      const entry: ScheduleOverride = {
        id: editor.id ?? `o-${Date.now().toString(36)}`,
        date,
        from: minutesToClock(range.from),
        to: minutesToClock(range.to),
      };
      setDraft((dr) => ({
        ...dr,
        overrides: byDate(editor.id ? dr.overrides.map((o) => (o.id === editor.id ? entry : o)) : [...dr.overrides, entry]),
      }));
    } else {
      const reason = editor.details.trim();
      if (reason.length < 2) return fail('Add a reason, for example Personal leave.');
      if (draft.leave.some((l) => l.date === date && l.id !== editor.id)) return fail('This date is already marked as time off.');
      const entry: Leave = { id: editor.id ?? `l-${Date.now().toString(36)}`, date, reason };
      setDraft((dr) => ({
        ...dr,
        leave: byDate(editor.id ? dr.leave.map((l) => (l.id === editor.id ? entry : l)) : [...dr.leave, entry]),
      }));
    }
    setEditor(null);
  };
  const closeEditor = () => setEditor(null);

  const removeException = (o: ScheduleOverride) =>
    confirm({
      title: 'Remove this exception?',
      message: `${weekday(o.date)}, ${dayMonth(o.date)} goes back to your weekly hours.`,
      confirmLabel: 'Remove',
      destructive: true,
      onConfirm: () => setDraft((dr) => ({ ...dr, overrides: dr.overrides.filter((x) => x.id !== o.id) })),
    });
  const removeLeave = (l: Leave) =>
    confirm({
      title: 'Remove this time off?',
      message: `Patients will be able to book you on ${weekday(l.date)}, ${dayMonth(l.date)} again.`,
      confirmLabel: 'Remove',
      destructive: true,
      onConfirm: () => setDraft((dr) => ({ ...dr, leave: dr.leave.filter((x) => x.id !== l.id) })),
    });

  /* ---- save ---- */
  const save = () => {
    const failing = draft.schedule.find((d) => checks[d.day]?.message);
    if (failing) {
      setShowErrors(true);
      setActive(failing.day);
      setTab('schedule');
      toast.show('Fix the highlighted hours before saving', 'error');
      const y = bodyY.current + cardY.current + (dayY.current[failing.day] ?? 0);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.lg), animated: true }));
      return;
    }
    // a day switched off keeps its hours, so switching it back on restores them
    const next = clone(draft);
    saveAvailability(next);
    setDraft(next);
    setShowErrors(false);
    toast.show('Availability saved');
    onSaved?.();
  };

  const upcoming = (list: { date: string }[]) => list.filter((x) => daysFromToday(x.date) >= 0).length;

  return (
    <Screen
      testID="availability"
      scrollRef={scrollRef}
      header={
        <ScreenHeader
          onBack={onBack}
          title="Availability"
          subtitle="Your weekly hours, date exceptions and time off."
          badge={
            dirty ? (
              <View style={s.unsaved}>
                <View style={s.unsavedDot} />
                <Text style={s.unsavedText}>Unsaved</Text>
              </View>
            ) : undefined
          }
        />
      }
      footer={
        <View>
          <Button testID="save-schedule" label="Save changes" onPress={save} disabled={!dirty} />
          <Text style={s.savedAt}>{saved.savedAt ? `Last saved at ${saved.savedAt}` : 'Changes apply to new bookings once saved.'}</Text>
        </View>
      }
    >
      {/* tabs */}
      <View style={s.tabs} accessibilityRole="tablist">
        {(
          [
            ['schedule', 'Schedule'],
            ['timeoff', `Time off (${upcoming(draft.leave)})`],
          ] as const
        ).map(([key, label]) => {
          const on = tab === key;
          return (
            <Pressable
              key={key}
              testID={`tab-${key}`}
              onPress={() => setTab(key)}
              style={[s.tab, on && s.tabOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={[s.tabText, on && s.tabTextOn]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'schedule' ? (
        <View style={s.body} onLayout={(e) => (bodyY.current = e.nativeEvent.layout.y)}>
          {/* weekly hours */}
          <SectionHead icon="calendar" title="Weekly hours" subtitle="Tap a day to add hours or copy them." />
          <View style={s.card} onLayout={(e) => (cardY.current = e.nativeEvent.layout.y)}>
            {draft.schedule.map((d, idx) => {
              const on = active === d.day;
              const check = checks[d.day];
              const err = showErrors ? check?.message : undefined;
              return (
                <View
                  key={d.day}
                  testID={`day-${d.short}`}
                  style={[s.day, idx < draft.schedule.length - 1 && s.rule, on && s.dayOn]}
                  onLayout={(e) => (dayY.current[d.day] = e.nativeEvent.layout.y)}
                >
                  <View style={s.dayHead}>
                    <Pressable
                      onPress={() => setActive(on ? null : d.day)}
                      style={s.dayNameBtn}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: on }}
                      accessibilityLabel={`${d.day}, ${d.enabled ? d.ranges.map((r) => rangeLabel(r.from, r.to)).join(', ') : 'unavailable'}`}
                    >
                      <Text style={[s.dayName, !d.enabled && s.dayNameOff]}>{d.day}</Text>
                      {!d.enabled && <Text style={s.dayOff}>Unavailable</Text>}
                    </Pressable>
                    <Switch
                      value={d.enabled}
                      onValueChange={(v) => toggleDay(d.day, v)}
                      trackColor={{ false: colors.surface.inputBorder, true: colors.paris }}
                      thumbColor={colors.white}
                      ios_backgroundColor={colors.surface.inputBorder}
                      accessibilityLabel={`Available on ${d.day}`}
                    />
                  </View>

                  {d.enabled &&
                    d.ranges.map((r, i) => {
                      const bad = showErrors && !!check?.badRanges.includes(i);
                      return (
                        <View key={i} style={s.rangeRow}>
                          <TimeInput
                            label={`Start time ${d.day} ${i + 1}`}
                            value={r.from}
                            onChange={(v) => setRange(d.day, i, 'from', v)}
                            invalid={bad}
                          />
                          <Text style={s.rangeDash}>–</Text>
                          <TimeInput
                            label={`End time ${d.day} ${i + 1}`}
                            value={r.to}
                            onChange={(v) => setRange(d.day, i, 'to', v)}
                            invalid={bad}
                          />
                          {d.ranges.length > 1 ? (
                            <Pressable
                              onPress={() => removeRange(d.day, i)}
                              hitSlop={8}
                              style={s.rangeRemove}
                              accessibilityRole="button"
                              accessibilityLabel={`Remove ${d.day} range ${i + 1}`}
                            >
                              <Icon name="close" size={15} color={colors.inkMuted} />
                            </Pressable>
                          ) : (
                            <View style={s.rangeRemove} />
                          )}
                        </View>
                      );
                    })}

                  {!!err && <Text style={s.dayError}>{err}</Text>}

                  {on && d.enabled && (
                    <View style={s.dayActions}>
                      <Pressable
                        testID={`add-hours-${d.short}`}
                        onPress={() => addRange(d.day)}
                        hitSlop={6}
                        style={s.dayAction}
                        accessibilityRole="button"
                      >
                        <Icon name="plus" size={14} color={colors.surfie} />
                        <Text style={s.dayActionText}>Add hours</Text>
                      </Pressable>
                      {!check?.message && d.ranges.length > 0 && (
                        <Pressable
                          testID={`copy-hours-${d.short}`}
                          onPress={() => copyToWeekdays(d)}
                          hitSlop={6}
                          style={s.dayAction}
                          accessibilityRole="button"
                        >
                          <Icon name="copy" size={14} color={colors.surfie} />
                          <Text style={s.dayActionText}>Copy to Mon–Fri</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* date exceptions */}
          <SectionHead
            icon="clock"
            title="Date exceptions"
            subtitle="Different hours on a specific date."
            onAdd={() => openEditor({ kind: 'exception', date: '', details: '' })}
            addTestID="add-exception"
            addLabel="Add date exception"
          />
          {draft.overrides.length === 0 ? (
            <View style={s.card}>
              <Text style={s.empty}>No exceptions. Your weekly hours apply every week.</Text>
            </View>
          ) : (
            <View style={s.card}>
              {draft.overrides.map((o, i) => (
                <DateRow
                  key={o.id}
                  testID={`exception-${o.id}`}
                  iso={o.date}
                  primary={rangeLabel(o.from, o.to)}
                  onPress={() => openEditor({ kind: 'exception', id: o.id, date: o.date, details: rangeLabel(o.from, o.to) })}
                  onRemove={() => removeException(o)}
                  removeLabel={`Remove exception on ${o.date}`}
                  last={i === draft.overrides.length - 1}
                />
              ))}
            </View>
          )}

          {/* appointment settings */}
          <SectionHead icon="settings" title="Appointment settings" />
          <View style={s.settings}>
            {(
              [
                ['duration', 'clock', 'Consultation duration', 'Per appointment', draft.durationMin],
                ['buffer', 'hourglass', 'Buffer time', 'Between appointments', draft.bufferMin],
              ] as const
            ).map(([key, icon, label, sub, value]) => (
              <Pressable
                key={key}
                testID={`setting-${key}`}
                onPress={() => setSetting(key)}
                style={({ pressed }) => [s.setting, pressed && s.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${value} minutes`}
              >
                <View style={s.settingIcon}>
                  <Icon name={icon} size={17} color={colors.surfie} />
                </View>
                <Text style={s.settingLabel}>{label}</Text>
                <Text style={s.settingSub}>{sub}</Text>
                <View style={s.settingValueRow}>
                  <Text style={s.settingValue}>{value} min</Text>
                  <Icon name="chevronDown" size={14} color={colors.inkMuted} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={s.body}>
          <SectionHead
            icon="banCircle"
            title="Time off"
            subtitle="Dates you are unavailable for bookings."
            onAdd={() => openEditor({ kind: 'leave', date: '', details: '' })}
            addTestID="add-leave"
            addLabel="Add time off"
          />
          {draft.leave.length === 0 ? (
            <EmptyState icon="calendar" title="No time off planned" body="Add a date to stop new bookings on that day." />
          ) : (
            <View style={s.card}>
              {draft.leave.map((l, i) => (
                <DateRow
                  key={l.id}
                  testID={`leave-${l.id}`}
                  iso={l.date}
                  primary={l.reason}
                  onPress={() => openEditor({ kind: 'leave', id: l.id, date: l.date, details: l.reason })}
                  onRemove={() => removeLeave(l)}
                  removeLabel={`Remove leave on ${l.date}`}
                  last={i === draft.leave.length - 1}
                />
              ))}
            </View>
          )}
          <Note icon="info" style={s.noteReset}>
            Appointments already booked on these dates stay booked. Raise an issue from Help & Support to move them.
          </Note>
        </View>
      )}

      <EntryEditor editor={editor} onChange={(patch) => setEditor((e) => (e ? { ...e, ...patch } : e))} onApply={applyEditor} onClose={closeEditor} />

      <BottomSheet
        visible={!!setting}
        title={setting === 'duration' ? 'Consultation duration' : 'Buffer time'}
        onClose={() => setSetting(null)}
        testID="setting-sheet"
      >
        <View style={s.optionBox}>
          {(setting === 'duration' ? DURATIONS : BUFFERS).map((m, i, list) => {
            const current = setting === 'duration' ? draft.durationMin : draft.bufferMin;
            const on = current === m;
            return (
              <Pressable
                key={m}
                testID={`setting-option-${m}`}
                onPress={() => {
                  setDraft((dr) => (setting === 'duration' ? { ...dr, durationMin: m } : { ...dr, bufferMin: m }));
                  setSetting(null);
                }}
                style={[s.option, i < list.length - 1 && s.rule, on && s.optionOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <Text style={[s.optionText, on && s.optionTextOn]}>{m === 0 ? 'No buffer' : `${m} minutes`}</Text>
                {on && <Icon name="check" size={18} weight={3} color={colors.paris} />}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.8 },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  body: { paddingHorizontal: spacing.lg },
  noteReset: { marginHorizontal: 0 },

  unsaved: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.warnSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  unsavedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.warn },
  unsavedText: { ...typeStyles.caption, color: colors.warn, fontWeight: fontWeight.semibold },
  savedAt: { ...typeStyles.caption, color: colors.inkMuted, textAlign: 'center', marginTop: 6 },

  tabs: { flexDirection: 'row', marginHorizontal: spacing.lg, backgroundColor: colors.surface.mintSoft, borderRadius: radius.pill, padding: 4 },
  tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  tabOn: { backgroundColor: colors.surfie },
  tabText: { ...typeStyles.status, color: colors.inkMuted },
  tabTextOn: { color: colors.white, fontWeight: fontWeight.semibold },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...typeStyles.cardTitle, color: colors.ink },
  sectionSub: { ...typeStyles.caption, color: colors.inkMuted },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  addBtnText: { ...typeStyles.buttonSmall, color: colors.surfie },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    paddingHorizontal: spacing.md,
    ...shadow.card,
  },
  empty: { ...typeStyles.bodySmall, color: colors.inkMuted, paddingVertical: spacing.lg },

  day: { paddingVertical: spacing.sm + 2, gap: spacing.sm, marginHorizontal: -spacing.md, paddingHorizontal: spacing.md },
  dayOn: { backgroundColor: colors.surface.mintSoft },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  dayNameBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  dayName: { ...typeStyles.cardTitle, color: colors.ink },
  dayNameOff: { color: colors.inkMuted },
  dayOff: { ...typeStyles.caption, color: colors.inkMuted },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rangeDash: { ...typeStyles.body, color: colors.inkMuted },
  rangeRemove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  time: {
    ...typeStyles.inputSingle,
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    color: colors.ink,
    backgroundColor: colors.white,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  timeFocused: { borderColor: colors.surfie },
  timeInvalid: { borderColor: colors.danger },
  dayError: { ...typeStyles.helper, color: colors.danger },
  dayActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  dayAction: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 },
  dayActionText: { ...typeStyles.buttonSmall, color: colors.surfie },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  dateBlock: { width: 56, alignItems: 'center', backgroundColor: colors.surface.mintSoft, borderRadius: radius.md, paddingVertical: 6 },
  dateWeekday: { ...typeStyles.caption, color: colors.inkMuted },
  dateDay: { ...typeStyles.label, color: colors.ink, fontWeight: fontWeight.semibold },
  datePrimary: { ...typeStyles.body, color: colors.ink, fontWeight: fontWeight.medium },
  dateIso: { ...typeStyles.caption, color: colors.inkMuted, fontVariant: ['tabular-nums'] },
  removeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  settings: { flexDirection: 'row', gap: spacing.sm },
  setting: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    gap: 2,
  },
  settingIcon: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.surface.selected, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  settingLabel: { ...typeStyles.label, color: colors.ink },
  settingSub: { ...typeStyles.caption, color: colors.inkMuted },
  settingValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  settingValue: { ...typeStyles.metricSmall, color: colors.ink },

  editorLabel: { ...typeStyles.label, color: colors.ink, marginBottom: 6 },
  editorGap: { marginTop: spacing.md },
  editorInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
  },
  editorInputInvalid: { borderColor: colors.danger },
  editorText: { ...typeStyles.inputSingle, flex: 1, height: 46, color: colors.ink },
  editorError: { ...typeStyles.helper, color: colors.danger, marginTop: spacing.sm },

  optionBox: { borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.md, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.md },
  optionOn: { backgroundColor: colors.surface.mintSoft },
  optionText: { ...typeStyles.body, color: colors.ink, flex: 1 },
  optionTextOn: { fontWeight: fontWeight.semibold, color: colors.surfie },
});

export default AvailabilityScreen;
