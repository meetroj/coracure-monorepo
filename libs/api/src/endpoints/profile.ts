import { apiClient } from '../client';
import { OwnProfile, UpdateProfileInput } from '../types';

export const getProfile = (): Promise<OwnProfile> => {
  return apiClient.get('/me/profile');
};

export const updateProfile = (input: UpdateProfileInput): Promise<OwnProfile> => {
  const body: Partial<UpdateProfileInput> = {};
  if (input.fullName !== undefined) body.fullName = input.fullName;
  if (input.dateOfBirth !== undefined) body.dateOfBirth = input.dateOfBirth;
  if (input.gender !== undefined) body.gender = input.gender;
  if (input.preferredLanguage !== undefined) body.preferredLanguage = input.preferredLanguage;
  if (input.regionId !== undefined) body.regionId = input.regionId;
  
  return apiClient.patch('/me/profile', body);
};
