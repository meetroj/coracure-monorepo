import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import RequestReportScreen from './RequestReportScreen';
import PatientDocumentsScreen from './PatientDocumentsScreen';

const noop = () => undefined;

/* ------------------------------ request a report --------------------------- */

const req = (over = {}) =>
  render(<RequestReportScreen onBack={noop} onSend={noop} {...over} />);

test('request screen focuses on the item and the reason', () => {
  const { getByText, getByTestId } = req();
  expect(getByText('Request a Report')).toBeTruthy();
  expect(getByText('What do you need?')).toBeTruthy();
  expect(getByText('Why is it needed?')).toBeTruthy();
  expect(getByTestId('item-name').props.value).toBe('Previous psychiatric prescription');
  expect(getByTestId('reason').props.value).toContain('previous medication history');
});

test('sending creates an Open request carrying full provenance', () => {
  const onSend = jest.fn();
  const { getByTestId } = req({ onSend });

  fireEvent.press(getByTestId('type-lab'));
  fireEvent.changeText(getByTestId('item-name'), 'Thyroid profile');
  fireEvent.press(getByTestId('send'));

  expect(onSend).toHaveBeenCalledWith(
    expect.objectContaining({
      status: 'open',
      docType: 'lab',
      itemName: 'Thyroid profile',
      requestedBy: 'Dr. Arjun Mehta',
      requestedOn: '15 May 2024',
      consultationId: 'CON-10482',
    })
  );
});

test('saving a draft does not create an open request', () => {
  const onSaveDraft = jest.fn();
  const { getByTestId } = req({ onSaveDraft });
  fireEvent.press(getByTestId('draft'));
  expect(onSaveDraft).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
});

test('send is blocked until both the item and the reason are given', () => {
  const { getByTestId } = req();
  fireEvent.changeText(getByTestId('reason'), '');
  expect(getByTestId('send')).toBeDisabled();
  fireEvent.changeText(getByTestId('reason'), 'Needed before the review.');
  expect(getByTestId('send')).toBeEnabled();
});

test('the patient notification preview carries no diagnosis', () => {
  const { getByTestId, getByText } = req();
  const body = getByTestId('notice-body').props.children as string;
  [/diagnos/i, /anxiet/i, /depress/i, /psychiat/i].forEach((re) => expect(body).not.toMatch(re));
  expect(getByText('No diagnosis will appear in the notification.')).toBeTruthy();
});

test('the doctor has no upload control on the request screen', () => {
  const { queryByText } = req();
  [/upload file/i, /choose file/i, /attach/i].forEach((re) => expect(queryByText(re)).toBeNull());
});

/* ---------------------------- patient documents --------------------------- */

const docs = (over = {}) => render(<PatientDocumentsScreen onBack={noop} {...over} />);

test('documents are grouped by consultation with source context', () => {
  const { getByText } = docs();
  expect(getByText('Current consultation')).toBeTruthy();
  expect(getByText('Previous consultation')).toBeTruthy();
  expect(getByText('Medical history')).toBeTruthy();
  expect(getByText('Booking attachment')).toBeTruthy();
  expect(getByText('Requested by Dr. Arjun Mehta')).toBeTruthy();
  expect(getByText('Consultation record')).toBeTruthy();
});

test('a requested file shows as Fulfilled', () => {
  const { getByText } = docs();
  expect(getByText('Fulfilled')).toBeTruthy();
});

test('history screen offers no upload control and no request form', () => {
  const { queryByText, getAllByText } = docs();
  // "Uploaded by patient" is legitimate source context; what must not exist is
  // an upload *action* for the doctor, or the request form itself
  [/upload file/i, /upload document/i, /add file/i, /request a report/i, /why is it needed/i, /download/i].forEach(
    (re) => expect(queryByText(re)).toBeNull()
  );
  // four of the five files are patient uploads, so the label repeats
  expect(getAllByText('Uploaded by patient').length).toBeGreaterThan(0);
});

test('filters narrow the list', () => {
  const { getByTestId, queryByText } = docs();

  fireEvent.press(getByTestId('filter-prescription'));
  expect(queryByText('Previous Prescription')).toBeTruthy();
  expect(queryByText('Symptoms Journal')).toBeNull();

  fireEvent.press(getByTestId('filter-requested'));
  expect(queryByText('Sleep Tracking Report')).toBeTruthy();
  expect(queryByText('Previous Prescription')).toBeNull();
});

test('search narrows by filename', () => {
  const { getByTestId, queryByText } = docs();
  fireEvent.changeText(getByTestId('search'), 'sleep');
  expect(queryByText('Sleep Tracking Report')).toBeTruthy();
  expect(queryByText('Symptoms Journal')).toBeNull();
});

test('the security and scoping statements are always present', () => {
  const { getByText } = docs();
  expect(getByText('Documents are encrypted, access-controlled and audit logged.')).toBeTruthy();
  expect(
    getByText('Only files available through your assigned care relationship are shown.')
  ).toBeTruthy();
});

test('a fulfilment notice routes to the document it names', () => {
  const onOpenNotification = jest.fn();
  const { getByTestId } = docs({ onOpenNotification });

  const body = getByTestId('notif-body-nt-d2').props.children as string;
  expect(body).toContain('Sleep Tracking Report');
  [/diagnos/i, /anxiet/i, /depress/i].forEach((re) => expect(body).not.toMatch(re));

  fireEvent.press(getByTestId('notif-nt-d2'));
  expect(onOpenNotification).toHaveBeenCalledWith('d2');
});
