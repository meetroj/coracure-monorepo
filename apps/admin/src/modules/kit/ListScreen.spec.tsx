import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SKELETON_DELAY_MS, SKELETON_MIN_MS, type Column } from '../../ui';
import { ListScreen, type ListTab } from './ListScreen';

/**
 * A list whose rows are still on their way (the live roster, the verification
 * queue, admin users): the chrome stays real and usable, only the body is a
 * skeleton, and a tab never shows a count nobody has counted.
 */
type Row = { id: string; name: string; state: 'open' | 'done' };

const columns: Column<Row>[] = [
  { key: 'name', header: 'Provider', render: (r) => r.name },
  { key: 'state', header: 'State', render: (r) => r.state },
];
const tabs: ListTab<Row>[] = [
  { id: 'open', label: 'Open', test: (r) => r.state === 'open' },
  { id: 'done', label: 'Done', test: (r) => r.state === 'done' },
];
const rows: Row[] = [
  { id: '1', name: 'Asha Rao', state: 'open' },
  { id: '2', name: 'Vikram Shah', state: 'done' },
];

const view = (props: { loading: boolean; rows?: Row[] }) => (
  <MemoryRouter>
    <ListScreen
      caption="Providers"
      rows={props.rows ?? []}
      columns={columns}
      rowKey={(r) => r.id}
      tabs={tabs}
      search={(r) => r.name}
      searchPlaceholder="Provider name"
      loading={props.loading}
    />
  </MemoryRouter>
);

const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe('ListScreen while loading', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps the tabs and search real, draws nothing for the body inside the delay, then the real columns', () => {
    render(view({ loading: true }));

    expect(screen.getByRole('tab', { name: 'Open' })).toBeTruthy();
    expect(screen.getByLabelText('Provider name')).toBeTruthy();
    // Inside the delay: no skeleton, and certainly not an empty state.
    expect(document.querySelector('.sk')).toBeNull();
    expect(screen.queryByText('Nothing here yet')).toBeNull();

    tick(SKELETON_DELAY_MS + 10);
    const region = screen.getByLabelText('Loading providers');
    expect(region.getAttribute('aria-busy')).toBe('true');
    // The skeleton table is hidden from assistive tech (the region carries the label), so query by text.
    expect(within(region).getByText('Provider')).toBeTruthy();
    expect(within(region).getByText('State')).toBeTruthy();
    // Neutral: no status colours, and the tabs are still usable.
    expect(region.querySelector('.badge')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Open' })).toBeTruthy();
  });

  it('leaves the tab counts off until the rows are counted', () => {
    const view_ = render(view({ loading: true }));
    tick(SKELETON_DELAY_MS + 10);
    expect(screen.getByRole('tab', { name: 'All' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: /\(\d+\)/ })).toBeNull();

    view_.rerender(view({ loading: false, rows }));
    tick(SKELETON_MIN_MS + 10);
    expect(screen.getByRole('tab', { name: 'All (2)' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Open (1)' })).toBeTruthy();
    expect(screen.getByText('Asha Rao')).toBeTruthy();
  });

  it('shows the empty state only once loading has finished with no rows', () => {
    const view_ = render(view({ loading: true }));
    tick(SKELETON_DELAY_MS + 10);
    expect(screen.queryByText('Nothing here yet')).toBeNull();

    view_.rerender(view({ loading: false, rows: [] }));
    tick(SKELETON_MIN_MS + 10);
    expect(screen.getByText('Nothing here yet')).toBeTruthy();
    expect(document.querySelector('.sk')).toBeNull();
  });
});
