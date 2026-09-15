/**
 * Safe-area insets come from a native module, which does not exist under Jest.
 * The library ships a mock that returns a realistic inset frame so layout code
 * reading `useSafeAreaInsets()` behaves the same way it does on device.
 */
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

/**
 * Screens that load through `useResource` are asynchronous on device. Under
 * Jest we start with a warm cache instead, so a render shows data on the first
 * frame — exactly the "cached data renders immediately" path, not a stub.
 *
 * A test that wants to exercise loading calls `__resetResourceCache()` first
 * and drives the timers itself; `useResource.spec.tsx` does precisely that.
 */
beforeEach(() => {
  const { seedResource } = require('./data/useResource');
  const { KEYS, setLatency } = require('./data/api');
  const d = require('./data/doctor');

  setLatency(0);
  seedResource(KEYS.profile, d.doctor);
  seedResource(KEYS.summary, d.todaySummary);
  seedResource(KEYS.nextAppointment, d.nextAppointment);
  seedResource(KEYS.workload, { tasks: d.clinicalTasks, alerts: d.followUpAlerts });
  seedResource(KEYS.earnings, d.earnings);
  seedResource(KEYS.feedback, d.feedback);
  seedResource(KEYS.cases, d.cases);
  seedResource(KEYS.reviews, d.reviews);
  (['today', 'upcoming', 'past'] as const).forEach((b) =>
    seedResource(
      KEYS.appointments(b),
      d.appointments.filter((a: { bucket: string }) => a.bucket === b)
    )
  );
});
