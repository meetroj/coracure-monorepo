import { api } from '../http';
import type { EmergencyGuidance } from './search';

/**
 * Care Hub content and, more importantly, emergency guidance (FR-15.7, SRS 6.3).
 *
 * *** THE EMERGENCY LIST IS BACKEND-DRIVEN AND MUST NOT BE HARDCODED. *** The
 * helpline numbers are clinically approved content the client confirms before
 * launch — a helpline that has changed number is worse than no helpline at all,
 * so the app renders what the server sends and never its own list.
 *
 * The endpoint returns a LIST and never throws when empty, because a screen
 * somebody in crisis is looking at must always render. When it comes back
 * empty, the caller falls back to the guidance carried on a crisis SEARCH
 * response — which is the same clinically approved copy from a different key —
 * rather than to anything invented here.
 */

export type CareHubItem = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  body?: string | null;
  itemType?: string;
};

export const listCareHubItems = (): Promise<CareHubItem[]> =>
  api.get<CareHubItem[]>('/care-hub/items');

export const getCareHubItem = (slug: string): Promise<CareHubItem> =>
  api.get<CareHubItem>(`/care-hub/items/${slug}`);

/** FR-15.7: persistent emergency guidance. Never throws on empty. */
export const getEmergencyGuidance = (): Promise<CareHubItem[]> =>
  api.get<CareHubItem[]>('/care-hub/emergency');

export type { EmergencyGuidance };
