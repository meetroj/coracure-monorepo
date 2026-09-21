import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';

import AppShell from './AppShell';

const noop = () => undefined;

test('all five tabs are present in the required order', () => {
  const { getByTestId } = render(<AppShell onLogout={noop} initialAcknowledged />);
  ['dashboard', 'appointments', 'cases', 'clarifications', 'profile'].forEach((k) =>
    expect(getByTestId(`tab-${k}`)).toBeTruthy()
  );
});

test('tabs switch the visible screen', () => {
  const { getByTestId, getByText, queryByText, queryByTestId } = render(<AppShell onLogout={noop} initialAcknowledged />);

  // dashboard is the landing tab
  expect(getByText("Today's Summary")).toBeTruthy();

  fireEvent.press(getByTestId('tab-appointments'));
  expect(getByText('Manage your patient consultations')).toBeTruthy();
  expect(queryByText("Today's Summary")).toBeNull();

  fireEvent.press(getByTestId('tab-cases'));
  expect(getByText('Manage consultation records')).toBeTruthy();

  // Availability gave up its tab slot to Clarifications and now lives under
  // Profile; the tab itself is gone.
  expect(queryByTestId('tab-availability')).toBeNull();
  fireEvent.press(getByTestId('tab-clarifications'));
  expect(getByText('Track and manage clarification queries')).toBeTruthy();

  fireEvent.press(getByTestId('tab-profile'));
  // acknowledged, so the Profile tab shows the full profile, not the gate
  expect(getByText('Dr. Sydney Sweeney')).toBeTruthy();
});

test('availability is still reachable, now from Profile', () => {
  // losing its tab must not orphan the screen — bookings depend on it
  const { getByTestId, getByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByTestId('tab-profile'));
  fireEvent.press(getByText('Availability'));
  expect(getByText('Availability Schedule')).toBeTruthy();
  expect(getByText('Manage your weekly availability and appointment settings.')).toBeTruthy();
});

/* ------------------------------ landing tab ------------------------------- */

test('an unacknowledged doctor lands on Profile, not the Dashboard', () => {
  // no `initialAcknowledged`: this is the first-run state
  const { getByText, queryByText } = render(<AppShell onLogout={noop} />);

  expect(getByText('Account Status')).toBeTruthy();
  expect(getByText('Account Approved')).toBeTruthy();
  expect(queryByText("Today's Summary")).toBeNull();
});

test('a pending doctor lands on Profile and sees the pending state', () => {
  const { getByText, queryByText } = render(
    <AppShell onLogout={noop} initialVerification="pending" />
  );
  expect(getByText('Under Review')).toBeTruthy();
  expect(queryByText("Today's Summary")).toBeNull();
});

test('a rejected doctor lands on Profile and sees what to fix', () => {
  const { getByText, queryByText } = render(
    <AppShell onLogout={noop} initialVerification="rejected" />
  );
  expect(getByText('Changes Required')).toBeTruthy();
  expect(queryByText("Today's Summary")).toBeNull();
});

test('an onboarded doctor lands on the Dashboard', () => {
  const { getByText } = render(<AppShell onLogout={noop} initialAcknowledged />);
  expect(getByText("Today's Summary")).toBeTruthy();
});

test('acknowledging approval moves the doctor to the Dashboard and unlocks the profile', () => {
  // starts on Profile because the approval is not yet acknowledged
  const { getByTestId, getByText } = render(<AppShell onLogout={noop} />);
  expect(getByText('Account Approved')).toBeTruthy();

  fireEvent.press(getByTestId('acknowledge'));
  // lands on the dashboard, and profile is now the full screen
  expect(getByText("Today's Summary")).toBeTruthy();
  fireEvent.press(getByTestId('tab-profile'));
  expect(getByText('Earnings and payouts')).toBeTruthy();
});

test('availability shows one status at a time and opens a sheet to change it', () => {
  const { getByTestId, getByText, queryByTestId } = render(<AppShell onLogout={noop} initialAcknowledged />);

  // collapsed: only the current status is on screen
  expect(getByTestId('status-trigger')).toBeTruthy();
  expect(getByText('Offline')).toBeTruthy();
  expect(queryByTestId('sheet-status-available')).toBeNull();

  // opening reveals the sheet
  fireEvent.press(getByTestId('status-trigger'));
  expect(getByText('Doctor Status')).toBeTruthy();
  expect(getByTestId('sheet-status-available')).toBeTruthy();
  expect(getByTestId('sheet-status-scheduledOnly')).toBeTruthy();
});

test('the sheet only commits the new status on Save', () => {
  const { getByTestId, getByText, queryByTestId } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByTestId('status-trigger'));
  fireEvent.press(getByTestId('sheet-status-available'));
  // still staged — the trigger has not changed yet
  fireEvent.press(getByTestId('save-status'));

  expect(getByText('Available Now')).toBeTruthy();
  expect(queryByTestId('sheet-status-paused')).toBeNull();
});

test('the sheet no longer lists the automatic statuses — only the manual picks', () => {
  const { getByTestId, queryByTestId, queryByText } = render(<AppShell onLogout={noop} initialAcknowledged />);
  fireEvent.press(getByTestId('status-trigger'));

  ['requestPending', 'inConsultation', 'completingNotes'].forEach((k) =>
    expect(queryByTestId(`sheet-auto-${k}`)).toBeNull()
  );
  expect(queryByText('Automatic')).toBeNull();
  expect(() => getByTestId('sheet-status-completingNotes')).toThrow();
});

test('the dashboard no longer shows the instant-request line or simulate link', () => {
  const { queryByText } = render(<AppShell onLogout={noop} initialAcknowledged />);
  expect(queryByText(/receiving instant/i)).toBeNull();
  expect(queryByText(/Simulate/i)).toBeNull();
});

test('Follow-up Alerts renders beside Pending Clinical Tasks', () => {
  // regression: Card put flex:1 on an inner View while the Pressable wrapper
  // had no flex, so the first card consumed the row and this one vanished
  const { getByText } = render(<AppShell onLogout={noop} initialAcknowledged />);
  expect(getByText('Pending Clinical Tasks')).toBeTruthy();
  expect(getByText('Follow-up Alerts')).toBeTruthy();
  expect(getByText('High Priority')).toBeTruthy();
  expect(getByText('Due Today')).toBeTruthy();
});

test('earnings and patient feedback each expose their own action', () => {
  const { getByTestId, getByText } = render(<AppShell onLogout={noop} initialAcknowledged />);
  expect(getByTestId('view-earnings')).toBeTruthy();
  expect(getByTestId('view-reviews')).toBeTruthy();
  expect(getByText('Patient Feedback')).toBeTruthy();
});

test("summary tiles drop the redundant per-tile 'Today' label", () => {
  const { getByTestId, getByText } = render(<AppShell onLogout={noop} initialAcknowledged />);
  // the section header still carries the timeframe
  expect(getByText("Today's Summary")).toBeTruthy();
  // no tile repeats it (Next Appointment and Earnings keep their own, which
  // are meaningful there rather than redundant)
  ['appts', 'done', 'up'].forEach((k) => {
    expect(within(getByTestId(`tile-${k}`)).queryByText('Today')).toBeNull();
  });
  // count still sits beside the icon
  expect(within(getByTestId('tile-appts')).getByText('18')).toBeTruthy();
});
