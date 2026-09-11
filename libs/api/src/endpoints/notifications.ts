import { apiClient } from '../client';
import type { NotificationRecord } from '../types';

export const getNotifications = (params?: Record<string, string | number | boolean>): Promise<NotificationRecord[]> => {
  return apiClient.get('/me/notifications', params);
};

export const getUnreadCount = (): Promise<{ count: number }> => {
  return apiClient.get('/me/notifications/unread-count');
};

export const markRead = (id: string): Promise<void> => {
  return apiClient.post(`/me/notifications/${id}/read`);
};

export const markAllRead = (): Promise<{ marked: number }> => {
  return apiClient.post('/me/notifications/read-all');
};

export const listNotifications = getNotifications;
export const markNotificationRead = markRead;
export const markAllNotificationsRead = markAllRead;
