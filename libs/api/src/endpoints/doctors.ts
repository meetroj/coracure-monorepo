import { api } from '../http';

/**
 * The ASSIGNED provider, and only ever the assigned provider (FR-4.3).
 *
 * *** THERE IS NO `listDoctors` HERE, AND THERE MUST NEVER BE. *** SRS 1.2
 * removed patient-led provider selection: `GET /doctors`, its filters and its
 * sort-by-fee are gone from the backend, and the one remaining route is refused
 * unless this provider is actually treating this patient. The Telemedicine
 * Practice Guidelines require a patient to know WHO they are consulting; they
 * do not permit browsing everyone else.
 *
 * A patient who is not being treated by this provider gets a 404, not a 403 —
 * a 403 would confirm the id belongs to somebody.
 *
 * So this function is only ever called with a `doctorId` that came off the
 * patient's OWN consultation, after assignment. Calling it any earlier has
 * nothing to call it with.
 */

export type AssignedProvider = {
  id: string;
  fullName: string;
  qualification: string | null;
  registrationNumber: string | null;
  yearsOfExperience: number | null;
  /** Matched on, never relaxed — the patient's preferred language is honoured. */
  languages: string[];
  bio: string | null;
  specialtyId: string | null;
  consultationFeeInr: number | null;
  consultationDurationMinutes: number;
  seniorityLevel: string;
  presence: string;
  allowInstantConsult: boolean;
  /** Taken from the SPECIALTY, never set on the provider. */
  canPrescribe: boolean;
};

export const getAssignedProvider = (doctorId: string): Promise<AssignedProvider> =>
  api.get<AssignedProvider>(`/doctors/${doctorId}`);
