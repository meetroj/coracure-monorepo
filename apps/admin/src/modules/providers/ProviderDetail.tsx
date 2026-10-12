import { useCallback, useState, type ReactNode } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';

import {
  doctors,
  type Doctor,
  type DoctorDocument,
  type Region,
  type Reliability,
} from '../../api/admin';
import { LIVE } from '../../api/live';
import { LANGUAGE_HINT, providerRegions } from '../../api/liveProviders';
import { regions as regionList } from '../../api/liveScheduling';
import { useMutation, useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Card,
  CardSkeleton,
  ConfirmDialog,
  DefinitionList,
  DefinitionListSkeleton,
  EmptyState,
  Notice,
  PageHeader,
  PageHeaderSkeleton,
  PermissionGate,
  SkeletonBlock,
  StatusBadge,
  Tabs,
  TabsSkeleton,
  TextField,
  may,
} from '../../ui';
import { CredentialReview, DocumentTableSkeleton, SECTIONS } from './CredentialReview';
import { EditDoctor } from './EditDoctor';
import { EditProviderLive } from './ProviderFormsLive';
import { AvailabilityEditor } from '../availability/AvailabilityEditor';
import { PatientFacingCard, ScheduleCard, SignaturePane } from './ProviderExtras';
import { AccountBadge, CATEGORY_LABEL, ProviderAvatar, VerificationBadge, isDoctor } from './provider';

/**
 * One provider, in full (§20).
 *
 * The tab lives in the URL so refresh and Back keep it. Read-only panes use
 * `DefinitionList`; anything editable is a form - the two are visually
 * distinct, which is what §20 asks for.
 *
 * *** THE TWO GATES ARE SEPARATE AND IN ORDER. *** clinical_governance
 * verifies (the clinical decision); operations lists (the operational one),
 * and the backend refuses listing unless the provider is already verified.
 */

const tabsFor = (doctor: Doctor) => [
  { id: 'overview', label: 'Profile' },
  { id: 'consultation', label: 'Consultation settings' },
  ...(isDoctor(doctor) ? [{ id: 'signature', label: 'Digital signature' }] : []),
  { id: 'availability', label: 'Availability' },
  { id: 'regions', label: 'Regions & languages' },
  { id: 'reliability', label: 'Reliability' },
];

/** Opened from Verification: the tabs are the review sections (§21), nothing else. */
const verifyTabsFor = (doctor: Doctor) =>
  SECTIONS.filter((s) => s.id !== 'basic' && (s.id !== 'signature' || isDoctor(doctor))).map((s) => ({ id: s.id, label: s.title }));

