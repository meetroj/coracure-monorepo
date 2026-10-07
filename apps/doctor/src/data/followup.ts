/**
 * Follow-up domain: plan date math and the Care Hub resource library.
 *
 * Psychiatry-scoped. Nothing here is a diagnosis, a risk score or a
 * prediction. Safety alerts and pathway assignment themselves are wired
 * against the real backend — see `data/safetyAlerts.ts` and
 * `data/followupPlan.ts`.
 */
import { doctorCareHubApi, type ContentItemType } from '@coracure/api';

import { dayOffset, fmtDate, toISODate } from './calendar';
import { useResource } from './useResource';

/** Review date always sits `duration` days after the start (inclusive). */
export const reviewDateFor = (startISO: string, duration: number) => {
  const [y, m, d] = startISO.split('-').map(Number);
  return fmtDate(new Date(y, m - 1, d + duration - 1));
};

export const planStartDefault = () => toISODate(dayOffset(1));

/* -------------------------------- care hub -------------------------------- */

/** The two shelves a doctor recommends from (FR-15.1, FR-15.2). */
export const RECOMMENDABLE: ContentItemType[] = ['self_help_tool', 'education_module'];

export const CARE_HUB_KEY = 'doctor:careHubItems';

/**
 * The published library, one read shared by the picker and the case detail.
 * The server returns published items only, so everything here is selectable.
 */
export const useCareHubItems = (enabled = true) =>
  useResource(
    CARE_HUB_KEY,
    () => doctorCareHubApi.listItems({ limit: 200 }).then((all) => all.filter((i) => RECOMMENDABLE.includes(i.itemType))),
    { enabled }
  );

export const NOTE_MAX = 1000;
