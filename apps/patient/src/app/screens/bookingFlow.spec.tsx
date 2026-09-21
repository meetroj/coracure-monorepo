import React, { useEffect, useRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { clearQueryCache, clearSession, configureApi, intakeApi, setSession } from '@coracure/api';
import { I18nProvider } from '@coracure/i18n';

import { CareFlowProvider, useCareFlow } from '../flow/CareFlowProvider';
import { clearAllDrafts } from '../../lib/drafts';
import { NavigatorProvider, useNavigator } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';

import CheckoutScreen from './CheckoutScreen';
import ChooseServiceScreen from './ChooseServiceScreen';
import ChooseTimeScreen from './ChooseTimeScreen';
import ConsultationDetailScreen from './ConsultationDetailScreen';
import InstantConsultScreen from './InstantConsultScreen';
import IntakeScreen from './IntakeScreen';
import PaymentSuccessScreen from './PaymentSuccessScreen';

/**
 * The booking half of the patient journey: time → intake → pay → assigned
 * professional, plus instant consult, reschedule and cancel.
 *
 * The rules pinned here come from USER_STORIES.md, not from this
 * implementation:
 *
 * - The professional is NOT visible before payment, and IS after (PT-11-01).
 * - Consult Now shows matching, never a person, and the status response it is
 *   built on carries no provider (PT-13-01).
 * - Rescheduling MOVES a booking; it must never create a second one (PT-11-05).
 * - The refund consequence is shown BEFORE a cancellation (PT-11-05).
 * - Intake is rendered from the form description and validated (PT-11-03).
 * - A lapsed hold is explained and offers a new time (PT-12-01).
 */

// Partial mock: the real module, with `fetchIntakeForm` swappable per test so a
// backend-authored form can be served while G-4 keeps the real one empty.
jest.mock('../../../../../libs/api/src/endpoints/intake', () => {
  const actual = jest.requireActual('../../../../../libs/api/src/endpoints/intake');
  return { ...actual, fetchIntakeForm: jest.fn(actual.fetchIntakeForm) };
});

/* -------------------------------- fixtures -------------------------------- */

const SERVICE = {
  id: 'svc-1',
  code: 'PSY',
  name: 'Psychologist / Therapy',
  description: 'Mental health support',
  consultationFeeInr: 799,
  providerType: 'doctor',
  canPrescribe: false,
};

const inDays = (d: number) => new Date(Date.now() + d * 24 * 60 * 60_000).toISOString();
const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

const consultation = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  referenceCode: 'CC-1001',
  status: 'scheduled',
  mode: 'scheduled',
  specialtyId: 'svc-1',
  concernId: null,
  doctorId: 'd1',
  scheduledStartAt: inDays(2),
  durationMinutes: 30,
  holdExpiresAt: null,
  consultationFeeInr: 799,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: new Date().toISOString(),
  ...over,
});

const PROVIDER = {
  id: 'd1',
  fullName: 'Asha Rao',
  qualification: 'MA Clinical Psychology',
  registrationNumber: null,
  yearsOfExperience: 8,
  languages: ['en', 'hi'],
  bio: null,
  specialtyId: 'svc-1',
  consultationFeeInr: 799,
  consultationDurationMinutes: 30,
  seniorityLevel: 'senior',
  presence: 'online',
  allowInstantConsult: true,
  canPrescribe: false,
};

const BILL = {
  consultationId: 'c1',
  lines: [
    { label: 'Consultation fee', amountInr: 799 },
    { label: 'Convenience fee', amountInr: 30 },
    { label: 'GST', amountInr: 149 },
  ],
  totalInr: 978,
};

const searchFor = () => ({
  disclaimer: 'This does not diagnose, screen or decide treatment.',
  crisis: false,
  results: [
    {
      ...SERVICE,
      concerns: [],
      reason: 'matched',
      soonestAvailableAt: inMinutes(60),
      matchedBy: 'mapping',
    },
  ],
});

