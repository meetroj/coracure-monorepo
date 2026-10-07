import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { doctorProfileApi } from '@coracure/api';

import { VerifiedGate } from './VerifiedGate';
import { setSelfProfile } from '../state/actions';
import type { DoctorSelfProfile } from '@coracure/api';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
  useIsFocused: () => true,
}));

const profile = (verificationStatus: DoctorSelfProfile['verificationStatus']) =>
  ({ id: 'd', fullName: 'A', verificationStatus, languages: [], consultationDurationMinutes: 20, bufferMinutes: 10 }) as unknown as DoctorSelfProfile;

const Probe = () => <Text>clinical screen</Text>;

test('an unverified doctor sees why, and the screen never mounts to fetch', () => {
  setSelfProfile(profile('pending'));
  render(<VerifiedGate><Probe /></VerifiedGate>);
  expect(screen.getByTestId('verified-gate')).toBeTruthy();
  expect(screen.queryByText('clinical screen')).toBeNull();
});

test('a verified doctor, or one whose profile has not loaded, gets the screen', () => {
  render(<VerifiedGate><Probe /></VerifiedGate>);
  expect(screen.getByText('clinical screen')).toBeTruthy();
});

test('opens by itself once the server says the account is verified', async () => {
  jest.spyOn(doctorProfileApi, 'getProfile').mockResolvedValue(profile('verified'));
  setSelfProfile(profile('under_review'));
  render(<VerifiedGate><Probe /></VerifiedGate>);
  expect(screen.getByTestId('verified-gate')).toBeTruthy();
  await waitFor(() => expect(screen.getByText('clinical screen')).toBeTruthy());
});

describe('under-review layouts', () => {
  test('the Dashboard stays home: greeting, a progress tracker and what to do meanwhile', () => {
    setSelfProfile(profile('under_review'));
    render(<VerifiedGate variant="dashboard"><Probe /></VerifiedGate>);
    expect(screen.getByText('Your account is under review')).toBeTruthy();
    expect(screen.getByTestId('review-tracker')).toHaveProp('accessibilityLabel', 'Step 2 of 3: Review');
    expect(screen.getByTestId('shortcut-profile')).toBeTruthy();
    expect(screen.getByTestId('shortcut-help')).toBeTruthy();
    expect(screen.queryByText('clinical screen')).toBeNull();
  });

  test('the other tabs show the short panel, with no shortcuts', () => {
    setSelfProfile(profile('under_review'));
    render(<VerifiedGate><Probe /></VerifiedGate>);
    expect(screen.getByText('This section opens once your account is verified.')).toBeTruthy();
    expect(screen.queryByTestId('shortcut-profile')).toBeNull();
  });

  test('a rejection says what to do, and a suspension offers support instead of status', () => {
    setSelfProfile(profile('rejected'));
    const { unmount } = render(<VerifiedGate variant="dashboard"><Probe /></VerifiedGate>);
    expect(screen.getByText('Changes needed')).toBeTruthy();
    expect(screen.getByTestId('review-tracker')).toHaveProp('accessibilityLabel', 'Step 2 of 3: Review, needs changes');
    unmount();
    setSelfProfile(profile('suspended'));
    render(<VerifiedGate variant="dashboard"><Probe /></VerifiedGate>);
    expect(screen.getByText('Your account is suspended')).toBeTruthy();
    expect(screen.queryByTestId('review-tracker')).toBeNull();
  });
});
