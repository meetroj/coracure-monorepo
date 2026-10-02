import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ToastProvider } from '../../lib/toast';
import { Pathways } from './Pathways';

const mount = () =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <Pathways level="clinical_governance" />
      </ToastProvider>
    </MemoryRouter>,
  );

describe('Pathways editor', () => {
  it('edits questions and rules as fields, not as raw JSON', async () => {
    mount();
    fireEvent.click((await screen.findAllByRole('button', { name: /New version from this/ }))[0]);

    // The stored questions load into fields...
    expect(await screen.findByDisplayValue('Did you take your medication as advised?')).toBeTruthy();
    // ...and nothing on the page is a JSON box.
    expect(screen.queryByDisplayValue('[]')).toBeNull();
    expect(screen.queryByText(/^JSON\./)).toBeNull();
  });

  it('names the first problem instead of publishing something broken', async () => {
    mount();
    fireEvent.click((await screen.findAllByRole('button', { name: /New version from this/ }))[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Add question' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish new version' }));
    expect(await screen.findByText(/has no wording/)).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('only offers the answers that belong to the chosen question', async () => {
    mount();
    fireEvent.click((await screen.findAllByRole('button', { name: /New version from this/ }))[0]);
    const firstRule = (await screen.findByText('Rule 1')).closest('.pwItem') as HTMLElement;
    // The first rule is on the cravings question, so it offers that question's own answers.
    expect(within(firstRule).getByLabelText('Unbearable')).toBeTruthy();
    expect(within(firstRule).getByLabelText('Mild')).toBeTruthy();
    expect(within(firstRule).queryByLabelText('Yes')).toBeNull();
  });
});
