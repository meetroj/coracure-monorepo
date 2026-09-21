import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

import AppShell from '../AppShell';
import ConsultationRoomScreen from './ConsultationRoomScreen';
import { appointments, detailFor } from '../../data/doctor';

const noop = () => undefined;
const rahul = appointments.find((a) => a.id === 'a1')!;

/** Deterministic clock so the timer can be asserted. */
const fakeClock = (start = 1_000_000) => {
  let t = start;
  return { now: () => t, advance: (sec: number) => (t += sec * 1000) };
};

test('the room is reachable only from an assigned appointment, and hides the tabs', () => {
  const { getByTestId, getByText, queryByTestId } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByTestId('tab-appointments'));
  fireEvent.press(getByTestId('appt-a1'));
  fireEvent.press(getByTestId('join-consultation'));

  expect(getByText('Consultation Room')).toBeTruthy();
  expect(getByText('End-to-end encrypted')).toBeTruthy();
  expect(queryByTestId('tab-appointments')).toBeNull();
});

test('back after the call walks the post-call trail one step at a time', () => {
  const { getByTestId, getByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByTestId('tab-appointments'));
  fireEvent.press(getByTestId('appt-a1'));
  fireEvent.press(getByTestId('join-consultation'));

  // end the call -> clinical notes
  fireEvent.press(getByTestId('ctl-end'));
  expect(getByText(/Clinical Notes/)).toBeTruthy();

  // notes -> prescription
  fireEvent.press(getByTestId('save-notes'));
  expect(getByText('E-Prescription')).toBeTruthy();

  // back must land on the notes, NOT jump the whole way out of the flow
  fireEvent.press(getByTestId('back'));
  expect(getByText(/Clinical Notes/)).toBeTruthy();

  // one more back returns to the appointment that opened the room — the ended
  // room itself is never re-entered, because `onEnd` replaced it.
  fireEvent.press(getByTestId('back'));
  expect(getByText('Presenting Complaint')).toBeTruthy();
});

test('the timer counts from the moment the doctor joined', () => {
  jest.useFakeTimers();
  const clock = fakeClock();
  const { getByTestId } = render(
    <ConsultationRoomScreen appointment={rahul} onBack={noop} now={clock.now} />
  );

  expect(getByTestId('call-timer').props.children).toBe('00:00:00');

  act(() => {
    clock.advance(444); // 7m 24s
    jest.advanceTimersByTime(1000);
  });
  expect(getByTestId('call-timer').props.children).toBe('00:07:24');
  jest.useRealTimers();
});

test('ending the call stamps join, leave and duration against the consultation', () => {
  jest.useFakeTimers();
  const clock = fakeClock();
  const onEnd = jest.fn();
  const { getByTestId } = render(
    <ConsultationRoomScreen appointment={rahul} onBack={noop} onEnd={onEnd} now={clock.now} />
  );

  act(() => {
    clock.advance(90);
    jest.advanceTimersByTime(1000);
  });
  fireEvent.press(getByTestId('ctl-end'));

  const log = onEnd.mock.calls[0][0];
  expect(log.durationSeconds).toBe(90);
  expect(log.leftAt - log.joinedAt).toBe(90_000);
  expect(log.appointmentId).toBe(detailFor(rahul).appointmentId);
  jest.useRealTimers();
});

test('mute and video are togglable and labelled for their next action', () => {
  const { getByTestId, getByLabelText } = render(
    <ConsultationRoomScreen appointment={rahul} onBack={noop} />
  );

  expect(getByLabelText('Mute')).toBeTruthy();
  fireEvent.press(getByTestId('ctl-mute'));
  expect(getByLabelText('Unmute')).toBeTruthy();

  expect(getByLabelText('Stop Video')).toBeTruthy();
  fireEvent.press(getByTestId('ctl-video'));
  expect(getByLabelText('Start Video')).toBeTruthy();
});

test('a note started in the call stays a draft until finalised after it', () => {
  const onAction = jest.fn();
  const { getByTestId, queryByTestId, getByText } = render(
    <ConsultationRoomScreen appointment={rahul} onBack={noop} onAction={onAction} />
  );

  expect(queryByTestId('draft-note')).toBeNull();
  fireEvent.press(getByTestId('action-note'));

  expect(onAction).toHaveBeenCalledWith('note');
  expect(getByTestId('draft-note')).toBeTruthy();
  expect(getByText(/Finalise it with the case summary after the call/)).toBeTruthy();
});

test('the concern shows intake wording and its duration and severity', () => {
  const { getByText } = render(<ConsultationRoomScreen appointment={rahul} onBack={noop} />);

  expect(getByText('Anxiety and difficulty sleeping')).toBeTruthy();
  expect(getByText('2 weeks')).toBeTruthy();
  expect(getByText('Moderate')).toBeTruthy();
});

test('the concern is never presented as a diagnosis', () => {
  const { queryByText } = render(<ConsultationRoomScreen appointment={rahul} onBack={noop} />);

  // the visible "Patient reported" chip and footnote were removed by request.
  // The guard that remains: nothing on this screen may call it a diagnosis.
  [/diagnos/i, /confirmed/i].forEach((re) => expect(queryByText(re)).toBeNull());
});

test('patient context stays collapsed behind one row', () => {
  const { getByTestId, queryByText, getByText } = render(
    <ConsultationRoomScreen appointment={rahul} onBack={noop} />
  );

  expect(getByText('View details')).toBeTruthy();
  expect(queryByText('Total consultations')).toBeNull();

  fireEvent.press(getByTestId('context-row'));
  expect(getByText('Total consultations')).toBeTruthy();
  expect(getByText('Previous consultation')).toBeTruthy();
});

test('there is no way to record the session', () => {
  const { queryByLabelText } = render(<ConsultationRoomScreen appointment={rahul} onBack={noop} />);

  ['Record', 'Start recording', 'Record call'].forEach((l) =>
    expect(queryByLabelText(l)).toBeNull()
  );
});

test('the psychiatry action set excludes lab ordering', () => {
  const { getByText, queryByText } = render(
    <ConsultationRoomScreen appointment={rahul} onBack={noop} />
  );

  ['Add Clinical Note', 'Create Prescription', 'Assign Follow-up', 'Request Report'].forEach((l) =>
    expect(getByText(l)).toBeTruthy()
  );
  expect(queryByText('Order Lab Test')).toBeNull();
});

test('full screen expands the video and hides the header until collapsed', () => {
  const { getByTestId, getByText, queryByText } = render(
    <ConsultationRoomScreen appointment={rahul} onBack={noop} />
  );

  expect(getByText('Consultation Room')).toBeTruthy();
  expect(getByText('Patient Summary')).toBeTruthy();

  fireEvent.press(getByTestId('toggle-fullscreen'));
  expect(queryByText('Consultation Room')).toBeNull();
  expect(queryByText('Patient Summary')).toBeNull();

  fireEvent.press(getByTestId('toggle-fullscreen'));
  expect(getByText('Consultation Room')).toBeTruthy();
  expect(getByText('Patient Summary')).toBeTruthy();
});
