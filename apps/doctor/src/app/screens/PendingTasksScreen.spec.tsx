import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import PendingTasksScreen from './PendingTasksScreen';
import { getState } from '../../state/store';
import { selectTaskCounts, selectTasks } from '../../state/selectors';
import { saveNotes, setRisk, updateNote } from '../../state/actions';
import { NOTE_FIELDS } from '../../data/clinical';

test('the totals are derived from the worklist itself', () => {
  render(<PendingTasksScreen onBack={jest.fn()} onOpenTask={jest.fn()} />);
  const counts = selectTaskCounts(getState());
  expect(screen.getByTestId('task-total')).toHaveTextContent(String(counts.total));
  (['summary', 'prescription', 'note', 'followUp'] as const).forEach((c) =>
    expect(screen.getByTestId(`task-count-${c}`)).toHaveTextContent(String(counts[c]))
  );
});

test('a category chip narrows the list to that kind of task', () => {
  render(<PendingTasksScreen onBack={jest.fn()} onOpenTask={jest.fn()} />);
  fireEvent.press(screen.getByTestId('chip-prescription'));
  const rx = selectTasks(getState()).filter((t) => t.category === 'prescription');
  rx.forEach((t) => expect(screen.getByTestId(`task-${t.id}`)).toBeTruthy());
  expect(screen.queryByTestId('task-t-a15')).toBeNull();
});

test('every task opens with its own record attached', () => {
  const onOpenTask = jest.fn();
  render(<PendingTasksScreen onBack={jest.fn()} onOpenTask={onOpenTask} />);
  fireEvent.press(screen.getByTestId('task-action-t-a2'));
  expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ id: 't-a2', appointmentId: 'a2', category: 'prescription' }));
});

test('finishing a step moves the task on to the next one', () => {
  const before = selectTaskCounts(getState());
  // Sandeep Kumar's notes are outstanding (t-a3)
  NOTE_FIELDS.forEach((f) => updateNote('a3', f.key, `${f.label} text.`));
  setRisk('a3', { category: 'low' });
  saveNotes('a3');
  render(<PendingTasksScreen onBack={jest.fn()} onOpenTask={jest.fn()} />);
  const after = selectTaskCounts(getState());
  expect(after.note).toBe(before.note - 1);
  expect(after.prescription).toBe(before.prescription + 1);
  expect(screen.getByTestId('task-count-note')).toHaveTextContent(String(after.note));
  expect(selectTasks(getState()).find((t) => t.id === 't-a3')!.category).toBe('prescription');
});
