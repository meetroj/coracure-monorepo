import { doctorAvailabilityApi, doctorProfileApi } from '@coracure/api';
import type { AvailabilityRule, Diary } from '@coracure/api';
import { ApiError } from '@coracure/api/errors';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AvailabilityScreen } from './AvailabilityScreen';
import { toWeeklyWindows } from '../../data/availability';
import { clockToMinutes } from '../../data/calendar';
import { doctor, initialLeave, initialOverrides, initialSchedule } from '../../data/doctor';

/**
 * The screen against the real diary shape — the same fixture the old local
 * mock held, now served through `doctorAvailabilityApi`, so every assertion
 * below exercises the fetch-then-render path a device actually takes.
 */

const toApiTime = (display: string) => {
  const mins = clockToMinutes(display);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
};

const weekly: AvailabilityRule[] = toWeeklyWindows(initialSchedule).map((w, i) => ({
  id: `w-${i}`,
  dayOfWeek: w.dayOfWeek,
  date: null,
  startTime: w.startTime,
  endTime: w.endTime,
  channels: w.channels ?? ['video'],
}));

const customHours: AvailabilityRule[] = initialOverrides.map((o) => ({
  id: o.id,
  dayOfWeek: null,
  date: o.date,
  startTime: toApiTime(o.from),
  endTime: toApiTime(o.to),
  channels: ['video'],
}));

const blocked: AvailabilityRule[] = initialLeave.map((l) => ({
  id: l.id,
  dayOfWeek: null,
  date: l.date,
  startTime: null,
  endTime: null,
  channels: [],
}));

const diary: Diary = {
  doctorId: 'd-1',
  timeZone: 'Asia/Kolkata',
  consultationDurationMinutes: doctor.consultationMinutes,
  bufferMinutes: 10,
  weekly,
  blocked,
  customHours,
};

beforeEach(() => {
  jest.spyOn(doctorAvailabilityApi, 'getDiary').mockResolvedValue(diary);
  jest.spyOn(doctorAvailabilityApi, 'replaceWeekly').mockResolvedValue(diary);
  jest.spyOn(doctorAvailabilityApi, 'blockDate').mockImplementation((input) =>
    Promise.resolve({
      id: `new-blocked-${input.date}`,
      dayOfWeek: null,
      date: input.date,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      channels: input.channels ?? [],
    })
  );
  jest.spyOn(doctorAvailabilityApi, 'setCustomHours').mockImplementation((input) =>
    Promise.resolve({
      id: `new-hours-${input.date}`,
      dayOfWeek: null,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      channels: input.channels ?? ['video'],
    })
  );
  jest.spyOn(doctorAvailabilityApi, 'removeRule').mockResolvedValue(undefined);
  jest.spyOn(doctorProfileApi, 'updateProfile').mockImplementation((patch) =>
    Promise.resolve({ consultationDurationMinutes: doctor.consultationMinutes, bufferMinutes: 10, ...patch } as never)
  );
});

/**
 * The diary has landed once Monday's real hours are on screen.
 *
 * NOT `getByTestId('day-Mon')` — that row exists from the very first render,
 * empty, because the store's placeholder week has all seven days before the
 * fetch resolves. Waiting on it resolves `waitFor` immediately and the rest
 * of the test runs against an unloaded screen.
 */
const loaded = async (ui: ReturnType<typeof render>) =>
  waitFor(() => expect(ui.getByLabelText('Start time Monday 1')).toBeTruthy(), { timeout: 5000 });

