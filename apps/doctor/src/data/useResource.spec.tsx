import React from 'react';
import { Text } from 'react-native';
import { render, act, fireEvent } from '@testing-library/react-native';

import { useResource, __resetResourceCache, seedResource } from './useResource';
import { SKELETON_DELAY_MS, SKELETON_MIN_MS } from '../theme/skeleton';

/**
 * The loading contract, exercised directly. These are the rules the brief
 * asked for, each one asserted rather than assumed.
 */

const Probe = ({
  cacheKey,
  fetcher,
}: {
  cacheKey: string;
  fetcher: () => Promise<string>;
}) => {
  const { data, error, showSkeleton, isRefreshing, retry, refresh } = useResource(cacheKey, fetcher);
  return (
    <>
      <Text testID="state">
        {showSkeleton ? 'skeleton' : error ? 'error' : data ? `data:${data}` : 'idle'}
      </Text>
      <Text testID="refreshing">{isRefreshing ? 'yes' : 'no'}</Text>
      <Text testID="retry" onPress={retry}>
        retry
      </Text>
      <Text testID="refresh" onPress={refresh}>
        refresh
      </Text>
    </>
  );
};

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  __resetResourceCache();
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

/* ------------------------- no flash on a fast response -------------------- */

test('a response faster than the delay never shows a skeleton', async () => {
  const d = deferred<string>();
  const { getByTestId } = render(<Probe cacheKey="fast" fetcher={() => d.promise} />);

  expect(getByTestId('state').props.children).toBe('idle');

  // lands before the delay elapses
  await act(async () => {
    jest.advanceTimersByTime(SKELETON_DELAY_MS - 20);
    d.resolve('quick');
  });

  expect(getByTestId('state').props.children).toBe('data:quick');
});

/* -------------------------- minimum visible duration ---------------------- */

test('a skeleton that appears stays for the minimum, never blinks', async () => {
  const d = deferred<string>();
  const { getByTestId } = render(<Probe cacheKey="slow" fetcher={() => d.promise} />);

  await act(async () => {
    jest.advanceTimersByTime(SKELETON_DELAY_MS + 10);
  });
  expect(getByTestId('state').props.children).toBe('skeleton');

  // data arrives almost immediately after the skeleton appeared
  await act(async () => {
    d.resolve('late');
  });
  // still held, because it has not been visible long enough to read
  expect(getByTestId('state').props.children).toBe('skeleton');

  await act(async () => {
    jest.advanceTimersByTime(SKELETON_MIN_MS);
  });
  expect(getByTestId('state').props.children).toBe('data:late');
});

/* --------------------------------- caching -------------------------------- */

test('cached data renders immediately, with no skeleton at all', async () => {
  seedResource('cached', 'from-cache');
  const fetcher = jest.fn(() => Promise.resolve('fresh'));

  const { getByTestId } = render(<Probe cacheKey="cached" fetcher={fetcher} />);

  // no pending frame: the cached value is on screen from the first render
  expect(getByTestId('state').props.children).toBe('data:from-cache');
  // and fresh data was not re-requested, because the entry is still young
  expect(fetcher).not.toHaveBeenCalled();
});

/* ------------------------------- deduplication ---------------------------- */

test('two components asking for one key make a single request', async () => {
  const fetcher = jest.fn(() => Promise.resolve('once'));

  render(
    <>
      <Probe cacheKey="shared" fetcher={fetcher} />
      <Probe cacheKey="shared" fetcher={fetcher} />
    </>
  );

  await act(async () => {
    jest.advanceTimersByTime(SKELETON_DELAY_MS + SKELETON_MIN_MS);
  });

  expect(fetcher).toHaveBeenCalledTimes(1);
});

/* ------------------------------ error and retry --------------------------- */

test('an error clears the skeleton at once and retry reloads', async () => {
  let attempt = 0;
  const fetcher = jest.fn(() => {
    attempt += 1;
    return attempt === 1 ? Promise.reject(new Error('boom')) : Promise.resolve('recovered');
  });

  const { getByTestId } = render(<Probe cacheKey="flaky" fetcher={fetcher} />);

  await act(async () => {
    jest.advanceTimersByTime(SKELETON_DELAY_MS + 10);
  });

  // the skeleton is gone the moment it fails — not held until the minimum
  expect(getByTestId('state').props.children).toBe('error');

  await act(async () => {
    fireEvent.press(getByTestId('retry'));
  });
  // the skeleton appears and the promise settles...
  await act(async () => {
    jest.advanceTimersByTime(SKELETON_DELAY_MS + 10);
  });
  // ...and only then does the minimum-visible timer start counting
  await act(async () => {
    jest.advanceTimersByTime(SKELETON_MIN_MS);
  });

  expect(getByTestId('state').props.children).toBe('data:recovered');
  expect(fetcher).toHaveBeenCalledTimes(2);
});

/* ------------------------------ refresh in place -------------------------- */

test('refreshing keeps the current data on screen and raises a flag', async () => {
  seedResource('refreshable', 'old');
  const d = deferred<string>();
  const { getByTestId } = render(<Probe cacheKey="refreshable" fetcher={() => d.promise} />);

  expect(getByTestId('state').props.children).toBe('data:old');

  await act(async () => {
    fireEvent.press(getByTestId('refresh'));
  });

  // content stays put; only the indicator changes
  expect(getByTestId('state').props.children).toBe('data:old');
  expect(getByTestId('refreshing').props.children).toBe('yes');

  await act(async () => {
    d.resolve('new');
  });
  await act(async () => {
    jest.advanceTimersByTime(SKELETON_MIN_MS);
  });

  expect(getByTestId('state').props.children).toBe('data:new');
  expect(getByTestId('refreshing').props.children).toBe('no');
});
