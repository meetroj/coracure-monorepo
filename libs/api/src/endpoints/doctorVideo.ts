import { api } from '../http';

/**
 * The consultation call (API_CONTRACT §6.12): may I join, a ticket to join
 * with, and what happened afterwards (FR-8.6). Every figure of the session is
 * computed on the server from the video provider's connection records — none
 * is stored. The media itself never passes through these calls.
 */

/**
 * The pre-call check. A refusal is a 200 with `joinable: false`, not an error:
 * `reason` is the code to branch on (`TOO_EARLY`, `NOT_PAID`, `NOT_JOINABLE`,
 * `CONSENT_REQUIRED`) and `message` is the server's sentence for it.
 */
export type CallReadiness = {
  consultationId: string;
  serverUrl: string;
  joinable: boolean;
  reason?: string;
  message?: string;
  /** When a scheduled consultation opens. Null for an instant one. */
  opensAt?: string | null;
};

/** What the app needs to connect. Short-lived — fetched at join time, never kept. */
export type JoinTicket = {
  consultationId: string;
  roomName: string;
  serverUrl: string;
  token: string;
  identity: string;
  expiresInSeconds: number;
  canPublish: boolean;
  canSubscribe: boolean;
};

export type CallParty = {
  firstJoinedAt: string | null;
  lastLeftAt: string | null;
  /** Their own connected time, overlapping connections counted once. */
  connectedSeconds: number;
  stillConnected: boolean;
  attended: boolean;
};

export type CallSession = {
  consultationId: string;
  startedAt: string | null;
  /** Null while anybody is still connected. */
  endedAt: string | null;
  /** The time BOTH parties were connected at once — the call itself. */
  durationSeconds: number;
  patient: CallParty;
  doctor: CallParty;
  noShowParty: 'patient' | 'doctor' | null;
};

export const getCallReadiness = (consultationId: string): Promise<CallReadiness> =>
  api.get<CallReadiness>(`/consultations/${consultationId}/video/readiness`);

/** No request body. Refused with the same codes readiness reports, as an error. */
export const issueJoinToken = (consultationId: string): Promise<JoinTicket> =>
  api.post<JoinTicket>(`/consultations/${consultationId}/video/token`);

export const getCallSession = (consultationId: string): Promise<CallSession> =>
  api.get<CallSession>(`/consultations/${consultationId}/video/session`);
