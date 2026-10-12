import { Link, useNavigate, useParams } from 'react-router-dom';

import * as db from '../../mock/db';
import { LIVE } from '../../api/live';
import { CaseRecordDetailLive, CaseRecordsLive } from './CaseRecordsLive';
import {
  APPOINTMENT_STATUSES,
  caseRecords,
  clarifications,
  findCaseRecord,
  followUps,
  summaryOf,
  type CaseRecord,
} from '../../mock/ops/care';
import type { AdminLevel } from '../../nav';
import { Button, Card, DefinitionList, EmptyState, Notice, PageHeader, StatusBadge, humanise, type Column } from '../../ui';
import { CATEGORY_LABEL } from '../providers/provider';
import { fmtDateTime, opts } from '../kit/format';
import { ListScreen, type ListFilter } from '../kit/ListScreen';
import { useStore } from '../kit/store';

/**
 * Case Records (requirements §34-§47): the complete record of one consultation.
 *
 * *** TWO STRUCTURES, NEVER MIXED (§42). *** A doctor's case has Clinical Notes &
 * Diagnosis and a Prescription. A non-doctor's has an Assessment & Care Plan and
 * a Care Plan - and never the words Provisional Diagnosis or Treating Doctor.
 * The shared label is Consulting Professional (§35).
 */

