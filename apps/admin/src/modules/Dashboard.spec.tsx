import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Dashboard } from './Dashboard';

describe('Dashboard', () => {
  it('shows the attention cards, the overview cards and recent activity for a super admin', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Dashboard level="super_admin" />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Needs attention')).toBeTruthy();
    expect(screen.getByText('Platform overview')).toBeTruthy();
    expect(screen.getByText('Red flags to acknowledge')).toBeTruthy();
    expect(screen.getByText('Verified doctors')).toBeTruthy();
    expect(screen.getByText('Patients')).toBeTruthy();
    expect(screen.getByText('Consultations, last 7 days')).toBeTruthy();
    expect(screen.getByText('Recent activity')).toBeTruthy();
  });

  it('leaves out cards for sections the level cannot reach', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Dashboard level="finance" />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Payouts waiting')).toBeTruthy();
    expect(screen.queryByText('Red flags to acknowledge')).toBeNull();
    expect(screen.queryByText('Patients')).toBeNull();
  });
});
