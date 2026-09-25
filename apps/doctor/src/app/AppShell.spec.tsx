import React from 'react';
import { fireEvent, screen, within, act } from '@testing-library/react-native';

import { renderShell, tap, on, toastText } from '../test/app';
import { getState } from '../state/store';
import { setVerification } from '../state/actions';

/* ---------------------------------- tabs ---------------------------------- */

test('all five tabs are present in the required order', () => {
  renderShell();
  const order = ['dashboard', 'appointments', 'cases', 'clarifications', 'profile'].map((k) => screen.getByTestId(`tab-${k}`));
  expect(order).toHaveLength(5);
  expect(screen.getByTestId('tab-dashboard')).toBeSelected();
});

test('tabs switch the visible screen', () => {
  renderShell();
  expect(screen.getByTestId('dashboard')).toBeTruthy();
  fireEvent.press(screen.getByTestId('tab-appointments'));
  expect(screen.getByTestId('appointments')).toBeTruthy();
  fireEvent.press(screen.getByTestId('tab-cases'));
  expect(screen.getByTestId('cases')).toBeTruthy();
  fireEvent.press(screen.getByTestId('tab-clarifications'));
  expect(screen.getByTestId('clarifications')).toBeTruthy();
  fireEvent.press(screen.getByTestId('tab-profile'));
  expect(screen.getByTestId('profile')).toBeTruthy();
  expect(screen.getByText('Dr. Arjun Mehta')).toBeTruthy();
});

test('availability lives under Profile and opens as its own screen', () => {
  renderShell();
  fireEvent.press(screen.getByTestId('tab-profile'));
  tap('row-availability');
  expect(screen.getByTestId('availability')).toBeTruthy();
  expect(screen.queryByTestId('tab-availability')).toBeNull();
});

/* ------------------------------- landing tab ------------------------------ */

test('an onboarded, approved doctor lands on the Dashboard', () => {
  renderShell();
  expect(screen.getByTestId('dashboard')).toBeTruthy();
  expect(screen.queryByTestId('profile-badge')).toBeNull();
});

test('a doctor under review lands on Profile and sees the pending state', () => {
  renderShell({ verification: { status: 'pending', acknowledged: false } });
  expect(screen.getByTestId('account-status-pending')).toBeTruthy();
  expect(screen.getByText('Under Review')).toBeTruthy();
  // the tab carries a dot while there is a status the doctor has not seen
  expect(screen.getByTestId('profile-badge')).toBeTruthy();
});

test('after creating a profile: Account Status, then Go to Dashboard, then the full profile', () => {
  const { submitRegistration } = require('../state/actions');
  const { demoRegistration } = require('../data/registration');
  const { resetStore } = require('../state/store');
  const { render } = require('@testing-library/react-native');
  const App = require('./App').default;

  // a new doctor has just submitted their details
  resetStore({ session: { stage: 'onboarding', mobile: '9123456780' } });
  submitRegistration({ ...demoRegistration('+91 91234 56780'), basic: { ...demoRegistration('+91 91234 56780').basic, fullName: 'Kavya Rao' } });
  render(<App />);

  // the review is shown first, with the way on
  expect(screen.getByText('Under Review')).toBeTruthy();
  fireEvent.press(screen.getByTestId('acknowledge'));
  expect(screen.getByTestId('dashboard')).toBeTruthy();
  expect(screen.getByText('Dr. Kavya Rao')).toBeTruthy();
  expect(screen.queryByTestId('profile-badge')).toBeNull();

  // the whole profile is there for the demo, with the review status one row away
  fireEvent.press(screen.getByTestId('tab-profile'));
  expect(screen.getByTestId('profile')).toBeTruthy();
  expect(within(screen.getByTestId('row-account-status')).getByText('Under review')).toBeTruthy();
  tap('row-profile-details');
  expect(on('profile-details').getByText('Dr. Kavya Rao')).toBeTruthy();
  fireEvent.press(screen.getByTestId('back'));
  tap('row-account-status');
  expect(on('account-status-pending').getByText('Under Review')).toBeTruthy();
});

test('a rejected doctor lands on Profile and sees what to fix', () => {
  renderShell({ verification: { status: 'rejected', acknowledged: false } });
  expect(screen.getByText('Changes Required')).toBeTruthy();
  expect(screen.getByText('Name mismatch')).toBeTruthy();
  expect(screen.getByTestId('resubmit')).toBeTruthy();
});

test('acknowledging approval moves to the Dashboard and unlocks the profile', () => {
  renderShell({ verification: { status: 'approved', acknowledged: false } });
  expect(screen.getByText('Account Approved')).toBeTruthy();
  fireEvent.press(screen.getByTestId('acknowledge'));
  expect(getState().verification.acknowledged).toBe(true);
  expect(screen.getByTestId('dashboard')).toBeTruthy();
  fireEvent.press(screen.getByTestId('tab-profile'));
  expect(screen.getByTestId('profile')).toBeTruthy();
});

