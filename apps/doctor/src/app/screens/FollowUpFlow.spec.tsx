import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import PatientFollowUpDetailScreen from './PatientFollowUpDetailScreen';
import AssignFollowUpPlanScreen from './AssignFollowUpPlanScreen';
import { getState } from '../../state/store';
import { selectAlert, selectAppointment } from '../../state/selectors';
import { reviewAlert } from '../../state/actions';

const detail = (alertId: string, over: Partial<React.ComponentProps<typeof PatientFollowUpDetailScreen>> = {}) => {
  const props = {
    alert: selectAlert(getState(), alertId)!,
    onBack: jest.fn(),
    onReview: jest.fn(),
    onMessage: jest.fn(),
    onOpenConsultation: jest.fn(),
    ...over,
  };
  return { props, ...render(<PatientFollowUpDetailScreen {...props} />) };
};

/* ---------------------------- critical findings ---------------------------- */

test('a red flag leads with what happened, for this patient only', () => {
  detail('al1');
  expect(screen.getByTestId('alert-banner')).toHaveTextContent(/RED FLAG/i);
  expect(screen.getAllByText(/Rahul Sharma/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/Neha Pillai/)).toBeNull();
});

test('a red flag cannot be marked reviewed without an action and a note of what was done', () => {
  const { props } = detail('al1');
  expect(screen.getByTestId('save')).toBeDisabled();

  fireEvent.press(screen.getByTestId('action-calledPatient'));
  expect(screen.getByTestId('save')).toBeDisabled();
  fireEvent.changeText(screen.getByTestId('note'), 'Too short');
  expect(screen.getByTestId('save')).toBeDisabled();

  fireEvent.changeText(screen.getByTestId('note'), 'Called the patient; safety plan agreed with family.');
  fireEvent.press(screen.getByTestId('save'));
  expect(props.onReview).toHaveBeenCalledWith('calledPatient', 'Called the patient; safety plan agreed with family.');
});

test('messaging and the consultation are one tap away from the finding', () => {
  const { props } = detail('al1');
  fireEvent.press(screen.getByTestId('message-now'));
  expect(props.onMessage).toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('open-consultation'));
  expect(props.onOpenConsultation).toHaveBeenCalled();
});

test('reviewing records the action, and the alert shows as reviewed afterwards', () => {
  reviewAlert('al2', 'messaged', 'Messaged to check in.');
  expect(selectAlert(getState(), 'al2')!.live.status).toBe('reviewed');
  detail('al2');
  expect(screen.getByTestId('alert-reviewed')).toBeTruthy();
  expect(screen.queryByTestId('save')).toBeNull();
});

/* ------------------------------ follow-up plan ------------------------------ */

test('assigning a plan reports the pathway, duration and a start date that is not in the past', () => {
  const onAssign = jest.fn();
  render(
    <AssignFollowUpPlanScreen
      appointment={selectAppointment(getState(), 'a1')!}
      onBack={jest.fn()}
      onAssign={onAssign}
      onViewConsultation={jest.fn()}
    />
  );
  fireEvent.press(screen.getByTestId('pathway-sleep'));
  fireEvent.press(screen.getByTestId('duration-14'));
  fireEvent.press(screen.getByTestId('assign'));
  const plan = onAssign.mock.calls[0][0];
  expect(plan).toEqual(expect.objectContaining({ pathway: 'sleep', duration: 14 }));
  expect(plan.start >= '2026-05-15').toBe(true);
});
