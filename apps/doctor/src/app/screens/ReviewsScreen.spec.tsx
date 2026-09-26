import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';

import ReviewsScreen from './ReviewsScreen';
import { getState } from '../../state/store';

test('reviews show in authored order with no filters, sort or trend banner', () => {
  render(<ReviewsScreen onBack={jest.fn()} />);
  expect(screen.getByText(/listened patiently/)).toBeTruthy();
  expect(screen.queryByTestId('sort-toggle')).toBeNull();
  expect(screen.queryByTestId('filter-5')).toBeNull();
});

test('the list says it is the newest few of all the reviews counted above', () => {
  render(<ReviewsScreen onBack={jest.fn()} />);
  expect(screen.getByText('Based on 126 reviews')).toBeTruthy();
  expect(screen.getByText('Recent reviews')).toBeTruthy();
  expect(screen.getByText(`The latest ${screen.getAllByTestId(/^review-r\d+$/).length} of 126`)).toBeTruthy();
});

test('reviews never name the doctor by a fixed name', () => {
  render(<ReviewsScreen onBack={jest.fn()} />);
  expect(screen.queryByText(/Dr\. Mehta/)).toBeNull();
});

test('the info button explains how reviews work', () => {
  render(<ReviewsScreen onBack={jest.fn()} />);
  fireEvent.press(screen.getByTestId('reviews-info'));
  expect(screen.getByText('About reviews')).toBeTruthy();
  expect(screen.getByText(/Only patients who completed a consultation/)).toBeTruthy();
});

test('reporting a concern needs a reason, asks first, and marks the review', () => {
  render(<ReviewsScreen onBack={jest.fn()} />);
  fireEvent.press(screen.getByTestId('report-r5'));
  expect(screen.getByTestId('report-confirm')).toBeDisabled();
  fireEvent.press(screen.getByTestId('reason-1'));
  fireEvent.press(screen.getByTestId('report-confirm'));
  expect(Alert.alert).toHaveBeenLastCalledWith('Report this review?', expect.any(String), expect.any(Array), expect.any(Object));
  expect(getState().reviewReports.r5).toBe('Not about my consultation');
  expect(screen.getByTestId('reported-r5')).toBeTruthy();
  expect(screen.queryByTestId('report-r5')).toBeNull();
});

test('back reports through to the caller', () => {
  const onBack = jest.fn();
  render(<ReviewsScreen onBack={onBack} />);
  fireEvent.press(screen.getByTestId('back'));
  expect(onBack).toHaveBeenCalledTimes(1);
});
