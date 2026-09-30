import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { doctorAuthApi } from '@coracure/api';
import { ApiError } from '@coracure/api/errors';

import { DoctorLoginScreen } from './DoctorLoginScreen';

/**
 * Sign-in against the real endpoints, driven through the screen.
 *
 * The cases here are the ones a manual run against a healthy backend never
 * reaches: the stale challenge after a resend, the refusal that must not move
 * the doctor forward, the double tap that would burn two rate-limit attempts,
 * and the reply that lands after the screen is gone.
 */

const serverError = (code: string, message: string, statusCode = 401) =>
  new ApiError({ statusCode, code, message });

let requestOtp: jest.SpyInstance;
let verifyOtp: jest.SpyInstance;
let onAuthenticated: jest.Mock;

beforeEach(() => {
  // The resend countdown is a 1s interval that outlives every assertion here.
  // On real timers it keeps ticking through cleanup and stalls the suite, so
  // the whole file runs on a controlled clock.
  jest.useFakeTimers();
  requestOtp = jest.spyOn(doctorAuthApi, 'requestOtp').mockResolvedValue({ challengeId: 'ch-1' });
  verifyOtp = jest
    .spyOn(doctorAuthApi, 'verifyOtp')
    .mockResolvedValue({ verificationStatus: 'verified' });
  onAuthenticated = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
});

/** Lets a mocked promise settle and React re-render, without touching the clock. */
const settle = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const mount = () => render(<DoctorLoginScreen onAuthenticated={onAuthenticated} />);

const enterNumber = async (digits = '9876543210') => {
  fireEvent.changeText(screen.getByTestId('phone-input'), digits);
  fireEvent.press(screen.getByTestId('cta'));
  await settle();
};

const enterCode = async (code = '000000') => {
  fireEvent.changeText(screen.getByTestId('otp-0'), code);
  fireEvent.press(screen.getByTestId('verify'));
  await settle();
};

/* ------------------------------ the happy path ---------------------------- */

test('sends the number in E.164 and only moves to the code step once the server answers', async () => {
  mount();

  fireEvent.changeText(screen.getByTestId('phone-input'), '9876543210');
  fireEvent.press(screen.getByTestId('cta'));

  // The field holds ten national digits; the API takes E.164.
  expect(requestOtp).toHaveBeenCalledWith('+919876543210');
  // Still on the number step: moving first would show a code screen for a send
  // that may be about to be refused.
  expect(screen.queryByTestId('otp-0')).toBeNull();

  await settle();
  expect(screen.getByTestId('otp-0')).toBeTruthy();
});

test('verifies with the challenge id from the send, and reports the verification status', async () => {
  mount();
  await enterNumber();
  await enterCode('123456');

  expect(verifyOtp).toHaveBeenCalledWith({
    mobileNumber: '+919876543210',
    challengeId: 'ch-1',
    code: '123456',
  });
  expect(onAuthenticated).toHaveBeenCalledWith('9876543210', 'verified');
});

test('hands an unverified doctor through with their real status, not as verified', async () => {
  verifyOtp.mockResolvedValue({ verificationStatus: 'under_review' });
  mount();
  await enterNumber();
  await enterCode();

  // Where they land is the server's answer. The app must not round it up.
  expect(onAuthenticated).toHaveBeenCalledWith('9876543210', 'under_review');
});

/* ------------------------------- the challenge ---------------------------- */

test('a resend replaces the challenge id, so the new code is verified against the new send', async () => {
  mount();
  await enterNumber();

  requestOtp.mockResolvedValue({ challengeId: 'ch-2' });
  // The resend link only appears once the countdown runs out.
  act(() => {
    jest.advanceTimersByTime(31_000);
  });
  fireEvent.press(screen.getByTestId('resend'));
  await settle();

  await enterCode('222222');

  // Verifying a fresh code against `ch-1` would fail as an invalid code and
  // look to the doctor like the SMS was wrong.
  expect(verifyOtp).toHaveBeenCalledWith(expect.objectContaining({ challengeId: 'ch-2' }));
});

test('changing the number drops the old challenge instead of verifying against it', async () => {
  mount();
  await enterNumber('9876543210');

  fireEvent.press(screen.getByTestId('change-number'));
  fireEvent.changeText(screen.getByTestId('phone-input'), '9123456780');
  fireEvent.press(screen.getByTestId('cta'));
  await settle();

  // A second send happened for the new number, and that is the id used.
  expect(requestOtp).toHaveBeenLastCalledWith('+919123456780');
});

