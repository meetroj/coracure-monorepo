import { describe, expect, it } from 'vitest';

import { accountUpdateBody, createAccountBody, isInactive, knownLevel, MIN_PASSWORD } from './liveAccounts';

/** The panel's side of `CreateAdminDto` and `UpdateAdminAccountDto`. No network. */

describe('createAccountBody', () => {
  it('sends exactly the five fields the backend accepts, the email lower-cased and the name trimmed', () => {
    const body = createAccountBody({
      fullName: '  Nisha Rao ',
      email: ' Nisha.Rao@CoraCure.Example ',
      password: 'a-long-enough-password',
      permissionLevel: 'operations',
      is2faEnabled: true,
    });
    expect(body).toEqual({
      email: 'nisha.rao@coracure.example',
      password: 'a-long-enough-password',
      fullName: 'Nisha Rao',
      permissionLevel: 'operations',
      is2faEnabled: true,
    });
  });

  it('knows the backend password floor', () => {
    expect(MIN_PASSWORD).toBe(12);
  });
});

describe('accountUpdateBody', () => {
  const before = { fullName: 'Nisha Rao', permissionLevel: 'operations' as const };

  it('sends only what changed', () => {
    expect(accountUpdateBody(before, { fullName: 'Nisha Rao', permissionLevel: 'finance' })).toEqual({ permissionLevel: 'finance' });
    expect(accountUpdateBody(before, { fullName: 'Nisha R. Rao', permissionLevel: 'operations' })).toEqual({ fullName: 'Nisha R. Rao' });
  });

  it('sends nothing when nothing changed, and never a blank name', () => {
    expect(accountUpdateBody(before, { ...before })).toEqual({});
    expect(accountUpdateBody(before, { fullName: '   ', permissionLevel: 'operations' })).toEqual({});
  });
});

describe('status and level helpers', () => {
  it('calls a suspended account inactive, which is what the backend says the panel shows', () => {
    expect(isInactive({ status: 'suspended' })).toBe(true);
    expect(isInactive({ status: 'active' })).toBe(false);
  });

  it('recognises every level the backend has, including lab and analytics', () => {
    for (const l of ['super_admin', 'operations', 'clinical_governance', 'care_coordinator', 'finance', 'content', 'lab', 'analytics']) {
      expect(knownLevel(l), l).toBe(true);
    }
    expect(knownLevel('owner')).toBe(false);
  });
});
