import { describe, expect, it } from 'vitest';

import { nextLegalVersion } from './admin';

describe('nextLegalVersion', () => {
  it('starts at 1.0', () => expect(nextLegalVersion([])).toBe('1.0'));

  it('goes to the next whole number, never a point release', () => {
    expect(nextLegalVersion([{ version: '2.0' }])).toBe('3.0');
    expect(nextLegalVersion([{ version: '3.0' }, { version: '2.0' }])).toBe('4.0');
  });

  it('rounds an old point release up to the next whole version, and never repeats one', () => {
    expect(nextLegalVersion([{ version: '3.0' }, { version: '2.1' }])).toBe('4.0');
    expect(nextLegalVersion([{ version: '2.1' }])).toBe('3.0');
  });
});
