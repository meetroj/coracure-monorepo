import React from 'react';
import { render, screen } from '@testing-library/react-native';

import InstantDeclinedScreen from './InstantDeclinedScreen';

/**
 * `declineOffer` answers whether the request actually found another doctor.
 * Claiming "no further action is required" when it did not would be false
 * reassurance, so the copy has to branch on it rather than assume it.
 */
const setup = (over: Partial<React.ComponentProps<typeof InstantDeclinedScreen>> = {}) =>
  render(<InstantDeclinedScreen onReturn={jest.fn()} onBack={jest.fn()} {...over} />);

test('defaults to "automatically rerouted" — the only answer the expiry and offer-gone paths have', () => {
  setup();
  expect(screen.getByText('Automatically rerouted')).toBeTruthy();
});

test('says so plainly when the backend answers that nobody else could take it', () => {
  setup({ rerouted: false });
  expect(screen.getByTestId('not-rerouted')).toBeTruthy();
  expect(screen.queryByText('Automatically rerouted')).toBeNull();
});
