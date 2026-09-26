import { appointments, reviews } from './doctor';

/**
 * The seam between the screens and wherever data actually comes from.
 *
 * Today every function resolves a local fixture. There is no simulated
 * network delay: waiting on data that is already on the device would only
 * slow the demo down, and a spinner that exists for show is its own kind of
 * dishonesty. `setLatency` stays as a test seam so the loading, skeleton and
 * error paths in `useResource` can still be exercised. When the backend lands,
 * only the bodies here change.
 */
export let LATENCY = 0;

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
  appointments: (bucket: string) => `appointments.${bucket}`,
  reviews: 'reviews.list',
} as const;

/* -------------------------------- fetchers -------------------------------- */

export const fetchAppointments = (bucket: 'today' | 'upcoming' | 'past') =>
  respond(
    KEYS.appointments(bucket),
    appointments.filter((a) => a.bucket === bucket)
  );

export const fetchReviews = () => respond(KEYS.reviews, reviews);
