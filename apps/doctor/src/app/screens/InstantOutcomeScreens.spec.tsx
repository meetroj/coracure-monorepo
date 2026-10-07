import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import InstantAcceptedScreen from './InstantAcceptedScreen';
import InstantDeclinedScreen from './InstantDeclinedScreen';
import { instantRequest } from '../../data/doctor';
import type { DoctorConsultation } from '@coracure/api';

const noop = () => undefined;

/** The accepted consultation, as `GET /doctor/consultations/:id` returns it: unpaid, no consent yet. */
const consultation = {
  id: '11111111-1111-4111-8111-111111111111',
  paymentStatus: 'unpaid',
  patient: { id: 'p-1', fullName: 'Meera Joshi', initials: 'MJ', age: 29, gender: 'female', preferredLanguage: 'en' },
  doctorContext: { riskCategory: null, totalPastConsultationsWithDoctor: 0, hasCurrentTeleconsultationConsent: false },
} as unknown as DoctorConsultation;

const Accepted = (over: Partial<React.ComponentProps<typeof InstantAcceptedScreen>> = {}) => (
  <InstantAcceptedScreen request={instantRequest} consultation={consultation} onReturn={noop} onBack={noop} {...over} />
);

/* -------------------------------- accepted -------------------------------- */

test('accepted screen reserves the slot without opening the consultation', () => {
  const { getByText, getByTestId } = render(<Accepted />);

  expect(getByText('Request accepted')).toBeTruthy();
  expect(getByText('Your availability has been reserved for this patient.')).toBeTruthy();
  expect(getByText('Reserved')).toBeTruthy();

  // both outstanding steps are visible with their states
  expect(getByText('Waiting for patient')).toBeTruthy();
  expect(getByText('Payment')).toBeTruthy();
  expect(getByText('In progress')).toBeTruthy();
  expect(getByText('Teleconsultation consent')).toBeTruthy();
  expect(getByText('Awaiting confirmation')).toBeTruthy();

  // the consultation must not be joinable before payment and consent clear
  expect(getByTestId('join')).toBeDisabled();
  // the accepted patient's name comes from the consultation, not a fixture
  expect(getByText('Meera Joshi')).toBeTruthy();
});

test('accepted screen shows payment and consent as the consultation reports them', () => {
  const done = { ...consultation, paymentStatus: 'paid', doctorContext: { ...consultation.doctorContext!, hasCurrentTeleconsultationConsent: true } };
  const onJoin = jest.fn();
  const { getByText, getByTestId } = render(<Accepted consultation={done as DoctorConsultation} onJoin={onJoin} />);
  expect(getByText('Paid')).toBeTruthy();
  expect(getByText('Accepted')).toBeTruthy();
  // both steps have cleared, so the route hands over the way into the room
  fireEvent.press(getByTestId('join'));
  expect(onJoin).toHaveBeenCalledTimes(1);
});

test('accepted screen says it is checking until the consultation loads, and offers a retry on failure', () => {
  const onRetry = jest.fn();
  const { getAllByText, rerender, getByTestId } = render(<Accepted consultation={undefined} />);
  expect(getAllByText('Checking…')).toHaveLength(2);
  rerender(<Accepted consultation={undefined} loadError="Could not load." onRetry={onRetry} />);
  fireEvent.press(getByTestId('accepted-retry'));
  expect(onRetry).toHaveBeenCalled();
});

test('accepted screen drops the request-stage controls', () => {
  const { queryByText, queryByTestId } = render(<Accepted />);
  expect(queryByText('Accept request')).toBeNull();
  expect(queryByText('Decline')).toBeNull();
  expect(queryByText('seconds left')).toBeNull();
  expect(queryByTestId('accept')).toBeNull();
});

test('accepted screen returns to the dashboard', () => {
  const onReturn = jest.fn();
  const { getByTestId } = render(<Accepted onReturn={onReturn} />);
  fireEvent.press(getByTestId('return'));
  expect(onReturn).toHaveBeenCalledTimes(1);
});

/* -------------------------------- declined -------------------------------- */

test('declined screen confirms the reroute and releases availability', () => {
  const { getByText } = render(<InstantDeclinedScreen onReturn={noop} onBack={noop} />);

  expect(getByText('Request declined')).toBeTruthy();
  expect(getByText('Automatically rerouted')).toBeTruthy();
  expect(getByText('No further action is required.')).toBeTruthy();
  expect(getByText('You are available to receive another instant request.')).toBeTruthy();
  expect(getByText('Available Now')).toBeTruthy();
});

test('declined screen no longer exposes the patient', () => {
  const { queryByText, getByText } = render(
    <InstantDeclinedScreen onReturn={noop} onBack={noop} />
  );
  expect(queryByText('Rahul Sharma')).toBeNull();
  expect(queryByText('Anxiety and difficulty sleeping')).toBeNull();
  expect(queryByText('RS')).toBeNull();
  expect(getByText('Patient details from this request are no longer accessible.')).toBeTruthy();
});

test('declined screen offers return and pause', () => {
  const onReturn = jest.fn();
  const onPause = jest.fn();
  const { getByTestId } = render(
    <InstantDeclinedScreen onReturn={onReturn} onPause={onPause} onBack={noop} />
  );
  fireEvent.press(getByTestId('return'));
  fireEvent.press(getByTestId('pause'));
  expect(onReturn).toHaveBeenCalledTimes(1);
  expect(onPause).toHaveBeenCalledTimes(1);
});

test('declined screen holds the pause control while the status is saving', () => {
  const onPause = jest.fn();
  const { getByTestId, getByText } = render(<InstantDeclinedScreen onReturn={noop} onPause={onPause} pausing onBack={noop} />);
  expect(getByText('Pausing…')).toBeTruthy();
  fireEvent.press(getByTestId('pause'));
  expect(onPause).not.toHaveBeenCalled();
});
