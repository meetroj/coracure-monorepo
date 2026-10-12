import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Dashboard } from './Dashboard';

describe('Dashboard', () => {
  it('shows every band of the spec, then the trend and recent activity, for a super admin', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Dashboard level="super_admin" />
      </MemoryRouter>,
    );
    for (const band of ['Healthcare Providers', 'Patients', 'Consultations', 'Finances', 'Support']) {
      expect(await screen.findByRole('heading', { name: band })).toBeTruthy();
    }
    for (const card of ['Total providers', 'Pending verification', 'Changes required', 'Total registered patients', 'Appointment requests', 'Pending clarifications', 'Provider payouts pending', 'Refunds pending', 'New support tickets', 'Resolved tickets']) {
      expect(screen.getByText(card)).toBeTruthy();
    }
    expect(await screen.findByText('Consultations, last 7 days')).toBeTruthy();
    expect(await screen.findByText('Recent activity')).toBeTruthy();
  });

  it('leaves out cards for sections the level cannot reach', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Dashboard level="finance" />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Provider payouts pending')).toBeTruthy();
    expect(screen.queryByText('New support tickets')).toBeNull();
    expect(screen.queryByText('Total providers')).toBeNull();
    expect(screen.queryByText('Lab allocation pending')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Lab Services' })).toBeNull();
  });
});
