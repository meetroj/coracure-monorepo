import { renderHook, waitFor } from '@testing-library/react-native';
import { doctorVideoApi } from '@coracure/api';

import { serverCallSeconds, useCallSession } from './callSession';

const ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

test('a call the server measured reads as whole seconds; none recorded reads as undefined', () => {
  expect(serverCallSeconds({ durationSeconds: 754.4 })).toBe(754);
  expect(serverCallSeconds({ durationSeconds: 0 })).toBeUndefined();
  expect(serverCallSeconds(undefined)).toBeUndefined();
});

test('asks the server for a real consultation and never for a demo one', async () => {
  const get = jest.spyOn(doctorVideoApi, 'getCallSession').mockResolvedValue({ durationSeconds: 600 } as never);
  const demo = renderHook(() => useCallSession('a1'));
  expect(demo.result.current.data).toBeUndefined();
  expect(get).not.toHaveBeenCalled();

  const real = renderHook(() => useCallSession(ID));
  await waitFor(() => expect(real.result.current.data?.durationSeconds).toBe(600));
  expect(get).toHaveBeenCalledWith(ID);
});
