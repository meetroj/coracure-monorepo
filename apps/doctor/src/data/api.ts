import { appointments, cases, doctor, todaySummary, nextAppointment, clinicalTasks, followUpAlerts, earnings, feedback, reviews } from './doctor';

/**
 * The seam between the screens and wherever data actually comes from.
 *
 * Today every function resolves a fixture after a short delay, which is enough
 * for the loading rules in `useResource` to be real rather than theoretical.
 * When the backend lands, only the bodies here change — no screen edits, and
 * the skeleton/cache/retry behaviour already works.
 *
 * `LATENCY` is deliberately above SKELETON_DELAY_MS so skeletons are visible
 * in development. Set it to 0 in a test to exercise the no-flash path.
 */
export let LATENCY = 700;

/** Test seam: control or remove the simulated delay. */
export const setLatency = (ms: number) => {
  LATENCY = ms;
};

/** Forced failure, for exercising the error + retry path. */
const failNext = new Set<string>();
export const failOnce = (key: string) => failNext.add(key);
export const clearFailures = () => failNext.clear();

const respond = <T,>(key: string, value: T): Promise<T> =>
  new Promise((resolve, reject) => {
    const done = () => {
      if (failNext.has(key)) {
        failNext.delete(key);
        reject(new Error(`Failed to load ${key}`));
        return;
      }
      resolve(value);
    };
    if (LATENCY <= 0) {
      done();
      return;
    }
    setTimeout(done, LATENCY);
  });

/* --------------------------------- keys ----------------------------------- */

/**
 * Cache keys are values, not inline strings, so a screen and its prefetch can
 * never disagree about which entry they are sharing.
 */
export const KEYS = {
  profile: 'doctor.profile',
  summary: 'dashboard.summary',
  nextAppointment: 'dashboard.nextAppointment',
  workload: 'dashboard.workload',
  earnings: 'dashboard.earnings',
  feedback: 'dashboard.feedback',
  appointments: (bucket: string) => `appointments.${bucket}`,
  cases: 'cases.list',
  reviews: 'reviews.list',
} as const;

/* -------------------------------- fetchers -------------------------------- */

export const fetchProfile = () => respond(KEYS.profile, doctor);

export const fetchSummary = () => respond(KEYS.summary, todaySummary);

export const fetchNextAppointment = () => respond(KEYS.nextAppointment, nextAppointment);

export const fetchWorkload = () =>
  respond(KEYS.workload, { tasks: clinicalTasks, alerts: followUpAlerts });

export const fetchEarnings = () => respond(KEYS.earnings, earnings);

export const fetchFeedback = () => respond(KEYS.feedback, feedback);

export const fetchAppointments = (bucket: 'today' | 'upcoming' | 'past') =>
  respond(
    KEYS.appointments(bucket),
    appointments.filter((a) => a.bucket === bucket)
  );

export const fetchCases = () => respond(KEYS.cases, cases);

export const fetchReviews = () => respond(KEYS.reviews, reviews);
