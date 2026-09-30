import { api } from '../http';

/**
 * The doctor's diary (API_CONTRACT §7.3) — what the assignment engine books
 * against.
 *
 * *** THE WEEKLY PATTERN IS A REPLACE, NOT A PATCH. *** `PUT
 * /me/doctor/availability/weekly` takes every window there is and the rest are
 * deleted. Sending only the day that changed silently clears the other six —
 * which reads to the pool as a doctor who has gone dark, and to the doctor as
 * nothing at all until a patient cannot book them.
 *
 * Blocked days and custom hours are the opposite: each is its own row, created
 * and deleted one at a time, because "I am away on the 14th" is a fact with a
 * lifetime of its own.
 */

export type ConsultationChannel = 'video' | 'audio';

export type AvailabilityRule = {
  id: string;
  /** 0 Sunday … 6 Saturday. Set only on a weekly rule. */
  dayOfWeek: number | null;
  /** `YYYY-MM-DD`. Set only on a blocked day or custom hours. */
  date: string | null;
  /** `HH:MM`, 24h, in the platform's own time zone — NOT the device's. */
  startTime: string | null;
  endTime: string | null;
  channels: ConsultationChannel[];
};

export type Diary = {
  doctorId: string;
  /**
   * The platform's time zone, which is what every `startTime` is in. A device
   * in another zone must not reinterpret them: 09:00 means 09:00 to the
   * patients being booked, not 09:00 wherever the doctor is standing.
   */
  timeZone: string;
  consultationDurationMinutes: number;
  bufferMinutes: number;
  weekly: AvailabilityRule[];
  blocked: AvailabilityRule[];
  customHours: AvailabilityRule[];
};

export type WeeklyWindow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  channels?: ConsultationChannel[];
};

export type DatedWindow = {
  date: string;
  /** Both omitted on a blocked day means the WHOLE day is off. */
  startTime?: string;
  endTime?: string;
  channels?: ConsultationChannel[];
};

export type Slot = { startsAt: string; endsAt: string; durationMinutes: number };

export const getDiary = (): Promise<Diary> => api.get<Diary>('/me/doctor/availability');

/** Replaces every weekly window. Send the whole pattern, never a delta. */
export const replaceWeekly = (windows: WeeklyWindow[]): Promise<Diary> =>
  api.put<Diary>('/me/doctor/availability/weekly', {
    windows: windows.map((w) => ({
      dayOfWeek: w.dayOfWeek,
      startTime: w.startTime,
      endTime: w.endTime,
      ...(w.channels ? { channels: w.channels } : {}),
    })),
  });

/** A day, or part of one, taken out of the pool. */
export const blockDate = (input: DatedWindow): Promise<AvailabilityRule> =>
  api.post<AvailabilityRule>('/me/doctor/availability/blocked', {
    date: input.date,
    ...(input.startTime ? { startTime: input.startTime } : {}),
    ...(input.endTime ? { endTime: input.endTime } : {}),
    ...(input.channels ? { channels: input.channels } : {}),
  });

/** Different hours for one date, replacing the weekly pattern that day. */
export const setCustomHours = (input: DatedWindow & { startTime: string; endTime: string }): Promise<AvailabilityRule> =>
  api.post<AvailabilityRule>('/me/doctor/availability/custom-hours', {
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    ...(input.channels ? { channels: input.channels } : {}),
  });

/**
 * Removes one rule. A rule that no longer applies is DELETED, not deactivated —
 * a diary is a statement about now, and who changed it is the audit entry.
 */
export const removeRule = (ruleId: string): Promise<void> =>
  api.delete<void>(`/me/doctor/availability/${ruleId}`);

/**
 * What the rules actually add up to, minus what is already booked.
 *
 * This is the doctor's own diary, not a patient-facing lookup — it is how a
 * doctor checks that the pattern they just saved produces the slots they
 * expected, which is the only way to catch a window that a buffer swallowed.
 */
export const getSlots = (from: string, to: string): Promise<Slot[]> =>
  api.get<Slot[]>('/me/doctor/slots', { query: { from, to } });
