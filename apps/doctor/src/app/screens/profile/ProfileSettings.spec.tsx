import React from 'react';
import { doctorProfileApi } from '@coracure/api';
import { ApiError } from '@coracure/api/errors';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react-native';

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

// `PATCH /me/doctor/profile` whitelists bio/languages/duration/buffer only —
// fee is the admin's (`PATCH /admin/doctors/:id`). A doctor-side save button
// here would 400 on every press, so the screen shows the real fee and routes
// a change through Request Changes instead of pretending to accept an edit.
test('the fee is shown, not editable, and routes a change request elsewhere', () => {
  resetStore({ profile: { fee: 899, changeRequests: [] } });
  const onRequestChange = jest.fn();
  render(<ConsultationFeeScreen onBack={jest.fn()} onRequestChange={onRequestChange} />);

  expect(screen.getByTestId('fee-value')).toHaveTextContent('899');
  expect(screen.queryByTestId('fee-input')).toBeNull();
  expect(screen.queryByTestId('save-fee')).toBeNull();

  fireEvent.press(screen.getByTestId('request-fee-change'));
  expect(onRequestChange).toHaveBeenCalled();
});

test('changing the fee never rewrites money already earned', () => {
  const { selectEarnings } = require('../../../state/selectors');
  const before = selectEarnings(getState()).monthly.total;
  require('../../../state/actions').setConsultationFee(1199);
  expect(selectEarnings(getState()).monthly.total).toBe(before);
});

/* ---------------------------------- duration ---------------------------------- */

test('the duration is one setting, shared with Availability, saved through the real profile PATCH', async () => {
  jest.spyOn(doctorProfileApi, 'updateProfile').mockResolvedValue({ consultationDurationMinutes: 45 } as never);
  const onSaved = jest.fn();
  render(<ConsultationDurationScreen onBack={jest.fn()} onSaved={onSaved} />);
  fireEvent.press(screen.getByTestId('duration-45'));
  fireEvent.press(screen.getByTestId('save-duration'));

  await waitFor(() => expect(doctorProfileApi.updateProfile).toHaveBeenCalledWith({ consultationDurationMinutes: 45 }));
  await waitFor(() => expect(getState().availability.durationMin).toBe(45));
  expect(onSaved).toHaveBeenCalled();
});

test('a refused duration change leaves the setting as it was', async () => {
  jest.spyOn(doctorProfileApi, 'updateProfile').mockRejectedValue(
    new ApiError({ statusCode: 400, code: 'VALIDATION_FAILED', message: 'Duration must be between 5 and 180 minutes.' })
  );
  const before = getState().availability.durationMin;
  const onSaved = jest.fn();
  render(<ConsultationDurationScreen onBack={jest.fn()} onSaved={onSaved} />);
  fireEvent.press(screen.getByTestId('duration-45'));
  fireEvent.press(screen.getByTestId('save-duration'));

  await waitFor(() => expect(doctorProfileApi.updateProfile).toHaveBeenCalled());
  expect(getState().availability.durationMin).toBe(before);
  expect(onSaved).not.toHaveBeenCalled();
});

/* ------------------------------ bank and changes ------------------------------ */

test('bank details show only what the backend knows — verified or not — and never an invented account', () => {
  const onRequestChange = jest.fn();
  render(<BankDetailsScreen onBack={jest.fn()} onRequestChange={onRequestChange} />);
  expect(screen.getByTestId('bank-state')).toBeTruthy();
  expect(screen.queryByText(/HDFC|4417/)).toBeNull();
  expect(screen.getByText(/managed by the Coracure team/)).toBeTruthy();
  fireEvent.press(screen.getByTestId('change-bank'));
  expect(onRequestChange).toHaveBeenCalled();
});

test('a change request arrives with the right detail picked, needs a description, and is kept', () => {
  const onSent = jest.fn();
  render(<RequestChangesScreen initialField="Bank account" onBack={jest.fn()} onSent={onSent} />);
  // bio and languages are not on the list — the doctor edits those directly
  expect(screen.queryByText('About / bio')).toBeNull();
  expect(screen.getByTestId('field-4')).toBeChecked();
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

test('bio and languages are edited directly, through the real profile PATCH, once per press', async () => {
  let resolve: (v: unknown) => void = () => {};
  jest.spyOn(doctorProfileApi, 'updateProfile').mockImplementation(() => new Promise((r) => (resolve = r)) as never);
  render(<DoctorProfileDetailsScreen onBack={jest.fn()} onEditFee={jest.fn()} onRequestChange={jest.fn()} />);

  fireEvent.press(screen.getByTestId('edit-about'));
  fireEvent.changeText(screen.getByTestId('bio-input'), '  Adult psychiatry, ten years.  ');
  fireEvent.press(screen.getByTestId('language-Hindi'));
  fireEvent.press(screen.getByTestId('about-save'));
  fireEvent.press(screen.getByTestId('about-save'));

  // Only the two whitelisted keys, trimmed — and one request for two taps.
  expect(doctorProfileApi.updateProfile).toHaveBeenCalledTimes(1);
  expect(doctorProfileApi.updateProfile).toHaveBeenCalledWith({ bio: 'Adult psychiatry, ten years.', languages: ['en'] });
  await act(async () => resolve({ bio: 'Adult psychiatry, ten years.', languages: ['en'] }));
  expect(screen.queryByTestId('about-editor')).toBeNull();
});

test('a refused bio save keeps the editor open with the reason', async () => {
  jest.spyOn(doctorProfileApi, 'updateProfile').mockRejectedValue(
    new ApiError({ statusCode: 400, code: 'VALIDATION_FAILED', message: 'bio must be shorter than or equal to 4000 characters' })
  );
  render(<DoctorProfileDetailsScreen onBack={jest.fn()} onEditFee={jest.fn()} onRequestChange={jest.fn()} />);
  fireEvent.press(screen.getByTestId('edit-about'));
  fireEvent.press(screen.getByTestId('about-save'));

  await waitFor(() => expect(screen.getByTestId('about-error')).toBeTruthy());
  expect(screen.getByTestId('about-editor')).toBeTruthy();
});
