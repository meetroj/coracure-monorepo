import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { OTPInput, ageFromISO } from './forms';

/**
 * The OTP field's three easy-to-break behaviours.
 *
 * Each of these looks fine in a quick manual check and fails in a way users
 * report as "the app ate my code":
 *
 * - a pasted code lands in ONE box as a whole string, not one character per box
 * - backspace on an EMPTY box has to step back, and that fires no change event
 * - a completed code should fire `onComplete` exactly once
 */
const Harness = ({
  onComplete,
  initial = '',
}: {
  onComplete?: (code: string) => void;
  initial?: string;
}) => {
  const [value, setValue] = useState(initial);
  return <OTPInput value={value} onChange={setValue} onComplete={onComplete} autoFocus={false} />;
};

describe('OTPInput', () => {
  it('spreads a pasted code across every box', () => {
    render(<Harness />);
    // A paste (or SMS autofill) delivers the whole string to the focused box.
    fireEvent.changeText(screen.getByTestId('otp-0'), '123456');

    expect(screen.getByTestId('otp-0').props.value).toBe('1');
    expect(screen.getByTestId('otp-3').props.value).toBe('4');
    expect(screen.getByTestId('otp-5').props.value).toBe('6');
  });

  it('ignores non-digits in a pasted string', () => {
    render(<Harness />);
    fireEvent.changeText(screen.getByTestId('otp-0'), '12-34 56');

    expect(screen.getByTestId('otp-0').props.value).toBe('1');
    expect(screen.getByTestId('otp-5').props.value).toBe('6');
  });

  it('truncates a paste longer than the field', () => {
    render(<Harness />);
    fireEvent.changeText(screen.getByTestId('otp-0'), '1234567890');

    expect(screen.getByTestId('otp-5').props.value).toBe('6');
  });

  it('advances one box at a time when typing', () => {
    render(<Harness />);
    fireEvent.changeText(screen.getByTestId('otp-0'), '9');
    expect(screen.getByTestId('otp-0').props.value).toBe('9');
    expect(screen.getByTestId('otp-1').props.value).toBe('');
  });

  it('steps back and clears the previous digit on backspace in an empty box', () => {
    render(<Harness initial="12" />);
    // Box 2 is empty; backspace there must remove the '2' behind it.
    fireEvent(screen.getByTestId('otp-2'), 'keyPress', {
      nativeEvent: { key: 'Backspace' },
    });

    expect(screen.getByTestId('otp-0').props.value).toBe('1');
    expect(screen.getByTestId('otp-1').props.value).toBe('');
  });

  it('deletes in place when the box has a digit', () => {
    render(<Harness initial="12" />);
    fireEvent(screen.getByTestId('otp-1'), 'keyPress', {
      nativeEvent: { key: 'Backspace' },
    });

    expect(screen.getByTestId('otp-0').props.value).toBe('1');
    expect(screen.getByTestId('otp-1').props.value).toBe('');
  });

  it('fires onComplete once, with the whole code', () => {
    const onComplete = jest.fn();
    render(<Harness onComplete={onComplete} />);
    fireEvent.changeText(screen.getByTestId('otp-0'), '654321');

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('654321');
  });

  it('does not fire onComplete on a partial code', () => {
    const onComplete = jest.fn();
    render(<Harness onComplete={onComplete} />);
    fireEvent.changeText(screen.getByTestId('otp-0'), '654');

    expect(onComplete).not.toHaveBeenCalled();
  });
});

/**
 * Age is DERIVED from date of birth on every read and never stored — so the
 * client's own derivation has to agree with the server's, including the "has
 * their birthday happened yet this year" edge that off-by-one bugs live in.
 */
describe('ageFromISO', () => {
  // Fake timers move the system clock rather than replacing the Date
  // constructor, so `Date.UTC` and `new Date(iso)` inside the function under
  // test keep working normally.
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-10T00:00:00.000Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts a birthday that has already passed this year', () => {
    expect(ageFromISO('1990-04-17')).toBe(36);
  });

  it('does not count a birthday still to come this year', () => {
    expect(ageFromISO('1990-12-25')).toBe(35);
  });

  it('counts the birthday itself', () => {
    expect(ageFromISO('2000-09-10')).toBe(26);
  });

  it('rejects an impossible date rather than rolling it over', () => {
    // `new Date(2001, 1, 31)` silently becomes 3 March; that must not pass.
    expect(ageFromISO('2001-02-31')).toBeNull();
    expect(ageFromISO('2001-13-01')).toBeNull();
    expect(ageFromISO('not-a-date')).toBeNull();
    expect(ageFromISO('01-01-2001')).toBeNull();
  });
});
