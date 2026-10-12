import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { CredentialQueue } from './CredentialQueue';
import { ProviderDetail } from './providers/ProviderDetail';
import { ToastProvider } from '../lib/toast';

const Where = () => <output data-testid="where">{useLocation().pathname + useLocation().search}</output>;

const mount = (start: string) =>
  render(
    <MemoryRouter initialEntries={[start]}>
      <ToastProvider>
        <Routes>
          <Route path="/verification" element={<CredentialQueue level="super_admin" />} />
          <Route path="/verification/:doctorId" element={<ProviderDetail level="super_admin" />} />
          <Route path="/providers/:doctorId" element={<ProviderDetail level="super_admin" />} />
        </Routes>
        <Where />
      </ToastProvider>
    </MemoryRouter>,
  );

describe('Verification', () => {
  it('lists every provider in the six spec statuses', async () => {
    mount('/verification');
    for (const name of ['Submitted', 'Under review', 'Changes required', 'Approved', 'Rejected', 'Suspended']) {
      expect(await screen.findByRole('tab', { name: new RegExp(`^${name}`) })).toBeTruthy();
    }
  });

  it('opens a provider inside Verification, not the Doctors section', async () => {
    mount('/verification');
    const [review] = await screen.findAllByRole('button', { name: 'Review' });
    fireEvent.click(review);

    await waitFor(() => expect(screen.getByTestId('where').textContent).toMatch(/^\/verification\/[^/?]+$/));
    expect(screen.getByTestId('where').textContent).not.toMatch(/^\/providers/);
  });

  it('shows the review sections as tabs, with the four admin actions', async () => {
    mount('/verification/dr-4');
    for (const name of ['Identity', 'Qualifications', 'Professional registration', 'Experience', 'Signature']) {
      expect(await screen.findByRole('tab', { name })).toBeTruthy();
    }
    expect(screen.queryByRole('tab', { name: 'Profile' })).toBeNull();
    for (const action of ['Approve', 'Changes required', 'Reject', 'Suspend']) {
      expect(screen.getByRole('button', { name: action })).toBeTruthy();
    }
  });

  it('a non-doctor has no Signature step', async () => {
    mount('/verification/dr-3');
    await screen.findByRole('tab', { name: 'Identity' });
    expect(screen.queryByRole('tab', { name: 'Signature' })).toBeNull();
  });

  it('the same provider opened from the Doctors list keeps the full set of tabs', async () => {
    mount('/providers/dr-4');
    expect(await screen.findByRole('tab', { name: 'Profile' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Availability' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Digital signature' })).toBeTruthy();
  });
});