export function ProviderDetail({ level }: { level: AdminLevel }) {
  const { doctorId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const verifying = useLocation().pathname.startsWith('/verification/');
  const wanted = params.get('tab') ?? '';

  const fetcher = useCallback(() => doctors.get(doctorId), [doctorId]);
  const state = useResource<Doctor>(fetcher, [doctorId]);
  // The decision is taken on the whole record: not before the documents under
  // review have loaded. (Once they have, a refetch does not lock it again.)
  const [docsLoaded, setDocsLoaded] = useState(false);
  const markDocsLoaded = useCallback(() => setDocsLoaded(true), []);

  const setTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: true });
  };

  return (
    <Async
      state={state}
      resource="this doctor"
      // The tab set depends on the provider's category, so the tabs are neutral here.
      skeleton={
        <>
          <PageHeaderSkeleton description actions={verifying ? 3 : 2} />
          <TabsSkeleton count={verifying ? 5 : 6} />
          {verifying ? (
            <>
              <CardSkeleton title="Declared by the doctor">
                <DefinitionListSkeleton items={3} />
              </CardSkeleton>
              <CardSkeleton title="Documents">
                <DocumentTableSkeleton />
              </CardSkeleton>
            </>
          ) : (
            <>
              <CardSkeleton title="Basic details">
                <DefinitionListSkeleton items={6} />
              </CardSkeleton>
              <CardSkeleton title="Proof of identity">
                <DefinitionListSkeleton items={3} />
              </CardSkeleton>
            </>
          )}
        </>
      }
    >
      {(doctor) => {
        const TABS = tabsFor(doctor);
        const VERIFY_TABS = verifyTabsFor(doctor);
        const tab = verifying
          ? VERIFY_TABS.some((t) => t.id === wanted)
            ? wanted
            : VERIFY_TABS[0].id
          : TABS.some((t) => t.id === wanted)
            ? wanted
            : 'overview';
        return (
        <>
          <PageHeader
            back={{ to: verifying ? '/verification' : '/providers', label: 'Back' }}
            title={doctor.fullName}
            description={
              <span className="row">
                <ProviderAvatar name={doctor.fullName} photoUrl={doctor.photoUrl} size={40} />
                <VerificationBadge status={doctor.verificationStatus} />
                <AccountBadge doctor={doctor} />
                <StatusBadge status={doctor.category ?? 'doctor'} tone="neutral" label={CATEGORY_LABEL[doctor.category ?? 'doctor']} />
                {doctor.seniority === 'expert' && <StatusBadge status="expert" />}
              </span>
            }
            actions={
              <>
                {/* Editing details belongs to the doctor's own page, not the verification review. */}
                {/* Editing belongs to the provider's own page, not the verification review. */}
                {!verifying &&
                  (LIVE ? (
                    <EditProviderLive doctor={doctor} level={level} onSaved={state.reload} />
                  ) : (
                    <EditDoctor doctor={doctor} level={level} onSaved={state.reload} />
                  ))}
                <VerificationActions
                  doctor={doctor}
                  level={level}
                  onChanged={state.reload}
                  locked={verifying && !docsLoaded}
                />
              </>
            }
          />

          <Tabs tabs={verifying ? VERIFY_TABS : TABS} active={tab} onChange={setTab} />

          <div key={tab} className="fadeIn">
          {verifying && (
            <>
              <VerifyDetails
                doctor={doctor}
                section={tab}
              />
              {/* Basic details has no documents to approve - just the one card. */}
              {tab !== 'basic' && (
                <CredentialReview
                  doctorId={doctor.id}
                  level={level}
                  onReviewed={state.reload}
                  onLoaded={markDocsLoaded}
                  section={tab}
                />
              )}
            </>
          )}
          {!verifying && tab === 'overview' && <Overview doctor={doctor} />}
          {!verifying && tab === 'consultation' && (
            <>
              {/* Days and windows are the provider's own, set in their app; the live detail does not carry them. */}
              {!LIVE && <ScheduleCard doctor={doctor} />}
              <Commercials doctor={doctor} level={level} onChanged={state.reload} />
            </>
          )}
          {!verifying && tab === 'signature' && (
            <SignaturePane doctor={doctor} level={level} onChanged={state.reload} />
          )}
          {!verifying && tab === 'availability' && <AvailabilityEditor doctorId={doctor.id} level={level} />}
          {!verifying && tab === 'regions' && (
            <RegionsAndLanguages doctor={doctor} level={level} onChanged={state.reload} />
          )}
          {!verifying && tab === 'reliability' && <ReliabilityPane doctorId={doctor.id} />}
          </div>
        </>
        );
      }}
    </Async>
  );
}

/* ----------------------------- verification ------------------------------- */

