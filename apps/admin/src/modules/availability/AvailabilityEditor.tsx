import { useCallback, useMemo, useState } from 'react';
import { ApiError } from '@coracure/api/errors';

import { scheduling, type AvailabilityRule, type Slot } from '../../api/admin';
import { useMutation, useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Card,
  EmptyState,
  IconButton,
  Notice,
  TextField,
  may,
} from '../../ui';

/**
 * A provider's diary, edited on their behalf (§21).
 *
 * *** THE WEEKLY PUT REPLACES THE WHOLE PATTERN. *** It is not a merge. So the
 * editor loads the current pattern first and always sends it complete - a
 * partial send would silently delete the rest of the week. That is the single
 * most dangerous thing on this screen and it is why there is no "save this one
 * day" button.
 *
 * `OVERLAPPING_AVAILABILITY`, `INVALID_TIME_RANGE` and `DATE_IN_THE_PAST` are
 * ordinary mistakes here, so they land as inline errors, not toasts.
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Range = { from: string; to: string };

/** A day can carry several windows, e.g. a morning clinic and an evening one. */
type WeeklyRow = { dayOfWeek: number; enabled: boolean; ranges: Range[] };

const toRows = (rules: AvailabilityRule[]): WeeklyRow[] =>
  DAYS.map((_, day) => {
    const ranges = rules
      .filter((r) => r.ruleType === 'weekly' && r.dayOfWeek === day)
      .map((r) => ({ from: r.startTime ?? '09:00', to: r.endTime ?? '17:00' }))
      .sort((x, y) => x.from.localeCompare(y.from));
    return {
      dayOfWeek: day,
      enabled: ranges.length > 0,
      ranges: ranges.length > 0 ? ranges : [{ from: '09:00', to: '17:00' }],
    };
  });

/** The next window offered after the last one, so "Add hours" lands somewhere sensible. */
const nextRange = (ranges: Range[]): Range => {
  const last = ranges[ranges.length - 1]?.to ?? '09:00';
  const from = last < '16:00' ? '16:00' : last;
  return { from, to: from < '19:00' ? '19:00' : '23:00' };
};

/** One message per day, naming it - same wording style as the doctor's own app. */
const checkDay = (row: WeeklyRow): string | null => {
  if (!row.enabled) return null;
  const day = DAYS[row.dayOfWeek];
  for (let i = 0; i < row.ranges.length; i++) {
    if (row.ranges[i].from >= row.ranges[i].to)
      return `Check ${day}: hours ${i + 1} must end after they start.`;
  }
  const sorted = row.ranges
    .map((r, i) => ({ ...r, i }))
    .sort((x, y) => x.from.localeCompare(y.from));
  for (let k = 1; k < sorted.length; k++) {
    if (sorted[k].from < sorted[k - 1].to)
      return `Check ${day}: hours ${sorted[k - 1].i + 1} and ${sorted[k].i + 1} overlap.`;
  }
  return null;
};

export function AvailabilityEditor({
  doctorId,
  level,
}: {
  doctorId: string;
  level: AdminLevel;
}) {
  const toast = useToast();
  const editable = may(level, ['operations', 'care_coordinator']);

  const fetcher = useCallback(() => scheduling.availability(doctorId), [doctorId]);
  const state = useResource<AvailabilityRule[]>(fetcher, [doctorId]);

  return (
    <Async state={state} resource="this diary">
      {(rules) => (
        <Weekly
          doctorId={doctorId}
          rules={rules}
          editable={editable}
          onSaved={state.reload}
          toastError={(e: unknown) => toast.fromError(e)}
          toastOk={(m: string) => toast.success(m)}
        />
      )}
    </Async>
  );
}

