import { useCallback, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import {
  doctors,
  type Doctor,
  type DoctorDocument,
  type Region,
  type Reliability,
} from '../../api/admin';
import { useMutation, useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Card,
  ConfirmDialog,
  DefinitionList,
  EmptyState,
  Notice,
  PageHeader,
  PermissionGate,
  StatusBadge,
  Tabs,
  TextField,
  may,
} from '../../ui';
import { CredentialReview } from './CredentialReview';
import { AvailabilityEditor } from '../availability/AvailabilityEditor';

/**
 * One provider, in full (§20).
 *
 * The tab lives in the URL so refresh and Back keep it. Read-only panes use
 * `DefinitionList`; anything editable is a form — the two are visually
 * distinct, which is what §20 asks for.
 *
 * *** THE TWO GATES ARE SEPARATE AND IN ORDER. *** clinical_governance
 * verifies (the clinical decision); operations lists (the operational one),
 * and the backend refuses listing unless the provider is already verified.
 */

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'credentials', label: 'Credentials' },
  { id: 'availability', label: 'Availability' },
  { id: 'regions', label: 'Regions & languages' },
  { id: 'commercials', label: 'Commercials' },
  { id: 'reliability', label: 'Reliability' },
];

export function ProviderDetail({ level }: { level: AdminLevel }) {
  const { doctorId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';

  const fetcher = useCallback(() => doctors.get(doctorId), [doctorId]);
  const state = useResource<Doctor>(fetcher, [doctorId]);

  const setTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: true });
  };

  return (
    <Async state={state} resource="this provider">
      {(doctor) => (
        <>
          <PageHeader
            title={doctor.fullName}
            back={{ to: '/providers', label: 'Providers' }}
            crumbs={[{ label: 'Providers', to: '/providers' }, { label: doctor.fullName }]}
            description={
              <span className="row">
                <StatusBadge status={doctor.verificationStatus} />
                <StatusBadge status={doctor.isListed ? 'listed' : 'unlisted'} />
                {doctor.seniority && <StatusBadge status={doctor.seniority} />}
              </span>
            }
            actions={
              <VerificationActions doctor={doctor} level={level} onChanged={state.reload} />
            }
          />

          <Tabs tabs={TABS} active={tab} onChange={setTab} />

          {tab === 'overview' && <Overview doctor={doctor} />}
          {tab === 'credentials' && (
            <CredentialReview doctorId={doctor.id} level={level} onReviewed={state.reload} />
          )}
          {tab === 'availability' && <AvailabilityEditor doctorId={doctor.id} level={level} />}
          {tab === 'regions' && (
            <RegionsAndLanguages doctor={doctor} level={level} onChanged={state.reload} />
          )}
          {tab === 'commercials' && (
            <Commercials doctor={doctor} level={level} onChanged={state.reload} />
          )}
          {tab === 'reliability' && <ReliabilityPane doctorId={doctor.id} />}
        </>
      )}
    </Async>
  );
}

/* ----------------------------- verification ------------------------------- */

