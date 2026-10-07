import { doctorFeedbackApi } from '@coracure/api';
import type { DoctorFeedback, DoctorFeedbackEntry } from '@coracure/api';
import { ApiError } from '@coracure/api/errors';

import { fmtDate } from './calendar';
import { useResource } from './useResource';

/**
 * What this doctor's patients said about their consultations (DR-19-01), read
 * from `GET /v1/doctor/feedback`. One cache entry shared by the dashboard card
 * and the Reviews screen, so opening one never refetches what the other showed.
 */

export const KEYS = { feedback: 'doctor:feedback' };

/** Nobody has rated yet. The screens draw this as 0.0 and "0 reviews", in the usual layout. */
export const NO_FEEDBACK: DoctorFeedback = {
  averageRating: null,
  ratingCount: 0,
  distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 })),
  entries: [],
};

const loadFeedback = (): Promise<DoctorFeedback> =>
  doctorFeedbackApi.getFeedback().catch((error: unknown) => {
    // ponytail: a backend that does not have this route yet answers NOT_FOUND,
    // and that is drawn as "no reviews" rather than as an error. True for a
    // doctor nobody has rated; wrong for one who has been. Delete this once
    // every backend serves GET /v1/doctor/feedback (added in c8ea885).
    if (ApiError.is(error) && error.code === 'NOT_FOUND') return NO_FEEDBACK;
    throw error;
  });

export const useFeedback = () => useResource(KEYS.feedback, loadFeedback);

/** Share of ratings at each star as a whole percent, 5 down to 1. */
export const starShares = (feedback: DoctorFeedback) =>
  feedback.distribution.map((row) => ({
    stars: row.stars,
    percent: feedback.ratingCount ? Math.round((row.count / feedback.ratingCount) * 100) : 0,
  }));

/** "Patient A.S." - or the anonymous label when the patient has no name on file. */
export const reviewerLabel = (entry: DoctorFeedbackEntry) =>
  entry.patientInitials ? `Patient ${[...entry.patientInitials].join('.')}.` : 'Verified patient';

/** Empty when the server has no start time for the consultation, rather than a guessed date. */
export const consultedLabel = (entry: DoctorFeedbackEntry) =>
  entry.consultedAt ? fmtDate(new Date(entry.consultedAt)) : '';

export const channelLabel = (entry: DoctorFeedbackEntry) =>
  entry.channel === 'audio' ? 'Audio consultation' : 'Video consultation';

export type { DoctorFeedback, DoctorFeedbackEntry };