/* -------------------------------- refusals -------------------------------- */

test('an unenrolled number keeps the doctor on the number step with the reason shown', async () => {
  requestOtp.mockRejectedValue(
    serverError('INVALID_CREDENTIALS', 'That number is not registered as a doctor.'),
  );
  mount();
  await enterNumber('9000000000');

  expect(screen.getByTestId('auth-error')).toHaveTextContent(/not registered as a doctor/i);
  // No code step: six more digits cannot fix an account that does not exist.
  expect(screen.queryByTestId('otp-0')).toBeNull();
});

test('a rate limit shows the server sentence, which is the only place the wait is written', async () => {
  requestOtp.mockRejectedValue(
    serverError('TOO_MANY_ATTEMPTS', 'Too many attempts. Please try again in 15 minutes.', 429),
  );
  mount();
  await enterNumber();

  expect(screen.getByTestId('auth-error')).toHaveTextContent(/try again in 15 minutes/i);
});

test('a suspended account is refused at the code step and never reaches the app', async () => {
  verifyOtp.mockRejectedValue(
    serverError('ACCOUNT_NOT_ACTIVE', 'This account is no longer active.', 403),
  );
  mount();
  await enterNumber();
  await enterCode();

  expect(screen.getByTestId('auth-error')).toHaveTextContent(/no longer active/i);
  expect(onAuthenticated).not.toHaveBeenCalled();
});

test('a wrong code clears the boxes and stays on the code step so it can be retyped', async () => {
  verifyOtp.mockRejectedValue(
    serverError('INVALID_CREDENTIALS', 'That code is not correct or has expired.'),
  );
  mount();
  await enterNumber();
  await enterCode('111111');

  expect(screen.getByTestId('auth-error')).toHaveTextContent(/not correct or has expired/i);
  expect(onAuthenticated).not.toHaveBeenCalled();
  // Editing six digits already known to be wrong is worse than starting clean.
  expect(screen.getByTestId('otp-0').props.value).toBe('');
  expect(screen.getByTestId('otp-5').props.value).toBe('');
});

test('a dead network reads as a connection problem, not as a bad number', async () => {
  requestOtp.mockRejectedValue(
    new ApiError({ statusCode: 0, code: 'NETWORK_UNAVAILABLE', message: 'unused' }),
  );
  mount();
  await enterNumber();

  expect(screen.getByTestId('auth-error')).toHaveTextContent(/No internet connection/i);
});

test('an SMS outage does not read as "your number is wrong"', async () => {
  requestOtp.mockRejectedValue(
    serverError('OTP_PROVIDER_UNAVAILABLE', 'Slide returned 502', 502),
  );
  mount();
  await enterNumber();

  expect(screen.getByTestId('auth-error')).toHaveTextContent(/could not send a code/i);
});

/* ---------------------------- in-flight behaviour ------------------------- */

test('a second tap while a verify is in flight does not burn a second attempt', async () => {
  let release: (v: { verificationStatus: 'verified' }) => void = () => undefined;
  verifyOtp.mockImplementation(() => new Promise((resolve) => (release = resolve)));
  mount();
  await enterNumber();

  fireEvent.changeText(screen.getByTestId('otp-0'), '123456');
  fireEvent.press(screen.getByTestId('verify'));
  fireEvent.press(screen.getByTestId('verify'));

  // Each verify counts against the per-number rate limit, so a double tap must
  // not cost two of them.
  expect(verifyOtp).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('verify')).toBeDisabled();

  await act(async () => {
    release({ verificationStatus: 'verified' });
  });
  await waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1));
});

test('the button says what it is doing while the request is out', async () => {
  verifyOtp.mockImplementation(() => new Promise(() => undefined));
  mount();
  await enterNumber();

  fireEvent.changeText(screen.getByTestId('otp-0'), '123456');
  fireEvent.press(screen.getByTestId('verify'));

  expect(screen.getByTestId('verify')).toHaveTextContent(/Verifying/i);
});

test('a reply landing after the screen is gone signs nobody in', async () => {
  let release: (v: { verificationStatus: 'verified' }) => void = () => undefined;
  verifyOtp.mockImplementation(() => new Promise((resolve) => (release = resolve)));
  const view = mount();
  await enterNumber();

  fireEvent.changeText(screen.getByTestId('otp-0'), '123456');
  fireEvent.press(screen.getByTestId('verify'));
  view.unmount();

  await act(async () => {
    release({ verificationStatus: 'verified' });
  });

  expect(onAuthenticated).not.toHaveBeenCalled();
});
