import * as db from '../mock/db';
import * as store from '../mock/manualNotifications';
import type {
  Audience,
  Channel,
  Recipient,
  SendStatus,
  SentNotification,
} from '../mock/manualNotifications';

export type { Audience, Channel, Recipient, SendStatus, SentNotification };
export { deepLinks } from '../mock/manualNotifications';

/**
 * Manually sent notifications — UI-only, served from `mock/manualNotifications`.
 * Same async + `db.delay` + copy style as `api/admin.ts`.
 */

const ok = <T>(value: T) => db.delay(value);
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const invalid = (message: string) =>
  Promise.reject(
    Object.assign(new Error(message), {
      name: 'ApiError',
      code: 'VALIDATION_FAILED',
      statusCode: 400,
      requestId: null,
      details: null,
      path: null,
    }),
  );

export const TITLE_MAX = 80;
export const BODY_MAX = 300;

export type SendInput = {
  audience: Audience;
  /** Empty or omitted = everyone in the audience. */
  recipientIds?: string[];
  title: string;
  body: string;
  deepLink?: string | null;
  channels: Channel[];
};

export type HistoryQuery = {
  audience?: Audience | '';
  type?: 'manual' | 'automatic' | '';
  status?: SendStatus | '';
  /** yyyy-mm-dd, inclusive lower bound. */
  since?: string;
};

export const manualNotifications = {
  send: (input: SendInput) => {
    const title = input.title.trim();
    const body = input.body.trim();
    if (!title || title.length > TITLE_MAX) return invalid('Title is required (max 80).');
    if (!body || body.length > BODY_MAX) return invalid('Message is required (max 300).');
    if (input.channels.length === 0) return invalid('Pick at least one channel.');

    const ids = input.recipientIds ?? [];
    const all = ids.length === 0;
    const count = all ? store.recipientsFor(input.audience).length : ids.length;
    const entry: SentNotification = {
      id: `nh-${Date.now()}-${store.history.length}`,
      sentAt: new Date().toISOString(),
      audience: input.audience,
      type: 'manual',
      title,
      body,
      deepLink: input.deepLink || null,
      channels: [...input.channels],
      scope: all ? 'all' : 'selected',
      recipientCount: count,
      delivered: count,
      failed: 0,
      status: 'sent',
    };
    store.history.unshift(entry);
    return ok(copy(entry));
  },

  history: (query: HistoryQuery = {}) => {
    const since = query.since ? new Date(`${query.since}T00:00:00`).getTime() : 0;
    const rows = store.history.filter(
      (h) =>
        (!query.audience || h.audience === query.audience) &&
        (!query.type || h.type === query.type) &&
        (!query.status || h.status === query.status) &&
        new Date(h.sentAt).getTime() >= since,
    );
    return ok(copy(rows));
  },

  recipients: (audience: Audience, search = '') => {
    const q = search.trim().toLowerCase();
    const rows = store.recipientsFor(audience).filter((r) => !q || r.name.toLowerCase().includes(q));
    return ok(copy(rows));
  },
};
