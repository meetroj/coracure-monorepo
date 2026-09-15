import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import AppShell from '../AppShell';
import AppointmentDetailsScreen from './AppointmentDetailsScreen';
import { appointments, detailFor } from '../../data/doctor';

const noop = () => undefined;
const rahul = appointments.find((a) => a.id === 'a1')!;
const cancelled = appointments.find((a) => a.state === 'cancelled')!;

test('tapping an appointment row opens details full-screen', () => {
  const { getByTestId, getByText, queryByTestId } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByTestId('tab-appointments'));
  fireEvent.press(getByTestId('appt-a1'));

  expect(getByText('Presenting Concern')).toBeTruthy();
  expect(getByText('Intake Summary')).toBeTruthy();
  // no bottom navigation on this screen
  expect(queryByTestId('tab-appointments')).toBeNull();
});

test('back returns to the appointments list', () => {
  const { getByTestId, getByLabelText, getByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByTestId('tab-appointments'));
  fireEvent.press(getByTestId('appt-a1'));
  fireEvent.press(getByLabelText('Back'));

  expect(getByText('Manage your patient consultations')).toBeTruthy();
  expect(getByTestId('tab-appointments')).toBeTruthy();
});

test('the header carries the patient and both identifiers', () => {
  const { getByText } = render(<AppointmentDetailsScreen appointment={rahul} onBack={noop} />);
  const d = detailFor(rahul);

  expect(getByText(rahul.name)).toBeTruthy();
  expect(getByText(`${rahul.age} years · ${rahul.gender}`)).toBeTruthy();
  // Rendered bare, without a "Patient ID" label — the green marks what it is.
  expect(getByText(d.patientId)).toBeTruthy();
  expect(getByText(d.appointmentId)).toBeTruthy();
  expect(getByText('Confirmed')).toBeTruthy();
  expect(getByText('15 May 2024')).toBeTruthy();
});

test('intake, documents and consent all render', () => {
  const { getByText } = render(<AppointmentDetailsScreen appointment={rahul} onBack={noop} />);

  ['Duration', 'Severity', 'Medication', 'Allergies', 'Other'].forEach((l) =>
    expect(getByText(l)).toBeTruthy()
  );
  expect(getByText('2 weeks')).toBeTruthy();
  expect(getByText('None known')).toBeTruthy();

  expect(getByText('View all 3')).toBeTruthy();
  expect(getByText('Previous Prescription')).toBeTruthy();
  expect(getByText('Sleep Report')).toBeTruthy();
  expect(getByText('Symptoms Journal')).toBeTruthy();

  // What was consented to, then when it was accepted, then the status.
  expect(getByText(/Consent for Video Consultation/)).toBeTruthy();
  expect(getByText(/^Accepted on /)).toBeTruthy();
  expect(getByText('Accepted')).toBeTruthy();
  expect(getByText('Video follow-up')).toBeTruthy();
});

test('payment details stay collapsed until asked for', () => {
  const { getByTestId, getByText, queryByText } = render(
    <AppointmentDetailsScreen appointment={rahul} onBack={noop} />
  );

  expect(getByText('Payment and appointment information')).toBeTruthy();
  expect(queryByText('CC2404287193')).toBeNull();

  fireEvent.press(getByTestId('payment-row'));
  expect(getByText('CC2404287193')).toBeTruthy();
  expect(getByText('Transaction ID')).toBeTruthy();
});

test('join is offered for a confirmed appointment only', () => {
  const onJoin = jest.fn();
  const ok = render(<AppointmentDetailsScreen appointment={rahul} onBack={noop} onJoin={onJoin} />);
  expect(ok.getByText('Join Consultation')).toBeTruthy();
  expect(ok.getByText('Starts in 15 min')).toBeTruthy();
  fireEvent.press(ok.getByTestId('join-consultation'));
  expect(onJoin).toHaveBeenCalledWith(rahul);

  const off = render(<AppointmentDetailsScreen appointment={cancelled} onBack={noop} onJoin={onJoin} />);
  expect(off.getByText('Consultation closed')).toBeTruthy();
  fireEvent.press(off.getByTestId('join-consultation'));
  // still one call: the disabled CTA does not fire
  expect(onJoin).toHaveBeenCalledTimes(1);
});

test('an appointment with no authored detail still opens usably', () => {
  const d = detailFor(cancelled);
  expect(d.patientId).toMatch(/^PT-/);
  expect(d.appointmentId).toMatch(/^APT-/);
  expect(d.intake).toHaveLength(5);
  // the fallback surfaces the presenting concern rather than leaving a blank
  expect(d.intake[4].value).toBe(cancelled.concern);

  const { getByText } = render(<AppointmentDetailsScreen appointment={cancelled} onBack={noop} />);
  expect(getByText('Cancelled')).toBeTruthy();
  expect(getByText('Intake Summary')).toBeTruthy();
});