function VerificationActions({
  doctor,
  level,
  onChanged,
}: {
  doctor: Doctor;
  level: AdminLevel;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [listing, setListing] = useState(false);

  const verify = useMutation(doctors.verify);
  const reject = useMutation(doctors.reject);
  const reopen = useMutation(doctors.reopen);
  const setListed = useMutation(doctors.setListing);
  const suspend = useMutation(doctors.suspend);
  const reinstate = useMutation(doctors.reinstate);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      onChanged();
    } catch (e) {
      toast.fromError(e);
    }
  };

  const isVerified = doctor.verificationStatus === 'verified';
  const isRejected = doctor.verificationStatus === 'rejected';
  const isSuspended = doctor.verificationStatus === 'suspended';

  return (
    <>
      {/* Verify / reject / reopen — clinical_governance ONLY. Operations does
          not see a disabled button with a tooltip; it sees nothing (§18). */}
      <PermissionGate level={level} allow={['clinical_governance']}>
        {!isVerified && !isRejected && (
          <Button
            variant="success"
            icon="check"
            loading={verify.busy}
            onClick={() => run(() => verify.mutate(doctor.id), `${doctor.fullName} is verified.`)}
          >
            Verify
          </Button>
        )}
        {!isRejected && !isVerified && (
          <Button variant="danger" icon="close" onClick={() => setRejecting(true)}>
            Reject
          </Button>
        )}
        {isRejected && (
          <Button
            variant="secondary"
            icon="refresh"
            loading={reopen.busy}
            onClick={() =>
              run(() => reopen.mutate(doctor.id), `${doctor.fullName} is back in the queue.`)
            }
          >
            Reopen
          </Button>
        )}
      </PermissionGate>

      {/* Listing and suspension — operations. */}
      <PermissionGate level={level} allow={['operations']}>
        {isVerified && (
          <Button
            variant={doctor.isListed ? 'secondary' : 'primary'}
            loading={setListed.busy}
            onClick={() => (doctor.isListed ? setListing(true) : run(
              () => setListed.mutate(doctor.id, true),
              `${doctor.fullName} is now listed and assignable.`,
            ))}
          >
            {doctor.isListed ? 'Unlist' : 'List provider'}
          </Button>
        )}
        {isSuspended ? (
          <Button
            variant="secondary"
            loading={reinstate.busy}
            onClick={() =>
              run(() => reinstate.mutate(doctor.id), `${doctor.fullName} is reinstated.`)
            }
          >
            Reinstate
          </Button>
        ) : (
          <Button variant="danger" onClick={() => setSuspending(true)}>
            Suspend
          </Button>
        )}
      </PermissionGate>

      <ConfirmDialog
        open={rejecting}
        busy={reject.busy}
        onClose={() => setRejecting(false)}
        title={`Reject ${doctor.fullName}?`}
        confirmLabel="Reject provider"
        consequence={
          <>
            The provider stays on the platform but cannot be listed or assigned. This is{' '}
            <strong>reversible</strong> — Reopen puts them back in the credential queue.
          </>
        }
        reason={{
          label: 'Reason',
          hint: 'Shown to the provider in their app. Write it as instructions they can act on.',
          maxLength: 255,
        }}
        onConfirm={async (reason) => {
          await run(() => reject.mutate(doctor.id, reason), `${doctor.fullName} was rejected.`);
          setRejecting(false);
        }}
      />

      <ConfirmDialog
        open={suspending}
        busy={suspend.busy}
        onClose={() => setSuspending(false)}
        title={`Suspend ${doctor.fullName}?`}
        confirmLabel="Suspend provider"
        consequence={
          <>
            They are removed from the assignment pool immediately.{' '}
            <strong>Consultations already booked with them are not cancelled</strong> — each one
            still needs an override or a cancellation.
          </>
        }
        reason={{ label: 'Reason', maxLength: 255 }}
        onConfirm={async (reason) => {
          await run(() => suspend.mutate(doctor.id, reason), `${doctor.fullName} is suspended.`);
          setSuspending(false);
        }}
      />

      <ConfirmDialog
        open={listing}
        busy={setListed.busy}
        onClose={() => setListing(false)}
        title={`Unlist ${doctor.fullName}?`}
        confirmLabel="Unlist"
        consequence="They stay verified but leave the assignment pool, so no new booking reaches them."
        onConfirm={async () => {
          await run(
            () => setListed.mutate(doctor.id, false),
            `${doctor.fullName} is no longer listed.`,
          );
          setListing(false);
        }}
      />
    </>
  );
}

/* -------------------------------- overview -------------------------------- */

function Overview({ doctor }: { doctor: Doctor }) {
  return (
    <>
      {doctor.verificationStatus === 'rejected' && doctor.rejectionReason && (
        <Notice tone="danger">Rejected: {doctor.rejectionReason}</Notice>
      )}
      {doctor.verificationStatus === 'suspended' && doctor.suspensionReason && (
        <Notice tone="danger">Suspended: {doctor.suspensionReason}</Notice>
      )}
      {doctor.verificationStatus === 'verified' && !doctor.isListed && (
        <Notice tone="warning">
          Verified but not listed, so no booking can reach them. Listing is an operations action.
        </Notice>
      )}

      <Card title="Provider">
        <DefinitionList
          items={[
            { label: 'Full name', value: doctor.fullName },
            { label: 'Mobile (sign-in identifier)', value: doctor.mobileNumber },
            { label: 'Specialty', value: doctor.specialtyName },
            { label: 'Qualification', value: doctor.qualification },
            { label: 'Registration number', value: doctor.registrationNumber },
            {
              label: 'Experience',
              value: doctor.yearsOfExperience ? `${doctor.yearsOfExperience} years` : null,
            },
            { label: 'Verification', value: <StatusBadge status={doctor.verificationStatus} /> },
            {
              label: 'Listing',
              value: <StatusBadge status={doctor.isListed ? 'listed' : 'unlisted'} />,
            },
          ]}
        />
      </Card>
    </>
  );
}

/* --------------------------- regions & languages --------------------------- */

