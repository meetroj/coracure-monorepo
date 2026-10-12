import { describe, expect, it } from 'vitest';

import { codeOf, concernBody, concernFrom, policyBody, policyFrom, specialtyBody, specialtyFrom } from './liveCatalogue';
import { codeFromLabel, createBody, movedCodes, type MasterEntry } from './liveMasterData';

/** The catalogue and master-data contracts, from the panel's side. No network. */

describe('codeOf', () => {
  it('makes the lower-case underscore code the backend stores', () => {
    expect(codeOf('Obstetrics & Gynaecology')).toBe('obstetrics_gynaecology');
    expect(codeOf('  ENT  ')).toBe('ent');
  });

  it('refuses a name with nothing usable in it, and caps the length at 60', () => {
    expect(() => codeOf('---')).toThrow(/letter or digit/);
    expect(codeOf('x'.repeat(100))).toHaveLength(60);
  });
});

describe('specialtyBody', () => {
  it('sends exactly the create DTO fields, a doctor specialty allowed to prescribe', () => {
    expect(specialtyBody({ name: ' General Medicine ', providerType: 'doctor', consultationFeeInr: 600 })).toEqual({
      code: 'general_medicine',
      name: 'General Medicine',
      providerType: 'doctor',
      canPrescribe: true,
      consultationFeeInr: 600,
      category: 'medical',
    });
  });

  it('never lets a non-doctor specialty prescribe', () => {
    const b = specialtyBody({ name: 'Physiotherapy', providerType: 'non_doctor', consultationFeeInr: 400, category: 'paramedical' });
    expect(b).toMatchObject({ providerType: 'non_doctor', canPrescribe: false, category: 'paramedical' });
  });

  it('needs a fee, and a parent for a super-specialty, before it sends anything', () => {
    expect(() => specialtyBody({ name: 'Cardiology', providerType: 'doctor' })).toThrow(/rupees/);
    expect(() => specialtyBody({ name: 'Cardiology', providerType: 'doctor', consultationFeeInr: 900, category: 'super_specialty' })).toThrow(/under a medical/);
    expect(
      specialtyBody({ name: 'Cardiology', providerType: 'doctor', consultationFeeInr: 900, category: 'super_specialty', parentSpecialtyId: 'm1' }),
    ).toMatchObject({ parentSpecialtyId: 'm1' });
  });

  it('reads a specialty with its category, fee and whether it may prescribe', () => {
    expect(
      specialtyFrom({
        id: 's1',
        code: 'general_medicine',
        name: 'General Medicine',
        providerType: 'doctor',
        canPrescribe: true,
        consultationFeeInr: '600.00',
        category: 'medical',
        isActive: true,
        parentSpecialtyId: null,
      }),
    ).toMatchObject({ id: 's1', mayPrescribe: true, consultationFeeInr: 600, category: 'medical', providerType: 'doctor' });
  });
});

describe('concerns, policy', () => {
  it('needs a specialty to point at, and keeps the weight a whole number from 1 to 100', () => {
    expect(() => concernBody({ name: 'Cannot sleep' })).toThrow(/specialty/);
    expect(concernBody({ name: 'Cannot sleep', specialtyId: 's1' })).toEqual({
      specialtyId: 's1',
      code: 'cannot_sleep',
      name: 'Cannot sleep',
      matchWeight: 5,
    });
    expect(() => concernBody({ name: 'x', specialtyId: 's1', weight: 0 })).toThrow(/1 to 100/);
  });

  it('reads a concern with its phrases and weight', () => {
    expect(concernFrom({ id: 'c1', specialtyId: 's1', code: 'a', name: 'Anxiety', matchPhrases: ['worried'], matchWeight: 7, isActive: true })).toMatchObject({
      weight: 7,
      matchPhrases: ['worried'],
    });
  });

  it('maps the one region switch both ways and sends nothing else', () => {
    expect(policyFrom({ regionRelaxable: true, tieBreak: 'least_loaded', maxPatientDeclines: 2 })).toMatchObject({ mayRelaxRegion: true, maxDeclines: 2 });
    expect(policyBody({ mayRelaxRegion: false, language: 'relaxed' })).toEqual({ regionRelaxable: false });
    expect(policyBody({})).toEqual({});
  });
});

describe('master data', () => {
  const item = (code: string): MasterEntry => ({ code, label: code, isActive: true, sortOrder: 10 });

  it('derives the permanent code from the label', () => {
    expect(codeFromLabel('Billing question')).toBe('billing_question');
    expect(createBody(' Billing question ')).toEqual({ code: 'billing_question', label: 'Billing question' });
    expect(() => createBody('   ')).toThrow(/name/);
    expect(() => createBody('!!!')).toThrow(/letter or digit/);
  });

  it('moves one entry by swapping it with its neighbour, as the whole list the backend wants', () => {
    const items = [item('a'), item('b'), item('c')];
    expect(movedCodes(items, 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(movedCodes(items, 'b', 1)).toEqual(['a', 'c', 'b']);
    expect(movedCodes(items, 'a', -1)).toBeNull();
    expect(movedCodes(items, 'c', 1)).toBeNull();
  });
});
