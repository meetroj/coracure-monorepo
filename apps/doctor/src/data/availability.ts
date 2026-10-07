import { doctorAvailabilityApi } from '@coracure/api';
import type { AvailabilityRule, Diary, WeeklyWindow } from '@coracure/api';

import { useEffect } from 'react';

import { loadAvailability } from '../state/actions';
import { useResource } from './useResource';
import { clockToMinutes, minutesToClock } from './calendar';
import type { ConsultMode, DaySchedule, Leave, ScheduleOverride } from './doctor';
import type { AvailabilityState } from '../state/store';

/**
 * The diary, between the backend's rules and the screen's week.
 *
 * *** TWO CLOCKS. *** The API speaks 24-hour `HH:MM`; the screen shows
 * `09:00 AM`. Every crossing goes through `clockToMinutes` / `minutesToClock`
 * so the conversion exists once — a screen doing its own string surgery is how
 * `12:00 PM` becomes midnight.
 */

const DAYS = [
  { day: 'Sunday', short: 'Sun' },
  { day: 'Monday', short: 'Mon' },
  { day: 'Tuesday', short: 'Tue' },
  { day: 'Wednesday', short: 'Wed' },
  { day: 'Thursday', short: 'Thu' },
  { day: 'Friday', short: 'Fri' },
  { day: 'Saturday', short: 'Sat' },
];

/** The screen lists Monday first; `dayOfWeek` counts from Sunday. */
const SCREEN_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * `13:00` → minutes.
 *
 * NOT `clockToMinutes`, which only parses the SCREEN's `01:00 PM` and returns
 * NaN for anything else — feeding it an API time silently produced `NaN:NaN`
 * and wiped a doctor's whole week on save.
 */
const hhmmToMinutes = (hhmm: string): number => {
  const m = hhmm.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};

const toDisplay = (hhmm: string) => minutesToClock(hhmmToMinutes(hhmm));

/** `09:00 AM` → `09:00`. */
const toApiTime = (display: string): string => {
  const mins = clockToMinutes(display);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
};

export const toSchedule = (weekly: AvailabilityRule[]): DaySchedule[] =>
  SCREEN_ORDER.map((dow) => {
    const rules = weekly
      .filter((r) => r.dayOfWeek === dow)
      .sort((a, b) => hhmmToMinutes(a.startTime ?? '00:00') - hhmmToMinutes(b.startTime ?? '00:00'));
    const channels = new Set<string>();
    rules.forEach((r) => r.channels.forEach((c) => channels.add(c)));
    return {
      day: DAYS[dow]!.day,
      short: DAYS[dow]!.short,
      // A day with no window is a day off. There is no `enabled` column on the
      // backend — the absence of rules IS the answer, so the toggle has to be
      // derived rather than stored, or the two would drift.
      enabled: rules.length > 0,
      ranges: rules.map((r) => ({ from: toDisplay(r.startTime!), to: toDisplay(r.endTime!) })),
      modes: (channels.size ? [...channels] : ['video']) as ConsultMode[],
    };
  });

export const toWeeklyWindows = (schedule: DaySchedule[]): WeeklyWindow[] => {
  const windows: WeeklyWindow[] = [];
  schedule.forEach((day) => {
    // A disabled day contributes NOTHING. That is how it is switched off: the
    // replace drops every window it does not receive.
    if (!day.enabled) return;
    const dow = DAYS.findIndex((d) => d.day === day.day);
    day.ranges.forEach((range) => {
      windows.push({
        dayOfWeek: dow,
        startTime: toApiTime(range.from),
        endTime: toApiTime(range.to),
        // `inPerson` is out of scope for this release and the API refuses it.
        channels: day.modes.filter((m): m is 'video' | 'audio' => m === 'video' || m === 'audio'),
      });
    });
  });
  return windows;
};

/** A blocked rule with no times is the whole day off. */
export const toLeave = (blocked: AvailabilityRule[]): Leave[] =>
  blocked.map((r) => ({
    id: r.id,
    date: r.date!,
    reason: r.startTime && r.endTime ? `${toDisplay(r.startTime)} – ${toDisplay(r.endTime)}` : 'Full day',
  }));

export const toOverrides = (customHours: AvailabilityRule[]): ScheduleOverride[] =>
  customHours.map((r) => ({
    id: r.id,
    date: r.date!,
    from: toDisplay(r.startTime!),
    to: toDisplay(r.endTime!),
  }));

export const toAvailabilityState = (diary: Diary): Omit<AvailabilityState, 'savedAt'> => ({
  schedule: toSchedule(diary.weekly),
  overrides: toOverrides(diary.customHours),
  leave: toLeave(diary.blocked),
  durationMin: diary.consultationDurationMinutes,
  bufferMin: diary.bufferMinutes,
});

export const KEYS = { diary: 'doctor:diary' };

export const fetchDiary = (): Promise<Diary> => doctorAvailabilityApi.getDiary();

/**
 * Saves the week.
 *
 * *** ONE CALL, THE WHOLE PATTERN. *** The screen edits a week and presses
 * save; the backend replaces every window with what it is given. Sending only
 * the changed day would delete the rest.
 *
 * Duration and buffer are NOT here: they live on the profile
 * (`PATCH /me/doctor/profile`) and have their own screens, so sending them from
 * the diary would be two sources for one value.
 */
export const saveWeekly = (schedule: DaySchedule[]): Promise<Diary> =>
  doctorAvailabilityApi.replaceWeekly(toWeeklyWindows(schedule));

/** Loads the diary once, into the store every screen reading availability shares. */
export const useAvailability = () => {
  const resource = useResource(KEYS.diary, fetchDiary);

  useEffect(() => {
    if (resource.data) loadAvailability(toAvailabilityState(resource.data));
  }, [resource.data]);

  return resource;
};

/**
 * A whole day taken out of the pool.
 *
 * The doctor's typed reason has nowhere to live server-side — the API carries
 * no such field — so it stays local to this session; a fresh load reads the
 * day back as "Full day" (`toLeave`), not the words the doctor typed.
 */
export const blockWholeDay = (date: string): Promise<AvailabilityRule> =>
  doctorAvailabilityApi.blockDate({ date });

/** Different hours for one date. Full fidelity: the times round-trip exactly. */
export const setCustomHoursFor = (date: string, from: string, to: string): Promise<ScheduleOverride> =>
  doctorAvailabilityApi
    .setCustomHours({ date, startTime: toApiTime(from), endTime: toApiTime(to) })
    .then((rule) => toOverrides([rule])[0]!);

/** A blocked day or date exception, created one at a time — there is no PATCH, so an edit is remove then recreate. */
export const removeAvailabilityRule = (ruleId: string): Promise<void> => doctorAvailabilityApi.removeRule(ruleId);