function Weekly({
  doctorId,
  rules,
  editable,
  onSaved,
  toastOk,
  toastError,
}: {
  doctorId: string;
  rules: AvailabilityRule[];
  editable: boolean;
  onSaved: () => void;
  toastOk: (m: string) => void;
  toastError: (e: unknown) => void;
}) {
  const [rows, setRows] = useState<WeeklyRow[]>(() => toRows(rules));
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [blockDate, setBlockDate] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [customFrom, setCustomFrom] = useState('09:00');
  const [customTo, setCustomTo] = useState('13:00');

  const save = useMutation(scheduling.replaceWeekly);
  const block = useMutation(scheduling.block);
  const custom = useMutation(scheduling.customHours);
  const remove = useMutation(scheduling.deleteRule);

  const exceptions = useMemo(
    () => rules.filter((r) => r.ruleType !== 'weekly'),
    [rules],
  );

  const patchDay = (day: number, fn: (row: WeeklyRow) => WeeklyRow) =>
    setRows((current) => current.map((r) => (r.dayOfWeek === day ? fn(r) : r)));

  const setRange = (day: number, index: number, patch: Partial<Range>) =>
    patchDay(day, (r) => ({
      ...r,
      ranges: r.ranges.map((x, i) => (i === index ? { ...x, ...patch } : x)),
    }));

  /** Maps the backend's scheduling codes onto the field they belong to. */
  const asFieldError = (e: unknown): boolean => {
    const code = ApiError.of(e)?.code;
    if (code === 'OVERLAPPING_AVAILABILITY') {
      setFieldError('Those hours overlap another rule for the same day.');
      return true;
    }
    if (code === 'INVALID_TIME_RANGE') {
      setFieldError('The end time must be after the start time.');
      return true;
    }
    if (code === 'DATE_IN_THE_PAST') {
      setFieldError('That date has already passed.');
      return true;
    }
    return false;
  };

  const saveWeekly = async () => {
    setFieldError(null);
    const enabled = rows.filter((r) => r.enabled);
    for (const row of enabled) {
      const problem = checkDay(row);
      if (problem) {
        setFieldError(problem);
        return;
      }
    }
    try {
      // The COMPLETE pattern, every time - the endpoint replaces, not merges.
      await save.mutate(
        doctorId,
        enabled.flatMap((r) =>
          r.ranges.map((x) => ({ dayOfWeek: r.dayOfWeek, startTime: x.from, endTime: x.to })),
        ),
      );
      toastOk('Weekly pattern replaced.');
      onSaved();
    } catch (e) {
      if (!asFieldError(e)) toastError(e);
    }
  };

  return (
    <>
      <Card title="Weekly pattern">
        <Notice tone="warning">
          Saving <strong>replaces the whole week</strong>. Every day switched off here is removed
          from the provider’s diary, not left alone.
        </Notice>

        <div className="weekDays">
          {rows.map((row) => (
            <div className="weekDay" key={row.dayOfWeek}>
              <label className="checkbox weekDay__name">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  disabled={!editable}
                  onChange={(e) => patchDay(row.dayOfWeek, (r) => ({ ...r, enabled: e.target.checked }))}
                />
                {DAYS[row.dayOfWeek]}
              </label>

              <div className="weekDay__ranges">
                {row.ranges.map((range, i) => (
                  <div className="weekDay__range" key={i}>
                    <input
                      type="time"
                      value={range.from}
                      disabled={!editable || !row.enabled}
                      aria-label={`${DAYS[row.dayOfWeek]} start${i ? ` ${i + 1}` : ''}`}
                      onChange={(e) => setRange(row.dayOfWeek, i, { from: e.target.value })}
                    />
                    <span className="muted">to</span>
                    <input
                      type="time"
                      value={range.to}
                      disabled={!editable || !row.enabled}
                      aria-label={`${DAYS[row.dayOfWeek]} end${i ? ` ${i + 1}` : ''}`}
                      onChange={(e) => setRange(row.dayOfWeek, i, { to: e.target.value })}
                    />
                    {editable && row.enabled && row.ranges.length > 1 && (
                      <IconButton
                        icon="trash"
                        label={`Remove ${DAYS[row.dayOfWeek]} hours ${i + 1}`}
                        onClick={() =>
                          patchDay(row.dayOfWeek, (r) => ({
                            ...r,
                            ranges: r.ranges.filter((_, j) => j !== i),
                          }))
                        }
                      />
                    )}
                  </div>
                ))}
                {editable && row.enabled && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="plus"
                    onClick={() =>
                      patchDay(row.dayOfWeek, (r) => ({ ...r, ranges: [...r.ranges, nextRange(r.ranges)] }))
                    }
                  >
                    Add hours
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {fieldError && <p className="fieldError">{fieldError}</p>}

        {editable && (
          <div className="formActions">
            <Button variant="secondary" onClick={() => setRows(toRows(rules))} disabled={save.busy}>
              Reset
            </Button>
            <Button variant="primary" loading={save.busy} onClick={saveWeekly}>
              Replace weekly pattern
            </Button>
          </div>
        )}
      </Card>

      {editable && (
        <Card title="Exceptions">
          <div className="formGrid">
            <div className="exceptionBlock">
              <TextField
                label="Block a date"
                type="date"
                value={blockDate}
                hint="Takes the doctor out of the pool for the whole day."
                onChange={(e) => setBlockDate(e.target.value)}
              />
              <Button
                variant="secondary"
                loading={block.busy}
                disabled={!blockDate}
                onClick={async () => {
                  setFieldError(null);
                  try {
                    await block.mutate(doctorId, { date: blockDate });
                    toastOk('Date blocked.');
                    setBlockDate('');
                    onSaved();
                  } catch (e) {
                    if (!asFieldError(e)) toastError(e);
                  }
                }}
              >
                Block date
              </Button>
            </div>

            <div className="exceptionBlock">
              <TextField
                label="Override one date’s hours"
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
              />
              <div className="row">
                <input
                  type="time"
                  aria-label="Override start"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
                <span className="muted">to</span>
                <input
                  type="time"
                  aria-label="Override end"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                loading={custom.busy}
                disabled={!customDate}
                onClick={async () => {
                  setFieldError(null);
                  try {
                    await custom.mutate(doctorId, {
                      date: customDate,
                      startTime: customFrom,
                      endTime: customTo,
                    });
                    toastOk('Hours overridden for that date.');
                    setCustomDate('');
                    onSaved();
                  } catch (e) {
                    if (!asFieldError(e)) toastError(e);
                  }
                }}
              >
                Set custom hours
              </Button>
            </div>
          </div>

          {exceptions.length > 0 && (
            <ul className="ruleList">
              {exceptions.map((rule) => (
                <li key={rule.id}>
                  <span>
                    <strong>{rule.ruleType === 'blocked' ? 'Blocked' : 'Custom hours'}</strong>{' '}
                    {rule.date}
                    {rule.startTime && ` · ${rule.startTime}–${rule.endTime}`}
                  </span>
                  <IconButton
                    icon="trash"
                    label="Remove this rule"
                    onClick={async () => {
                      try {
                        await remove.mutate(doctorId, rule.id);
                        toastOk('Rule removed.');
                        onSaved();
                      } catch (e) {
                        toastError(e);
                      }
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <SlotPreview doctorId={doctorId} />
    </>
  );
}

/** What the provider is actually offering once every rule composes (§21). */
function SlotPreview({ doctorId }: { doctorId: string }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const fetcher = useCallback(() => scheduling.slots(doctorId, date), [doctorId, date]);
  const state = useResource<Slot[]>(fetcher, [doctorId, date]);

  return (
    <Card title="Resulting slots">
      <p className="muted">
        What the rules above actually produce. Check here rather than reading the pattern.
      </p>
      <TextField
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="narrowField"
      />

      <Async
        state={state}
        resource="slots"
        skeletonRows={2}
        empty={
          <EmptyState
            icon="clock"
            title="No slots on this date"
            description="Either nothing is scheduled, or a block or override removed the hours."
          />
        }
      >
        {(slots) => (
          <ul className="slotList">
            {slots.map((slot) => (
              <li key={slot.startsAt}>
                {new Date(slot.startsAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </li>
            ))}
          </ul>
        )}
      </Async>
    </Card>
  );
}
