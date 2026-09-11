import { api } from '../http';

/**
 * The patient's own files (FR-8).
 *
 * `STORAGE_PROVIDER` defaults to `stub` in local development, which signs
 * upload URLs that go nowhere — enough to build and exercise the upload UI, not
 * enough to store a file. A screen that uploads must therefore treat a
 * successful signature as "the URL was issued", not as "the file is stored".
 */

export type PatientFile = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  /** Set when the file is attached to a clinical record and cannot be deleted. */
  isPartOfRecord?: boolean;
  consultationId?: string | null;
  createdAt: string;
};

export type FileRequest = {
  id: string;
  consultationId: string | null;
  description: string;
  createdAt: string;
};

export const listFiles = (): Promise<PatientFile[]> => api.get<PatientFile[]>('/me/files');

/** Outstanding requests from a clinician for something to be uploaded. */
export const listOpenFileRequests = (): Promise<FileRequest[]> =>
  api.get<FileRequest[]>('/me/files/requests/open');

export const getDownloadUrl = (fileId: string): Promise<{ url: string; expiresAt?: string }> =>
  api.get<{ url: string; expiresAt?: string }>(`/me/files/${fileId}/download-url`);

/**
 * Deleting is refused with `FILE_IS_PART_OF_A_RECORD` once a file has been
 * attached to a clinical record — the UI disables the action with the reason
 * shown rather than letting the user discover it from a failure.
 */
export const deleteFile = (fileId: string): Promise<void> =>
  api.delete<void>(`/me/files/${fileId}`);
