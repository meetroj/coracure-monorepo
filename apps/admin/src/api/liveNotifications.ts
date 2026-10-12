import { request } from './http';
import { listAll } from './liveList';
import type { NotificationTemplate } from './types';

/**
 * Notifications against the backend: the wording of every automatic one
 * (`/admin/notification-templates`), a manual send
 * (`POST /admin/notifications/broadcasts`) and what has gone out
 * (`GET /admin/notifications/broadcasts`).
 *
 * Source of truth: `TemplateRecord`, `UpdateTemplateDto`, `SendBroadcastDto`,
 * `BroadcastResult`, `BroadcastRow`.
 *
 * What the backend does not have, so the panel does not show: a deep link on a
 * broadcast (the DTO is whitelisted, so one would be a 400), and a history of
 * the automatic notifications as rows (they are per-recipient deliveries, in the
 * thousands). History lists what was sent from this panel.
 */

/* -------------------------------- templates -------------------------------- */

type LiveTemplate = {
  code: string;
  title: string;
  body: string;
  description: string;
  audience: string[];
  placeholders: string[];
  isDefault: boolean;
};

export const templateFrom = (t: LiveTemplate): NotificationTemplate => ({
  code: t.code,
  title: t.title,
  body: t.body,
  isCustomised: !t.isDefault,
  description: t.description,
  audience: t.audience,
  placeholders: t.placeholders,
});

/** Title 1-200 and body 1-2000 characters (`UpdateTemplateDto`). */
export function templateBody(input: { title?: string; body?: string }): { title: string; body: string } {
  const title = (input.title ?? '').trim();
  const body = (input.body ?? '').trim();
  if (!title) throw new Error('The title cannot be empty.');
  if (title.length > 200) throw new Error('The title can be at most 200 characters.');
  if (!body) throw new Error('The wording cannot be empty.');
  if (body.length > 2000) throw new Error('The wording can be at most 2000 characters.');
  return { title, body };
}

const templatePath = (code: string) => `/admin/notification-templates/${encodeURIComponent(code)}`;

export const liveTemplates = {
  list: async () => (await request<LiveTemplate[]>('/admin/notification-templates')).map(templateFrom),
  get: async (code: string) => templateFrom(await request<LiveTemplate>(templatePath(code))),
  update: async (code: string, input: { title?: string; body?: string }) =>
    templateFrom(await request<LiveTemplate>(templatePath(code), { method: 'PATCH', body: templateBody(input) })),
  reset: async (code: string) =>
    templateFrom(await request<LiveTemplate>(`${templatePath(code)}/reset`, { method: 'POST', body: {} })),
};

/* ---------------------------------- send ----------------------------------- */

export type Audience = 'doctor' | 'patient';
export type Channel = 'in_app' | 'push';
export type SendStatus = 'sent' | 'failed' | 'partial';
export type Recipient = { id: string; name: string; detail: string };

export type SentNotification = {
  id: string;
  sentAt: string;
  audience: Audience;
  type: 'manual' | 'automatic';
  templateCode?: string;
  title: string;
  body: string;
  deepLink: string | null;
  channels: Channel[];
  scope: 'all' | 'selected';
  recipientCount: number;
  delivered: number;
  failed: number;
  status: SendStatus;
};

/** What the backend takes in `recipientIds`. */
export const SELECTED_MAX = 1000;
export const TITLE_MAX = 80;
export const BODY_MAX = 300;

export function broadcastBody(input: {
  audience: Audience;
  recipientIds?: string[];
  title: string;
  body: string;
  channels: Channel[];
}): Record<string, unknown> {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || title.length > TITLE_MAX) throw new Error(`Title is required (max ${TITLE_MAX}).`);
  if (!body || body.length > BODY_MAX) throw new Error(`Message is required (max ${BODY_MAX}).`);
  if (input.channels.length === 0) throw new Error('Pick at least one channel.');
  const ids = input.recipientIds ?? [];
  if (ids.length > SELECTED_MAX) throw new Error(`Pick at most ${SELECTED_MAX} recipients, or send to everyone.`);
  const noun = input.audience === 'doctor' ? 'doctors' : 'patients';
  return {
    audience: ids.length === 0 ? `all_${noun}` : `selected_${noun}`,
    ...(ids.length > 0 ? { recipientIds: ids } : {}),
    title,
    body,
    channels: input.channels,
  };
}

