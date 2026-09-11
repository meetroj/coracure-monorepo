import { apiClient } from '../client';

export interface CareHubItem {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  category: string;
  contentType: 'article' | 'tool' | 'video' | 'directory';
  estimatedMinutes?: number;
  featured?: boolean;
  contentBody?: string;
  authorName?: string;
  clinicallyReviewed?: boolean;
}

export const listCareHubItems = (params?: Record<string, string | number | boolean>): Promise<CareHubItem[]> => {
  return apiClient.get('/care-hub/items', params);
};

export const getCareHubItem = (slug: string): Promise<CareHubItem> => {
  return apiClient.get(`/care-hub/items/${slug}`);
};

export const getEmergencyGuidance = (): Promise<{ helpline: string; nearestHospitals: string[]; steps: string[] }> => {
  return apiClient.get('/care-hub/emergency');
};
