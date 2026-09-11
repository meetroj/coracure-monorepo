import { apiClient } from '../client';
import type { ConsultationRecord } from '../types';

export interface BookScheduledInput {
  serviceId?: string;
  specialtyId?: string;
  startsAt: string;
  concernId?: string | null;
  intakeAnswers?: Record<string, unknown>;
}

export interface RequestInstantInput {
  serviceId?: string;
  specialtyId?: string;
  concernId?: string | null;
  intakeAnswers?: Record<string, unknown>;
}

export const listConsultations = (params?: Record<string, string | number | boolean>): Promise<ConsultationRecord[]> => {
  return apiClient.get('/me/consultations', params);
};

export const getConsultation = (id: string): Promise<ConsultationRecord> => {
  return apiClient.get(`/me/consultations/${id}`);
};

export const bookScheduled = (input: BookScheduledInput): Promise<ConsultationRecord> => {
  const body: Record<string, unknown> = { startsAt: input.startsAt };
  if (input.serviceId) body.serviceId = input.serviceId;
  if (input.specialtyId) body.specialtyId = input.specialtyId;
  if (input.concernId) body.concernId = input.concernId;
  if (input.intakeAnswers) body.intakeAnswers = input.intakeAnswers;
  return apiClient.post('/me/consultations', body);
};

export const requestInstant = (input: RequestInstantInput): Promise<ConsultationRecord> => {
  const body: Record<string, unknown> = {};
  if (input.serviceId) body.serviceId = input.serviceId;
  if (input.specialtyId) body.specialtyId = input.specialtyId;
  if (input.concernId) body.concernId = input.concernId;
  if (input.intakeAnswers) body.intakeAnswers = input.intakeAnswers;
  return apiClient.post('/me/consultations/instant', body);
};

export const cancelConsultation = (id: string, reason?: string): Promise<ConsultationRecord> => {
  return apiClient.post(`/me/consultations/${id}/cancel`, reason ? { reason } : {});
};

export const declineProvider = (id: string, reason?: string): Promise<ConsultationRecord> => {
  return apiClient.post(`/me/consultations/${id}/decline-provider`, reason ? { reason } : {});
};

export const rescheduleConsultation = (id: string, startsAt: string): Promise<ConsultationRecord> => {
  return apiClient.post(`/me/consultations/${id}/reschedule`, { startsAt });
};

export const getConsultationBill = (id: string): Promise<import('../types').BillRecord> => {
  return apiClient.get(`/me/consultations/${id}/bill`);
};

export const submitFeedback = (id: string, feedback: import('../types').ConsultationFeedback): Promise<void> => {
  return apiClient.put(`/me/consultations/${id}/feedback`, feedback);
};

export const getFeedback = (id: string): Promise<import('../types').ConsultationFeedback> => {
  return apiClient.get(`/me/consultations/${id}/feedback`);
};

export const getVideoReadiness = (id: string): Promise<{ ready: boolean; estimatedWaitSeconds?: number }> => {
  return apiClient.get(`/consultations/${id}/video/readiness`);
};

export const getVideoToken = (id: string): Promise<import('../types').VideoSessionInfo> => {
  return apiClient.post(`/consultations/${id}/video/token`);
};

export const getCarePlan = (id: string): Promise<import('../types').CarePlanRecord> => {
  return apiClient.get(`/me/consultations/${id}/care-plan`);
};

export const getCareRecord = (id: string): Promise<import('../types').CareRecord> => {
  return apiClient.get(`/me/consultations/${id}/care-record`);
};

export const bookConsultation = bookScheduled;
export const requestInstantConsultation = requestInstant;

