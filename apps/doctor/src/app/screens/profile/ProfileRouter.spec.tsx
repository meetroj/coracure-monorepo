import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';

import ProfileRouter from './ProfileRouter';
import { getState, resetStore } from '../../../state/store';
import { setVerification } from '../../../state/actions';

const setup = () => {
  const props = { onOpen: jest.fn(), onAcknowledge: jest.fn(), onGetSupport: jest.fn(), onResubmit: jest.fn() };
  return { props, ...render(<ProfileRouter {...props} />) };
};

test('an account status the doctor has not seen is shown first, with the way on', () => {
  resetStore({ verification: { status: 'pending', acknowledged: false } });
  const { props } = setup();
  expect(screen.getByText('Under Review')).toBeTruthy();
  fireEvent.press(screen.getByTestId('acknowledge'));
  expect(props.onAcknowledge).toHaveBeenCalledTimes(1);
});

test('once seen, the full profile shows whatever the review status', () => {
  resetStore({ verification: { status: 'pending', acknowledged: true } });
  setup();
  expect(screen.getByTestId('profile')).toBeTruthy();
  expect(screen.getByText('Under review')).toBeTruthy();
});

test('an approved, acknowledged doctor sees the full profile marked approved', () => {
  resetStore({ verification: { status: 'approved', acknowledged: true } });
  setup();
  expect(screen.getByTestId('profile')).toBeTruthy();
  expect(screen.getByText('Approved')).toBeTruthy();
});

test('a new administrator decision shows the status again', () => {
  resetStore({ verification: { status: 'pending', acknowledged: true } });
  setup();
  act(() => setVerification('rejected'));
  expect(screen.getByText('Changes Required')).toBeTruthy();
  expect(getState().verification.acknowledged).toBe(false);
});

test('a rejection offers resubmission and support, not a way past it', () => {
  resetStore({ verification: { status: 'rejected', acknowledged: false } });
  const { props } = setup();
  expect(screen.queryByTestId('acknowledge')).toBeNull();
  fireEvent.press(screen.getByTestId('resubmit'));
  expect(props.onResubmit).toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('contact-admin'));
  expect(props.onGetSupport).toHaveBeenCalled();
});

test('every profile row goes somewhere real', () => {
  resetStore({ verification: { status: 'approved', acknowledged: true } });
  const { props } = setup();
  ['row-profile-details', 'row-account-status', 'row-fee', 'row-duration', 'row-availability', 'row-earnings', 'row-reviews', 'row-bank', 'row-notifications', 'row-help', 'row-privacy'].forEach((id) =>
    fireEvent.press(screen.getByTestId(id))
  );
  expect(props.onOpen.mock.calls.map((c) => c[0])).toEqual([
    'profileDetails',
    'accountStatus',
    'fee',
    'duration',
    'availability',
    'earnings',
    'reviews',
    'bank',
    'notifications',
    'help',
    'privacy',
  ]);
});

test('logging out asks first', () => {
  const { Alert } = require('react-native');
  resetStore({ session: { stage: 'shell', mobile: '9876543210' }, verification: { status: 'approved', acknowledged: true } });
  setup();
  fireEvent.press(screen.getByTestId('logout'));
  expect(Alert.alert).toHaveBeenCalledWith('Log out?', expect.any(String), expect.any(Array), expect.any(Object));
  expect(getState().session.stage).toBe('login');
});
