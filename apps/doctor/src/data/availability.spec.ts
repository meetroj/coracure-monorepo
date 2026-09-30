import type { AvailabilityRule, Diary } from '@coracure/api';

import { toAvailabilityState, toLeave, toSchedule, toWeeklyWindows } from './availability';
import type { DaySchedule } from './doctor';

/**
 * The diary, both ways.
 *
 * Every case here is a round trip the screen makes on every save, and the two
 * clocks are where it goes wrong: the API speaks `13:00`, the screen shows
 * `01:00 PM`, and a doctor who loses an afternoon to that finds out when a
 * patient cannot book them.
 */

const rule = (over: Partial<AvailabilityRule>): AvailabilityRule =>
  ({ id: 'r-1', dayOfWeek: null, date: null, startTime: null, endTime: null, channels: ['video'], ...over }) as AvailabilityRule;

const diary = (over: Partial<Diary> = {}): Diary =>
  ({
    doctorId: 'd-1',
    timeZone: 'Asia/Kolkata',
    consultationDurationMinutes: 30,
    bufferMinutes: 10,
    weekly: [],
    blocked: [],
    customHours: [],
    ...over,
  }) as Diary;

/* -------------------------------- inbound --------------------------------- */

test('puts the week in the order the screen reads it, Monday first', () => {
  const schedule = toSchedule([]);

  expect(schedule.map((d) => d.short)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
});

test('a day with no window is a day off — there is no enabled column to read', () => {
  const schedule = toSchedule([rule({ dayOfWeek: 1, startTime: '09:00', endTime: '13:00' })]);

  expect(schedule.find((d) => d.short === 'Mon')).toMatchObject({ enabled: true });
  // The ABSENCE of rules is the answer. A stored flag would drift from it.
  expect(schedule.find((d) => d.short === 'Tue')).toMatchObject({ enabled: false, ranges: [] });
});

test('converts 24-hour times to the clock the doctor reads', () => {
  const schedule = toSchedule([
    rule({ dayOfWeek: 1, startTime: '09:00', endTime: '13:00' }),
    rule({ id: 'r-2', dayOfWeek: 1, startTime: '16:00', endTime: '19:30' }),
  ]);

  expect(schedule.find((d) => d.short === 'Mon')!.ranges).toEqual([
    { from: '09:00 AM', to: '01:00 PM' },
    { from: '04:00 PM', to: '07:30 PM' },
  ]);
});

test('orders a day’s windows by start time, whatever order they arrived in', () => {
  const schedule = toSchedule([
    rule({ id: 'b', dayOfWeek: 3, startTime: '16:00', endTime: '19:00' }),
    rule({ id: 'a', dayOfWeek: 3, startTime: '09:00', endTime: '13:00' }),
  ]);

  expect(schedule.find((d) => d.short === 'Wed')!.ranges[0]!.from).toBe('09:00 AM');
});

test('a blocked day with no times reads as the whole day', () => {
  const leave = toLeave([rule({ date: '2026-06-14' })]);

  // Both times absent is what MEANS the whole day; a window can be booked around.
  expect(leave[0]).toMatchObject({ date: '2026-06-14', reason: 'Full day' });
});

test('a blocked window names the hours it covers', () => {
  const leave = toLeave([rule({ date: '2026-06-14', startTime: '13:00', endTime: '17:00' })]);

  expect(leave[0]!.reason).toBe('01:00 PM – 05:00 PM');
});

test('carries duration and buffer straight through', () => {
  const state = toAvailabilityState(diary({ consultationDurationMinutes: 45, bufferMinutes: 5 }));

  expect(state).toMatchObject({ durationMin: 45, bufferMin: 5 });
});

/* -------------------------------- outbound -------------------------------- */

const day = (over: Partial<DaySchedule>): DaySchedule =>
  ({ day: 'Monday', short: 'Mon', enabled: true, ranges: [], modes: ['video'], ...over }) as DaySchedule;

test('sends every window of every enabled day, because the server replaces the lot', () => {
  const windows = toWeeklyWindows([
    day({ ranges: [{ from: '09:00 AM', to: '01:00 PM' }, { from: '04:00 PM', to: '07:00 PM' }] }),
    day({ day: 'Wednesday', short: 'Wed', ranges: [{ from: '10:00 AM', to: '02:00 PM' }] }),
  ]);

  expect(windows).toHaveLength(3);
  expect(windows[0]).toMatchObject({ dayOfWeek: 1, startTime: '09:00', endTime: '13:00' });
  expect(windows[2]).toMatchObject({ dayOfWeek: 3, startTime: '10:00', endTime: '14:00' });
});

test('a disabled day contributes nothing — that is how it is switched off', () => {
  const windows = toWeeklyWindows([
    day({ enabled: false, ranges: [{ from: '09:00 AM', to: '01:00 PM' }] }),
  ]);

  // The replace drops every window it does not receive, so an off day is an
  // absence rather than a flag.
  expect(windows).toEqual([]);
});

test('drops in-person, which is out of scope and refused by the API', () => {
  const windows = toWeeklyWindows([
    day({ ranges: [{ from: '09:00 AM', to: '01:00 PM' }], modes: ['video', 'audio', 'inPerson'] }),
  ]);

  expect(windows[0]!.channels).toEqual(['video', 'audio']);
});

test('survives a round trip without moving an hour', () => {
  const original = [
    rule({ dayOfWeek: 1, startTime: '09:30', endTime: '13:30' }),
    rule({ id: 'r-2', dayOfWeek: 5, startTime: '12:00', endTime: '18:00' }),
  ];

  const back = toWeeklyWindows(toSchedule(original));

  // 12:00 is noon. The classic failure here turns it into midnight.
  expect(back).toEqual([
    expect.objectContaining({ dayOfWeek: 1, startTime: '09:30', endTime: '13:30' }),
    expect.objectContaining({ dayOfWeek: 5, startTime: '12:00', endTime: '18:00' }),
  ]);
});
