import { apiClient } from '../client';
import { ConsentStatus, LegalDocument } from '../types';

export const getConsentStatus = (): Promise<ConsentStatus> => {
  return apiClient.get('/legal/consents/me/status');
};

export const getDocument = (documentType: string): Promise<LegalDocument> => {
  return apiClient.get(`/legal/documents/${documentType}`);
};

export const acceptConsent = (documentType: string): Promise<void> => {
  return apiClient.post('/legal/consents', { documentType });
};

export const getMyConsents = (): Promise<Record<string, unknown>[]> => {
  return apiClient.get('/legal/consents/me');
};

export const listDocuments = (): Promise<LegalDocument[]> => {
  return apiClient.get('/legal/documents');
};

export const getLegalDocument = getDocument;

