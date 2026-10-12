import { request } from './http';
import type { AllocationPolicy, Concern, Region, Specialty } from './types';

/**
 * The catalogue against the backend: `/admin/specialties`, `/admin/concerns`,
 * `/admin/regions`, `/admin/allocation-policy`.
 *
 * Source of truth: `SpecialtyRecord`, `CreateSpecialtyDto`,
 * `UpdateSpecialtyDto`, `ConcernRecord`, `CreateConcernDto`, `RegionRecord`,
 * `UpdateAllocationPolicyDto`.
 *
 * A code is permanent and machine-facing (lower-case words joined by
 * underscores), and other rows refer to it. The panel derives one from the name
 * when something is created and never offers to change it afterwards.
 */

export type SpecialtyCategory = 'medical' | 'super_specialty' | 'paramedical' | 'veterinary';

/** `Asha's Clinic (Pune)` becomes `asha_s_clinic_pune`; nothing usable left is an error. */
export function codeOf(name: string): string {
  const code = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  if (!code) throw new Error('Use a name with at least one letter or digit.');
  return code;
}

/* ------------------------------- specialties ------------------------------- */

type LiveSpecialty = {
  id: string;
  code: string;
  name: string;
  providerType: 'doctor' | 'non_doctor';
  canPrescribe: boolean;
  consultationFeeInr: number | string;
  category: SpecialtyCategory;
  isActive: boolean;
  parentSpecialtyId: string | null;
};

export const specialtyFrom = (s: LiveSpecialty): Specialty => ({
  id: s.id,
  name: s.name,
  isActive: s.isActive,
  providerType: s.providerType,
  mayPrescribe: s.canPrescribe,
  code: s.code,
  category: s.category,
  consultationFeeInr: Number(s.consultationFeeInr),
  parentSpecialtyId: s.parentSpecialtyId,
});

export type NewSpecialty = {
  name: string;
  providerType: string;
  /** What the patient pays: required by the backend. */
  consultationFeeInr?: number;
  category?: SpecialtyCategory;
  parentSpecialtyId?: string;
};

export function specialtyBody(input: NewSpecialty): Record<string, unknown> {
  const fee = input.consultationFeeInr;
  if (fee === undefined || !Number.isFinite(fee) || fee < 0 || fee > 99_999_999) {
    throw new Error('Enter what the patient pays for this specialty, in rupees.');
  }
  const category = input.category ?? 'medical';
  if (category === 'super_specialty' && !input.parentSpecialtyId) {
    throw new Error('A super-specialty sits under a medical specialty: choose which.');
  }
  const doctor = input.providerType === 'doctor';
  return {
    code: codeOf(input.name),
    name: input.name.trim(),
    providerType: doctor ? 'doctor' : 'non_doctor',
    // Only a doctor specialty may prescribe; the backend enforces the same with a CHECK.
    canPrescribe: doctor,
    consultationFeeInr: fee,
    category,
    ...(category === 'super_specialty' ? { parentSpecialtyId: input.parentSpecialtyId } : {}),
  };
}

/* --------------------------------- concerns -------------------------------- */

type LiveConcern = {
  id: string;
  specialtyId: string;
  code: string;
  name: string;
  matchPhrases: string[];
  matchWeight: number;
  isActive: boolean;
};

export const concernFrom = (c: LiveConcern): Concern => ({
  id: c.id,
  name: c.name,
  specialtyId: c.specialtyId,
  matchPhrases: c.matchPhrases,
  weight: c.matchWeight,
  isActive: c.isActive,
});

export function concernBody(input: { name: string; specialtyId?: string; weight?: number }): Record<string, unknown> {
  if (!input.specialtyId) throw new Error('Choose the specialty this concern points to.');
  const weight = input.weight ?? 5;
  if (!Number.isInteger(weight) || weight < 1 || weight > 100) throw new Error('The weight is a whole number from 1 to 100.');
  return { specialtyId: input.specialtyId, code: codeOf(input.name), name: input.name.trim(), matchWeight: weight };
}

/* --------------------------------- regions --------------------------------- */

type LiveRegion = { id: string; code: string; name: string; isActive: boolean };

export const regionFrom = (r: LiveRegion): Region => ({ id: r.id, name: r.name, isActive: r.isActive, code: r.code });

/* --------------------------------- policy ---------------------------------- */

type LivePolicy = { regionRelaxable: boolean; tieBreak: string; maxPatientDeclines: number };

export const policyFrom = (p: LivePolicy): AllocationPolicy => ({
  mayRelaxRegion: p.regionRelaxable,
  maxDeclines: p.maxPatientDeclines,
  tieBreak: p.tieBreak,
});

/** Only the one switch the panel shows is sent; language has no switch and never will. */
export const policyBody = (input: Record<string, unknown>): Record<string, unknown> =>
  typeof input.mayRelaxRegion === 'boolean' ? { regionRelaxable: input.mayRelaxRegion } : {};

/* -------------------------------- requests --------------------------------- */

export const liveCatalogue = {
  specialties: async () => (await request<LiveSpecialty[]>('/admin/specialties')).map(specialtyFrom),

  specialty: async (id: string) => specialtyFrom(await request<LiveSpecialty>(`/admin/specialties/${encodeURIComponent(id)}`)),

  createSpecialty: async (input: NewSpecialty) =>
    specialtyFrom(await request<LiveSpecialty>('/admin/specialties', { method: 'POST', body: specialtyBody(input) })),

  updateSpecialty: async (id: string, input: { name?: string; isActive?: boolean }) =>
    specialtyFrom(
      await request<LiveSpecialty>(`/admin/specialties/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: {
          ...(input.name?.trim() ? { name: input.name.trim() } : {}),
          ...(typeof input.isActive === 'boolean' ? { isActive: input.isActive } : {}),
        },
      }),
    ),

  concerns: async () => (await request<LiveConcern[]>('/admin/concerns')).map(concernFrom),

  createConcern: async (input: { name: string; specialtyId?: string; weight?: number }) =>
    concernFrom(await request<LiveConcern>('/admin/concerns', { method: 'POST', body: concernBody(input) })),

  updateConcern: async (id: string, input: { name?: string; weight?: number; isActive?: boolean }) =>
    concernFrom(
      await request<LiveConcern>(`/admin/concerns/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: {
          ...(input.name?.trim() ? { name: input.name.trim() } : {}),
          ...(typeof input.weight === 'number' ? { matchWeight: input.weight } : {}),
          ...(typeof input.isActive === 'boolean' ? { isActive: input.isActive } : {}),
        },
      }),
    ),

  regions: async () => (await request<LiveRegion[]>('/admin/regions')).map(regionFrom),

  createRegion: async (input: { name: string }) =>
    regionFrom(
      await request<LiveRegion>('/admin/regions', { method: 'POST', body: { code: codeOf(input.name), name: input.name.trim() } }),
    ),

  updateRegion: async (id: string, input: { name?: string; isActive?: boolean }) =>
    regionFrom(
      await request<LiveRegion>(`/admin/regions/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: {
          ...(input.name?.trim() ? { name: input.name.trim() } : {}),
          ...(typeof input.isActive === 'boolean' ? { isActive: input.isActive } : {}),
        },
      }),
    ),

  allocationPolicy: async () => policyFrom(await request<LivePolicy>('/admin/allocation-policy')),

  updateAllocationPolicy: async (input: Record<string, unknown>) =>
    policyFrom(await request<LivePolicy>('/admin/allocation-policy', { method: 'PATCH', body: policyBody(input) })),
};
