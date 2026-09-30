import { apiClient } from '../client';
import type { OtpRequestResponse, OtpVerifyResponse } from '../types';

const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export const isValidE164 = (phone: string): boolean => {
  return E164_REGEX.test(phone.trim());
};

/**
 * Joins a dial code and the national digits a user typed.
 *
 * The argument order is (dial code, national number) because that is the shape
 * of both sign-in screens: a fixed `+91` label beside a field that only ever
 * holds the 10 digits after it. A value that ALREADY carries a plus is passed
 * through, so re-normalising a stored number is a no-op rather than `+91+91…`.
 *
 * Formatting the user can see — spaces, hyphens, brackets — is stripped here
 * rather than in the field, so the input can stay readable while the wire value
 * stays E.164.
 */
export const toE164 = (dialCode: string, nationalNumber = ''): string => {
  const national = nationalNumber.replace(/[^\d+]/g, '');
  if (national.startsWith('+')) return national;
  const code = dialCode.replace(/[^\d+]/g, '');
  if (!national) return code.startsWith('+') ? code : `+${code}`;
  return code.startsWith('+') ? `${code}${national}` : `+${code}${national}`;
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

