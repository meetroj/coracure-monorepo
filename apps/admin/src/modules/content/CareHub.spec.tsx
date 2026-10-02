import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ToastProvider } from '../../lib/toast';
import { CareHub } from './CareHub';

const mount = (level: 'super_admin' | 'content' = 'super_admin') =>
  render(
    <MemoryRouter initialEntries={['/care-hub']}>
      <ToastProvider>
        <CareHub level={level} />
      </ToastProvider>
    </MemoryRouter>,
  );

const LIST = { name: 'Care Hub items' };
const cards = () => within(screen.getByRole('list', LIST)).getAllByRole('listitem');
const file = (name: string, type: string, bytes: number) =>
  new File([new Uint8Array(bytes)], name, { type });

const openEditor = async () => {
  await screen.findByRole('list', LIST);
  fireEvent.click(screen.getByRole('button', { name: /new item/i }));
  await screen.findByText('New Care Hub item');
};

describe('Care Hub library', () => {
  it('renders cards with thumbnails, video markers and status', async () => {
    mount();
    await screen.findByRole('list', LIST);
    expect(cards().length).toBeGreaterThanOrEqual(12);
    // Cover image and a YouTube-derived thumbnail both render.
    const imgs = screen.getAllByAltText(/Thumbnail for/) as HTMLImageElement[];
    expect(imgs.some((i) => i.src.startsWith('data:image/svg+xml'))).toBe(true);
    expect(imgs.some((i) => i.src.startsWith('https://img.youtube.com/vi/'))).toBe(true);
    expect(screen.getAllByText('Video').length).toBeGreaterThan(0);
  });

  it('narrows by type, status and search', async () => {
    mount();
    await screen.findByRole('list', LIST);
    const all = cards().length;

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'support_org' } });
    expect(cards().length).toBe(2);

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'published' } });
    expect(cards().length).toBe(1);

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: '' } });
    expect(cards().length).toBe(all);

    fireEvent.change(screen.getByPlaceholderText('Search title, summary or slug'), {
      target: { value: 'grounding' },
    });
    await waitFor(() => expect(cards().length).toBe(1));
  });

  it('shows an empty state when nothing matches', async () => {
    mount();
    await screen.findByRole('list', LIST);
    fireEvent.change(screen.getByPlaceholderText('Search title, summary or slug'), {
      target: { value: 'zzzz-nothing' },
    });
    await screen.findByText('No items match');
  });

  it('never shows Publish to a content admin', async () => {
    mount('content');
    await screen.findByRole('list', LIST);
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Submit for review' }).length).toBeGreaterThan(0);
  });
});

describe('Care Hub editor', () => {
  it('requires a title and rejects a non-YouTube link', async () => {
    mount();
    await openEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Title is required.')).toBeTruthy();

    const link = screen.getByLabelText('YouTube link');
    fireEvent.change(link, { target: { value: 'https://vimeo.com/12345' } });
    fireEvent.blur(link);
    expect(await screen.findByText('Only YouTube links are supported.')).toBeTruthy();

    fireEvent.change(link, { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });
    expect(screen.getByAltText('YouTube video thumbnail').getAttribute('src')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
  });

  it('rejects an oversize or wrong-type cover image', async () => {
    mount();
    await openEditor();
    const input = screen.getByLabelText('Cover image file');

    fireEvent.change(input, { target: { files: [file('a.gif', 'image/gif', 100)] } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/JPG, PNG or WebP/);

    fireEvent.change(input, {
      target: { files: [file('big.png', 'image/png', 5 * 1024 * 1024 + 1)] },
    });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/over 5 MB/));
    expect(screen.queryByAltText(/Cover preview/)).toBeNull();
  });

  it('accepts a good image and shows a preview', async () => {
    mount();
    await openEditor();
    fireEvent.change(screen.getByLabelText('Cover image file'), {
      target: { files: [file('ok.png', 'image/png', 2048)] },
    });
    expect(await screen.findByAltText(/Cover preview/)).toBeTruthy();
  });

  it('fills the slug from the title, then saves into the library', async () => {
    mount();
    await openEditor();
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'My Brand New Guide' } });
    expect((screen.getByLabelText(/^Slug/) as HTMLInputElement).value).toBe('my-brand-new-guide');

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    // Back in the library, with the new draft listed.
    await screen.findByRole('list', LIST);
    expect(await screen.findByText('My Brand New Guide')).toBeTruthy();
  });
});
