import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@coracure/api/errors';

import { NotificationBell } from '../app/NotificationBell';
import { patients } from '../api/patients';
import { ToastProvider } from '../lib/toast';
import { SKELETON_DELAY_MS } from '../ui';
import { Availability } from './availability/Availability';
import { DeletionRequests } from './compliance/DeletionRequests';
import { Consultations } from './consultations/Consultations';
import { ConsultationDetail } from './consultations/ConsultationDetail';
import { CareHub } from './content/CareHub';
import { NotificationTemplates } from './content/NotificationTemplates';
import { Dashboard } from './Dashboard';
import { Inbox } from './Inbox';
import { Patients } from './patients/Patients';
import { ProviderDetail } from './providers/ProviderDetail';
import { SafetyAlerts } from './SafetyAlerts';

/**
 * The screens, as wired to the skeleton kit, on the fixture backend (260ms of
 * latency per call). Fake timers make the 150ms delay, the 300ms minimum and
 * the poll interval exact.
 *
 * What each test pins down is a rule of the spec: a skeleton is drawn only for
 * a slow load and only in the body; the chrome stays real; failure replaces it
 * at once; a refresh or a poll never covers rows that are already there; and
 * nothing that needs loaded data is usable before it has loaded.
 */
beforeAll(() => {
  // jsdom has no <dialog> modal support; the kit's Modal needs these two.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/**
 * Steps the clock, letting React render between steps: inside ONE `act` it
 * would batch everything, and a screen that starts a second request once its
 * first has rendered (a detail page and its billing) would never start it.
 */
const advance = async (ms: number, step = 50) => {
  for (let done = 0; done < ms; done += step) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(step, ms - done));
    });
  }
};

const at = (url: string, routes: { path: string; element: ReactElement }[]) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <ToastProvider>
        <Routes>
          {routes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );

const busy = () => document.querySelector('[aria-busy="true"]');

describe('Patients list', () => {
  const mount = (url = '/patients') => at(url, [{ path: '/patients', element: <Patients level="operations" /> }]);

  it('keeps its filters real and draws a neutral body skeleton only for a slow load', async () => {
    mount();
    // Inside the delay: the filter bar is there, the body is not drawn, and no empty state.
    expect(screen.getByLabelText('Status')).toBeTruthy();
    expect(document.querySelector('.sk')).toBeNull();
    expect(screen.queryByText('No patients yet')).toBeNull();

    await advance(SKELETON_DELAY_MS + 10);
    const region = screen.getByLabelText('Loading patients');
    expect(region.getAttribute('aria-busy')).toBe('true');
    // The table keeps its real headers, and says nothing it does not know.
    expect(within(region).getByText('Consultations')).toBeTruthy();
    expect(region.textContent).not.toMatch(/\d/);
    expect(region.querySelector('.badge')).toBeNull();
    expect(screen.getByLabelText('Status')).toBeTruthy();

    await advance(1000);
    expect(screen.getByText('Aarav Mehta')).toBeTruthy();
    expect(busy()).toBeNull();
  });

  it('keeps the previous rows through the delay on a filter change, then shows the body skeleton', async () => {
    mount();
    await advance(1000);
    expect(screen.getByText('Aarav Mehta')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'pending_deletion' } });
    await advance(50);
    // A quick answer would simply replace the rows; until then they stay.
    expect(screen.getByText('Aarav Mehta')).toBeTruthy();
    expect(document.querySelector('.sk')).toBeNull();

    await advance(SKELETON_DELAY_MS);
    // Slow: the other filter's rows give way to the skeleton, and the filters stay put.
    expect(screen.queryByText('Aarav Mehta')).toBeNull();
    expect(screen.getByLabelText('Loading patients')).toBeTruthy();
    expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('pending_deletion');

    await advance(1000);
    expect(screen.getByText('Meera Pillai')).toBeTruthy();
    expect(screen.queryByText('Aarav Mehta')).toBeNull();
  });

  it('replaces the skeleton with the error and a Retry that loads the list', async () => {
    vi.spyOn(patients, 'list').mockRejectedValueOnce(
      new ApiError({ statusCode: 500, code: 'INTERNAL_ERROR', message: 'Boom' }),
    );
    mount();
    await advance(20);
    expect(screen.getByText('Unable to load patients')).toBeTruthy();
    expect(document.querySelector('.sk')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await advance(1000);
    expect(screen.getByText('Aarav Mehta')).toBeTruthy();
  });

  it('shows a permission failure without a Retry', async () => {
    vi.spyOn(patients, 'list').mockRejectedValueOnce(
      new ApiError({ statusCode: 403, code: 'INSUFFICIENT_PERMISSION', message: 'No' }),
    );
    mount();
    await advance(20);
    expect(screen.getByText('You do not have permission to view this')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('shows the empty state only after a successful load', async () => {
    mount('/patients?search=zzzzqq');
    await advance(SKELETON_DELAY_MS + 10);
    expect(screen.queryByText('No patients match these filters')).toBeNull();
    await advance(1000);
    expect(screen.getByText('No patients match these filters')).toBeTruthy();
    expect(document.querySelector('.sk')).toBeNull();
  });
});

describe('Appointments list paging', () => {
  it('keeps the rows and marks Show more busy while the next page loads', async () => {
    at('/appointments', [{ path: '/appointments', element: <Consultations level="super_admin" /> }]);
    await advance(1000);
    expect(screen.getByText(/Showing 15 of 33/)).toBeTruthy();
    const rows = () => document.querySelectorAll('tbody tr').length;
    expect(rows()).toBe(15);

    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    // Past the skeleton delay: still no skeleton, the 15 rows are still there, and the button is working.
    await advance(SKELETON_DELAY_MS + 50);
    expect(document.querySelector('.sk')).toBeNull();
    expect(rows()).toBe(15);
    const more = screen.getByRole('button', { name: 'Show more' }) as HTMLButtonElement;
    expect(more.disabled).toBe(true);
    expect(more.getAttribute('aria-busy')).toBe('true');

    await advance(1000);
    expect(screen.getByText(/Showing 30 of 33/)).toBeTruthy();
  });
});

describe('Verification review', () => {
  it('holds the decision until the documents under review have loaded', async () => {
    at('/verification/dr-4', [{ path: '/verification/:doctorId', element: <ProviderDetail level="super_admin" /> }]);

    await advance(SKELETON_DELAY_MS + 10);
    // The provider is still loading: a skeleton, and no decision to take yet.
    expect(screen.getByLabelText('Loading this doctor').getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();

    // The provider is in; the documents are not.
    await advance(350);
    const approve = screen.getByRole('button', { name: 'Approve' }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Reject' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Changes required' }) as HTMLButtonElement).disabled).toBe(true);
    // Suspending is not a review decision on the documents.
    expect((screen.getByRole('button', { name: 'Suspend' }) as HTMLButtonElement).disabled).toBe(false);

    await advance(1200);
    // The first of each is the provider's own; the ones after belong to each document.
    for (const name of ['Approve', 'Reject', 'Changes required']) {
      expect((screen.getAllByRole('button', { name })[0] as HTMLButtonElement).disabled).toBe(false);
    }
  });
});

