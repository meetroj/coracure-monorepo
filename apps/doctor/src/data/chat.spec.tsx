import { doctorChatApi } from '@coracure/api';
import type { ChatMessageRecord, ChatThreadSummary } from '@coracure/api';
import { renderHook, waitFor } from '@testing-library/react-native';

import { refreshChatThreads, sendToThread, toThread, useChatThread } from './chat';
import { toAppNotification } from './notifications';
import { mergeThreadMessages, threadForAppointment } from '../state/actions';
import { getState, setState } from '../state/store';
import { appointments } from './doctor';

const PATIENT = '44444444-4444-4444-8444-444444444444';

const row = (id: string, minute: number, sender: 'patient' | 'doctor' = 'patient', body = id): ChatMessageRecord => ({
  id,
  sender,
  body,
  attachmentFileName: null,
  createdAt: `2026-05-15T09:${String(minute).padStart(2, '0')}:00.000Z`,
});

const summary = (over: Partial<ChatThreadSummary> = {}): ChatThreadSummary => ({
  threadId: 't-1',
  counterpart: { type: 'patient', id: PATIENT, initials: 'RS', age: 32, gender: 'male' },
  lastMessage: row('m9', 9),
  unreadCount: 2,
  ...over,
});

/** A real consultation with this patient, loaded in the store. */
const real = () => ({ ...appointments[0], id: '33333333-3333-4333-8333-333333333333', patientId: PATIENT });
const thread = () => getState().threads.find((t) => t.id === PATIENT)!;

test('a thread is keyed by the patient and named from their loaded consultation', () => {
  const t = toThread(summary(), [real()]);
  expect(t).toMatchObject({ id: PATIENT, patientId: PATIENT, name: real().name, context: real().consultationId, appointmentId: real().id, unread: 2 });
});

test('with no consultation loaded the server’s initials stand in — never an invented name', () => {
  const t = toThread(summary(), []);
  expect(t).toMatchObject({ name: 'RS', context: '32 yrs · Male' });
  expect(t.appointmentId).toBeUndefined();
});

test('a list refresh keeps loaded messages and a thread not written in yet', async () => {
  setState((s) => ({ ...s, appointments: [...s.appointments, real()], threads: [] }));
  // opened from the appointment: exists here, not on the server
  expect(threadForAppointment(real().id)).toBe(PATIENT);
  jest.spyOn(doctorChatApi, 'listThreads').mockResolvedValue([]);
  await refreshChatThreads();
  expect(thread()).toBeTruthy();

  mergeThreadMessages(PATIENT, [{ id: 'm1', from: 'them', body: 'hello', at: '', createdAt: row('m1', 1).createdAt }]);
  (doctorChatApi.listThreads as jest.Mock).mockResolvedValue([summary()]);
  await refreshChatThreads();
  expect(thread().messages.map((m) => m.id)).toEqual(['m1']);
  expect(thread().unread).toBe(2);
});

test('a poll of the newest page neither drops an earlier page nor doubles a message', () => {
  setState((s) => ({ ...s, appointments: [...s.appointments, real()], threads: [] }));
  threadForAppointment(real().id);
  const msg = (id: string, minute: number) => ({ id, from: 'them' as const, body: id, at: '', createdAt: row(id, minute).createdAt });

  mergeThreadMessages(PATIENT, [msg('m3', 3), msg('m4', 4)]);
  mergeThreadMessages(PATIENT, [msg('m1', 1), msg('m2', 2)]); // "load earlier"
  mergeThreadMessages(PATIENT, [msg('m5', 5), msg('m4', 4)]); // the next poll, newest first
  expect(thread().messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5']);
  expect(thread().lastMessage).toBe('m5');

  // nothing new: the same state object, so nothing re-renders
  const before = getState();
  mergeThreadMessages(PATIENT, [msg('m5', 5)]);
  expect(getState()).toBe(before);
});

test('a real thread sends through the server; a fixture thread never calls it', async () => {
  setState((s) => ({ ...s, appointments: [...s.appointments, real()] }));
  threadForAppointment(real().id);
  const send = jest.spyOn(doctorChatApi, 'sendMessage').mockResolvedValue(row('m7', 7, 'doctor', 'Take it after dinner.'));

  await sendToThread(PATIENT, 'Take it after dinner.');
  expect(send).toHaveBeenCalledWith(PATIENT, 'Take it after dinner.');
  expect(thread().messages[thread().messages.length - 1]).toMatchObject({ id: 'm7', from: 'me', body: 'Take it after dinner.' });

  await sendToThread('th3', 'local only');
  expect(send).toHaveBeenCalledTimes(1);
});

test('a refused send leaves the thread as it was', async () => {
  setState((s) => ({ ...s, appointments: [...s.appointments, real()], threads: [] }));
  threadForAppointment(real().id);
  jest.spyOn(doctorChatApi, 'sendMessage').mockRejectedValue(new Error('THREAD_NOT_FOUND'));

  await expect(sendToThread(PATIENT, 'hello')).rejects.toThrow();
  expect(thread().messages).toEqual([]);
});

test('opening a thread loads it and marks it read once per new patient message', async () => {
  setState((s) => ({ ...s, appointments: [...s.appointments, real()], threads: [] }));
  threadForAppointment(real().id);
  setState((s) => ({ ...s, threads: s.threads.map((t) => ({ ...t, unread: 2 })) }));
  jest.spyOn(doctorChatApi, 'listMessages').mockResolvedValue([row('m2', 2), row('m1', 1, 'doctor')]);
  const read = jest.spyOn(doctorChatApi, 'markRead').mockResolvedValue(undefined);

  const hook = renderHook(() => useChatThread(PATIENT, true));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));

  // oldest first on screen, whatever order the server sent
  expect(thread().messages.map((m) => m.id)).toEqual(['m1', 'm2']);
  expect(thread().unread).toBe(0);
  expect(read).toHaveBeenCalledTimes(1);
  // one page, not a full one: nothing earlier to offer
  expect(hook.result.current.hasEarlier).toBe(false);
  hook.unmount();
});

test('a covered thread fetches nothing, so nothing is marked read unseen', () => {
  const list = jest.spyOn(doctorChatApi, 'listMessages').mockResolvedValue([]);
  renderHook(() => useChatThread(PATIENT, false)).unmount();
  renderHook(() => useChatThread('th1', true)).unmount(); // a fixture thread is never the server's
  expect(list).not.toHaveBeenCalled();
});

test('a chat notification opens that patient’s conversation', () => {
  const n = toAppNotification({
    id: 'n1',
    templateCode: 'chat_message',
    title: 'New message',
    body: 'You have a new message. Open the app to read it.',
    deepLinkData: { screen: 'chat', patientId: PATIENT, doctorId: 'd-1' },
    consultationId: null,
    status: 'sent',
    createdAt: new Date().toISOString(),
    readAt: null,
  });
  expect(n.target).toEqual({ route: 'chat', patientId: PATIENT });
});
