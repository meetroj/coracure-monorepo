import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Switch,
  ScrollView, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors, radius, spacing, typography, shadow } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import LogoWide from '../../assets/brand/logo-wide.svg';
import { initialSchedule, leaves, type DaySchedule } from '../../data/doctor';

const toMins = (v: string) => {
  const m = v.trim().match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/i);
  return m ? (Number(m[1]) % 12 + (m[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(m[2]) : NaN;
};

const DAYS_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

const OVERRIDE_DATA = [
  { id: 'o1', date: 'Fri, 24 May', time: '09:00 AM – 02:00 PM' },
  { id: 'o2', date: 'Tue, 28 May', time: '04:00 PM – 08:00 PM' },
  { id: 'o3', date: 'Thu, 30 May', time: '09:00 AM – 01:00 PM' },
];

const DURATION_OPTIONS = ['15 min', '20 min', '30 min', '45 min', '60 min'];
const BUFFER_OPTIONS   = ['0 min', '5 min', '10 min', '15 min', '20 min', '30 min'];
const HOURS   = ['12','01','02','03','04','05','06','07','08','09','10','11'];
const MINUTES = ['00','15','30','45'];
const PERIODS = ['AM','PM'];

/* ─── SectionHead ─────────────────────────────────────────────────────────── */

const SectionHead = ({
  icon, title, actionLabel, onAction,
}: {
  icon: React.ReactNode;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <View style={s.sectionHeadRow}>
    <View style={s.sectionHeadLeft}>
      <View style={s.sectionHeadIcon}>{icon}</View>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
    {!!actionLabel && (
      <Pressable onPress={onAction} hitSlop={8} style={s.actionBtn}>
        <Icon name="plus" size={13} color={colors.surfie} />
        <Text style={s.actionBtnText}>{actionLabel}</Text>
      </Pressable>
    )}
  </View>
);

/* ─── TimeSelector ────────────────────────────────────────────────────────── */

const TimeSelector = ({ value, onPress, error }: {
  value: string; onPress: () => void; error?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    style={[s.timeSelector, error && s.timeSelectorError]}
    accessibilityRole="button"
    accessibilityLabel={value || 'Select time'}
  >
    <Text style={[s.timeSelectorText, !value && s.timeSelectorPlaceholder]} numberOfLines={1}>
      {value || '--:-- --'}
    </Text>
    <Icon name="chevronDown" size={12} color={colors.inkFaint} />
  </Pressable>
);

/* ─── TimePicker ──────────────────────────────────────────────────────────── */

const TimePicker = ({ visible, initial, onConfirm, onClose }: {
  visible: boolean; initial: string;
  onConfirm: (v: string) => void; onClose: () => void;
}) => {
  const parsed = initial.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const [hour,   setHour]   = useState(parsed ? parsed[1].padStart(2,'0') : '09');
  const [minute, setMinute] = useState(parsed ? parsed[2] : '00');
  const [period, setPeriod] = useState<'AM'|'PM'>(parsed ? (parsed[3].toUpperCase() as 'AM'|'PM') : 'AM');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Select Time</Text>
          <View style={s.pickerRow}>
            <View style={s.pickerCol}>
              <Text style={s.pickerColLabel}>Hour</Text>
              <ScrollView style={s.pickerScroll} showsVerticalScrollIndicator={false}>
                {HOURS.map((h) => (
                  <Pressable key={h} onPress={() => setHour(h)}
                    style={[s.pickerItem, hour === h && s.pickerItemActive]}>
                    <Text style={[s.pickerItemText, hour === h && s.pickerItemTextActive]}>{h}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <Text style={s.pickerColon}>:</Text>
            <View style={s.pickerCol}>
              <Text style={s.pickerColLabel}>Min</Text>
              <ScrollView style={s.pickerScroll} showsVerticalScrollIndicator={false}>
                {MINUTES.map((m) => (
                  <Pressable key={m} onPress={() => setMinute(m)}
                    style={[s.pickerItem, minute === m && s.pickerItemActive]}>
                    <Text style={[s.pickerItemText, minute === m && s.pickerItemTextActive]}>{m}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={s.pickerCol}>
              <Text style={s.pickerColLabel}>Period</Text>
              {PERIODS.map((p) => (
                <Pressable key={p} onPress={() => setPeriod(p as 'AM'|'PM')}
                  style={[s.pickerItem, period === p && s.pickerItemActive]}>
                  <Text style={[s.pickerItemText, period === p && s.pickerItemTextActive]}>{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Pressable style={s.sheetConfirm}
            onPress={() => { onConfirm(`${hour}:${minute} ${period}`); onClose(); }}>
            <Text style={s.sheetConfirmText}>Confirm</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

/* ─── OverflowMenu ────────────────────────────────────────────────────────── */

const OverflowMenu = ({ visible, onClose, onAddSlot, onCopy, onClear }: {
  visible: boolean; onClose: () => void;
  onAddSlot: () => void; onCopy: () => void; onClear: () => void;
}) => {
  if (!visible) return null;
  const items = [
    { label: 'Add another slot',   icon: 'plus'  as const, action: onAddSlot },
    { label: 'Copy to other days', icon: 'copy'  as const, action: onCopy },
    { label: 'Clear day',          icon: 'trash' as const, action: onClear, danger: true },
  ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.menuBackdrop} onPress={onClose}>
        <View style={s.menuCard}>
          {items.map((item, i) => (
            <Pressable key={item.label}
              onPress={() => { item.action(); onClose(); }}
              style={[s.menuItem, i < items.length - 1 && s.menuItemBorder]}>
              <Icon name={item.icon} size={16} color={item.danger ? colors.danger : colors.ink} />
              <Text style={[s.menuItemText, item.danger && s.menuItemDanger]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
};

/* ─── BottomSheetSelector ─────────────────────────────────────────────────── */

const BottomSheetSelector = ({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean; title: string; options: string[];
  selected: string; onSelect: (v: string) => void; onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={s.backdrop} onPress={onClose}>
      <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
        <View style={s.sheetHandle} />
        <Text style={s.sheetTitle}>{title}</Text>
        {options.map((opt) => (
          <Pressable key={opt} onPress={() => { onSelect(opt); onClose(); }}
            style={[s.sheetOption, opt === selected && s.sheetOptionActive]}>
            <Text style={[s.sheetOptionText, opt === selected && s.sheetOptionTextActive]}>{opt}</Text>
            {opt === selected && <Icon name="checkCircle" size={18} color={colors.surfie} />}
          </Pressable>
        ))}
      </Pressable>
    </Pressable>
  </Modal>
);

/* ─── DayRow ──────────────────────────────────────────────────────────────── */

const DayRow = ({ day, onToggle, onTimePress, onMenuPress, onAddSlot, errors }: {
  day: DaySchedule; onToggle: () => void;
  onTimePress: (rangeIdx: number, field: 'from'|'to') => void;
  onMenuPress: () => void; onAddSlot: () => void;
  errors: Record<string, string>;
}) => {
  const short = DAYS_SHORT[day.day] ?? day.day.slice(0, 3);
  const dayErrors = Object.entries(errors).filter(([k]) => k.startsWith(day.day));
  return (
    <View style={s.dayRow}>
      <View style={s.dayRowMain}>
        <View style={s.dayLeft}>
          <Text style={s.dayName}>{short}</Text>
          <Switch
            value={day.enabled}
            onValueChange={onToggle}
            trackColor={{ false: colors.surface.line, true: colors.paris }}
            thumbColor={colors.white}
            style={s.daySwitch}
          />
        </View>
        <View style={s.dayCenter}>
          {day.enabled ? (
            <>
              {day.ranges.map((r, i) => (
                <View key={i} style={s.slotRow}>
                  <TimeSelector value={r.from} onPress={() => onTimePress(i, 'from')}
                    error={!!errors[`${day.day}-${i}-from`]} />
                  <Text style={s.slotDash}>–</Text>
                  <TimeSelector value={r.to} onPress={() => onTimePress(i, 'to')}
                    error={!!errors[`${day.day}-${i}-to`]} />
                </View>
              ))}
              <Pressable onPress={onAddSlot} hitSlop={8} style={s.addSlotBtn}>
                <Icon name="plus" size={12} color={colors.surfie} />
                <Text style={s.addSlotText}>Add slot</Text>
              </Pressable>
            </>
          ) : (
            <View style={s.notAvailBox}>
              <Text style={s.notAvailText}>Not available</Text>
            </View>
          )}
        </View>
        <Pressable onPress={onMenuPress} hitSlop={12} style={s.moreBtn}
          accessibilityLabel={`Options for ${day.day}`}>
          <Icon name="moreVertical" size={18} color={colors.inkFaint} />
        </Pressable>
      </View>
      {dayErrors.map(([k, msg]) => (
        <Text key={k} style={s.inlineError}>{msg}</Text>
      ))}
    </View>
  );
};

/* ─── AvailabilityScreen ──────────────────────────────────────────────────── */

export const AvailabilityScreen = ({ onSaved }: { onSaved?: () => void }) => {
  const insets = useSafeAreaInsets();

  const [schedule,  setSchedule]  = useState<DaySchedule[]>(initialSchedule);
  const [overrides, setOverrides] = useState(OVERRIDE_DATA);
  const [leaveList, setLeaveList] = useState(leaves);
  const [duration,  setDuration]  = useState('30 min');
  const [buffer,    setBuffer]    = useState('15 min');
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<'idle'|'loading'|'saved'>('idle');
  /**
   * Measured size of the Save button. Percentage width on the gradient <Rect>
   * left a sliver of the button uncovered on the right, so the solid fallback
   * showed through as a dark band past the arrow. Exact pixels avoid that.
   */
  const [saveBtnSize, setSaveBtnSize] = useState({ w: 0, h: 0 });
  /** Tapped override card, highlighted in mint. Tap again to clear. */
  const [selectedOverride, setSelectedOverride] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget,  setPickerTarget]  = useState<{ day: string; rangeIdx: number; field: 'from'|'to' }|null>(null);
  const [pickerInitial, setPickerInitial] = useState('');
  const [menuDay,       setMenuDay]       = useState<string|null>(null);
  const [durationSheet, setDurationSheet] = useState(false);
  const [bufferSheet,   setBufferSheet]   = useState(false);
  const [leaveModal,    setLeaveModal]    = useState(false);
  const [leaveDate,     setLeaveDate]     = useState('');
  const [leaveReason,   setLeaveReason]   = useState('');
  const [leaveError,    setLeaveError]    = useState('');
  const [overrideModal, setOverrideModal] = useState(false);
  const [overrideDate,  setOverrideDate]  = useState('');
  const [overrideTime,  setOverrideTime]  = useState('');
  const [overrideError, setOverrideError] = useState('');

  const markChanged = () => { setHasChanges(true); setSaveState('idle'); };

  const toggleDay = (day: string) => {
    setSchedule((prev) => prev.map((d) => d.day === day ? { ...d, enabled: !d.enabled } : d));
    markChanged();
  };

  const openTimePicker = (day: string, rangeIdx: number, field: 'from'|'to') => {
    const d = schedule.find((x) => x.day === day);
    setPickerTarget({ day, rangeIdx, field });
    setPickerInitial(d?.ranges[rangeIdx]?.[field] ?? '');
    setPickerVisible(true);
  };

  const applyTime = (value: string) => {
    if (!pickerTarget) return;
    const { day, rangeIdx, field } = pickerTarget;
    setSchedule((prev) =>
      prev.map((d) =>
        d.day === day
          ? { ...d, ranges: d.ranges.map((r, i) => i === rangeIdx ? { ...r, [field]: value } : r) }
          : d
      )
    );
    const d = schedule.find((x) => x.day === day);
    if (d) {
      const range = { ...d.ranges[rangeIdx], [field]: value };
      const fromM = toMins(range.from);
      const toM   = toMins(range.to);
      const key   = `${day}-${rangeIdx}`;
      if (range.from && range.to && !isNaN(fromM) && !isNaN(toM) && fromM >= toM) {
        setErrors((e) => ({ ...e, [`${key}-to`]: 'End must be after start' }));
      } else {
        setErrors((e) => { const n = { ...e }; delete n[`${key}-from`]; delete n[`${key}-to`]; return n; });
      }
    }
    markChanged();
  };

  const addSlot = (day: string) => {
    setSchedule((prev) =>
      prev.map((d) => d.day === day ? { ...d, ranges: [...d.ranges, { from: '', to: '' }] } : d)
    );
    markChanged();
  };

  const clearDay = (day: string) => {
    setSchedule((prev) => prev.map((d) => d.day === day ? { ...d, ranges: [] } : d));
    markChanged();
  };

  const copyToAll = (day: string) => {
    const src = schedule.find((d) => d.day === day);
    if (!src) return;
    setSchedule((prev) =>
      prev.map((d) =>
        d.day !== day && d.day !== 'Saturday' && d.day !== 'Sunday'
          ? { ...d, enabled: true, ranges: src.ranges.map((r) => ({ ...r })) }
          : d
      )
    );
    markChanged();
  };

  const copyLastWeek = () => {
    const mon = schedule.find((d) => d.day === 'Monday');
    if (!mon) return;
    setSchedule((prev) =>
      prev.map((d) =>
        d.day !== 'Saturday' && d.day !== 'Sunday'
          ? { ...d, enabled: true, ranges: mon.ranges.map((r) => ({ ...r })) }
          : d
      )
    );
    markChanged();
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    for (const d of schedule.filter((x) => x.enabled)) {
      if (!d.ranges.length) { errs[`${d.day}-empty`] = 'Add at least one time slot'; continue; }
      const sorted = d.ranges
        .map((r, i) => ({ ...r, i, fromM: toMins(r.from), toM: toMins(r.to) }))
        .sort((a, b) => a.fromM - b.fromM);
      for (const r of sorted) {
        if (isNaN(r.fromM)) errs[`${d.day}-${r.i}-from`] = 'Invalid time';
        if (isNaN(r.toM))   errs[`${d.day}-${r.i}-to`]   = 'Invalid time';
        if (!isNaN(r.fromM) && !isNaN(r.toM) && r.fromM >= r.toM)
          errs[`${d.day}-${r.i}-to`] = 'End must be after start';
      }
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].fromM < sorted[i - 1].toM)
          errs[`${d.day}-${sorted[i].i}-from`] = 'Slots overlap';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    setSaveState('loading');
    setTimeout(() => { setSaveState('saved'); setHasChanges(false); onSaved?.(); }, 1200);
  };

  const submitLeave = () => {
    if (!leaveDate.trim())   { setLeaveError('Enter a date');   return; }
    if (!leaveReason.trim()) { setLeaveError('Enter a reason'); return; }
    setLeaveList((prev) => [...prev, { id: `l-${Date.now()}`, dateLabel: leaveDate.trim(), reason: leaveReason.trim() }]);
    setLeaveDate(''); setLeaveReason(''); setLeaveError(''); setLeaveModal(false); markChanged();
  };

  const submitOverride = () => {
    if (!overrideDate.trim()) { setOverrideError('Enter a date');       return; }
    if (!overrideTime.trim()) { setOverrideError('Enter a time range'); return; }
    setOverrides((prev) => [...prev, { id: `o-${Date.now()}`, date: overrideDate.trim(), time: overrideTime.trim() }]);
    setOverrideDate(''); setOverrideTime(''); setOverrideError(''); setOverrideModal(false); markChanged();
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* header */}
      <View style={s.header}>
        <Pressable hitSlop={10} style={s.headerBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Icon name="arrowLeft" size={20} color={colors.ink} />
        </Pressable>
        <LogoWide width={120} height={30} />
        <Pressable hitSlop={10} style={s.headerBtn} accessibilityRole="button" accessibilityLabel="Notifications">
          <Icon name="bell" size={20} color={colors.ink} />
          <View style={s.notifDot} />
        </Pressable>
      </View>

      <ScrollView
        style={s.scroll}
        // The tab bar below already absorbs `insets.bottom`; adding it here too
        // double-padded and left a dead gap under the Save button.
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* page title */}
        <View style={s.pageTitleWrap}>
          <Text style={s.pageTitle}>Availability Schedule</Text>
          <Text style={s.pageSubtitle}>Manage your weekly availability and appointment settings.</Text>
          {hasChanges && (
            <View style={s.unsavedBadge}>
              <View style={s.unsavedDot} />
              <Text style={s.unsavedText}>Unsaved changes</Text>
            </View>
          )}
        </View>

        {/* ── 1. Weekly Schedule ── */}
        <SectionHead
          icon={<Icon name="calendar" size={17} color={colors.surfie} />}
          title="Weekly Schedule"
          actionLabel="Copy last week"
          onAction={copyLastWeek}
        />
        <View style={s.card}>
          {schedule.map((day, idx) => (
            <View key={day.day}>
              <DayRow
                day={day}
                onToggle={() => toggleDay(day.day)}
                onTimePress={(ri, field) => openTimePicker(day.day, ri, field)}
                onMenuPress={() => setMenuDay(day.day)}
                onAddSlot={() => addSlot(day.day)}
                errors={errors}
              />
              {idx < schedule.length - 1 && <View style={s.rowDivider} />}
            </View>
          ))}
        </View>

        {/* ── 2. Date-wise Overrides ── */}
        <SectionHead
          icon={<Icon name="calendar" size={17} color={colors.surfie} />}
          title="Date-wise Overrides"
          actionLabel="Add Override"
          onAction={() => setOverrideModal(true)}
        />
        {/* No outer card — the override cards below are the cards. */}
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.overrideScroll}
          >
            {overrides.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => setSelectedOverride((cur) => (cur === o.id ? null : o.id))}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedOverride === o.id }}
                accessibilityLabel={`${o.date}, ${o.time}`}
                style={({ pressed }) => [
                  s.overrideCard,
                  (pressed || selectedOverride === o.id) && s.overrideCardSelected,
                ]}
              >
                <Text style={s.overrideDate}>{o.date}</Text>
                <Text style={s.overrideTime}>{o.time}</Text>
                <View style={s.overrideTag}>
                  <View style={s.overrideTagDot} />
                  <Text style={s.overrideTagText}>Custom</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── 3. Appointment Settings ── */}
        <SectionHead
          icon={<Icon name="settings" size={17} color={colors.surfie} />}
          title="Appointment Settings"
        />
        {/* No outer card — `settingsRow` already draws its own bordered card. */}
        <View>
          <View style={s.settingsRow}>
            <Pressable style={s.settingCard} onPress={() => setDurationSheet(true)}>
              <View style={s.settingTopRow}>
                <View style={s.settingIconWrap}>
                  <Icon name="clock" size={17} color={colors.surfie} />
                </View>
                <View style={s.settingLabelWrap}>
                  <Text style={s.settingLabel}>Consultation Duration</Text>
                  <Text style={s.settingSubLabel}>Per appointment</Text>
                  <View style={s.settingValueRow}>
                    <Text style={s.settingValue}>{duration}</Text>
                    <Icon name="chevronDown" size={14} color={colors.inkFaint} />
                  </View>
                </View>
              </View>
            </Pressable>
            <Pressable style={s.settingCard} onPress={() => setBufferSheet(true)}>
              <View style={s.settingTopRow}>
                <View style={s.settingIconWrap}>
                  <Icon name="flask" size={17} color={colors.surfie} />
                </View>
                <View style={s.settingLabelWrap}>
                  <Text style={s.settingLabel}>Buffer Time</Text>
                  <Text style={s.settingSubLabel}>Between appointments</Text>
                  <View style={s.settingValueRow}>
                    <Text style={s.settingValue}>{buffer}</Text>
                    <Icon name="chevronDown" size={14} color={colors.inkFaint} />
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── 4. Blocked Dates & Leave ── */}
        <SectionHead
          icon={<Icon name="banCircle" size={17} color={colors.surfie} />}
          title="Blocked Dates & Leave"
          actionLabel="Add Leave"
          onAction={() => setLeaveModal(true)}
        />
        {/* No outer card — the leave chips below are the cards. */}
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.leaveScroll}>
            {leaveList.map((l) => (
              <View key={l.id} style={s.leaveChip}>
                <View style={s.leaveChipBody}>
                  <Text style={s.leaveChipDate}>{l.dateLabel}</Text>
                  <Text style={s.leaveChipReason}>{l.reason}</Text>
                </View>
                <Pressable
                  onPress={() => { setLeaveList((prev) => prev.filter((x) => x.id !== l.id)); markChanged(); }}
                  hitSlop={8}
                  accessibilityLabel={`Remove ${l.dateLabel}`}
                >
                  <Icon name="close" size={14} color={colors.inkFaint} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── Save CTA ── */}
        <Pressable
          onPress={save}
          disabled={saveState === 'loading'}
          style={({ pressed }) => [s.saveBtn, pressed && s.saveBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Save and publish schedule"
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setSaveBtnSize((p) => (p.w === width && p.h === height ? p : { w: width, h: height }));
          }}
        >
          {/* Surfie → Paris gradient fill. Painted as an SVG rect behind the
              label because React Native has no gradient background; both stops
              are brand greens, so no new hue is introduced. */}
          {saveBtnSize.w > 0 && (
            <Svg style={StyleSheet.absoluteFill} width={saveBtnSize.w} height={saveBtnSize.h}>
              <Defs>
                {/* The ramp finishes at 80%, just left of the arrow circle, so
                    the arrow and the strip beyond it sit on one flat Paris
                    Green rather than a still-shifting mid-tone. */}
                <LinearGradient id="saveGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={colors.surfie} />
                  <Stop offset="0.8" stopColor={colors.paris} />
                  <Stop offset="1" stopColor={colors.paris} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={saveBtnSize.w} height={saveBtnSize.h} fill="url(#saveGrad)" />
            </Svg>
          )}

          {/* Padding lives here, not on the Pressable: an absolutely-positioned
              child is laid out inside the parent's padding, which inset the
              gradient and exposed the fallback colour past the arrow. */}
          <View style={s.saveBtnContent}>
            {saveState === 'loading' ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Text style={s.saveBtnText}>
                  {saveState === 'saved' ? 'Schedule Saved!' : 'Save & Publish Schedule'}
                </Text>
                <View style={s.saveBtnCircle}>
                  <Icon
                    name={saveState === 'saved' ? 'checkCircle' : 'arrowRight'}
                    size={20}
                    color={colors.surfie}
                  />
                </View>
              </>
            )}
          </View>
        </Pressable>
      </ScrollView>

      {/* modals */}
      <TimePicker
        visible={pickerVisible}
        initial={pickerInitial}
        onConfirm={applyTime}
        onClose={() => setPickerVisible(false)}
      />
      <OverflowMenu
        visible={!!menuDay}
        onClose={() => setMenuDay(null)}
        onAddSlot={() => menuDay && addSlot(menuDay)}
        onCopy={() => menuDay && copyToAll(menuDay)}
        onClear={() => menuDay && clearDay(menuDay)}
      />
      <BottomSheetSelector
        visible={durationSheet}
        title="Consultation Duration"
        options={DURATION_OPTIONS}
        selected={duration}
        onSelect={(v) => { setDuration(v); markChanged(); }}
        onClose={() => setDurationSheet(false)}
      />
      <BottomSheetSelector
        visible={bufferSheet}
        title="Buffer Time"
        options={BUFFER_OPTIONS}
        selected={buffer}
        onSelect={(v) => { setBuffer(v); markChanged(); }}
        onClose={() => setBufferSheet(false)}
      />

      {/* Add Leave modal */}
      <Modal visible={leaveModal} transparent animationType="slide" onRequestClose={() => setLeaveModal(false)}>
        <Pressable style={s.backdrop} onPress={() => setLeaveModal(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Add Leave</Text>
            <Text style={s.inputLabel}>Date (e.g. 25 May 2024)</Text>
            <TextInput style={s.textInput} value={leaveDate} onChangeText={setLeaveDate}
              placeholder="25 May 2024" placeholderTextColor={colors.inkFaint} />
            <Text style={s.inputLabel}>Reason</Text>
            <TextInput style={s.textInput} value={leaveReason} onChangeText={setLeaveReason}
              placeholder="Personal Leave" placeholderTextColor={colors.inkFaint} />
            {!!leaveError && <Text style={s.modalError}>{leaveError}</Text>}
            <Pressable style={s.sheetConfirm} onPress={submitLeave}>
              <Text style={s.sheetConfirmText}>Add Leave</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Override modal */}
      <Modal visible={overrideModal} transparent animationType="slide" onRequestClose={() => setOverrideModal(false)}>
        <Pressable style={s.backdrop} onPress={() => setOverrideModal(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Add Override</Text>
            <Text style={s.inputLabel}>Date (e.g. Fri, 24 May)</Text>
            <TextInput style={s.textInput} value={overrideDate} onChangeText={setOverrideDate}
              placeholder="Fri, 24 May" placeholderTextColor={colors.inkFaint} />
            <Text style={s.inputLabel}>Time range (e.g. 09:00 AM – 02:00 PM)</Text>
            <TextInput style={s.textInput} value={overrideTime} onChangeText={setOverrideTime}
              placeholder="09:00 AM – 02:00 PM" placeholderTextColor={colors.inkFaint} />
            {!!overrideError && <Text style={s.modalError}>{overrideError}</Text>}
            <Pressable style={s.sheetConfirm} onPress={submitOverride}>
              <Text style={s.sheetConfirmText}>Add Override</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

/* ─── styles ──────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.surface.page,
    borderBottomWidth: 1, borderBottomColor: colors.surface.line,
  },
  headerBtn: {
    // Matches the shared `IconButton` squircle in components/ui.tsx.
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.surface.line,
  },
  notifDot: {
    position: 'absolute', top: 8, right: 9,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.paris,
    borderWidth: 1.5, borderColor: colors.white,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg },

  pageTitleWrap: { marginBottom: spacing.sm },
  pageTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl, fontWeight: '700', color: colors.ink,
  },
  pageSubtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm, color: colors.inkMuted, marginTop: 3,
  },
  unsavedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  unsavedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.warn },
  unsavedText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.warn, fontWeight: '600',
  },

  /* section heading — sits ABOVE the card */
  sectionHeadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.lg, marginBottom: spacing.sm, gap: spacing.sm,
  },
  sectionHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  sectionHeadIcon: {
    width: 34, height: 34, borderRadius: radius.md,
    // White chip with a hairline, not a mint fill.
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.surface.line,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sectionHeadText: { flex: 1 },
  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md, fontWeight: '700', color: colors.ink,
  },
  sectionSubtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.inkMuted, marginTop: 1,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    // Rounded rect, not a capsule — matches the squircle header buttons.
    // Border is the same hairline the cards use, so the button reads as quiet
    // chrome; the green is carried by the label and the `+` alone.
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.surface.line, flexShrink: 0,
  },
  actionBtnText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, fontWeight: '700', color: colors.surfie,
  },

  /* card */
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card, borderWidth: 1, borderColor: colors.surface.line,
    padding: spacing.lg, ...shadow.card,
  },

  rowDivider: { height: 1, backgroundColor: colors.surface.line, marginVertical: 2 },

  /* day row */
  dayRow: { paddingVertical: spacing.sm },
  dayRowMain: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  dayLeft: { alignItems: 'center', width: 44, paddingTop: 2 },
  dayName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm, fontWeight: '700', color: colors.ink, marginBottom: 4,
  },
  daySwitch: { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] },
  dayCenter: { flex: 1, gap: 5 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  slotDash: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm, color: colors.inkFaint, flexShrink: 0,
  },
  notAvailBox: {
    height: 38, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.surface.line, backgroundColor: colors.surface.page,
    alignItems: 'center', justifyContent: 'center',
  },
  notAvailText: {
    fontFamily: typography.body.family, fontSize: typography.size.xs, color: colors.inkFaint,
  },
  addSlotBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3 },
  addSlotText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.surfie, fontWeight: '600',
  },
  moreBtn: { paddingTop: 10, paddingLeft: 4, flexShrink: 0 },
  inlineError: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.danger,
    marginTop: 3, marginLeft: 44 + spacing.sm,
  },

  /* time selector */
  timeSelector: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 38, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.surface.inputBorder, paddingHorizontal: spacing.sm,
    backgroundColor: colors.white, minWidth: 0, gap: 2,
  },
  timeSelectorError: { borderColor: colors.danger },
  timeSelectorText: {
    fontFamily: typography.body.family, fontSize: 12, color: colors.ink, flex: 1,
  },
  timeSelectorPlaceholder: { color: colors.inkFaint },

  /* overrides */
  overrideScroll: { gap: spacing.sm, paddingRight: spacing.xs },
  overrideCard: {
    width: 150, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.surface.line, padding: spacing.md,
    backgroundColor: colors.white,
  },
  // Selected/pressed: mint fill with a brand-green edge.
  overrideCardSelected: {
    backgroundColor: colors.surface.mintSoft,
    borderColor: colors.paris,
  },
  overrideDate: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm, fontWeight: '700', color: colors.ink,
  },
  overrideTime: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.inkMuted, marginTop: 3,
  },
  overrideTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  overrideTagDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.paris },
  overrideTagText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.surfie, fontWeight: '600',
  },

  /* appointment settings */
  // Two standalone cards side by side, not one split box.
  settingsRow: { flexDirection: 'row', gap: spacing.sm },
  settingCard: {
    flex: 1, padding: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  /* icon + label side by side */
  settingTopRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
  },
  settingIconWrap: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: colors.surface.selected,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    marginTop: 6,
  },
  settingLabelWrap: { flex: 1 },
  settingLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, fontWeight: '600', color: colors.ink,
  },
  settingSubLabel: {
    fontFamily: typography.body.family, fontSize: 11, color: colors.inkFaint, marginTop: 1,
  },
  settingValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  settingValue: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg, fontWeight: '700', color: colors.ink,
  },

  /* leave chips — single horizontal swipeable row */
  leaveScroll: { gap: spacing.sm, paddingRight: spacing.xs },
  leaveChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  leaveChipBody: { flex: 1 },
  leaveChipDate: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm, fontWeight: '700', color: colors.ink,
  },
  leaveChipReason: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.inkMuted, marginTop: 1,
  },

  /* save button */
  saveBtn: {
    marginTop: spacing.xl, height: 56, borderRadius: radius.input,
    // `overflow: hidden` clips the gradient rect to the radius. No padding
    // here — see `saveBtnContent`.
    overflow: 'hidden',
    backgroundColor: colors.surfie,
  },
  saveBtnContent: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.lg, gap: spacing.sm,
  },
  saveBtnPressed: { opacity: 0.88 },
  saveBtnText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md, fontWeight: '700', color: colors.white,
    flex: 1, textAlign: 'center',
  },
  saveBtnCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  /* bottom sheet */
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card,
    padding: spacing.xl, paddingBottom: spacing.xxxl,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.surface.line, alignSelf: 'center', marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg, fontWeight: '700', color: colors.ink,
    marginBottom: spacing.lg, textAlign: 'center',
  },
  sheetOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.surface.line, paddingHorizontal: spacing.xs,
  },
  sheetOptionActive: { backgroundColor: colors.surface.mintSoft },
  sheetOptionText: {
    fontFamily: typography.body.family, fontSize: typography.size.md, color: colors.ink,
  },
  sheetOptionTextActive: { color: colors.surfie, fontWeight: '700' },
  sheetConfirm: {
    marginTop: spacing.xl, height: 50, borderRadius: radius.input,
    backgroundColor: colors.surfie, alignItems: 'center', justifyContent: 'center',
  },
  sheetConfirmText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md, fontWeight: '700', color: colors.white,
  },

  /* time picker columns */
  pickerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  pickerColon: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl, fontWeight: '700', color: colors.ink, marginTop: spacing.xxxl,
  },
  pickerCol: { flex: 1, alignItems: 'center' },
  pickerColLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.inkMuted, marginBottom: spacing.sm,
  },
  pickerScroll: { maxHeight: 160 },
  pickerItem: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.md, width: '100%', alignItems: 'center',
  },
  pickerItemActive: { backgroundColor: colors.surface.selected },
  pickerItemText: {
    fontFamily: typography.body.family, fontSize: typography.size.md, color: colors.inkMuted,
  },
  pickerItemTextActive: { color: colors.surfie, fontWeight: '700' },

  /* overflow menu */
  menuBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center',
  },
  menuCard: {
    backgroundColor: colors.white, borderRadius: radius.card, width: 220, overflow: 'hidden',
    ...shadow.card,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  menuItemText: {
    fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.ink,
  },
  menuItemDanger: { color: colors.danger },

  /* modal inputs */
  inputLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.inkMuted, marginBottom: 4, marginTop: spacing.md,
  },
  textInput: {
    borderWidth: 1, borderColor: colors.surface.inputBorder, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.ink,
    minHeight: 44,
  },
  modalError: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.danger, marginTop: spacing.sm,
  },
});

export default AvailabilityScreen;
