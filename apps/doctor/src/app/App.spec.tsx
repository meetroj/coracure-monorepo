import React from 'react';
import { Keyboard } from 'react-native';
import { render, fireEvent, act, screen } from '@testing-library/react-native';

import App from './App';
import { getState, resetStore } from '../state/store';
import { setConsultationFee } from '../state/actions';

/** Phone step → code step → Verify, as a doctor would. */
const signInWith = (mobile: string) => {
  fireEvent.changeText(screen.getByTestId('phone-input'), mobile);
  fireEvent.press(screen.getByTestId('cta'));
  fireEvent.changeText(screen.getByTestId('otp-0'), '123456');
  fireEvent.press(screen.getByTestId('verify'));
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

test('the code step replaces the form at once, and back returns to it', () => {
  render(<App />);
  fireEvent.changeText(screen.getByTestId('phone-input'), '9876543210');
  fireEvent.press(screen.getByTestId('cta'));

  // no artificial wait: the code step is there on the next frame
  expect(screen.getByTestId('heading')).toHaveTextContent(/Verify your/i);
  expect(screen.getByText('+91 98765 43210')).toBeTruthy();
  expect(screen.getByTestId('otp-5')).toBeTruthy();
  expect(screen.queryByTestId('phone-input')).toBeNull();

  fireEvent.press(screen.getByTestId('back'));
  expect(screen.getByTestId('heading')).toHaveTextContent(/Doctor login/i);
});

test('the keyboard closes once the sixth digit is entered, and Verify unlocks', () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss');
  render(<App />);
  fireEvent.changeText(screen.getByTestId('phone-input'), '9876543210');
  fireEvent.press(screen.getByTestId('cta'));

  for (let i = 0; i < 5; i++) fireEvent.changeText(screen.getByTestId(`otp-${i}`), String(i + 1));
  expect(dismiss).not.toHaveBeenCalled();
  expect(screen.getByTestId('verify')).toBeDisabled();

  fireEvent.changeText(screen.getByTestId('otp-5'), '6');
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('verify')).toBeEnabled();
});

test('a pasted or autofilled code fills every box', () => {
  render(<App />);
  fireEvent.changeText(screen.getByTestId('phone-input'), '9876543210');
  fireEvent.press(screen.getByTestId('cta'));
  fireEvent.changeText(screen.getByTestId('otp-0'), '482913');
  ['4', '8', '2', '9', '1', '3'].forEach((d, i) => expect(screen.getByTestId(`otp-${i}`).props.value).toBe(d));
});

test('the resend link counts down before it can be used', () => {
  jest.useFakeTimers();
  render(<App />);
  fireEvent.changeText(screen.getByTestId('phone-input'), '9876543210');
  fireEvent.press(screen.getByTestId('cta'));
  expect(screen.getByTestId('resend-timer')).toHaveTextContent('Resend in 00:30');
  for (let i = 0; i < 30; i++) act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByTestId('resend')).toBeTruthy();
  jest.useRealTimers();
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

test('the demo account (98765 43210) lands on the Dashboard', () => {
  render(<App />);
  signInWith('9876543210');
  expect(screen.getByTestId('dashboard')).toBeTruthy();
  expect(screen.getByText('Dr. Arjun Mehta')).toBeTruthy();
});

test('any other number is a new account and goes through onboarding first', () => {
  render(<App />);
  signInWith('9123456780');
  expect(screen.getByText('Basic Details')).toBeTruthy();
  // the number signed in with is carried over, verified — never a demo number
  expect(screen.getByTestId('mobile')).toHaveTextContent(/\+91 91234 56780/);
  expect(screen.queryByTestId('tab-dashboard')).toBeNull();
});

test('leaving an untouched first step returns to sign-in without asking', () => {
  render(<App />);
  signInWith('9123456780');
  fireEvent.press(screen.getByTestId('back'));
  expect(screen.getByTestId('heading')).toHaveTextContent(/Doctor login/i);
});

test('leaving onboarding with details entered asks first', () => {
  const { Alert } = require('react-native');
  render(<App />);
  signInWith('9123456780');
  fireEvent.changeText(screen.getByTestId('fullName'), 'Kavya Rao');

  // cancel keeps the doctor where they were
  (Alert.alert as jest.Mock).mockImplementationOnce((_t: string, _m: string, buttons: { style?: string; onPress?: () => void }[]) =>
    buttons.find((b) => b.style === 'cancel')?.onPress?.()
  );
  fireEvent.press(screen.getByTestId('back'));
  expect(Alert.alert).toHaveBeenLastCalledWith('Leave registration?', expect.any(String), expect.any(Array), expect.any(Object));
  expect(screen.getByTestId('fullName').props.value).toBe('Kavya Rao');

  // confirming leaves
  fireEvent.press(screen.getByTestId('back'));
  expect(screen.getByTestId('heading')).toHaveTextContent(/Doctor login/i);
});

test('signing out and back in as the same doctor keeps this session’s work', () => {
  resetStore({ session: { stage: 'shell', mobile: '9876543210' }, onboardingCompleted: true, verification: { status: 'approved', acknowledged: true } });
  setConsultationFee(899);
  render(<App />);

  fireEvent.press(screen.getByTestId('tab-profile'));
  fireEvent.press(screen.getByTestId('logout'));
  expect(getState().session.stage).toBe('login');

  signInWith('9876543210');
  expect(getState().profile.fee).toBe(899);
  expect(screen.getByTestId('dashboard')).toBeTruthy();
});
