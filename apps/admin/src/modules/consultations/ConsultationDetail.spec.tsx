import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';

import { ToastProvider } from '../../lib/toast';
import { ConsultationDetail } from './ConsultationDetail';

// jsdom has no <dialog> modal support; the kit's Modal needs these two.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

const mount = (id: string, level: 'operations' | 'finance' = 'operations') =>
  render(
    <MemoryRouter initialEntries={[`/consultations/${id}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/consultations/:consultationId" element={<ConsultationDetail level={level} />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );

describe('Consultation chat', () => {
  it('opens the doctor and patient conversation, read-only', async () => {
    mount('cs-1001');
    fireEvent.click(await screen.findByRole('button', { name: 'Chat' }, { timeout: 4000 }));
    const dialog = await screen.findByRole('dialog');
    const messages = await within(dialog).findAllByRole('listitem', {}, { timeout: 4000 });
    expect(messages.length).toBeGreaterThan(2);
    expect(within(dialog).getByText(/Read-only/)).toBeTruthy();
    // Nothing to type into: the admin does not take part.
    expect(within(dialog).queryByRole('textbox')).toBeNull();
  });

  it('is not offered to finance, who have no reason to read a clinical conversation', async () => {
    mount('cs-1001', 'finance');
    await screen.findByRole('button', { name: 'Case summary' }, { timeout: 4000 });
    expect(screen.queryByRole('button', { name: 'Chat' })).toBeNull();
  });
});
