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
 * editor loads the current pattern first and always sends it complete — a
 * partial send would silently delete the rest of the week. That is the single
 * most dangerous thing on this screen and it is why there is no "save this one
 * day" button.
 *
 * `OVERLAPPING_AVAILABILITY`, `INVALID_TIME_RANGE` and `DATE_IN_THE_PAST` are
 * ordinary mistakes here, so they land as inline errors, not toasts.
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type WeeklyRow = { dayOfWeek: number; startTime: string; endTime: string; enabled: boolean };

const toRows = (rules: AvailabilityRule[]): WeeklyRow[] =>
  DAYS.map((_, day) => {
    const rule = rules.find((r) => r.ruleType === 'weekly' && r.dayOfWeek === day);
    return {
      dayOfWeek: day,
      startTime: rule?.startTime ?? '09:00',
      endTime: rule?.endTime ?? '17:00',
      enabled: Boolean(rule),
    };
  });

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

  const set = (day: number, patch: Partial<WeeklyRow>) =>
    setRows((current) => current.map((r) => (r.dayOfWeek === day ? { ...r, ...patch } : r)));

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
    const bad = enabled.find((r) => r.startTime >= r.endTime);
    if (bad) {
      setFieldError(`${DAYS[bad.dayOfWeek]}: the end time must be after the start time.`);
      return;
    }
    try {
      // The COMPLETE pattern, every time — the endpoint replaces, not merges.
      await save.mutate(
        doctorId,
        enabled.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
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

        <div className="weekGrid">
          {rows.map((row) => (
            <div className="weekGrid__row" key={row.dayOfWeek}>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  disabled={!editable}
                  onChange={(e) => set(row.dayOfWeek, { enabled: e.target.checked })}
                />
                {DAYS[row.dayOfWeek]}
              </label>
              <input
                type="time"
                value={row.startTime}
                disabled={!editable || !row.enabled}
                aria-label={`${DAYS[row.dayOfWeek]} start`}
                onChange={(e) => set(row.dayOfWeek, { startTime: e.target.value })}
              />
              <span className="muted">to</span>
              <input
                type="time"
                value={row.endTime}
                disabled={!editable || !row.enabled}
                aria-label={`${DAYS[row.dayOfWeek]} end`}
                onChange={(e) => set(row.dayOfWeek, { endTime: e.target.value })}
              />
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
            <div>
              <TextField
                label="Block a date"
                type="date"
                value={blockDate}
                hint="Takes the provider out of the pool for the whole day."
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

            <div>
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
