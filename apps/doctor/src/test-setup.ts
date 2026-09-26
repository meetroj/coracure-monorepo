/**
 * Pins "today" before any module reads the calendar, so every spec that
 * asserts a date is reproducible on whatever day it runs. The app never sets
 * this; `data/calendar.ts` falls back to the device date.
 */
(globalThis as { __CORACURE_TODAY__?: string }).__CORACURE_TODAY__ = '2026-05-15';

/**
 * Safe-area insets come from a native module, which does not exist under Jest.
 * The library ships a mock that returns a realistic inset frame so layout code
 * reading `useSafeAreaInsets()` behaves the same way it does on device.
 */
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

/**
 * Every spec starts from the same world: fresh store, no simulated latency,
 * instant uploads, and a warm resource cache — on device the lists load from
 * a fixture on the first frame, and a spec that wants the loading path calls
 * `__resetResourceCache()` and drives it itself (as `useResource.spec` does).
 *
 * Confirmation dialogs are native `Alert`s, which never call back under Jest.
 * The spy presses the non-cancel button — the action the dialog asks about —
 * so a spec exercises what happens after the doctor confirms. A spec that
 * needs the cancel path overrides it with `mockImplementationOnce`.
 */
beforeEach(() => {
  const { Alert } = require('react-native');
  const { resetStore } = require('./state/store');
  const { KEYS, setLatency, clearFailures } = require('./data/api');
  const { __resetResourceCache, seedResource } = require('./data/useResource');
  const { uploadConfig } = require('./components/upload');
  const { tapGuard } = require('./components/ui');
  const { appointments, reviews } = require('./data/doctor');

  resetStore();
  setLatency(0);
  clearFailures();
  __resetResourceCache();
  (['today', 'upcoming', 'past'] as const).forEach((b) =>
    seedResource(
      KEYS.appointments(b),
      appointments.filter((a: { bucket: string }) => a.bucket === b)
    )
  );
  seedResource(KEYS.reviews, reviews);
  uploadConfig.durationMs = 0;
  tapGuard.ms = 0;

  jest
    .spyOn(Alert, 'alert')
    .mockImplementation((_title: string, _message?: string, buttons?: { text?: string; style?: string; onPress?: () => void }[]) => {
      const action = buttons?.find((b) => b.style !== 'cancel') ?? buttons?.[0];
      action?.onPress?.();
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});
