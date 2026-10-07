import { api } from '../http';

/**
 * Follow-up pathways and the one plan a consultation can hold at a time
 * (API_CONTRACT.md §7.7).
 *
 * A plan's length is fixed by its pathway version — there is no independent
 * duration input. `startsOn` defaults to TOMORROW when omitted, never today:
 * a check-in on the day of the consultation would ask about a day the
 * patient hasn't lived through the advice yet.
 */

export type FollowupStatus = 'none' | 'active' | 'completed' | 'cancelled';
export type CheckinStatus = 'green' | 'amber' | 'red';

export type FollowupPathway = {
  id: string;
  code: string;
  name: string;
  version: number;
  durationDays: number;
  isCurrent: boolean;
};

export type FollowupPlan = {
  consultationId: string;
  status: FollowupStatus;
  pathway: { code: string; name: string; version: number } | null;
  startsOn: string | null;
  endsOn: string | null;
  durationDays: number | null;
  todayIsDay: number | null;
};

export type CheckinRecord = { checkinDate: string; status: CheckinStatus; submittedAt: string };

/** The current version of every pathway — the picker a doctor assigns from. */
export const listPathways = (): Promise<FollowupPathway[]> =>
  api.get<FollowupPathway[]>('/doctor/followup-pathways');

export const assignFollowup = (
  consultationId: string,
  input: { pathwayCode: string; startsOn?: string },
): Promise<FollowupPlan> => api.post<FollowupPlan>(`/doctor/consultations/${consultationId}/followup`, input);

export const getFollowupPlan = (consultationId: string): Promise<FollowupPlan> =>
  api.get<FollowupPlan>(`/doctor/consultations/${consultationId}/followup-plan`);

export const cancelFollowup = (consultationId: string): Promise<FollowupPlan> =>
  api.post<FollowupPlan>(`/doctor/consultations/${consultationId}/followup/cancel`);

/** What the patient answered — the doctor reads this, never submits it. */
export const listCheckins = (consultationId: string): Promise<CheckinRecord[]> =>
  api.get<CheckinRecord[]>(`/doctor/consultations/${consultationId}/checkins`);
