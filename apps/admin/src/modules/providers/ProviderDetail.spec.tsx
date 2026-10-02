import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';

import { ToastProvider } from '../../lib/toast';
import { ProviderDetail } from './ProviderDetail';

// jsdom has no <dialog> modal support; the kit's Modal needs these two.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

const mount = (id: string) =>
  render(
    <MemoryRouter initialEntries={[`/providers/${id}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/providers/:doctorId" element={<ProviderDetail level="super_admin" />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );

describe('Doctor overview', () => {
  it('shows what the doctor stated in the sign-up form, for the reviewer', async () => {
    mount('dr-1');
    const section = async (name: string) =>
      (await screen.findByRole('heading', { name })).closest('section, div')!.parentElement!.textContent!;

    const basic = await section('Basic details');
    expect(basic).toMatch(/Languages for consultation/);
    expect(basic).toMatch(/OTP verified/);
    const identity = await section('Proof of identity');
    expect(identity).toMatch(/Aadhaar/);
    expect(identity).toMatch(/•••• 4421/);
    expect(identity).toMatch(/ananya\.rao@abdm/);
    const qual = await section('Professional qualifications');
    expect(qual).toMatch(/MD Psychiatry/);
    expect(qual).toMatch(/Shown to patients as: MBBS · MD Psychiatry/);
    expect(await section('Experience')).toMatch(/Lilavati Hospital, 8 years/);
    expect(await section('Experience')).toMatch(/11 Years of Experience/);
    expect(await section('Digital signature')).toMatch(/Uploaded/);
    expect(screen.queryByRole('tab', { name: 'Credentials' })).toBeNull();
  });

  it('says plainly when the signature has not been uploaded', async () => {
    mount('dr-3');
    expect(await screen.findByText('Not uploaded')).toBeTruthy();
  });

  it('shows no registration card for a doctor created by an admin with no form on file', async () => {
    mount('dr-6');
    await screen.findByRole('heading', { name: 'Dr Kabir Nair' });
    expect(screen.queryByText(/Lilavati/)).toBeNull();
  });

  it('lets an admin correct the details, and shows the change', async () => {
    mount('dr-2');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
    const dialog = await screen.findByRole('dialog');

    // The sign-in number cannot be edited from here.
    expect((within(dialog).getByLabelText('Mobile number') as HTMLInputElement).disabled).toBe(true);

    fireEvent.change(within(dialog).getByLabelText('Fellowship (optional)'), {
      target: { value: 'Fellowship in Psychotherapy' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Details updated.')).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText(/Fellowship in Psychotherapy/).length).toBeGreaterThan(0));
  });

  it('refuses to save a doctor with no basic qualification', async () => {
    mount('dr-2');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Basic qualification/), { target: { value: '' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await within(dialog).findByText('The basic qualification is required.')).toBeTruthy();
  });
});