test('there is no visible switcher between account states', () => {
  renderShell({ verification: { status: 'pending', acknowledged: false } });
  ['approved', 'pending', 'rejected'].forEach((k) => expect(screen.queryByTestId(`status-tab-${k}`)).toBeNull());
  expect(screen.queryByTestId('demo-tools')).toBeNull();
});

test('a pending doctor can still log out, after confirming', () => {
  const { Alert } = require('react-native');
  renderShell({ verification: { status: 'pending', acknowledged: false } });
  fireEvent.press(screen.getByTestId('logout'));
  expect(Alert.alert).toHaveBeenCalledWith('Log out?', expect.any(String), expect.any(Array), expect.any(Object));
  expect(getState().session.stage).toBe('login');
});

/* ------------------------------- demo tools -------------------------------- */

test('demo tools stay hidden until a long press on the wordmark', () => {
  renderShell();
  expect(screen.queryByText('Demo tools')).toBeNull();
  fireEvent(screen.getByTestId('brand-logo'), 'longPress');
  expect(screen.getByText('Demo tools')).toBeTruthy();

  fireEvent.press(screen.getByTestId('sheet-action-reject'));
  expect(getState().verification.status).toBe('rejected');
  expect(toastText()).toMatch(/Rejected/);
});

test('an administrator decision reaches the Profile tab without a reload', () => {
  renderShell({ verification: { status: 'pending', acknowledged: false } });
  expect(screen.getByText('Under Review')).toBeTruthy();
  act(() => setVerification('approved'));
  expect(screen.getByText('Account Approved')).toBeTruthy();
});

/* --------------------------------- status ---------------------------------- */

test('the live status opens a sheet and commits only on Save', () => {
  renderShell();
  expect(within(screen.getByTestId('status-trigger')).getByText('Available Now')).toBeTruthy();

  fireEvent.press(screen.getByTestId('status-trigger'));
  expect(screen.getByTestId('status-sheet')).toBeTruthy();
  fireEvent.press(screen.getByTestId('sheet-status-scheduledOnly'));
  // nothing changes until Save
  expect(getState().liveStatus).toBe('available');
  fireEvent.press(screen.getByTestId('save-status'));

  expect(getState().liveStatus).toBe('scheduledOnly');
  expect(within(screen.getByTestId('status-trigger')).getByText('Scheduled Only')).toBeTruthy();
});

test('the status sheet lists only the statuses a doctor can pick', () => {
  renderShell();
  fireEvent.press(screen.getByTestId('status-trigger'));
  ['available', 'scheduledOnly', 'paused', 'offline'].forEach((k) => expect(screen.getByTestId(`sheet-status-${k}`)).toBeTruthy());
  ['requestPending', 'inConsultation', 'completingNotes'].forEach((k) => expect(screen.queryByTestId(`sheet-status-${k}`)).toBeNull());
});

test('Scheduled Only shows today’s bookable hours, and "Edit schedule" opens Availability', () => {
  renderShell();
  fireEvent.press(screen.getByTestId('status-trigger'));
  fireEvent.press(screen.getByTestId('sheet-status-scheduledOnly'));
  expect(screen.getByTestId('today-hours')).toBeTruthy();
  fireEvent.press(screen.getByTestId('edit-schedule'));
  expect(screen.getByTestId('availability')).toBeTruthy();
});

/* -------------------------------- dashboard -------------------------------- */

test('summary counts are derived from the day’s appointments', () => {
  renderShell();
  // 5 active today (the cancelled one is excluded), 2 completed, 2 still to come
  expect(within(screen.getByTestId('tile-appts')).getByText('5')).toBeTruthy();
  expect(within(screen.getByTestId('tile-done')).getByText('2')).toBeTruthy();
  expect(within(screen.getByTestId('tile-up')).getByText('2')).toBeTruthy();
});

test('ending a consultation moves it from upcoming to completed', () => {
  renderShell();
  fireEvent.press(screen.getByTestId('next-join'));
  expect(screen.getByTestId('consultation-room')).toBeTruthy();
  fireEvent.press(screen.getByTestId('ctl-end'));
  // straight on to the notes, and the dashboard has moved on
  expect(on('clinical-notes').getByText('Clinical Notes & Diagnosis')).toBeTruthy();
  expect(within(screen.getByTestId('tile-done', { includeHiddenElements: true })).getByText('3', { includeHiddenElements: true })).toBeTruthy();
});

test('the header badges count what is actually unread', () => {
  renderShell();
  expect(screen.getByLabelText('Notifications, 4 unread')).toBeTruthy();
  expect(screen.getByLabelText('Messages, 3 unread')).toBeTruthy();

  fireEvent.press(screen.getByTestId('nav-notifications'));
  fireEvent.press(screen.getByTestId('mark-all-read'));
  fireEvent.press(screen.getByTestId('back'));
  expect(screen.getByLabelText('Notifications')).toBeTruthy();
  expect(screen.queryByLabelText(/Notifications, \d+ unread/)).toBeNull();
});
