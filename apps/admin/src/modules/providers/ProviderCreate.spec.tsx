import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ToastProvider } from '../../lib/toast';
import { ProviderCreate } from './ProviderCreate';

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/providers/new']}>
      <ToastProvider>
        <Routes>
          <Route path="/providers/new" element={<ProviderCreate level="operations" />} />
          <Route path="/providers" element={<p>list</p>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );

describe('Add a doctor', () => {
  it('asks for the same sections the verification review has', async () => {
    mount();
    for (const title of [
      'Basic details',
      'Proof of identity',
      'Professional qualifications',
      'Experience',
      'Digital signature',
    ]) {
      expect(await screen.findByRole('heading', { name: title })).toBeTruthy();
    }
    // Four qualification fields, two certificate uploads - no per-degree uploads.
    expect(screen.getByLabelText(/Basic qualification/)).toBeTruthy();
    expect(screen.getByLabelText(/^Degree certificate/)).toBeTruthy();
    expect(screen.getByLabelText(/^Registration certificate/)).toBeTruthy();
  });

  it('refuses to create until the mandatory details and uploads are in', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Create doctor' }));
    expect(await screen.findByText('Enter the date of birth.')).toBeTruthy();
    expect(screen.getByText('Choose at least one language.')).toBeTruthy();
    expect(screen.getByText('Upload the government ID document.')).toBeTruthy();
    expect(screen.getByText('Upload the experience certificate.')).toBeTruthy();
    // Still on the form.
    await waitFor(() => expect(screen.queryByText('list')).toBeNull());
  });

  it('adds and removes experience entries and shows the patient-facing total', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Add another experience' }));
    expect(screen.getAllByLabelText(/^Designation/)).toHaveLength(2);
    const years = screen.getAllByLabelText(/^Years of experience/);
    fireEvent.change(years[0], { target: { value: '5' } });
    fireEvent.change(years[1], { target: { value: '3' } });
    expect(screen.getByText('8 Years of Experience')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove this experience' })[1]);
    expect(screen.getAllByLabelText(/^Designation/)).toHaveLength(1);
  });
});
