import { describe, expect, it } from 'vitest';

import { GROUPS, LAB_SERVICES_ENABLED, LEVELS, SECTIONS, SETTINGS_TABS, SUB_GROUPS, canSee, landingFor, sectionsFor, settingsTabsFor } from './nav';
import { brandVars } from './brand-css';

/**
 * The nav map is a transcription of the backend's `assertPermission` calls and
 * of the sidebar in docs/ADMIN_PANEL_REQUIREMENTS.md section 98. A wrong row
 * here does not fail a build - it shows an admin a link that 403s, or hides a
 * section they are paid to use. These are the checks that catch that.
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

    expect(paths).toContain('safety-alerts');
    expect(paths).toContain('availability');
    // Money, content, lab and the platform sections are not its job.
    for (const not of ['provider-payouts', 'app-settings', 'lab-orders', 'users', 'roles']) {
      expect(paths).not.toContain(not);
    }
  });

  it('keeps finance out of the clinical record and clinical out of payouts', () => {
    const finance = sectionsFor('finance').map((s) => s.path);
    expect(finance).toContain('provider-payouts');
    expect(finance).toContain('refunds');
    expect(finance).not.toContain('verification');
    expect(finance).not.toContain('case-records');

    const clinical = sectionsFor('clinical_governance').map((s) => s.path);
    expect(clinical).toContain('verification');
    expect(clinical).not.toContain('provider-payouts');
  });

  it('hides Lab Services while it is switched off, and shows it when it is on', () => {
    const paths = SECTIONS.map((s) => s.path);
    for (const p of ['lab-orders', 'lab-partners', 'lab-tests', 'lab-packages', 'lab-allocation', 'lab-reports', 'analytics-lab']) {
      expect(paths.includes(p), p).toBe(LAB_SERVICES_ENABLED);
    }
  });

  it('reserves Users and Roles & Permissions to super_admin', () => {
    for (const path of ['users', 'roles']) {
      const section = SECTIONS.find((s) => s.path === path);
      expect(section?.levels).toEqual([]);
      expect(canSee('super_admin', section!)).toBe(true);
      expect(canSee('operations', section!)).toBe(false);
    }
  });

  it('reserves the super_admin-only settings tab to super_admin', () => {
    const tab = SETTINGS_TABS.find((t) => t.path === 'retention');
    expect(tab?.levels).toEqual([]);
    expect(canSee('super_admin', tab!)).toBe(true);
    expect(settingsTabsFor('finance').map((t) => t.path)).toEqual(['general', 'audit']);
  });

  it('gives every level somewhere to land', () => {
    for (const level of LEVELS) {
      const landing = landingFor(level);
      expect(landing, level).not.toBe('no-access');
      expect(SECTIONS.some((s) => s.path === landing)).toBe(true);
    }
  });
});

describe('the spec sidebar (requirements section 98)', () => {
  it('has the eight groups in order', () => {
    expect([...GROUPS]).toEqual(['Dashboard', 'Healthcare Providers', 'Patients', 'Services', 'Analytics', 'Finances', 'Support', 'Admin']);
    const seen = [...new Set(SECTIONS.map((s) => s.group))];
    expect(seen).toEqual(GROUPS.filter((g) => seen.includes(g)));
  });

  it('lists each group with the labels the spec names', () => {
    const labels = (group: string, sub?: string) =>
      SECTIONS.filter((s) => s.group === group && (!sub || s.sub === sub)).map((s) => s.label);

    expect(labels('Healthcare Providers').slice(0, 6)).toEqual(['Doctors', 'Specialists', 'Super-specialists', 'Paramedical Professionals', 'Veterinary Specialists', 'Verification']);
    expect(labels('Patients')).toEqual(['Patients']);
    expect(labels('Services', 'Consultations').slice(0, 4)).toEqual(['Appointments', 'Case Records', 'Clarifications', 'Follow-ups']);
    expect(labels('Services', 'Lab Services')).toEqual(LAB_SERVICES_ENABLED ? ['Lab Orders', 'Lab Partners', 'Individual Lab Tests', 'Lab Test Packages', 'Allocation Settings', 'Reports'] : []);
    expect(labels('Analytics')).toEqual(['Overview', 'Consultation Analytics', 'Provider Analytics', 'Patient Analytics', ...(LAB_SERVICES_ENABLED ? ['Lab Analytics'] : []), 'Financial Analytics']);
    expect(labels('Finances')).toEqual(['Patient Payments', 'Provider Payouts', 'Refunds']);
    expect(labels('Support')).toEqual(['Support Tickets', 'Feedback', 'Notifications']);
    expect(labels('Admin')).toEqual(['Users', 'Roles & Permissions', 'Master Data', 'Admin Settings', 'App Settings', 'Website Settings']);
  });

  it('splits Services into Consultations and Lab Services, and nothing else has a sub-group', () => {
    if (!LAB_SERVICES_ENABLED) return;
    expect([...SUB_GROUPS]).toEqual(['Consultations', 'Lab Services']);
    for (const s of SECTIONS) {
      expect(Boolean(s.sub), s.path).toBe(s.group === 'Services');
    }
  });

  it('uses Provider Payouts, not Doctor Payments', () => {
    const labels = SECTIONS.map((s) => s.label.toLowerCase());
    expect(labels).toContain('provider payouts');
    expect(labels.some((l) => l.includes('doctor payment'))).toBe(false);
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

describe('the seven roles of requirements section 88', () => {
  it('are offered in the spec order, with the spec names, and Content Admin is not one of them', async () => {
    const { SPEC_ROLES, LEVEL_LABEL } = await import('./nav');
    expect(SPEC_ROLES.map((l) => LEVEL_LABEL[l])).toEqual([
      'Super Admin',
      'Operations Admin',
      'Verification Admin',
      'Finance Admin',
      'Support Admin',
      'Lab Admin',
      'Analytics User',
    ]);
    expect(SPEC_ROLES as readonly string[]).not.toContain('content');
  });

  it('every offered role is a level the backend knows, so none can be given and then refused', async () => {
    const { SPEC_ROLES, LEVELS } = await import('./nav');
    for (const l of SPEC_ROLES) expect(LEVELS).toContain(l);
  });
});
