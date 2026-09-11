import { search as runSearch, type ServiceMatch } from './search';

/**
 * *** GAP G-1 — THERE IS NO PATIENT-FACING SLOT LOOKUP. ***
 *
 * `USER_STORIES.md` §3, gap G-1, against story PT-07-01:
 *
 *   "No patient-facing slot lookup. `GET /v1/me/doctor/slots` is the provider's
 *    own diary and `GET /v1/admin/doctors/:doctorId/slots` is admin-scoped. The
 *    patient app needs coverable times for a *service*, not a person —
 *    otherwise the time picker is guesswork corrected by a booking refusal."
 *
 * This module is that gap, isolated behind one interface, so the day the
 * endpoint lands the change is confined to `fetchServiceSlots` and nothing that
 * calls it moves.
 *
 * *** WHAT THIS DOES NOT DO. *** It does not invent
 * `GET /v1/services/:id/slots` and pretend to call it. Nothing here fabricates
 * availability it was not told about. What it does instead:
 *
 * 1. `POST /v1/search` genuinely returns `soonestAvailableAt` PER SERVICE — the
 *    soonest the POOL can cover it. That is one real, authoritative data point
 *    and it is used as the floor: nothing earlier than it is ever offered.
 * 2. Everything after that floor is a CANDIDATE, and `SlotSource` says so, so
 *    the UI can label it honestly rather than presenting guesses as availability.
 * 3. `POST /v1/me/consultations` remains the authority. A candidate that cannot
 *    be covered comes back as `NO_PROVIDER_AVAILABLE` carrying the soonest time
 *    that can be, and the picker corrects itself from that.
 *
 * PT-07-01 requires the picker to show times the pool can cover FOR THE FULL
 * CONSULTATION DURATION, not merely times somebody starts free. Until the
 * endpoint exists the client cannot know the duration the pool has free, so
 * `durationMinutes` is carried through and candidates are spaced by it — a
 * best-effort that at least never offers two starts closer together than one
 * consultation.
 */

export type SlotSource =
  /** A real coverable time the backend told us about. */
  | 'confirmed'
  /** Generated client-side. Availability is confirmed at booking. See G-1. */
  | 'candidate';

export type Slot = {
  /** ISO start. */
  startsAt: string;
  durationMinutes: number;
  source: SlotSource;
};

export type ServiceSlotQuery = {
  specialtyId: string;
  /** Local calendar day to list, as `YYYY-MM-DD`. */
  date: string;
  /** The consultation length to reserve. Defaults to 30 where unknown. */
  durationMinutes?: number;
};

export type ServiceSlots = {
  slots: Slot[];
  /**
   * The soonest the pool can cover this service at all, from search. Null when
   * we were not able to establish one — the UI must then say availability is
   * confirmed at booking rather than implying it knows.
   */
  soonestAvailableAt: string | null;
  /**
   * True while G-1 is open. The UI reads this to label candidate times
   * honestly. When the real endpoint lands this becomes false and the copy
   * changes with it — nothing else has to.
   */
  isEstimated: boolean;
};

/** Clinic hours the candidates are generated within. */
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 21;
const DEFAULT_DURATION_MINUTES = 30;
/** A start closer than this to now is not worth offering. */
const LEAD_TIME_MS = 15 * 60_000;

const startOfLocalDay = (date: string): Date => {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date();
  dt.setFullYear(y ?? dt.getFullYear(), (m ?? 1) - 1, d ?? 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

/** `YYYY-MM-DD` for a Date, in LOCAL time — not `toISOString`, which is UTC. */
export const toLocalDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * The one call the time picker makes.
 *
 * *** REPLACE THE BODY OF THIS FUNCTION WHEN G-1 IS CLOSED. *** The signature
 * and the return shape are already what a real endpoint would give, so the
 * change is:
 *
 *   const res = await api.get<ServiceSlots>(`/services/${specialtyId}/slots`, {
 *     query: { date, durationMinutes },
 *   });
 *   return { ...res, isEstimated: false };
 *
 * and every caller keeps working, with candidate labelling switching itself off.
 */
export const fetchServiceSlots = async (
  query: ServiceSlotQuery,
  /** Injected in tests; also lets a caller reuse a search it already ran. */
  soonestHint?: string | null,
): Promise<ServiceSlots> => {
  const duration = query.durationMinutes ?? DEFAULT_DURATION_MINUTES;

  let soonest = soonestHint ?? null;
  if (soonest === undefined || soonest === null) {
    soonest = await soonestForService(query.specialtyId);
  }

  const dayStart = startOfLocalDay(query.date);
  const now = Date.now();
  // Nothing before the pool's own soonest coverable time is ever offered.
  const floor = Math.max(
    now + LEAD_TIME_MS,
    soonest ? new Date(soonest).getTime() : 0,
  );

  const slots: Slot[] = [];
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h += 1) {
    for (let m = 0; m < 60; m += duration) {
      if (m >= 60) break;
      const t = new Date(dayStart);
      t.setHours(h, m, 0, 0);
      // The whole consultation has to finish inside clinic hours.
      const endsAt = t.getTime() + duration * 60_000;
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(DAY_END_HOUR, 0, 0, 0);
      if (endsAt > dayEnd.getTime()) continue;
      if (t.getTime() < floor) continue;

      slots.push({
        startsAt: t.toISOString(),
        durationMinutes: duration,
        // The pool's own soonest time is the one slot we were actually told
        // about; everything else is a candidate.
        source:
          soonest && Math.abs(t.getTime() - new Date(soonest).getTime()) < 60_000
            ? 'confirmed'
            : 'candidate',
      });
    }
  }

  return { slots, soonestAvailableAt: soonest, isEstimated: true };
};

/**
 * The soonest the pool can cover one service, read out of a real search.
 *
 * `POST /v1/search` is the only patient-facing call that reports pool coverage,
 * and it reports it per service. Searching by the service's own name is a
 * workaround, not a contract — it is here rather than in the screen so there is
 * exactly one place to delete when G-1 closes.
 */
export const soonestForService = async (specialtyId: string): Promise<string | null> => {
  try {
    const response = await runSearch(specialtyId);
    // A crisis response carries guidance and no results — there is nothing to
    // read a coverable time from, and the caller must not be shown a picker.
    if (response.crisis === true) return null;
    const results: ServiceMatch[] = response.results;
    const match = results.find((r) => r.id === specialtyId);
    return match?.soonestAvailableAt ?? null;
  } catch {
    // A failed lookup must not block the picker. Without a floor the UI simply
    // says availability is confirmed at booking, which is the honest fallback.
    return null;
  }
};
