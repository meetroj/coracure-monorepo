import { useCallback } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  patients,
  type CheckInColour,
  type PatientDetailRecord,
} from '../../api/patients';
import { useResource } from '../../lib/useResource';
import { EditPatient } from './EditPatient';
import { PatientAccount } from './PatientAccount';
import { LIVE } from '../../api/live';
import { fromLiveRow } from '../../api/liveAppointments';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Card,
  CardSkeleton,
  Column,
  DefinitionList,
  DefinitionListSkeleton,
  EmptyState,
  Notice,
  PageHeader,
  PageHeaderSkeleton,
  StatusBadge,
  Table,
  TableSkeleton,
  Tabs,
  humanise,
  skeletonColumns,
} from '../../ui';
import { PatientStatusBadge, initials } from './Patients';
import {
  LiveFiles,
  LiveFollowUps,
  LivePayments,
  LivePrescriptions,
  LiveSupport,
  patientConsultations,
} from './PatientLiveTabs';
import { appointmentStatus } from '../../mock/ops/appointment';
import { findCaseRecord, followUps as followUpStore } from '../../mock/ops/care';
import { labOrders, partnerName } from '../../mock/ops/lab';
import { patientPayments } from '../../mock/ops/money';
import { feedbackItems, tickets } from '../../mock/ops/support';
import { inr } from '../kit/format';
import { useStore } from '../kit/store';

/**
 * One patient. The tab lives in the URL (`?tab=`) so refresh and Back keep it.
 *
 * *** DE-IDENTIFIED BY DESIGN. *** Logistics and status only: the data this
 * screen reads has no diagnoses, notes, prescriptions or file content in it.
 */

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'address', label: 'Address' },
  { id: 'consultations', label: 'Consultations' },
  { id: 'prescriptions', label: 'Prescriptions / Care Plans' },
  { id: 'files', label: 'Reports & Documents' },
  { id: 'followup', label: 'Follow-ups' },
  { id: 'payments', label: 'Payments' },
  { id: 'support', label: 'Support' },
  { id: 'consents', label: 'Consents' },
];

/** Live, every tab but Consents: the backend withholds a patient's consents from the admin on purpose. */
const LIVE_TABS = TABS.filter((t) => t.id !== 'consents');

const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : null);
const dateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : null);

const CHECKIN_TONE = { green: 'positive', amber: 'warning', red: 'danger' } as const;
const CheckIn = ({ colour }: { colour: CheckInColour | null }) =>
  colour ? (
    <StatusBadge status={colour} tone={CHECKIN_TONE[colour]} label={humanise(colour)} />
  ) : (
    <span className="muted">-</span>
  );

export function PatientDetail({ level }: { level: AdminLevel }) {
  const { patientId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tabs = LIVE ? LIVE_TABS : TABS;
  const wanted = params.get('tab') ?? 'overview';
  const tab = tabs.some((t) => t.id === wanted) ? wanted : 'overview';

  const fetcher = useCallback(() => patients.get(patientId), [patientId]);
  const state = useResource<PatientDetailRecord>(fetcher, [patientId]);

  const setTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: true });
  };

  // The kit's not-found state has no way back; this one does.
  if (state.error?.code === 'NOT_FOUND' || state.error?.code === 'PATIENT_NOT_FOUND') {
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
    <Async
      state={state}
      resource="this patient"
      skeleton={
        <>
          {/* The name and facts are the record's own; the tabs are the same for every patient. */}
          <PageHeaderSkeleton description actions={2} />
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
          <div className="stack">
            {tab === 'overview' ? (
              <>
                <CardSkeleton title="Overview">
                  <DefinitionListSkeleton items={8} />
                </CardSkeleton>
                <CardSkeleton title="Health profile (optional)" lines={2} />
              </>
            ) : (
              <CardSkeleton lines={4} />
            )}
          </div>
        </>
      }
    >
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
                {LIVE && <PatientAccount patient={p} level={level} onChanged={state.reload} />}
                <span className="avatar" aria-hidden="true">
                  {initials(p.fullName)}
                </span>
                <PatientStatusBadge status={p.status} />
                <span>{p.mobileNumber}</span>
                <span>
                  {p.age ?? '-'} · {p.gender}
                </span>
                <span>{p.language}</span>
              </span>
            }
          />

          <Tabs tabs={tabs} active={tab} onChange={setTab} />

          <div key={tab} className="fadeIn">
          {tab === 'overview' && <Overview p={p} />}
          {tab === 'address' && <Address p={p} />}
          {tab === 'consultations' && (LIVE ? <LiveConsultations patientId={p.id} /> : <Consultations p={p} />)}
          {tab === 'prescriptions' && (LIVE ? <LivePrescriptions patientId={p.id} /> : <Prescriptions p={p} />)}
          {tab === 'files' && (LIVE ? <LiveFiles patientId={p.id} /> : <Files p={p} />)}
          {tab === 'followup' && (LIVE ? <LiveFollowUps patientId={p.id} /> : <FollowUp p={p} />)}
          {tab === 'payments' && (LIVE ? <LivePayments patientId={p.id} /> : <Payments p={p} />)}
          {tab === 'support' && (LIVE ? <LiveSupport patientId={p.id} /> : <Support p={p} />)}
          {tab === 'consents' && <Consents p={p} />}
          </div>
        </>
      )}
    </Async>
  );
}

