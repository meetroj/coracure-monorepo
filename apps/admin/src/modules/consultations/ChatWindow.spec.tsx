import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { consultations } from '../../api/admin';
import { ChatWindow } from './ChatWindow';

// jsdom has no <dialog> modal support; the kit's Modal needs these two.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

afterEach(() => vi.restoreAllMocks());

const open = () => render(<ChatWindow consultationId="c1" doctor="Dr Asha Menon" patient="Aarav M." onClose={() => undefined} />);

describe('ChatWindow', () => {
  it('shows the conversation read only, each line under its sender\'s name', async () => {
    vi.spyOn(consultations, 'chat').mockResolvedValue([
      { id: 'm1', from: 'patient', text: 'Hello doctor', at: '2026-10-10T09:00:00.000Z' },
      { id: 'm2', from: 'doctor', text: 'Please send the report', at: '2026-10-10T09:01:00.000Z' },
    ] as never);
    open();
    expect(await screen.findByText('Hello doctor', {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByText('Please send the report')).toBeTruthy();
    expect(screen.getByText('Aarav M.')).toBeTruthy();
    expect(screen.getAllByText('Dr Asha Menon').length).toBeGreaterThan(0);
    // it never offers to write into the conversation
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText(/recorded against your admin account/)).toBeTruthy();
  });

  it('says the conversation spans every consultation of the pair, not just this one', async () => {
    vi.spyOn(consultations, 'chat').mockResolvedValue([] as never);
    open();
    expect(screen.getByText(/not only this\s+consultation/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText('No messages have been exchanged between them.')).toBeTruthy());
  });
});
