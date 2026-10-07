import React from 'react';
import { doctorConsultationsApi } from '@coracure/api';
import { ApiError } from '@coracure/api/errors';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';

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

/* specs pin the clock to 11:45 AM (test-setup); joining opens 15 minutes before the start */

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

test('without a conversation to open there is no message button, and the reference shown is the real one', () => {
  const a = selectAppointment(getState(), 'a2')!;
  render(
    <AppointmentDetailsScreen
      appointment={a}
      onBack={jest.fn()}
      onJoin={jest.fn()}
      onOpenDoc={jest.fn()}
      onViewAllDocs={jest.fn()}
      onRequestDoc={jest.fn()}
      onOpenCase={jest.fn()}
    />
  );
  expect(screen.queryByTestId('message-patient')).toBeNull();
  // the consultation's own reference code, never a made-up "APT-…" number
  expect(screen.getByTestId('appointment-ref')).toHaveTextContent(a.consultationId);
  expect(screen.getByText(/on this device only/)).toBeTruthy();
});

test('medical history is a real field bound to this consultation’s record', () => {
  setup('a1');
  fireEvent.changeText(screen.getByTestId('medical-history'), 'No known drug allergies.');
  expect(selectRecord(getState(), 'a1').allergies).toBe('No known drug allergies.');
  // and never leaks into another patient's record
  expect(selectRecord(getState(), 'a2').allergies).not.toBe('No known drug allergies.');
});

/* --------------------------- no-show and cancel ---------------------------- */

test('a decidable appointment offers no-show and cancel; a settled one does not', () => {
  setup('a1'); // still confirmed — nothing has decided it yet
  expect(screen.getByTestId('appointment-menu')).toBeTruthy();
  setup('a4'); // already cancelled
  expect(screen.queryByTestId('appointment-menu')).toBeNull();
});

test('marking a no-show patches the card from the real answer, not a local guess', async () => {
  jest.spyOn(doctorConsultationsApi, 'markNoShow').mockResolvedValue({
    status: 'no_show',
    paymentStatus: 'not_applicable',
  } as never);
  setup('a1');

  fireEvent.press(screen.getByTestId('appointment-menu'));
  fireEvent.press(screen.getByTestId('sheet-action-no-show'));

  await waitFor(() => expect(doctorConsultationsApi.markNoShow).toHaveBeenCalledWith('a1'));
  await waitFor(() => expect(selectAppointment(getState(), 'a1')!.state).toBe('noShow'));
  expect(selectAppointment(getState(), 'a1')!.payment).toBe('refunded');
});

test('cancelling refunds and updates the card the same way', async () => {
  jest.spyOn(doctorConsultationsApi, 'cancelConsultation').mockResolvedValue({
    status: 'cancelled',
    paymentStatus: 'not_applicable',
  } as never);
  setup('a1');

  fireEvent.press(screen.getByTestId('appointment-menu'));
  fireEvent.press(screen.getByTestId('sheet-action-cancel'));

  await waitFor(() => expect(doctorConsultationsApi.cancelConsultation).toHaveBeenCalledWith('a1', undefined));
  await waitFor(() => expect(selectAppointment(getState(), 'a1')!.state).toBe('cancelled'));
});

test('a refusal leaves the card exactly as it was', async () => {
  jest.spyOn(doctorConsultationsApi, 'markNoShow').mockRejectedValue(
    new ApiError({ statusCode: 409, code: 'CONFLICT', message: 'Too early to mark this consultation as a no-show.' })
  );
  setup('a1');
  const before = selectAppointment(getState(), 'a1')!.state;

  fireEvent.press(screen.getByTestId('appointment-menu'));
  fireEvent.press(screen.getByTestId('sheet-action-no-show'));

  await waitFor(() => expect(doctorConsultationsApi.markNoShow).toHaveBeenCalled());
  expect(selectAppointment(getState(), 'a1')!.state).toBe(before);
});
