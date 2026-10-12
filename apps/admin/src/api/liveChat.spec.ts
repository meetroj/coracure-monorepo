import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./http', () => ({ request: vi.fn() }));

import { request } from './http';
import { liveChat } from './liveChat';

const mocked = vi.mocked(request);
beforeEach(() => mocked.mockReset());

describe('liveChat', () => {
  it('asks the admin chat route for this consultation, with the id escaped', async () => {
    mocked.mockResolvedValue({ messages: [], total: 0, truncated: false });
    await liveChat('a/b c');
    expect(mocked).toHaveBeenCalledWith('/admin/consultations/a%2Fb%20c/chat');
  });

  it('reads the server transcript as the panel\'s own messages, naming an attachment and nothing more', async () => {
    mocked.mockResolvedValue({
      messages: [
        { id: 'm1', sender: 'patient', body: 'Hello doctor', attachmentFileName: null, createdAt: '2026-10-10T09:00:00.000Z' },
        { id: 'm2', sender: 'doctor', body: 'Please send the report', attachmentFileName: null, createdAt: '2026-10-10T09:01:00.000Z' },
        { id: 'm3', sender: 'patient', body: null, attachmentFileName: 'blood-test.pdf', createdAt: '2026-10-10T09:02:00.000Z' },
        { id: 'm4', sender: 'patient', body: 'Here it is', attachmentFileName: 'scan.jpg', createdAt: '2026-10-10T09:03:00.000Z' },
      ],
      total: 4,
      truncated: false,
    });
    const out = await liveChat('c1');
    expect(out.map((m) => [m.id, m.from])).toEqual([['m1', 'patient'], ['m2', 'doctor'], ['m3', 'patient'], ['m4', 'patient']]);
    expect(out[0]).toEqual({ id: 'm1', from: 'patient', text: 'Hello doctor', at: '2026-10-10T09:00:00.000Z' });
    expect(out[2].text).toBe('Attachment: blood-test.pdf');
    expect(out[3].text).toBe('Here it is\nAttachment: scan.jpg');
  });
});
