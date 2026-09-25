import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import AppointmentDetailsScreen from './AppointmentDetailsScreen';
import { getState } from '../../state/store';
import { selectAppointment, selectRecord } from '../../state/selectors';

const setup = (id: string) => {
  const props = {
    appointment: selectAppointment(getState(), id)!,
    onBack: jest.fn(),
    onJoin: jest.fn(),
    onMessage: jest.fn(),
    onOpenDoc: jest.fn(),
    onViewAllDocs: jest.fn(),
    onRequestDoc: jest.fn(),
    onOpenCase: jest.fn(),
  };
  return { props, ...render(<AppointmentDetailsScreen {...props} />) };
};

/* the demo clock reads 11:45 AM; joining opens 15 minutes before the start */

test('an appointment inside its joining window can be joined', () => {
  const { props } = setup('a1');
  expect(screen.getByText('Join Consultation')).toBeTruthy();
  expect(screen.getByText(/Starts in 15 min/)).toBeTruthy();
  fireEvent.press(screen.getByTestId('join-consultation'));
  expect(props.onJoin).toHaveBeenCalledWith('a1');
});

test('a later appointment says when joining opens, and cannot be joined yet', () => {
  const { props } = setup('a6');
  expect(screen.getByText('Opens at 5:15 PM')).toBeTruthy();
  expect(screen.getByTestId('join-consultation')).toBeDisabled();
  fireEvent.press(screen.getByTestId('join-consultation'));
  expect(props.onJoin).not.toHaveBeenCalled();
});

test('an appointment on a later day shows the day, not a join button', () => {
  setup('a7');
  expect(screen.getByText('Starts Tomorrow')).toBeTruthy();
  expect(screen.getByTestId('join-consultation')).toBeDisabled();
});

test('a cancelled appointment says so', () => {
  setup('a4');
  expect(screen.getByText('Appointment cancelled')).toBeTruthy();
  expect(screen.getByTestId('join-consultation')).toBeDisabled();
});

test('a held appointment opens its consultation record', () => {
  const { props } = setup('a2');
  fireEvent.press(screen.getByTestId('join-consultation'));
  expect(props.onOpenCase).toHaveBeenCalledWith('a2');
});

test('the patient’s own documents are listed and open by id', () => {
  const { props } = setup('a2');
  expect(screen.getByTestId('doc-d6')).toBeTruthy();
  expect(screen.queryByTestId('doc-d1')).toBeNull();
  fireEvent.press(screen.getByTestId('doc-d6'));
  expect(props.onOpenDoc).toHaveBeenCalledWith('d6');
  fireEvent.press(screen.getByTestId('view-all-docs'));
  expect(props.onViewAllDocs).toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('request-document'));
  expect(props.onRequestDoc).toHaveBeenCalled();
});

test('the message button opens this patient’s conversation', () => {
  const { props } = setup('a2');
  fireEvent.press(screen.getByTestId('message-patient'));
  expect(props.onMessage).toHaveBeenCalledTimes(1);
});

test('medical history is a real field bound to this consultation’s record', () => {
  setup('a1');
  fireEvent.changeText(screen.getByTestId('medical-history'), 'No known drug allergies.');
  expect(selectRecord(getState(), 'a1').allergies).toBe('No known drug allergies.');
  // and never leaks into another patient's record
  expect(selectRecord(getState(), 'a2').allergies).not.toBe('No known drug allergies.');
});
