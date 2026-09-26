import { apiClient } from '../client';
import type { OtpRequestResponse, OtpVerifyResponse } from '../types';

const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export const isValidE164 = (phone: string): boolean => {
  return E164_REGEX.test(phone.trim());
};

export const toE164 = (phone: string, defaultCountryCode = '+91'): string => {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  return `${defaultCountryCode}${cleaned}`;
};

export const requestOtp = (mobileNumber: string): Promise<OtpRequestResponse> => {
  return apiClient.post('/auth/patient/otp/request', { mobileNumber });
};

export const requestPatientOtp = requestOtp;

export const verifyOtp = (mobileNumber: string, challengeId: string, code: string): Promise<OtpVerifyResponse> => {
  return apiClient.post('/auth/patient/otp/verify', { mobileNumber, challengeId, code });
};

export const verifyPatientOtp = (params: { mobileNumber: string; challengeId: string; code: string }): Promise<OtpVerifyResponse> => {
  return verifyOtp(params.mobileNumber, params.challengeId, params.code);
};

export const refreshToken = (token: string): Promise<OtpVerifyResponse> => {
  return apiClient.post('/auth/refresh', { refreshToken: token });
};

export const signOut = (): Promise<void> => {
  return apiClient.post('/auth/sign-out');
};

