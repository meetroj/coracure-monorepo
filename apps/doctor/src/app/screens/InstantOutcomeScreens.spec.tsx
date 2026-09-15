import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import InstantAcceptedScreen from './InstantAcceptedScreen';
import InstantDeclinedScreen from './InstantDeclinedScreen';

const noop = () => undefined;

/* -------------------------------- accepted -------------------------------- */

test('accepted screen reserves the slot without opening the consultation', () => {
  const { getByText, getByTestId } = render(
    <InstantAcceptedScreen onReturn={noop} onBack={noop} />
  );

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
});

test('accepted screen drops the request-stage controls', () => {
  const { queryByText, queryByTestId } = render(
    <InstantAcceptedScreen onReturn={noop} onBack={noop} />
  );
  expect(queryByText('Accept request')).toBeNull();
  expect(queryByText('Decline')).toBeNull();
  expect(queryByText('seconds left')).toBeNull();
  expect(queryByTestId('accept')).toBeNull();
});

test('accepted screen returns to the dashboard', () => {
  const onReturn = jest.fn();
  const { getByTestId } = render(<InstantAcceptedScreen onReturn={onReturn} onBack={noop} />);
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