// Jest's own per-test timeout defaults to 5000ms regardless of the project's
// `testTimeout: 30000` under some invocations (the same pre-existing gap the
// config comment already names for AppShell), and a machine under contention
// can make even a mocked, microtask-resolved promise take several seconds to
// flush through React's test scheduler. An explicit timeout is a sure thing
// rather than a retry away from flaking.
//
// This used to be one test chaining add → edit → remove: three round trips
// compounding their own scheduling jitter under a loaded machine made the
// third step the one that occasionally outran even a generous `waitFor`.
// Split into three, each adds its own leave entry first — more setup, but a
// slow run only has one network round trip's jitter to absorb, not three.
const addLeave = async (ui: ReturnType<typeof render>, details: string) => {
  fireEvent.press(ui.getByTestId('tab-timeoff'));
  fireEvent.press(ui.getByText('Add'));
  fireEvent.changeText(ui.getByLabelText('Entry date'), '2026-10-12');
  fireEvent.changeText(ui.getByLabelText('Entry details'), details);
  fireEvent.press(ui.getByText('Apply'));
  await waitFor(() => expect(ui.getByText(details)).toBeTruthy(), { timeout: 30000 });
};

test(
  'time off can be added',
  async () => {
    const ui = render(<AvailabilityScreen />);
    await loaded(ui);
    await addLeave(ui, 'Annual leave');
    ui.unmount();
  },
  60000
);

test(
  'an existing time off entry can be edited',
  async () => {
    const ui = render(<AvailabilityScreen />);
    await loaded(ui);
    await addLeave(ui, 'Annual leave');

    fireEvent.press(ui.getByText('Annual leave'));
    fireEvent.changeText(ui.getByLabelText('Entry details'), 'Conference');
    fireEvent.press(ui.getByText('Apply'));
    await waitFor(() => expect(ui.getByText('Conference')).toBeTruthy(), { timeout: 30000 });
    ui.unmount();
  },
  60000
);

test(
  'time off can be removed',
  async () => {
    const ui = render(<AvailabilityScreen />);
    await loaded(ui);
    await addLeave(ui, 'Annual leave');

    fireEvent.press(ui.getByLabelText('Remove leave on 2026-10-12'));
    await waitFor(() => expect(ui.queryByText('Annual leave')).toBeNull(), { timeout: 30000 });
    ui.unmount();
  },
  60000
);

test('schedule exceptions can be added and existing entries edited', async () => {
  const ui = render(<AvailabilityScreen />);
  await loaded(ui);

  fireEvent.press(ui.getByText('24 May'));
  fireEvent.changeText(ui.getByLabelText('Entry details'), '10:00 AM - 01:00 PM');
  fireEvent.press(ui.getByText('Apply'));
  await waitFor(() => expect(ui.getByText('10:00 AM - 01:00 PM')).toBeTruthy(), { timeout: 5000 });

  fireEvent.press(ui.getAllByText('Add')[0]);
  fireEvent.changeText(ui.getByLabelText('Entry date'), '2026-10-14');
  fireEvent.changeText(ui.getByLabelText('Entry details'), '02:00 PM - 04:00 PM');
  fireEvent.press(ui.getByText('Apply'));
  await waitFor(() => expect(ui.getByText('2026-10-14')).toBeTruthy(), { timeout: 5000 });
  ui.unmount();
});

test('a failed recreate after a successful remove refetches instead of showing a stale exception', async () => {
  // Not `INTERNAL_ERROR` — `messageFor` overrides that one with its own
  // friendly text regardless of what the server said, which is exactly right
  // for production but would make this test check its own fixture's wording
  // instead of the screen's. A code with no such override passes the real
  // message through unchanged.
  (doctorAvailabilityApi.setCustomHours as jest.Mock).mockRejectedValueOnce(
    new ApiError({ statusCode: 409, code: 'OVERLAPPING_AVAILABILITY', message: 'Two windows on this date overlap.' })
  );
  const ui = render(<AvailabilityScreen />);
  await loaded(ui);

  fireEvent.press(ui.getByText('24 May')); // o1, an existing exception — editing it removes then recreates
  fireEvent.changeText(ui.getByLabelText('Entry details'), '10:00 AM - 01:00 PM');
  fireEvent.press(ui.getByText('Apply'));

  await waitFor(() => expect(doctorAvailabilityApi.removeRule).toHaveBeenCalledWith('o1'), { timeout: 5000 });
  // the old rule really is gone server-side now, so the screen re-asks rather
  // than trusting a local guess
  await waitFor(() => expect(doctorAvailabilityApi.getDiary).toHaveBeenCalledTimes(2), { timeout: 5000 });
  await waitFor(() => expect(ui.getByText('Two windows on this date overlap.')).toBeTruthy(), { timeout: 5000 });
  ui.unmount();
});

