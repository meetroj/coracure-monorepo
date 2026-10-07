import React from 'react';
import { doctorNotificationsApi } from '@coracure/api';
import type { DoctorNotificationRecord } from '@coracure/api';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';

import NotificationsScreen from './NotificationsScreen';
import ChatListScreen from './ChatListScreen';
import ChatThreadScreen from './ChatThreadScreen';
import { getState } from '../../state/store';
import { selectUnreadMessageCount } from '../../state/selectors';

/* ------------------------------ notifications ------------------------------ */

/**
 * Real notifications carry only `title`/`body`/`consultationId`/`readAt` —
 * `deepLinkData` is opaque (API_CONTRACT types it `unknown`, no documented
 * shape), so this screen no longer invents a `kind` beyond "tied to a
 * consultation or not". The old local-fixture tests asserted against
 * fabricated `kind`/`target` richness (`documentFulfilled`, an instant-request
 * notice that disappeared on its own) that the server never actually sends —
 * these are rewritten against what the real payload can honestly produce.
 */
const record = (over: Partial<DoctorNotificationRecord>): DoctorNotificationRecord => ({
  id: 'n1',
  templateCode: 'safety_alert',
  title: 'Red flag check-in',
  body: 'Rahul Sharma reported a safety concern in today’s check-in.',
  deepLinkData: null,
  consultationId: null,
  status: 'sent',
  createdAt: new Date().toISOString(),
  readAt: null,
  ...over,
});

const fixture: DoctorNotificationRecord[] = [
  record({ id: 'n1', readAt: null }),
  record({ id: 'n2', title: 'Appointment confirmed', body: 'Priya Singh confirmed the 5:30 PM audio consultation.', consultationId: 'a6', readAt: null }),
  record({ id: 'n4', title: 'Payout processed', body: 'Your monthly payout has been sent.', readAt: new Date().toISOString() }),
];

beforeEach(() => {
  jest.spyOn(doctorNotificationsApi, 'listNotifications').mockResolvedValue(fixture);
  jest.spyOn(doctorNotificationsApi, 'markAllNotificationsRead').mockResolvedValue({ marked: 2 });
  jest.spyOn(doctorNotificationsApi, 'markNotificationRead').mockResolvedValue(undefined);
});

test('unread notifications are marked, and Mark all read clears them', async () => {
  const ui = render(<NotificationsScreen onBack={jest.fn()} onOpen={jest.fn()} />);
  await waitFor(() => expect(ui.getByTestId('unread-n1')).toBeTruthy());
  expect(ui.queryByTestId('unread-n4')).toBeNull();

  (doctorNotificationsApi.listNotifications as jest.Mock).mockResolvedValueOnce(
    fixture.map((n) => ({ ...n, readAt: new Date().toISOString() }))
  );
  fireEvent.press(ui.getByTestId('mark-all-read'));
  await waitFor(() => expect(doctorNotificationsApi.markAllNotificationsRead).toHaveBeenCalled());
  await waitFor(() => expect(ui.queryByTestId('unread-n1')).toBeNull());
  ui.unmount();
});

test('opening one notification passes its real consultation id as the target', async () => {
  const onOpen = jest.fn();
  const ui = render(<NotificationsScreen onBack={jest.fn()} onOpen={onOpen} />);
  await waitFor(() => expect(ui.getByTestId('notif-n2')).toBeTruthy());

  fireEvent.press(ui.getByTestId('notif-n2'));
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'n2', target: { route: 'apptDetails', appointmentId: 'a6' } }));
  ui.unmount();
});

test('opening an unread notification marks that row read and lowers the badge by one', async () => {
  const { setUnreadCount } = require('../../state/actions');
  setUnreadCount(2);
  const ui = render(<NotificationsScreen onBack={jest.fn()} onOpen={jest.fn()} />);
  await waitFor(() => expect(ui.getByTestId('unread-n2')).toBeTruthy());

  fireEvent.press(ui.getByTestId('notif-n2'));
  expect(ui.queryByTestId('unread-n2')).toBeNull();
  expect(ui.getByTestId('unread-n1')).toBeTruthy();
  expect(getState().unreadCount).toBe(1);
  expect(doctorNotificationsApi.markNotificationRead).toHaveBeenCalledWith('n2');

  // a row already read changes nothing
  fireEvent.press(ui.getByTestId('notif-n4'));
  expect(getState().unreadCount).toBe(1);
  expect(doctorNotificationsApi.markNotificationRead).toHaveBeenCalledTimes(1);
  ui.unmount();
});

test('a notification tied to no consultation opens as a plain read — there is nowhere honest to send it', async () => {
  const onOpen = jest.fn();
  const ui = render(<NotificationsScreen onBack={jest.fn()} onOpen={onOpen} />);
  await waitFor(() => expect(ui.getByTestId('notif-n1')).toBeTruthy());

  fireEvent.press(ui.getByTestId('notif-n1'));
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1', target: { route: 'none' } }));
  ui.unmount();
});

/* ---------------------------------- chat ----------------------------------- */

test('the chat list counts unread messages from the threads themselves', () => {
  render(<ChatListScreen onBack={jest.fn()} onOpenThread={jest.fn()} />);
  expect(selectUnreadMessageCount(getState())).toBe(getState().threads.reduce((n, t) => n + t.unread, 0));
  expect(screen.getByTestId('thread-th1')).toBeTruthy();
});

test('with no conversations the list says so, and expert discussion points to Clarifications', () => {
  require('../../state/store').setState((s: ReturnType<typeof getState>) => ({ ...s, threads: [] }));
  render(<ChatListScreen onBack={jest.fn()} onOpenThread={jest.fn()} />);
  expect(screen.getByText('No messages yet')).toBeTruthy();
  expect(screen.getByText(/Discussions with experts are in Clarifications/)).toBeTruthy();
  expect(screen.queryByTestId('tfilter-expert')).toBeNull();
});

test('a sent message stays in the thread and becomes the latest line in the list', () => {
  const thread = () => getState().threads.find((t) => t.id === 'th3')!;
  const r = render(<ChatThreadScreen thread={thread()} onBack={jest.fn()} onOpenDoc={jest.fn()} onOpenContext={jest.fn()} />);
  expect(screen.getByTestId('send')).toBeDisabled();
  fireEvent.changeText(screen.getByTestId('composer'), 'Please take the evening dose after dinner.');
  fireEvent.press(screen.getByTestId('send'));
  expect(thread().messages[thread().messages.length - 1].body).toBe('Please take the evening dose after dinner.');
  expect(screen.getByTestId('composer').props.value).toBe('');
  r.unmount();

  // leaving and coming back finds it
  render(<ChatListScreen onBack={jest.fn()} onOpenThread={jest.fn()} />);
  expect(screen.getByText('Please take the evening dose after dinner.')).toBeTruthy();
});

test('a shared file in a thread opens the document it names', () => {
  const onOpenDoc = jest.fn();
  const thread = getState().threads.find((t) => t.id === 'th1')!;
  render(<ChatThreadScreen thread={thread} onBack={jest.fn()} onOpenDoc={onOpenDoc} onOpenContext={jest.fn()} />);
  const file = screen.getAllByTestId(/^file-/)[0];
  fireEvent.press(file);
  expect(onOpenDoc).toHaveBeenCalledWith(expect.stringMatching(/^d\d+$/));
});
