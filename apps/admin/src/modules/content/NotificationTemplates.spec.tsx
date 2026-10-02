import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';

import { doctors } from '../../mock/db';
import { ToastProvider } from '../../lib/toast';
import { NotificationTemplates } from './NotificationTemplates';

// jsdom has no <dialog> modal support; the kit's Modal needs these two.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

const renderPage = (url = '/notifications') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <ToastProvider>
        <NotificationTemplates level="super_admin" />
      </ToastProvider>
    </MemoryRouter>,
  );

const tab = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));
const sendBtn = () => screen.getByRole('button', { name: 'Send notification' });

describe('Notifications page', () => {
  it('switches between the three tabs', async () => {
    renderPage();
    // the top bar names the page, so the body carries no second heading
    expect(screen.queryByRole('heading', { name: 'Notifications' })).toBeNull();
    expect(screen.getByRole('tablist')).toBeTruthy();
    await screen.findByText('consultation_booked');

    tab('History');
    await screen.findByText('Availability review');
    expect(screen.queryByText('Current wording')).toBeNull();

    tab('Send notification');
    expect(screen.getByText(/Never name a diagnosis/)).toBeTruthy();
  });

  it('opens on the tab named in the URL', async () => {
    renderPage('/notifications?tab=history');
    await screen.findByText('Availability review');
  });

  it('audience filter narrows the templates', async () => {
    renderPage();
    await screen.findByText('checkin_due');
    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'doctor' } });
    expect(screen.getByText('consultation_reminder')).toBeTruthy();
    expect(screen.queryByText('checkin_due')).toBeNull();
    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'admin' } });
    expect(screen.getByText('No templates match')).toBeTruthy();
  });

  it('validates the form: empty and over-length disable Send', async () => {
    renderPage('/notifications?tab=send');
    expect((sendBtn() as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'Hello' } });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: 'x'.repeat(301) } });
    expect(screen.getByText('Max 300 characters.')).toBeTruthy();
    expect((sendBtn() as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: 'Short note' } });
    await waitFor(() => expect((sendBtn() as HTMLButtonElement).disabled).toBe(false));

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 't'.repeat(81) } });
    expect((sendBtn() as HTMLButtonElement).disabled).toBe(true);
  });

  it('confirms an all-audience send, then shows it in History', async () => {
    renderPage('/notifications?tab=send');
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'Quarterly update' } });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: 'Please check the app.' } });
    await waitFor(() => expect((sendBtn() as HTMLButtonElement).disabled).toBe(false));

    fireEvent.click(sendBtn());
    await screen.findByText(`This will notify ${doctors.length} doctors. A sent notification cannot be recalled.`);
    expect(screen.queryByText(/Notification sent to/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Send now' }));
    await screen.findByText(`Notification sent to ${doctors.length} doctors.`);

    tab('History');
    await screen.findByText('Quarterly update');
  });
});
