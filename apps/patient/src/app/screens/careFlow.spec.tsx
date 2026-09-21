import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { clearQueryCache, clearSession, configureApi, setSession } from '@coracure/api';
import { I18nProvider } from '@coracure/i18n';

import { CareFlowProvider } from '../flow/CareFlowProvider';
import { clearAllDrafts } from '../../lib/drafts';
import { clearRecentSearches } from '../../lib/recentSearches';
import { NavigatorProvider, useNavigator } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';

import AssistantScreen from './AssistantScreen';
import ChooseServiceScreen from './ChooseServiceScreen';
import ChooseTimeScreen from './ChooseTimeScreen';
import EmergencyScreen from './EmergencyScreen';
import FindCareScreen from './FindCareScreen';

/**
 * The critical patient flow: describe → recommend → service → time.
 *
 * Four things here must never regress, and each is a product rule rather than a
 * detail of this implementation:
 *
 * 1. **A crisis response interrupts everything.** It replaces results, it is a
 *    full screen, and it needs an explicit dismissal (PT-09-02).
 * 2. **The disclaimer is rendered verbatim from the server**, on every search,
 *    because a client cannot be trusted to remember it (PT-09-01, FR-5.8).
 * 3. **Choosing a recommendation goes to a TIME, never to a person** (PT-07-01).
 * 4. **No screen in the flow can produce a provider directory.**
 */

const DISCLAIMER =
  'This helps you find the right service. It does not diagnose, screen or decide treatment.';

const SERVICE = {
  id: 'svc-1',
  code: 'PSY',
  name: 'Psychologist / Therapy',
  description: 'Mental health support',
  consultationFeeInr: 799,
  providerType: 'doctor',
  canPrescribe: false,
};

/**
 * Relative to now, deliberately.
 *
 * `soonestAvailableAt` is the FLOOR the slot builder works from — nothing
 * earlier than it is ever offered — so a fixed date in the fixture would make
 * "today has slots" true or false depending on when the suite runs.
 */
const soonest = () => new Date(Date.now() + 60 * 60_000).toISOString();

const MATCH = {
  ...SERVICE,
  concerns: [{ id: 'c1', code: 'SLEEP', name: 'Sleep' }],
  reason: 'matched to: sleep, anxiety',
  soonestAvailableAt: soonest(),
  matchedBy: 'mapping' as const,
};

/** Renders whichever flow screen the navigator is on — real routing, real state. */
const FlowHost = () => {
  const { route } = useNavigator();
  switch (route.name as RouteName) {
    case 'assistant':
      return <AssistantScreen />;
    case 'find-care':
      return <FindCareScreen />;
    case 'services':
      return <ChooseServiceScreen />;
    case 'choose-time':
      return <ChooseTimeScreen />;
    case 'emergency':
      return <EmergencyScreen />;
    default:
      return null;
  }
};

const renderFlow = (initial: RouteName = 'assistant') =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <I18nProvider locale="en">
        <NavigatorProvider initial={initial} isAuthenticated>
          <CareFlowProvider>
            <FlowHost />
          </CareFlowProvider>
        </NavigatorProvider>
      </I18nProvider>
    </SafeAreaProvider>,
  );

/** Routes a mocked fetch by URL, so one test can serve several endpoints. */
const routeFetch = (handler: (url: string) => { status?: number; body: unknown }) => {
  (global.fetch as jest.Mock).mockImplementation((url: unknown) => {
    const { status = 200, body } = handler(String(url));
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: () => null },
      text: async () => JSON.stringify(body),
    });
  });
};

const okSearch = { disclaimer: DISCLAIMER, crisis: false, results: [MATCH] };

beforeEach(async () => {
  configureApi({ baseUrl: 'http://api.test/api/v1' });
  (global.fetch as jest.Mock).mockReset();
  // All three stores are module-level and survive a render, which is the point
  // of them — so a test has to reset them the way sign-out does.
  clearQueryCache();
  clearAllDrafts();
  clearRecentSearches();
  await setSession({ accessToken: 'a', refreshToken: 'r', expiresIn: 900 });
});

afterEach(async () => {
  await clearSession('user');
});

