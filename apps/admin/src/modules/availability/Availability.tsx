import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { catalogue, scheduling, type AssignableProvider, type Region, type Specialty } from '../../api/admin';
import { useResource } from '../../lib/useResource';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Card,
  Column,
  EmptyState,
  Notice,
  SelectField,
  StatusBadge,
  Table,
  TextField,
} from '../../ui';

/**
 * Assignability - a real screen, not a modal (§22).
 *
 * It answers the question an admin is always actually asking when a patient
 * says nobody was available: who is assignable for this service, language,
 * region and time, and how much unbroken duration do they have left.
 *
 * *** REMAINING DURATION IS THE POINT. *** A provider whose remaining window
 * is shorter than the consultation plus its buffer is NOT assignable even
 * though they look free at the start time (FR-10.7).
 *
 * Every query parameter is in the URL so a coverage question can be pasted to
 * another admin and re-opened exactly.
 */
export function Availability({ level }: { level: AdminLevel }) {
  const [params, setParams] = useSearchParams();

  const serviceId = params.get('serviceId') ?? '';
  const language = params.get('language') ?? '';
  const regionId = params.get('regionId') ?? '';
  const at = params.get('at') ?? '';

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const specialtiesFetcher = useCallback(() => catalogue.specialties(), []);
  const specialties = useResource<Specialty[]>(specialtiesFetcher, []);
  const regionsFetcher = useCallback(() => catalogue.regions(), []);
  const regions = useResource<Region[]>(regionsFetcher, []);

  // The lookup only runs once there is something to look up - an unfiltered
  // "who is free, ever" is not a question this endpoint answers.
  const ready = Boolean(at);
  const fetcher = useCallback(
    () => scheduling.remaining({ serviceId, language, regionId, at }),
    [serviceId, language, regionId, at],
  );
  const state = useResource<AssignableProvider[]>(fetcher, [serviceId, language, regionId, at], ready);

  const columns: Column<AssignableProvider>[] = [
    {
      key: 'name',
      header: 'Doctor',
      render: (p) => (
        <span className="cellStack">
          <Link to={`/providers/${p.doctorId}`}>
            <strong>{p.fullName}</strong>
          </Link>
          <small>{p.languages?.length ? p.languages.join(', ') : 'No languages set'}</small>
        </span>
      ),
    },
    {
      key: 'remaining',
      header: 'Unbroken time left',
      render: (p) =>
        p.remainingMinutes === null || p.remainingMinutes === undefined ? (
          <span className="muted">-</span>
        ) : (
          `${p.remainingMinutes} min`
        ),
    },
    {
      key: 'assignable',
      header: 'Assignable',
      render: (p) => (
        <span className="cellStack">
          <StatusBadge
            status={p.assignable === false ? 'rejected' : 'verified'}
            label={p.assignable === false ? 'No' : 'Yes'}
          />
          {p.reason && <small>{p.reason}</small>}
        </span>
      ),
    },
  ];

  return (
    <div className="stack">
      <Card title="Coverage lookup">
        <Notice tone="info">
          A provider free at the start time is still not assignable if the unbroken window left is
          shorter than the consultation plus its buffer. That is what the column on the right
          answers.
        </Notice>

        <div className="formGrid">
          <SelectField
            label="Service / specialty"
            value={serviceId}
            onChange={(e) => setParam('serviceId', e.target.value)}
            options={[
              { value: '', label: specialties.loading ? 'Loading…' : 'Any' },
              ...(specialties.data ?? []).map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <TextField
            label="Language"
            value={language}
            hint="Never relaxed in assignment."
            onChange={(e) => setParam('language', e.target.value)}
          />
          <SelectField
            label="Region"
            value={regionId}
            onChange={(e) => setParam('regionId', e.target.value)}
            options={[
              { value: '', label: regions.loading ? 'Loading…' : 'Any' },
              ...(regions.data ?? []).map((r) => ({ value: r.id, label: r.name })),
            ]}
          />
          <TextField
            label="Date and time"
            type="datetime-local"
            required
            value={at}
            onChange={(e) => setParam('at', e.target.value)}
          />
        </div>
      </Card>

      {!ready ? (
        <EmptyState
          icon="clock"
          title="Pick a date and time"
          description="Coverage is always a question about a specific moment, so the lookup needs one before it can answer."
        />
      ) : (
        <Async
          state={state}
          resource="assignable providers"
          empty={
            <EmptyState
              icon="alert"
              title="Nobody is assignable at that time"
              description="This is what a patient sees as NO_PROVIDER_AVAILABLE. Widen the region, or check the diaries of the providers who should have been free."
              action={
                <Link to="/providers">
                  <Button variant="secondary">Open providers</Button>
                </Link>
              }
            />
          }
        >
          {(rows) => (
            <Table
              caption="Assignable providers"
              columns={columns}
              rows={rows}
              rowKey={(p) => p.doctorId}
            />
          )}
        </Async>
      )}
    </div>
  );
}
