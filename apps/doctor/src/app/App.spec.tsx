import React from 'react';
import { Keyboard } from 'react-native';
import { render, fireEvent, act, screen } from '@testing-library/react-native';
import { doctorAuthApi, doctorProfileApi, type DoctorVerificationStatus } from '@coracure/api';

import App from './App';
import { getState, resetStore } from '../state/store';
import { setConsultationFee } from '../state/actions';

/**
 * Sign-in is two real calls now, so where a doctor lands is the SERVER's
 * answer: `verificationStatus` decides between the dashboard and onboarding.
 * A new doctor's account is created by the sign-in itself, so these specs state
 * what the backend said, rather than encoding a number the app is supposed to
 * recognise.
 */
const serverSays = (verificationStatus: DoctorVerificationStatus) => {
  jest.spyOn(doctorAuthApi, 'requestOtp').mockResolvedValue({ challengeId: 'ch-1' });
  jest.spyOn(doctorAuthApi, 'verifyOtp').mockResolvedValue({ verificationStatus, isNewAccount: false });
  // After the verify, an unverified doctor's account is read the way a cold
  // start reads it. Nothing on file unless a case says otherwise.
  jest
    .spyOn(doctorProfileApi, 'getProfile')
    .mockResolvedValue({ mobileNumber: '+919123456780', verificationStatus, languages: [] } as never);
  jest.spyOn(doctorProfileApi, 'getRegistration').mockRejectedValue(new Error('none on file'));
  jest.spyOn(doctorProfileApi, 'getCredentials').mockRejectedValue(new Error('none on file'));
};

// Every case here starts from a backend that answers. The refusals live in
// `screens/DoctorLoginScreen.spec.tsx`, where the screen is driven on its own.
//
// The clock is controlled for the whole file because the sign-in screen's
// resend countdown is a 1s interval: a case that ends while the code step is
// still mounted leaves it ticking through cleanup, which stalls the runner.
beforeEach(() => {
  jest.useFakeTimers();
  serverSays('verified');
});

afterEach(() => {
  jest.useRealTimers();
});

const flush = async () => {
  // Sign-in reads the account after the verify: a short chain of promises.
  for (let i = 0; i < 6; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

/** Presses "Get verification code" and waits for the send to come back. */
const sendCode = async (mobile: string) => {
  fireEvent.changeText(screen.getByTestId('phone-input'), mobile);
  fireEvent.press(screen.getByTestId('cta'));
  await flush();
};

/** Phone step → code step → Verify, as a doctor would. */
const signInWith = async (mobile: string) => {
  await sendCode(mobile);
  fireEvent.changeText(screen.getByTestId('otp-0'), '123456');
  fireEvent.press(screen.getByTestId('verify'));
  await flush();
};

/* --------------------------------- sign in -------------------------------- */

test('renders the doctor login heading', () => {
  render(<App />);
  expect(screen.getByTestId('heading')).toHaveTextContent(/Doctor login/i);
});

test('the button stays disabled until a full 10-digit number is entered', () => {
  render(<App />);
  expect(screen.getByTestId('cta')).toBeDisabled();
  fireEvent.changeText(screen.getByTestId('phone-input'), '98765');
  expect(screen.getByTestId('cta')).toBeDisabled();
  fireEvent.changeText(screen.getByTestId('phone-input'), '9876543210');
  expect(screen.getByTestId('cta')).toBeEnabled();
});

test('the code step replaces the form once the code has actually been sent', async () => {
  render(<App />);
  await sendCode('9876543210');

  // the step moves on the server's answer, not on the press
  expect(screen.getByTestId('heading')).toHaveTextContent(/Verify your/i);
  expect(screen.getByText('+91 98765 43210')).toBeTruthy();
  expect(screen.getByTestId('otp-5')).toBeTruthy();
  expect(screen.queryByTestId('phone-input')).toBeNull();

  fireEvent.press(screen.getByTestId('back'));
  expect(screen.getByTestId('heading')).toHaveTextContent(/Doctor login/i);
});

test('the keyboard closes once the sixth digit is entered, and Verify unlocks', async () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss');
  render(<App />);
  await sendCode('9876543210');

  for (let i = 0; i < 5; i++) fireEvent.changeText(screen.getByTestId(`otp-${i}`), String(i + 1));
  expect(dismiss).not.toHaveBeenCalled();
  expect(screen.getByTestId('verify')).toBeDisabled();

  fireEvent.changeText(screen.getByTestId('otp-5'), '6');
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('verify')).toBeEnabled();
});

test('a pasted or autofilled code fills every box', async () => {
  render(<App />);
  await sendCode('9876543210');
  fireEvent.changeText(screen.getByTestId('otp-0'), '482913');
  ['4', '8', '2', '9', '1', '3'].forEach((d, i) => expect(screen.getByTestId(`otp-${i}`).props.value).toBe(d));
});

