import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AvailabilityScreen } from './AvailabilityScreen';

test('time off can be added, edited and removed', () => {
  const ui = render(<AvailabilityScreen />);
  fireEvent.press(ui.getByTestId('tab-timeoff'));
  fireEvent.press(ui.getByText('Add'));
  fireEvent.changeText(ui.getByLabelText('Entry date'), '2026-10-12');
  fireEvent.changeText(ui.getByLabelText('Entry details'), 'Annual leave');
  fireEvent.press(ui.getByText('Apply'));
  fireEvent.press(ui.getByText('Annual leave'));
  fireEvent.changeText(ui.getByLabelText('Entry details'), 'Conference');
  fireEvent.press(ui.getByText('Apply'));
  expect(ui.getByText('Conference')).toBeTruthy();
  fireEvent.press(ui.getByLabelText('Remove leave on 2026-10-12'));
  expect(ui.queryByText('Conference')).toBeNull();
});

test('schedule exceptions can be added and existing entries edited', () => {
  const ui = render(<AvailabilityScreen />);
  fireEvent.press(ui.getByText('24 May'));
  fireEvent.changeText(ui.getByLabelText('Entry details'), '10:00 AM - 01:00 PM');
  fireEvent.press(ui.getByText('Apply'));
  expect(ui.getByText('10:00 AM - 01:00 PM')).toBeTruthy();
  fireEvent.press(ui.getAllByText('Add')[0]);
  fireEvent.changeText(ui.getByLabelText('Entry date'), '2026-10-14');
  fireEvent.changeText(ui.getByLabelText('Entry details'), '02:00 PM - 04:00 PM');
  fireEvent.press(ui.getByText('Apply'));
  expect(ui.getByText('2026-10-14')).toBeTruthy();
});

test('weekly hours are editable and invalid ranges block saving', () => {
  const onSaved = jest.fn();
  const ui = render(<AvailabilityScreen onSaved={onSaved} />);
  fireEvent.changeText(ui.getByLabelText('Start time Wednesday 1'), '11:00 PM');
  fireEvent.press(ui.getByTestId('save-schedule'));
  expect(onSaved).not.toHaveBeenCalled();
  expect(ui.getByText(/Check Wednesday/)).toBeTruthy();
  fireEvent.press(ui.getByText('Add hours'));
  const starts = ui.getAllByLabelText(/Start time Wednesday/);
  fireEvent.changeText(starts[starts.length - 1], '08:00 PM');
  expect(starts[starts.length - 1].props.value).toBe('08:00 PM');
});

test('invalid dates stay in the editor without adding leave', () => {
  const ui = render(<AvailabilityScreen />);
  fireEvent.press(ui.getByTestId('tab-timeoff'));
  fireEvent.press(ui.getByText('Add'));
  fireEvent.changeText(ui.getByLabelText('Entry date'), '2026-02-30');
  fireEvent.changeText(ui.getByLabelText('Entry details'), 'Leave');
  fireEvent.press(ui.getByText('Apply'));
  expect(ui.getByText('Enter a valid date as YYYY-MM-DD.')).toBeTruthy();
  expect(ui.getByLabelText('Entry date')).toBeTruthy();
});
