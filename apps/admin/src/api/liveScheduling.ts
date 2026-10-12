import { request } from './http';
import { languageCodes } from './liveProviders';
import type { AssignableProvider, AvailabilityRule, Slot } from './types';

/**
 * A provider's diary and the coverage lookup, against the backend:
 * `GET /admin/doctors/:id/availability`, `PUT .../availability/weekly`,
 * `POST .../availability/blocked`, `POST .../availability/custom-hours`,
 * `DELETE .../availability/:ruleId`, `GET .../slots` and
 * `GET /admin/availability/remaining`.
 *
 * Source of truth: `DiaryRecord`, `ReplaceWeeklyPatternDto`, `BlockDateDto`,
 * `CustomHoursDto`, `SlotLookupDto`, `RemainingAvailabilityQueryDto` and
 * `RemainingAvailability`. Operations and care coordinator may all of it.
 */

type LiveRule = {
  id: string;
  dayOfWeek: number | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
};

/** `GET /admin/doctors/:id/availability` */
export type LiveDiary = {
  doctorId: string;
  timeZone: string;
  consultationDurationMinutes: number;
  bufferMinutes: number;
  weekly: LiveRule[];
  blocked: LiveRule[];
  customHours: LiveRule[];
};

/** The three lists of a diary as the one flat list the editor works with. */
export function rulesFromDiary(d: LiveDiary): AvailabilityRule[] {
  const as =
    (ruleType: AvailabilityRule['ruleType']) =>
    (r: LiveRule): AvailabilityRule => ({
      id: r.id,
      ruleType,
      dayOfWeek: r.dayOfWeek,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
    });
  return [...d.weekly.map(as('weekly')), ...d.blocked.map(as('blocked')), ...d.customHours.map(as('custom_hours'))];
}

/**
 * The platform runs on Indian Standard Time, which has no daylight saving, so a
 * diary date is a fixed offset from UTC. ponytail: read the diary's `timeZone`
 * and convert with Intl if the platform ever serves a second zone.
 */
const PLATFORM_OFFSET = '+05:30';

/** `YYYY-MM-DD` to the instants that day starts and ends, for `SlotLookupDto`. */
export function dayBounds(date: string): { from: string; to: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Choose a date.');
  const from = new Date(`${date}T00:00:00${PLATFORM_OFFSET}`);
  if (Number.isNaN(from.getTime())) throw new Error('Choose a date.');
  return { from: from.toISOString(), to: new Date(from.getTime() + 86_400_000).toISOString() };
}

export type WeeklyInput = { dayOfWeek: number; startTime: string; endTime: string }[];

/** Field by field: the DTO is whitelisted, and an omitted `channels` means both. */
export const weeklyBody = (rules: WeeklyInput) => ({
  windows: rules.map((r) => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime })),
});

export const blockBody = (input: { date: string; startTime?: string; endTime?: string }) => ({
  date: input.date,
  // Both times, or neither: one alone is a 400.
  ...(input.startTime && input.endTime ? { startTime: input.startTime, endTime: input.endTime } : {}),
});

export const customHoursBody = (input: { date: string; startTime: string; endTime: string }) => ({
  date: input.date,
  startTime: input.startTime,
  endTime: input.endTime,
});

/** `RemainingAvailability` plus the name `remainingAcrossPool` adds. */
type LiveRemaining = {
  doctorId: string;
  fullName: string;
  availableMinutes: number;
  requiredMinutes: number;
  assignable: boolean;
};

export function assignableFrom(r: LiveRemaining): AssignableProvider {
  return {
    doctorId: r.doctorId,
    fullName: r.fullName,
    remainingMinutes: r.availableMinutes,
    requiredMinutes: r.requiredMinutes,
    assignable: r.assignable,
    reason: r.assignable
      ? undefined
      : r.availableMinutes < r.requiredMinutes
        ? `Free for ${r.availableMinutes} min, needs ${r.requiredMinutes}.`
        : 'Not verified and listed.',
  };
}

/** The query for the coverage lookup. `at` is a `datetime-local` value, read in the admin's own clock. */
export function remainingParams(q: {
  serviceId?: string;
  language?: string;
  regionId?: string;
  at?: string;
}): Record<string, string | undefined> {
  const at = q.at ? new Date(q.at) : null;
  if (!at || Number.isNaN(at.getTime())) throw new Error('Pick a date and time.');
  const language = q.language?.trim();
  let code: string | undefined;
  if (language) {
    const { codes, unknown } = languageCodes(language);
    if (unknown.length > 0 || codes.length !== 1) throw new Error('Enter one language the platform has, e.g. English.');
    code = codes[0];
  }
  return {
    at: at.toISOString(),
    specialtyId: q.serviceId || undefined,
    language: code,
    regionId: q.regionId || undefined,
  };
}

const doctorPath = (id: string) => `/admin/doctors/${encodeURIComponent(id)}`;

export const liveScheduling = {
  availability: (doctorId: string) =>
    request<LiveDiary>(`${doctorPath(doctorId)}/availability`).then(rulesFromDiary),

  replaceWeekly: (doctorId: string, rules: WeeklyInput) =>
    request<LiveDiary>(`${doctorPath(doctorId)}/availability/weekly`, { method: 'PUT', body: weeklyBody(rules) }).then(
      rulesFromDiary,
    ),

  block: (doctorId: string, input: { date: string; startTime?: string; endTime?: string }) =>
    request<unknown>(`${doctorPath(doctorId)}/availability/blocked`, { method: 'POST', body: blockBody(input) }),

  customHours: (doctorId: string, input: { date: string; startTime: string; endTime: string }) =>
    request<unknown>(`${doctorPath(doctorId)}/availability/custom-hours`, {
      method: 'POST',
      body: customHoursBody(input),
    }),

  deleteRule: (doctorId: string, ruleId: string) =>
    request<void>(`${doctorPath(doctorId)}/availability/${encodeURIComponent(ruleId)}`, { method: 'DELETE' }),

  slots: async (doctorId: string, date?: string): Promise<Slot[]> => {
    const { from, to } = dayBounds(date ?? new Date().toISOString().slice(0, 10));
    const rows = await request<{ startsAt: string; endsAt: string }[]>(`${doctorPath(doctorId)}/slots`, {
      query: { from, to },
    });
    return rows.map((s) => ({ startsAt: s.startsAt, endsAt: s.endsAt, available: true }));
  },

  remaining: async (q: { serviceId?: string; language?: string; regionId?: string; at?: string }) => {
    const rows = await request<LiveRemaining[]>('/admin/availability/remaining', { query: remainingParams(q) });
    return rows.map(assignableFrom);
  },
};

export type LiveRegion = { id: string; code: string; name: string; isActive: boolean };

/** `GET /admin/regions`: content and operations. */
export const regions = {
  list: () => request<LiveRegion[]>('/admin/regions'),
};
