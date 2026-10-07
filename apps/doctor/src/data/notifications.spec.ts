import type { DoctorNotificationRecord } from '@coracure/api';

import { toAppNotification } from './notifications';

const n = (deepLinkData: unknown, consultationId: string | null = null) =>
  ({
    id: 'n1',
    templateCode: 'x',
    title: 't',
    body: 'b',
    consultationId,
    deepLinkData,
    readAt: null,
    createdAt: new Date().toISOString(),
  }) as unknown as DoctorNotificationRecord;

const target = (d: unknown, c?: string) => toAppNotification(n(d, c ?? null)).target;

test('each backend screen routes to its own target', () => {
  expect(target({ screen: 'safety_alert', alertId: 'al1' }, 'c1')).toEqual({ route: 'alertDetail', alertId: 'al1' });
  expect(target({ screen: 'instantRequest', consultationId: 'c1' }, 'c1')).toEqual({ route: 'instantRequest' });
  expect(target({ screen: 'consultation', consultationId: 'c1' }, 'c1')).toEqual({ route: 'apptDetails', appointmentId: 'c1' });
});

test('a clarification row with a consultation is mine to read; without one I am the expert', () => {
  expect(target({ screen: 'clarificationCase', caseId: 'k1' }, 'c1')).toEqual({ route: 'clarification', clarificationId: 'k1' });
  expect(target({ screen: 'clarificationCase', caseId: 'k1' })).toEqual({ route: 'expertReview', caseId: 'k1' });
});

test('an unknown or malformed link never guesses a route', () => {
  expect(target({ screen: 'somethingNew' }, 'c1')).toEqual({ route: 'apptDetails', appointmentId: 'c1' });
  expect(target(null)).toEqual({ route: 'none' });
  expect(target({ screen: 'safety_alert' })).toEqual({ route: 'none' });
  expect(target('garbage')).toEqual({ route: 'none' });
});
