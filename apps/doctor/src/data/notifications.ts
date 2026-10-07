import { doctorConsultationsApi, doctorNotificationsApi } from '@coracure/api';
import type { DoctorNotificationRecord } from '@coracure/api';

import { useEffect } from 'react';

import { setUnreadCount } from '../state/actions';
import { getState } from '../state/store';
import type { AppNotification } from './messaging';
import { seedResource, useResource } from './useResource';

/**
 * The real notification inbox, against the screen's existing `AppNotification`
 * shape.
 *
 * `deepLinkData` is typed `unknown` by the contract, so it is read
 * defensively: `screen` picks the target, and a shape this app does not
 * recognise falls back to the consultation (if any) or just marks itself
 * read — never a guessed route. The shapes the backend sends a doctor:
 *
 *   consultation      { consultationId }   → the appointment
 *   safety_alert      { alertId }          → the alert
 *   instantRequest    { consultationId }   → the instant offer
 *   chat              { patientId }        → that patient's conversation
 *   clarificationCase { caseId }           → my thread if the row carries a
 *     `consultationId` (only the treating doctor's does); otherwise I am the
 *     expert, who is deliberately never handed the link back to the patient.
 */

type DeepLink = { screen?: unknown; alertId?: unknown; caseId?: unknown; patientId?: unknown };

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

export const toAppNotification = (n: DoctorNotificationRecord): AppNotification => {
  const link = (n.deepLinkData && typeof n.deepLinkData === 'object' ? n.deepLinkData : {}) as DeepLink;
  const base = {
    id: n.id,
    title: n.title,
    body: n.body,
    minutesAgo: Math.max(0, Math.round((Date.now() - new Date(n.createdAt).getTime()) / 60000)),
    read: !!n.readAt,
  };
  const alertId = str(link.alertId);
  const caseId = str(link.caseId);
  const patientId = str(link.patientId);

  if (link.screen === 'chat' && patientId) return { ...base, kind: 'message', target: { route: 'chat', patientId } };
  if (link.screen === 'safety_alert' && alertId) return { ...base, kind: 'followUpAlert', target: { route: 'alertDetail', alertId } };
  if (link.screen === 'instantRequest') return { ...base, kind: 'instantRequest', target: { route: 'instantRequest' } };
  if (link.screen === 'clarificationCase' && caseId) {
    return {
      ...base,
      kind: 'expertResponse',
      target: n.consultationId ? { route: 'clarification', clarificationId: caseId } : { route: 'expertReview', caseId },
    };
  }
  return n.consultationId
    ? { ...base, kind: 'appointment', target: { route: 'apptDetails', appointmentId: n.consultationId } }
    : { ...base, kind: 'generic', target: { route: 'none' } };
};

export const KEYS = { list: 'doctor:notifications' };

export const fetchNotifications = async (): Promise<AppNotification[]> => {
  const records = await doctorNotificationsApi.listNotifications({ limit: 50 });
  return records.map(toAppNotification);
};

export const useDoctorNotifications = () => useResource(KEYS.list, fetchNotifications);

/**
 * The bell's badge, loaded wherever the tabs are — not only once the dashboard
 * has fetched the day — so it is right whichever tab the doctor lands on.
 */
export const useUnreadNotificationCount = () => {
  const { data } = useResource('doctor:notifications:unread', () => doctorConsultationsApi.unreadNotifications());
  useEffect(() => {
    if (data) setUnreadCount(data.unread);
  }, [data]);
};

/**
 * Opening a row: marks it read on the server, and on this device at once — the
 * row loses its dot and the badge drops by one. A failed receipt is not worth
 * blocking the doctor over; the server's own count wins on the next load.
 */
export const markOneRead = (list: AppNotification[], n: AppNotification) => {
  if (n.read) return;
  seedResource(KEYS.list, list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
  setUnreadCount(getState().unreadCount - 1);
  markNotificationReadApi(n.id).catch(() => undefined);
};

export const markNotificationReadApi = (id: string): Promise<void> => doctorNotificationsApi.markNotificationRead(id);
export const markAllNotificationsReadApi = (): Promise<{ marked: number }> => doctorNotificationsApi.markAllNotificationsRead();
