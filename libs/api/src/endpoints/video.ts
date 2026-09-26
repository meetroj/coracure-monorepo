import { apiClient } from '../client';

/**
 * The video call (FR-8.5, FR-8.6).
 *
 * *** `readiness` IS THE SAFE PRE-CALL CHECK. *** It answers whether Join would
 * work WITHOUT issuing anything, so the app can run its own camera, microphone
 * and network checks first rather than burning a token that expires in minutes.
 * It is a plain read and can be polled.
 *
 * `token` is not: each call issues a new short-lived token and each issue is an
 * audit entry, so it is requested at the moment of joining and never
 * speculatively.
 *
 * *** NOTHING IS RECORDED. *** There is no recording endpoint because there are
 * no recordings. The call UI says so, and this is why it can.
 */

export interface JoinReadiness {
  consultationId: string;
  /** The LiveKit server the client would connect to. */
  serverUrl: string;
  joinable: boolean;
  /** The refusal CODE when `joinable` is false. Branch on this. */
  reason?: string;
  /** The refusal's human sentence. Display fallback only. */
  message?: string;
  /** When the call opens, ISO. Null when it is open already. */
  opensAt?: string | null;
}

export interface JoinToken {
  consultationId: string;
  roomName: string;
  serverUrl: string;
  token: string;
  identity: string;
  expiresInSeconds?: number;
}

export const getVideoReadiness = (consultationId: string): Promise<JoinReadiness> =>
  apiClient.get<JoinReadiness>(`/consultations/${consultationId}/video/readiness`);

/** Requested at the moment of joining, never in advance. */
export const getVideoToken = (consultationId: string): Promise<JoinToken> =>
  apiClient.post<JoinToken>(`/consultations/${consultationId}/video/token`);

/** Join and leave times for a finished call. No media, by design. */
export const getVideoSession = (consultationId: string): Promise<unknown> =>
  apiClient.get(`/consultations/${consultationId}/video/session`);
