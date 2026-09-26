import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';

import PatientDocumentsScreen from './PatientDocumentsScreen';
import DocumentViewerScreen from './DocumentViewerScreen';
import RequestReportScreen from './RequestReportScreen';
import { getState } from '../../state/store';
import { selectAppointment } from '../../state/selectors';
import { addReportRequest } from '../../state/actions';
import { docById } from '../../data/documents';

const docs = (patientId: string, appointmentId?: string, over: Record<string, jest.Mock> = {}) => {
  const props = {
    patientId,
    appointmentId,
    onBack: jest.fn(),
    onOpenDoc: jest.fn(),
    onViewPatient: jest.fn(),
    onRequestReport: jest.fn(),
    ...over,
  };
  return { props, ...render(<PatientDocumentsScreen {...props} />) };
};

/* ------------------------------- history ----------------------------------- */

test('each patient’s documents are their own', () => {
  const rahul = docs('PT-10482', 'a1');
  expect(screen.getByTestId('doc-row-d1')).toBeTruthy();
  expect(screen.queryByTestId('doc-row-d6')).toBeNull();
  rahul.unmount();

  docs('PT-10459', 'a2');
  expect(screen.getByTestId('doc-row-d6')).toBeTruthy();
  expect(screen.queryByTestId('doc-row-d1')).toBeNull();
});

test('files are grouped: this consultation, earlier ones, then medical history', () => {
  docs('PT-10482', 'a1');
  ['This consultation', 'Earlier consultations', 'Medical history'].forEach((g) => expect(screen.getByText(g)).toBeTruthy());
});

test('every document opens in the viewer by its id', () => {
  const { props } = docs('PT-10482', 'a1');
  fireEvent.press(screen.getByTestId('doc-row-d3'));
  expect(props.onOpenDoc).toHaveBeenCalledWith('d3');
});

test('filters, search and sort work on the real list', () => {
  docs('PT-10482', 'a1');
  fireEvent.press(screen.getByTestId('filter-prescription'));
  expect(screen.getByTestId('doc-row-d3')).toBeTruthy();
  expect(screen.queryByTestId('doc-row-d1')).toBeNull();

  fireEvent.press(screen.getByTestId('filter-all'));
  fireEvent.changeText(screen.getByTestId('search'), 'sleep');
  expect(screen.getByTestId('doc-row-d2')).toBeTruthy();
  expect(screen.queryByTestId('doc-row-d3')).toBeNull();
  expect(screen.getByTestId('doc-count')).toHaveTextContent('Showing 1 of 5 documents');

  fireEvent.changeText(screen.getByTestId('search'), '');
  fireEvent.press(screen.getByTestId('sort-docs'));
  expect(screen.getByLabelText('Oldest first. Show newest first')).toBeTruthy();
});

test('a fulfilled request says what arrived and opens it', () => {
  const { props } = docs('PT-10482', 'a1');
  fireEvent.press(screen.getByTestId('fulfilled-rq1'));
  expect(props.onOpenDoc).toHaveBeenCalledWith('d2');
  // the doctor's own name, never a hard-coded one
  expect(screen.getAllByText('Requested by Dr. Arjun Mehta').length).toBeGreaterThan(0);
});

test('an open request can be withdrawn after confirming', () => {
  const id = addReportRequest({
    patientId: 'PT-10482',
    appointmentId: 'a1',
    docType: 'lab',
    itemName: 'Thyroid profile',
    reason: 'Before adjusting the dose.',
    requestedBy: 'Dr. Arjun Mehta',
    requestedOn: '15 May 2026',
    consultationId: 'CON-10482',
    status: 'open',
    fileIds: [],
  });
  docs('PT-10482', 'a1');
  fireEvent.press(screen.getByTestId(`cancel-${id}`));
  expect(Alert.alert).toHaveBeenLastCalledWith('Withdraw this request?', expect.any(String), expect.any(Array), expect.any(Object));
  expect(getState().reportRequests.find((r) => r.id === id)!.status).toBe('cancelled');
});

/* -------------------------------- viewer ----------------------------------- */

test('the viewer describes the file and is honest that there is no preview', () => {
  const onOpenAllDocuments = jest.fn();
  render(<DocumentViewerScreen doc={docById('d6')!} consultationLabel="CON-10459 · 15 May 2026" onBack={jest.fn()} onOpenAllDocuments={onOpenAllDocuments} />);
  expect(screen.getByText('Anita Patel · PT-10459')).toBeTruthy();
  expect(screen.getByText('CON-10459 · 15 May 2026')).toBeTruthy();
  expect(screen.getByText('Document preview is not available in this demo build.')).toBeTruthy();
  fireEvent.press(screen.getByTestId('all-documents'));
  expect(onOpenAllDocuments).toHaveBeenCalled();
});

/* ---------------------------- request a report ----------------------------- */

const request = (id = 'a2') => {
  const props = { appointment: selectAppointment(getState(), id)!, onBack: jest.fn(), onDone: jest.fn(), onDirtyChange: jest.fn() };
  return { props, ...render(<RequestReportScreen {...props} />) };
};

test('a request is raised for the consultation it was opened from', () => {
  const { props } = request('a2');
  expect(screen.getByText('Anita Patel')).toBeTruthy();
  expect(screen.getAllByText('CON-10459').length).toBeGreaterThan(0);

  fireEvent.press(screen.getByTestId('send'));
  expect(props.onDone).not.toHaveBeenCalled();
  expect(screen.getByText('Name the report or document you need.')).toBeTruthy();

  fireEvent.press(screen.getByTestId('type-lab'));
  fireEvent.changeText(screen.getByTestId('item-name'), 'Thyroid profile');
  fireEvent.changeText(screen.getByTestId('reason'), 'To check thyroid function before adjusting the dose.');
  fireEvent.press(screen.getByTestId('send'));

  const r = getState().reportRequests[0];
  expect(r).toEqual(expect.objectContaining({ patientId: 'PT-10459', appointmentId: 'a2', consultationId: 'CON-10459', docType: 'lab', status: 'open' }));
  expect(props.onDone).toHaveBeenCalled();
});

test('a request can be kept as a draft, and unsaved text is reported', () => {
  const { props } = request('a2');
  fireEvent.changeText(screen.getByTestId('item-name'), 'Previous prescription');
  expect(props.onDirtyChange).toHaveBeenLastCalledWith(true);
  fireEvent.press(screen.getByTestId('draft'));
  expect(getState().reportRequests[0].status).toBe('draft');
});

test('the patient’s notice never carries a diagnosis or the reason', () => {
  request('a2');
  fireEvent.changeText(screen.getByTestId('reason'), 'Suspected bipolar disorder');
  expect(screen.getByTestId('notice-body')).not.toHaveTextContent(/bipolar/i);
});
