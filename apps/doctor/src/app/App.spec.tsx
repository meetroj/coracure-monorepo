import React from 'react';
import { Keyboard } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';

import App from './App';

test('renders the doctor login heading', () => {
  const { getByTestId } = render(<App />);
  expect(getByTestId('heading')).toHaveTextContent(/Doctor login/i);
});

test('CTA stays disabled until a full 10-digit number is entered', () => {
  const { getByTestId } = render(<App />);
  const cta = getByTestId('cta');
  expect(cta).toBeDisabled();

  fireEvent.changeText(getByTestId('phone-input'), '98765');
  expect(cta).toBeDisabled();

  fireEvent.changeText(getByTestId('phone-input'), '9876543210');
  expect(cta).toBeEnabled();
});

test('OTP step replaces the form on the same screen', () => {
  jest.useFakeTimers();
  const { getByTestId, queryByTestId } = render(<App />);

  fireEvent.changeText(getByTestId('phone-input'), '9876543210');
  fireEvent.press(getByTestId('cta'));
  act(() => {
    jest.advanceTimersByTime(1000);
  });

  // banner copy swapped, six boxes present, phone field gone
  expect(getByTestId('heading')).toHaveTextContent(/Verify your/i);
  expect(getByTestId('otp-0')).toBeTruthy();
  expect(getByTestId('otp-5')).toBeTruthy();
  expect(queryByTestId('phone-input')).toBeNull();

  // back arrow returns to the phone step
  fireEvent.press(getByTestId('back'));
  expect(getByTestId('heading')).toHaveTextContent(/Doctor login/i);
  expect(getByTestId('phone-input')).toBeTruthy();
  jest.useRealTimers();
});

test('keyboard closes once the sixth OTP digit is entered', () => {
  jest.useFakeTimers();
  const dismiss = jest.spyOn(Keyboard, 'dismiss');
  const { getByTestId, unmount } = render(<App />);

  fireEvent.changeText(getByTestId('phone-input'), '9876543210');
  fireEvent.press(getByTestId('cta'));
  act(() => {
    jest.advanceTimersByTime(1000);
  });

  // first five digits leave the keyboard up
  for (let i = 0; i < 5; i++) {
    fireEvent.changeText(getByTestId(`otp-${i}`), String(i + 1));
  }
  expect(dismiss).not.toHaveBeenCalled();

  // the sixth completes the code and dismisses it
  fireEvent.changeText(getByTestId('otp-5'), '6');
  expect(dismiss).toHaveBeenCalledTimes(1);

  // unmount before swapping timers back, so the resend countdown interval is
  // torn down under fake timers and cannot fire into the next test's cleanup
  unmount();
  dismiss.mockRestore();
  jest.useRealTimers();
});

test('Verify button unlocks only once all six digits are filled', () => {
  jest.useFakeTimers();
  const { getByTestId } = render(<App />);

  fireEvent.changeText(getByTestId('phone-input'), '9876543210');
  fireEvent.press(getByTestId('cta'));
  act(() => {
    jest.advanceTimersByTime(1000);
  });

  expect(getByTestId('verify')).toBeDisabled();
  for (let i = 0; i < 6; i++) {
    fireEvent.changeText(getByTestId(`otp-${i}`), String(i + 1));
  }
  expect(getByTestId('verify')).toBeEnabled();
  jest.useRealTimers();
});
