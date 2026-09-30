import { api } from '../http';

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
