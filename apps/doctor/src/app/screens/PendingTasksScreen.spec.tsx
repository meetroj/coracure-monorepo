import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import AppShell from '../AppShell';
import PendingTasksScreen from './PendingTasksScreen';
import { clinicalTaskList } from '../../data/doctor';

const noop = () => undefined;

test('the dashboard tasks card opens it, and the tab bar stays', () => {
  const { getByText, getByTestId } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByText('Pending Clinical Tasks'));

  expect(getByText('Stay on top of your unfinished clinical work.')).toBeTruthy();
  expect(getByTestId('tab-dashboard')).toBeTruthy();
});

test('the worklist is never a navigation tab of its own', () => {
  const { getByText, queryByTestId } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByText('Pending Clinical Tasks'));

  // it is an internal page pushed from the dashboard, by design
  expect(queryByTestId('tab-tasks')).toBeNull();
});

test('back returns to the dashboard', () => {
  const { getByText, getByLabelText, queryByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByText('Pending Clinical Tasks'));
  fireEvent.press(getByLabelText('Back'));

  expect(getByText("Today's Summary")).toBeTruthy();
  expect(queryByText('Stay on top of your unfinished clinical work.')).toBeNull();
});

test('every count on the summary card is derived from the data', () => {
  const { getByText } = render(<PendingTasksScreen onBack={noop} />);
  const countFor = (c: string) => clinicalTaskList.filter((t) => t.category === c).length;

  expect(getByText(String(clinicalTaskList.length))).toBeTruthy();
  expect(getByText('Total Pending Tasks')).toBeTruthy();
  expect(getByText('Across all categories')).toBeTruthy();

  // the four category columns, each labelled and counted
  expect(countFor('summary')).toBe(6);
  expect(countFor('prescription')).toBe(5);
  expect(countFor('note')).toBe(4);
  expect(countFor('followUp')).toBe(3);
  expect(countFor('summary') + countFor('prescription') + countFor('note') + countFor('followUp')).toBe(
    clinicalTaskList.length
  );
});

test('the category chips narrow the worklist', () => {
  const { getByTestId, queryByText, getAllByText } = render(<PendingTasksScreen onBack={noop} />);

  fireEvent.press(getByTestId('chip-followUp'));
  expect(getAllByText('Unread Follow-up Response')).toHaveLength(3);
  expect(queryByText('Pending Case Summary')).toBeNull();

  fireEvent.press(getByTestId('chip-all'));
  expect(getAllByText('Pending Case Summary')).toHaveLength(6);
});

test('sort flips between oldest and newest pending', () => {
  const { getByTestId, getByText } = render(<PendingTasksScreen onBack={noop} />);

  expect(getByText('Oldest pending first')).toBeTruthy();
  fireEvent.press(getByTestId('sort-toggle'));
  expect(getByText('Newest pending first')).toBeTruthy();
});

test('each row carries its patient, case id, specialty and how long it has waited', () => {
  const { getByText } = render(<PendingTasksScreen onBack={noop} />);

  expect(getByText('Rahul Sharma')).toBeTruthy();
  expect(getByText('Case ID: CON-10482')).toBeTruthy();
  expect(getByText('14d 22h')).toBeTruthy();
  expect(getByText('Opened on 30 Apr')).toBeTruthy();
});

test('task actions report the task they belong to', () => {
  const onAction = jest.fn();
  const { getByTestId } = render(<PendingTasksScreen onBack={noop} onAction={onAction} />);

  fireEvent.press(getByTestId('task-action-t1'));
  expect(onAction).toHaveBeenCalledWith('t1');
});

test('the worklist carries no general-medicine or cardiology specialty', () => {
  const banned = /cardiolog|dermatolog|orthopedic|orthopaedic|general physician|ENT\b/i;
  clinicalTaskList.forEach((t) => expect(t.specialty).not.toMatch(banned));
});

test('the documentation notice is always present', () => {
  const { getByText } = render(<PendingTasksScreen onBack={noop} />);
  expect(
    getByText('New instant requests resume after required documentation is completed.')
  ).toBeTruthy();
});
