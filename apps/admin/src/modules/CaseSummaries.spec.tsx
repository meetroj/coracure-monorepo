import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';

import { ToastProvider } from '../lib/toast';
import { CaseSummaries } from './CaseSummaries';
import { CaseSummaryDetail } from './CaseSummaryDetail';

// jsdom has no <dialog> modal support; the kit's Modal needs these two.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

const Search = () => <output data-testid="loc">{useLocation().search}</output>;

const renderPage = (url = '/case-summaries') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <ToastProvider>
        <Routes>
          <Route path="/case-summaries" element={<CaseSummaries level="super_admin" />} />
          <Route path="/case-summaries/:summaryId" element={<CaseSummaryDetail level="super_admin" />} />
        </Routes>
        <Search />
      </ToastProvider>
    </MemoryRouter>,
  );

const rowsOf = () => screen.getAllByRole('row').slice(1);

describe('CaseSummaries', () => {
  it('renders the rows with no clinical columns', async () => {
    renderPage();
    await screen.findByText(/Showing \d+ of \d+/);
    expect(rowsOf().length).toBeGreaterThanOrEqual(30);
    expect(screen.getByRole('columnheader', { name: 'Patient' })).toBeTruthy();
    expect(screen.queryByText(/diagnosis/i)).toBeNull();
  });

  it('narrows with the status select and keeps it in the URL', async () => {
    renderPage();
    await screen.findByText(/Showing/);
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'awaiting' } });
    await screen.findByText(/Showing \d+ of/);
    expect(screen.getByTestId('loc').textContent).toBe('?status=awaiting');
    expect(rowsOf().every((r) => within(r).queryByText('Awaiting generation'))).toBe(true);
  });

  it('filters by the status select and restores from the URL', async () => {
    renderPage('/case-summaries?status=reviewed&sort=oldest');
    await screen.findByText(/Showing/);
    expect(rowsOf().every((r) => within(r).queryByText('Reviewed by doctor'))).toBe(true);
    expect((screen.getByLabelText('Sort') as HTMLSelectElement).value).toBe('oldest');
  });

  it('searches by reference code', async () => {
    renderPage();
    await screen.findByText(/Showing/);
    fireEvent.change(screen.getByPlaceholderText('Reference code or doctor'), {
      target: { value: 'CC-2026-01003' },
    });
    await screen.findByText(/Showing 1 of/, undefined, { timeout: 2000 });
    expect(screen.getByTestId('loc').textContent).toContain('search=CC-2026-01003');
  });

  it('shows the empty state with a way out', async () => {
    renderPage('/case-summaries?search=zzzz-no-match');
    await screen.findByText('No case summaries match these filters');
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await screen.findByText(/Showing/);
    expect(screen.getByTestId('loc').textContent).toBe('');
  });

  it('a row opens a full detail page with the patient and doctor content', async () => {
    renderPage();
    await screen.findByText(/Showing/);
    fireEvent.click(rowsOf()[0]);
    expect(await screen.findByRole('heading', { name: /^Summary CC-/ })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    for (const t of ['Doctor details', 'Patient details', "Patient's complaint", 'Medical history', 'Any previous history'])
      expect(screen.getAllByText(t).length).toBeGreaterThan(0);
  });

  it('shows the follow-up plan and check-ins on a case summary', async () => {
    const { caseSummaries } = await import('../mock/caseSummaries');
    renderPage(`/case-summaries/${caseSummaries[0].id}?tab=followup`);
    expect(await screen.findByText('Plan schedule', {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getAllByText('Pathway').length).toBeGreaterThan(0);
    expect(screen.getByText('Review date')).toBeTruthy();
    expect(screen.getByText('Daily check-ins')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Follow-up' }).getAttribute('aria-selected')).toBe('true');
  });

  it('says plainly when no follow-up plan was assigned', async () => {
    const { caseSummaries } = await import('../mock/caseSummaries');
    // every third case (index 2, 5, ...) has none
    renderPage(`/case-summaries/${caseSummaries[2].id}?tab=followup`);
    expect(await screen.findByText('No follow-up plan was assigned for this case.', {}, { timeout: 4000 })).toBeTruthy();
  });

  it('shows the complaint, medical history and uploaded documents on Details', async () => {
    const { caseSummaries } = await import('../mock/caseSummaries');
    renderPage(`/case-summaries/${caseSummaries[0].id}`);
    expect(await screen.findByText("Patient's complaint", {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByText('Medical history')).toBeTruthy();
    expect(screen.getByText('Uploaded by the patient')).toBeTruthy();
  });

  it('lists what the doctor recommended from the Care Hub', async () => {
    const { caseSummaries } = await import('../mock/caseSummaries');
    renderPage(`/case-summaries/${caseSummaries[0].id}?tab=recommendation`);
    expect(await screen.findByText('Recommended tools', {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByText('Recommended modules')).toBeTruthy();
    expect(screen.getByText('Note to patient')).toBeTruthy();
  });
});
