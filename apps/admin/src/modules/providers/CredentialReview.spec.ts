import { describe, expect, it } from 'vitest';

import { AUTOMATIC, SECTIONS } from './CredentialReview';

/**
 * Every document type the backend accepts is either reviewed in exactly one
 * section, or approved by the backend on upload and listed in AUTOMATIC. A type
 * in neither would sit pending where no admin can act on it.
 */
describe('review sections', () => {
  const backend = [
    'degree_certificate',
    'registration_certificate',
    'identity_proof',
    'address_proof',
    'experience_letter',
    'profile_photo',
    'signature',
  ];

  it('puts every reviewed document type in exactly one section', () => {
    for (const type of backend.filter((t) => !AUTOMATIC.includes(t))) {
      const owners = SECTIONS.filter((s) => s.types.includes(type));
      expect(owners.length, type).toBe(1);
    }
  });

  it('does not ask anyone to approve the profile photo: the backend does it on upload', () => {
    expect(AUTOMATIC).toContain('profile_photo');
    expect(SECTIONS.some((s) => s.types.includes('profile_photo'))).toBe(false);
  });
});
