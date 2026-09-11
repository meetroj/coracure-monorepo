import { apiClient } from '../client';
import { ServiceListing, Concern, Region } from '../types';

export const listServices = (): Promise<ServiceListing[]> => {
  return apiClient.get('/services');
};

export const listConcerns = (specialtyId?: string): Promise<Concern[]> => {
  const params = specialtyId ? { specialtyId } : undefined;
  return apiClient.get('/concerns', params);
};

export const listRegions = (): Promise<Region[]> => {
  return apiClient.get('/regions');
};
