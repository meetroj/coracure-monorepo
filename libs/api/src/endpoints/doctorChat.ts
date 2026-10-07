import { api } from '../http';
import { ClientCode, clientError } from '../errors';
import { putToSignedUrl, type LocalFile } from '../upload';
import type { UploadContentType } from './doctorFiles';

/**
 * Patient–doctor chat, from the treating side (`/doctor/chat-threads`).
 *
 * *** A THREAD IS ADDRESSED BY THE PATIENT, NOT BY ITS OWN ID. *** There is one
 * conversation per doctor–patient pair, and every route takes `:patientId`. The
 * thread row is created by the first message, so a patient this doctor may
 * write to but never has reads as an empty list rather than a 404.
 *
 * *** ONLY A PATIENT THIS DOCTOR HAS CONSULTED. *** The same rule that decides
 * who may read the patient's files. Anyone else is `THREAD_NOT_FOUND` (404),
 * the same answer as a patient who does not exist.
 *
 * The list names a patient by initials, age and gender only — never a name.
 */

export type ChatMessageRecord = {
  id: string;
  sender: 'patient' | 'doctor';
  body: string | null;
  /** Null when there is no attachment. Opened through `attachmentUrl`, never a stored link. */
  attachmentFileName: string | null;
  createdAt: string;
};

export type ChatThreadSummary = {
  threadId: string;
  counterpart: {
    type: 'patient';
    id: string;
    initials: string | null;
    age: number | null;
    gender: 'male' | 'female' | 'other' | 'undisclosed';
  };
  lastMessage: ChatMessageRecord | null;
  unreadCount: number;
};

/** My conversations, most recent activity first. */
export const listThreads = (): Promise<ChatThreadSummary[]> =>
  api.get<ChatThreadSummary[]>('/doctor/chat-threads');

/**
 * NEWEST first, 50 by default and 100 at most. Page back by passing the
 * `createdAt` of the oldest message already held as `before`.
 */
export const listMessages = (
  patientId: string,
  query: { limit?: number; before?: string } = {},
): Promise<ChatMessageRecord[]> =>
  api.get<ChatMessageRecord[]>(`/doctor/chat-threads/${patientId}/messages`, { query });

export const sendMessage = (patientId: string, body: string): Promise<ChatMessageRecord> =>
  api.post<ChatMessageRecord>(`/doctor/chat-threads/${patientId}/messages`, { body });

/**
 * A file as a message: ask for a signed URL, PUT the bytes, then send a message
 * naming the `storageKey`. Mirrors `doctorFilesApi.uploadPatientFile` — same
 * handshake, same "don't confirm a failed PUT" rule.
 */
export const sendAttachment = async (
  patientId: string,
  file: { fileName: string; contentType: UploadContentType },
  body: Blob | ArrayBuffer | Uint8Array | LocalFile,
): Promise<ChatMessageRecord> => {
  const ticket = await api.post<{ storageKey: string; upload: { url: string; expiresInSeconds: number } }>(
    `/doctor/chat-threads/${patientId}/attachment-url`,
    { fileName: file.fileName, contentType: file.contentType },
  );
  const status = await putToSignedUrl(ticket.upload.url, file.contentType, body);

  if (status < 200 || status >= 300) {
    throw clientError(
      ClientCode.MALFORMED_RESPONSE,
      status === 403
        ? 'That upload link has expired. Please choose the file again.'
        : 'We could not send that file. Please try again.',
      status,
    );
  }

  return api.post<ChatMessageRecord>(`/doctor/chat-threads/${patientId}/messages`, {
    attachmentStorageKey: ticket.storageKey,
    attachmentFileName: file.fileName,
  });
};

/** Moves my read marker to now. 204. */
export const markRead = (patientId: string): Promise<void> =>
  api.post<void>(`/doctor/chat-threads/${patientId}/read`);

/** A short-lived link to one attachment — fetch it on the tap, never at list time. */
export const attachmentUrl = (
  patientId: string,
  messageId: string,
): Promise<{ url: string; expiresInSeconds: number }> =>
  api.get(`/doctor/chat-threads/${patientId}/messages/${messageId}/attachment-url`);