describe('Safety alerts', () => {
  it('refreshes on its poll without covering the rows it already has', async () => {
    at('/safety-alerts', [{ path: '/safety-alerts', element: <SafetyAlerts level="operations" /> }]);
    await advance(1000);
    const rows = () => document.querySelectorAll('tbody tr').length;
    const before = rows();
    expect(before).toBeGreaterThan(0);

    // The 45s poll fires and its request is in flight.
    await advance(44_150);
    expect(busy()).toBeNull();
    expect(document.querySelector('.sk')).toBeNull();
    expect(rows()).toBe(before);

    await advance(600);
    expect(rows()).toBe(before);
  });
});

describe('Notification bell', () => {
  it('shows a skeleton while the list loads, never "all caught up", then the rows', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <NotificationBell />
        </ToastProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));

    await advance(20);
    expect(screen.queryByText('You are all caught up.')).toBeNull();
    expect(document.querySelector('.sk')).toBeNull();

    await advance(SKELETON_DELAY_MS);
    expect(screen.getByLabelText('Loading notifications').getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByText('You are all caught up.')).toBeNull();

    await advance(1000);
    expect(document.querySelector('.notifItem')).not.toBeNull();
    expect(busy()).toBeNull();
  });
});

describe('Dashboard', () => {
  it('has its cards at once and a neutral skeleton for the charts and the feed', async () => {
    render(
      <MemoryRouter>
        <Dashboard level="super_admin" />
      </MemoryRouter>,
    );
    // The cards read local stores: no blank, no skeleton for them.
    expect(screen.getByText('Total providers')).toBeTruthy();

    await advance(SKELETON_DELAY_MS + 10);
    const regions = screen.getAllByLabelText(/^Loading/);
    expect(regions.length).toBe(2);
    regions.forEach((r) => {
      expect(r.querySelector('.dchart__delta')).toBeNull();
      expect(r.querySelector('.badge')).toBeNull();
    });
    // The titles are static, so they are real while the figures are not.
    expect(screen.getByText('Consultations, last 7 days')).toBeTruthy();
    expect(screen.getByText('Recent activity')).toBeTruthy();

    await advance(1000);
    expect(busy()).toBeNull();
    expect(document.querySelector('.dchart')).not.toBeNull();
  });
});

