import React from 'react';
import { doctorFollowupApi } from '@coracure/api';
import type { FollowupPathway, FollowupPlan, SafetyAlert } from '@coracure/api';
import { doctorConsultationsApi, doctorClinicalRecordApi } from '@coracure/api';
import { ApiError } from '@coracure/api/errors';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';

import PatientFollowUpDetailScreen from './PatientFollowUpDetailScreen';
import AssignFollowUpPlanScreen from './AssignFollowUpPlanScreen';
import { appointments } from '../../data/doctor';

const alert = (over: Partial<SafetyAlert>): SafetyAlert => ({
  id: 'al1',
  alertType: 'red_flag',
  consultationId: 'CON-10482',
  patientId: 'PT-10482',
  patientInitials: 'RS',
  patientName: 'Rahul Sharma',
  patientAge: 32,
  patientGender: 'male',
  checkinResponseId: null,
  reason: 'Reported thoughts of self-harm',
  state: 'open',
  acknowledgedAt: null,
  acknowledgedBy: null,
  closedAt: null,
  closingNote: null,
  createdAt: new Date().toISOString(),
  ...over,
});

beforeEach(() => {
  jest.spyOn(doctorFollowupApi, 'getFollowupPlan').mockResolvedValue({
    consultationId: 'CON-10482',
    status: 'none',
    pathway: null,
    startsOn: null,
    endsOn: null,
    durationDays: null,
    todayIsDay: null,
  });
  jest.spyOn(doctorFollowupApi, 'listCheckins').mockResolvedValue([]);
  jest
    .spyOn(doctorClinicalRecordApi, 'getClinicalRecord')
    .mockRejectedValue(new ApiError({ statusCode: 404, code: 'RECORD_NOT_FOUND', message: 'No record yet.' }));
});

const detail = (a: SafetyAlert, over: Partial<React.ComponentProps<typeof PatientFollowUpDetailScreen>> = {}) => {
  const props = {
    alert: a,
    onBack: jest.fn(),
    onAcknowledged: jest.fn(),
    onClosed: jest.fn(),
    onMessage: jest.fn(),
    onOpenConsultation: jest.fn(),
    ...over,
  };
  return { props, ...render(<PatientFollowUpDetailScreen {...props} />) };
};

/* ---------------------------- critical findings ---------------------------- */

test('a red flag leads with what happened, for this patient only', () => {
  detail(alert({}));
  expect(screen.getByTestId('alert-banner')).toHaveTextContent(/RED FLAG/i);
  expect(screen.getAllByText(/Rahul Sharma/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/Neha Pillai/)).toBeNull();
});

test('an open alert can only be acknowledged, never closed directly', async () => {
  const { props } = detail(alert({ state: 'open' }));
  expect(screen.queryByTestId('save')).toBeNull();
  jest.spyOn(doctorConsultationsApi, 'acknowledgeSafetyAlert').mockResolvedValue(alert({ state: 'acknowledged' }));

  fireEvent.press(screen.getByTestId('acknowledge'));
  await waitFor(() => expect(doctorConsultationsApi.acknowledgeSafetyAlert).toHaveBeenCalledWith('al1'));
  await waitFor(() => expect(props.onAcknowledged).toHaveBeenCalled());
});

test('an acknowledged alert cannot be closed without a real note of what was done', async () => {
  const { props } = detail(alert({ state: 'acknowledged' }));
  expect(screen.getByTestId('save')).toBeDisabled();

  fireEvent.changeText(screen.getByTestId('note'), 'Too short');
  expect(screen.getByTestId('save')).toBeDisabled();

  jest.spyOn(doctorConsultationsApi, 'closeSafetyAlert').mockResolvedValue(alert({ state: 'closed' }));
  fireEvent.changeText(screen.getByTestId('note'), 'Called the patient; safety plan agreed with family.');
  fireEvent.press(screen.getByTestId('save'));
  await waitFor(() =>
    expect(doctorConsultationsApi.closeSafetyAlert).toHaveBeenCalledWith('al1', 'Called the patient; safety plan agreed with family.')
  );
  await waitFor(() => expect(props.onClosed).toHaveBeenCalled());
});

test('messaging and the consultation are one tap away from the finding', () => {
  const { props } = detail(alert({}));
  fireEvent.press(screen.getByTestId('message-now'));
  expect(props.onMessage).toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('open-consultation'));
  expect(props.onOpenConsultation).toHaveBeenCalled();
});

test('a closed alert shows its outcome and offers no further action', () => {
  detail(alert({ state: 'closed', closingNote: 'Messaged to check in.', closedAt: new Date().toISOString() }));
  expect(screen.getByTestId('alert-reviewed')).toBeTruthy();
  expect(screen.queryByTestId('save')).toBeNull();
  expect(screen.queryByTestId('acknowledge')).toBeNull();
  expect(screen.getByText(/Messaged to check in\./)).toBeTruthy();
});

/* ------------------------------ follow-up plan ------------------------------ */

const PATHWAYS: FollowupPathway[] = [
  { id: 'p1', code: 'depression_anxiety', name: 'Depression & Anxiety', version: 1, durationDays: 14, isCurrent: true },
  { id: 'p2', code: 'sleep', name: 'Sleep', version: 1, durationDays: 7, isCurrent: true },
];

