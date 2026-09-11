import { api } from '../http';
import type { Notification, UnreadCount } from '../types';

/**
 * The in-app inbox (FR-16.1).
 *
 * The row IS the notification; a push is an attempt to put the same copy on a
 * lock screen. So the inbox is complete even for a patient who never allowed
 * notifications.
 */

export const listNotifications = (query: {
  unreadOnly?: boolean;
  limit?: number;
  before?: string;
} = {}): Promise<Notification[]> =>
  api.get<Notification[]>('/me/notifications', {
    query: {
      unreadOnly: query.unreadOnly,
      limit: query.limit,
      before: query.before,
    },
  });

export const getUnreadCount = (): Promise<UnreadCount> =>
  api.get<UnreadCount>('/me/notifications/unread-count');

/** Reading is a timestamp, not a status. Marking an already-read one is fine. */
export const markNotificationRead = (notificationId: string): Promise<void> =>
  api.post<void>(`/me/notifications/${notificationId}/read`);

export const markAllNotificationsRead = (): Promise<{ marked: number }> =>
  api.post<{ marked: number }>('/me/notifications/read-all');
