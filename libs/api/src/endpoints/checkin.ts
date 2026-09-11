import { apiClient } from '../client';

export interface DailyCheckInInput {
  consultationId?: string;
  mood: 'very_good' | 'good' | 'okay' | 'not_great' | 'very_poor';
  symptoms: string[];
  otherSymptoms?: string;
  medicationTaken: boolean;
  notes?: string;
}

export interface DailyCheckInResult {
  id: string;
  status: 'low_risk' | 'moderate_risk' | 'high_risk';
  message: string;
  guidance: string;
  createdAt: string;
}

export const submitCheckIn = (input: DailyCheckInInput): Promise<DailyCheckInResult> => {
  const consultId = input.consultationId || 'active';
  return apiClient.post(`/me/consultations/${consultId}/checkin`, input);
};

export const getLatestCheckIn = (consultationId = 'active'): Promise<DailyCheckInResult> => {
  return apiClient.get(`/me/consultations/${consultationId}/checkin`);
};

export const getCheckInHistory = (consultationId = 'active'): Promise<DailyCheckInResult[]> => {
  return apiClient.get(`/me/consultations/${consultationId}/checkins`);
};

