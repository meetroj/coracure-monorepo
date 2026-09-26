import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';

import ConsultationRoomScreen from './ConsultationRoomScreen';
import { getState } from '../../state/store';
import { selectAppointment } from '../../state/selectors';
import { threadForAppointment } from '../../state/actions';

const appt = () => selectAppointment(getState(), 'a1')!;

const setup = (over: Partial<React.ComponentProps<typeof ConsultationRoomScreen>> = {}) => {
  const props = {
    appointment: appt(),
    onLeave: jest.fn(),
    onEnd: jest.fn(),
    onAction: jest.fn(),
    onViewDetails: jest.fn(),
    onReportIssue: jest.fn(),
    ...over,
  };
  return { props, ...render(<ConsultationRoomScreen {...props} />) };
};

test('the room names the patient and shows the patient ID, not the consultation ID', () => {
  setup();
  expect(screen.getAllByText('Rahul Sharma').length).toBeGreaterThan(0);
  expect(screen.getByText('PT-10482')).toBeTruthy();
  expect(screen.getByText('Secure connection')).toBeTruthy();
  expect(screen.queryByText(/end-to-end/i)).toBeNull();
});

test('the timer counts from when the doctor joined, so re-entering keeps it', () => {
  jest.useFakeTimers();
  let clock = 100_000;
  const now = () => clock;
  const { unmount } = setup({ joinedAt: clock - 65_000, now });
  expect(screen.getByTestId('call-timer')).toHaveTextContent('00:01:05');
  clock += 3_000;
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByTestId('call-timer')).toHaveTextContent('00:01:08');
  unmount();
  jest.useRealTimers();
});

test('ending the call asks first and reports the call log', () => {
  const { props } = setup();
  fireEvent.press(screen.getByTestId('ctl-end'));
  expect(Alert.alert).toHaveBeenLastCalledWith('End consultation?', expect.any(String), expect.any(Array), expect.any(Object));
  expect(props.onEnd).toHaveBeenCalledWith(expect.objectContaining({ appointmentId: 'a1', consultationId: 'CON-10482' }));
});

test('choosing to continue the call keeps the doctor in the room', () => {
  (Alert.alert as jest.Mock).mockImplementationOnce((_t: string, _m: string, buttons: { style?: string; onPress?: () => void }[]) =>
    buttons.find((b) => b.style === 'cancel')?.onPress?.()
  );
  const { props } = setup();
  fireEvent.press(screen.getByTestId('ctl-end'));
  expect(props.onEnd).not.toHaveBeenCalled();
});

test('leaving the room asks first', () => {
  const { props } = setup();
  fireEvent.press(screen.getByLabelText('Leave consultation room'));
  expect(Alert.alert).toHaveBeenLastCalledWith('Leave the consultation room?', expect.any(String), expect.any(Array), expect.any(Object));
  expect(props.onLeave).toHaveBeenCalledTimes(1);
});

test('every quick clinical action goes somewhere', () => {
  const { props } = setup();
  (['note', 'rx', 'followUp', 'report'] as const).forEach((k) => fireEvent.press(screen.getByTestId(`action-${k}`)));
  expect(props.onAction.mock.calls.map((c) => c[0])).toEqual(['note', 'rx', 'followUp', 'report']);
});

test('the More menu offers only actions that work', () => {
  const { props } = setup();
  fireEvent.press(screen.getByTestId('ctl-more'));
  fireEvent.press(screen.getByTestId('sheet-action-details'));
  expect(props.onViewDetails).toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('ctl-more'));
  fireEvent.press(screen.getByTestId('sheet-action-issue'));
  expect(props.onReportIssue).toHaveBeenCalled();
  // no add-participant or switch-camera controls that would do nothing
  expect(screen.queryByLabelText(/Add participant/i)).toBeNull();
  expect(screen.queryByLabelText(/Switch camera/i)).toBeNull();
});

test('mute and camera toggle, and a stopped camera shows in the self-view', () => {
  setup();
  fireEvent.press(screen.getByTestId('ctl-mute'));
  expect(screen.getByTestId('ctl-mute')).toBeSelected();
  fireEvent.press(screen.getByTestId('ctl-video'));
  expect(screen.getByTestId('ctl-video')).toBeSelected();
  expect(screen.getByText('Camera off')).toBeTruthy();
});

test('in-call chat sends to the patient’s own thread', () => {
  const threadId = threadForAppointment('a1')!;
  setup({ threadId });
  fireEvent.press(screen.getByTestId('ctl-chat'));
  fireEvent.changeText(screen.getByTestId('room-chat-input'), 'Please turn up your volume.');
  fireEvent.press(screen.getByTestId('room-chat-send'));
  const thread = getState().threads.find((t) => t.id === threadId)!;
  expect(thread.patientId).toBe('PT-10482');
  expect(thread.messages[thread.messages.length - 1].body).toBe('Please turn up your volume.');
});
