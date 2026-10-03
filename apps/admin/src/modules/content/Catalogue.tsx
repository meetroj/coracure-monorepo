import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  catalogue,
  type AllocationPolicy,
  type Concern,
  type Region,
  type Specialty,
} from '../../api/admin';
import { useMutation, useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Card,
  Column,
  EmptyState,
  Notice,
  PageHeader,
  SelectField,
  StatusBadge,
  Table,
  Tabs,
  TextField,
  may,
} from '../../ui';

/**
 * Specialties, concerns, regions and the allocation policy (§33).
 *
 * All of it exists so the client can change the product without an app
 * release. Two rules are surfaced in the UI because they are invariants, not
 * settings:
 *   - a specialty decides whether its providers may PRESCRIBE;
 *   - language is never relaxed in assignment, region may be.
 */

const TABS = [
  { id: 'specialties', label: 'Specialties' },
  { id: 'concerns', label: 'Concerns' },
  { id: 'regions', label: 'Regions' },
  { id: 'policy', label: 'Allocation policy' },
];

export function Catalogue({ level }: { level: AdminLevel }) {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'specialties';

  const setTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Catalogue"
        description="Specialties, concerns and regions are rows, not code. Adding one needs no app release."
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'specialties' && <Specialties level={level} />}
      {tab === 'concerns' && <Concerns level={level} />}
      {tab === 'regions' && <Regions level={level} />}
      {tab === 'policy' && <Policy level={level} />}
    </>
  );
}

/* ------------------------------- specialties ------------------------------- */

