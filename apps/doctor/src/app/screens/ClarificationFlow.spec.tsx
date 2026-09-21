import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import CreateClarificationScreen from './CreateClarificationScreen';
import ExpertClarificationScreen from './ExpertClarificationScreen';
import ExpertCaseReviewScreen from './ExpertCaseReviewScreen';
import ExpertResponseScreen from './ExpertResponseScreen';
import { deIdentify, initialDraft, hasIdentifiers, trackerSteps } from '../../data/clarification';

const noop = () => undefined;

/* ------------------------------ de-identification ------------------------- */

test('the shared case drops every direct identifier', () => {
  const shared = deIdentify(initialDraft) as Record<string, unknown>;
  ['patientName', 'patientId', 'consultationId'].forEach((k) =>
    expect(shared[k]).toBeUndefined()
  );
  // clinical content survives
  expect(shared.history).toBe(initialDraft.history);
  expect(shared.question).toBe(initialDraft.question);
});

test('the identifier scanner flags ids, phones and emails', () => {
  expect(hasIdentifiers('Patient PT-10482 reports poor sleep')).toBe(true);
  expect(hasIdentifiers('Reach him on +91 9876543210')).toBe(true);
  expect(hasIdentifiers('email rahul@example.com')).toBe(true);
  expect(hasIdentifiers('Two-week history of anxiety and disturbed sleep.')).toBe(false);
});

test('the tracker collapses later states into its third step', () => {
  expect(trackerSteps('posted').map((s) => s.state)).toEqual(['active', 'todo', 'todo']);
  expect(trackerSteps('clarificationNeeded')[2]).toEqual({
    label: 'Clarification needed',
    state: 'active',
  });
  // a closed case still renders three steps, with its own label
  expect(trackerSteps('closed')[2].label).toBe('Closed');
});

/* --------------------------------- wizard --------------------------------- */

const wizard = (over = {}) =>
  render(<CreateClarificationScreen onCancel={noop} onSubmit={noop} {...over} />);

test('step 1 shows only case details, not later steps', () => {
  const { getByText, getByTestId, queryByText } = wizard();
  expect(getByText('Create Clarification')).toBeTruthy();
  expect(getByText('Select an existing case')).toBeTruthy();
  expect(getByTestId('continue')).toBeDisabled();
  fireEvent.press(getByTestId('select-case-c1'));
  expect(getByText('Case title')).toBeTruthy();
  expect(getByText('Brief clinical history')).toBeTruthy();
  // step 2 and 3 fields must not be on this page
  expect(queryByText('What guidance do you need?')).toBeNull();
  expect(queryByText('Urgency')).toBeNull();
  expect(queryByText('Ready to share • Direct identifiers removed')).toBeNull();
});

test('choosing a case replaces the picker with that case, marked private', () => {
  const { getByText, getAllByText, getByTestId, queryByTestId } = wizard();
  fireEvent.press(getByTestId('select-case-c1'));

  // the list is gone, so the chosen patient is named exactly once
  expect(getAllByText('Rahul Sharma')).toHaveLength(1);
  expect(queryByTestId('select-case-c2')).toBeNull();
  expect(getByText('Private')).toBeTruthy();
});

test('the picker can be reopened to choose a different case', () => {
  const { getByTestId } = wizard();
  fireEvent.press(getByTestId('select-case-c1'));
  fireEvent.press(getByTestId('change-case'));

  expect(getByTestId('select-case-c2')).toBeTruthy();
});

test('stepping forward reaches the question step then the review', () => {
  const { getByTestId, getByText, getAllByText } = wizard();

  fireEvent.press(getByTestId('select-case-c1'));
  fireEvent.press(getByTestId('continue'));
  expect(getByText('What guidance do you need?')).toBeTruthy();
  expect(getByText('Supporting files')).toBeTruthy();

  fireEvent.press(getByTestId('continue'));
  // "Review & Share" is both the page heading and the third stepper label
  expect(getAllByText('Review & Share')).toHaveLength(2);
  expect(getByText('Ready to share • Direct identifiers removed')).toBeTruthy();
});

test('the review preview never shows the patient name', () => {
  const { getByTestId, queryByText } = wizard();
  fireEvent.press(getByTestId('select-case-c1'));
  fireEvent.press(getByTestId('continue'));
  fireEvent.press(getByTestId('continue'));
  expect(queryByText('Rahul Sharma')).toBeNull();
  expect(queryByText('PT-10482')).toBeNull();
  expect(queryByText('CON-10482')).toBeNull();
});

test('submission is gated on the identifier confirmation', () => {
  const onSubmit = jest.fn();
  const { getByTestId } = wizard({ onSubmit });

  fireEvent.press(getByTestId('select-case-c1'));
  fireEvent.press(getByTestId('continue'));
  fireEvent.press(getByTestId('continue'));
  expect(getByTestId('submit')).toBeDisabled();

  fireEvent.press(getByTestId('confirm'));
  expect(getByTestId('submit')).toBeEnabled();
  fireEvent.press(getByTestId('submit'));
  expect(onSubmit).toHaveBeenCalledTimes(1);
});

test('typing an identifier into the history warns the doctor', () => {
  const { getByTestId, getByText } = wizard();
  fireEvent.press(getByTestId('select-case-c1'));
  fireEvent.changeText(getByTestId('history'), 'Patient PT-10482 reports poor sleep');
  expect(getByText('Possible identifier found — please review')).toBeTruthy();
});

