import { describe, expect, it } from 'vitest';

import { broadcastBody, broadcastFrom, statusOf, templateBody, templateFrom } from './liveNotifications';

/** `TemplateRecord`, `UpdateTemplateDto`, `SendBroadcastDto`, `BroadcastRow`, as the panel sees them. */

describe('templateFrom and templateBody', () => {
  it('calls a template that is no longer the shipped one edited', () => {
    const t = templateFrom({
      code: 'consultation_reminder',
      title: 'Reminder',
      body: 'Your consultation is soon.',
      description: 'Sent before a consultation',
      audience: ['patient', 'doctor'],
      placeholders: ['doctorName'],
      isDefault: false,
    });
    expect(t).toMatchObject({ code: 'consultation_reminder', isCustomised: true, audience: ['patient', 'doctor'] });
  });

  it('sends the title and wording trimmed, and refuses an empty or overlong one before the request', () => {
    expect(templateBody({ title: ' Hi ', body: ' There ' })).toEqual({ title: 'Hi', body: 'There' });
    expect(() => templateBody({ title: '', body: 'x' })).toThrow(/title/);
    expect(() => templateBody({ title: 'x', body: ' ' })).toThrow(/wording/);
    expect(() => templateBody({ title: 'x'.repeat(201), body: 'x' })).toThrow(/200/);
    expect(() => templateBody({ title: 'x', body: 'x'.repeat(2001) })).toThrow(/2000/);
  });
});

describe('broadcastBody', () => {
  const base = { title: ' Maintenance ', body: ' The app will be down. ', channels: ['in_app' as const] };

  it('sends everyone as an all_ audience with no recipient list', () => {
    expect(broadcastBody({ ...base, audience: 'doctor' })).toEqual({
      audience: 'all_doctors',
      title: 'Maintenance',
      body: 'The app will be down.',
      channels: ['in_app'],
    });
  });

  it('sends chosen people as a selected_ audience with their ids, and no deep link', () => {
    const body = broadcastBody({ ...base, audience: 'patient', recipientIds: ['p1', 'p2'] });
    expect(body).toMatchObject({ audience: 'selected_patients', recipientIds: ['p1', 'p2'] });
    expect(body).not.toHaveProperty('deepLink');
  });

  it('refuses what the backend would: nothing to say, no channel, too many people', () => {
    expect(() => broadcastBody({ ...base, audience: 'doctor', title: ' ' })).toThrow(/Title/);
    expect(() => broadcastBody({ ...base, audience: 'doctor', channels: [] })).toThrow(/channel/);
    expect(() =>
      broadcastBody({ ...base, audience: 'patient', recipientIds: Array.from({ length: 1001 }, (_, i) => String(i)) }),
    ).toThrow(/1000/);
  });
});

describe('history', () => {
  const row = {
    id: 'b1',
    title: 'Hello',
    body: 'Body',
    audience: 'selected_doctors',
    channels: ['push', 'in_app'],
    recipientCount: 10,
    deliveredCount: 7,
    failedCount: 3,
    queuedCount: 0,
    createdAt: '2026-10-12T09:00:00.000Z',
  };

  it('reads a send, with who it went to and how it ended', () => {
    expect(broadcastFrom(row)).toMatchObject({
      audience: 'doctor',
      scope: 'selected',
      type: 'manual',
      delivered: 7,
      failed: 3,
      status: 'partial',
      deepLink: null,
    });
  });

  it('is sent when none failed, failed when none got through, partial in between', () => {
    expect(statusOf({ deliveredCount: 5, failedCount: 0 })).toBe('sent');
    expect(statusOf({ deliveredCount: 0, failedCount: 5 })).toBe('failed');
    expect(statusOf({ deliveredCount: 2, failedCount: 3 })).toBe('partial');
  });
});
