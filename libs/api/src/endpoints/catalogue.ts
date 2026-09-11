import { api } from '../http';
import type { Concern, Region, Service } from '../types';

/**
 * The catalogue a patient reads (FR-4.1).
 *
 * *** THIS IS WHAT REPLACED THE DOCTOR DIRECTORY. *** The patient picks a
 * SERVICE, and the price and the prescribing right are properties of that
 * service, because the patient does not choose who provides it. There is no
 * endpoint here that returns a browsable list of providers, and none should be
 * added.
 */

export const listServices = (): Promise<Service[]> => api.get<Service[]>('/services');

export const listConcerns = (specialtyId?: string): Promise<Concern[]> =>
  api.get<Concern[]>('/concerns', { query: { specialtyId } });

export const listRegions = (): Promise<Region[]> => api.get<Region[]>('/regions');
