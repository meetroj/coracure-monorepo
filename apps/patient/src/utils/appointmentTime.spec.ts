import { appointmentTime, upcomingDates } from './appointmentTime';
import { apiClient, configureDemoMode, mockConsultationsStore } from '@coracure/api';

afterEach(() => configureDemoMode(false));

test('preserves minutes and AM/PM in local appointment selections', () => {
  for (const [label, hour, minute] of [['11:45 AM', 11, 45], ['04:30 PM', 16, 30], ['12:00 PM', 12, 0], ['12:15 AM', 0, 15]] as const) {
    const date = new Date(appointmentTime('2026-10-01', label));
    expect(date.getHours()).toBe(hour);
    expect(date.getMinutes()).toBe(minute);
    expect(date.getDate()).toBe(1);
  }
  expect(upcomingDates(3)).toHaveLength(3);
  expect(new Date(upcomingDates(1)[0].isoDate + 'T23:59:00').getTime()).toBeGreaterThan(Date.now());
});

test('demo rescheduling updates the selected booking without creating another or calling the backend', async () => {
  configureDemoMode(true);
  const booking = await apiClient.post<any>('/me/consultations/scheduled', { startsAt: appointmentTime('2026-10-01', '11:45 AM') });
  const count = mockConsultationsStore.length;
  const startsAt = appointmentTime('2026-10-02', '04:30 PM');
  await apiClient.post(`/me/consultations/${booking.id}/reschedule`, { startsAt });
  expect(mockConsultationsStore).toHaveLength(count);
  expect((await apiClient.get<any>(`/me/consultations/${booking.id}`)).scheduledStartAt).toBe(startsAt);
  await apiClient.post(`/me/consultations/${booking.id}/cancel`);
  expect((await apiClient.get<any>('/me/consultations/cons-001')).status).toBe('scheduled');
  expect((await apiClient.get<any[]>('/me/consultations', { upcoming: true })).some(item => item.id === booking.id)).toBe(false);
  expect(global.fetch).not.toHaveBeenCalled();
});
