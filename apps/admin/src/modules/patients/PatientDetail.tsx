import { useCallback } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  patients,
  type CheckInColour,
  type PatientDetailRecord,
} from '../../api/patients';
import { useResource } from '../../lib/useResource';
import { EditPatient } from './EditPatient';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Card,
  Column,
  DefinitionList,
  EmptyState,
  Notice,
  PageHeader,
  StatusBadge,
  Table,
  Tabs,
  humanise,
} from '../../ui';
import { PatientStatusBadge, initials } from './Patients';

/**
 * One patient. The tab lives in the URL (`?tab=`) so refresh and Back keep it.
 *
 * *** DE-IDENTIFIED BY DESIGN. *** Logistics and status only: the data this
 * screen reads has no diagnoses, notes, prescriptions or file content in it.
 */

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'consultations', label: 'Consultations' },
  { id: 'followup', label: 'Follow-up' },
  { id: 'files', label: 'Reports & files' },
  { id: 'complaints', label: 'Complaints' },
  { id: 'consents', label: 'Consents' },
];

const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : null);
const dateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : null);

const CHECKIN_TONE = { green: 'positive', amber: 'warning', red: 'danger' } as const;
const CheckIn = ({ colour }: { colour: CheckInColour | null }) =>
  colour ? (
    <StatusBadge status={colour} tone={CHECKIN_TONE[colour]} label={humanise(colour)} />
  ) : (
    <span className="muted">—</span>
  );

