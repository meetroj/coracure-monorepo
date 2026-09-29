import React from 'react';
import { render, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { AuthContext, DEFAULT_SEEDED_PROFILE } from '../auth/AuthContext';
import { configureDemoMode } from '@coracure/api';
import { breakpoint } from '@coracure/brand';
import RootNavigator from '../navigation/RootNavigator';

/**
 * The phone screens must not stretch on a tablet. Every screen renders inside
 * the navigator's column, so capping it there is what makes the app usable on
 * a wide viewport — this checks the cap is applied there and nowhere else.
 */
jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const auth = {
  isAuthenticated: true,
  isNewAccount: false,
  user: DEFAULT_SEEDED_PROFILE,
  isLoading: false,
  signIn: jest.fn(),
  loginAsDemo: jest.fn(),
  signOut: jest.fn(),
  refreshProfile: jest.fn(),
};

const setViewport = (width: number) =>
  (useWindowDimensions as unknown as jest.Mock).mockReturnValue({
    width,
    height: 900,
    scale: 2,
    fontScale: 1,
  });

/** Every maxWidth the navigator applied to any view in the tree. */
const maxWidths = (node: any, found: number[] = []): number[] => {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) {
    node.forEach((n) => maxWidths(n, found));
    return found;
  }
  const style = node.props?.style;
  const flat = Array.isArray(style) ? style : [style];
  flat.forEach((layer: any) => {
    if (layer && typeof layer.maxWidth === 'number') found.push(layer.maxWidth);
  });
  maxWidths(node.children, found);
  return found;
};

const renderApp = async () => {
  const result = render(
    <SafeAreaProvider>
      <AuthContext.Provider value={auth}>
        <RootNavigator />
      </AuthContext.Provider>
    </SafeAreaProvider>,
  );
  await act(async () => {});
  const caps = maxWidths(result.toJSON());
  result.unmount();
  return caps;
};

beforeAll(() => configureDemoMode(true));
afterAll(() => configureDemoMode(false));

test('a tablet viewport centres the app in a capped column', async () => {
  setViewport(1024);
  expect(await renderApp()).toContain(breakpoint.appMaxWidth);
});

test('a phone viewport leaves the app full width', async () => {
  setViewport(390);
  expect(await renderApp()).not.toContain(breakpoint.appMaxWidth);
});
