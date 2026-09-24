import { apiClient } from '../client';
import type { Service } from '../types';

/**
 * Symptom search and the concern guide (FR-4.5, FR-5.x).
 *
 * *** WHAT COMES BACK IS A SERVICE, NEVER A PERSON. *** `ServiceMatch` carries
 * the fee for the service and the soonest the POOL can cover it — not a named
 * provider with their own diary. There is no shape here that could render a
 * browsable provider list, which is the point.
 *
 * *** THE DISCLAIMER AND THE CRISIS CHECK ARE THE SERVER'S. *** Both come back
 * on every response precisely so a client cannot forget to render them. The app
 * must not compose its own disclaimer text and must not run its own crisis word
 * list — a guardrail that only holds while a client renders it correctly is not
 * a guardrail the platform is keeping.
 *
 * *** THE QUERY IS A POST BODY, NOT A QUERY STRING. *** FR-5.11 keeps searches
 * off the server; a GET would put what someone typed about their mental health
 * into access logs, proxy logs and history regardless of what the service
 * stored.
 */

export type ConcernBrief = { id: string; code: string; name: string };

export type ServiceMatch = Service & {
  /** Which concerns of this service the query landed on. */
  concerns: ConcernBrief[];
  /** FR-5.4's plain-language reason — e.g. "matched to: sleep, anxiety". */
  reason: string;
  /** ISO. The soonest the POOL can cover this, or null if nothing in horizon. */
  soonestAvailableAt: string | null;
  /** Whether the approved mapping placed this, or the assistant suggested it. */
  matchedBy: 'mapping' | 'assistant';
};

export type Helpline = {
  name: string;
  number: string;
  available?: string;
};

/** FR-5.6. Clinically approved copy, edited by `clinical_governance`. */
export type EmergencyGuidance = {
  title: string;
  message: string;
  helplines: Helpline[];
  footer?: string;
};

export type SearchResponse =
  | {
      /** FR-5.8: returned every time, never left to the client to remember. */
      disclaimer: string;
      crisis: false;
      results: ServiceMatch[];
    }
  | {
      disclaimer: string;
      /** FR-5.6: guidance INSTEAD of results; `results` is always empty. */
      crisis: true;
      guidance: EmergencyGuidance;
      results: never[];
    };

export type GuideEntry = Service & {
  concerns: ConcernBrief[];
  soonestAvailableAt: string | null;
};

export const search = (query: string): Promise<SearchResponse> =>
  apiClient.post<SearchResponse>('/search', { query });

/** FR-5.5's concern guide, for a patient who cannot put it into words. */
export const searchGuide = (): Promise<{ disclaimer: string; services: GuideEntry[] }> =>
  apiClient.get<{ disclaimer: string; services: GuideEntry[] }>('/search/guide');

/**
 * What to show before anything is typed.
 */
export const searchSuggestions = (): Promise<{ disclaimer: string; popular: string[] }> =>
  apiClient.get<{ disclaimer: string; popular: string[] }>('/search/suggestions');
