import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { AccountStatusScreen, verificationItems } from './AccountStatusScreens';
import { demoRegistration } from '../../../data/registration';

const draft = {
  ...demoRegistration('+91 91234 56780'),
  basic: { ...demoRegistration('+91 91234 56780').basic, fullName: 'Kavya Rao', languages: ['English', 'Kannada'] },
};

const show = (status: 'pending' | 'rejected' | 'approved', acknowledged = false, onBack?: () => void) =>
  render(
    <AccountStatusScreen
      status={status}
      acknowledged={acknowledged}
      submittedAt="15 May 2026"
      items={verificationItems(status, draft)}
      onBack={onBack}
      onAcknowledge={jest.fn()}
      onGetSupport={jest.fn()}
      onResubmit={jest.fn()}
    />
  );

test('the items describe what this doctor submitted, not a fixture', () => {
  show('pending');
  expect(screen.getByText('Kavya Rao · English, Kannada')).toBeTruthy();
  expect(screen.getByText(/Aadhaar · •+1156/)).toBeTruthy();
  const rows = screen.getAllByTestId(/^verification-/);
  expect(rows).toHaveLength(4);
  rows.forEach((row) => expect(row.props.accessibilityLabel).toMatch(/, Under review\./));
});

test('progress is a real sequence, not a made-up percentage', () => {
  show('pending');
  expect(screen.queryByText(/% Complete/)).toBeNull();
  expect(screen.getByText('Submitted 15 May 2026')).toBeTruthy();
  ['Submitted', 'Under review', 'Approved'].forEach((l) => expect(screen.getAllByText(l).length).toBeGreaterThan(0));
});

test('a rejection names the issues and marks the rest verified', () => {
  show('rejected');
  expect(screen.getByText('Name mismatch')).toBeTruthy();
  expect(screen.getByText('Document unclear')).toBeTruthy();
  expect(screen.getByText('2 items need your attention before your account can be activated.')).toBeTruthy();
});

test('Go to Dashboard is offered while the status is new; not once it has been seen', () => {
  const unseen = show('approved', false);
  expect(screen.getByTestId('acknowledge')).toBeTruthy();
  unseen.unmount();
  show('approved', true, jest.fn());
  expect(screen.queryByTestId('acknowledge')).toBeNull();
});

test('status rows are information, not dead controls', () => {
  show('pending');
  screen.getAllByTestId(/^verification-/).forEach((row) => expect(row.props.onPress).toBeUndefined());
});
