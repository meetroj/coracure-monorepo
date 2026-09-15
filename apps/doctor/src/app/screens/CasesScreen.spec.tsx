import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import AppShell from '../AppShell';
import { cases, appointments, caseDetailFor, isClinicallyComplete } from '../../data/doctor';

const noop = () => undefined;

/**
 * DR-11-01: a past item opens its full consultation record, and every block on
 * that record links out to the module that owns it.
 */

test('every case is linked to a real consultation', () => {
  // the link is explicit, not inferred from list position or patient name
  cases.forEach((c) => {
    expect(appointments.some((a) => a.id === c.appointmentId)).toBe(true);
  });
});

test('a case opens its record, not the pre-call appointment screen', () => {
  const complete = cases.find((c) => isClinicallyComplete(c))!;
  const d = caseDetailFor(complete);
  const { getByTestId, queryByTestId, getByText } = render(
    <AppShell onLogout={noop} initialAcknowledged />
  );

  fireEvent.press(getByTestId('tab-cases'));
  fireEvent.press(getByTestId(`case-${complete.id}`));

  expect(getByText(`${d.ref} Case Detail`)).toBeTruthy();
  expect(getByText('Complete consultation record')).toBeTruthy();
  // it is the record, so there is no join action anywhere on it
  expect(queryByTestId('join-consultation')).toBeNull();
  // a closed case states when it closed
  expect(getByText(/^Closed /)).toBeTruthy();
});

test('an unfinished case is shown as open rather than closed', () => {
  const pending = cases.find((c) => !isClinicallyComplete(c))!;
  const { getByTestId, getByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByTestId('tab-cases'));
  fireEvent.press(getByTestId(`case-${pending.id}`));

  expect(getByText(/^Open · work outstanding/)).toBeTruthy();
});

test('each record block opens the module that owns it', () => {
  const complete = cases.find((c) => isClinicallyComplete(c))!;
  const { getByTestId, getByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByTestId('tab-cases'));
  fireEvent.press(getByTestId(`case-${complete.id}`));

  fireEvent.press(getByTestId('row-prescription'));
  expect(getByText('E-Prescription')).toBeTruthy();

  // back returns to the record, not out of the trail
  fireEvent.press(getByTestId('back'));
  expect(getByText('Complete consultation record')).toBeTruthy();

  fireEvent.press(getByTestId('row-summary'));
  expect(getByTestId('submit-summary')).toBeTruthy();
});

test('an appointment opened from the schedule still offers the join action', () => {
  const { getByTestId, queryByTestId } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByTestId('tab-appointments'));
  fireEvent.press(getByTestId('appt-a1'));

  // no case context, so the footer stays the pre-call join
  expect(getByTestId('join-consultation')).toBeTruthy();
  expect(queryByTestId('case-action')).toBeNull();
});
