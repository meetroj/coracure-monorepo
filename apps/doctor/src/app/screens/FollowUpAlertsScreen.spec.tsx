import React from 'react';
import { doctorConsultationsApi } from '@coracure/api';
import type { SafetyAlert } from '@coracure/api';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';

import FollowUpAlertsScreen from './FollowUpAlertsScreen';

const alert = (over: Partial<SafetyAlert>): SafetyAlert => ({
  id: 'al1',
  alertType: 'red_flag',
  consultationId: 'CON-1',
  patientId: 'PT-1',
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

const FIXTURE: SafetyAlert[] = [
  alert({ id: 'al1', alertType: 'red_flag' }),
  alert({ id: 'al2', alertType: 'amber', patientId: 'PT-2', patientName: 'Neha Pillai', patientInitials: 'NP' }),
];

beforeEach(() => {
  jest.spyOn(doctorConsultationsApi, 'listSafetyAlerts').mockResolvedValue(FIXTURE);
  jest.spyOn(doctorConsultationsApi, 'acknowledgeSafetyAlert').mockImplementation((id) =>
    Promise.resolve({ ...FIXTURE.find((a) => a.id === id)!, state: 'acknowledged' })
  );
});

// Chips render from the full list regardless of the active filter, unlike a
// row, which may be hidden by whichever type the test starts on.
const loaded = () => waitFor(() => screen.getByLabelText('Red Flags, 1 open'));

test('category chips count the open alerts in each type', async () => {
  render(<FollowUpAlertsScreen onBack={jest.fn()} onOpenAlert={jest.fn()} />);
  await loaded();
  expect(screen.getByLabelText('Red Flags, 1 open')).toBeTruthy();
  expect(screen.getByLabelText('Amber Alerts, 1 open')).toBeTruthy();
});

test('choosing a chip shows only its alerts; choosing it again shows all', async () => {
  render(<FollowUpAlertsScreen onBack={jest.fn()} onOpenAlert={jest.fn()} />);
  await loaded();
  fireEvent.press(screen.getByTestId('chip-red_flag'));
  expect(screen.getByTestId('alert-al1')).toBeTruthy();
  expect(screen.queryByTestId('alert-al2')).toBeNull();
  fireEvent.press(screen.getByTestId('chip-red_flag'));
  expect(screen.getByTestId('alert-al2')).toBeTruthy();
});

test('a list can open straight onto a type', async () => {
  render(<FollowUpAlertsScreen onBack={jest.fn()} onOpenAlert={jest.fn()} initialCategory="amber" />);
  await loaded();
  expect(screen.getByTestId('alert-al2')).toBeTruthy();
  expect(screen.queryByTestId('alert-al1')).toBeNull();
});

test('opening an alert passes its own id', async () => {
  const onOpenAlert = jest.fn();
  render(<FollowUpAlertsScreen onBack={jest.fn()} onOpenAlert={onOpenAlert} />);
  await loaded();
  fireEvent.press(screen.getByTestId('open-al2'));
  expect(onOpenAlert).toHaveBeenCalledWith('al2');
});

test('acknowledging an alert calls the real endpoint and refreshes the list', async () => {
  render(<FollowUpAlertsScreen onBack={jest.fn()} onOpenAlert={jest.fn()} />);
  await loaded();
  fireEvent.press(screen.getByTestId('ack-al2'));
  await waitFor(() => expect(doctorConsultationsApi.acknowledgeSafetyAlert).toHaveBeenCalledWith('al2'));
  await waitFor(() => expect(doctorConsultationsApi.listSafetyAlerts).toHaveBeenCalledTimes(2));
});
