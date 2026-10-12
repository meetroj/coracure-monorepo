import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@coracure/api/errors';

import { useResource } from './useResource';

/**
 * What a screen needs to know to draw the right kind of waiting:
 *
 * - a RELOAD (after a mutation, or a poll) refreshes the same data: not stale
 * - a different filter or id means the data on screen is another key's: stale
 * - a paging dep left out of `resetOn` ("show more") keeps its rows: not stale
 * - a failure under a new key must not leave the previous key's rows up
 */
type Deferred = { resolve: (v: string) => void; reject: (e: unknown) => void };

const setup = () => {
  const calls: Deferred[] = [];
  const hook = renderHook(
    ({ filter, limit }: { filter: string; limit: number }) =>
      useResource<string>(
        () =>
          new Promise<string>((resolve, reject) => {
            calls.push({ resolve, reject });
          }),
        [filter, limit],
        true,
        [filter],
      ),
    { initialProps: { filter: 'a', limit: 10 } },
  );
  const settle = async (i: number, value: string) => {
    await act(async () => calls[i].resolve(value));
  };
  return { ...hook, calls, settle };
};

describe('useResource staleness', () => {
  it('is not stale on the first load, a reload or a paging change', async () => {
    const h = setup();
    expect(h.result.current).toMatchObject({ loading: true, initial: true, stale: false, data: null });

    await h.settle(0, 'A10');
    expect(h.result.current).toMatchObject({ loading: false, initial: false, stale: false, data: 'A10' });

    // Show more: the limit changes, the filter does not - the rows stay.
    h.rerender({ filter: 'a', limit: 20 });
    expect(h.result.current).toMatchObject({ loading: true, stale: false, data: 'A10' });
    await h.settle(1, 'A20');
    expect(h.result.current).toMatchObject({ loading: false, stale: false, data: 'A20' });

    // A reload (a mutation, a poll) keeps the data and is not a switch either.
    act(() => h.result.current.reload());
    expect(h.result.current).toMatchObject({ loading: true, stale: false, data: 'A20' });
    await h.settle(2, 'A20b');
    expect(h.result.current).toMatchObject({ loading: false, stale: false, data: 'A20b' });
  });

  it('is stale while a new filter loads, with the old rows still there until it lands', async () => {
    const h = setup();
    await h.settle(0, 'A10');

    h.rerender({ filter: 'b', limit: 10 });
    expect(h.result.current).toMatchObject({ loading: true, stale: true, data: 'A10' });

    await h.settle(1, 'B10');
    expect(h.result.current).toMatchObject({ loading: false, stale: false, data: 'B10' });
  });

  it('stays stale through a reload that lands mid-switch', async () => {
    const h = setup();
    await h.settle(0, 'A10');

    h.rerender({ filter: 'b', limit: 10 });
    act(() => h.result.current.reload());
    expect(h.result.current.stale).toBe(true);

    await h.settle(2, 'B10');
    expect(h.result.current).toMatchObject({ stale: false, data: 'B10' });
  });

  it('drops the previous key\'s rows when the new key fails', async () => {
    const h = setup();
    await h.settle(0, 'A10');

    h.rerender({ filter: 'b', limit: 10 });
    await act(async () => h.calls[1].reject(new ApiError({ statusCode: 500, code: 'INTERNAL_ERROR', message: 'Boom' })));

    expect(h.result.current.data).toBeNull();
    expect(h.result.current.error?.code).toBe('INTERNAL_ERROR');
    expect(h.result.current.stale).toBe(false);
  });

  it('keeps the rows when a plain reload fails', async () => {
    const h = setup();
    await h.settle(0, 'A10');

    act(() => h.result.current.reload());
    await act(async () => h.calls[1].reject(new ApiError({ statusCode: 500, code: 'INTERNAL_ERROR', message: 'Boom' })));

    expect(h.result.current.data).toBe('A10');
    expect(h.result.current.error?.code).toBe('INTERNAL_ERROR');
  });
});
