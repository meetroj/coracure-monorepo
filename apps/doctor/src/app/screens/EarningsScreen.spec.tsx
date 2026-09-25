import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import EarningsScreen from './EarningsScreen';
import PayoutHistoryScreen from './PayoutHistoryScreen';
import { getState } from '../../state/store';
import { selectEarnings } from '../../state/selectors';
import { payoutHistory, platformDeduction, inr } from '../../data/doctor';

const periods = () => selectEarnings(getState());

test('the Daily / Weekly / Monthly selector swaps the period shown', () => {
  render(<EarningsScreen onBack={jest.fn()} onViewAllHistory={jest.fn()} />);
  expect(screen.getByText(periods().monthly.rangeLabel)).toBeTruthy();
  fireEvent.press(screen.getByTestId('period-weekly'));
  expect(screen.getByText(periods().weekly.rangeLabel)).toBeTruthy();
  fireEvent.press(screen.getByTestId('period-daily'));
  expect(screen.getByText(periods().daily.rangeLabel)).toBeTruthy();
});

test('the estimated payout is this month’s earnings so far', () => {
  render(<EarningsScreen onBack={jest.fn()} onViewAllHistory={jest.fn()} />);
  expect(screen.getByTestId('estimated-payout')).toHaveTextContent(inr(periods().monthly.total));
});

test('payout status totals the history by state', () => {
  render(<EarningsScreen onBack={jest.fn()} onViewAllHistory={jest.fn()} />);
  const paid = payoutHistory.filter((p) => p.state === 'Paid').reduce((n, p) => n + p.amount, 0);
  expect(screen.getByTestId('status-Paid')).toHaveTextContent(new RegExp(inr(paid).replace(/[₹,]/g, '.')));
});

test('there is no platform deduction, and the screen does not invent one', () => {
  render(<EarningsScreen onBack={jest.fn()} onViewAllHistory={jest.fn()} />);
  expect(platformDeduction).toBe(0);
  expect(screen.queryByText('Platform Deduction')).toBeNull();
});

test('View all opens the full payout history', () => {
  const onViewAllHistory = jest.fn();
  render(<EarningsScreen onBack={jest.fn()} onViewAllHistory={onViewAllHistory} />);
  fireEvent.press(screen.getByTestId('view-all-payouts'));
  expect(onViewAllHistory).toHaveBeenCalled();
});

test('a payout opens its detail with the reference to quote', () => {
  render(<EarningsScreen onBack={jest.fn()} onViewAllHistory={jest.fn()} />);
  fireEvent.press(screen.getByTestId('payout-p1'));
  expect(screen.getByText(payoutHistory[0].reference)).toBeTruthy();
});

test('payout history lists every payout and filters by state', () => {
  render(<PayoutHistoryScreen onBack={jest.fn()} />);
  payoutHistory.forEach((p) => expect(screen.getByTestId(`payout-${p.id}`)).toBeTruthy());
  fireEvent.press(screen.getByTestId('payout-filter-Paid'));
  payoutHistory.forEach((p) => {
    if (p.state === 'Paid') expect(screen.getByTestId(`payout-${p.id}`)).toBeTruthy();
    else expect(screen.queryByTestId(`payout-${p.id}`)).toBeNull();
  });
});