test('weekly hours are editable and invalid ranges block saving', async () => {
  const onSaved = jest.fn();
  const ui = render(<AvailabilityScreen onSaved={onSaved} />);
  await loaded(ui);

  fireEvent.changeText(ui.getByLabelText('Start time Wednesday 1'), '11:00 PM');
  fireEvent.press(ui.getByTestId('save-schedule'));
  expect(onSaved).not.toHaveBeenCalled();
  expect(ui.getByText(/Check Wednesday/)).toBeTruthy();
  fireEvent.press(ui.getByText('Add hours'));
  const starts = ui.getAllByLabelText(/Start time Wednesday/);
  fireEvent.changeText(starts[starts.length - 1], '08:00 PM');
  expect(starts[starts.length - 1].props.value).toBe('08:00 PM');
  ui.unmount();
});

test('invalid dates stay in the editor without adding leave', async () => {
  const ui = render(<AvailabilityScreen />);
  await loaded(ui);

  fireEvent.press(ui.getByTestId('tab-timeoff'));
  fireEvent.press(ui.getByText('Add'));
  fireEvent.changeText(ui.getByLabelText('Entry date'), '2026-02-30');
  fireEvent.changeText(ui.getByLabelText('Entry details'), 'Leave');
  fireEvent.press(ui.getByText('Apply'));
  expect(ui.getByText('Enter a valid date as YYYY-MM-DD.')).toBeTruthy();
  expect(ui.getByLabelText('Entry date')).toBeTruthy();
  ui.unmount();
});

test('a failed save keeps the draft and tells the doctor why', async () => {
  (doctorAvailabilityApi.replaceWeekly as jest.Mock).mockRejectedValueOnce(
    new ApiError({ statusCode: 409, code: 'OVERLAPPING_AVAILABILITY', message: 'Two windows on Monday overlap.' })
  );
  const onSaved = jest.fn();
  const ui = render(<AvailabilityScreen onSaved={onSaved} />);
  await loaded(ui);

  fireEvent.press(ui.getByTestId('day-Mon'));
  fireEvent.changeText(ui.getByLabelText('Start time Monday 1'), '10:00 AM');
  fireEvent.press(ui.getByTestId('save-schedule'));

  await waitFor(() => expect(doctorAvailabilityApi.replaceWeekly).toHaveBeenCalled(), { timeout: 5000 });
  expect(onSaved).not.toHaveBeenCalled();
  // the draft survives the failure — nothing is lost, just not yet saved
  expect(ui.getByLabelText('Start time Monday 1').props.value).toBe('10:00 AM');
  ui.unmount();
});

test('changing the duration also saves to the profile — the weekly PUT does not carry it', async () => {
  const ui = render(<AvailabilityScreen />);
  await loaded(ui);

  fireEvent.press(ui.getByTestId('setting-duration'));
  fireEvent.press(ui.getByTestId('setting-option-45'));
  fireEvent.press(ui.getByTestId('save-schedule'));

  await waitFor(() => expect(doctorAvailabilityApi.replaceWeekly).toHaveBeenCalled(), { timeout: 10000 });
  await waitFor(
    () => expect(doctorProfileApi.updateProfile).toHaveBeenCalledWith({ consultationDurationMinutes: 45 }),
    { timeout: 10000 }
  );
  // buffer never moved, so it is never sent
  expect(doctorProfileApi.updateProfile).not.toHaveBeenCalledWith(expect.objectContaining({ bufferMinutes: expect.anything() }));
  ui.unmount();
});
