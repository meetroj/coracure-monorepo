import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';

import HelpSupportScreen from './HelpSupportScreen';
import SupportIssueScreen from './SupportIssueScreen';
import FaqListScreen from './FaqListScreen';
import { getState } from '../../state/store';
import { faqs } from '../../data/support';

const help = (over: Partial<React.ComponentProps<typeof HelpSupportScreen>> = {}) => {
  const props = { onBack: jest.fn(), onOpenIssue: jest.fn(), onViewAllFaqs: jest.fn(), ...over };
  return { props, ...render(<HelpSupportScreen {...props} />) };
};

test('FAQs open in place and search covers questions and answers', () => {
  help();
  fireEvent.press(screen.getByTestId('faq-f1'));
  expect(screen.getByText(faqs[0].answer)).toBeTruthy();
  fireEvent.changeText(screen.getByTestId('faq-search'), 'payouts');
  expect(screen.getByTestId('faq-f7')).toBeTruthy();
  expect(screen.queryByTestId('faq-f1')).toBeNull();
});

test('raising an issue is validated, stored, and appears in My Issues', () => {
  help();
  const before = getState().supportIssues.length;
  fireEvent.press(screen.getByTestId('raise-issue'));
  fireEvent.press(screen.getByTestId('raise-confirm'));
  expect(screen.getByText('Choose what the issue is about.')).toBeTruthy();

  fireEvent.press(screen.getByTestId('category-payment'));
  fireEvent.changeText(screen.getByTestId('issue-title'), 'August payout not received');
  fireEvent.changeText(screen.getByTestId('issue-description'), 'The August payout shows Paid but has not arrived.');
  fireEvent.press(screen.getByTestId('raise-confirm'));

  expect(getState().supportIssues).toHaveLength(before + 1);
  expect(screen.getByText('August payout not received')).toBeTruthy();
});

test('support can open straight onto the form for a topic', () => {
  help({ initialRaise: true, initialCategory: 'account' });
  expect(screen.getByTestId('category-account')).toBeSelected();
});

test('every issue opens its own detail', () => {
  const { props } = help();
  fireEvent.press(screen.getByTestId('issue-si2'));
  expect(props.onOpenIssue).toHaveBeenCalledWith('si2');
});

test('an issue shows what was reported and every update', () => {
  const issue = getState().supportIssues.find((i) => i.id === 'si2')!;
  render(<SupportIssueScreen issue={issue} onBack={jest.fn()} />);
  expect(screen.getByText(issue.description)).toBeTruthy();
  issue.updates.forEach((u) => expect(screen.getByText(u.body)).toBeTruthy());
  expect(screen.getByTestId('issue-state')).toHaveTextContent('In Review');
});

test('a contact link that the device cannot open says so instead of failing silently', async () => {
  jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('no mail app'));
  help();
  fireEvent.press(screen.getByTestId('contact-email'));
  await Promise.resolve();
  expect(Linking.openURL).toHaveBeenCalledWith('mailto:support@coracure.com');
});

test('the full FAQ list is grouped by topic', () => {
  render(<FaqListScreen onBack={jest.fn()} />);
  ['Consultations', 'Records', 'Payments', 'Account'].forEach((t) => expect(screen.getByText(t)).toBeTruthy());
  fireEvent.changeText(screen.getByTestId('faq-list-search'), 'zzz');
  expect(screen.getByText('No matching FAQs')).toBeTruthy();
});
