import { api } from '../http';
import type {
  ConsentStatus,
  LegalDocument,
  LegalDocumentSummary,
  LegalDocumentType,
} from '../types';

/**
 * Legal copy and consent (FR-2.3, FR-2.4).
 *
 * The documents are public — the store review process reaches them before
 * anyone has an account — so these two reads run unauthenticated.
 */

export const listLegalDocuments = (): Promise<LegalDocumentSummary[]> =>
  api.get<LegalDocumentSummary[]>('/legal/documents', { auth: false });

/** The full text of the current version. Rendered as-is; never paraphrased. */
export const getLegalDocument = (documentType: LegalDocumentType): Promise<LegalDocument> =>
  api.get<LegalDocument>(`/legal/documents/${documentType}`, { auth: false });

/**
 * Whether the signed-in patient has accepted the CURRENT version of each
 * document. Publishing a new version flips `teleconsultationConsent` back to
 * false, which is what re-prompts the user.
 */
export const getConsentStatus = (): Promise<ConsentStatus> =>
  api.get<ConsentStatus>('/legal/consents/me/status');

/**
 * Records acceptance.
 *
 * Only the TYPE is sent — the server resolves which version is current, so a
 * client can never accept a superseded one, and it stamps the time, the person
 * and their IP as the legal evidence. Accepting twice is a no-op, so a retried
 * request is not an error.
 */
export const acceptConsent = (documentType: LegalDocumentType): Promise<unknown> =>
  api.post('/legal/consents', { documentType });

export const listMyConsents = (): Promise<unknown[]> => api.get<unknown[]>('/legal/consents/me');

/**
 * Data rights (FR-2.5).
 *
 * *** THIS FILES A REQUEST; IT DOES NOT DELETE. *** An admin reviews it, and
 * approval only authorises the deletion run — `executed_at` is what says it
 * happened. The UI copy must not promise immediate removal.
 */
export const requestDataDeletion = (reason?: string): Promise<unknown> =>
  api.post('/me/deletion-requests', reason ? { reason } : {});

export const listMyDeletionRequests = (): Promise<unknown[]> =>
  api.get<unknown[]>('/me/deletion-requests');
