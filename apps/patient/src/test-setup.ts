import { configure } from '@testing-library/react-native';
/**
 * Safe-area insets come from a native module, which does not exist under Jest.
 * The library ships a mock that returns a realistic inset frame so layout code
 * reading `useSafeAreaInsets()` behaves the same way it does on device.
 */
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

/**
 * No test may reach the network. Anything that tries fails loudly here rather
 * than hanging for the client's 20s timeout, and each spec installs the
 * responses it expects.
 */
global.fetch = jest.fn(() =>
  Promise.reject(new Error('fetch was not mocked for this test')),
) as unknown as typeof fetch;

// The flow specs render several screens with mocked round trips each; the
// 1s default is too tight when Jest runs suites in parallel on a busy machine.
configure({ asyncUtilTimeout: 5000 });