function VerificationActions({
  doctor,
  level,
  onChanged,
  locked = false,
}: {
  doctor: Doctor;
  level: AdminLevel;
  onChanged: () => void;
  /** The documents under review are still loading: the review decision waits for them. */
  locked?: boolean;
}) {
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [listing, setListing] = useState(false);

  const verify = useMutation(doctors.verify);
  const reject = useMutation(doctors.reject);
  const requestChanges = useMutation(doctors.requestChanges);
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
      {/* Verify / reject / reopen - clinical_governance ONLY. Operations does
          not see a disabled button with a tooltip; it sees nothing (§18). */}
      <PermissionGate level={level} allow={['clinical_governance']}>
        {!isVerified && !isRejected && !isSuspended && (
          <Button
            variant="success"
            icon="check"
            loading={verify.busy}
            disabled={locked}
            onClick={() => run(() => verify.mutate(doctor.id), `${doctor.fullName} is approved.`)}
          >
            Approve
          </Button>
        )}
        {!isRejected && !isVerified && !isSuspended && (
          <Button variant="secondary" disabled={locked} onClick={() => setRequesting(true)}>
            Changes required
          </Button>
        )}
        {!isRejected && !isVerified && !isSuspended && (
          <Button variant="danger" icon="close" disabled={locked} onClick={() => setRejecting(true)}>
            Reject
          </Button>
        )}
        {isRejected && (
          <Button
            variant="secondary"
            icon="refresh"
            loading={reopen.busy}
            disabled={locked}
            onClick={() =>
              run(() => reopen.mutate(doctor.id), `${doctor.fullName} is back in the queue.`)
            }
          >
            Reopen
          </Button>
        )}
      </PermissionGate>

      {/* Listing - operations only, as the backend has it. */}
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
            {doctor.isListed ? 'Unlist' : 'List doctor'}
          </Button>
        )}
      </PermissionGate>

      {/* Suspension - operations and clinical governance. */}
      <PermissionGate level={level} allow={['operations', 'clinical_governance']}>
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
        open={requesting}
        busy={requestChanges.busy}
        onClose={() => setRequesting(false)}
        variant="primary"
        title={`Ask ${doctor.fullName} for changes?`}
        confirmLabel="Request changes"
        consequence={
          <>
            The provider is sent back to fix something and resubmit. Nothing is rejected, and
            they stay out of the assignment pool until approved.
          </>
        }
        reason={{
          label: 'What needs to change',
          hint: 'Shown to the provider word for word. Write it as instructions they can act on.',
          maxLength: 255,
        }}
        onConfirm={async (reason) => {
          await run(() => requestChanges.mutate(doctor.id, reason), `Changes requested from ${doctor.fullName}.`);
          setRequesting(false);
        }}
      />

      <ConfirmDialog
        open={rejecting}
        busy={reject.busy}
        onClose={() => setRejecting(false)}
        title={`Reject ${doctor.fullName}?`}
        confirmLabel="Reject doctor"
        consequence={
          <>
            The provider stays on the platform but cannot be listed or assigned. This is{' '}
            <strong>reversible</strong> - Reopen puts them back in Document verification.
          </>
        }
        reason={{
          label: 'Reason',
          hint: 'Shown to the doctor in their app. Write it as instructions they can act on.',
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
        confirmLabel="Suspend doctor"
        consequence={
          <>
            They are removed from the assignment pool immediately.{' '}
            <strong>Consultations already booked with them are not cancelled</strong> - each one
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

const dateLabel = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : null);

/** What the doctor stated in the sign-up form, for the reviewer. Private: never shown to patients. */
function RegistrationDetails({ doctor }: { doctor: Doctor }) {
  const r = doctor.registration!;
  return (
    <Card title="Registration details">
      <DefinitionList
        items={[
          { label: 'Date of birth', value: dateLabel(r.dateOfBirth) },
          { label: 'Gender', value: r.gender },
          { label: 'Email', value: doctor.email },
          { label: 'Registration number', value: doctor.registrationNumber },
          { label: 'Government ID', value: r.idType ? `${r.idType} · ending ${r.idNumberLast4 ?? '-'}` : null },
          { label: 'ABHA ID / address', value: r.abhaId },
          { label: 'Basic qualification', value: r.basicQualification },
          { label: 'PG specialisation', value: r.pgSpecialisation },
          { label: 'Super specialisation', value: r.superSpecialisation },
          { label: 'Fellowship', value: r.fellowship },
          { label: 'Prescription signature', value: r.hasSignature ? 'Uploaded' : 'Not uploaded' },
        ]}
      />
      {r.experience && r.experience.length > 0 && (
        <>
          <h3 className="subhead">Experience</h3>
          <ul>
            {r.experience.map((x, i) => (
              <li key={i}>
                <strong>{x.designation}</strong> - {x.institution}, {x.years} {x.years === 1 ? 'year' : 'years'}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

const yesNo = (v?: boolean | null, yes = 'Uploaded', no = 'Not uploaded') => (v ? yes : no);

const Verified = ({ ok, what }: { ok?: boolean; what: string }) =>
  ok ? (
    <StatusBadge status="verified" label={what} />
  ) : (
    <StatusBadge status="pending" label="Not verified" />
  );

/** What the doctor declared for one review section, shown above that section's documents. */
/**
 * Shown only when the registration call was refused. The backend lets clinical
 * governance and operations read what a provider stated about themselves.
 */
const NOT_VISIBLE = 'Only clinical governance and operations can read these:';

function VerifyDetails({
  doctor,
  section,
  title = 'Declared by the doctor',
}: {
  doctor: Doctor;
  section: string;
  title?: string;
}) {
  const r = doctor.registration;
  let items: { label: string; value: ReactNode }[];
  let note: ReactNode = null;

  if (section === 'basic') {
    items = [
      {
        label: 'Profile photo (optional)',
        value: doctor.photoUrl ? (
          <ProviderAvatar name={doctor.fullName} photoUrl={doctor.photoUrl} size={72} />
        ) : LIVE ? (
          'No photo uploaded yet.'
        ) : (
          yesNo(r?.hasPhoto)
        ),
      },
      { label: 'Full name', value: doctor.fullName },
      { label: 'Date of birth', value: dateLabel(r?.dateOfBirth) },
      { label: 'Gender', value: r?.gender },
      {
        label: 'Mobile number',
        value: doctor.mobileNumber ? (
          <span className="row">
            {doctor.mobileNumber} <Verified ok={r?.mobileVerified} what="OTP verified" />
          </span>
        ) : null,
      },
      {
        label: 'Email address',
        value: doctor.email ? (
          <span className="row">
            {doctor.email} <Verified ok={r?.emailVerified} what="Verified" />
          </span>
        ) : null,
      },
      {
        label: 'Languages for consultation',
        value: doctor.languages && doctor.languages.length > 0 ? doctor.languages.join(', ') : null,
      },
    ];
    if (LIVE && !r?.loaded) note = <Notice tone="warning">{NOT_VISIBLE} Date of birth, gender and e-mail address.</Notice>;
  } else if (section === 'identity') {
    items = [
      { label: 'Government ID type', value: r?.idType },
      // Only the last four characters are ever held in the admin view.
      { label: 'Government ID number', value: r?.idNumberLast4 ? `•••• ${r.idNumberLast4}` : null },
      { label: 'ABHA ID / address (optional)', value: r?.abhaId },
    ];
    if (LIVE && !r?.loaded) note = <Notice tone="warning">{NOT_VISIBLE} Government ID, ID number and ABHA ID.</Notice>;
  } else if (section === 'qualification' && LIVE && !r?.basicQualification) {
    items = [{ label: 'Qualifications (as shown to patients)', value: doctor.qualification }];
    note = <p className="muted">The degree certificate stays private and is used only for verification.</p>;
  } else if (section === 'qualification') {
    const shown = [r?.basicQualification, r?.pgSpecialisation, r?.superSpecialisation, r?.fellowship]
      .filter(Boolean)
      .join(' · ');
    items = [
      { label: 'Basic qualification', value: r?.basicQualification },
      { label: 'PG specialisation (optional)', value: r?.pgSpecialisation },
      { label: 'Super specialisation (optional)', value: r?.superSpecialisation },
      { label: 'Fellowship (optional)', value: r?.fellowship },
    ];
    note = (
      <p className="muted">
        Shown to patients as: <strong>{shown || '-'}</strong>. The degree certificate stays private
        and is used only for verification.
      </p>
    );
  } else if (section === 'registration') {
    items = [
      { label: 'Registration number', value: doctor.registrationNumber },
      { label: 'Registration council', value: doctor.registrationCouncil },
    ];
    note = <p className="muted">The registration certificate stays private and is used only for verification.</p>;
  } else if (section === 'experience' && LIVE && !r?.loaded) {
    items = [
      {
        label: 'Total experience',
        value: doctor.yearsOfExperience != null ? `${doctor.yearsOfExperience} ${doctor.yearsOfExperience === 1 ? 'year' : 'years'}` : null,
      },
    ];
    note = <Notice tone="warning">{NOT_VISIBLE} Designation and institution per entry.</Notice>;
  } else if (section === 'experience') {
    const entries = r?.experience ?? [];
    const total = entries.reduce((sum, x) => sum + x.years, 0);
    items = [
      {
        label: 'Entries',
        value:
          entries.length > 0 ? (
            <ul style={{ display: 'grid', gap: 10, margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.5 }}>
              {entries.map((x, i) => (
                <li key={i}>
                  <strong>{x.designation}</strong> - {x.institution}, {x.years} {x.years === 1 ? 'year' : 'years'}
                </li>
              ))}
            </ul>
          ) : null,
      },
    ];
    note = (
      <p className="muted">
        Shown to patients as: <strong>{total} Years of Experience</strong> - nothing about the
        institution, designation or certificates.
      </p>
    );
  } else {
    items = [{ label: 'Prescription signature', value: yesNo(r?.hasSignature) }];
    note = (
      <p className="muted">
        JPG or PNG. Kept private and placed automatically on this doctor&apos;s prescriptions once
        approved.
      </p>
    );
  }

  return (
    <Card title={title}>
      <DefinitionList items={items} />
      {note}
    </Card>
  );
}

function Overview({ doctor }: { doctor: Doctor }) {
  return (
    <>
      {doctor.verificationStatus === 'rejected' && doctor.rejectionReason && (
        <Notice tone="danger">Rejected: {doctor.rejectionReason}</Notice>
      )}
      {doctor.verificationStatus === 'changes_required' && doctor.changesRequiredNote && (
        <Notice tone="warning">Changes required: {doctor.changesRequiredNote}</Notice>
      )}
      {doctor.verificationStatus === 'suspended' && doctor.suspensionReason && (
        <Notice tone="danger">Suspended: {doctor.suspensionReason}</Notice>
      )}
      {doctor.verificationStatus === 'verified' && !doctor.isListed && (
        <Notice tone="warning">
          Verified but not listed, so no booking can reach them. Listing is an operations action.
        </Notice>
      )}

      {SECTIONS.filter((x) => x.id !== 'signature' || isDoctor(doctor)).map((x) => (
        <VerifyDetails key={x.id} doctor={doctor} section={x.id} title={x.profileTitle} />
      ))}
      <PatientFacingCard />
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
          hint={LIVE ? `Comma separated: ${LANGUAGE_HINT}.` : 'Comma separated.'}
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

      {LIVE && <ServiceRegions doctorId={doctor.id} editable={canEditPools} />}

      <Card title="Seniority">
        <Notice tone="info">
          Expert seniority makes a provider <strong>eligible to be asked</strong> for case
          clarification. It grants sight of nothing on its own - each case is assigned
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

/* ------------------------------ service regions ----------------------------- */

/**
 * The regions a provider serves (live only). Language is never relaxed in
 * assignment and region may be, depending on the allocation policy, so an
 * empty set is a provider who is matched only when the policy relaxes region.
 */
function ServiceRegions({ doctorId, editable }: { doctorId: string; editable: boolean }) {
  const toast = useToast();
  const fetcher = useCallback(
    async () => {
      const [all, mine] = await Promise.all([regionList.list(), providerRegions.get(doctorId)]);
      return { all: all.filter((r) => r.isActive || mine.includes(r.id)), mine };
    },
    [doctorId],
  );
  const state = useResource<{ all: { id: string; name: string }[]; mine: string[] }>(fetcher, [doctorId]);
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Async
      state={state}
      resource="regions"
      // Which boxes are ticked is the provider's own; the card and its title are not.
      skeleton={
        <CardSkeleton title="Service regions">
          <div className="formGrid">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonBlock key={i} w={i % 2 ? '55%' : '70%'} h={20} />
            ))}
          </div>
        </CardSkeleton>
      }
    >
      {({ all, mine }) => {
        const current = chosen ?? mine;
        const toggle = (id: string) =>
          setChosen(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
        const dirty = chosen !== null && [...chosen].sort().join() !== [...mine].sort().join();
        return (
          <Card title="Service regions">
            {all.length === 0 ? (
              <p className="muted">No regions have been set up in Master data yet.</p>
            ) : (
              <div className="formGrid">
                {all.map((r) => (
                  <label className="checkbox" key={r.id}>
                    <input
                      type="checkbox"
                      checked={current.includes(r.id)}
                      disabled={!editable || busy}
                      onChange={() => toggle(r.id)}
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            )}
            {editable && dirty && (
              <div className="formActions">
                <Button variant="secondary" disabled={busy} onClick={() => setChosen(null)}>
                  Reset
                </Button>
                <Button
                  variant="primary"
                  loading={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await providerRegions.set(doctorId, chosen ?? []);
                      toast.success('Regions updated.');
                      setChosen(null);
                      state.reload();
                    } catch (e) {
                      toast.fromError(e);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Save regions
                </Button>
              </div>
            )}
          </Card>
        );
      }}
    </Async>
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
            { label: LIVE ? 'Payout fee' : 'Consultation fee', value: doctor.payoutFeeInr ? `₹${doctor.payoutFeeInr}` : null },
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
        Duration feeds assignability directly - a provider whose remaining window is shorter than
        the consultation plus its buffer is not assignable, so changing this changes who is
        bookable.
      </Notice>

      <div className="formGrid">
        <TextField
          label={LIVE ? 'Payout fee (₹)' : 'Consultation fee (₹)'}
          inputMode="numeric"
          value={fee}
          hint={LIVE ? 'What the provider is paid. The patient is charged the specialty fee.' : 'The doctor keeps all of it.'}
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
    <Async
      state={state}
      resource="reliability"
      skeleton={
        <CardSkeleton title="Reliability">
          <DefinitionListSkeleton items={4} />
        </CardSkeleton>
      }
    >
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
