import { useEffect } from 'react';

import { doctorProfileApi } from '@coracure/api';
import type { DoctorSelfProfile, OwnProfilePatch } from '@coracure/api';

import { setSelfProfile } from '../state/actions';
import { useStore } from '../state/store';
import { useResource } from './useResource';

/** Shared with `useIsExpert`, so the profile is read once however many ask. */
export const PROFILE_KEY = 'doctor:own-profile';

/**
 * The signed-in doctor's real profile, copied into the store as it loads, so
 * `selectDoctor` — and every screen naming the doctor — reads the backend's
 * values. A failed read leaves the local profile in place.
 */
export const useSelfProfile = () => {
  const resource = useResource(PROFILE_KEY, doctorProfileApi.getProfile);
  useEffect(() => {
    if (resource.data) setSelfProfile(resource.data);
  }, [resource.data]);
  return resource;
};

/**
 * The name of the doctor's own specialty, resolved from the catalogue
 * (`GET /services`) by the profile's `specialtyId`. `undefined` until both
 * have loaded, or when the id is not an active service — the caller then
 * shows its own label, never a fixture's.
 */
export const useSpecialtyName = (): string | undefined => {
  const specialtyId = useStore((s) => s.selfProfile?.specialtyId);
  const services = useSpecialties(!!specialtyId);
  return services.data?.find((x) => x.id === specialtyId)?.name;
};

/**
 * The specialties a doctor may choose from: the backend's active catalogue
 * (`GET /services`), read fresh so a specialty an admin has just added or
 * retired is what the picker offers. One key with `useSpecialtyName`.
 */
export const useSpecialties = (enabled = true) =>
  useResource('catalogue:services', doctorProfileApi.listServices, { enabled, staleAfter: 0 });

/**
 * The signature on file, as a short-lived link — `null` when none was
 * uploaded. It lives on the registration (`signatureDocumentId`), not the
 * profile, and opens through the credential download route. The link
 * expires, so it is re-minted rather than held for long.
 */
export const useSignatureUrl = (enabled = true) =>
  useResource(
    'doctor:signature-url',
    async (): Promise<string | null> => {
      const { signatureDocumentId } = await doctorProfileApi.getRegistration();
      if (!signatureDocumentId) return null;
      return (await doctorProfileApi.credentialDownloadUrl(signatureDocumentId)).url;
    },
    { enabled, staleAfter: 60_000 }
  );

/**
 * The doctor's own profile (API_CONTRACT §7.2).
 *
 * *** FOUR FIELDS, NOT MORE. *** `PATCH /me/doctor/profile` whitelists
 * `bio`, `languages`, `consultationDurationMinutes`, `bufferMinutes` and
 * `forbidNonWhitelisted` makes anything else a 400. Name, qualification,
 * registration number and fee are the admin's (`PATCH /admin/doctors/:id`) —
 * there is no doctor-facing write for them, which is why
 * `ConsultationFeeScreen` is read-only rather than wired to a save button
 * that would fail on every press.
 */

export const fetchDoctorProfile = (): Promise<DoctorSelfProfile> => doctorProfileApi.getProfile();

/** Saves, then keeps the store's copy of the profile as the server answered it. */
export const updateDoctorProfile = async (patch: OwnProfilePatch): Promise<DoctorSelfProfile> => {
  const saved = await doctorProfileApi.updateProfile(patch);
  setSelfProfile(saved);
  return saved;
};

export const updateConsultationDuration = (consultationDurationMinutes: number): Promise<DoctorSelfProfile> =>
  updateDoctorProfile({ consultationDurationMinutes });

export const updateBufferMinutes = (bufferMinutes: number): Promise<DoctorSelfProfile> =>
  updateDoctorProfile({ bufferMinutes });
