import { doctorVideoApi } from '@coracure/api';

import { UUID } from './clinicalRecord';
import { useResource } from './useResource';

/**
 * How long the call really ran, as the server measured it — the time both
 * parties were connected at once (FR-8.6), computed from the video provider's
 * own records. The on-device stopwatch in the consultation room is only a
 * fallback for a call the server has no record of (a demo appointment, or the
 * moment before the provider's webhook lands).
 */

/** Whole seconds, or `undefined` when the server has not recorded a call. */
export const serverCallSeconds = (s: { durationSeconds: number } | undefined | null): number | undefined =>
  s && s.durationSeconds > 0 ? Math.round(s.durationSeconds) : undefined;

export const useCallSession = (consultationId: string, enabled = true) =>
  useResource(`doctor:call-session:${consultationId}`, () => doctorVideoApi.getCallSession(consultationId), {
    enabled: enabled && UUID.test(consultationId),
  });
