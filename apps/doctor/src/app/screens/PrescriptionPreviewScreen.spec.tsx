import React from 'react';
import { Linking } from 'react-native';
import { doctorClinicalRecordApi, doctorFilesApi } from '@coracure/api';
import { ApiError } from '@coracure/api/errors';
import type { DoctorPatientFile } from '@coracure/api';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';

import PrescriptionPreviewScreen from './PrescriptionPreviewScreen';
import { appointments } from '../../data/doctor';
import { getState, setState } from '../../state/store';
import { selectRecord } from '../../state/selectors';

const ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const PATIENT = '9b2f1c3a-0000-4000-8000-000000000000';
const real = { ...appointments[0], id: ID, patientId: PATIENT };

const finalise = () =>
  setState((s) => ({ ...s, records: { ...s.records, [ID]: { ...selectRecord(getState(), ID), rxStatus: 'finalised' } } }));

const PDF = { id: 'f1', fileName: 'prescription-CC-1.pdf', category: 'prescription_pdf' } as DoctorPatientFile;

beforeEach(() => {
  // nothing on the server yet: the local record stands
  jest
    .spyOn(doctorClinicalRecordApi, 'getClinicalRecord')
    .mockRejectedValue(new ApiError({ statusCode: 404, code: 'RECORD_NOT_FOUND', message: 'No record yet.' }));
});

test('a locally finalised prescription never claims it was shared — that happens at the case-summary submit', async () => {
  finalise();
  jest.spyOn(doctorFilesApi, 'listPatientFiles').mockResolvedValue([]);
  render(<PrescriptionPreviewScreen appointment={real} onBack={jest.fn()} />);
  await waitFor(() => screen.getByText('The PDF is issued when the case summary is submitted.'));
  expect(screen.getByTestId('preview-finalised')).toHaveTextContent(/issued to the patient when you submit the case summary/);
  expect(screen.queryByText(/shared with the patient/)).toBeNull();
});

test('a finalised real record opens the issued PDF by a link minted on tap', async () => {
  finalise();
  const list = jest.spyOn(doctorFilesApi, 'listPatientFiles').mockResolvedValue([PDF]);
  const mint = jest.spyOn(doctorFilesApi, 'fileDownloadUrl').mockResolvedValue({ url: 'https://s3/x.pdf', expiresInSeconds: 60, sizeBytes: null });
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

  render(<PrescriptionPreviewScreen appointment={real} onBack={jest.fn()} />);
  await waitFor(() => screen.getByTestId('open-issued-pdf'));
  expect(list).toHaveBeenCalledWith(PATIENT, { category: 'prescription_pdf', consultationId: ID });
  expect(mint).not.toHaveBeenCalled();

  fireEvent.press(screen.getByTestId('open-issued-pdf'));
  await waitFor(() => expect(open).toHaveBeenCalledWith('https://s3/x.pdf'));
  expect(mint).toHaveBeenCalledWith('f1');
});

test('finalised but no PDF yet says when it will exist', async () => {
  finalise();
  jest.spyOn(doctorFilesApi, 'listPatientFiles').mockResolvedValue([]);
  render(<PrescriptionPreviewScreen appointment={real} onBack={jest.fn()} />);
  await waitFor(() => screen.getByText('The PDF is issued when the case summary is submitted.'));
});

test('a draft asks the server for nothing', () => {
  const list = jest.spyOn(doctorFilesApi, 'listPatientFiles');
  render(<PrescriptionPreviewScreen appointment={real} onBack={jest.fn()} />);
  expect(screen.getByTestId('preview-draft')).toBeTruthy();
  expect(screen.queryByTestId('open-issued-pdf')).toBeNull();
  expect(list).not.toHaveBeenCalled();
});
