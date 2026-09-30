import { describe, expect, it } from 'vitest';

import { LEVELS, SECTIONS, canSee, landingFor, sectionsFor } from './nav';
import { brandVars } from './brand-css';

/**
 * The nav map is a transcription of the backend's `assertPermission` calls. A
 * wrong row here does not fail a build — it shows an admin a link that 403s, or
 * hides a section they are paid to use. These are the checks that catch that.
 */

describe('permission gating', () => {
  it('lets super_admin see every section, the way the backend does', () => {
    // `assertPermission` passes super_admin unconditionally, which is why it is
    // never listed on a section.
    expect(sectionsFor('super_admin')).toHaveLength(SECTIONS.length);
    expect(SECTIONS.every((s) => !s.levels.includes('super_admin'))).toBe(true);
  });

  it('gives care_coordinator the alerts-first set and nothing wider', () => {
    const paths = sectionsFor('care_coordinator').map((s) => s.path);

    // SRS 2.2: this level acts on safety and follow-up alerts.
    expect(paths).toContain('safety-alerts');
    // It reaches availability only to explain why a patient was not covered.
    expect(paths).toContain('availability');
    // Money, content and the platform sections are not its job.
    expect(paths).not.toContain('payments');
    expect(paths).not.toContain('care-hub');
    expect(paths).not.toContain('deletion-requests');
  });

  it('keeps finance out of the clinical record and clinical out of payouts', () => {
    const finance = sectionsFor('finance').map((s) => s.path);
    expect(finance).toContain('payments');
    expect(finance).not.toContain('credentials');
    expect(finance).not.toContain('clarification');

    const clinical = sectionsFor('clinical_governance').map((s) => s.path);
    expect(clinical).toContain('credentials');
    expect(clinical).not.toContain('payments');
  });

  it('reserves the super_admin-only sections to super_admin', () => {
    for (const path of ['retention', 'admin-accounts']) {
      const section = SECTIONS.find((s) => s.path === path);
      expect(section, path).toBeDefined();
      expect(section?.levels).toEqual([]);
      expect(canSee('super_admin', section!)).toBe(true);
      expect(canSee('operations', section!)).toBe(false);
    }
  });

  it('gives every level somewhere to land', () => {
    for (const level of LEVELS) {
      const landing = landingFor(level);
      expect(landing, level).not.toBe('no-access');
      expect(SECTIONS.some((s) => s.path === landing)).toBe(true);
    }
  });

  it('has no duplicate paths', () => {
    const paths = SECTIONS.map((s) => s.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('brand tokens reach CSS', () => {
  it('emits the variables styles.css depends on', () => {
    // styles.css holds no hex, so a renamed brand token must fail here rather
    // than silently painting an unstyled panel.
    for (const name of [
      '--c-cta',
      '--c-cta-pressed',
      '--c-ink',
      '--c-ink-muted',
      '--c-ink-faint',
      '--c-danger',
      '--c-danger-soft',
      '--c-surface-page',
      '--c-surface-card',
      '--c-surface-line',
      '--c-surface-input-border',
      '--c-surface-selected',
      '--c-surface-mint-soft',
      '--c-gradient-brand',
      '--space-md',
      '--radius-pill',
      '--text-md',
    ]) {
      expect(brandVars[name], name).toBeTruthy();
    }
  });
});
