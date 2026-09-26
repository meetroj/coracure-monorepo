import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import FollowUpAlertsScreen from './FollowUpAlertsScreen';
import { getState } from '../../state/store';
import { selectAlertCounts } from '../../state/selectors';

test('category chips count the open alerts in each category', () => {
  render(<FollowUpAlertsScreen onBack={jest.fn()} onOpenAlert={jest.fn()} />);
  const counts = selectAlertCounts(getState()).byCategory;
  expect(screen.getByLabelText(`Red Flags, ${counts.redFlag} open`)).toBeTruthy();
  expect(screen.getByLabelText(`Amber Alerts, ${counts.amber} open`)).toBeTruthy();
});

test('choosing a category shows only its alerts; choosing it again shows all', () => {
  render(<FollowUpAlertsScreen onBack={jest.fn()} onOpenAlert={jest.fn()} />);
  fireEvent.press(screen.getByTestId('chip-redFlag'));
  expect(screen.getByTestId('alert-al1')).toBeTruthy();
  expect(screen.queryByTestId('alert-al2')).toBeNull();
  fireEvent.press(screen.getByTestId('chip-redFlag'));
  expect(screen.getByTestId('alert-al2')).toBeTruthy();
});

test('a list can open straight onto a category', () => {
  render(<FollowUpAlertsScreen onBack={jest.fn()} onOpenAlert={jest.fn()} initialCategory="amber" />);
  expect(screen.getByTestId('alert-al2')).toBeTruthy();
  expect(screen.queryByTestId('alert-al1')).toBeNull();
});

test('opening an alert passes its own id', () => {
  const onOpenAlert = jest.fn();
  render(<FollowUpAlertsScreen onBack={jest.fn()} onOpenAlert={onOpenAlert} />);
  fireEvent.press(screen.getByTestId('open-al2'));
  expect(onOpenAlert).toHaveBeenCalledWith('al2');
});

test('acknowledging an alert records it', () => {
  render(<FollowUpAlertsScreen onBack={jest.fn()} onOpenAlert={jest.fn()} />);
  fireEvent.press(screen.getByTestId('ack-al2'));
  expect(getState().alerts.al2.status).toBe('acknowledged');
});
