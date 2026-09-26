import React from 'react';
import { render, fireEvent, act, screen } from '@testing-library/react-native';

import InstantRequestScreen from './InstantRequestScreen';
import { instantRequest, INSTANT_STEPS } from '../../data/doctor';

/**
 * The screen runs a live countdown, so each test installs fake timers,
 * unmounts explicitly, and only then restores real ones.
 */
const setup = () => {
  const props = { onAccept: jest.fn(), onDecline: jest.fn(), onExpire: jest.fn(), onBack: jest.fn() };
  return { props, ...render(<InstantRequestScreen {...props} />) };
};

/** One `act` per tick: the next timeout is scheduled in a passive effect. */
const tick = (n = 1) => {
  for (let i = 0; i < n; i++) act(() => jest.advanceTimersByTime(1000));
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('shows the requester — not an assigned patient — and both actions', () => {
  const { unmount } = setup();
  expect(screen.getByText(instantRequest.name)).toBeTruthy();
  expect(screen.getByText(instantRequest.concern)).toBeTruthy();
  expect(screen.getByTestId('accept')).toBeTruthy();
  expect(screen.getByTestId('decline')).toBeTruthy();
  unmount();
});

test('withholds details a doctor does not need to answer', () => {
  const { unmount } = setup();
  [/address/i, /diagnos/i, /card ending/i].forEach((re) => expect(screen.queryByText(re)).toBeNull());
  unmount();
});

test('states the order: the consultation opens only after payment and consent', () => {
  const { unmount } = setup();
  INSTANT_STEPS.forEach((s) => expect(screen.getAllByText(s).length).toBeGreaterThan(0));
  unmount();
});

test('the countdown starts at the response window and ticks down', () => {
  const { unmount } = setup();
  expect(screen.getByText(String(instantRequest.respondWithin))).toBeTruthy();
  tick(3);
  expect(screen.getByText(String(instantRequest.respondWithin - 3))).toBeTruthy();
  unmount();
});

test('an unanswered request expires once, on its own', () => {
  const { props, unmount } = setup();
  tick(instantRequest.respondWithin + 2);
  expect(props.onExpire).toHaveBeenCalledTimes(1);
  expect(props.onDecline).not.toHaveBeenCalled();
  unmount();
});

test('a request is answered once — a second tap cannot answer again', () => {
  const { props, unmount } = setup();
  fireEvent.press(screen.getByTestId('accept'));
  fireEvent.press(screen.getByTestId('decline'));
  expect(props.onAccept).toHaveBeenCalledTimes(1);
  expect(props.onDecline).not.toHaveBeenCalled();
  unmount();
});

test('the info button explains instant requests', () => {
  const { unmount } = setup();
  fireEvent.press(screen.getByTestId('instant-info'));
  expect(screen.getByText('About instant requests')).toBeTruthy();
  unmount();
});
