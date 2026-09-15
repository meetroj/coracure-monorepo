import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

import InstantRequestScreen from './InstantRequestScreen';

/**
 * The screen mounts a live countdown that reschedules a timer every tick, so
 * each test installs fake timers, unmounts explicitly, and only then restores
 * real ones. Doing the restore in a global `afterEach` instead races React
 * Native Testing Library's own cleanup hook and hangs it.
 */
const setup = (over: Partial<React.ComponentProps<typeof InstantRequestScreen>> = {}) => {
  const props = {
    onAccept: jest.fn(),
    onDecline: jest.fn(),
    onBack: jest.fn(),
    onHelp: jest.fn(),
    ...over,
  };
  return { props, ...render(<InstantRequestScreen {...props} />) };
};

/**
 * Each tick needs its own `act`: the effect that schedules the next timeout
 * runs in React's passive-effect flush, which only happens when `act` exits.
 * One large `advanceTimersByTime` therefore moves the clock a single tick.
 */
const tick = (n = 1) => {
  for (let i = 0; i < n; i++) {
    act(() => {
      jest.advanceTimersByTime(1000);
    });
  }
};

test('shows the request essentials and both actions', () => {
  jest.useFakeTimers();
  const { getByText, getByTestId, unmount } = setup();

  expect(getByText('Instant consultation request')).toBeTruthy();
  expect(getByText('Rahul Sharma')).toBeTruthy();
  expect(getByText('Anxiety and difficulty sleeping')).toBeTruthy();
  expect(getByText('Patient reported')).toBeTruthy();
  expect(getByText('Psychiatry')).toBeTruthy();
  expect(getByTestId('accept')).toBeTruthy();
  expect(getByTestId('decline')).toBeTruthy();

  unmount();
  jest.useRealTimers();
});

test('withholds details a doctor does not need to answer the request', () => {
  jest.useFakeTimers();
  const { queryByText, unmount } = setup();
  // no phone, address, diagnosis, payment credentials or visit history
  [/\+91/, /address/i, /diagnos/i, /card ending/i, /previous visit/i].forEach((re) =>
    expect(queryByText(re)).toBeNull()
  );
  unmount();
  jest.useRealTimers();
});

test('states the order: consultation opens only after payment and consent', () => {
  jest.useFakeTimers();
  const { getByText, getAllByText, unmount } = setup();
  // "Accept request" is both step 1 and the primary button
  expect(getAllByText('Accept request')).toHaveLength(2);
  expect(getByText('Patient completes payment')).toBeTruthy();
  expect(getByText('Consent verified and consultation opens')).toBeTruthy();
  unmount();
  jest.useRealTimers();
});

test('the countdown ticks down', () => {
  jest.useFakeTimers();
  const { getByText, unmount } = setup();
  expect(getByText('24')).toBeTruthy();
  tick(3);
  expect(getByText('21')).toBeTruthy();
  unmount();
  jest.useRealTimers();
});

test('an unanswered request reroutes on its own', () => {
  jest.useFakeTimers();
  const { props, unmount } = setup();
  tick(25);
  expect(props.onDecline).toHaveBeenCalled();
  unmount();
  jest.useRealTimers();
});

test('accept and decline call through', () => {
  jest.useFakeTimers();
  const { props, getByTestId, unmount } = setup();
  fireEvent.press(getByTestId('accept'));
  expect(props.onAccept).toHaveBeenCalledTimes(1);
  fireEvent.press(getByTestId('decline'));
  expect(props.onDecline).toHaveBeenCalledTimes(1);
  unmount();
  jest.useRealTimers();
});
