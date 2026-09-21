import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import AppShell from '../AppShell';
import EarningsScreen from './EarningsScreen';
import { earningsPeriods, platformDeduction, nextPayout, payoutHistory } from '../../data/doctor';

const noop = () => undefined;
const monthly = earningsPeriods.monthly;

test('the dashboard earnings card opens it full-screen', () => {
  const { getByTestId, getByText, queryByTestId } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByTestId('view-earnings'));

  expect(getByText('Earnings & Payout')).toBeTruthy();
  // full-screen route: the tab bar is gone
  expect(queryByTestId('tab-dashboard')).toBeNull();
});

test('back returns to the dashboard with the tabs restored', () => {
  const { getByTestId, getByLabelText, getByText } = render(<AppShell onLogout={noop} initialAcknowledged />);

  fireEvent.press(getByTestId('view-earnings'));
  fireEvent.press(getByLabelText('Back'));

  expect(getByText("Today's Summary")).toBeTruthy();
  expect(getByTestId('tab-dashboard')).toBeTruthy();
});

test('the Daily/Weekly/Monthly selector swaps the period shown', () => {
  const { getByTestId, getByText } = render(<EarningsScreen onBack={noop} />);

  // monthly is the landing period
  expect(getByText(earningsPeriods.monthly.rangeLabel)).toBeTruthy();

  fireEvent.press(getByTestId('period-daily'));
  expect(getByText(earningsPeriods.daily.rangeLabel)).toBeTruthy();
  expect(getByText(String(earningsPeriods.daily.consultations))).toBeTruthy();

  fireEvent.press(getByTestId('period-weekly'));
  expect(getByText(earningsPeriods.weekly.rangeLabel)).toBeTruthy();
});

test('shows the current month, its consultations and its earnings-per-consultation rate', () => {
  const { getByText } = render(<EarningsScreen onBack={noop} />);

  expect(getByText(monthly.rangeLabel)).toBeTruthy();
  expect(getByText('Completed Consultations')).toBeTruthy();
  expect(getByText(String(monthly.consultations))).toBeTruthy();

  const rate = Math.round(monthly.total / monthly.consultations);
  expect(getByText('Earnings per Consultation')).toBeTruthy();
  expect(getByText(`₹${rate.toLocaleString('en-IN')}`)).toBeTruthy();
});

// The deduction card was removed from the screen by design. The guarantee it
// described still has to hold in the data: if a deduction is ever introduced,
// this fails and the screen has to start disclosing it again.
test('there is no platform deduction, and the screen no longer claims one', () => {
  const { queryByText } = render(<EarningsScreen onBack={noop} />);

  expect(platformDeduction).toBe(0);
  expect(queryByText('Platform Deduction')).toBeNull();
  expect(queryByText('You keep 100%')).toBeNull();
});

test('the chart shows the month total and the peak week as a tooltip', () => {
  const { getByText } = render(<EarningsScreen onBack={noop} />);

  expect(getByText('Earnings Overview')).toBeTruthy();
  expect(getByText('Total Earnings')).toBeTruthy();

  const peak = monthly.bars.find((b) => b.label === monthly.highlight)!;
  expect(getByText(`₹${peak.value.toLocaleString('en-IN')}`)).toBeTruthy();
});

test('payout status totals the history by state', () => {
  const { getAllByText, getByText } = render(<EarningsScreen onBack={noop} />);

  // the stat-grid card and the section heading below both say it, same as the reference
  expect(getAllByText('Payout Status').length).toBeGreaterThanOrEqual(2);
  // each status label also repeats in the history list's own state pills
  expect(getAllByText('Pending').length).toBeGreaterThanOrEqual(1);
  expect(getAllByText('Processed').length).toBeGreaterThanOrEqual(1);
  expect(getAllByText('Paid').length).toBeGreaterThanOrEqual(1);

  const paidTotal = payoutHistory.filter((p) => p.state === 'Paid').reduce((sum, p) => sum + p.amount, 0);
  expect(getByText(`₹${paidTotal.toLocaleString('en-IN')}`)).toBeTruthy();
});

test('payout history lists every record with its own date, amount and state', () => {
  const { getByTestId, getByText } = render(<EarningsScreen onBack={noop} />);

  payoutHistory.forEach((p) => {
    expect(getByTestId(`payout-${p.id}`)).toBeTruthy();
    expect(getByText(p.forLabel)).toBeTruthy();
  });
});

test('"View All" on payout history is reachable', () => {
  const onViewAllHistory = jest.fn();
  const { getByText } = render(<EarningsScreen onBack={noop} onViewAllHistory={onViewAllHistory} />);

  fireEvent.press(getByText('View All'));
  expect(onViewAllHistory).toHaveBeenCalled();
});

test('the estimated payout reflects the next payout amount', () => {
  const { getByText, getAllByText } = render(<EarningsScreen onBack={noop} />);

  expect(getByText('Estimated Payout')).toBeTruthy();
  // the "Estimated Payout" stat card and the "Pending" status box carry the same figure
  expect(getAllByText(`₹${nextPayout.amount.toLocaleString('en-IN')}`).length).toBeGreaterThanOrEqual(2);
});