function RegionsAndLanguages({
  doctor,
  level,
  onChanged,
}: {
  doctor: Doctor;
  level: AdminLevel;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [languages, setLanguages] = useState((doctor.languages ?? []).join(', '));
  const [seniority, setSeniority] = useState(doctor.seniority ?? 'standard');
  const [promoting, setPromoting] = useState(false);

  const update = useMutation(doctors.update);
  const setSen = useMutation(doctors.setSeniority);

  const canEditPools = may(level, ['operations']);
  const canEditSeniority = may(level, ['clinical_governance']);

  return (
    <>
      <Card title="Allocation pools">
        <Notice tone="info">
          Language is <strong>never relaxed</strong> in assignment; region may be, depending on the
          allocation policy. A provider with no language set cannot be matched to anyone.
        </Notice>

        <TextField
          label="Languages"
          value={languages}
          disabled={!canEditPools}
          hint="Comma separated."
          onChange={(e) => setLanguages(e.target.value)}
        />

        {canEditPools && (
          <div className="formActions">
            <Button
              variant="primary"
              loading={update.busy}
              onClick={async () => {
                try {
                  await update.mutate(doctor.id, {
                    languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
                  });
                  toast.success('Languages updated.');
                  onChanged();
                } catch (e) {
                  toast.fromError(e);
                }
              }}
            >
              Save languages
            </Button>
          </div>
        )}
      </Card>

      <Card title="Seniority">
        <Notice tone="info">
          Expert seniority makes a provider <strong>eligible to be asked</strong> for case
          clarification. It grants sight of nothing on its own — each case is assigned
          individually, and that assignment is what reveals that one de-identified case.
        </Notice>

        <DefinitionList
          items={[{ label: 'Current', value: <StatusBadge status={doctor.seniority ?? 'standard'} /> }]}
        />

        {canEditSeniority && (
          <div className="formActions">
            <Button
              variant="secondary"
              onClick={() => {
                setSeniority(doctor.seniority === 'expert' ? 'standard' : 'expert');
                setPromoting(true);
              }}
            >
              {doctor.seniority === 'expert' ? 'Remove expert level' : 'Grant expert level'}
            </Button>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={promoting}
        busy={setSen.busy}
        onClose={() => setPromoting(false)}
        variant="primary"
        title={seniority === 'expert' ? 'Grant expert level?' : 'Remove expert level?'}
        confirmLabel="Confirm"
        consequence={
          seniority === 'expert' ? (
            <>
              This makes {doctor.fullName} <strong>eligible to be assigned</strong> clarification
              cases. It does not give them access to any case by itself.
            </>
          ) : (
            <>They will no longer appear in the expert list for new clarification cases.</>
          )
        }
        onConfirm={async () => {
          try {
            await setSen.mutate(doctor.id, seniority as 'standard' | 'expert');
            toast.success('Seniority updated.');
            onChanged();
          } catch (e) {
            toast.fromError(e);
          }
          setPromoting(false);
        }}
      />
    </>
  );
}

/* ------------------------------- commercials ------------------------------- */

function Commercials({
  doctor,
  level,
  onChanged,
}: {
  doctor: Doctor;
  level: AdminLevel;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [fee, setFee] = useState(String(doctor.payoutFeeInr ?? ''));
  const [duration, setDuration] = useState(String(doctor.consultationDurationMinutes ?? ''));
  const update = useMutation(doctors.update);
  const editable = may(level, ['operations']);

  if (!editable) {
    return (
      <Card title="Commercials">
        <DefinitionList
          items={[
            { label: 'Consultation fee', value: doctor.payoutFeeInr ? `₹${doctor.payoutFeeInr}` : null },
            {
              label: 'Duration',
              value: doctor.consultationDurationMinutes
                ? `${doctor.consultationDurationMinutes} min`
                : null,
            },
          ]}
        />
      </Card>
    );
  }

  return (
    <Card title="Commercials">
      <Notice tone="warning">
        Duration feeds assignability directly — a provider whose remaining window is shorter than
        the consultation plus its buffer is not assignable, so changing this changes who is
        bookable.
      </Notice>

      <div className="formGrid">
        <TextField
          label="Consultation fee (₹)"
          inputMode="numeric"
          value={fee}
          hint="The provider keeps all of it."
          onChange={(e) => setFee(e.target.value)}
        />
        <TextField
          label="Consultation duration (minutes)"
          inputMode="numeric"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
      </div>

      <div className="formActions">
        <Button
          variant="primary"
          loading={update.busy}
          onClick={async () => {
            try {
              await update.mutate(doctor.id, {
                ...(fee ? { payoutFeeInr: Number(fee) } : {}),
                ...(duration ? { consultationDurationMinutes: Number(duration) } : {}),
              });
              toast.success('Commercials updated.');
              onChanged();
            } catch (e) {
              toast.fromError(e);
            }
          }}
        >
          Save
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------- reliability ------------------------------- */

const pct = (n: number | null | undefined) =>
  n === null || n === undefined ? null : `${Math.round(n <= 1 ? n * 100 : n)}%`;

function ReliabilityPane({ doctorId }: { doctorId: string }) {
  const fetcher = useCallback(() => doctors.reliability(doctorId), [doctorId]);
  const state = useResource<Reliability>(fetcher, [doctorId]);

  return (
    <Async state={state} resource="reliability" skeletonRows={2}>
      {(r) => (
        <Card title="Reliability">
          <p className="muted">
            Read-only. The same figures roll up into the quality dashboard.
          </p>
          <DefinitionList
            items={[
              { label: 'Acceptance rate', value: pct(r.acceptanceRate) },
              { label: 'No-show rate', value: pct(r.noShowRate) },
              { label: 'Case-summary completion', value: pct(r.caseSummaryCompletion) },
              { label: 'Consultations completed', value: r.consultationsCompleted ?? null },
            ]}
          />
        </Card>
      )}
    </Async>
  );
}
