import { api } from '../http';

/**
 * Consult Now — the routing status of an instant request (PT-13-01).
 *
 * *** THE RESPONSE CARRIES NO PROVIDER, BY DESIGN. *** The backend's own
 * comment on this route is worth quoting, because it settles how the screen
 * must look:
 *
 *   "The patient is never shown WHO was asked — only that the search is still
 *    running (SRS 4.2: a provider is an outcome, not a choice)... Deliberately
 *    no doctor ids: the patient does not choose, so they are not shown a list
 *    of people who said no."
 *
 * So `attempts` is a count of offers made, not a list of names. A screen built
 * on this shape cannot accidentally become a provider picker — there is nothing
 * in it to pick.
 *
 * `attempts` rising is the re-routing PT-13-01 requires happening on its own:
 * a decline or a timeout moves the request to the next professional with no
 * action from the patient, and the number going up is how the UI proves the
 * screen is working rather than stalled.
 */

export type InstantStatus = {
  /** How many professionals have been offered the request so far. */
  attempts: number;
  /** True while an offer is outstanding. False with `accepted` false = stalled. */
  stillSearching: boolean;
  /** Somebody took it. The consultation moves on from here. */
  accepted: boolean;
};

/** Safe to poll — it reads the offer trail and issues nothing. */
export const getInstantStatus = (consultationId: string): Promise<InstantStatus> =>
  api.get<InstantStatus>(`/me/consultations/${consultationId}/instant-status`);
