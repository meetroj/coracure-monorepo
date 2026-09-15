import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import AssignFollowUpPlanScreen from './AssignFollowUpPlanScreen';
import CareHubScreen from './CareHubScreen';
import PatientFollowUpDetailScreen from './PatientFollowUpDetailScreen';

const noop = () => undefined;

/* --------------------------- assign follow-up plan ------------------------- */

const plan = (over = {}) =>
  render(<AssignFollowUpPlanScreen onBack={noop} onAssign={noop} {...over} />);

test('plan screen shows the pathway summary without exposing the questions', () => {
  const { getByText, getAllByText, queryByText } = plan();
  // the phrase is both the page heading and the primary button
  expect(getAllByText('Assign Follow-up Plan')).toHaveLength(2);
  expect(getByText('Clinically approved • 7 daily questions')).toBeTruthy();
  // the questions themselves are governed centrally and must not appear here
  expect(queryByText(/how have you been feeling/i)).toBeNull();
  expect(queryByText(/edit questions/i)).toBeNull();
});

test('review date and check-in count derive from the chosen duration', () => {
  const { getByTestId } = plan();

  // default 7 days: 16 May start -> 22 May review
  expect(getByTestId('review-date').props.children).toBe('22 May 2024');
  expect(getByTestId('checkin-count').props.children).toBe(7);

  fireEvent.press(getByTestId('duration-14'));
  expect(getByTestId('review-date').props.children).toBe('29 May 2024');
  expect(getByTestId('checkin-count').props.children).toBe(14);

  fireEvent.press(getByTestId('duration-3'));
  expect(getByTestId('review-date').props.children).toBe('18 May 2024');
});

test('selecting a pathway updates the information panel', () => {
  const { getByTestId, getByText } = plan();
  fireEvent.press(getByTestId('pathway-sleep'));
  expect(getByText('Clinically approved • 5 daily questions')).toBeTruthy();
});

test('assigning reports through', () => {
  const onAssign = jest.fn();
  const { getByTestId } = plan({ onAssign });
  fireEvent.press(getByTestId('assign'));
  expect(onAssign).toHaveBeenCalledTimes(1);
});

/* -------------------------------- care hub -------------------------------- */

const hub = (over = {}) => render(<CareHubScreen onBack={noop} onSave={noop} {...over} />);

test('care hub opens with nothing selected for a new consultation', () => {
  // a fresh consultation must not arrive pre-recommended
  const { getByText } = hub();
  expect(getByText('Selected Items (0)')).toBeTruthy();
});

test('removing a chip deselects without removing the resource', () => {
  const { getByTestId, getByText, queryByText } = hub({ initialSelected: ['r1', 'r3'] });

  expect(getByText('Selected Items (2)')).toBeTruthy();
  fireEvent.press(getByTestId('remove-r1'));
  expect(getByText('Selected Items (1)')).toBeTruthy();
  // the resource card itself is still on the grid, just unselected
  expect(queryByText('Guided Breathing')).toBeTruthy();
});

test('unpublished content is never offered for recommendation', () => {
  const { getByTestId, queryByText } = hub();
  fireEvent.press(getByTestId('care-tab-education'));
  // m4 is written but not published, so it must not appear at all
  expect(queryByText('Substance Use: First Steps')).toBeNull();
});

test('care hub carries only psychiatry-appropriate content', () => {
  const { queryByText } = hub();
  [/hypertension/i, /diabetes/i, /cardio/i, /nutrition/i, /physical activity/i].forEach((re) =>
    expect(queryByText(re)).toBeNull()
  );
});

test('caregiver material states its consent requirement', () => {
  const { getByText } = hub();
  expect(getByText('Requires patient consent before sharing')).toBeTruthy();
});

test('saving reports the selected ids and the note', () => {
  const onSave = jest.fn();
  const { getByTestId } = hub({ onSave, initialSelected: ['r1', 'r3'], initialNote: 'Start with breathing.' });
  fireEvent.press(getByTestId('save-recommendations'));
  expect(onSave).toHaveBeenCalledWith(['r1', 'r3'], 'Start with breathing.');
});

/* ---------------------------- follow-up detail ---------------------------- */

const detail = (over = {}) =>
  render(<PatientFollowUpDetailScreen onBack={noop} onSave={noop} {...over} />);

test('detail shows the triggering responses verbatim', () => {
  const { getByText } = detail();
  expect(getByText('Have you had thoughts of harming yourself?')).toBeTruthy();
  expect(getByText('Do you feel safe right now?')).toBeTruthy();
  expect(getByText('Have your symptoms significantly worsened?')).toBeTruthy();
});

test('the detail states observed check-ins only, never a score or prediction', () => {
  const { queryByText } = detail();
  expect(queryByText(/risk score/i)).toBeNull();
  expect(queryByText(/\d\.\d/)).toBeNull();
  // the trend summary was removed; nothing may reintroduce a direction claim
  expect(queryByText(/recent trend/i)).toBeNull();
  expect(queryByText('Worsening')).toBeNull();
});

test('the seven cells carry a plan day, a calendar date and a face', () => {
  const { getByText, getByTestId } = detail();
  // oldest first, current day last and pre-selected
  expect(getByText('D-6')).toBeTruthy();
  expect(getByText('May 9')).toBeTruthy();
  expect(getByText('D-12')).toBeTruthy();
  expect(getByText('May 15')).toBeTruthy();
  expect(getByTestId('day-12').props.accessibilityState.selected).toBe(true);
});

test('the legend names the three states a doctor can act on', () => {
  const { getByText, queryByText } = detail();
  expect(getByText('Good')).toBeTruthy();
  expect(getByText('Needs Attention')).toBeTruthy();
  expect(getByText('High Risk')).toBeTruthy();
  // pending is not an outcome, so it never appears in the key
  expect(queryByText('Pending')).toBeNull();
});

test('the red-flag card counts the answers it lists', () => {
  const { getByText } = detail();
  expect(getByText('Answers Triggering Red Flag')).toBeTruthy();
  expect(getByText("Today's check-in • 3 issues")).toBeTruthy();
});

test('choosing the referral tile escalates as well as selecting', () => {
  const onEscalate = jest.fn();
  const { getByTestId } = detail({ onEscalate });

  fireEvent.press(getByTestId('action-doctorReview'));
  expect(onEscalate).not.toHaveBeenCalled();

  fireEvent.press(getByTestId('action-emergency'));
  expect(onEscalate).toHaveBeenCalledTimes(1);
});

test('detail carries no cardiology content', () => {
  const { queryByText } = detail();
  [/chest pain/i, /blood pressure/i, /angio/i, /swelling/i, /breathing/i].forEach((re) =>
    expect(queryByText(re)).toBeNull()
  );
});

test('choosing an action and saving reports both action and note', () => {
  const onSave = jest.fn();
  const { getByTestId } = detail({ onSave });

  fireEvent.press(getByTestId('action-doctorReview'));
  fireEvent.changeText(getByTestId('note'), 'Contacted patient, safety plan reviewed.');
  fireEvent.press(getByTestId('save'));

  expect(onSave).toHaveBeenCalledWith('doctorReview', 'Contacted patient, safety plan reviewed.');
});
