import { api } from '../http';

/**
 * The notification inbox (API_CONTRACT §6.15 / §7.10) — shared unchanged across
 * patient, doctor and admin.
 *
 * *** NOT `notificationsApi` FROM `./notifications.ts`. *** That one runs on
 * the legacy `apiClient` (`client.ts`), which throws a plain object instead of
 * `ApiError` (so `messageFor`/`error.code` never see it) and — worse —
 * silently substitutes mock data on a 404 or 5xx instead of surfacing the
 * failure. Every other doctor endpoint goes through `api` from `../http`;
 * this one does too, for the same reason: a notification fetch has to fail
 * honestly, not quietly lie.
 */

export type NotificationRecord = {
  id: string;
  templateCode: string;
  title: string;
  body: string;
  /** Server-defined, per `templateCode`. Never render a diagnosis into the UI from this. */
  deepLinkData: unknown;
  consultationId: string | null;
  status: string;
  createdAt: string;
  readAt: string | null;
};

export const listNotifications = (
  query: { unreadOnly?: boolean; limit?: number; before?: string } = {},
): Promise<NotificationRecord[]> => api.get<NotificationRecord[]>('/me/notifications', { query });

// The unread count itself is already wired: `doctorConsultationsApi.unreadNotifications()`
// (`doctorConsultations.ts`) hits the same `/me/notifications/unread-count` route and
// already feeds the dashboard badge via `fetchDoctorDay`. Not duplicated here.

export const markNotificationRead = (notificationId: string): Promise<void> =>
  api.post<void>(`/me/notifications/${notificationId}/read`);

export const markAllNotificationsRead = (): Promise<{ marked: number }> =>
  api.post<{ marked: number }>('/me/notifications/read-all');
