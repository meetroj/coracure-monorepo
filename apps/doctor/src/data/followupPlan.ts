import { doctorFollowupApi } from '@coracure/api';
import type { CheckinRecord, FollowupPathway, FollowupPlan } from '@coracure/api';

import { seedResource, useResource } from './useResource';

/**
 * Assigning and reading a consultation's follow-up plan (API_CONTRACT.md
 * §7.7). A plan's length comes from its pathway's `durationDays` — there is
 * no separate duration input, so a screen must not offer one.
 */

export const KEYS = {
  pathways: 'doctor:followupPathways',
  plan: (consultationId: string) => `doctor:followupPlan:${consultationId}`,
  checkins: (consultationId: string) => `doctor:checkins:${consultationId}`,
};

export const usePathways = () => useResource(KEYS.pathways, doctorFollowupApi.listPathways);

export const useFollowupPlan = (consultationId: string, enabled = true) =>
  useResource(KEYS.plan(consultationId), () => doctorFollowupApi.getFollowupPlan(consultationId), { enabled });

export const useCheckins = (consultationId: string) =>
  useResource(KEYS.checkins(consultationId), () => doctorFollowupApi.listCheckins(consultationId));

/** The server's answer becomes the cached plan, so a re-open never shows the old one. */
const keep = (consultationId: string, plan: FollowupPlan) => {
  seedResource(KEYS.plan(consultationId), plan);
  return plan;
};

export const assignFollowup = (
  consultationId: string,
  input: { pathwayCode: string; startsOn?: string },
): Promise<FollowupPlan> => doctorFollowupApi.assignFollowup(consultationId, input).then((p) => keep(consultationId, p));

export const cancelFollowup = (consultationId: string): Promise<FollowupPlan> =>
  doctorFollowupApi.cancelFollowup(consultationId).then((p) => keep(consultationId, p));

export type { FollowupPathway, FollowupPlan, CheckinRecord };
