import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@coracure/api/errors';

import { Async, SKELETON_DELAY_MS, SKELETON_MIN_MS, TableSkeleton } from './index';

/**
 * What makes a skeleton honest rather than flickery, asserted on the real
 * `<Async>` every admin screen goes through:
 *
 * - a fast response never shows one
 * - a shown one stays long enough to read, never a blink
 * - a failure replaces it at once, never an endless shimmer
 * - a refetch over data on screen never covers it
 */
type State = Parameters<typeof Async<string[]>>[0]['state'];
const base: State = { data: null, loading: true, error: null, initial: true, reload: () => undefined };

const Harness = ({ state }: { state: State }) => (
  <Async
    state={state}
    resource="patients"
    skeleton={<TableSkeleton columns={[{ kind: 'avatar', header: 'Patient' }, { kind: 'status', header: 'Status' }]} rows={2} />}
  >
    {(rows) => <p>{rows.length} rows</p>}
  </Async>
);

const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe('Async skeleton', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders no skeleton inside the delay, then a busy labelled region with real headers', () => {
    render(<Harness state={base} />);
    tick(SKELETON_DELAY_MS - 20);
    expect(screen.queryByLabelText('Loading patients')).toBeNull();

    tick(40);
    const region = screen.getByLabelText('Loading patients');
    expect(region.getAttribute('aria-busy')).toBe('true');
    // Known column headers stay real so the table keeps its columns.
    expect(screen.getByText('Patient')).toBeTruthy();
    expect(document.querySelectorAll('.sk').length).toBeGreaterThan(0);
  });

  it('never shows a skeleton when data lands inside the delay', () => {
    const view = render(<Harness state={base} />);
    tick(SKELETON_DELAY_MS - 20);
    view.rerender(<Harness state={{ ...base, data: ['a', 'b'], loading: false, initial: false }} />);
    expect(document.querySelector('.sk')).toBeNull();
    expect(screen.getByText('2 rows')).toBeTruthy();
  });

  it('holds a shown skeleton for the minimum, then reveals the data', () => {
    const view = render(<Harness state={base} />);
    tick(SKELETON_DELAY_MS + 10);
    view.rerender(<Harness state={{ ...base, data: ['a'], loading: false, initial: false }} />);

    expect(screen.queryByText('1 rows')).toBeNull();
    expect(document.querySelector('.sk')).not.toBeNull();

    tick(SKELETON_MIN_MS);
    expect(screen.getByText('1 rows')).toBeTruthy();
    expect(document.querySelector('.sk')).toBeNull();
  });

  it('replaces the skeleton with the error at once', () => {
    const view = render(<Harness state={base} />);
    tick(SKELETON_DELAY_MS + 10);
    const error = new ApiError({ statusCode: 500, code: 'INTERNAL_ERROR', message: 'Boom' });
    view.rerender(<Harness state={{ ...base, loading: false, initial: false, error }} />);
    expect(document.querySelector('.sk')).toBeNull();
    expect(screen.getByText('Unable to load patients')).toBeTruthy();
  });

  it('keeps data on screen through a refetch', () => {
    render(<Harness state={{ ...base, data: ['a'], loading: true, initial: false }} />);
    tick(SKELETON_DELAY_MS + SKELETON_MIN_MS);
    expect(document.querySelector('.sk')).toBeNull();
    expect(screen.getByText('1 rows')).toBeTruthy();
  });

  it('keeps the previous filter rows through the delay, then gives way to the skeleton', () => {
    // `stale`: a filter or id changed, so these rows belong to the old one.
    render(<Harness state={{ ...base, data: ['a'], loading: true, initial: false, stale: true }} />);
    tick(SKELETON_DELAY_MS - 20);
    expect(screen.getByText('1 rows')).toBeTruthy();
    expect(document.querySelector('.sk')).toBeNull();

    tick(40);
    expect(screen.queryByText('1 rows')).toBeNull();
    expect(screen.getByLabelText('Loading patients').getAttribute('aria-busy')).toBe('true');
  });

  it('never draws a skeleton for the very first frame of a slow request', () => {
    render(<Harness state={base} />);
    expect(document.querySelector('.sk')).toBeNull();
    expect(screen.queryByText('Nothing to show')).toBeNull();
  });
});

describe('Async failure states', () => {
  const failed = (code: string, statusCode = 500): State => ({
    ...base,
    loading: false,
    initial: false,
    error: new ApiError({ statusCode, code, message: 'Boom' }),
  });

  it('offers Retry for a failure that retrying can fix', () => {
    render(<Harness state={failed('INTERNAL_ERROR')} />);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('keeps the last good rows on a failed refresh, and says so with a Retry', () => {
    render(<Harness state={{ ...failed('INTERNAL_ERROR'), data: ['a'] }} />);
    expect(screen.getByText('1 rows')).toBeTruthy();
    expect(screen.getByText(/Could not refresh./)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('offers no Retry for a permission failure, and says why', () => {
    render(<Harness state={failed('INSUFFICIENT_PERMISSION', 403)} />);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.getByText('You do not have permission to view this')).toBeTruthy();
  });

  it('says plainly that the device is offline, with Retry', () => {
    const online = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    try {
      render(<Harness state={failed('NETWORK_UNAVAILABLE', 0)} />);
      expect(screen.getByText('You appear to be offline')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    } finally {
      delete (navigator as { onLine?: boolean }).onLine;
      if (online) Object.defineProperty(Navigator.prototype, 'onLine', online);
    }
  });
});
