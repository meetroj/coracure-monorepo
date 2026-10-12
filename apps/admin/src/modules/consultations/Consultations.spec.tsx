import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Consultations } from './Consultations';

/** Mirrors the URL into the DOM so a test can assert on the query string. */
const Where = () => {
  const l = useLocation();
  return <output data-testid="where">{l.pathname + l.search}</output>;
};

const renderAt = (url = '/appointments') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/appointments" element={<Consultations level="super_admin" />} />
        <Route path="/appointments/:id" element={<p>detail page</p>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );

const where = () => screen.getByTestId('where').textContent;
const rowCount = () => document.querySelectorAll('tbody tr').length;

describe('Appointments list', () => {
  it('renders rows newest first with a count and no id-lookup box', async () => {
    renderAt();
    await screen.findByText(/Showing 15 of 33/);
    expect(rowCount()).toBe(15);
    expect(screen.queryByText(/Open by id/i)).toBeNull();
    expect(screen.queryByText(/no consultation list endpoint/i)).toBeNull();
  });

  it('search narrows the list and lands in the URL', async () => {
    renderAt();
    await screen.findByText(/Showing 15 of 33/);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Kabir Nair' } });
    await screen.findByText(/Showing 4 of 4/, {}, { timeout: 2000 });
    expect(where()).toContain('search=Kabir');
  });

  it('status filter works', async () => {
    renderAt();
    await screen.findByText(/Showing 15 of 33/);
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'requested' } });
    await screen.findByText(/Showing 3 of 3/);
    expect(where()).toContain('status=requested');
  });

  it('keeps filters from the URL on load', async () => {
    renderAt('/appointments?mode=instant&status=completed');
    await screen.findByText(/of \d+ \(33 in total\)/);
    expect((screen.getByLabelText('Mode') as HTMLSelectElement).value).toBe('instant');
    expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('completed');
  });

  it('clicking a row opens the detail route', async () => {
    renderAt();
    await screen.findByText(/Showing 15 of 33/);
    fireEvent.click(document.querySelector('tbody tr') as HTMLElement);
    await screen.findByText('detail page');
    expect(where()).toMatch(/^\/appointments\/cs-/);
  });

  it('shows an empty state with Clear filters that resets the URL', async () => {
    renderAt('/appointments?search=zzzz-nobody');
    await screen.findByText('No consultations match these filters');
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    await screen.findByText(/Showing 15 of 33/);
    await waitFor(() => expect(where()).toBe('/appointments'));
  });

  it('Show more grows the page', async () => {
    renderAt();
    await screen.findByText(/Showing 15 of 33/);
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    await screen.findByText(/Showing 30 of 33/);
  });
});
