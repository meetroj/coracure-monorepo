import React from 'react';
import { Alert, BackHandler } from 'react-native';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react-native';

import { renderShell, tap, on, pressBack, topmost } from '../test/app';
import { getState } from '../state/store';
import {
  AppointmentDetailsRoute,
  AlertDetailRoute,
  CaseDetailRoute,
  ChatThreadRoute,
  DocumentViewerRoute,
  PatientDocumentsRoute,
  SupportIssueRoute,
} from './navigation/routes';

/**
 * Android's hardware back, as the OS delivers it: the most recent listener
 * runs first, and the app either handles it (true) or lets the OS go back.
 */
const pressHardwareBack = (): boolean => {
  const calls = (BackHandler.addEventListener as jest.Mock).mock.calls.filter(([evt]) => evt === 'hardwareBackPress');
  for (let i = calls.length - 1; i >= 0; i--) {
    let handled = false;
    act(() => {
      handled = !!calls[i][1]();
    });
    if (handled) return true;
  }
  return false;
};

beforeEach(() => {
  jest.spyOn(BackHandler, 'addEventListener');
});

/* --------------------------- back returns to origin ------------------------ */

test('back from a detail returns to the screen that opened it', () => {
  renderShell();
  fireEvent.press(screen.getByTestId('tab-appointments'));
  tap('appt-a2');
  expect(on('appointment-details').getByText('Anita Patel')).toBeTruthy();

  pressBack();
  expect(screen.queryByTestId('appointment-details')).toBeNull();
  expect(screen.getByTestId('appointments')).toBeTruthy();
});

test('back unwinds a multi-level trail one step at a time', () => {
  renderShell();
  fireEvent.press(screen.getByTestId('open-alerts'));
  tap('open-al1');
  expect(screen.getByTestId('alert-detail')).toBeTruthy();

  pressBack();
  expect(screen.queryByTestId('alert-detail')).toBeNull();
  expect(screen.getByTestId('follow-up-alerts')).toBeTruthy();

  pressBack();
  expect(screen.queryByTestId('follow-up-alerts')).toBeNull();
  expect(screen.getByTestId('dashboard')).toBeTruthy();
});

test('a chat thread returns to the chat list, and the list to the dashboard', () => {
  renderShell();
  fireEvent.press(screen.getByTestId('nav-messages'));
  tap('thread-th1');
  expect(screen.getByTestId('composer')).toBeTruthy();
  pressBack();
  expect(screen.getByTestId('chat-list')).toBeTruthy();
  pressBack();
  expect(screen.queryByTestId('chat-list')).toBeNull();
});

test('pressing the active tab again returns its stack to the root', async () => {
  renderShell();
  fireEvent.press(screen.getByTestId('open-tasks'));
  expect(screen.getByTestId('pending-tasks')).toBeTruthy();
  fireEvent.press(screen.getByTestId('tab-dashboard'));
  // the stack pops on the next frame, as it does on device; the wider budget
  // covers a loaded parallel test run, where that frame can arrive late
  await waitFor(() => expect(screen.queryAllByTestId('pending-tasks')).toHaveLength(0), { timeout: 5000 });
});

/* ------------------------ android hardware back button --------------------- */

test('hardware back pops the stack instead of closing the app', () => {
  renderShell();
  fireEvent.press(screen.getByTestId('open-alerts'));
  tap('open-al1');

  expect(pressHardwareBack()).toBe(true);
  expect(screen.queryByTestId('alert-detail')).toBeNull();
  expect(pressHardwareBack()).toBe(true);
  expect(screen.getByTestId('dashboard')).toBeTruthy();
});

test('hardware back at a tab root is left to the OS', () => {
  renderShell();
  expect(pressHardwareBack()).toBe(false);
  expect(screen.getByTestId('dashboard')).toBeTruthy();
});

test('hardware back closes an open sheet before anything else', () => {
  renderShell();
  fireEvent.press(screen.getByTestId('status-trigger'));
  expect(screen.getByTestId('status-sheet')).toBeTruthy();
  expect(pressHardwareBack()).toBe(true);
  expect(screen.queryByTestId('status-sheet')).toBeNull();
  expect(screen.getByTestId('dashboard')).toBeTruthy();
});

/* ------------------------- unsaved changes are protected -------------------- */

test('leaving a form with unsaved changes asks first, and Keep editing stays', () => {
  renderShell();
  fireEvent.press(screen.getByTestId('tab-appointments'));
  tap('appt-a2');
  tap('request-document');
  fireEvent.changeText(topmost('item-name'), 'Thyroid profile');

  (Alert.alert as jest.Mock).mockImplementationOnce((_t: string, _m: string, buttons: { style?: string; onPress?: () => void }[]) =>
    buttons.find((b) => b.style === 'cancel')?.onPress?.()
  );
  pressBack();
  expect(Alert.alert).toHaveBeenLastCalledWith('Discard changes?', expect.any(String), expect.any(Array), expect.any(Object));
  expect(topmost('item-name').props.value).toBe('Thyroid profile');

  // the same question guards Android's back button
  expect(pressHardwareBack()).toBe(true);
  expect(screen.queryByTestId('request-report')).toBeNull();
});

