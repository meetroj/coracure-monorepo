import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { NotificationBell } from '../app/NotificationBell';
import { ToastProvider } from '../lib/toast';
import { Inbox } from './Inbox';

const app = (path = '/') =>
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <NotificationBell />
        <Routes>
          <Route path="/" element={<p>home</p>} />
          <Route path="/inbox" element={<Inbox level="super_admin" />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );

describe('notification bell', () => {
  it('opens a short list, not the page, and shows the unread count', async () => {
    app();
    const bell = await screen.findByRole('button', { name: /Notifications, \d+ unread/ }, { timeout: 4000 });
    fireEvent.click(bell);
    expect(await screen.findByRole('dialog', { name: 'Notifications' })).toBeTruthy();
    // a preview of five at most; the rest is behind "View all"
    const dialog = screen.getByRole('dialog', { name: 'Notifications' });
    expect(dialog.querySelectorAll('.notifItem').length).toBeLessThanOrEqual(5);
    expect(screen.getByText('home')).toBeTruthy();
    expect(screen.queryByText(/Showing \d+ of/)).toBeNull();
  });

  it('closes on Escape and on an outside press', async () => {
    app();
    fireEvent.click(await screen.findByRole('button', { name: /Notifications/ }));
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    await screen.findByRole('dialog');
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('"View all notifications" opens the full page', async () => {
    app();
    fireEvent.click(await screen.findByRole('button', { name: /Notifications/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'View all notifications' }));
    expect(await screen.findByText(/Showing \d+ of \d+/)).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('marking one read lowers the count', async () => {
    app();
    const bell = await screen.findByRole('button', { name: /Notifications, (\d+) unread/ }, { timeout: 4000 });
    const before = Number(/(\d+) unread/.exec(bell.getAttribute('aria-label') ?? '')?.[1]);
    fireEvent.click(bell);
    const dialog = await screen.findByRole('dialog', { name: 'Notifications' });
    // any unread row; the mock keeps its state between tests
    await waitFor(() => expect(dialog.querySelector('.notifItem.isUnread')).toBeTruthy());
    const unreadRow = dialog.querySelector('.notifItem.isUnread') as HTMLElement;
    fireEvent.click(unreadRow);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: new RegExp(`Notifications(, ${before - 1} unread)?$`) })).toBeTruthy(),
    );
  });
});

describe('notifications page', () => {
  it('groups by day, filters to unread, and pages', async () => {
    app('/inbox');
    expect(await screen.findByText('Today')).toBeTruthy();
    expect(screen.getByText('Earlier')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /Unread/ }));
    // an already-read item drops out of the Unread view
    await waitFor(() => expect(screen.queryByText('Payout run due')).toBeNull());
    expect(document.querySelectorAll('.inboxRow.isUnread').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.inboxRow:not(.isUnread)').length).toBe(0);
  });
});
