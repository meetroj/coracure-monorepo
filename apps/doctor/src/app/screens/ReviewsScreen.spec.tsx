import React from 'react';
import { render, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { doctorFeedbackApi } from '@coracure/api';
import { ApiError } from '@coracure/api/errors';

import ReviewsScreen from './ReviewsScreen';
import { KEYS, NO_FEEDBACK } from '../../data/feedback';
import { __resetResourceCache, seedResource } from '../../data/useResource';
import { sampleFeedback } from '../../test/fixtures';

// test-setup seeds `sampleFeedback` as the server's answer: 12 ratings averaging
// 4.6, of which the newest three are listed.

test('the figures are the server’s, over every rating — not an average of the list', () => {
  render(<ReviewsScreen onBack={jest.fn()} />);
  // The three listed ratings average 4.0; the doctor's record is 4.6 over twelve.
  expect(screen.getByTestId('rating-average')).toHaveTextContent('4.6');
  expect(screen.getByText('Based on 12 reviews')).toBeTruthy();
  expect(screen.getByText('Recent reviews')).toBeTruthy();
  expect(screen.getByText('The latest 3 of 12')).toBeTruthy();
  expect(screen.getAllByTestId(/^review-c-/)).toHaveLength(3);
});

test('a review shows the patient’s initials, the consultation it was for, and what they wrote', () => {
  render(<ReviewsScreen onBack={jest.fn()} />);
  const card = within(screen.getByTestId('review-c-101'));
  expect(card.getByText('Patient A.S.')).toBeTruthy();
  expect(card.getByText('12 May 2026')).toBeTruthy();
  expect(card.getByText('Video consultation')).toBeTruthy();
  expect(card.getByText(/Listened patiently/)).toBeTruthy();
});

test('a rating with no comment and no name on file still reads sensibly', () => {
  render(<ReviewsScreen onBack={jest.fn()} />);
  const card = within(screen.getByTestId('review-c-102'));
  expect(card.getByText('Verified patient')).toBeTruthy();
  expect(card.getByText('Rated without a comment.')).toBeTruthy();
  expect(card.getByText('Audio consultation')).toBeTruthy();
});

/** The server has no tags and no way to report a review, so the screen has neither. */
test('nothing pretends to send a report, and there are no filters or sort', () => {
  render(<ReviewsScreen onBack={jest.fn()} />);
  expect(screen.queryByText('Report concern')).toBeNull();
  expect(screen.queryByTestId(/^report-/)).toBeNull();
  expect(screen.queryByTestId('sort-toggle')).toBeNull();
  expect(screen.queryByTestId('filter-5')).toBeNull();
});

test('no ratings yet keeps the same layout at zero: 0.0 and "0 reviews"', () => {
  seedResource(KEYS.feedback, NO_FEEDBACK);
  render(<ReviewsScreen onBack={jest.fn()} />);
  expect(screen.getByTestId('rating-average')).toHaveTextContent('0.0');
  expect(screen.getByText('Based on 0 reviews')).toBeTruthy();
  // The list has nothing in it, and says why rather than standing empty.
  expect(screen.getByText('No reviews yet')).toBeTruthy();
  expect(screen.queryByText('Recent reviews')).toBeNull();
});

/** A backend that predates the route answers NOT_FOUND; that is "no reviews", not a failure. */
test('a server without the feedback route reads as no reviews, not as an error', async () => {
  __resetResourceCache();
  jest
    .spyOn(doctorFeedbackApi, 'getFeedback')
    .mockRejectedValue(new ApiError({ statusCode: 404, code: 'NOT_FOUND', message: 'Cannot GET /api/v1/doctor/feedback' }));

  render(<ReviewsScreen onBack={jest.fn()} />);
  await waitFor(() => expect(screen.getByTestId('rating-average')).toHaveTextContent('0.0'));
  expect(screen.getByText('Based on 0 reviews')).toBeTruthy();
  expect(screen.queryByTestId('reviews-error')).toBeNull();
});

test('a failed load says so, and Retry loads the reviews', async () => {
  __resetResourceCache();
  const getFeedback = jest
    .spyOn(doctorFeedbackApi, 'getFeedback')
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(sampleFeedback);

  render(<ReviewsScreen onBack={jest.fn()} />);
  await waitFor(() => expect(screen.getByTestId('reviews-error')).toBeTruthy());
  expect(screen.queryByTestId('rating-overview')).toBeNull();

  fireEvent.press(screen.getByTestId('reviews-error-retry'));
  await waitFor(() => expect(screen.getByTestId('rating-average')).toHaveTextContent('4.6'));
  expect(getFeedback).toHaveBeenCalledTimes(2);
});

test('the info button explains how reviews work', () => {
  render(<ReviewsScreen onBack={jest.fn()} />);
  fireEvent.press(screen.getByTestId('reviews-info'));
  expect(screen.getByText('About reviews')).toBeTruthy();
  expect(screen.getByText(/Only patients who completed a consultation/)).toBeTruthy();
  expect(screen.getByText(/initials, never their name/)).toBeTruthy();
});

test('back reports through to the caller', () => {
  const onBack = jest.fn();
  render(<ReviewsScreen onBack={onBack} />);
  fireEvent.press(screen.getByTestId('back'));
  expect(onBack).toHaveBeenCalledTimes(1);
});
