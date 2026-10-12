import { describe, expect, it } from 'vitest';

import {
  BLANK_FIELDS,
  createDoctorBody,
  fieldProblem,
  fieldsOf,
  normaliseMobile,
  superSpecialtiesUnder,
  updateDoctorBody,
  type LiveSpecialty,
  type ProviderFields,
} from './liveProviders';

/**
 * `CreateDoctorDto` and `UpdateDoctorDto`, from the panel's side. The backend
 * runs `forbidNonWhitelisted`, so a body is built field by field and a refusal
 * the panel can predict is made before the request goes.
 */

const filled = (over: Partial<ProviderFields> = {}): ProviderFields => ({
  ...BLANK_FIELDS,
  fullName: '  Asha Menon ',
  specialtyId: 'sp-1',
  qualification: 'MBBS · MD',
  registrationNumber: 'KMC-1234',
  registrationCouncil: 'Karnataka Medical Council',
  yearsOfExperience: '12',
  languages: 'English, hi',
  bio: 'Physician.',
  payoutFeeInr: '450.50',
  consultationDurationMinutes: '20',
  bufferMinutes: '5',
  ...over,
});

describe('normaliseMobile', () => {
  it('strips separators and adds +91 to a bare ten digit number', () => {
    expect(normaliseMobile('98765 43210')).toBe('+919876543210');
    expect(normaliseMobile('+91 (987) 654-3210')).toBe('+919876543210');
    expect(normaliseMobile('+14155550100')).toBe('+14155550100');
  });
});

describe('createDoctorBody', () => {
  it('sends exactly the fields the create DTO takes, trimmed, languages as codes', () => {
    expect(createDoctorBody('9876543210', filled())).toEqual({
      mobileNumber: '+919876543210',
      fullName: 'Asha Menon',
      specialtyId: 'sp-1',
      qualification: 'MBBS · MD',
      registrationNumber: 'KMC-1234',
      registrationCouncil: 'Karnataka Medical Council',
      yearsOfExperience: 12,
      languages: ['en', 'hi'],
      bio: 'Physician.',
      payoutFeeInr: 450.5,
      consultationDurationMinutes: 20,
      bufferMinutes: 5,
    });
  });

  it('leaves out what was not filled in, and never sends a super-specialty (the DTO has none)', () => {
    const body = createDoctorBody('+919876543210', { ...BLANK_FIELDS, fullName: 'Asha', specialtyId: 'sp-1', superSpecialtyId: 'x' });
    expect(Object.keys(body).sort()).toEqual(['fullName', 'mobileNumber', 'specialtyId']);
  });

  it('refuses a number without a country code, a missing specialty, and a bad figure before sending', () => {
    expect(() => createDoctorBody('12345', filled())).toThrow(/country code/);
    expect(() => createDoctorBody('9876543210', filled({ specialtyId: '' }))).toThrow(/specialty/);
    expect(() => createDoctorBody('9876543210', filled({ consultationDurationMinutes: '3' }))).toThrow(/5 to 180/);
    expect(() => createDoctorBody('9876543210', filled({ languages: 'Klingon' }))).toThrow(/Klingon/);
  });
});

describe('updateDoctorBody', () => {
  const before = filled({ fullName: 'Asha Menon', languages: 'English, Hindi' });

  it('sends nothing when nothing changed', () => {
    expect(updateDoctorBody(before, { ...before })).toEqual({});
  });

  it('sends only what changed, with numbers as numbers', () => {
    expect(updateDoctorBody(before, { ...before, payoutFeeInr: '500', bufferMinutes: '10' })).toEqual({
      payoutFeeInr: 500,
      bufferMinutes: 10,
    });
  });

  it('compares languages as a set of codes, so a reorder or a name for a code is not a change', () => {
    expect(updateDoctorBody(before, { ...before, languages: 'hi, en' })).toEqual({});
    expect(updateDoctorBody(before, { ...before, languages: 'English, Tamil' })).toEqual({ languages: ['en', 'ta'] });
  });

  it('clears the council and the super-specialty with null, as the DTO reads it', () => {
    const had = filled({ superSpecialtyId: 'sup-1' });
    expect(updateDoctorBody(had, { ...had, registrationCouncil: '  ', superSpecialtyId: '' })).toEqual({
      registrationCouncil: null,
      superSpecialtyId: null,
    });
  });

  it('does not blank out a field the DTO cannot clear', () => {
    expect(updateDoctorBody(before, { ...before, bio: '', registrationNumber: '', yearsOfExperience: '' })).toEqual({});
  });

  it('refuses a figure the backend would refuse', () => {
    expect(() => updateDoctorBody(before, { ...before, yearsOfExperience: '71' })).toThrow(/0 to 70/);
    expect(() => updateDoctorBody(before, { ...before, payoutFeeInr: '12.345' })).toThrow(/two decimals/);
    expect(() => updateDoctorBody(before, { ...before, fullName: ' ' })).toThrow(/full name/);
  });
});

describe('fieldsOf and fieldProblem', () => {
  it('reads a provider into form text and back to no problems', () => {
    const f = fieldsOf({
      id: 'd1',
      fullName: 'Asha Menon',
      verificationStatus: 'verified',
      specialtyId: 'sp-1',
      yearsOfExperience: 12,
      languages: ['English', 'Hindi'],
      payoutFeeInr: 400,
    });
    expect(f).toMatchObject({ specialtyId: 'sp-1', yearsOfExperience: '12', languages: 'English, Hindi', payoutFeeInr: '400', bio: '' });
    expect(fieldProblem(f)).toBeNull();
  });
});

describe('superSpecialtiesUnder', () => {
  const all: LiveSpecialty[] = [
    { id: 'm1', name: 'Medicine', category: 'medical', isActive: true, parentSpecialtyId: null },
    { id: 's1', name: 'Cardiology', category: 'super_specialty', isActive: true, parentSpecialtyId: 'm1' },
    { id: 's2', name: 'Retired', category: 'super_specialty', isActive: false, parentSpecialtyId: 'm1' },
    { id: 's3', name: 'Elsewhere', category: 'super_specialty', isActive: true, parentSpecialtyId: 'm2' },
  ];

  it('offers only active super-specialties whose parent is the chosen specialty', () => {
    expect(superSpecialtiesUnder(all, 'm1').map((s) => s.id)).toEqual(['s1']);
    expect(superSpecialtiesUnder(all, '')).toEqual([]);
  });
});
