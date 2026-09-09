import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import ProfileRouter from './ProfileRouter';

const noop = () => undefined;

const setup = (
  status: 'pending' | 'rejected' | 'approved',
  acknowledged: boolean,
  onAcknowledge = noop
) =>
  render(
    <ProfileRouter
      status={status}
      acknowledged={acknowledged}
      onAcknowledge={onAcknowledge}
      onLogout={noop}
      onOpen={noop}
      onContactAdmin={noop}
      onResubmit={noop}
    />
  );

test('pending verification shows Under Review and never the full profile', () => {
  const { getByText, queryByText } = setup('pending', false);
  expect(getByText('Under Review')).toBeTruthy();
  expect(getByText('Pending verification')).toBeTruthy();
  // gated: profile-only rows must not be reachable
  expect(queryByText('Earnings and payouts')).toBeNull();
  expect(queryByText('Log out')).toBeNull();
});

test('rejected verification shows Changes Required and a resubmit action', () => {
  const { getByText, getByTestId, queryByText } = setup('rejected', false);
  expect(getByText('Changes Required')).toBeTruthy();
  expect(getByTestId('resubmit')).toBeTruthy();
  expect(queryByText('Earnings and payouts')).toBeNull();
});

test('approved but unacknowledged shows the one-time Account Approved screen', () => {
  const { getByText, getByTestId, queryByText } = setup('approved', false);
  expect(getByText('Account Approved')).toBeTruthy();
  expect(getByTestId('acknowledge')).toBeTruthy();
  expect(queryByText('Earnings and payouts')).toBeNull();
});

test('acknowledging approval fires the callback that unlocks the profile', () => {
  const onAcknowledge = jest.fn();
  const { getByTestId } = setup('approved', false, onAcknowledge);
  fireEvent.press(getByTestId('acknowledge'));
  expect(onAcknowledge).toHaveBeenCalledTimes(1);
});

test('approved and acknowledged opens the full profile', () => {
  const { getByText, queryByText } = setup('approved', true);
  expect(getByText('Earnings and payouts')).toBeTruthy();
  expect(getByText('Log out')).toBeTruthy();
  // forbidden by spec: no completion percentage, no clinic address
  expect(queryByText(/completion/i)).toBeNull();
  expect(queryByText('Under Review')).toBeNull();
});
