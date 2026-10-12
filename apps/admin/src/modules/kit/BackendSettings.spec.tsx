import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/liveSettings', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../api/liveSettings')>();
  return { ...real, settings: { group: vi.fn(), save: vi.fn() } };
});

import { settings } from '../../api/liveSettings';
import { ToastProvider } from '../../lib/toast';
import { BackendSettings } from './BackendSettings';

afterEach(() => vi.clearAllMocks());

const field = (over: Record<string, unknown>) => ({
  key: 'x',
  label: 'X',
  description: '',
  type: 'string_list',
  unit: null,
  min: null,
  max: null,
  options: null,
  default: [],
  value: [],
  editable: true,
  enforcedBy: null,
  ...over,
});

describe('BackendSettings option labels', () => {
  it('names a language instead of printing its code, and still stores the code', async () => {
    vi.mocked(settings.group).mockResolvedValue({
      group: 'app_settings',
      related: [],
      fields: [
        field({
          key: 'languages',
          label: 'Languages offered in the apps',
          options: ['en', 'hi', 'hinglish', 'ml', 'ur'],
          value: ['en', 'hi'],
        }),
      ],
    } as never);
    render(
      <ToastProvider>
        <BackendSettings groups={['app_settings']} />
      </ToastProvider>,
    );
    for (const name of ['English', 'Hindi', 'Hinglish', 'Malayalam', 'Urdu']) {
      expect(await screen.findByLabelText(name, {}, { timeout: 4000 })).toBeTruthy();
    }
    // the raw codes are no longer what a person is asked to read
    expect(screen.queryByLabelText('hinglish')).toBeNull();
    expect((screen.getByLabelText('English') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Malayalam') as HTMLInputElement).checked).toBe(false);
  });

  it('leaves an option that is not a language exactly as it is', async () => {
    vi.mocked(settings.group).mockResolvedValue({
      group: 'app_settings',
      related: [],
      fields: [field({ key: 'channels', label: 'Channels', options: ['sms', 'email'], value: ['sms'] })],
    } as never);
    render(
      <ToastProvider>
        <BackendSettings groups={['app_settings']} />
      </ToastProvider>,
    );
    expect(await screen.findByLabelText('sms', {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByLabelText('email')).toBeTruthy();
  });
});