describe('describe → recommendations', () => {
  it('renders the server disclaimer verbatim and the recommended SERVICE', async () => {
    routeFetch((url) => {
      if (url.endsWith('/search')) return { body: okSearch };
      return { body: { disclaimer: DISCLAIMER, popular: [] } };
    });

    renderFlow();
    fireEvent.changeText(screen.getByLabelText('Describe how you are feeling'), 'cannot sleep');
    fireEvent.press(screen.getByTestId('assistant-submit'));

    await waitFor(() => expect(screen.getByTestId('find-care')).toBeTruthy());
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
    expect(screen.getByText('Psychologist / Therapy')).toBeTruthy();
    expect(screen.getByText('matched to: sleep, anxiety')).toBeTruthy();
  });

  it('carries the search across, so arriving costs one request not two', async () => {
    let searches = 0;
    routeFetch((url) => {
      if (url.endsWith('/search')) {
        searches += 1;
        return { body: okSearch };
      }
      return { body: { disclaimer: DISCLAIMER, popular: [] } };
    });

    renderFlow();
    fireEvent.changeText(screen.getByLabelText('Describe how you are feeling'), 'cannot sleep');
    fireEvent.press(screen.getByTestId('assistant-submit'));

    await waitFor(() => expect(screen.getByTestId('find-care')).toBeTruthy());
    expect(searches).toBe(1);
  });

  it('offers a time, never a person, and shows no provider identity', async () => {
    routeFetch((url) => {
      if (url.endsWith('/search')) return { body: okSearch };
      return { body: { disclaimer: DISCLAIMER, popular: [] } };
    });

    renderFlow();
    fireEvent.changeText(screen.getByLabelText('Describe how you are feeling'), 'cannot sleep');
    fireEvent.press(screen.getByTestId('assistant-submit'));
    await waitFor(() => expect(screen.getByTestId('find-care')).toBeTruthy());

    // The CTA is a time.
    expect(screen.getByText('Choose a time')).toBeTruthy();
    // And nothing on the screen names a provider.
    expect(screen.queryByText(/^Dr\.?\s/i)).toBeNull();
    expect(screen.queryByText(/choose a doctor/i)).toBeNull();
    expect(screen.queryByText(/view all doctors/i)).toBeNull();
  });

  it('goes to the time picker — not a provider list — when a service is chosen', async () => {
    routeFetch((url) => {
      if (url.endsWith('/search')) return { body: okSearch };
      if (url.includes('/me/profile')) return { body: { preferredLanguage: 'en' } };
      return { body: { disclaimer: DISCLAIMER, popular: [] } };
    });

    renderFlow();
    fireEvent.changeText(screen.getByLabelText('Describe how you are feeling'), 'cannot sleep');
    fireEvent.press(screen.getByTestId('assistant-submit'));
    await waitFor(() => expect(screen.getByTestId('find-care')).toBeTruthy());

    fireEvent.press(screen.getByText('Choose a time'));

    await waitFor(() => expect(screen.getByTestId('choose-time')).toBeTruthy());

    // PT-07-01: the language promise is stated as a fact, naming the language.
    expect(screen.getByText(/who speaks English/i)).toBeTruthy();
    // Pick TOMORROW rather than today: after clinic hours today legitimately
    // has no offerable times, so asserting on it would make the suite depend on
    // the hour it runs at.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    fireEvent.press(
      screen.getByLabelText(`${DAY_SHORT[tomorrow.getDay()]} ${tomorrow.getDate()}`),
    );

    // It is a TIME picker, not a person picker: bands of times, nobody named.
    await waitFor(() =>
      expect(
        screen.queryByText('Morning') ??
          screen.queryByText('Afternoon') ??
          screen.queryByText('Evening'),
      ).toBeTruthy(),
    );
    expect(screen.queryByText(/^Dr\.?\s/i)).toBeNull();
    // G-1 is disclosed rather than hidden.
    expect(screen.getByText(/confirmed when you book/i)).toBeTruthy();
  });
});

