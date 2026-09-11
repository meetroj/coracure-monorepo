/**
 * Safe-area insets come from a native module, which does not exist under Jest.
 * The library ships a mock that returns a realistic inset frame so layout code
 * reading `useSafeAreaInsets()` behaves the same way it does on device.
 *
 * Matchers come from @testing-library/react-native 13, which registers them
 * itself — there is no `extend-expect` entry point any more.
 */
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);
