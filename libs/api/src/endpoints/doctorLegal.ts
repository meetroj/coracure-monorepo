import { api } from '../http';

/**
 * Legal copy and consent (M-03) on the real client. `legal.ts` beside this
 * runs on the older mock-backed client, so the doctor app does not use it.
 */

export type LegalDocumentType =
  | 'teleconsultation_consent'
  | 'privacy_policy'
  | 'terms_of_use'
  | 'refund_policy'
  | 'reconsult_policy'
  | 'doctor_agreement';

/** The `legal_documents` row as `GET /legal/documents/:type` returns it. */
export type LegalDocumentView = {
  id: string;
  documentType: LegalDocumentType;
  version: string;
  title: string;
  body: string;
  isCurrent: boolean;
  createdAt: string;
};

/**
 * The current version of one document. Public: the sign-in screen reads the
 * privacy policy before there is a session. `DOCUMENT_NOT_PUBLISHED` (404)
 * when none has been published yet.
 */
export const getDocument = (documentType: LegalDocumentType): Promise<LegalDocumentView> =>
  api.get<LegalDocumentView>(`/legal/documents/${documentType}`, { auth: false });

/**
 * Accepts the CURRENT version of a document. Only the type is sent — the
 * version is resolved server-side so a client can never accept a superseded
 * one — and accepting twice is a no-op, so a retried submit is not an error.
 */
export const acceptConsent = (documentType: LegalDocumentType): Promise<unknown> =>
  api.post<unknown>('/legal/consents', { documentType });