describe('crisis interrupt', () => {
  const crisisBody = {
    disclaimer: DISCLAIMER,
    crisis: true,
    results: [],
    guidance: {
      title: 'Help is available right now',
      message: 'You do not have to face it alone.',
      helplines: [{ name: 'Tele-MANAS', number: '14416', available: '24x7' }],
      footer: 'This app cannot provide emergency care.',
    },
  };

  it('replaces results with guidance from the backend, and shows its numbers', async () => {
    routeFetch((url) => {
      if (url.endsWith('/search')) return { body: crisisBody };
      return { body: { disclaimer: DISCLAIMER, popular: [] } };
    });

    renderFlow();
    fireEvent.changeText(screen.getByLabelText('Describe how you are feeling'), 'i want to die');
    fireEvent.press(screen.getByTestId('assistant-submit'));

    await waitFor(() => expect(screen.getByTestId('emergency')).toBeTruthy());
    expect(screen.getByText('Help is available right now')).toBeTruthy();
    expect(screen.getByText('14416')).toBeTruthy();

    // No results anywhere near it.
    expect(screen.queryByTestId('find-care')).toBeNull();
    expect(screen.queryByText('Psychologist / Therapy')).toBeNull();
  });

  it('needs an explicit dismissal, and clears the query on the way out', async () => {
    routeFetch((url) => {
      if (url.endsWith('/search')) return { body: crisisBody };
      return { body: { disclaimer: DISCLAIMER, popular: [] } };
    });

    renderFlow();
    fireEvent.changeText(screen.getByLabelText('Describe how you are feeling'), 'i want to die');
    fireEvent.press(screen.getByTestId('assistant-submit'));
    await waitFor(() => expect(screen.getByTestId('emergency')).toBeTruthy());

    fireEvent.press(screen.getByTestId('dismiss-emergency'));

    await waitFor(() => expect(screen.getByTestId('assistant')).toBeTruthy());
    // Cleared, so the patient is not one tap from re-triggering the interrupt.
    expect(screen.getByLabelText('Describe how you are feeling').props.value).toBe('');
  });

  it('never keeps a crisis phrase as a recent-search chip', async () => {
    routeFetch((url) => {
      if (url.endsWith('/search')) return { body: crisisBody };
      return { body: { disclaimer: DISCLAIMER, popular: [] } };
    });

    renderFlow();
    fireEvent.changeText(screen.getByLabelText('Describe how you are feeling'), 'i want to die');
    fireEvent.press(screen.getByTestId('assistant-submit'));
    await waitFor(() => expect(screen.getByTestId('emergency')).toBeTruthy());
    fireEvent.press(screen.getByTestId('dismiss-emergency'));
    await waitFor(() => expect(screen.getByTestId('assistant')).toBeTruthy());

    expect(screen.queryByText('i want to die')).toBeNull();
  });

  it('is reachable without a search, from the persistent entry point', async () => {
    routeFetch((url) => {
      if (url.includes('care-hub/emergency')) {
        return { body: [{ id: '1', slug: 'help', title: 'If you need help now', body: 'Call 112.' }] };
      }
      return { body: { disclaimer: DISCLAIMER, popular: [] } };
    });

    renderFlow();
    fireEvent.press(screen.getByLabelText('Emergency help'));

    await waitFor(() => expect(screen.getByTestId('emergency')).toBeTruthy());
    expect(screen.getByText('If you need help now')).toBeTruthy();
  });
});

describe('the service catalogue', () => {
  it('lists services and goes to a time when one is chosen', async () => {
    routeFetch((url) => {
      if (url.includes('/services')) return { body: [SERVICE] };
      if (url.includes('/concerns')) return { body: [] };
      if (url.includes('/me/profile')) return { body: { preferredLanguage: 'en' } };
      return { body: [] };
    });

    renderFlow('services');
    await waitFor(() => expect(screen.getByText('Psychologist / Therapy')).toBeTruthy());

    fireEvent.press(screen.getByText('Psychologist / Therapy'));
    await waitFor(() => expect(screen.getByTestId('choose-time')).toBeTruthy());
  });

  it('renders a readable error, never a raw payload or status code', async () => {
    routeFetch(() => ({
      status: 500,
      body: { statusCode: 500, code: 'INTERNAL_ERROR', message: 'boom', requestId: 'req-1' },
    }));

    renderFlow('services');
    await waitFor(() =>
      expect(screen.getByText(/could not load the services/i)).toBeTruthy(),
    );
    // SH-01: no status code and no raw payload reaches the user.
    expect(screen.queryByText(/500/)).toBeNull();
    expect(screen.queryByText(/INTERNAL_ERROR/)).toBeNull();
    expect(screen.queryByText(/statusCode/)).toBeNull();
  });
});
