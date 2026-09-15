import React from 'react';
import { BackHandler } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';

import AppShell from './AppShell';

const noop = () => undefined;

/**
 * Fires Android's hardware back and reports whether the app handled it.
 * The handler calls setState, so it has to run inside `act` for React to
 * flush before the assertion reads the tree.
 */
const pressHardwareBack = (): boolean => {
  const calls = (BackHandler.addEventListener as jest.Mock).mock.calls;
  const handlers = calls.filter(([evt]) => evt === 'hardwareBackPress').map(([, fn]) => fn);
  // the most recent subscription is the live one
  const handler = handlers[handlers.length - 1];
  if (!handler) return false;
  let handled = false;
  act(() => {
    handled = handler();
  });
  return handled;
};

beforeEach(() => {
  jest.spyOn(BackHandler, 'addEventListener');
});

afterEach(() => {
  jest.restoreAllMocks();
});

/* --------------------------- back returns to origin ------------------------ */

test('back from a detail returns to the screen that opened it, not the dashboard', () => {
  const { getByTestId, getByText, getAllByText, queryByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  // Appointments -> appointment details (several rows offer Details)
  fireEvent.press(getByTestId('tab-appointments'));
  expect(getByText('Manage your patient consultations')).toBeTruthy();
  fireEvent.press(getAllByText('Details')[0]);

  // back must land on Appointments, NOT the dashboard
  fireEvent.press(getByTestId('back'));
  expect(getByText('Manage your patient consultations')).toBeTruthy();
  expect(queryByText("Today's Summary")).toBeNull();
});

test('back unwinds a multi-level trail one step at a time', () => {
  const { getByTestId, getByText, queryByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  // Dashboard -> alerts -> alert detail
  fireEvent.press(getByText('Follow-up Alerts'));
  expect(getByText('Patients who need your attention based on their check-ins.')).toBeTruthy();
  fireEvent.press(getByTestId('open-al1'));
  expect(getByText('Answers Triggering Red Flag')).toBeTruthy();

  // first back -> alerts list, not the dashboard
  fireEvent.press(getByTestId('back'));
  expect(getByText('Patients who need your attention based on their check-ins.')).toBeTruthy();
  expect(queryByText("Today's Summary")).toBeNull();

  // second back -> dashboard
  fireEvent.press(getByTestId('back'));
  expect(getByText("Today's Summary")).toBeTruthy();
});

test('a chat thread returns to the chat list, and the list to the dashboard', () => {
  const { getByTestId, getByText, queryByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByTestId('tab-dashboard'));
  fireEvent.press(getByTestId('nav-messages'));
  expect(getByText('Messages')).toBeTruthy();

  fireEvent.press(getByTestId('thread-th1'));
  expect(getByTestId('composer')).toBeTruthy();

  fireEvent.press(getByTestId('back'));
  expect(getByText('Messages')).toBeTruthy();
  expect(queryByText("Today's Summary")).toBeNull();

  fireEvent.press(getByTestId('back'));
  expect(getByText("Today's Summary")).toBeTruthy();
});

/* ------------------------ android hardware back button --------------------- */

test('hardware back pops the stack instead of closing the app', () => {
  const { getByTestId, getByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByText('Follow-up Alerts'));
  fireEvent.press(getByTestId('open-al1'));

  // handled === true means Android must NOT exit the app
  expect(pressHardwareBack()).toBe(true);
  expect(getByText('Patients who need your attention based on their check-ins.')).toBeTruthy();

  expect(pressHardwareBack()).toBe(true);
  expect(getByText("Today's Summary")).toBeTruthy();
});

test('hardware back only lets the OS exit from a tab root', () => {
  const { getByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  // nothing stacked: unhandled, so the OS may background the app
  expect(pressHardwareBack()).toBe(false);
  expect(getByText("Today's Summary")).toBeTruthy();
});

test('hardware back never closes the app from a form screen', () => {
  const { getByTestId, getByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByTestId('tab-cases'));
  fireEvent.press(getByTestId('quick-clarify'));
  expect(getByText('Create Clarification')).toBeTruthy();

  // the wizard is a form; back must return to Cases, not exit
  expect(pressHardwareBack()).toBe(true);
  expect(getByText('Manage consultation records')).toBeTruthy();
});

/* ------------------------------- tab switching ---------------------------- */

test('switching tab abandons that tab trail', () => {
  const { getByTestId, getByText, queryByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByText('Follow-up Alerts'));
  fireEvent.press(getByTestId('tab-cases'));
  fireEvent.press(getByTestId('tab-dashboard'));

  expect(getByText("Today's Summary")).toBeTruthy();
  expect(queryByText('Patients who need your attention based on their check-ins.')).toBeNull();
});

/* --------------------------- notifications routing ------------------------ */

test('a notification opens its own target and back returns to the inbox', () => {
  const { getByTestId, getByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByTestId('nav-notifications'));
  expect(getByText('Notifications')).toBeTruthy();

  // the documents notification routes to the document history
  fireEvent.press(getByTestId('notif-n2'));
  expect(getByText('Patient Documents')).toBeTruthy();

  fireEvent.press(getByTestId('back'));
  expect(getByText('Notifications')).toBeTruthy();
});
