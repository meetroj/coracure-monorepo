import { describe, expect, it } from 'vitest';

import { GROUPS, LEVELS, SECTIONS, SETTINGS_TABS, canSee, landingFor, sectionsFor, settingsTabsFor } from './nav';
import { brandVars } from './brand-css';

/**
 * The nav map is a transcription of the backend's `assertPermission` calls. A
 * wrong row here does not fail a build - it shows an admin a link that 403s, or
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
    expect(finance).not.toContain('case-review');

    const clinical = sectionsFor('clinical_governance').map((s) => s.path);
    expect(clinical).toContain('credentials');
    expect(clinical).not.toContain('payments');
  });

  it('reserves the super_admin-only settings tabs to super_admin', () => {
    for (const path of ['retention', 'admin-accounts']) {
      const tab = SETTINGS_TABS.find((t) => t.path === path);
      expect(tab, path).toBeDefined();
      expect(tab?.levels).toEqual([]);
      expect(canSee('super_admin', tab!)).toBe(true);
      expect(canSee('operations', tab!)).toBe(false);
    }
    expect(settingsTabsFor('finance').map((t) => t.path)).toEqual(['general', 'audit']);
  });

  it('gives every level somewhere to land', () => {
    for (const level of LEVELS) {
      const landing = landingFor(level);
      expect(landing, level).not.toBe('no-access');
      expect(SECTIONS.some((s) => s.path === landing)).toBe(true);
    }
  });

  it('lists the sidebar in priority order: dashboard, then people, then the care queues', () => {
    const labels = SECTIONS.map((s) => s.label);
    expect(labels.slice(0, 4)).toEqual(['Dashboard', 'Doctors', 'Document verification', 'Patients']);
    // Complaints sit low, just above Settings, and Settings is last.
    expect(labels.at(-1)).toBe('Settings');
    expect(labels.at(-2)).toBe('Complaints & feedback');
    // groups appear in the declared order
    const seen = [...new Set(SECTIONS.map((s) => s.group))];
    expect(seen).toEqual(GROUPS.filter((g) => seen.includes(g)));
  });

  it('merged, renamed and hid what was asked', () => {
    const paths = SECTIONS.map((s) => s.path);
    expect(paths).toContain('case-summaries');
    expect(paths).toContain('case-review');
    for (const gone of ['pending-summaries', 'clarification', 'allocation-decisions', 'search-config', 'legal', 'audit', 'deletion-requests', 'retention', 'admin-accounts']) {
      expect(paths, gone).not.toContain(gone);
    }
    expect(SECTIONS.find((s) => s.path === 'notifications')?.label).toBe('Notifications');
    expect(SETTINGS_TABS.map((t) => t.path)).toEqual(['general', 'legal', 'audit', 'deletion-requests', 'retention', 'admin-accounts']);
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