function Specialties({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const fetcher = useCallback(() => catalogue.specialties(), []);
  const state = useResource<Specialty[]>(fetcher, []);
  const create = useMutation(catalogue.createSpecialty);
  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState('doctor');

  const canWrite = may(level, ['content', 'clinical_governance']);

  const columns: Column<Specialty>[] = [
    { key: 'name', header: 'Specialty', render: (s) => <strong>{s.name}</strong> },
    {
      key: 'form',
      header: 'Registration form',
      render: (s) => (s.providerType === 'non_doctor' ? 'Non-doctor provider' : 'Doctor'),
    },
    {
      key: 'prescribe',
      header: 'May prescribe',
      render: (s) =>
        s.mayPrescribe === undefined ? (
          <span className="muted">-</span>
        ) : (
          <StatusBadge
            status={s.mayPrescribe ? 'verified' : 'rejected'}
            label={s.mayPrescribe ? 'Yes' : 'No'}
          />
        ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (s) => <StatusBadge status={s.isActive === false ? 'archived' : 'published'} />,
    },
  ];

  return (
    <>
      <Notice tone="info">
        The specialty decides which registration form applies, which credentials are mandatory, and{' '}
        <strong>whether its providers may prescribe</strong>. It also carries the intake form the
        patient app is meant to render - which it cannot read yet (gap G-4), so an intake form
        authored here does not reach a patient.
      </Notice>

      <Card title="Specialties">
        <Async
          state={state}
          resource="specialties"
          empty={<EmptyState icon="catalogue" title="No specialties yet" />}
        >
          {(rows) => (
            <Table caption="Specialties" columns={columns} rows={rows} rowKey={(s) => s.id} />
          )}
        </Async>
      </Card>

      {canWrite && (
        <Card title="Add a specialty">
          <div className="formGrid">
            <TextField
              label="Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <SelectField
              label="Registration form"
              value={providerType}
              onChange={(e) => setProviderType(e.target.value)}
              hint="Decides mandatory credentials and prescribing eligibility."
              options={[
                { value: 'doctor', label: 'Doctor' },
                { value: 'non_doctor', label: 'Non-doctor healthcare provider' },
              ]}
            />
          </div>
          <div className="formActions">
            <Button
              variant="primary"
              loading={create.busy}
              disabled={!name.trim()}
              onClick={async () => {
                try {
                  await create.mutate({ name: name.trim(), providerType });
                  toast.success('Specialty added.');
                  setName('');
                  state.reload();
                } catch (e) {
                  toast.fromError(e);
                }
              }}
            >
              Add specialty
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}

/* --------------------------------- concerns -------------------------------- */

function Concerns({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const fetcher = useCallback(() => catalogue.concerns(), []);
  const state = useResource<Concern[]>(fetcher, []);
  const create = useMutation(catalogue.createConcern);
  const [name, setName] = useState('');

  const canWrite = may(level, ['content', 'clinical_governance']);

  const columns: Column<Concern>[] = [
    { key: 'name', header: 'Concern', render: (c) => <strong>{c.name}</strong> },
    {
      key: 'phrases',
      header: 'Match phrases',
      render: (c) =>
        c.matchPhrases?.length ? c.matchPhrases.join(', ') : <span className="muted">None</span>,
    },
    { key: 'weight', header: 'Weight', align: 'end', render: (c) => c.weight ?? '-' },
  ];

  return (
    <>
      <Notice tone="info">
        Concerns are the symptom-to-specialty mapping the patient&apos;s search runs on. The app
        holds no keyword list of its own.
      </Notice>

      <Card title="Concerns">
        <Async
          state={state}
          resource="concerns"
          empty={<EmptyState icon="search" title="No concerns configured" />}
        >
          {(rows) => (
            <Table caption="Concerns" columns={columns} rows={rows} rowKey={(c) => c.id} />
          )}
        </Async>
      </Card>

      {canWrite && (
        <Card title="Add a concern">
          <TextField label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <div className="formActions">
            <Button
              variant="primary"
              loading={create.busy}
              disabled={!name.trim()}
              onClick={async () => {
                try {
                  await create.mutate({ name: name.trim() });
                  toast.success('Concern added.');
                  setName('');
                  state.reload();
                } catch (e) {
                  toast.fromError(e);
                }
              }}
            >
              Add concern
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}

/* --------------------------------- regions --------------------------------- */

function Regions({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const fetcher = useCallback(() => catalogue.regions(), []);
  const state = useResource<Region[]>(fetcher, []);
  const create = useMutation(catalogue.createRegion);
  const [name, setName] = useState('');

  const canWrite = may(level, ['content', 'operations']);

  const columns: Column<Region>[] = [
    { key: 'name', header: 'Region', render: (r) => <strong>{r.name}</strong> },
    {
      key: 'active',
      header: 'Status',
      render: (r) => <StatusBadge status={r.isActive === false ? 'archived' : 'published'} />,
    },
  ];

  return (
    <>
      <Notice tone="info">
        A region is a row, not an enum - adding one and putting providers into it needs no code
        change and no app release.
      </Notice>

      <Card title="Regions">
        <Async
          state={state}
          resource="regions"
          empty={<EmptyState icon="catalogue" title="No regions configured" />}
        >
          {(rows) => (
            <Table caption="Regions" columns={columns} rows={rows} rowKey={(r) => r.id} />
          )}
        </Async>
      </Card>

      {canWrite && (
        <Card title="Add a region">
          <TextField label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <div className="formActions">
            <Button
              variant="primary"
              loading={create.busy}
              disabled={!name.trim()}
              onClick={async () => {
                try {
                  await create.mutate({ name: name.trim() });
                  toast.success('Region added.');
                  setName('');
                  state.reload();
                } catch (e) {
                  toast.fromError(e);
                }
              }}
            >
              Add region
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}

/* ----------------------------- allocation policy --------------------------- */

function Policy({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const fetcher = useCallback(() => catalogue.allocationPolicy(), []);
  const state = useResource<AllocationPolicy>(fetcher, []);
  const update = useMutation(catalogue.updateAllocationPolicy);

  // Writing the policy is operations alone - reading is wider.
  const canWrite = may(level, ['operations']);

  return (
    <Async state={state} resource="the allocation policy" skeletonRows={2}>
      {(policy) => (
        <Card title="Allocation policy">
          <Notice tone="warning">
            <strong>Language is never relaxed.</strong> There is deliberately no toggle for it - a
            provider who does not speak the patient&apos;s language is never assignable. Region is
            the only dimension this policy can relax.
          </Notice>

          <label className="checkbox">
            <input
              type="checkbox"
              defaultChecked={Boolean(policy.mayRelaxRegion)}
              disabled={!canWrite || update.busy}
              onChange={async (e) => {
                try {
                  await update.mutate({ mayRelaxRegion: e.target.checked });
                  toast.success('Allocation policy updated.');
                  state.reload();
                } catch (err) {
                  toast.fromError(err);
                  state.reload();
                }
              }}
            />
            Allow region to be relaxed when nobody in the patient’s region is available
          </label>

          {!canWrite && (
            <p className="muted small">
              Read-only for your role - the allocation policy is written by operations.
            </p>
          )}
        </Card>
      )}
    </Async>
  );
}
