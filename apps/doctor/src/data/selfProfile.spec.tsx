import React from 'react';
import { doctorProfileApi } from '@coracure/api';
import type { DoctorSelfProfile } from '@coracure/api';
import { render, renderHook, screen, waitFor } from '@testing-library/react-native';

import EPrescriptionScreen from '../app/screens/EPrescriptionScreen';
import { getState } from '../state/store';
import { setSelfProfile } from '../state/actions';
import { selectAppointment, selectDoctor } from '../state/selectors';
import { renderShell } from '../test/app';
import { updateDoctorProfile, useSignatureUrl } from './profile';

const profile = (over: Partial<DoctorSelfProfile> = {}): DoctorSelfProfile => ({
  id: 'd-1',
  fullName: 'Priya Nair',
  mobileNumber: '+919800000000',
  qualification: 'MBBS, MD (Psychiatry)',
  registrationNumber: 'KMC 88231',
  yearsOfExperience: 11,
  languages: ['en', 'hi'],
  bio: 'Adult psychiatry.',
  specialtyId: 's-1',
  consultationFeeInr: 900,
  consultationDurationMinutes: 45,
  bufferMinutes: 15,
  seniorityLevel: 'standard',
  presence: 'offline',
  allowInstantConsult: true,
  bankVerified: true,
  photoUrl: 'https://store.test/photo.jpg?sig=x',
  canPrescribe: true,
  verificationStatus: 'verified',
  isListed: true,
  isBookable: true,
  ...over,
});

test('the backend’s profile names the doctor everywhere once it loads', () => {
  setSelfProfile(profile());
  const d = selectDoctor(getState());
  expect(d).toMatchObject({
    name: 'Dr. Priya Nair',
    initials: 'PN',
    registrationNo: 'KMC 88231',
    qualification: 'MBBS, MD (Psychiatry)',
    yearsExperience: 11,
    languages: ['English', 'Hindi'],
    consultationFee: 900,
    registrationVerified: true,
  });
  // every avatar renders `photoFile`
  expect(d.photoFile?.uri).toBe('https://store.test/photo.jpg?sig=x');
  // the settings screens read the same server values
  expect(getState().profile.fee).toBe(900);
  expect(getState().availability.durationMin).toBe(45);
});

/**
 * *** A GENERAL PHYSICIAN PRESCRIBES TOO. *** `canPrescribe` cannot say which
 * speciality a doctor has, so nothing is inferred from it: the name comes from
 * the catalogue, by the profile's `specialtyId`. The dashboard used to read
 * "Psychiatrist" for every prescriber while Profile showed the real one.
 */
test('the speciality is named by the catalogue, never guessed from the prescribing flag', async () => {
  jest.spyOn(doctorProfileApi, 'listServices').mockResolvedValue([
    { id: 's-1', code: 'general-physician', name: 'General Physician', description: null, consultationFeeInr: 400, providerType: 'doctor', canPrescribe: true },
  ] as never);
  setSelfProfile(profile({ canPrescribe: true }));
  expect(selectDoctor(getState()).speciality).toBe('');

  renderShell({ selfProfile: profile({ canPrescribe: true }) });
  await waitFor(() => expect(screen.getByTestId('doctor-speciality')).toHaveTextContent('General Physician'));
  expect(screen.queryByText('Psychiatrist')).toBeNull();
});

test('the backend decides who prescribes — a non-prescriber gets no medicines form', () => {
  setSelfProfile(profile({ canPrescribe: false }));
  expect(selectDoctor(getState()).professionalType).not.toBe('psychiatrist');
  render(
    <EPrescriptionScreen
      appointment={selectAppointment(getState(), 'a1')!}
      onBack={jest.fn()}
      onFinalised={jest.fn()}
      onLoadTemplate={jest.fn()}
      onPreview={jest.fn()}
      onRecommendResources={jest.fn()}
      onOpenNotes={jest.fn()}
    />
  );
  expect(screen.getByTestId('no-prescribe')).toBeTruthy();
  expect(screen.queryByTestId('add-medicine')).toBeNull();
});

test('no registration number yet reads as under review, not a sample one', () => {
  setSelfProfile(profile({ registrationNumber: null, verificationStatus: 'under_review' }));
  expect(selectDoctor(getState())).toMatchObject({ registrationNo: 'Under review', registrationVerified: false });
});

test('a save keeps the store on what the server answered', async () => {
  jest.spyOn(doctorProfileApi, 'updateProfile').mockResolvedValue(profile({ bufferMinutes: 5 }));
  await updateDoctorProfile({ bufferMinutes: 5 });
  expect(getState().availability.bufferMin).toBe(5);
});

describe('signature', () => {
  test('reads the registration, then mints a link for its signature document', async () => {
    jest.spyOn(doctorProfileApi, 'getRegistration').mockResolvedValue({ signatureDocumentId: 'sig-1' } as never);
    const mint = jest.spyOn(doctorProfileApi, 'credentialDownloadUrl').mockResolvedValue({ url: 'https://s3/sig.png', expiresInSeconds: 300 });
    const { result } = renderHook(() => useSignatureUrl());
    await waitFor(() => expect(result.current.data).toBe('https://s3/sig.png'));
    expect(mint).toHaveBeenCalledWith('sig-1');
  });

  test('no signature uploaded is null, and nothing is minted', async () => {
    jest.spyOn(doctorProfileApi, 'getRegistration').mockResolvedValue({ signatureDocumentId: null } as never);
    const mint = jest.spyOn(doctorProfileApi, 'credentialDownloadUrl');
    const { result } = renderHook(() => useSignatureUrl());
    await waitFor(() => expect(result.current.data).toBeNull());
    expect(mint).not.toHaveBeenCalled();
  });
});