function FixtureCaseRecords({ level: _level }: { level: AdminLevel }) {
  const navigate = useNavigate();
  const rows = caseRecords();

  const filters: ListFilter<CaseRecord>[] = [
    { key: 'category', label: 'Provider category', options: Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label })), test: (r, v) => r.providerCategory === v },
    { key: 'appointment', label: 'Appointment status', options: opts(APPOINTMENT_STATUSES), test: (r, v) => r.status === v },
    {
      key: 'structure',
      label: 'Record type',
      options: [
        { value: 'doctor', label: 'Prescription (doctor)' },
        { value: 'non_doctor', label: 'Care Plan (non-doctor)' },
      ],
      test: (r, v) => r.kind === v,
    },
  ];

  const columns: Column<CaseRecord>[] = [
    {
      key: 'ref',
      header: 'Case',
      render: (r) => (
        <span className="cellStack">
          <strong>{r.referenceCode}</strong>
          <small>{r.kind === 'doctor' ? 'Prescription' : 'Care Plan'}</small>
        </span>
      ),
    },
    { key: 'patient', header: 'Patient', render: (r) => r.patientName },
    { key: 'pro', header: 'Consulting Professional', render: (r) => r.professionalName },
    { key: 'cat', header: 'Provider category', render: (r) => CATEGORY_LABEL[r.providerCategory] },
    { key: 'spec', header: 'Specialty / professional category', render: (r) => r.specialty },
    { key: 'when', header: 'Consultation date/time', render: (r) => fmtDateTime(r.startsAt) },
    { key: 'dur', header: 'Duration', render: (r) => (r.durationMinutes ? `${r.durationMinutes} min` : <span className="muted">-</span>) },
    { key: 'status', header: 'Appointment status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <ListScreen
      caption="Case records"
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      onOpen={(r) => navigate(`/case-records/${r.id}`)}
      search={(r) => `${r.referenceCode} ${r.patientName} ${r.professionalName}`}
      searchPlaceholder="Case, patient or professional"
      filters={filters}
      emptyIcon="clipboard"
      empty={{ title: 'No case records yet', description: 'A record is created with every appointment.' }}
    />
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="formRow">
    <label>{label}</label>
    <p style={{ margin: 0 }}>{children || <span className="muted">-</span>}</p>
  </div>
);

function FixtureCaseRecordDetail({ level: _level }: { level: AdminLevel }) {
  const { caseId = '' } = useParams();
  const record = findCaseRecord(caseId);
  const threads = useStore(clarifications).filter((c) => c.caseId === caseId);
  const plans = useStore(followUps).filter((f) => f.caseId === caseId);

  if (!record) {
    return (
      <EmptyState
        icon="clipboard"
        title="Case record not found"
        description="The link may be out of date."
        action={
          <Link to="/case-records">
            <Button variant="secondary" icon="arrowLeft">
              Back to case records
            </Button>
          </Link>
        }
      />
    );
  }

  const r = record;
  const doctor = db.findDoctor(r.professionalId);
  const grouped = r.documents.reduce<Record<string, string[]>>((acc, d) => ({ ...acc, [d.group]: [...(acc[d.group] ?? []), d.name] }), {});

  return (
    <div className="stack">
      <PageHeader
        title={r.referenceCode}
        description={<StatusBadge status={r.status} />}
        actions={
          <Link to={`/appointments/${r.consultationId}`}>
            <Button variant="secondary" icon="consultations">
              Appointment
            </Button>
          </Link>
        }
      />

      {!r.held && (
        <Notice tone="warning">
          This consultation has not been held yet, so documentation, the prescription or care plan and the summary appear once it ends.
        </Notice>
      )}

      <Card title="Case Overview">
        <DefinitionList
          items={[
            { label: 'Patient', value: <Link to={`/patients/${r.patientId}`}>{r.patientName}</Link> },
            { label: 'Consulting Professional', value: <Link to={`/providers/${r.professionalId}`}>{r.professionalName}</Link> },
            { label: 'Provider category', value: CATEGORY_LABEL[r.providerCategory] },
            { label: 'Specialty / professional category', value: r.specialty },
            { label: 'Consultation date/time', value: fmtDateTime(r.startsAt) },
            { label: 'Consultation duration', value: r.durationMinutes ? `${r.durationMinutes} minutes` : 'Recorded when the consultation ends' },
            { label: 'Appointment status', value: <StatusBadge status={r.status} /> },
          ]}
        />
      </Card>

      {r.held && r.kind === 'doctor' && (
        <>
          <Card title="Clinical Notes & Diagnosis">
            <Field label="Chief Complaint">{r.clinical.chiefComplaint}</Field>
            <Field label="Brief Clinical History">{r.clinical.history}</Field>
            <Field label="Observations">{r.clinical.observations}</Field>
            <Field label="Provisional Diagnosis">{r.clinical.provisionalDiagnosis}</Field>
          </Card>

          <Card title="Prescription">
            <Notice>
              Chief Complaint and Provisional Diagnosis are fetched from the clinical notes above and carried onto the generated prescription. They are not entered again here.
            </Notice>
            <div className="formGrid">
              <Field label="Chief Complaint (auto-fetched)">{r.clinical.chiefComplaint}</Field>
              <Field label="Provisional Diagnosis (auto-fetched)">{r.clinical.provisionalDiagnosis}</Field>
            </div>
            <Field label="Medications">
              <ul className="plainList">
                {r.prescription.medications.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </Field>
            <Field label="Advice & Instructions">{r.prescription.advice}</Field>
            <Field label="Warning Signs">{r.prescription.warningSigns}</Field>
            <Field label="History of Allergies">{r.prescription.allergies}</Field>
            <Field label="Doctor signature">
              {doctor?.signatureStatus === 'approved' ? (
                <StatusBadge status="approved" label="Approved signature applied" />
              ) : (
                <StatusBadge status="pending" label="No approved signature yet" />
              )}
            </Field>
            <p className="muted small">The prescription opens only inside authenticated CoraCure systems. It is never sent over WhatsApp.</p>
          </Card>
        </>
      )}

      {r.held && r.kind === 'non_doctor' && (
        <>
          <Card title="Assessment & Care Plan">
            <Field label="Presenting Concern">{r.assessment.presentingConcern}</Field>
            <Field label="Relevant History">{r.assessment.history}</Field>
            <Field label="Assessment / Observations">{r.assessment.observations}</Field>
          </Card>
          <Card title="Care Plan">
            <Field label="Recommendations / Interventions">{r.carePlan.recommendations}</Field>
            <Field label="Precautions & Warning Signs">{r.carePlan.precautions}</Field>
          </Card>
        </>
      )}

      {r.held && (
        <Card title="Case Summary - Auto-generated">
          <p style={{ marginTop: 0 }}>{summaryOf(r)}</p>
          <p className="muted small">
            Built from {r.kind === 'doctor' ? 'Chief Complaint, relevant history, observations, Provisional Diagnosis and key treatment and advice' : 'Presenting Concern, Relevant History, Assessment / Observations and the Care Plan'}. Nobody types it.
          </p>
        </Card>
      )}

      <Card title="Case Documents">
        <p className="muted">Anything uploaded before, during or after this consultation, grouped here and not as separate clinical headings.</p>
        {Object.keys(grouped).length === 0 ? (
          <p className="muted">No documents uploaded for this case.</p>
        ) : (
          Object.entries(grouped).map(([group, names]) => (
            <div className="docGroup" key={group}>
              <h4>{group}</h4>
              <ul className="plainList">
                {names.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </Card>

      {threads.length > 0 && (
        <Card title="Clarification Thread">
          {threads.map((t) => (
            <div key={t.id} className="docGroup">
              <h4>
                {t.subject} <StatusBadge status={t.status} />
              </h4>
              <ul className="thread">
                {t.thread.map((m, i) => (
                  <li key={i}>
                    <strong>{m.from}</strong> <small>{fmtDateTime(m.at)}</small>
                    <br />
                    {m.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Link to="/clarifications">Open in Clarifications</Link>
        </Card>
      )}

      {r.resources.length > 0 && (
        <Card title="Recommended Resources">
          <ul className="plainList">
            {r.resources.map((x) => (
              <li key={x.title}>
                {x.title} <span className="muted">({humanise(x.kind)})</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Notice>
        Follow-up is managed under <Link to="/follow-ups">Follow-ups</Link>, not inside the case record.
        {plans.length > 0 && ` This case has ${plans.length} follow-up plan(s) there.`}
      </Notice>
    </div>
  );
}

/** Live against a configured backend, fixtures otherwise. */
export const CaseRecords = LIVE ? CaseRecordsLive : FixtureCaseRecords;
export const CaseRecordDetail = LIVE ? CaseRecordDetailLive : FixtureCaseRecordDetail;
