import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';

import NotificationsScreen from './NotificationsScreen';
import ChatListScreen from './ChatListScreen';
import ChatThreadScreen from './ChatThreadScreen';
import { getState } from '../../state/store';
import { selectUnreadNotificationCount, selectUnreadMessageCount } from '../../state/selectors';
import { markNotificationRead, setInstant } from '../../state/actions';

/* ------------------------------ notifications ------------------------------ */

test('unread notifications are marked, and Mark all read clears them', () => {
  render(<NotificationsScreen onBack={jest.fn()} onOpen={jest.fn()} />);
  expect(screen.getByTestId('unread-n1')).toBeTruthy();
  expect(screen.queryByTestId('unread-n4')).toBeNull();
  fireEvent.press(screen.getByTestId('mark-all-read'));
  expect(screen.queryByTestId('unread-n1')).toBeNull();
  expect(selectUnreadNotificationCount(getState())).toBe(0);
});

test('opening one notification passes its target and reading it lowers the count', () => {
  const onOpen = jest.fn();
  render(<NotificationsScreen onBack={jest.fn()} onOpen={onOpen} />);
  fireEvent.press(screen.getByTestId('notif-n2'));
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'n2', target: expect.objectContaining({ docId: 'd2' }) }));
  const before = selectUnreadNotificationCount(getState());
  markNotificationRead('n2');
  expect(selectUnreadNotificationCount(getState())).toBe(before - 1);
});

test('an instant request notice disappears once the request is answered', () => {
  render(<NotificationsScreen onBack={jest.fn()} onOpen={jest.fn()} />);
  expect(screen.getByTestId('notif-n6')).toBeTruthy();
  act(() => setInstant('declined'));
  expect(screen.queryByTestId('notif-n6')).toBeNull();
});

/* ---------------------------------- chat ----------------------------------- */

test('the chat list counts unread messages from the threads themselves', () => {
  render(<ChatListScreen onBack={jest.fn()} onOpenThread={jest.fn()} />);
  expect(selectUnreadMessageCount(getState())).toBe(getState().threads.reduce((n, t) => n + t.unread, 0));
  expect(screen.getByTestId('thread-th1')).toBeTruthy();
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
