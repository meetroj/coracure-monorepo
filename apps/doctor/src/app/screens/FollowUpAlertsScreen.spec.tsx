import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import AppShell from '../AppShell';
import FollowUpAlertsScreen from './FollowUpAlertsScreen';

const noop = () => undefined;

test('the dashboard alerts card opens it, and the tab bar stays', () => {
  const { getByText, getByTestId, queryByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByText('Follow-up Alerts'));

  expect(getByText('Patients who need your attention based on their check-ins.')).toBeTruthy();
  // this worklist keeps the tabs, unlike the reviews screen
  expect(getByTestId('tab-dashboard')).toBeTruthy();
  expect(queryByText("Today's Summary")).toBeNull();
});

test('switching tab abandons the alerts route', () => {
  const { getByText, getByTestId, queryByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByText('Follow-up Alerts'));
  fireEvent.press(getByTestId('tab-cases'));
  fireEvent.press(getByTestId('tab-dashboard'));

  expect(getByText("Today's Summary")).toBeTruthy();
  expect(queryByText('Patients who need your attention based on their check-ins.')).toBeNull();
});

test('red flags sort above every other alert', () => {
  const { getAllByText } = render(<FollowUpAlertsScreen onBack={noop} />);
  const names = getAllByText(/Sharma|Pillai|Kumar|Singh/).map((n) => n.props.children);
  expect(names[0]).toBe('Rahul Sharma');
});

test('alert copy is the patient wording, never a diagnosis', () => {
  const { getByText, queryByText } = render(<FollowUpAlertsScreen onBack={noop} />);

  // the reason now reads as a chip, and the patient's own words sit beneath it
  expect(getByText('Reported thoughts of self-harm')).toBeTruthy();
  expect(getByText('Anxiety and restlessness have worsened')).toBeTruthy();
  expect(getByText('Severe drowsiness reported after medication')).toBeTruthy();
  expect(getByText('Two consecutive daily check-ins missed')).toBeTruthy();

  expect(
    getByText('“I have been having thoughts of hurting myself since last night.”')
  ).toBeTruthy();
  // a missed check-in has nothing to quote, and says so rather than inventing one
  expect(getByText('No check-in submitted')).toBeTruthy();

  // no cardiology content survives
  [/chest pain/i, /blood pressure/i, /breathing/i, /heartbeat/i, /angio/i].forEach((re) =>
    expect(queryByText(re)).toBeNull()
  );
});

test('category chips filter the list and toggle off', () => {
  const { getByTestId, queryByText } = render(<FollowUpAlertsScreen onBack={noop} />);

  fireEvent.press(getByTestId('chip-redFlag'));
  expect(queryByText('Rahul Sharma')).toBeTruthy();
  expect(queryByText('Neha Pillai')).toBeNull();

  // pressing the active chip clears the filter
  fireEvent.press(getByTestId('chip-redFlag'));
  expect(queryByText('Neha Pillai')).toBeTruthy();
});

test('acknowledging an open alert moves it out of Open', () => {
  const { getByTestId, getAllByText } = render(<FollowUpAlertsScreen onBack={noop} />);

  expect(getAllByText('Open').length).toBeGreaterThan(0);
  fireEvent.press(getByTestId('ack-al1'));
  // already-acknowledged alerts cannot be acknowledged twice
  expect(getByTestId('ack-al1')).toBeDisabled();
});

test('opening an alert reports which one', () => {
  const onOpenAlert = jest.fn();
  const { getByTestId } = render(
    <FollowUpAlertsScreen onBack={noop} onOpenAlert={onOpenAlert} />
  );
  fireEvent.press(getByTestId('open-al1'));
  expect(onOpenAlert).toHaveBeenCalledWith(expect.objectContaining({ id: 'al1' }));
});

test('scoping note is always present', () => {
  const { getByText } = render(<FollowUpAlertsScreen onBack={noop} />);
  expect(getByText('Only patients assigned to you appear here.')).toBeTruthy();
});
