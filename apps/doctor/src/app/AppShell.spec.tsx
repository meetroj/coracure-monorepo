import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';

import AppShell from './AppShell';

const noop = () => undefined;

test('all five tabs are present in the required order', () => {
  const { getByTestId } = render(<AppShell onLogout={noop} />);
  ['dashboard', 'appointments', 'cases', 'availability', 'profile'].forEach((k) =>
    expect(getByTestId(`tab-${k}`)).toBeTruthy()
  );
});

test('tabs switch the visible screen', () => {
  const { getByTestId, getByText, queryByText } = render(<AppShell onLogout={noop} />);

  // dashboard is the landing tab
  expect(getByText("Today's Summary")).toBeTruthy();

  fireEvent.press(getByTestId('tab-appointments'));
  expect(getByText('Manage your patient consultations')).toBeTruthy();
  expect(queryByText("Today's Summary")).toBeNull();

  fireEvent.press(getByTestId('tab-cases'));
  expect(getByText('Manage consultation records')).toBeTruthy();

  fireEvent.press(getByTestId('tab-availability'));
  expect(getByText('Choose your regular hours and exceptions.')).toBeTruthy();

  fireEvent.press(getByTestId('tab-profile'));
  expect(getByText('Account Status')).toBeTruthy();
});

test('acknowledging approval from the Profile tab unlocks the full profile', () => {
  const { getByTestId, getByText } = render(<AppShell onLogout={noop} />);

  fireEvent.press(getByTestId('tab-profile'));
  expect(getByText('Account Approved')).toBeTruthy();

  fireEvent.press(getByTestId('acknowledge'));
  // returns to dashboard, and profile is now the full screen
  expect(getByText("Today's Summary")).toBeTruthy();
  fireEvent.press(getByTestId('tab-profile'));
  expect(getByText('Earnings and payouts')).toBeTruthy();
});

test('availability shows one status at a time and opens a dropdown to change it', () => {
  const { getByTestId, getByText, queryByTestId } = render(<AppShell onLogout={noop} />);

  // collapsed: only the current status is on screen
  expect(getByTestId('status-trigger')).toBeTruthy();
  expect(getByText('Offline')).toBeTruthy();
  expect(queryByTestId('status-available')).toBeNull();
  expect(queryByTestId('status-paused')).toBeNull();

  // opening reveals the options
  fireEvent.press(getByTestId('status-trigger'));
  expect(getByTestId('status-available')).toBeTruthy();
  expect(getByTestId('status-scheduledOnly')).toBeTruthy();

  // choosing one selects it and closes the dropdown again
  fireEvent.press(getByTestId('status-available'));
  expect(getByText('Available Now')).toBeTruthy();
  expect(queryByTestId('status-paused')).toBeNull();
});

test('the dashboard no longer shows the instant-request line or simulate link', () => {
  const { queryByText } = render(<AppShell onLogout={noop} />);
  expect(queryByText(/receiving instant/i)).toBeNull();
  expect(queryByText(/Simulate/i)).toBeNull();
});

test("summary tiles drop the redundant per-tile 'Today' label", () => {
  const { getByTestId, getByText } = render(<AppShell onLogout={noop} />);
  // the section header still carries the timeframe
  expect(getByText("Today's Summary")).toBeTruthy();
  // no tile repeats it (Next Appointment and Earnings keep their own, which
  // are meaningful there rather than redundant)
  ['appts', 'done', 'up', 'noshow', 'sum'].forEach((k) => {
    expect(within(getByTestId(`tile-${k}`)).queryByText('Today')).toBeNull();
  });
  // count still sits beside the icon
  expect(within(getByTestId('tile-appts')).getByText('18')).toBeTruthy();
});