/** The DayStrip's accessible label for tomorrow. */
const tomorrowLabel = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]} ${d.getDate()}`;
};

/* --------------------------------- harness -------------------------------- */

type Flow = ReturnType<typeof useCareFlow>;
type Start = { name: RouteName; params?: object; seed?: (flow: Flow) => void };

/**
 * Real navigator, real flow state. It boots on a blank route and navigates to
 * `start`, optionally seeding the flow first — the same way a patient arrives.
 */
const FlowHost = ({ start }: { start: Start }) => {
  const nav = useNavigator();
  const flow = useCareFlow();
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    start.seed?.(flow);
    (nav.navigate as unknown as (name: RouteName, params?: object) => void)(
      start.name,
      start.params,
    );
  }, [nav, flow, start]);

  switch (nav.route.name as RouteName) {
    case 'consultation':
      return <ConsultationDetailScreen />;
    case 'choose-time':
      return <ChooseTimeScreen />;
    case 'services':
      return <ChooseServiceScreen />;
    case 'intake':
      return <IntakeScreen />;
    case 'checkout':
      return <CheckoutScreen />;
    case 'paid':
      return <PaymentSuccessScreen />;
    case 'instant':
      return <InstantConsultScreen />;
    default:
      return null;
  }
};

const renderAt = (start: Start) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <I18nProvider locale="en">
        <NavigatorProvider initial="dashboard" isAuthenticated>
          <CareFlowProvider>
            <FlowHost start={start} />
          </CareFlowProvider>
        </NavigatorProvider>
      </I18nProvider>
    </SafeAreaProvider>,
  );

type Call = { url: string; method: string; body: Record<string, unknown> | undefined };
let calls: Call[] = [];

/** Serves the mocked backend by URL and records every request, method and body. */
const serve = (handler: (url: string, method: string) => { status?: number; body: unknown } | null) => {
  (global.fetch as jest.Mock).mockImplementation(
    (input: unknown, init?: { method?: string; body?: string }) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: init?.body ? JSON.parse(init.body) : undefined });
      // Unknown GETs get an empty list: it satisfies both list and object readers.
      const { status = 200, body } = handler(url, method) ?? { body: [] };
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => null },
        text: async () => JSON.stringify(body),
      });
    },
  );
};

const posted = (pattern: RegExp) => calls.filter((c) => c.method === 'POST' && pattern.test(c.url));
const askedForProvider = () => calls.some((c) => c.url.includes('/doctors/'));

beforeEach(async () => {
  configureApi({ baseUrl: 'http://api.test/api/v1' });
  (global.fetch as jest.Mock).mockReset();
  (intakeApi.fetchIntakeForm as unknown as jest.Mock).mockClear();
  calls = [];
  clearQueryCache();
  clearAllDrafts();
  await setSession({ accessToken: 'a', refreshToken: 'r', expiresIn: 900 });
});

afterEach(async () => {
  await clearSession('user');
});

/* ---------------------------------- tests --------------------------------- */

describe('reschedule (PT-11-05)', () => {
  it('moves the existing booking and never creates a second one', async () => {
    const moved = consultation({ id: 'c2', referenceCode: 'CC-2002' });
    serve((url) => {
      if (url.endsWith('/me/consultations/c1/reschedule')) return { body: moved };
      if (url.endsWith('/me/consultations/c1')) return { body: consultation() };
      if (url.endsWith('/me/consultations/c2')) return { body: moved };
      if (url.endsWith('/services')) return { body: [SERVICE] };
      if (url.endsWith('/search')) return { body: searchFor() };
      if (url.includes('/doctors/')) return { body: PROVIDER };
      if (url.endsWith('/me/profile')) return { body: { preferredLanguage: 'en' } };
      return null;
    });

    renderAt({ name: 'consultation', params: { consultationId: 'c1' } });
    await waitFor(() => expect(screen.getByTestId('consultation')).toBeTruthy());

    fireEvent.press(screen.getByTestId('open-reschedule'));
    // The picker needs the service in hand, so the action waits for it.
    await waitFor(() =>
      expect(screen.getByTestId('confirm-reschedule').props.accessibilityState?.disabled).toBe(false),
    );
    fireEvent.press(screen.getByTestId('confirm-reschedule'));

    await waitFor(() => expect(screen.getByTestId('choose-time')).toBeTruthy());
    expect(screen.getByText('Moving your consultation')).toBeTruthy();
    // Consult Now is a NEW request and has no place in moving an old one.
    expect(screen.queryByTestId('consult-now')).toBeNull();

    fireEvent.press(screen.getByLabelText(tomorrowLabel()));
    await waitFor(() => expect(screen.getAllByHintText(/confirmed when you book/i).length).toBeGreaterThan(0));
    fireEvent.press(screen.getAllByHintText(/confirmed when you book/i)[0]!);
    fireEvent.press(screen.getByTestId('confirm-time'));

    await waitFor(() => expect(posted(/\/me\/consultations\/c1\/reschedule$/)).toHaveLength(1));
    // Only the new time is sent — nothing else to trip `forbidNonWhitelisted`.
    expect(Object.keys(posted(/\/reschedule$/)[0]!.body ?? {})).toEqual(['startsAt']);
    // And no booking was created alongside it.
    expect(posted(/\/me\/consultations$/)).toHaveLength(0);

    // Lands on the NEW consultation the backend returned.
    await waitFor(() =>
      expect(calls.some((c) => c.method === 'GET' && c.url.endsWith('/me/consultations/c2'))).toBe(true),
    );
  });
});

describe('cancel (PT-11-05)', () => {
  it('shows the published refund policy before anything is cancelled', async () => {
    serve((url) => {
      if (url.endsWith('/legal/documents/refund_policy')) {
        return {
          body: {
            documentType: 'refund_policy',
            version: '1',
            title: 'Refund policy',
            body: 'Cancel 24 hours before for a full refund.',
          },
        };
      }
      if (url.endsWith('/me/consultations/c1')) return { body: consultation() };
      if (url.endsWith('/services')) return { body: [SERVICE] };
      if (url.includes('/doctors/')) return { body: PROVIDER };
      return null;
    });

    renderAt({ name: 'consultation', params: { consultationId: 'c1' } });
    await waitFor(() => expect(screen.getByTestId('consultation')).toBeTruthy());

    fireEvent.press(screen.getByTestId('open-cancel'));

    await waitFor(() => expect(screen.getByText('Cancel 24 hours before for a full refund.')).toBeTruthy());
    expect(screen.getByText('Before you confirm')).toBeTruthy();
    // Nothing has happened yet — the consequence comes first.
    expect(posted(/\/cancel$/)).toHaveLength(0);
  });
});

describe('Consult Now (PT-13-01)', () => {
  const instant = consultation({
    id: 'c9',
    mode: 'instant',
    status: 'awaiting_doctor',
    doctorId: null,
    scheduledStartAt: null,
  });

  it('shows matching, never a person, and proves re-routing is happening', async () => {
    serve((url) => {
      if (url.endsWith('/me/consultations/c9/instant-status')) {
        return { body: { attempts: 2, stillSearching: true, accepted: false } };
      }
      if (url.endsWith('/me/consultations/c9')) return { body: instant };
      if (url.endsWith('/services')) return { body: [SERVICE] };
      if (url.endsWith('/me/profile')) return { body: { preferredLanguage: 'hi' } };
      return null;
    });

    renderAt({ name: 'instant', params: { consultationId: 'c9' } });

    await waitFor(() => expect(screen.getByText(/Finding an available professional/)).toBeTruthy());
    await waitFor(() => expect(screen.getByText("We've asked 2 professionals so far.")).toBeTruthy());
    expect(screen.getByText('Psychologist / Therapy')).toBeTruthy();
    // Language is stated as a fact, in the patient's own language setting.
    expect(screen.getByText(/speaks हिन्दी/)).toBeTruthy();

    // No provider identity is requested or shown while matching.
    expect(askedForProvider()).toBe(false);
    expect(screen.queryByText(/^Dr\.?\s/i)).toBeNull();
  });

  it('moves on to the consultation once someone accepts', async () => {
    serve((url) => {
      if (url.endsWith('/me/consultations/c9/instant-status')) {
        return { body: { attempts: 1, stillSearching: false, accepted: true } };
      }
      if (url.endsWith('/me/consultations/c9')) return { body: instant };
      if (url.endsWith('/services')) return { body: [SERVICE] };
      return null;
    });

    renderAt({ name: 'instant', params: { consultationId: 'c9' } });
    await waitFor(() => expect(screen.getByTestId('consultation')).toBeTruthy());
  });
});

describe('payment success (PT-11-01, PT-12-02)', () => {
  it('introduces the ASSIGNED professional and the full bill once paid', async () => {
    serve((url) => {
      if (url.endsWith('/me/consultations/c1/bill')) return { body: BILL };
      if (url.endsWith('/me/consultations/c1')) return { body: consultation() };
      if (url.endsWith('/services')) return { body: [SERVICE] };
      if (url.includes('/doctors/')) return { body: PROVIDER };
      return null;
    });

    renderAt({ name: 'paid', params: { consultationId: 'c1' } });

    await waitFor(() => expect(screen.getByText('Asha Rao')).toBeTruthy());
    expect(screen.getAllByText('Payment successful').length).toBeGreaterThan(0);
    // Assigned, not chosen.
    expect(screen.getByText('Your assigned professional')).toBeTruthy();
    // Every line of the frozen bill.
    expect(screen.getByText('Convenience fee')).toBeTruthy();
    expect(screen.getByText('GST')).toBeTruthy();
  });

  it('never claims success while the backend still has the row holding', async () => {
    serve((url) => {
      if (url.endsWith('/me/consultations/c1/bill')) return { body: BILL };
      if (url.endsWith('/me/consultations/c1')) {
        return { body: consultation({ status: 'pending_payment', holdExpiresAt: inMinutes(8) }) };
      }
      if (url.endsWith('/services')) return { body: [SERVICE] };
      if (url.includes('/doctors/')) return { body: PROVIDER };
      return null;
    });

    renderAt({ name: 'paid', params: { consultationId: 'c1' } });

    await waitFor(() => expect(screen.getAllByText('Confirming your payment').length).toBeGreaterThan(0));
    expect(screen.queryAllByText('Payment successful')).toHaveLength(0);
    // And the professional stays hidden until it really is paid.
    expect(askedForProvider()).toBe(false);
    expect(screen.queryByText('Asha Rao')).toBeNull();
  });
});

describe('the professional before payment (PT-11-01)', () => {
  it('does not name the professional on a held booking, even though one is assigned', async () => {
    // The backend assigns at booking, so the hold already carries a doctorId.
    const held = consultation({
      status: 'pending_payment',
      holdExpiresAt: inMinutes(8),
      doctorId: 'd1',
    });
    serve((url) => {
      if (url.endsWith('/me/consultations/c1/bill')) return { body: BILL };
      if (url.endsWith('/me/consultations/c1')) return { body: held };
      if (url.endsWith('/services')) return { body: [SERVICE] };
      if (url.includes('/doctors/')) return { body: PROVIDER };
      return null;
    });

    renderAt({ name: 'consultation', params: { consultationId: 'c1' } });
    await waitFor(() => expect(screen.getByTestId('consultation')).toBeTruthy());
    // The same effect pass a provider fetch would have run in.
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/services'))).toBe(true));

    // Not fetched, not shown, and nothing to decline yet.
    expect(askedForProvider()).toBe(false);
    expect(screen.queryByText('Asha Rao')).toBeNull();
    expect(screen.queryByTestId('open-decline')).toBeNull();
  });
});

describe('intake (PT-11-03) → checkout (PT-12-01)', () => {
  const seed = (flow: Flow) => {
    flow.setService(SERVICE);
    flow.setStartsAt(inDays(1));
  };

  it('renders the backend form, validates it, and books with exactly those answers', async () => {
    (intakeApi.fetchIntakeForm as unknown as jest.Mock).mockResolvedValueOnce({
      specialtyId: 'svc-1',
      formAvailable: true,
      previousAnswers: null,
      questions: [
        {
          id: 'sleep',
          type: 'single',
          label: 'How have you been sleeping?',
          required: true,
          options: [
            { value: 'well', label: 'Well' },
            { value: 'poorly', label: 'Poorly' },
          ],
        },
        { id: 'hours', type: 'number', label: 'Hours of sleep a night', required: false },
      ],
    });

    // A pending row DOES carry `doctorId` — the backend assigns at booking. The
    // point is that checkout must still not show who it is.
    const held = consultation({
      id: 'c5',
      status: 'pending_payment',
      holdExpiresAt: inMinutes(10),
      doctorId: 'd1',
    });
    serve((url, method) => {
      if (method === 'POST' && url.endsWith('/me/consultations')) return { body: held };
      if (url.endsWith('/me/consultations/c5/bill')) return { body: { ...BILL, consultationId: 'c5' } };
      if (url.endsWith('/me/consultations/c5')) return { body: held };
      if (url.includes('/doctors/')) return { body: PROVIDER };
      return null;
    });

    renderAt({ name: 'intake', seed });

    // Backend labels, rendered verbatim.
    await waitFor(() => expect(screen.getByText(/How have you been sleeping\?/)).toBeTruthy());

    // A required question blocks continuing, and nothing is booked.
    fireEvent.press(screen.getByTestId('intake-continue'));
    await waitFor(() => expect(screen.getByText('Please answer this question.')).toBeTruthy());
    expect(posted(/\/me\/consultations$/)).toHaveLength(0);

    // A non-number in a number question is caught too.
    fireEvent.press(screen.getByLabelText('Poorly'));
    fireEvent.changeText(screen.getByLabelText('Hours of sleep a night'), 'about six');
    fireEvent.press(screen.getByTestId('intake-continue'));
    await waitFor(() => expect(screen.getByText('Enter a number.')).toBeTruthy());
    expect(posted(/\/me\/consultations$/)).toHaveLength(0);

    fireEvent.changeText(screen.getByLabelText('Hours of sleep a night'), '6');
    fireEvent.press(screen.getByTestId('intake-continue'));

    await waitFor(() => expect(posted(/\/me\/consultations$/)).toHaveLength(1));
    const body = posted(/\/me\/consultations$/)[0]!.body!;
    // Built field by field — exactly what the DTO declares, nothing spread in.
    expect(Object.keys(body).sort()).toEqual(['intakeAnswers', 'specialtyId', 'startsAt']);
    expect(body['intakeAnswers']).toEqual({ sleep: 'poorly', hours: '6' });

    // Held, so on to checkout: the countdown is visible…
    await waitFor(() => expect(screen.getByTestId('checkout')).toBeTruthy());
    expect(screen.getAllByText(/Time held:/).length).toBeGreaterThan(0);
    // …and the assigned professional is NOT, because nothing is paid yet.
    expect(askedForProvider()).toBe(false);
    expect(screen.queryByText('Asha Rao')).toBeNull();
  });

  it('while G-4 is open, says the specialty questions are not available yet', async () => {
    serve(() => null);
    renderAt({ name: 'intake', seed });

    await waitFor(() =>
      expect(screen.getByText('What would you like your professional to know?')).toBeTruthy(),
    );
    expect(screen.getByText(/Your service may have its own questions/)).toBeTruthy();
  });
});

describe('the slot hold (PT-12-01)', () => {
  it('explains a lapsed hold and offers a new time instead of a dead Pay button', async () => {
    const lapsed = consultation({
      id: 'c6',
      status: 'pending_payment',
      holdExpiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    serve((url) => {
      if (url.endsWith('/me/consultations/c6/bill')) return { body: { ...BILL, consultationId: 'c6' } };
      if (url.endsWith('/me/consultations/c6')) return { body: lapsed };
      return null;
    });

    renderAt({ name: 'checkout', params: { consultationId: 'c6' } });

    await waitFor(() => expect(screen.getByTestId('checkout-expired')).toBeTruthy());
    expect(screen.getByText('Your slot was released')).toBeTruthy();
    expect(screen.getByTestId('choose-new-time')).toBeTruthy();
    expect(screen.queryByTestId('pay-now')).toBeNull();
  });
});
