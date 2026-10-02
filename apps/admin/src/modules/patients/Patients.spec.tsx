import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';

import { ToastProvider } from '../../lib/toast';
import { PatientDetail } from './PatientDetail';
import { Patients } from './Patients';

// jsdom has no <dialog> modal support; the kit's Modal needs these two.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

const app = (start: string) => (
  <MemoryRouter initialEntries={[start]}>
    <ToastProvider>
      <Routes>
        <Route path="/patients" element={<Patients level="operations" />} />
        <Route path="/patients/:patientId" element={<PatientDetail level="operations" />} />
      </Routes>
      <Where />
    </ToastProvider>
  </MemoryRouter>
);

describe('Patients', () => {
  it('renders a page of rows from the mock, with full mobile numbers', async () => {
    render(app('/patients'));
    expect(await screen.findByText('Aarav Mehta')).toBeTruthy();
    expect(screen.getAllByRole('row').length).toBeGreaterThan(5);
    expect(screen.getByText(/Showing 10 of 28/)).toBeTruthy();
  });

  it('search narrows the list', async () => {
    render(app('/patients?search=priya'));
    expect(await screen.findByText('Priya Nair')).toBeTruthy();
    expect(screen.queryByText('Aarav Mehta')).toBeNull();
  });

  it('status filter works', async () => {
    render(app('/patients?status=pending_deletion'));
    expect(await screen.findByText('Meera Pillai')).toBeTruthy();
    expect(screen.getByText('Aditya Chauhan')).toBeTruthy();
    expect(screen.queryByText('Aarav Mehta')).toBeNull();
    expect(screen.getByText(/Showing 2 of 2/)).toBeTruthy();
  });

  it('shows the empty state when nothing matches', async () => {
    render(app('/patients?search=zzzzqq'));
    expect(await screen.findByText('No patients match these filters')).toBeTruthy();
  });

  it('a row opens the detail route', async () => {
    render(app('/patients'));
    fireEvent.click(await screen.findByText('Aarav Mehta'));
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/patients/pt-1001'));
    expect(await screen.findByRole('tab', { name: 'Consents' })).toBeTruthy();
  });

  it('keeps the selected tab in the URL', async () => {
    render(app('/patients/pt-1001'));
    fireEvent.click(await screen.findByRole('tab', { name: 'Complaints' }));
    expect(await screen.findByText('Video call would not connect')).toBeTruthy();
  });

  it('an unknown patient id shows not-found with a way back', async () => {
    render(app('/patients/pt-nope'));
    expect(await screen.findByText('Patient not found')).toBeTruthy();
    expect(screen.getByRole('link', { name: /back to patients/i })).toBeTruthy();
  });
});

describe('Patient detail header and registration details', () => {
  it('has no Back arrow or breadcrumb, and keeps the patient facts beside the name', async () => {
    render(app('/patients'));
    fireEvent.click(await screen.findByText('Aarav Mehta'));
    await screen.findByRole('heading', { name: 'Aarav Mehta' });

    expect(screen.queryByRole('link', { name: /^Patients$/ })).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull();
    expect(document.querySelector('.headerFacts')?.textContent).toMatch(/\+91 9081000000/);
  });

  it('puts the place and the joined date under the name, not in the top line', async () => {
    render(app('/patients'));
    fireEvent.click(await screen.findByText('Aarav Mehta'));
    await screen.findByRole('heading', { name: 'Aarav Mehta' });

    const underName = document.querySelector('.pageHeader__desc')?.textContent ?? '';
    expect(underName).toMatch(/Delhi NCR/);
    expect(underName).toMatch(/Joined \d/);
    const topLine = document.querySelector('.headerFacts')?.textContent ?? '';
    expect(topLine).not.toMatch(/Delhi NCR/);
    expect(topLine).not.toMatch(/Joined/);
  });

  it('lists what the patient entered at sign-up, including date of birth', async () => {
    render(app('/patients'));
    fireEvent.click(await screen.findByText('Aarav Mehta'));
    const heading = await screen.findByRole('heading', { name: 'Basic details' });
    const list = heading.closest('section, div')!.parentElement!.textContent!;

    ['Full name', 'Date of birth', 'Gender', 'Mobile number', 'Email address', 'Preferred language(s)'].forEach(
      (label) => expect(list).toContain(label),
    );
    expect(list).toMatch(/Hindi/);
    const contact = (await screen.findByRole('heading', { name: 'Contact details' }))
      .closest('section, div')!.parentElement!.textContent!;
    ['Address line 1', 'City', 'State', 'PIN code', 'Country'].forEach((label) =>
      expect(contact).toContain(label),
    );
    expect(contact).toMatch(/Delhi/);
    expect(screen.getByRole('heading', { name: /Health profile/ })).toBeTruthy();
  });

  it('lets an admin correct a patient, recalculates the age and keeps the mobile locked', async () => {
    render(app('/patients'));
    fireEvent.click(await screen.findByText('Aarav Mehta'));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
    const dialog = await screen.findByRole('dialog');
    expect((within(dialog).getByLabelText('Mobile number') as HTMLInputElement).disabled).toBe(true);

    fireEvent.change(within(dialog).getByLabelText(/^Full name/), { target: { value: 'Aarav K. Mehta' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Details updated.')).toBeTruthy();
    expect(await screen.findAllByText('Aarav K. Mehta')).not.toHaveLength(0);
  });

  it('will not save a patient with a bad email or no address', async () => {
    render(app('/patients'));
    fireEvent.click(await screen.findByText('Priya Nair'));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Email address/), { target: { value: 'nope' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await within(dialog).findByText('Enter a valid email address.')).toBeTruthy();
  });
});
