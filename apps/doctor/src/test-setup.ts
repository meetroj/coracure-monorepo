/**
 * Pins "today" before any module reads the calendar, so every spec that
 * asserts a date is reproducible on whatever day it runs. The app never sets
 * this; `data/calendar.ts` falls back to the device date.
 */
(globalThis as { __CORACURE_TODAY__?: string }).__CORACURE_TODAY__ = '2026-05-15';
/** Same for the time of day: the fixtures' schedule is authored against 11:45 AM. */
(globalThis as { __CORACURE_NOW_MINUTES__?: number }).__CORACURE_NOW_MINUTES__ = 11 * 60 + 45;

/**
 * Safe-area insets come from a native module, which does not exist under Jest.
 * The library ships a mock that returns a realistic inset frame so layout code
 * reading `useSafeAreaInsets()` behaves the same way it does on device.
 */
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

/**
 * LiveKit is native too: there is no WebRTC module to load under Jest, and no
 * spec may open a real room. The consultation room only reaches for these on a
 * real consultation (a UUID id), which the fixtures are not, so the stand-ins
 * do nothing. `data/videoCall.spec` replaces them with a room it can drive.
 */
jest.mock('livekit-client', () => ({ Room: class {}, RoomEvent: {}, ConnectionState: {}, Track: { Source: {} } }));
jest.mock('@livekit/react-native', () => ({ AudioSession: {}, VideoTrack: () => null }));
jest.mock('@livekit/react-native-webrtc', () => ({ permissions: {} }));

/**
 * Every spec starts from the same world: fresh store, no simulated latency,
 * instant uploads, and a warm resource cache — on device the lists load from
 * a fixture on the first frame, and a spec that wants the loading path calls
 * `__resetResourceCache()` and drives it itself (as `useResource.spec` does).
 *
 * Confirmations go through `components/confirm`, not `Alert.alert`. The spy
 * presses the confirm button — the action the dialog asks about — so a spec
 * exercises what happens after the doctor agrees. A spec that needs the cancel
 * path overrides it with `mockImplementationOnce`:
 *
 *     (confirm as jest.Mock).mockImplementationOnce((o) => o.onCancel?.());
 *
 * `confirmDiscard` is spied separately because it calls `confirm` through its
 * own module-local binding, which a spy on `confirm` cannot intercept. Assert
 * on whichever one the screen actually calls.
 */
beforeEach(() => {
  const { Alert } = require('react-native');
  const confirmModule = require('./components/confirm');

  jest
    .spyOn(confirmModule, 'confirm')
    .mockImplementation((options: { onConfirm: () => void }) => options.onConfirm());
  jest
    .spyOn(confirmModule, 'confirmDiscard')
    .mockImplementation((onDiscard: () => void) => onDiscard());

  const { resetStore } = require('./state/store');
  const { KEYS: FEEDBACK_KEYS } = require('./data/feedback');
  const { __resetResourceCache, seedResource } = require('./data/useResource');
  const { uploadConfig } = require('./components/upload');
  const { tapGuard } = require('./components/ui');
  const { appointments } = require('./data/doctor');
  const { clinicalTemplates } = require('./data/clinical');


  // The app opens on the intro carousel; specs start from sign-in.
  //
  // `appointments` is seeded here because the store no longer ships with sample
  // patients — on a device it is empty until the backend answers. A spec that
  // wants the empty state sets it back to [].
  // The sample threads, cases and tickets likewise — see test/fixtures.ts.
  const { demoFixtures, sampleFeedback } = require('./test/fixtures');
  resetStore({
    session: { stage: 'login', mobile: '' },
    appointments,
    // The store ships with no templates; they come from the backend. Specs get the sample set.
    templates: clinicalTemplates.map((t: object) => ({ ...t })),
    ...demoFixtures(),
  });
  __resetResourceCache();
  // Patient feedback comes from the backend; specs get a sample answer rather than a network call.
  seedResource(FEEDBACK_KEYS.feedback, sampleFeedback);
  seedResource('doctor:clinical-templates', clinicalTemplates);
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
