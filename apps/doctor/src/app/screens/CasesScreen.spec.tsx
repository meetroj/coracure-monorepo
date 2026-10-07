import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import CasesScreen from './CasesScreen';
import { getState, setState } from '../../state/store';
import { selectCases } from '../../state/selectors';

const total = () => selectCases(getState()).length;

test('the count is derived from the cases, not written in', () => {
  render(<CasesScreen onOpenCase={jest.fn()} />);
  expect(screen.getByTestId('case-count')).toHaveTextContent(`${total()} cases`);
});

test('a case row opens that case by its appointment', () => {
  const onOpenCase = jest.fn();
  render(<CasesScreen onOpenCase={onOpenCase} />);
  fireEvent.press(screen.getByTestId('case-a2'));
  expect(onOpenCase).toHaveBeenCalledWith('a2');
});

test('the status picker filters, and the count follows', () => {
  // a11 has an open safety alert — real-wired via `s.openAlerts` rather than a
  // local alert fixture, so a held case can read as 'followUp'. `consultationId`
  // matches the appointment's real id ('a11'), not its human reference code.
  setState((s) => ({
    ...s,
    openAlerts: [
      {
        id: 'al1',
        alertType: 'red_flag',
        consultationId: 'a11',
        patientId: 'PT-10482',
        patientInitials: 'RS',
        patientName: 'Rahul Sharma',
        patientAge: 32,
        patientGender: 'male',
        checkinResponseId: null,
        reason: 'Reported thoughts of self-harm',
        state: 'open',
        acknowledgedAt: null,
        acknowledgedBy: null,
        closedAt: null,
        closingNote: null,
        createdAt: new Date().toISOString(),
      },
    ],
  }));
  render(<CasesScreen onOpenCase={jest.fn()} />);
  fireEvent.press(screen.getByTestId('filter-status'));
  fireEvent.press(screen.getByTestId('status-option-followUp'));
  const followUps = selectCases(getState()).filter((c) => c.state === 'followUp').length;
  expect(screen.getByTestId('case-count')).toHaveTextContent(`${followUps} ${followUps === 1 ? 'case' : 'cases'} of ${total()}`);
  expect(screen.queryByTestId('case-a2')).toBeNull();
  expect(screen.getByTestId('case-a11')).toBeTruthy();
});

test('search matches a patient name or case id', () => {
  render(<CasesScreen onOpenCase={jest.fn()} />);
  fireEvent.changeText(screen.getByTestId('case-search'), 'CON-10459');
  expect(screen.getByTestId('case-a2')).toBeTruthy();
  expect(screen.getByTestId('case-count')).toHaveTextContent(`1 case of ${total()}`);
  fireEvent.changeText(screen.getByTestId('case-search'), 'no such patient');
  expect(screen.queryByTestId('case-a2')).toBeNull();
});

test('sorting by name orders the list alphabetically', () => {
  render(<CasesScreen onOpenCase={jest.fn()} />);
  fireEvent.press(screen.getByTestId('sort-cases'));
  fireEvent.press(screen.getByTestId('sort-option-name'));
  const ids = screen.getAllByTestId(/^case-a\d+$/).map((n) => n.props.testID);
  const names = ids.map((id) => selectCases(getState()).find((c) => `case-${c.appointmentId}` === id)!.name);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
});

test('no row pretends to know whether a patient is online', () => {
  render(<CasesScreen onOpenCase={jest.fn()} />);
  expect(screen.queryByLabelText(/online/i)).toBeNull();
});
