import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';

import { renderShell, tap, on, pressBack, topmost } from '../test/app';
import { getState } from '../state/store';
import { CONSULTATION_DURATIONS, initialSchedule } from '../data/doctor';
import { TODAY, toISODate } from '../data/calendar';
import { ConsultationDurationScreen } from './screens/profile/ProfileSettingsScreens';
import { AvailabilityScreen } from './screens/AvailabilityScreen';
import { todayHoursLabel } from './screens/DashboardScreen';

/**
 * The client walkthrough, in the real navigator: a live call and everything
 * opened from it, and the settings a doctor changes during the demo.
 */

const joinCall = () => {
  renderShell();
  fireEvent.press(screen.getByTestId('next-join'));
  const call = getState().activeCall!;
  expect(call.appointmentId).toBe('a1');
  return call;
};

/** Still the same call: same consultation, same start time, one room on the stack. */
const expectSameCall = (call: { appointmentId: string; joinedAt: number }) => {
  expect(getState().activeCall).toEqual(call);
  expect(screen.getAllByTestId('consultation-room')).toHaveLength(1);
};

/* ------------------------------ the live call ------------------------------ */

test('Refer during a live consultation opens on this patient, and Back returns to the same call', () => {
  const call = joinCall();
  tap('action-note');
  tap('refer-clarification');

  // the consultation under way is the case — not an empty picker
  const form = on('create-clarification');
  expect(form.getByText('Rahul Sharma')).toBeTruthy();
  expect(form.getByText('Consultation CON-10482')).toBeTruthy();
  tap('change-case');
  expect(topmost('select-case-a1')).toBeTruthy();
  tap('select-case-a1');

  pressBack();
  expect(screen.queryByTestId('create-clarification')).toBeNull();
  pressBack();
  expect(screen.queryByTestId('clinical-notes')).toBeNull();
  expectSameCall(call);
});

test('a referral sent mid-call lands on its thread, and Back still leads to the call', () => {
  const call = joinCall();
  tap('action-note');
  tap('refer-clarification');
  // the case supplies the story; the doctor adds the working diagnosis and the question
  fireEvent.changeText(topmost('diagnosis'), 'Provisional: generalised anxiety disorder');
  tap('continue');
  fireEvent.changeText(topmost('question'), 'Is a short course of a sleep aid reasonable alongside the SSRI?');
  tap('continue');
  tap('confirm');
  tap('submit');

  expect(topmost('clarification-thread')).toBeTruthy();
  expect(getState().records.a1.clarificationId).toBeTruthy();
  pressBack();
  pressBack();
  expectSameCall(call);
});

test('the call survives Notes, Prescription, Chat and Follow-up, and Back always lands in it', () => {
  const call = joinCall();

  tap('action-note');
  expect(topmost('clinical-notes')).toBeTruthy();
  pressBack();
  expectSameCall(call);

  tap('action-rx');
  expect(topmost('prescription')).toBeTruthy();
  pressBack();
  expectSameCall(call);

  tap('ctl-chat');
  expect(topmost('room-chat')).toBeTruthy();
  tap('room-chat-close');
  expectSameCall(call);

  tap('action-followUp');
  expect(topmost('assign-plan')).toBeTruthy();
  pressBack();
  expectSameCall(call);
});

/* ------------------------------ prescriptions ------------------------------ */

test('a new prescription starts blank, with nothing pre-written', () => {
  joinCall();
  tap('action-rx');
  const rx = getState().records.a1;
  expect([rx?.medicines ?? [], rx?.advice ?? [], rx?.donts ?? []]).toEqual([[], [], []]);
  expect(on('prescription').getByText(/Add at least one medicine or an advice item/)).toBeTruthy();
});

/* ------------------------------ one duration ------------------------------ */

test('Profile and Availability offer exactly the same consultation lengths', () => {
  const minutes = CONSULTATION_DURATIONS.map((d) => d.minutes);

  const profile = render(<ConsultationDurationScreen onBack={jest.fn()} onSaved={jest.fn()} />);
  expect(screen.getAllByTestId(/^duration-\d+$/).map((n) => Number(n.props.testID.slice('duration-'.length)))).toEqual(minutes);
  profile.unmount();

  render(<AvailabilityScreen />);
  fireEvent.press(screen.getByTestId('setting-duration'));
  expect(screen.getAllByTestId(/^setting-option-\d+$/).map((n) => Number(n.props.testID.slice('setting-option-'.length)))).toEqual(minutes);
});

test('a length chosen in Profile is the one Availability shows', () => {
  render(<ConsultationDurationScreen onBack={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.press(screen.getByTestId('duration-20'));
  fireEvent.press(screen.getByTestId('save-duration'));
  expect(getState().availability.durationMin).toBe(20);
  screen.unmount();

  render(<AvailabilityScreen />);
  expect(screen.getByLabelText('Consultation duration, 20 minutes')).toBeTruthy();
});

test('today’s hours follow time off, then a date exception, then the weekly schedule', () => {
  const today = toISODate(TODAY);
  expect(todayHoursLabel(initialSchedule, [], [{ id: 'l', date: today, reason: 'Personal leave' }])).toBe('Time off today');
  expect(todayHoursLabel(initialSchedule, [{ id: 'o', date: today, from: '09:00 AM', to: '01:00 PM' }], [])).toBe('09:00 AM – 01:00 PM');
});

/* ------------------------------ unsaved work ------------------------------ */

test('a half-written alert review asks before it is dropped', () => {
  renderShell();
  fireEvent.press(screen.getByTestId('nav-notifications'));
  tap('notif-n1');
  fireEvent.changeText(topmost('note'), 'Called the patient; safety plan agreed.');
  pressBack();
  expect(Alert.alert).toHaveBeenLastCalledWith('Discard changes?', expect.any(String), expect.any(Array), expect.any(Object));
});
