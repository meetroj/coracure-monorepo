import React from 'react';
import { doctorClarificationApi, doctorConsultationsApi, doctorProfileApi } from '@coracure/api';
import { confirm, confirmDiscard } from '../components/confirm';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';

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

test('a referral sent mid-call lands on its thread, and Back still leads to the call', async () => {
  const posted = {
    id: 'c1c1c1c1-0000-4000-8000-000000000000',
    title: 'Anxiety, restlessness and difficulty sleeping',
    topic: 'Treatment plan review',
    patientAge: 32,
    patientGender: 'male' as const,
    briefHistory: 'Anxiety, restlessness and difficulty sleeping',
    diagnosis: 'Provisional: generalised anxiety disorder',
    currentPlan: 'No medicines started',
    specificDoubt: 'Is a short course of a sleep aid reasonable alongside the SSRI?',
    urgency: 'routine' as const,
    status: 'draft' as const,
    assignedAt: null,
    messages: [],
    attachmentIds: [],
    createdAt: new Date().toISOString(),
    sourceConsultationId: null,
    expertDoctorId: null,
    postedAt: null,
    closedAt: null,
  };
  jest.spyOn(doctorClarificationApi, 'createCase').mockResolvedValue(posted);
  jest.spyOn(doctorClarificationApi, 'postCase').mockResolvedValue({ ...posted, status: 'posted', postedAt: new Date().toISOString() });

  const call = joinCall();
  tap('action-note');
  tap('refer-clarification');
  // the case supplies the story; the doctor adds the working diagnosis and the question
  fireEvent.changeText(topmost('diagnosis'), 'Provisional: generalised anxiety disorder');
  tap('continue');
  fireEvent.changeText(topmost('question'), 'Is a short course of a sleep aid reasonable alongside the SSRI?');
  tap('continue');
  tap('confirm');
  // posting asks who reviews it; leaving it to CoraCure goes to the admin's queue
  jest.spyOn(doctorClarificationApi, 'listExperts').mockResolvedValue([{ id: 'e1e1e1e1-0000-4000-8000-000000000000', fullName: 'Dr Vikram Sethi', specialty: 'Psychiatry' }]);
  tap('submit');
  tap('expert-confirm');

  await waitFor(() => expect(topmost('clarification-thread')).toBeTruthy());
  expect(doctorClarificationApi.postCase).toHaveBeenCalledWith(posted.id, undefined);
  // Refer from this consultation now reopens this case rather than starting another
  expect(getState().records.a1.clarificationId).toBe(posted.id);
  expect(topmost('awaiting-assignment')).toBeTruthy();
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

test('a length chosen in Profile is the one Availability shows', async () => {
  jest.spyOn(doctorProfileApi, 'updateProfile').mockResolvedValue({ consultationDurationMinutes: 20 } as never);
  render(<ConsultationDurationScreen onBack={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.press(screen.getByTestId('duration-20'));
  fireEvent.press(screen.getByTestId('save-duration'));
  await waitFor(() => expect(getState().availability.durationMin).toBe(20));
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

test('a half-written closing note asks before it is dropped', async () => {
  jest.spyOn(doctorConsultationsApi, 'listSafetyAlerts').mockResolvedValue([
    {
      id: 'al1',
      alertType: 'red_flag',
      consultationId: 'a1', // the appointment's real id, not its human reference code
      patientId: 'PT-10482',
      patientInitials: 'RS',
      patientName: 'Rahul Sharma',
      patientAge: 32,
      patientGender: 'male',
      checkinResponseId: null,
      reason: 'Reported thoughts of self-harm',
      state: 'acknowledged',
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: { type: 'doctor', id: 'd1' },
      closedAt: null,
      closingNote: null,
      createdAt: new Date().toISOString(),
    },
  ]);
  renderShell();
  fireEvent.press(screen.getByTestId('open-alerts'));
  await waitFor(() => screen.getByTestId('open-al1'));
  tap('open-al1');
  fireEvent.changeText(topmost('note'), 'Called the patient; safety plan agreed.');
  pressBack();
  expect(confirmDiscard).toHaveBeenCalled();
});

/* ------------------------------ small touches ------------------------------ */

test('the doctor’s photo and name on the Dashboard open Profile', () => {
  renderShell();
  fireEvent.press(screen.getByTestId('open-profile'));
  expect(screen.getByTestId('profile')).toBeTruthy();
});

test('“Other” on Request a Report is a plain choice, with no ⋮ that looks like a menu', () => {
  const { DOC_TYPES } = require('../data/documents');
  expect(DOC_TYPES.find((t: { key: string }) => t.key === 'other').icon).toBeUndefined();
});
