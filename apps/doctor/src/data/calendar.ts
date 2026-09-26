/**
 * The demo calendar.
 *
 * Dates follow the device, so "today" in the app is always today. The time of
 * day is pinned to a demo clock instead: the schedule, countdowns and "x ago"
 * labels are authored against it, so they agree with each other whenever the
 * app is opened.
 */

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Test seam: an ISO date that pins "today", so specs that assert dates are
 * reproducible on any day they run. Never set in the app.
 */
const pinned = (globalThis as { __CORACURE_TODAY__?: string }).__CORACURE_TODAY__;

export const TODAY = pinned
  ? (() => {
      const [y, m, d] = pinned.split('-').map(Number);
      return new Date(y, m - 1, d);
    })()
  : startOfDay(new Date());

/** Minutes past midnight on the demo clock (11:45 AM). */
export const DEMO_NOW_MINUTES = 11 * 60 + 45;

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const dayOffset = (days: number) =>
  new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + days);

export const daysBetween = (from: Date, to: Date) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);

/** "15 May" */
export const fmtDayMonth = (d: Date) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
/** "15 May 2026" */
export const fmtDate = (d: Date) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
/** "15 May 2026" with the full month name */
export const fmtLongDate = (d: Date) => `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
/** "Fri, 24 May" */
export const fmtWeekday = (d: Date) => `${WEEKDAYS_SHORT[d.getDay()]}, ${fmtDayMonth(d)}`;
/** "May 2026" */
export const fmtMonthYear = (d: Date) => `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;

/** Today / Yesterday / Tomorrow, otherwise "Fri, 24 May". */
export const relativeDay = (d: Date) => {
  const diff = daysBetween(TODAY, d);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return fmtWeekday(d);
};

const pad2 = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const fromISODate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * A strict `YYYY-MM-DD` check. `new Date` rolls 30 February over into March,
 * so the parts are compared after construction rather than trusted.
 */
export const isValidISODate = (iso: string) => {
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
};

/** Whole days from today to an ISO date; negative in the past. */
export const daysFromToday = (iso: string) => daysBetween(TODAY, fromISODate(iso));

/** "09:30 AM" → minutes past midnight, or NaN when malformed. */
export const clockToMinutes = (v: string) => {
  const m = v.trim().match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/i);
  if (!m) return NaN;
  return ((Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(m[2]);
};

/** Minutes past midnight → "09:30 AM". */
export const minutesToClock = (mins: number) => {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${pad2(h12)}:${pad2(m)} ${period}`;
};

/** A duration in minutes as "3d 4h", "5h 20m" or "12m". */
export const fmtElapsed = (mins: number) => {
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest ? `${days}d ${rest}h` : `${days}d`;
};

/** Minutes between a demo-clock moment and now. Positive when in the past. */
export const minutesAgo = (dayOffsetFromToday: number, minutesPastMidnight: number) =>
  -dayOffsetFromToday * 24 * 60 + (DEMO_NOW_MINUTES - minutesPastMidnight);

/** "10 minutes ago", "3 hours ago", "Yesterday", "4 days ago". */
export const fmtAgo = (mins: number) => {
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${Math.round(mins)} minute${Math.round(mins) === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

/** Short form of `fmtAgo` for tight rows: "10 min ago", "3 hr ago". */
export const fmtAgoShort = (mins: number) => {
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${Math.round(mins)} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

/** "Today, 10:24 AM" / "Yesterday, 7:48 PM" / "Fri, 24 May, 9:10 AM". */
export const fmtDayTime = (dayOffsetFromToday: number, minutesPastMidnight: number) =>
  `${relativeDay(dayOffset(dayOffsetFromToday))}, ${minutesToClock(minutesPastMidnight).replace(/^0/, '')}`;