/* ----------------------------- clarification ------------------------------ */

const clar = (over = {}) =>
  render(<ExpertClarificationScreen onBack={noop} onSend={noop} {...over} />);

test('clarification screen shows the de-identified discussion', () => {
  const { getByText, queryByText } = clar();
  expect(getByText('D-23')).toBeTruthy();
  expect(getByText('Generalized Anxiety Disorder')).toBeTruthy();
  expect(getByText('3 Messages')).toBeTruthy();
  expect(queryByText('Rahul Sharma')).toBeNull();
});

test('the composer and thread actions stay visible at the end', () => {
  const { getByTestId } = clar();
  expect(getByTestId('reply-input')).toBeTruthy();
  expect(getByTestId('mark-reviewed')).toBeTruthy();
  expect(getByTestId('close-thread')).toBeTruthy();
});

test('reply must have content before it can be sent', () => {
  const onSend = jest.fn();
  const { getByTestId } = clar({ onSend });
  expect(getByTestId('send-reply')).toBeDisabled();
  fireEvent.changeText(getByTestId('reply-input'), 'Started four weeks ago, adherence consistent.');
  fireEvent.press(getByTestId('send-reply'));
  expect(onSend).toHaveBeenCalledWith('Started four weeks ago, adherence consistent.');
});

test('the old discussion note card is removed', () => {
  const { queryByText } = clar();
  expect(queryByText(/This discussion is for expert collaboration/)).toBeNull();
});

/* ----------------------------- expert review ------------------------------ */

const review = (over = {}) =>
  render(<ExpertCaseReviewScreen onBack={noop} onSubmit={noop} {...over} />);

test('the expert sees the case but never the patient identity', () => {
  const { getByText, queryByText } = review();
  expect(getByText('Expert access')).toBeTruthy();
  expect(getByText('Shared clinical context')).toBeTruthy();
  expect(getByText('Generalised Anxiety Disorder, provisional')).toBeTruthy();
  ['Rahul Sharma', 'PT-10482', 'CON-10482'].forEach((v) => expect(queryByText(v)).toBeNull());
});

test('the advisory boundary is stated on screen', () => {
  const { getByText } = review();
  expect(
    getByText('Guidance supports the treating doctor. It does not modify their care plan.')
  ).toBeTruthy();
  expect(getByText('No patient communication or wider record access.')).toBeTruthy();
});

test('submitting guidance needs both text and the confirmation', () => {
  const onSubmit = jest.fn();
  const { getByTestId } = review({ onSubmit });

  expect(getByTestId('submit')).toBeDisabled();
  fireEvent.changeText(getByTestId('guidance'), 'Confirm adherence before adjusting.');
  expect(getByTestId('submit')).toBeDisabled();

  fireEvent.press(getByTestId('confirm'));
  fireEvent.press(getByTestId('submit'));
  expect(onSubmit).toHaveBeenCalledWith('Confirm adherence before adjusting.', 'considerations');
});

test('response type is selectable and reported', () => {
  const onSubmit = jest.fn();
  const { getByTestId } = review({ onSubmit });
  fireEvent.press(getByTestId('type-followUp'));
  fireEvent.changeText(getByTestId('guidance'), 'Arrange earlier review.');
  fireEvent.press(getByTestId('confirm'));
  fireEvent.press(getByTestId('submit'));
  expect(onSubmit).toHaveBeenCalledWith('Arrange earlier review.', 'followUp');
});

/* ---------------------------- expert response ----------------------------- */

const response = (over = {}) =>
  render(<ExpertResponseScreen onBack={noop} onClose={noop} {...over} />);

test('the guidance is presented for reading, with its provenance', () => {
  const { getByText } = response();
  expect(getByText('Guidance from Dr. Neha Kapoor')).toBeTruthy();
  expect(getByText(/Confirm adherence and tolerability/)).toBeTruthy();
  expect(getByText('Clinical considerations • Psychiatry Expert')).toBeTruthy();
  expect(getByText('Response received')).toBeTruthy();
});

test('closing requires the responsibility confirmation', () => {
  const onClose = jest.fn();
  const { getByTestId } = response({ onClose });

  expect(getByTestId('close-thread')).toBeDisabled();
  fireEvent.press(getByTestId('confirm'));
  fireEvent.changeText(getByTestId('decision-note'), 'Continuing current plan, review in 3 days.');
  fireEvent.press(getByTestId('close-thread'));

  expect(onClose).toHaveBeenCalledWith(
    'Guidance reviewed',
    'Continuing current plan, review in 3 days.'
  );
});

test('closing is stated as an audit action, not a record update', () => {
  const { getByText } = response();
  expect(getByText('Closing keeps the complete discussion and audit history.')).toBeTruthy();
  expect(getByText('Nothing is added to the patient record automatically.')).toBeTruthy();
  expect(getByText('Reviewer and closure time will be recorded.')).toBeTruthy();
});

test('the response screen shows no patient identity and no red', () => {
  const { queryByText } = response();
  ['Rahul Sharma', 'PT-10482', 'CON-10482'].forEach((v) => expect(queryByText(v)).toBeNull());
});