/* --------------------------------- history --------------------------------- */

type LiveBroadcast = {
  id: string;
  title: string;
  body: string;
  audience: string;
  channels: string[];
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  queuedCount: number;
  createdAt: string;
};

/** Sent: none failed. Failed: every one that was tried failed. Anything between is partial. */
export function statusOf(b: Pick<LiveBroadcast, 'deliveredCount' | 'failedCount'>): SendStatus {
  if (b.failedCount === 0) return 'sent';
  return b.deliveredCount === 0 ? 'failed' : 'partial';
}

export const broadcastFrom = (b: LiveBroadcast): SentNotification => ({
  id: b.id,
  sentAt: b.createdAt,
  audience: b.audience.endsWith('doctors') ? 'doctor' : 'patient',
  type: 'manual',
  title: b.title,
  body: b.body,
  deepLink: null,
  channels: b.channels.filter((c): c is Channel => c === 'push' || c === 'in_app'),
  scope: b.audience.startsWith('all_') ? 'all' : 'selected',
  recipientCount: b.recipientCount,
  delivered: b.deliveredCount,
  failed: b.failedCount,
  status: statusOf(b),
});

export const liveManualNotifications = {
  send: async (input: Parameters<typeof broadcastBody>[0]) => {
    const body = broadcastBody(input);
    const r = await request<{ id: string; recipientCount: number; deliveredCount: number; failedCount: number; createdAt: string }>(
      '/admin/notifications/broadcasts',
      { method: 'POST', body },
    );
    return {
      id: r.id,
      sentAt: r.createdAt,
      audience: input.audience,
      type: 'manual' as const,
      title: input.title.trim(),
      body: input.body.trim(),
      deepLink: null,
      channels: input.channels,
      scope: input.recipientIds && input.recipientIds.length > 0 ? ('selected' as const) : ('all' as const),
      recipientCount: r.recipientCount,
      delivered: r.deliveredCount,
      failed: r.failedCount,
      status: statusOf(r),
    } satisfies SentNotification;
  },

  history: async (query: { audience?: Audience | ''; type?: 'manual' | 'automatic' | ''; status?: SendStatus | ''; since?: string } = {}) => {
    // Everything here is manual, so an "automatic" filter is an empty answer, not an error.
    if (query.type === 'automatic') return [];
    const { items } = await listAll<LiveBroadcast>('/admin/notifications/broadcasts');
    const since = query.since ? new Date(`${query.since}T00:00:00`).getTime() : 0;
    return items
      .map(broadcastFrom)
      .filter(
        (h) =>
          (!query.audience || h.audience === query.audience) &&
          (!query.status || h.status === query.status) &&
          new Date(h.sentAt).getTime() >= since,
      );
  },

  /**
   * Doctors are the verified providers (the only ones a broadcast reaches);
   * patients are everyone the panel lists. Names only, a mobile number or a
   * specialty beside each so two people with one name can be told apart.
   */
  recipients: async (audience: Audience, search = ''): Promise<Recipient[]> => {
    const q = search.trim().toLowerCase();
    let rows: Recipient[];
    if (audience === 'doctor') {
      const { items } = await listAll<{ id: string; fullName: string; specialtyName: string | null; verificationStatus: string }>(
        '/admin/doctors',
        { verificationStatus: 'verified' },
      );
      rows = items.map((d) => ({ id: d.id, name: d.fullName, detail: d.specialtyName ?? 'Provider' }));
    } else {
      const { items } = await listAll<{ id: string; fullName: string | null; mobileNumber?: string | null }>('/admin/patients');
      rows = items.map((p) => ({ id: p.id, name: p.fullName ?? 'Unnamed patient', detail: p.mobileNumber ?? '' }));
    }
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  },
};