test('a form with nothing entered leaves without asking', () => {
  renderShell();
  fireEvent.press(screen.getByTestId('tab-profile'));
  tap('row-fee');
  pressBack();
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(screen.queryByTestId('consultation-fee')).toBeNull();
});

test('the consultation room asks before Android back takes the doctor out of a call', () => {
  renderShell();
  fireEvent.press(screen.getByTestId('next-join'));
  expect(getState().activeCall?.appointmentId).toBe('a1');

  expect(pressHardwareBack()).toBe(true);
  expect(Alert.alert).toHaveBeenLastCalledWith('Leave the consultation?', expect.any(String), expect.any(Array), expect.any(Object));
  expect(getState().activeCall).toBeUndefined();
  expect(screen.queryByTestId('consultation-room')).toBeNull();
});

/* --------------------------- notifications routing ------------------------ */

test('each notification opens its own record and is marked read', () => {
  renderShell();
  fireEvent.press(screen.getByTestId('nav-notifications'));

  // the uploaded-document notice opens that document, for that patient
  tap('notif-n2');
  expect(on('document-viewer').getAllByText('Sleep Tracking Report').length).toBeGreaterThan(0);
  expect(on('document-viewer').getByText('Rahul Sharma · PT-10482')).toBeTruthy();
  expect(getState().notifRead.n2).toBe(true);

  pressBack();
  // the red-flag notice opens its alert — Rahul's, not anyone else's
  tap('notif-n1');
  expect(on('alert-detail').getAllByText(/Rahul Sharma/).length).toBeGreaterThan(0);
});

/* ----------------------- one patient, never another's ----------------------- */

test('three patients’ records never bleed into each other', () => {
  renderShell();

  // A — Rahul Sharma, a red-flag alert
  fireEvent.press(screen.getByTestId('open-alerts'));
  tap('open-al1');
  expect(on('alert-detail').getAllByText(/Rahul Sharma/).length).toBeGreaterThan(0);
  expect(on('alert-detail').queryByText(/Neha Pillai/)).toBeNull();
  pressBack();

  // B — Neha Pillai, opened from the same list right after
  tap('open-al2');
  expect(on('alert-detail').getAllByText(/Neha Pillai/).length).toBeGreaterThan(0);
  expect(on('alert-detail').queryByText(/Rahul Sharma/)).toBeNull();
  pressBack();
  pressBack();

  // C — Anita Patel's appointment: her concern and her documents only
  fireEvent.press(screen.getByTestId('tab-appointments'));
  tap('appt-a2');
  const details = on('appointment-details');
  expect(details.getByText('Anita Patel')).toBeTruthy();
  expect(details.queryByText('Rahul Sharma')).toBeNull();
  expect(details.getByTestId('doc-d6')).toBeTruthy();
  expect(details.queryByTestId('doc-d1')).toBeNull();

  // and her thread is her own
  tap('message-patient');
  expect(on('chat-thread').getByText('Anita Patel')).toBeTruthy();
});

/* ----------------------------- missing records ----------------------------- */

const nav = () => ({ goBack: jest.fn(), navigate: jest.fn(), dispatch: jest.fn(), getState: () => ({ routes: [] }) });

test.each([
  ['an appointment', AppointmentDetailsRoute, { appointmentId: 'a-missing' }, 'Could not open this appointment'],
  ['an alert', AlertDetailRoute, { alertId: 'al-missing' }, 'Could not open this alert'],
  ['a case', CaseDetailRoute, { appointmentId: 'a7' }, 'Could not open this case'],
  ['a conversation', ChatThreadRoute, { threadId: 'th-missing' }, 'Could not open this conversation'],
  ['a document', DocumentViewerRoute, { docId: 'd-missing' }, 'Could not open this document'],
  ['a patient', PatientDocumentsRoute, { patientId: 'PT-00000' }, 'Could not open this patient'],
  ['a support issue', SupportIssueRoute, { issueId: 'si-missing' }, 'Could not open this issue'],
])('a link to %s that no longer exists says so and offers the way back', (_what, Route, params, message) => {
  const n = nav();
  const R = Route as unknown as React.ComponentType<{ route: object; navigation: object }>;
  render(<R route={{ key: 'k', name: 'x', params }} navigation={n} />);
  expect(screen.getByText(message)).toBeTruthy();
  fireEvent.press(screen.getByTestId('not-found-back'));
  expect(n.goBack).toHaveBeenCalled();
});
