import React from 'react';
import { doctorConsultationsApi, doctorPresenceApi } from '@coracure/api';
import type { InstantOffer } from '@coracure/api';
import { ApiError } from '@coracure/api/errors';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react-native';

import { AppointmentDetailsRoute, InstantAcceptedRoute, InstantDeclinedRoute, InstantRequestRoute } from './routes';
import { getState, setState } from '../../state/store';
import { setInstant } from '../../state/actions';
import { appointments, instantRequest } from '../../data/doctor';

const nav = () => ({ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn(), popToTop: jest.fn(), dispatch: jest.fn() });
type AnyRoute = React.ComponentType<{ route: object; navigation: object }>;
const mount = (Route: unknown, params: object | undefined, n = nav()) => {
  const R = Route as AnyRoute;
  render(<R route={{ key: 'k', name: 'x', params }} navigation={n} />);
  return n;
};

const offer = (): InstantOffer =>
  ({
    id: 'o-2',
    consultationId: '22222222-2222-4222-8222-222222222222',
    patientId: 'p-2',
    patientInitials: 'RK',
    patientAge: 40,
    patientGender: 'male',
    specialtyName: 'Psychiatry',
    concernName: 'Low mood',
    preferredLanguage: 'en',
    outcome: 'pending',
    offeredAt: new Date(Date.now() - 5000).toISOString(),
    expiresAt: new Date(Date.now() + 55000).toISOString(),
  }) as InstantOffer;

test('a second request in the same session opens, whatever happened to the first', async () => {
  // the first request was declined earlier this session
  setInstant('declined');
  jest.spyOn(doctorPresenceApi, 'openOffers').mockResolvedValue([offer()]);
  jest.spyOn(doctorPresenceApi, 'acceptOffer').mockResolvedValue(offer());

  const n = mount(InstantRequestRoute, undefined);
  expect(await screen.findByText('Low mood')).toBeTruthy();
  expect(getState().instant).toBe('pending');

  await act(async () => fireEvent.press(screen.getByTestId('accept')));
  // the accepted consultation's real id goes on, so the next screen can load it
  expect(n.replace).toHaveBeenCalledWith(
    'InstantAccepted',
    expect.objectContaining({ consultationId: offer().consultationId, request: expect.objectContaining({ concern: 'Low mood' }) })
  );
});

test('once payment and consent have cleared, the accepted screen opens the room for that consultation', async () => {
  const id = '55555555-5555-4555-8555-555555555555';
  jest.spyOn(doctorConsultationsApi, 'getConsultation').mockResolvedValue({
    id,
    referenceCode: 'CON-90001',
    patientId: 'p-9',
    status: 'scheduled',
    channel: 'video',
    scheduledStartAt: null,
    createdAt: new Date().toISOString(),
    concernId: null,
    paymentStatus: 'paid',
    patient: { id: 'p-9', fullName: 'Meera Joshi', initials: 'MJ', age: 29, gender: 'female', preferredLanguage: 'en' },
    doctorContext: { riskCategory: null, totalPastConsultationsWithDoctor: 0, hasCurrentTeleconsultationConsent: true },
  } as never);

  const n = mount(InstantAcceptedRoute, { consultationId: id, request: instantRequest });
  await waitFor(() => expect(screen.getByTestId('join')).toBeEnabled());
  fireEvent.press(screen.getByTestId('join'));
  // the room looks its appointment up in the store, so the consultation has to be there before it opens
  expect(getState().appointments.find((a) => a.id === id)?.name).toBe('Meera Joshi');
  expect(n.dispatch).toHaveBeenCalledWith(
    expect.objectContaining({ payload: expect.objectContaining({ name: 'ConsultationRoom', params: { appointmentId: id } }) })
  );
});

test('with nothing actionable on the server, the request screen says so', async () => {
  jest.spyOn(doctorPresenceApi, 'openOffers').mockResolvedValue([]);
  mount(InstantRequestRoute, undefined);
  expect(await screen.findByText('Could not open this request')).toBeTruthy();
});

test('pausing instant requests saves Scheduled Only on the server before the status changes', async () => {
  jest.spyOn(doctorPresenceApi, 'setPresence').mockResolvedValue({
    doctorId: 'd-1',
    presence: 'scheduled_only',
    canReceiveInstant: false,
    blockedByConsultationId: null,
    allowInstantConsult: true,
  });
  const n = mount(InstantDeclinedRoute, { rerouted: true });
  await act(async () => fireEvent.press(screen.getByTestId('pause')));
  expect(doctorPresenceApi.setPresence).toHaveBeenCalledWith('scheduled_only');
  expect(getState().liveStatus).toBe('scheduledOnly');
  expect(n.popToTop).toHaveBeenCalled();
});

test('a refused pause leaves the status alone and keeps the doctor on the screen', async () => {
  jest.spyOn(doctorPresenceApi, 'setPresence').mockRejectedValue(new ApiError({ statusCode: 400, code: 'DOCUMENTATION_OUTSTANDING', message: 'Finish the write-up first.' } as never));
  const n = mount(InstantDeclinedRoute, { rerouted: true });
  await act(async () => fireEvent.press(screen.getByTestId('pause')));
  expect(getState().liveStatus).toBe('available');
  expect(n.popToTop).not.toHaveBeenCalled();
  expect(screen.getByText('Pause instant requests')).toBeTruthy();
});

test('a real consultation’s "message patient" opens the thread the server addresses by the patient', () => {
  const real = { ...appointments[0], id: '33333333-3333-4333-8333-333333333333', patientId: '44444444-4444-4444-8444-444444444444' };
  setState((s) => ({ ...s, appointments: [...s.appointments, real] }));
  const n = mount(AppointmentDetailsRoute, { appointmentId: real.id });
  fireEvent.press(screen.getByTestId('message-patient'));
  expect(n.dispatch).toHaveBeenCalledWith(
    expect.objectContaining({ payload: expect.objectContaining({ name: 'ChatThread', params: { threadId: real.patientId } }) })
  );
});

test('a demo appointment keeps its message button', () => {
  mount(AppointmentDetailsRoute, { appointmentId: 'a2' });
  expect(screen.getByTestId('message-patient')).toBeTruthy();
});
