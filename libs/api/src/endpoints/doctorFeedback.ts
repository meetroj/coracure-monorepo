import { api } from '../http';

/**
 * What a provider's patients said about their consultations (DR-19-01).
 *
 * *** THE FIGURES AND THE LIST ARE NOT THE SAME SET. *** `averageRating`,
 * `ratingCount` and `distribution` cover every rating the provider has;
 * `entries` is only the newest 50. A screen must never recompute the average
 * from `entries`.
 *
 * A rating has no tags and nothing to report it with on the server - it is a
 * number from 1 to 5 and an optional comment, and that is all there is to show.
 */
export type DoctorFeedbackEntry = {
  consultationId: string;
  referenceCode: string;
  /** 1 to 5. */
  rating: number;
  comment: string | null;
  /** When the consultation was. Null on an old instant consultation with no recorded start. */
  consultedAt: string | null;
  channel: 'video' | 'audio';
  /** Initials only - the server never sends the name here. Null when the patient has no name on file. */
  patientInitials: string | null;
};

export type DoctorFeedback = {
  /** To one decimal. Null when nobody has rated yet - not zero. */
  averageRating: number | null;
  ratingCount: number;
  /** Always five rows, 5 stars down to 1. */
  distribution: { stars: number; count: number }[];
  entries: DoctorFeedbackEntry[];
};

export const getFeedback = (): Promise<DoctorFeedback> => api.get<DoctorFeedback>('/doctor/feedback');
