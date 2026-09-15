import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import ReviewsScreen from './ReviewsScreen';

const noop = () => undefined;

test('reviews states what it shows', () => {
  const { getByText } = render(<ReviewsScreen onBack={noop} />);
  expect(getByText('See what patients shared after consultations')).toBeTruthy();
});

test('back reports through to the caller', () => {
  // NOTE: the dashboard feedback card was removed by design request, so the
  // screen no longer has an entry point in AppShell and is exercised directly.
  const onBack = jest.fn();
  const { getByLabelText } = render(<ReviewsScreen onBack={onBack} />);
  fireEvent.press(getByLabelText('Back'));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('star filters narrow the list', () => {
  const { getByTestId, queryByText } = render(<ReviewsScreen onBack={noop} />);

  // all five are listed by default
  expect(queryByText(/listened patiently/)).toBeTruthy();
  expect(queryByText(/more time for questions/)).toBeTruthy();

  fireEvent.press(getByTestId('filter-4'));
  expect(queryByText(/started a few minutes late/)).toBeTruthy();
  expect(queryByText(/listened patiently/)).toBeNull();

  fireEvent.press(getByTestId('filter-all'));
  expect(queryByText(/listened patiently/)).toBeTruthy();
});

test('sort toggles between newest and oldest', () => {
  const { getByTestId, getByText } = render(<ReviewsScreen onBack={noop} />);

  expect(getByText('Newest')).toBeTruthy();
  fireEvent.press(getByTestId('sort-toggle'));
  expect(getByText('Oldest')).toBeTruthy();
});

test('the insight row can be dismissed', () => {
  const { getByLabelText, queryByText } = render(<ReviewsScreen onBack={noop} />);

  expect(queryByText(/this month/)).toBeTruthy();
  fireEvent.press(getByLabelText('Dismiss'));
  expect(queryByText(/this month/)).toBeNull();
});

test('reporting a concern reports the review it belongs to', () => {
  const onReport = jest.fn();
  const { getByLabelText } = render(<ReviewsScreen onBack={noop} onReport={onReport} />);

  fireEvent.press(getByLabelText('Report concern about the review from 2 May 2024'));
  expect(onReport).toHaveBeenCalledWith('r5');
});