export function PatientDetail({ level }: { level: AdminLevel }) {
  const { patientId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';

  const fetcher = useCallback(() => patients.get(patientId), [patientId]);
  const state = useResource<PatientDetailRecord>(fetcher, [patientId]);

  const setTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: true });
  };

  // The kit's not-found state has no way back; this one does.
  if (state.error?.code === 'NOT_FOUND') {
    return (
      <EmptyState
        icon="users"
        title="Patient not found"
        description="The patient may have been removed, or the link may be out of date."
        action={
          <Link to="/patients">
            <Button variant="secondary" icon="arrowLeft">
              Back to patients
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <Async state={state} resource="this patient">
      {(p) => (
        <>
          <PageHeader
            title={p.fullName}
            description={
              <span className="row">
                <span>{p.region}</span>
                <span>Joined {date(p.joinedAt)}</span>
              </span>
            }
            actions={
              <span className="headerFacts">
                <EditPatient patient={p} level={level} onSaved={state.reload} />
                <span className="avatar" aria-hidden="true">
                  {initials(p.fullName)}
                </span>
                <PatientStatusBadge status={p.status} />
                <span>{p.mobileNumber}</span>
                <span>
                  {p.age} · {p.gender}
                </span>
                <span>{p.language}</span>
              </span>
            }
          />

          <Tabs tabs={TABS} active={tab} onChange={setTab} />

          {tab === 'overview' && <Overview p={p} />}
          {tab === 'consultations' && <Consultations p={p} />}
          {tab === 'followup' && <FollowUp p={p} />}
          {tab === 'files' && <Files p={p} />}
          {tab === 'complaints' && <Complaints p={p} />}
          {tab === 'consents' && <Consents p={p} />}
        </>
      )}
    </Async>
  );
}

/* --------------------------------- panes ---------------------------------- */

function Overview({ p }: { p: PatientDetailRecord }) {
  // Recent activity, newest first, built from what the other tabs hold.
  const events = [
    ...p.consultations.map((c) => ({
      at: c.startsAt,
      text: `Consultation ${c.referenceCode} (${c.serviceName}) — ${humanise(c.status)}`,
    })),
    ...p.complaints.map((c) => ({ at: c.raisedAt, text: `Complaint raised: ${c.subject}` })),
    ...p.files.map((f) => ({ at: f.uploadedAt, text: `Uploaded ${f.name} (${f.category})` })),
    ...p.followUps
      .filter((f) => f.lastCheckInAt)
      .map((f) => ({ at: f.lastCheckInAt as string, text: `Check-in on ${f.planName}` })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  return (
    <div className="stack">
      <Card title="Basic details">
        <DefinitionList
          items={[
            { label: 'Full name', value: p.fullName },
            { label: 'Date of birth', value: date(p.dateOfBirth) },
            { label: 'Age', value: p.age },
            { label: 'Gender', value: p.gender },
            { label: 'Mobile number', value: p.mobileNumber },
            { label: 'Email address', value: p.profile.email },
            { label: 'Preferred language(s)', value: p.profile.languages.join(', ') },
            { label: 'Profile photo (optional)', value: p.profile.photoUploaded ? 'Uploaded' : 'Not uploaded' },
            { label: 'Joined', value: date(p.joinedAt) },
          ]}
        />
      </Card>
      <Card title="Contact details">
        <DefinitionList
          items={[
            { label: 'Address line 1', value: p.profile.addressLine1 },
            { label: 'Address line 2 (optional)', value: p.profile.addressLine2 },
            { label: 'City', value: p.profile.city },
            { label: 'District (optional)', value: p.profile.district },
            { label: 'State', value: p.profile.state },
            { label: 'PIN code', value: p.profile.pinCode },
            { label: 'Country', value: p.profile.country },
          ]}
        />
      </Card>
      <Card title="Health profile (optional)">
        {p.profile.health ? (
          <DefinitionList
            items={[
              { label: 'Blood group', value: p.profile.health.bloodGroup },
              { label: 'Height', value: p.profile.health.heightCm ? `${p.profile.health.heightCm} cm` : null },
              { label: 'Weight', value: p.profile.health.weightKg ? `${p.profile.health.weightKg} kg` : null },
              { label: 'Allergies', value: p.profile.health.allergies },
              { label: 'Chronic conditions', value: p.profile.health.chronicConditions },
              { label: 'Regular medications', value: p.profile.health.regularMedications },
            ]}
          />
        ) : (
          <p className="muted">The patient has not filled in a health profile.</p>
        )}
      </Card>
      <Card title="Key facts">
        <DefinitionList
          items={[
            { label: 'Patient ID', value: p.referenceCode },
            { label: 'Consultations', value: p.consultationCount },
            { label: 'Last consultation', value: date(p.lastConsultationAt) },
            { label: 'Last active', value: dateTime(p.lastActiveAt) },
            { label: 'Open complaints', value: p.hasOpenComplaint ? 'Yes' : 'None' },
            { label: 'Active follow-up', value: p.hasActiveFollowUp ? 'Yes' : 'None' },
          ]}
        />
      </Card>
      <Card title="Recent activity">
        {events.length === 0 ? (
          <p className="muted">No activity yet.</p>
        ) : (
          <ol className="timeline">
            {events.map((e, i) => (
              <li key={i} className="timeline__item">
                <span className="timeline__date">{date(e.at)}</span>
                <span className="timeline__text">{e.text}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function Consultations({ p }: { p: PatientDetailRecord }) {
  const navigate = useNavigate();
  const columns: Column<PatientDetailRecord['consultations'][number]>[] = [
    {
      key: 'ref',
      header: 'Reference',
      render: (c) => (
        <Link to={`/consultations/${c.id}`} onClick={(e) => e.stopPropagation()}>
          {c.referenceCode}
        </Link>
      ),
    },
    { key: 'service', header: 'Service', render: (c) => c.serviceName },
    { key: 'doctor', header: 'Doctor', render: (c) => c.doctorName ?? '—' },
    { key: 'when', header: 'When', render: (c) => dateTime(c.startsAt) },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
  ];
  if (p.consultations.length === 0)
    return <EmptyState icon="consultations" title="No consultations yet" />;
  return (
    <Table
      caption="Consultations"
      columns={columns}
      rows={p.consultations}
      rowKey={(c) => c.id}
      onRowClick={(c) => navigate(`/consultations/${c.id}`)}
    />
  );
}

function FollowUp({ p }: { p: PatientDetailRecord }) {
  const columns: Column<PatientDetailRecord['followUps'][number]>[] = [
    {
      key: 'case',
      header: 'Case ID',
      // Opens the case this plan belongs to; the row itself has no other click action.
      render: (f) => <Link to={`/consultations/${f.consultationId}`}>{f.consultationRef}</Link>,
    },
    { key: 'plan', header: 'Plan', render: (f) => f.planName },
    { key: 'status', header: 'Status', render: (f) => <StatusBadge status={f.status === 'active' ? 'in_progress' : f.status} label={humanise(f.status)} /> },
    { key: 'started', header: 'Started', render: (f) => date(f.startedAt) },
    { key: 'ended', header: 'Ended', render: (f) => date(f.endsAt) ?? <span className="muted">Ongoing</span> },
    { key: 'checkin', header: 'Check-in', render: (f) => <CheckIn colour={f.checkIn} /> },
    { key: 'last', header: 'Last check-in', render: (f) => date(f.lastCheckInAt) ?? '—' },
  ];
  if (p.followUps.length === 0)
    return <EmptyState icon="clipboard" title="No follow-up plans" />;
  return <Table caption="Follow-up plans" columns={columns} rows={p.followUps} rowKey={(f) => f.id} />;
}

function Files({ p }: { p: PatientDetailRecord }) {
  return (
    <div className="stack">
      <Notice>Names and categories only. File content is not available in the admin panel.</Notice>
      <Card title="Uploaded files">
        {p.files.length === 0 ? (
          <p className="muted">No files uploaded.</p>
        ) : (
          <Table
            caption="Uploaded files"
            columns={[
              { key: 'name', header: 'File', render: (f) => f.name },
              { key: 'cat', header: 'Category', render: (f) => f.category },
              { key: 'at', header: 'Uploaded', render: (f) => date(f.uploadedAt) },
            ]}
            rows={p.files}
            rowKey={(f) => f.id}
          />
        )}
      </Card>
      <Card title="Report requests">
        {p.reportRequests.length === 0 ? (
          <p className="muted">No report requests.</p>
        ) : (
          <Table
            caption="Report requests"
            columns={[
              { key: 'title', header: 'Report', render: (r) => r.title },
              { key: 'at', header: 'Requested', render: (r) => date(r.requestedAt) },
              {
                key: 'status',
                header: 'Status',
                render: (r) => (
                  <StatusBadge
                    status={r.status}
                    tone={r.status === 'received' ? 'positive' : r.status === 'overdue' ? 'danger' : 'warning'}
                  />
                ),
              },
            ]}
            rows={p.reportRequests}
            rowKey={(r) => r.id}
          />
        )}
      </Card>
    </div>
  );
}

function Complaints({ p }: { p: PatientDetailRecord }) {
  const navigate = useNavigate();
  if (p.complaints.length === 0)
    return <EmptyState icon="alert" title="No complaints" />;
  return (
    <Table
      caption="Complaints"
      columns={[
        {
          key: 'subject',
          header: 'Subject',
          render: (c) => (
            <Link to={`/complaints/${c.id}`} onClick={(e) => e.stopPropagation()}>
              {c.subject}
            </Link>
          ),
        },
        { key: 'cat', header: 'Category', render: (c) => humanise(c.category) },
        { key: 'at', header: 'Raised', render: (c) => date(c.raisedAt) },
        { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
      ]}
      rows={p.complaints}
      rowKey={(c) => c.id}
      onRowClick={(c) => navigate(`/complaints/${c.id}`)}
    />
  );
}

function Consents({ p }: { p: PatientDetailRecord }) {
  return (
    <Table
      caption="Accepted legal documents"
      columns={[
        { key: 'doc', header: 'Document', render: (c) => c.documentType },
        { key: 'ver', header: 'Version', render: (c) => c.version },
        { key: 'at', header: 'Accepted', render: (c) => dateTime(c.acceptedAt) },
      ]}
      rows={p.consents}
      rowKey={(c) => c.documentType}
    />
  );
}
