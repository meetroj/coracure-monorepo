import { api } from '../http';
import type { PatientProfile, UpdateProfileBody, Gender, Language } from '../types';

/**
 * The patient's own profile (FR-2.2).
 *
 * Completing name and date of birth is what moves the account from `pending` to
 * `active` server-side, so `isComplete` on the response is what the app routes
 * on rather than any local flag.
 */

export const getProfile = (): Promise<PatientProfile> => api.get<PatientProfile>('/me/profile');

/**
 * Edits the profile.
 *
 * The body is assembled key by key from named arguments. Spreading a form-state
 * object here would be the fastest way to a 400: `forbidNonWhitelisted: true`
 * rejects any field the DTO does not declare, and a screen's state always
 * carries more than the DTO does (touched flags, the raw phone string, the
 * separate age display).
 */
export const updateProfile = (input: {
  fullName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  preferredLanguage?: Language;
  regionId?: string;
}): Promise<PatientProfile> => {
  const body: UpdateProfileBody = {};
  if (input.fullName !== undefined) body.fullName = input.fullName.trim();
  if (input.dateOfBirth !== undefined) body.dateOfBirth = input.dateOfBirth;
  if (input.gender !== undefined) body.gender = input.gender;
  if (input.preferredLanguage !== undefined) body.preferredLanguage = input.preferredLanguage;
  if (input.regionId !== undefined) body.regionId = input.regionId;
  return api.patch<PatientProfile>('/me/profile', body);
};

/** Initials for the avatar. Mirrors the backend's own `initialsOf`. */
export const initialsOf = (fullName: string | null | undefined): string => {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
};

/** The name to greet someone by — the given name, not the whole string. */
export const firstNameOf = (fullName: string | null | undefined): string =>
  (fullName ?? '').trim().split(/\s+/).filter(Boolean)[0] ?? '';
