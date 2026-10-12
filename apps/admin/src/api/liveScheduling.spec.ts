import { describe, expect, it } from 'vitest';

import {
  assignableFrom,
  blockBody,
  customHoursBody,
  dayBounds,
  remainingParams,
  rulesFromDiary,
  weeklyBody,
  type LiveDiary,
} from './liveScheduling';

/** The panel's side of the diary and coverage contract. No network. */

const rule = (over: Partial<{ id: string; dayOfWeek: number | null; date: string | null; startTime: string | null; endTime: string | null }> = {}) => ({
  id: 'r1',
  dayOfWeek: null,
  date: null,
  startTime: null,
  endTime: null,
  ...over,
});

describe('rulesFromDiary', () => {
  it('flattens the three lists into one, each tagged with its type', () => {
    const diary: LiveDiary = {
      doctorId: 'd1',
      timeZone: 'Asia/Kolkata',
      consultationDurationMinutes: 20,
      bufferMinutes: 5,
      weekly: [rule({ id: 'w1', dayOfWeek: 1, startTime: '09:00', endTime: '13:00' })],
      blocked: [rule({ id: 'b1', date: '2026-10-20' })],
      customHours: [rule({ id: 'c1', date: '2026-10-21', startTime: '10:00', endTime: '12:00' })],
    };
    expect(rulesFromDiary(diary)).toEqual([
      { id: 'w1', ruleType: 'weekly', dayOfWeek: 1, date: null, startTime: '09:00', endTime: '13:00' },
      { id: 'b1', ruleType: 'blocked', dayOfWeek: null, date: '2026-10-20', startTime: null, endTime: null },
      { id: 'c1', ruleType: 'custom_hours', dayOfWeek: null, date: '2026-10-21', startTime: '10:00', endTime: '12:00' },
    ]);
  });
});

describe('request bodies', () => {
  it('replaces the weekly pattern with only the fields the window DTO takes', () => {
    expect(weeklyBody([{ dayOfWeek: 2, startTime: '09:00', endTime: '12:00', extra: 'x' } as never])).toEqual({
      windows: [{ dayOfWeek: 2, startTime: '09:00', endTime: '12:00' }],
    });
    expect(weeklyBody([])).toEqual({ windows: [] });
  });

  it('blocks a whole day with the date alone, a part of a day with both times, and never one time', () => {
    expect(blockBody({ date: '2026-10-20' })).toEqual({ date: '2026-10-20' });
    expect(blockBody({ date: '2026-10-20', startTime: '13:00', endTime: '15:00' })).toEqual({
      date: '2026-10-20',
      startTime: '13:00',
      endTime: '15:00',
    });
    expect(blockBody({ date: '2026-10-20', startTime: '13:00' })).toEqual({ date: '2026-10-20' });
  });

  it('overrides one date with exactly three fields', () => {
    expect(customHoursBody({ date: '2026-10-21', startTime: '10:00', endTime: '12:00' })).toEqual({
      date: '2026-10-21',
      startTime: '10:00',
      endTime: '12:00',
    });
  });
});

describe('dayBounds', () => {
  it('is the Indian day: it starts at 18:30 UTC the evening before and lasts 24 hours', () => {
    expect(dayBounds('2026-10-14')).toEqual({ from: '2026-10-13T18:30:00.000Z', to: '2026-10-14T18:30:00.000Z' });
  });

  it('refuses something that is not a date', () => {
    expect(() => dayBounds('')).toThrow(/date/);
    expect(() => dayBounds('14/10/2026')).toThrow(/date/);
  });
});

describe('the coverage lookup', () => {
  it('builds the query: the time as an instant, the language as its code, blanks left out', () => {
    const p = remainingParams({ serviceId: 'sp-1', language: 'Hindi', regionId: '', at: '2026-10-14T09:30' });
    expect(p.specialtyId).toBe('sp-1');
    expect(p.language).toBe('hi');
    expect(p.regionId).toBeUndefined();
    expect(p.at).toBe(new Date('2026-10-14T09:30').toISOString());
  });

  it('needs a moment, and one language the platform has', () => {
    expect(() => remainingParams({ at: '' })).toThrow(/date and time/);
    expect(() => remainingParams({ at: '2026-10-14T09:30', language: 'Klingon' })).toThrow(/language/);
    expect(() => remainingParams({ at: '2026-10-14T09:30', language: 'English, Hindi' })).toThrow(/one language/);
  });

  it('says why a provider who looks free is not assignable', () => {
    const base = { doctorId: 'd1', fullName: 'Dr A', requiredMinutes: 25 };
    expect(assignableFrom({ ...base, availableMinutes: 40, assignable: true })).toMatchObject({
      assignable: true,
      remainingMinutes: 40,
      reason: undefined,
    });
    expect(assignableFrom({ ...base, availableMinutes: 15, assignable: false }).reason).toBe('Free for 15 min, needs 25.');
    expect(assignableFrom({ ...base, availableMinutes: 60, assignable: false }).reason).toBe('Not verified and listed.');
  });
});
