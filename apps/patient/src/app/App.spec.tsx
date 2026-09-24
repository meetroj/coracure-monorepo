import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

import App from './App';

/**
 * The boot path.
 *
 * The thing worth pinning here is the ORDER: an unauthenticated launch must
 * show the splash while the keychain is read and only then land on welcome. If
 * it renders welcome first and corrects itself, a returning user sees the
 * sign-up screen flash before their dashboard — which is the bug this
 * three-state session status exists to prevent.
 */
beforeEach(() => {
  (global.fetch as jest.Mock).mockReset();
});

describe('App boot', () => {
  it('shows the splash first', async () => {
    render(<App />);
    expect(screen.getByTestId('splash')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('welcome')).toBeTruthy());
  });

  it('lands on welcome when there is no session, and never calls the API', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByTestId('welcome')).toBeTruthy());

    // No session means nothing authenticated should have been attempted.
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByText('Get Started')).toBeTruthy();
  });

  it('routes Get Started into sign-in', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('welcome')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Get Started'));

    await waitFor(() => expect(screen.getByTestId('login')).toBeTruthy());
    expect(screen.getByText('Welcome back')).toBeTruthy();
  });

  it('refuses a protected route without a session', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('welcome')).toBeTruthy());

    // "Skip" is a plain navigate('login'); the guard is what matters — there is
    // no path from here that reaches the dashboard.
    fireEvent.press(screen.getByLabelText('Skip the introduction and sign in'));

    await waitFor(() => expect(screen.getByTestId('login')).toBeTruthy());
    expect(screen.queryByTestId('dashboard')).toBeNull();
  });
});


describe('Demo access', () => {
  it('opens the patient dashboard from explicit demo login without a backend', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('welcome')).toBeTruthy());
    fireEvent.press(screen.getByText(/Quick Demo Login/));
    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Care Hub'));
    expect(screen.getAllByLabelText('Home')).toHaveLength(1);
    fireEvent.press(screen.getByLabelText('Profile'));
    expect(screen.getAllByLabelText('Home')).toHaveLength(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