test('assigning a plan sends the pathway code and a start date that is not in the past', async () => {
  jest.spyOn(doctorFollowupApi, 'listPathways').mockResolvedValue(PATHWAYS);
  const assigned: FollowupPlan = {
    consultationId: 'CON-10482',
    status: 'active',
    pathway: { code: 'sleep', name: 'Sleep', version: 1 },
    startsOn: '2026-05-16',
    endsOn: '2026-05-22',
    durationDays: 7,
    todayIsDay: null,
  };
  jest.spyOn(doctorFollowupApi, 'assignFollowup').mockResolvedValue(assigned);

  const onAssign = jest.fn();
  render(
    <AssignFollowUpPlanScreen
      appointment={appointments.find((a) => a.id === 'a1')!}
      onBack={jest.fn()}
      onAssign={onAssign}
      onViewConsultation={jest.fn()}
    />
  );
  await waitFor(() => screen.getByTestId('pathway-sleep'));
  fireEvent.press(screen.getByTestId('pathway-sleep'));
  fireEvent.press(screen.getByTestId('assign'));

  await waitFor(() =>
    expect(doctorFollowupApi.assignFollowup).toHaveBeenCalledWith(
      'a1', // the appointment's real id, not its human reference code
      expect.objectContaining({ pathwayCode: 'sleep', startsOn: expect.stringMatching(/^2026-\d{2}-\d{2}$/) })
    )
  );
  const [, input] = (doctorFollowupApi.assignFollowup as jest.Mock).mock.calls[0];
  expect(input.startsOn >= '2026-05-15').toBe(true);
  await waitFor(() => expect(onAssign).toHaveBeenCalledWith(assigned));
});

test('a running plan can be stopped, after the doctor confirms', async () => {
  const id = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
  const active: FollowupPlan = {
    consultationId: id,
    status: 'active',
    pathway: { code: 'sleep', name: 'Sleep', version: 1 },
    startsOn: '2026-05-16',
    endsOn: '2026-05-22',
    durationDays: 7,
    todayIsDay: 1,
  };
  jest.spyOn(doctorFollowupApi, 'listPathways').mockResolvedValue(PATHWAYS);
  jest.spyOn(doctorFollowupApi, 'getFollowupPlan').mockResolvedValue(active);
  jest.spyOn(doctorFollowupApi, 'cancelFollowup').mockResolvedValue({ ...active, status: 'cancelled' });
  const onCancelled = jest.fn();

  render(
    <AssignFollowUpPlanScreen
      appointment={{ ...appointments.find((a) => a.id === 'a1')!, id }}
      onBack={jest.fn()}
      onAssign={jest.fn()}
      onCancelled={onCancelled}
      onViewConsultation={jest.fn()}
    />
  );
  fireEvent.press(await screen.findByTestId('stop-plan'));
  await waitFor(() => expect(doctorFollowupApi.cancelFollowup).toHaveBeenCalledWith(id));
  await waitFor(() => expect(onCancelled).toHaveBeenCalled());
});

test('no running plan, no stop button', async () => {
  jest.spyOn(doctorFollowupApi, 'listPathways').mockResolvedValue(PATHWAYS);
  render(
    <AssignFollowUpPlanScreen
      appointment={{ ...appointments.find((a) => a.id === 'a1')!, id: '7c9e6679-7425-40de-944b-e07fc1f90ae7' }}
      onBack={jest.fn()}
      onAssign={jest.fn()}
      onViewConsultation={jest.fn()}
    />
  );
  await waitFor(() => expect(doctorFollowupApi.getFollowupPlan).toHaveBeenCalled());
  await screen.findByTestId('pathway-sleep');
  expect(screen.queryByTestId('stop-plan')).toBeNull();
});

test('before the record is finalised, the screen says why a plan cannot start — and the refusal is explained by code', async () => {
  const id = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
  jest.spyOn(doctorFollowupApi, 'listPathways').mockResolvedValue(PATHWAYS);
  jest
    .spyOn(doctorFollowupApi, 'assignFollowup')
    .mockRejectedValue(new ApiError({ statusCode: 409, code: 'NOT_YET_DOCUMENTED', message: 'server wording' }));
  render(
    <AssignFollowUpPlanScreen
      appointment={{ ...appointments.find((a) => a.id === 'a1')!, id }}
      onBack={jest.fn()}
      onAssign={jest.fn()}
      onViewConsultation={jest.fn()}
    />
  );
  expect(screen.getByTestId('plan-needs-summary')).toBeTruthy();
  fireEvent.press(await screen.findByTestId('pathway-sleep'));
  fireEvent.press(screen.getByTestId('assign'));
  await screen.findByText(/Submit the case summary first/);
  expect(screen.queryByText('server wording')).toBeNull();
});

test('re-opening pre-fills the pathway and start date from the server plan', async () => {
  const id = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
  jest.spyOn(doctorFollowupApi, 'listPathways').mockResolvedValue(PATHWAYS);
  jest.spyOn(doctorFollowupApi, 'getFollowupPlan').mockResolvedValue({
    consultationId: id,
    status: 'active',
    pathway: { code: 'sleep', name: 'Sleep', version: 1 },
    startsOn: '2026-05-20',
    endsOn: '2026-05-26',
    durationDays: 7,
    todayIsDay: null,
  });
  render(
    <AssignFollowUpPlanScreen
      appointment={{ ...appointments.find((a) => a.id === 'a1')!, id }}
      // what this device remembers is older than the server
      initialPlan={{ pathway: PATHWAYS[0].name, duration: PATHWAYS[0].durationDays, start: '2026-05-16' }}
      onBack={jest.fn()}
      onAssign={jest.fn()}
      onViewConsultation={jest.fn()}
    />
  );
  await screen.findByTestId('stop-plan');
  expect(screen.getByTestId('pathway-sleep').props.accessibilityState).toEqual({ selected: true });
  expect(screen.getByTestId('summary-start')).toHaveTextContent(/20/);
});