test('the resend link counts down before it can be used', async () => {
  render(<App />);
  await sendCode('9876543210');
  expect(screen.getByTestId('resend-timer')).toHaveTextContent('Resend in 00:30');
  for (let i = 0; i < 30; i++) act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByTestId('resend')).toBeTruthy();
});

test('every link on the sign-in page does something', () => {
  render(<App />);
  fireEvent.press(screen.getByTestId('contact-admin'));
  expect(screen.getByText('Contact CoraCure')).toBeTruthy();
  fireEvent.press(screen.getByTestId('contact-sheet-close'));

  fireEvent.press(screen.getByTestId('privacy-link'));
  expect(screen.getByTestId('privacy-sheet')).toBeTruthy();
  fireEvent.press(screen.getByTestId('privacy-sheet-close'));

  fireEvent.press(screen.getByTestId('support-link'));
  expect(screen.getByText('Contact CoraCure')).toBeTruthy();
});

/* ----------------------------- where sign-in lands ----------------------------- */

test('a verified doctor lands on the Dashboard', async () => {
  serverSays('verified');
  render(<App />);
  await signInWith('9876543210');
  expect(screen.getByTestId('dashboard')).toBeTruthy();
  expect(screen.getByText('Dr. Arjun Mehta')).toBeTruthy();
});

test('a doctor the backend has not verified goes through onboarding first', async () => {
  serverSays('pending');
  render(<App />);
  await signInWith('9123456780');
  expect(screen.getByText('Basic Details')).toBeTruthy();
  // the number signed in with is carried over, verified — never a demo number
  expect(screen.getByTestId('mobile')).toHaveTextContent(/\+91 91234 56780/);
  expect(screen.queryByTestId('tab-dashboard')).toBeNull();
});

test('an account already submitted lands on its Account Status, not back in onboarding', async () => {
  serverSays('under_review');
  render(<App />);
  await signInWith('9123456780');
  // A blank form here invited a second, conflicting submission.
  expect(screen.queryByText('Basic Details')).toBeNull();
  expect(screen.getByTestId('account-status-pending')).toBeTruthy();
});

test('a fresh sign-in opens onboarding filled in with what is on file', async () => {
  serverSays('pending');
  jest
    .spyOn(doctorProfileApi, 'getProfile')
    .mockResolvedValue({ mobileNumber: '+919123456780', verificationStatus: 'pending', languages: ['hi'] } as never);
  jest.spyOn(doctorProfileApi, 'getRegistration').mockResolvedValue({
    fullName: 'Kavya Rao',
    dateOfBirth: null,
    gender: null,
    email: null,
    identity: null,
    qualifications: null,
    experience: [],
    signatureDocumentId: null,
    totalExperienceYears: 0,
    editable: true,
  });
  render(<App />);
  await signInWith('9123456780');
  expect(screen.getByTestId('fullName').props.value).toBe('Kavya Rao');
  expect(getState().submission?.basic.languages).toEqual(['Hindi']);
});

test('leaving an untouched first step returns to sign-in without asking', async () => {
  serverSays('pending');
  render(<App />);
  await signInWith('9123456780');
  fireEvent.press(screen.getByTestId('back'));
  expect(screen.getByTestId('heading')).toHaveTextContent(/Doctor login/i);
});

test('leaving onboarding with details entered asks first', async () => {
  const { confirm } = require('../components/confirm');
  serverSays('pending');
  render(<App />);
  await signInWith('9123456780');
  fireEvent.changeText(screen.getByTestId('fullName'), 'Kavya Rao');

  // cancel keeps the doctor where they were
  (confirm as jest.Mock).mockImplementationOnce((o: { onCancel?: () => void }) => o.onCancel?.());
  fireEvent.press(screen.getByTestId('back'));
  expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Leave registration?' }));
  expect(screen.getByTestId('fullName').props.value).toBe('Kavya Rao');

  // confirming leaves
  fireEvent.press(screen.getByTestId('back'));
  expect(screen.getByTestId('heading')).toHaveTextContent(/Doctor login/i);
});

test('signing out and back in as the same doctor keeps this session’s work', async () => {
  serverSays('verified');
  resetStore({ session: { stage: 'shell', mobile: '9876543210' }, onboardingCompleted: true, verification: { status: 'approved', acknowledged: true } });
  setConsultationFee(899);
  render(<App />);

  fireEvent.press(screen.getByTestId('tab-profile'));
  fireEvent.press(screen.getByTestId('logout'));
  expect(getState().session.stage).toBe('login');

  await signInWith('9876543210');
  expect(getState().profile.fee).toBe(899);
  expect(screen.getByTestId('dashboard')).toBeTruthy();
});
