import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';

import ClarificationsScreen from './ClarificationsScreen';
import CreateClarificationScreen from './CreateClarificationScreen';
import ExpertClarificationScreen from './ExpertClarificationScreen';
import ExpertResponseScreen from './ExpertResponseScreen';
import { getState } from '../../state/store';

const clar = (id: string) => getState().clarifications.find((c) => c.id === id)!;

/* --------------------------------- the list --------------------------------- */

test('filters narrow the list and every row opens its own thread', () => {
  const onOpen = jest.fn();
  render(<ClarificationsScreen onOpen={onOpen} onNewQuery={jest.fn()} />);
  fireEvent.press(screen.getByTestId('clarification-filter-responseReceived'));
  expect(screen.getByTestId('clarification-cl3')).toBeTruthy();
  expect(screen.queryByTestId('clarification-cl1')).toBeNull();
  fireEvent.press(screen.getByTestId('clarification-cl3'));
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'cl3' }));
});

/* ---------------------------------- create ---------------------------------- */

const create = (over: Partial<React.ComponentProps<typeof CreateClarificationScreen>> = {}) => {
  const props = { onCancel: jest.fn(), onSubmit: jest.fn(), onSaveDraft: jest.fn(), ...over };
  return { props, ...render(<CreateClarificationScreen {...props} />) };
};

test('a case is chosen first, and its details come from that consultation', () => {
  create();
  expect(screen.getByTestId('continue')).toBeDisabled();
  fireEvent.press(screen.getByTestId('select-case-a2'));
  expect(screen.getByText('Anita Patel')).toBeTruthy();
  expect(screen.getByText('Private')).toBeTruthy();
});

test('each step gates the next, and the question must say something', () => {
  create({ initialAppointmentId: 'a2' });
  fireEvent.changeText(screen.getByTestId('title'), 'Drowsiness after a dose increase');
  fireEvent.changeText(screen.getByTestId('history'), 'Daytime drowsiness since sertraline was increased last week.');
  fireEvent.changeText(screen.getByTestId('diagnosis'), 'Depression, on treatment');
  fireEvent.press(screen.getByTestId('continue'));

  fireEvent.changeText(screen.getByTestId('question'), 'Why?');
  expect(screen.getByTestId('continue')).toBeDisabled();
  fireEvent.changeText(screen.getByTestId('question'), 'Should the dose go back down, or change the timing?');
  fireEvent.press(screen.getByTestId('continue'));

  // the shared review never carries the patient's name
  expect(screen.getAllByText('Review & Share').length).toBeGreaterThan(0);
  expect(screen.queryByText('Anita Patel')).toBeNull();
});

test('submitting needs the identifier confirmation, and asks first', () => {
  const { props } = create({ initialAppointmentId: 'a2' });
  fireEvent.changeText(screen.getByTestId('title'), 'Drowsiness after a dose increase');
  fireEvent.changeText(screen.getByTestId('history'), 'Daytime drowsiness since the dose was increased.');
  fireEvent.changeText(screen.getByTestId('diagnosis'), 'Depression, on treatment');
  fireEvent.press(screen.getByTestId('continue'));
  fireEvent.changeText(screen.getByTestId('question'), 'Should the dose go back down, or change the timing?');
  fireEvent.press(screen.getByTestId('continue'));

  expect(screen.getByTestId('submit')).toBeDisabled();
  fireEvent.press(screen.getByTestId('confirm'));
  fireEvent.press(screen.getByTestId('submit'));
  expect(Alert.alert).toHaveBeenLastCalledWith('Submit to expert?', expect.any(String), expect.any(Array), expect.any(Object));
  expect(props.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ appointmentId: 'a2', title: 'Drowsiness after a dose increase' }));
});

test('an identifier typed into the case blocks sharing until it is removed', () => {
  create({ initialAppointmentId: 'a2' });
  fireEvent.changeText(screen.getByTestId('history'), 'Patient PT-10459 reports drowsiness.');
  fireEvent.changeText(screen.getByTestId('title'), 'Drowsiness');
  fireEvent.changeText(screen.getByTestId('diagnosis'), 'Depression');
  fireEvent.press(screen.getByTestId('continue'));
  fireEvent.changeText(screen.getByTestId('question'), 'Should the dose go back down?');
  fireEvent.press(screen.getByTestId('continue'));
  fireEvent.press(screen.getByTestId('confirm'));
  expect(screen.getByTestId('submit')).toBeDisabled();
});

test('unsaved work is reported to the route, and a draft can be saved', () => {
  const onDirtyChange = jest.fn();
  const { props } = create({ initialAppointmentId: 'a2', onDirtyChange });
  fireEvent.changeText(screen.getByTestId('title'), 'Draft title');
  expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  fireEvent.press(screen.getByTestId('save-draft'));
  expect(props.onSaveDraft).toHaveBeenCalledWith(expect.objectContaining({ title: 'Draft title' }));
});

/* ---------------------------------- thread ---------------------------------- */

test('a reply needs content, is added to the thread, and hands the case back to the expert', () => {
  render(<ExpertClarificationScreen clarification={clar('cl2')} onBack={jest.fn()} onRecordDecision={jest.fn()} />);
  expect(screen.getByTestId('send-reply')).toBeDisabled();
  const before = clar('cl2').messages.length;
  fireEvent.changeText(screen.getByTestId('reply-input'), 'Panic episodes happen mostly at night, about twice a week.');
  fireEvent.press(screen.getByTestId('send-reply'));
  expect(clar('cl2').messages).toHaveLength(before + 1);
  expect(clar('cl2').status).toBe('expertReview');
});

test('closing a thread asks first and keeps it for audit', () => {
  render(<ExpertClarificationScreen clarification={clar('cl3')} onBack={jest.fn()} onRecordDecision={jest.fn()} />);
  fireEvent.press(screen.getByTestId('close-thread'));
  expect(Alert.alert).toHaveBeenLastCalledWith('Close this thread?', expect.any(String), expect.any(Array), expect.any(Object));
  expect(clar('cl3').status).toBe('closed');
  expect(clar('cl3').messages.length).toBeGreaterThan(0);
});

test('a decision needs the confirmation and an outcome', () => {
  const onDecide = jest.fn();
  render(<ExpertResponseScreen clarification={clar('cl3')} onBack={jest.fn()} onDecide={onDecide} />);
  expect(screen.getByTestId('keep-open')).toBeDisabled();
  fireEvent.press(screen.getByTestId('outcome'));
  const option = screen.getAllByTestId(/^outcome-/).find((n) => !/sheet|done|search|clear/.test(n.props.testID))!;
  fireEvent.press(option);
  fireEvent.press(screen.getByTestId('outcome-done'));
  fireEvent.press(screen.getByTestId('confirm'));
  fireEvent.press(screen.getByTestId('keep-open'));
  expect(onDecide).toHaveBeenCalledWith(expect.any(String), '', false);
});
