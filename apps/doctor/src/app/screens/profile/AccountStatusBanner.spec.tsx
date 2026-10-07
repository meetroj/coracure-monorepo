import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { AccountStatusScreen, verificationItems } from './AccountStatusScreens';
import { demoRegistration } from '../../../data/registration';

const draft = {
  ...demoRegistration('+91 91234 56780'),
  basic: { ...demoRegistration('+91 91234 56780').basic, fullName: 'Kavya Rao', languages: ['English', 'Hindi'] },
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
  expect(screen.getByText('Kavya Rao · English, Hindi')).toBeTruthy();
  expect(screen.getByText(/Aadhaar · •+1156/)).toBeTruthy();
  const rows = screen.getAllByTestId(/^verification-/);
  expect(rows).toHaveLength(4);
  rows.forEach((row) => expect(row.props.accessibilityLabel).toMatch(/, Under review\./));
});

test('progress is a real sequence, not a made-up percentage', () => {
  show('pending');
  expect(screen.queryByText(/% Complete/)).toBeNull();
  expect(screen.getByText('Submitted 15 May 2026')).toBeTruthy();
  ['Profile incomplete', 'Submitted', 'Under review', 'Approved'].forEach((l) => expect(screen.getAllByText(l).length).toBeGreaterThan(0));
});

test('a rejection ends the sequence at Changes required, not Approved', () => {
  show('rejected');
  expect(screen.getByText('Changes required')).toBeTruthy();
  expect(screen.queryByText('Approved')).toBeNull();
});

test('a rejection shows the admin’s own reason, and only then', () => {
  const rejected = render(
    <AccountStatusScreen
      status="rejected"
      acknowledged={false}
      rejectionReason="The ID photo is unreadable."
      items={verificationItems('rejected', draft)}
      onAcknowledge={jest.fn()}
      onGetSupport={jest.fn()}
      onResubmit={jest.fn()}
    />
  );
  expect(screen.getByTestId('rejection-reason')).toHaveTextContent(/Reason from the verification team.*The ID photo is unreadable\./);
  rejected.unmount();

  // never on a status that is not a rejection, even if a stale reason is passed
  render(
    <AccountStatusScreen
      status="pending"
      acknowledged={false}
      rejectionReason="stale"
      items={verificationItems('pending', draft)}
      onAcknowledge={jest.fn()}
      onGetSupport={jest.fn()}
      onResubmit={jest.fn()}
    />
  );
  expect(screen.queryByTestId('rejection-reason')).toBeNull();
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