/* --------------------------------- panes ---------------------------------- */

function Overview({ p }: { p: PatientDetailRecord }) {
  return (
    <div className="stack">
      <Card title="Overview">
        <DefinitionList
          items={[
            { label: 'Name', value: p.fullName },
            { label: 'Mobile', value: p.mobileNumber },
            { label: 'Email', value: p.profile.email },
            { label: 'DOB', value: date(p.dateOfBirth) },
            { label: 'Age', value: p.age ?? '-' },
            { label: 'Gender', value: p.gender },
            { label: 'Account status', value: <PatientStatusBadge status={p.status} /> },
            { label: 'Patient ID', value: p.referenceCode },
          ]}
        />
      </Card>
      <Card title="Health profile (optional)">
        {LIVE ? (
          <p className="muted">
            Health details are the patient’s own report and are not shown in the admin panel. A clinical record is
            read per consultation.
          </p>
        ) : p.profile.health ? (
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
    </div>
  );
}

/** Location, PIN code and address - and no emergency contact (requirements §24). */
function Address({ p }: { p: PatientDetailRecord }) {
  const pr = p.profile;
  return (
    <Card title="Address">
      <DefinitionList
        items={[
          { label: 'Location', value: [pr.city, pr.district, pr.state].filter(Boolean).join(', ') },
          { label: 'PIN Code', value: pr.pinCode },
          { label: 'Address', value: [pr.addressLine1, pr.addressLine2].filter(Boolean).join(', ') },
        ]}
      />
    </Card>
  );
}

function Consultations({ p }: { p: PatientDetailRecord }) {
  const navigate = useNavigate();
  const columns: Column<PatientDetailRecord['consultations'][number]>[] = [
    {
      key: 'ref',
      header: 'Reference',
      render: (c) => (
        <Link to={`/appointments/${c.id}`} onClick={(e) => e.stopPropagation()}>
          {c.referenceCode}
        </Link>
      ),
    },
    { key: 'doctor', header: 'Consulting professional', render: (c) => c.doctorName ?? '-' },
    { key: 'service', header: 'Specialty / service', render: (c) => c.serviceName },
    { key: 'when', header: 'Consultation date', render: (c) => dateTime(c.startsAt) },
    {
      key: 'status',
      header: 'Appointment status',
      render: (c) => <StatusBadge status={appointmentStatus(c.status as never, c.id)} />,
    },
  ];
  if (p.consultations.length === 0)
    return <EmptyState icon="consultations" title="No consultations yet" />;
  const upcoming = p.consultations.filter((c) => new Date(c.startsAt).getTime() > Date.now() && c.status !== 'cancelled');
  const previous = p.consultations.filter((c) => !upcoming.includes(c));
  const table = (rows: typeof upcoming, caption: string) => (
    <Card title={caption}>
      {rows.length === 0 ? (
        <p className="muted">None.</p>
      ) : (
        <Table caption={caption} columns={columns} rows={rows} rowKey={(c) => c.id} onRowClick={(c) => navigate(`/appointments/${c.id}`)} />
      )}
    </Card>
  );
  return (
    <div className="stack">
      {table(upcoming, 'Upcoming consultations')}
      {table(previous, 'Previous consultations')}
    </div>
  );
}

/** The patient's bookings, live: the Appointments list with the patient fixed (`GET /admin/patients/:id/consultations`). */
function LiveConsultations({ patientId }: { patientId: string }) {
  const navigate = useNavigate();
  const fetcher = useCallback(() => patientConsultations(patientId), [patientId]);
  const state = useResource(fetcher, [patientId]);
  const columns: Column<ReturnType<typeof fromLiveRow>>[] = [
    {
      key: 'ref',
      header: 'Reference',
      render: (c) => (
        <Link to={`/appointments/${c.id}`} onClick={(e) => e.stopPropagation()}>
          {c.referenceCode}
        </Link>
      ),
    },
    { key: 'pro', header: 'Consulting professional', render: (c) => c.doctorName ?? <span className="muted">Not assigned</span> },
    { key: 'service', header: 'Specialty / service', render: (c) => c.serviceName ?? '-' },
    { key: 'when', header: 'Consultation date', render: (c) => dateTime(c.startsAt) },
    { key: 'status', header: 'Appointment status', render: (c) => <StatusBadge status={c.displayStatus ?? c.status} /> },
  ];
  return (
    <Async
      state={state}
      resource="this patient's consultations"
      skeleton={
        <TableSkeleton
          columns={skeletonColumns(columns, { ref: 'id', pro: 'name', when: 'date', status: 'status' })}
          rows={4}
          chevron
        />
      }
    >
      {({ rows, total }) =>
        rows.length === 0 ? (
          <EmptyState icon="consultations" title="No consultations yet" />
        ) : (
          <>
            <Table
              caption="Consultations"
              columns={columns}
              rows={rows}
              rowKey={(c) => c.id}
              onRowClick={(c) => navigate(`/appointments/${c.id}`)}
            />
            {total > rows.length && (
              <p className="muted">
                Showing the latest {rows.length} of {total}.
              </p>
            )}
          </>
        )
      }
    </Async>
  );
}

/** A Prescription for a doctor consultation, a Care Plan for an approved non-doctor one (§26). */
function Prescriptions({ p }: { p: PatientDetailRecord }) {
  const rows = p.consultations
    .filter((c) => c.status === 'completed' || c.status === 'awaiting_documentation')
    .map((c) => ({ c, record: findCaseRecord(c.id) }));
  if (rows.length === 0) return <EmptyState icon="clipboard" title="No prescriptions or care plans yet" description="They appear once a consultation has been held." />;
  return (
    <div className="stack">
      <Notice>Prescriptions open only inside authenticated CoraCure systems. They are never sent over WhatsApp.</Notice>
      <Table
        caption="Prescriptions and care plans"
        columns={[
          { key: 'type', header: 'Type', render: ({ record }) => <StatusBadge status="approved" tone="info" label={record?.kind === 'non_doctor' ? 'Care Plan' : 'Prescription'} /> },
          { key: 'ref', header: 'Case', render: ({ c }) => <Link to={`/case-records/${c.id}`}>{c.referenceCode}</Link> },
          { key: 'pro', header: 'Consulting professional', render: ({ c }) => c.doctorName ?? '-' },
          { key: 'when', header: 'Date', render: ({ c }) => dateTime(c.startsAt) },
        ]}
        rows={rows}
        rowKey={({ c }) => c.id}
      />
    </div>
  );
}

function Payments({ p }: { p: PatientDetailRecord }) {
  const rows = useStore(patientPayments).filter((x) => x.patientId === p.id);
  if (rows.length === 0) return <EmptyState icon="payments" title="No payments yet" />;
  return (
    <Table
      caption="Payments"
      columns={[
        { key: 'service', header: 'Payment', render: (x) => (x.service === 'lab' ? 'Lab payment' : 'Consultation payment') },
        { key: 'ref', header: 'Reference', render: (x) => <Link to={x.to}>{x.ref}</Link> },
        { key: 'amount', header: 'Amount', align: 'end', render: (x) => inr(x.amountInr) },
        { key: 'status', header: 'Payment status', render: (x) => <StatusBadge status={x.status} /> },
        { key: 'refund', header: 'Refund', render: (x) => (x.refund === 'none' ? <span className="muted">None</span> : <StatusBadge status={x.refund} />) },
        { key: 'txn', header: 'Transaction reference', render: (x) => <code>{x.txn}</code> },
      ]}
      rows={rows}
      rowKey={(x) => x.id}
    />
  );
}

function Support({ p }: { p: PatientDetailRecord }) {
  const mine = useStore(tickets).filter((t) => t.patientId === p.id);
  const feedback = useStore(feedbackItems).filter((f) => f.from === p.fullName);
  return (
    <div className="stack">
      <Card title="Support tickets">
        {mine.length === 0 ? (
          <p className="muted">No support tickets.</p>
        ) : (
          <Table
            caption="Support tickets"
            columns={[
              { key: 'code', header: 'Ticket', render: (t) => t.code },
              { key: 'subject', header: 'Subject', render: (t) => t.subject },
              { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
              { key: 'priority', header: 'Priority', render: (t) => <StatusBadge status={t.priority} /> },
            ]}
            rows={mine}
            rowKey={(t) => t.id}
          />
        )}
      </Card>
      <Card title="Complaints">
        <Complaints p={p} />
      </Card>
      <Card title="Feedback">
        {feedback.length === 0 ? (
          <p className="muted">No feedback from this patient.</p>
        ) : (
          <ul className="plainList">
            {feedback.map((f) => (
              <li key={f.id}>
                {f.rating} / 5 about {f.about}: {f.comment}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function FollowUp({ p }: { p: PatientDetailRecord }) {
  const columns: Column<PatientDetailRecord['followUps'][number]>[] = [
    {
      key: 'case',
      header: 'Case ID',
      // Opens the case this plan belongs to; the row itself has no other click action.
      render: (f) => <Link to={`/appointments/${f.consultationId}`}>{f.consultationRef}</Link>,
    },
    { key: 'plan', header: 'Plan', render: (f) => f.planName },
    { key: 'status', header: 'Status', render: (f) => <StatusBadge status={f.status === 'active' ? 'in_progress' : f.status} label={humanise(f.status)} /> },
    { key: 'started', header: 'Started', render: (f) => date(f.startedAt) },
    { key: 'ended', header: 'Ended', render: (f) => date(f.endsAt) ?? <span className="muted">Ongoing</span> },
    { key: 'checkin', header: 'Check-in', render: (f) => <CheckIn colour={f.checkIn} /> },
    { key: 'last', header: 'Last check-in', render: (f) => date(f.lastCheckInAt) ?? '-' },
  ];
  const plans = useStore(followUpStore).filter((f) => f.patientId === p.id);
  if (p.followUps.length === 0 && plans.length === 0)
    return <EmptyState icon="clipboard" title="No follow-up plans" />;
  return (
    <div className="stack">
      {plans.map((f) => (
        <Card key={f.id} title={f.planName}>
          <DefinitionList
            items={[
              { label: 'Follow-up status', value: <StatusBadge status={f.status} /> },
              { label: 'Patient responses', value: f.patientResponse ?? 'Not received yet' },
              { label: 'Provider review', value: f.providerReview ?? 'Not reviewed yet' },
              { label: 'Follow-up recommendation', value: f.recommendation ?? 'None' },
            ]}
          />
        </Card>
      ))}
      {p.followUps.length > 0 && <Table caption="Follow-up plans" columns={columns} rows={p.followUps} rowKey={(f) => f.id} />}
    </div>
  );
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
      <Card title="Lab reports">
        <LabReportsList patientId={p.id} />
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
            <Link to={`/support-tickets/${c.id}`} onClick={(e) => e.stopPropagation()}>
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
      onRowClick={(c) => navigate(`/support-tickets/${c.id}`)}
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

function LabReportsList({ patientId }: { patientId: string }) {
  const rows = useStore(labOrders).filter((o) => o.patientId === patientId && o.reportDate);
  if (rows.length === 0) return <p className="muted">No lab reports yet.</p>;
  return (
    <Table
      caption="Lab reports"
      columns={[
        { key: 'order', header: 'Lab order', render: (o) => o.code },
        { key: 'partner', header: 'Lab partner', render: (o) => partnerName(o.partnerId) },
        { key: 'at', header: 'Report date', render: (o) => date(o.reportDate) },
        { key: 'st', header: 'Report status', render: (o) => <StatusBadge status={o.reportStatus} /> },
      ]}
      rows={rows}
      rowKey={(o) => o.id}
    />
  );
}
