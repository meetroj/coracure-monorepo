import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import ReviewsScreen from './ReviewsScreen';

const noop = () => undefined;

test('reviews uses the simplified header and removes appreciation', () => {
  const { getByText, queryByText } = render(<ReviewsScreen onBack={noop} />);
  expect(getByText('Reviews & Feedback')).toBeTruthy();
  expect(queryByText('See what patients shared after consultations')).toBeNull();
  expect(queryByText('Patients appreciate')).toBeNull();
});

test('back reports through to the caller', () => {
  // NOTE: the dashboard feedback card was removed by design request, so the
  // screen no longer has an entry point in AppShell and is exercised directly.
  const onBack = jest.fn();
  const { getByLabelText } = render(<ReviewsScreen onBack={onBack} />);
  fireEvent.press(getByLabelText('Back'));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('all reviews are shown without rating filters', () => {
  const { queryByTestId, queryByText } = render(<ReviewsScreen onBack={noop} />);
  expect(queryByText(/listened patiently/)).toBeTruthy();
  expect(queryByText(/more time for questions/)).toBeTruthy();
  expect(queryByTestId('filter-all')).toBeNull();
  expect(queryByTestId('filter-5')).toBeNull();
  expect(queryByTestId('filter-4')).toBeNull();
});

// The screen shows reviews in authored order. There is no sort control and no
// rating-trend banner: this is a record of what patients said, not a dashboard.
test('there is no sort control and no rating-trend banner', () => {
  const { queryByTestId, queryByText } = render(<ReviewsScreen onBack={noop} />);

  expect(queryByTestId('sort-toggle')).toBeNull();
  expect(queryByText('Newest')).toBeNull();
  expect(queryByText(/this month/)).toBeNull();
});

test('reporting a concern reports the review it belongs to', () => {
  const onReport = jest.fn();
  const { getByLabelText } = render(<ReviewsScreen onBack={noop} onReport={onReport} />);

  fireEvent.press(getByLabelText('Report concern about the review from 2 May 2024'));
  expect(onReport).toHaveBeenCalledWith('r5');
});