describe('Consultation detail', () => {
  it('reserves the page as it will stand, with no status or figure, then fills it', async () => {
    at('/consultations/cs-1001', [
      { path: '/consultations/:consultationId', element: <ConsultationDetail level="operations" /> },
    ]);
    await advance(SKELETON_DELAY_MS + 10);

    const region = screen.getByLabelText('Loading this consultation');
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(region.querySelector('.keyFacts')).not.toBeNull();
    expect(within(region).getByText('Billing')).toBeTruthy();
    expect(region.querySelector('.badge')).toBeNull();
    expect(region.textContent).not.toMatch(/₹|\d/);

    await advance(2500);
    expect(screen.getByText('Consultation ID')).toBeTruthy();
    expect(screen.getByText('Consultation fee')).toBeTruthy();
    expect(busy()).toBeNull();
  });
});

describe('Care Hub library', () => {
  it('keeps the toolbar real and draws the skeleton of the view the admin chose', async () => {
    render(
      <MemoryRouter initialEntries={['/app-settings?tab=care-hub']}>
        <ToastProvider>
          <CareHub level="content" />
        </ToastProvider>
      </MemoryRouter>,
    );
    await advance(SKELETON_DELAY_MS + 10);
    // Cards by default: a grid of media cards, and the toolbar above it is usable.
    expect(document.querySelector('.chGrid .sk')).not.toBeNull();
    expect(screen.getByLabelText('Type')).toBeTruthy();

    // Switching view while it loads swaps the skeleton to the table's, with its real headers.
    fireEvent.click(screen.getByRole('button', { name: 'Table' }));
    await advance(10);
    const region = screen.getByLabelText('Loading Care Hub items');
    expect(within(region).getByText('Thumbnail')).toBeTruthy();
    expect(region.querySelector('.badge')).toBeNull();

    await advance(1000);
    expect(busy()).toBeNull();
    expect(screen.getByRole('table')).toBeTruthy();
  });
});

describe('Deletion requests', () => {
  it('keeps its three card titles real and offers no action until the queue has loaded', async () => {
    at('/admin-settings?tab=deletion-requests', [
      { path: '/admin-settings', element: <DeletionRequests level="super_admin" /> },
    ]);
    await advance(SKELETON_DELAY_MS + 10);

    const region = screen.getByLabelText('Loading deletion requests');
    for (const title of ['Awaiting review', 'Approved - awaiting execution', 'Closed']) {
      expect(within(region).getByText(title)).toBeTruthy();
    }
    expect(screen.queryByRole('button', { name: /Approve|Execute|Retry deletion/ })).toBeNull();
    expect(region.querySelector('.badge')).toBeNull();

    await advance(1000);
    expect(busy()).toBeNull();
  });
});

describe('Assignable providers lookup', () => {
  it('disables the option lists while they load and skeletons the answer under real headers', async () => {
    at('/availability?at=2026-10-20T10:00', [
      { path: '/availability', element: <Availability level="operations" /> },
    ]);
    expect((screen.getByLabelText('Service / specialty') as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText('Region') as HTMLSelectElement).disabled).toBe(true);

    await advance(SKELETON_DELAY_MS + 10);
    const region = screen.getByLabelText('Loading assignable providers');
    expect(within(region).getByText('Unbroken time left')).toBeTruthy();
    // "Nobody is assignable" is an answer; it must not be on screen before the lookup has finished.
    expect(screen.queryByText('Nobody is assignable at that time')).toBeNull();

    await advance(1000);
    expect((screen.getByLabelText('Region') as HTMLSelectElement).disabled).toBe(false);
    expect(busy()).toBeNull();
  });
});

describe('Notifications inbox', () => {
  it('shows list rows as a skeleton, with no unread count on the tab, before the list arrives', async () => {
    at('/inbox', [{ path: '/inbox', element: <Inbox level="super_admin" /> }]);
    expect(screen.getByRole('tab', { name: 'Unread' })).toBeTruthy();

    await advance(SKELETON_DELAY_MS + 10);
    expect(screen.getByLabelText('Loading your notifications').getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByText('Nothing here yet')).toBeNull();

    await advance(1000);
    expect(screen.getByRole('tab', { name: /Unread \(\d+\)/ })).toBeTruthy();
    expect(busy()).toBeNull();
  });
});

describe('Send notification recipients', () => {
  it('does not say "No one matches" while the audience is still loading', async () => {
    at('/notifications?tab=send', [
      { path: '/notifications', element: <NotificationTemplates level="operations" /> },
    ]);
    fireEvent.change(screen.getByLabelText('Recipients'), { target: { value: 'selected' } });
    await advance(20);
    expect(screen.queryByText('No one matches.')).toBeNull();

    await advance(SKELETON_DELAY_MS);
    expect(screen.getByLabelText('Loading doctors').getAttribute('aria-busy')).toBe('true');

    await advance(1000);
    expect(busy()).toBeNull();
    expect(screen.getByLabelText('Matching recipients')).toBeTruthy();
  });
});
