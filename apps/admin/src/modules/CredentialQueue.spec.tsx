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
          <Route path="/credentials" element={<CredentialQueue level="super_admin" />} />
          <Route path="/credentials/:doctorId" element={<ProviderDetail level="super_admin" />} />
          <Route path="/providers/:doctorId" element={<ProviderDetail level="super_admin" />} />
        </Routes>
        <Where />
      </ToastProvider>
    </MemoryRouter>,
  );

describe('Document verification', () => {
  it('opens a doctor inside Document verification, not the Doctors section', async () => {
    mount('/credentials');
    const [review] = await screen.findAllByRole('button', { name: 'Review' });
    fireEvent.click(review);

    await waitFor(() => expect(screen.getByTestId('where').textContent).toMatch(/^\/credentials\/[^/?]+\?tab=credentials$/));
    expect(screen.getByTestId('where').textContent).not.toMatch(/^\/providers/);
  });

  it('the detail page shows the review sections as its tabs, with no Back link', async () => {
    mount('/credentials');
    fireEvent.click((await screen.findAllByRole('button', { name: 'Review' }))[0]);

    for (const name of ['Basic details', 'Proof of identity', 'Professional qualifications', 'Experience', 'Digital signature']) {
      expect(await screen.findByRole('tab', { name })).toBeTruthy();
    }
    expect(screen.queryByRole('tab', { name: 'Overview' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Document verification/ })).toBeNull();
  });

  it('the same doctor opened from the Doctors list keeps the full set of tabs', async () => {
    mount('/credentials');
    const [review] = await screen.findAllByRole('button', { name: 'Review' });
    fireEvent.click(review);
    const id = (await waitFor(() => screen.getByTestId('where').textContent!.match(/\/credentials\/([^/?]+)/)!))[1];

    mount(`/providers/${id}`);
    expect(await screen.findByRole('tab', { name: 'Overview' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Availability' })).toBeTruthy();
  });
});
