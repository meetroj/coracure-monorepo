import { apiClient } from '../client';

/**
 * The patient's own files (FR-8).
 */

export type PatientFile = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  /** Set when the file is attached to a clinical record and cannot be deleted. */
  isPartOfRecord?: boolean;
  consultationId?: string | null;
  doctorName?: string | null;
  createdAt: string;
};

export type FileRequest = {
  id: string;
  consultationId: string | null;
  doctorName?: string;
  description: string;
  urgency?: 'normal' | 'high';
  createdAt: string;
};

export const listFiles = (): Promise<PatientFile[]> => apiClient.get<PatientFile[]>('/me/files');

/** Outstanding requests from a clinician for something to be uploaded. */
export const listOpenFileRequests = (): Promise<FileRequest[]> =>
  apiClient.get<FileRequest[]>('/me/files/requests/open');

export const getDownloadUrl = (fileId: string): Promise<{ url: string; expiresAt?: string }> =>
  apiClient.get<{ url: string; expiresAt?: string }>(`/me/files/${fileId}/download-url`);

/**
 * Deleting is refused with `FILE_IS_PART_OF_A_RECORD` once a file has been
 * attached to a clinical record — the UI disables the action with the reason
 * shown rather than letting the user discover it from a failure.
 */
export const deleteFile = (fileId: string): Promise<void> =>
  apiClient.delete<void>(`/me/files/${fileId}`);

export const uploadFile = (file: {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  consultationId?: string | null;
}): Promise<PatientFile> => apiClient.post<PatientFile>('/me/files', file);
