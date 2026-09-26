import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import {
  ConsultationFeeScreen,
  ConsultationDurationScreen,
  BankDetailsScreen,
  PrivacySecurityScreen,
  RequestChangesScreen,
} from './ProfileSettingsScreens';
import DoctorProfileDetailsScreen from './DoctorProfileDetailsScreen';
import { getState, resetStore } from '../../../state/store';

/* ------------------------------------ fee ------------------------------------ */

test('a new fee is saved to the profile and reported as dirty until then', () => {
  const onSaved = jest.fn();
  const onDirtyChange = jest.fn();
  render(<ConsultationFeeScreen onBack={jest.fn()} onSaved={onSaved} onDirtyChange={onDirtyChange} />);
  expect(screen.getByTestId('save-fee')).toBeDisabled();

  fireEvent.press(screen.getByTestId('fee-899'));
  expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  fireEvent.press(screen.getByTestId('save-fee'));
  expect(getState().profile.fee).toBe(899);
  expect(onSaved).toHaveBeenCalled();
});

test('a zero fee is refused with a reason', () => {
  render(<ConsultationFeeScreen onBack={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.changeText(screen.getByTestId('fee-input'), '0');
  expect(screen.getByText('The fee must be more than ₹0.')).toBeTruthy();
  expect(screen.getByTestId('save-fee')).toBeDisabled();
});

test('changing the fee never rewrites money already earned', () => {
  const { selectEarnings } = require('../../../state/selectors');
  const before = selectEarnings(getState()).monthly.total;
  require('../../../state/actions').setConsultationFee(1199);
  expect(selectEarnings(getState()).monthly.total).toBe(before);
});

/* ---------------------------------- duration ---------------------------------- */

test('the duration is one setting, shared with Availability', () => {
  const onSaved = jest.fn();
  render(<ConsultationDurationScreen onBack={jest.fn()} onSaved={onSaved} />);
  fireEvent.press(screen.getByTestId('duration-45'));
  fireEvent.press(screen.getByTestId('save-duration'));
  expect(getState().availability.durationMin).toBe(45);
  expect(onSaved).toHaveBeenCalled();
});

/* ------------------------------ bank and changes ------------------------------ */

test('bank details are read-only, and a change is requested instead', () => {
  const onRequestChange = jest.fn();
  render(<BankDetailsScreen onBack={jest.fn()} onRequestChange={onRequestChange} />);
  expect(screen.getByText('•••• •••• 4417')).toBeTruthy();
  fireEvent.press(screen.getByTestId('change-bank'));
  expect(onRequestChange).toHaveBeenCalled();
});

test('a change request arrives with the right detail picked, needs a description, and is kept', () => {
  const onSent = jest.fn();
  render(<RequestChangesScreen initialField="Bank account" onBack={jest.fn()} onSent={onSent} />);
  expect(screen.getByTestId('field-6')).toBeChecked();
  fireEvent.press(screen.getByTestId('submit-request'));
  expect(screen.getByText('Describe the change (at least 10 characters).')).toBeTruthy();
  expect(onSent).not.toHaveBeenCalled();

  fireEvent.changeText(screen.getByTestId('request-note'), 'New salary account from next month.');
  fireEvent.press(screen.getByTestId('submit-request'));
  expect(getState().profile.changeRequests[0]).toEqual(expect.objectContaining({ fields: ['Bank account'], state: 'pending' }));
  expect(onSent).toHaveBeenCalled();
});

/* ---------------------------------- privacy ---------------------------------- */

test('privacy toggles save as they change; there is no password to change', () => {
  resetStore({ session: { stage: 'shell', mobile: '9876543210' } });
  render(<PrivacySecurityScreen onBack={jest.fn()} />);
  expect(screen.queryByText(/Change password/)).toBeNull();
  expect(screen.queryByText(/Biometric/)).toBeNull();
  expect(screen.getByText(/\+91 98••• ••210/)).toBeTruthy();
  fireEvent(screen.getByTestId('toggle-analytics'), 'valueChange', true);
  expect(getState().privacy.analytics).toBe(true);
});

/* ------------------------------- profile details ------------------------------ */

test('verified details are locked, and the fee has its own edit', () => {
  const onEditFee = jest.fn();
  const onRequestChange = jest.fn();
  render(<DoctorProfileDetailsScreen onBack={jest.fn()} onEditFee={onEditFee} onRequestChange={onRequestChange} />);
  expect(screen.getByLabelText(/Registration Number: MCI 12-45892\. Locked after verification/)).toBeTruthy();
  fireEvent.press(screen.getByTestId('edit-fee'));
  expect(onEditFee).toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('request-change'));
  expect(onRequestChange).toHaveBeenCalled();
});
