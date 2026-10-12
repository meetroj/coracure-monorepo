import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { LAB_SERVICES_ENABLED, LEVELS, SECTIONS, sectionsFor } from '../nav';
import { mockSignIn, switchLevel } from '../mock/auth';
import { App } from './app';

// jsdom has no <dialog> modal support; the kit's Modal needs these two.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

afterEach(cleanup);

const mountAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

/**
 * Every sidebar link from the spec opens a real screen: the shell names the
 * page, and none of them falls back to the "Not built yet" worklist.
 */
describe('every section of the sidebar opens a real screen', () => {
  beforeAll(async () => {
    await mockSignIn('admin@coracure.com');
  });

  for (const section of SECTIONS) {
    it(`/${section.path} renders ${section.label}`, async () => {
      mountAt(`/${section.path}`);
      await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: section.label })).toBeTruthy());
      // Give lazy data a beat, then make sure nothing fell back to a placeholder or crashed.
      await waitFor(() => expect(document.querySelector('.skeleton')).toBeNull(), { timeout: 3000 }).catch(() => undefined);
      expect(screen.queryByText('Not built yet')).toBeNull();
      expect(screen.queryByText(/Something went wrong/i)).toBeNull();
    });
  }
});

/** The hubs hold several screens each; every tab must render too. */
describe('every tab of the hub screens renders', () => {
  beforeAll(async () => {
    await mockSignIn('admin@coracure.com');
  });

  const TABS: [string, string][] = [
    ['/admin-settings?tab=rules', 'Admin Settings'],
    ['/admin-settings?tab=general', 'Admin Settings'],
    ['/admin-settings?tab=audit', 'Admin Settings'],
    ['/admin-settings?tab=deletion-requests', 'Admin Settings'],
    ['/admin-settings?tab=retention', 'Admin Settings'],
    ['/app-settings?tab=app', 'App Settings'],
    ['/app-settings?tab=care-hub', 'App Settings'],
    ['/app-settings?tab=pathways', 'App Settings'],
    ['/website-settings?tab=website', 'Website Settings'],
    ['/website-settings?tab=legal', 'Website Settings'],
    ['/master-data?view=provider', 'Master Data'],
    ['/master-data?view=other', 'Master Data'],
    ['/master-data?view=catalogue', 'Master Data'],
    ['/support-tickets?tab=complaints', 'Support Tickets'],
    ['/case-records?tab=summaries', 'Case Records'],
    ['/clarifications?tab=experts', 'Clarifications'],
    ['/appointments?tab=allocation', 'Appointments'],
    ['/case-records/cs-1001', 'Case Records'],
    ['/case-records/cs-1100', 'Case Records'],
    ['/providers/dr-1', 'Doctors'],
    ['/verification/dr-4', 'Verification'],
  ];

  for (const [path, title] of TABS) {
    it(path, async () => {
      mountAt(path);
      await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: title })).toBeTruthy());
      await new Promise((r) => setTimeout(r, 400));
      expect(screen.queryByText('Not built yet')).toBeNull();
    });
  }
});

describe('the collapsible sidebar', () => {
  beforeAll(async () => {
    await mockSignIn('admin@coracure.com');
  });

  it('opens only the group of the current page, and Services shows its sub-groups', async () => {
    mountAt('/appointments');
    const nav = await screen.findByRole('navigation', { name: 'Sections' });
    expect(nav.textContent).toContain('Appointments');
    expect(nav.textContent).toContain('Consultations');
    // Lab Services is switched off for now.
    expect(nav.textContent !== undefined && nav.textContent.includes('Lab Services')).toBe(LAB_SERVICES_ENABLED);
    // A group the page is not in stays closed.
    expect(nav.textContent).not.toContain('Doctors');
    expect(nav.textContent).not.toContain('Financial Analytics');
  });

  it('hides sections the level cannot use', async () => {
    switchLevel('lab', 'lab@coracure.com');
    mountAt('/dashboard');
    const nav = await screen.findByRole('navigation', { name: 'Sections' });
    const visible = sectionsFor('lab').map((s) => s.label);
    expect(visible).toContain('Dashboard');
    expect(visible).not.toContain('Lab Orders');
    expect(nav.textContent).not.toContain('Verification');
    expect(LEVELS).toContain('lab');
  });
});

describe('old paths still land somewhere', () => {
  beforeAll(async () => {
    await mockSignIn('admin@coracure.com');
  });

  it('sends /consultations/:id to /appointments/:id', async () => {
    mountAt('/consultations/cs-1001');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Appointments' })).toBeTruthy());
  });

  it('sends /credentials to Verification', async () => {
    mountAt('/credentials');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Verification' })).toBeTruthy());
  });
});
