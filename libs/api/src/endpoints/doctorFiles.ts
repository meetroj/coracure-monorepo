import { api } from '../http';
import { ClientCode, clientError } from '../errors';
import { putToSignedUrl, type LocalFile } from '../upload';

/**
 * A patient's documents, from the treating side (API_CONTRACT §7.5).
 *
 * *** THE DOCTOR NEVER GETS A STORAGE KEY. *** Every file is reached through a
 * short-lived signed URL minted after an ownership check, so a document has no
 * permanent address that could be pasted into a message or a bug report and
 * still work tomorrow.
 *
 * Reads are refused unless a consultation ties this doctor to this patient —
 * the same gate as the patient card.
 */

export type PatientFileCategory =
  | 'medical_history'
  | 'report'
  | 'photo'
  | 'prescription_pdf'
  | 'clarification_attachment';

export type PatientFile = {
  id: string;
  category: PatientFileCategory;
  fileName: string;
  consultationId: string | null;
  reportRequestId: string | null;
  /** Set when a DOCTOR uploaded it; null means the patient did. */
  uploadedByDoctorId: string | null;
  createdAt: string;
};

export type ReportRequestCategory = 'prescription' | 'lab' | 'history' | 'other';

export type ReportRequest = {
  id: string;
  consultationId: string;
  /** The actual ask, in the doctor's words. */
  title: string;
  category: ReportRequestCategory;
  reason: string | null;
  status: 'open' | 'fulfilled' | 'cancelled';
  createdAt: string;
  /** What the patient sent back against it. */
  fulfilledBy: { id: string; fileName: string; createdAt: string }[];
};

/** What the object store will be told the file is — the same restriction the patient's own upload has. */
export const UPLOAD_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'] as const;
export type UploadContentType = (typeof UPLOAD_CONTENT_TYPES)[number];

/** A doctor's own upload for a patient — `medical_history`, `report` or `photo` only (API_CONTRACT §7.5, added 1 Oct 2026). */
export type UploadableFileCategory = Extract<PatientFileCategory, 'medical_history' | 'report' | 'photo'>;

export type UploadTicket = { storageKey: string; upload: { url: string; expiresInSeconds: number } };

/** Step 1 of 3. Refused for a patient this doctor has never consulted. */
const requestUploadUrl = (
  patientId: string,
  input: { category: UploadableFileCategory; fileName: string; contentType: UploadContentType },
): Promise<UploadTicket> =>
  api.post<UploadTicket>(`/doctor/patients/${patientId}/files/upload-url`, input);

/**
 * Step 3 of 3. Always anchored to a consultation this doctor treats — never
 * held against the patient's general record, which stays theirs to add to.
 */
const confirmFileUpload = (
  patientId: string,
  input: { category: UploadableFileCategory; fileName: string; storageKey: string; consultationId: string },
): Promise<PatientFile> => api.post<PatientFile>(`/doctor/patients/${patientId}/files`, input);

/**
 * All three steps. Mirrors `doctorProfileApi.uploadCredential` — same
 * request → PUT → confirm handshake, same "don't confirm a failed PUT" rule.
 */
export const uploadPatientFile = async (
  patientId: string,
  input: { category: UploadableFileCategory; fileName: string; contentType: UploadContentType; consultationId: string },
  body: Blob | ArrayBuffer | Uint8Array | LocalFile,
): Promise<PatientFile> => {
  // RequestFileUploadDto takes exactly these three; `consultationId` there is a 400.
  const ticket = await requestUploadUrl(patientId, {
    category: input.category,
    fileName: input.fileName,
    contentType: input.contentType,
  });
  const status = await putToSignedUrl(ticket.upload.url, input.contentType, body);

  if (status < 200 || status >= 300) {
    throw clientError(
      ClientCode.MALFORMED_RESPONSE,
      status === 403
        ? 'That upload link has expired. Please choose the file again.'
        : 'We could not upload that file. Please try again.',
      status,
    );
  }

  return confirmFileUpload(patientId, {
    category: input.category,
    fileName: input.fileName,
    storageKey: ticket.storageKey,
    consultationId: input.consultationId,
  });
};

export const listPatientFiles = (
  patientId: string,
  query: { category?: PatientFileCategory; consultationId?: string } = {},
): Promise<PatientFile[]> =>
  api.get<PatientFile[]>(`/doctor/patients/${patientId}/files`, { query });

/**
 * A link to open one document. Short-lived by design — fetch it when the
 * doctor taps, never at list time, or every row mints a URL that is expiring
 * while they scroll.
 */
export const fileDownloadUrl = (
  fileId: string,
): Promise<{ url: string; expiresInSeconds: number; sizeBytes: number | null }> =>
  api.get(`/doctor/files/${fileId}/download-url`);

/**
 * Asks a patient for something.
 *
 * `title` is the actual ask and `category` is the coarse bucket the app groups
 * by — both, because "Lab" alone does not tell a patient which test.
 */
export const raiseReportRequest = (input: {
  consultationId: string;
  title: string;
  category: ReportRequestCategory;
  reason?: string;
}): Promise<ReportRequest> =>
  api.post<ReportRequest>('/doctor/report-requests', {
    consultationId: input.consultationId,
    title: input.title,
    category: input.category,
    ...(input.reason ? { reason: input.reason } : {}),
  });

/** Withdraws a request. The patient's list refreshes; nothing is deleted. */
export const cancelReportRequest = (requestId: string): Promise<ReportRequest> =>
  api.post<ReportRequest>(`/doctor/report-requests/${requestId}/cancel`);

/** What was asked for on one consultation, and what came back. Both parties. */
export const consultationReportRequests = (consultationId: string): Promise<ReportRequest[]> =>
  api.get<ReportRequest[]>(`/consultations/${consultationId}/report-requests`);
