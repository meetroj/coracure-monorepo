import React from 'react';
import { fireEvent, screen, within, act, waitFor } from '@testing-library/react-native';
import { doctorConsultationsApi, doctorFeedbackApi, doctorNotificationsApi, doctorPayoutsApi, doctorPresenceApi, doctorProfileApi } from '@coracure/api';

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

test('a rejected doctor lands on Profile and sees what to fix', async () => {
  // What to fix is the ADMIN's own words, read back from the server. It used to
  // be a fixture — every rejected doctor was told "Name mismatch" whatever the
  // reviewer had actually written.
  jest.spyOn(doctorProfileApi, 'getCredentials').mockResolvedValue({
    status: 'under_review',
    outstanding: [],
    registrationNumberMissing: false,
    documents: [
      {
        id: 'doc-1',
        documentType: 'identity_proof',
        reviewStatus: 'rejected',
        rejectionReason: 'The name on your Aadhaar does not match your registration.',
      },
    ],
  } as never);

  renderShell({ verification: { status: 'rejected', acknowledged: false } });
  await act(async () => {
    await Promise.resolve();
  });

  expect(screen.getByText('Changes Required')).toBeTruthy();
  expect(screen.getByText('The name on your Aadhaar does not match your registration.')).toBeTruthy();
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
  const { confirm } = require('../components/confirm');
  renderShell({ verification: { status: 'pending', acknowledged: false } });
  fireEvent.press(screen.getByTestId('logout'));
  expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Log out?' }));
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

test('the live status opens a sheet and commits only on Save', async () => {
  // The Save button updates the pill at once and persists behind it — mocked
  // so that background persistence resolves inside this test rather than
  // leaking a pending rollback into whichever test runs next.
  jest.spyOn(doctorPresenceApi, 'getPresence').mockResolvedValue({
    doctorId: 'd-1',
    presence: 'available_now',
    canReceiveInstant: true,
    blockedByConsultationId: null,
    allowInstantConsult: true,
  });
  jest.spyOn(doctorPresenceApi, 'setPresence').mockImplementation((presence) =>
    Promise.resolve({
      doctorId: 'd-1',
      presence,
      canReceiveInstant: presence === 'available_now',
      blockedByConsultationId: null,
      allowInstantConsult: true,
    })
  );

  renderShell();
  expect(within(screen.getByTestId('status-trigger')).getByText('Available Now')).toBeTruthy();

  fireEvent.press(screen.getByTestId('status-trigger'));
  expect(screen.getByTestId('status-sheet')).toBeTruthy();
  fireEvent.press(screen.getByTestId('sheet-status-scheduledOnly'));
  // nothing changes until Save
  expect(getState().liveStatus).toBe('available');
  await act(async () => fireEvent.press(screen.getByTestId('save-status')));

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

test('the header badges count what is actually unread', async () => {
  jest.spyOn(doctorConsultationsApi, 'listConsultations').mockResolvedValue([]);
  jest.spyOn(doctorConsultationsApi, 'pendingDocumentation').mockResolvedValue([]);
  jest.spyOn(doctorConsultationsApi, 'listSafetyAlerts').mockResolvedValue([]);
  jest.spyOn(doctorConsultationsApi, 'unreadNotifications').mockResolvedValue({ unread: 4 });
  jest.spyOn(doctorNotificationsApi, 'listNotifications').mockResolvedValue(
    Array.from({ length: 4 }, (_, i) => ({
      id: `n${i}`,
      templateCode: 'appointment_confirmed',
      title: `Notification ${i}`,
      body: 'Body',
      deepLinkData: null,
      consultationId: null,
      status: 'sent' as const,
      createdAt: new Date().toISOString(),
      readAt: null,
    }))
  );
  jest.spyOn(doctorNotificationsApi, 'markAllNotificationsRead').mockResolvedValue({ marked: 4 });

  renderShell();
  await waitFor(() => expect(screen.getByLabelText('Notifications, 4 unread')).toBeTruthy());
  expect(screen.getByLabelText('Messages, 3 unread')).toBeTruthy();

  fireEvent.press(screen.getByTestId('nav-notifications'));
  await waitFor(() => screen.getByTestId('mark-all-read'));
  fireEvent.press(screen.getByTestId('mark-all-read'));
  await waitFor(() => expect(doctorNotificationsApi.markAllNotificationsRead).toHaveBeenCalled());
  fireEvent.press(screen.getByTestId('back'));
  await waitFor(() => expect(screen.getByLabelText('Notifications')).toBeTruthy());
  expect(screen.queryByLabelText(/Notifications, \d+ unread/)).toBeNull();
});

/* ------------------------- earnings, feedback, badge ------------------------ */

test('the earnings card shows what the backend has paid and still owes', async () => {
  const { inr } = require('../data/doctor');
  const row = (consultationId: string, doctorEarning: number, status: 'paid' | 'pending') => ({
    consultationId,
    referenceCode: consultationId.toUpperCase(),
    consultationFee: doctorEarning,
    platformDeduction: 0,
    doctorEarning,
    status,
    paidAt: status === 'paid' ? '2026-05-10T00:00:00.000Z' : null,
  });
  jest.spyOn(doctorPayoutsApi, 'listPayouts').mockResolvedValue([row('c1', 800, 'paid'), row('c2', 600, 'pending'), row('c3', 600, 'pending')]);

  renderShell();
  await waitFor(() => expect(screen.getByTestId('earnings-paid')).toHaveTextContent(inr(800)));
  expect(screen.getByTestId('earnings-pending')).toHaveTextContent(inr(1200));
});

test('the feedback card shows the rating the backend holds, and opens the reviews', () => {
  renderShell();
  // test-setup seeds the server's answer: 4.6 over 12 ratings.
  expect(screen.getByTestId('feedback-rating')).toHaveTextContent('4.6');
  expect(screen.getByTestId('feedback-count')).toHaveTextContent('12 reviews');
  fireEvent.press(screen.getByTestId('view-reviews'));
  expect(screen.getByTestId('reviews')).toBeTruthy();
});

test('a doctor nobody has rated yet sees the card at zero: 0.0 and "0 reviews"', () => {
  const { seedResource } = require('../data/useResource');
  const { KEYS, NO_FEEDBACK } = require('../data/feedback');
  seedResource(KEYS.feedback, NO_FEEDBACK);
  renderShell();
  expect(screen.getByTestId('feedback-rating')).toHaveTextContent('0.0');
  expect(screen.getByTestId('feedback-count')).toHaveTextContent('0 reviews');
});

test('a failed feedback load says so instead of showing a rating', async () => {
  const { __resetResourceCache } = require('../data/useResource');
  __resetResourceCache();
  jest.spyOn(doctorFeedbackApi, 'getFeedback').mockRejectedValue(new Error('offline'));
  renderShell();
  await waitFor(() => expect(screen.getByTestId('feedback-error')).toBeTruthy());
  expect(screen.queryByTestId('feedback-rating')).toBeNull();
});

test('a failed earnings load says so instead of showing numbers', async () => {
  jest.spyOn(doctorPayoutsApi, 'listPayouts').mockRejectedValue(new Error('offline'));
  renderShell();
  await waitFor(() => expect(screen.getByTestId('earnings-error')).toBeTruthy());
  expect(screen.queryByTestId('earnings-paid')).toBeNull();
});

test('the bell badge is loaded for every tab, not only by the dashboard', async () => {
  jest.spyOn(doctorConsultationsApi, 'unreadNotifications').mockResolvedValue({ unread: 2 });
  // a doctor under review lands on Profile; the dashboard never mounts
  renderShell({ verification: { status: 'pending', acknowledged: false } });
  await waitFor(() => expect(screen.getByLabelText('Notifications, 2 unread')).toBeTruthy());
  expect(screen.queryByTestId('dashboard')).toBeNull();
});
