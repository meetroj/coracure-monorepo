import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { consultations, type Consultation } from '../../api/admin';
import {
  caseRecords,
  medicineLine,
  summaries,
  type CaseDocument,
  type CaseRecordRow,
  type ClinicalRecord,
  type DocumentGroup,
  type SummaryRow,
} from '../../api/liveCaseRecords';
import type { Everything } from '../../api/liveList';
import { isWebUrl } from '../../api/liveProviders';
import { useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { Async, Button, Card, DefinitionList, EmptyState, Icon, Notice, PageHeader, StatusBadge, humanise, type Column } from '../../ui';
import { fmtDateTime, opts, words } from '../kit/format';
import { ListScreen, type ListFilter, type ListTab } from '../kit/ListScreen';
import { openSigned } from '../kit/openSigned';
import { Truncated } from '../kit/Truncated';

/**
 * Case Records and Case Summaries against the real backend (requirements
 * section 34-47).
 *
 * A case record is one consultation's record. Two structures, never mixed: a
 * prescriber's has Clinical Notes & Diagnosis and a Prescription; a
 * non-prescriber's has an Assessment & Care Plan. The backend says which with
 * `recordKind`, so the panel does not guess it from a role or a name.
 */

/* ---------------------------------- list ----------------------------------- */

export function CaseRecordsLive({ level: _level }: { level: AdminLevel }) {
  const navigate = useNavigate();
  const fetcher = useCallback(() => caseRecords.list(), []);
  const state = useResource<Everything<CaseRecordRow>>(fetcher, []);

  const columns: Column<CaseRecordRow>[] = [
    { key: 'ref', header: 'Case', render: (r) => <strong>{r.referenceCode}</strong> },
    { key: 'patient', header: 'Patient', render: (r) => r.patientName },
    { key: 'pro', header: 'Consulting professional', render: (r) => r.professionalName },
    { key: 'spec', header: 'Specialty / professional category', render: (r) => r.specialty },
    { key: 'when', header: 'Consultation date/time', render: (r) => (r.startsAt ? fmtDateTime(r.startsAt) : '-') },
    { key: 'dur', header: 'Duration', render: (r) => (r.durationMinutes ? `${r.durationMinutes} min` : <span className="muted">-</span>) },
    { key: 'status', header: 'Appointment status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'summary',
      header: 'Case summary',
      render: (r) =>
        r.summaryState ? (
          <StatusBadge
            status={r.summaryState === 'written' ? 'verified' : r.summaryState === 'pending' ? 'pending' : 'inactive'}
            label={r.summaryState === 'not_required' ? 'Not required' : words(r.summaryState)}
          />
        ) : (
          <span className="muted">-</span>
        ),
    },
  ];

  return (
    <Async state={state} resource="case records" skeletonRows={6}>
      {({ items, total }) => {
        const filters: ListFilter<CaseRecordRow>[] = [
          { key: 'appointment', label: 'Appointment status', options: opts([...new Set(items.map((r) => r.status))].sort()), test: (r, v) => r.status === v },
          {
            key: 'summary',
            label: 'Case summary',
            options: [
              { value: 'written', label: 'Written' },
              { value: 'pending', label: 'Pending' },
            ],
            test: (r, v) => r.summaryState === v,
          },
        ];
        return (
          <ListScreen
            caption="Case records"
            leading={<Truncated shown={items.length} total={total} />}
            rows={[...items].sort((a, b) => (b.startsAt ?? '').localeCompare(a.startsAt ?? ''))}
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
      }}
    </Async>
  );
}

/* --------------------------------- summaries ------------------------------- */

const SUMMARY_TABS: ListTab<SummaryRow>[] = [
  { id: 'pending', label: 'Pending', test: (s) => s.state === 'pending' },
  { id: 'written', label: 'Written', test: (s) => s.state === 'written' },
];

export function CaseSummariesLive({ level: _level }: { level: AdminLevel }) {
  const navigate = useNavigate();
  const fetcher = useCallback(() => summaries.list(), []);
  const state = useResource<Everything<SummaryRow>>(fetcher, []);

  const columns: Column<SummaryRow>[] = [
    { key: 'ref', header: 'Case', render: (s) => <strong>{s.referenceCode}</strong> },
    { key: 'patient', header: 'Patient', render: (s) => s.patientName },
    { key: 'pro', header: 'Consulting professional', render: (s) => s.professionalName },
    { key: 'held', header: 'Held', render: (s) => (s.heldAt ? fmtDateTime(s.heldAt) : '-') },
    { key: 'ended', header: 'Ended', render: (s) => (s.endedAt ? fmtDateTime(s.endedAt) : <span className="muted">-</span>) },
    {
      key: 'state',
      header: 'Case summary',
      render: (s) => <StatusBadge status={s.state === 'written' ? 'verified' : 'pending'} label={words(s.state)} />,
    },
    { key: 'final', header: 'Finalised', render: (s) => (s.finalisedAt ? fmtDateTime(s.finalisedAt) : <span className="muted">Not yet</span>) },
  ];

  return (
    <Async state={state} resource="case summaries" skeletonRows={6}>
      {({ items, total }) => (
        <ListScreen
          caption="Case summaries"
          leading={
            <>
              <Notice tone="info">
                The case summary is written by the provider, three to five lines, and is required before a record can
                be finalised. Nothing generates one, so a pending summary is one the provider still owes.
              </Notice>
              <Truncated shown={items.length} total={total} />
            </>
          }
          rows={items}
          columns={columns}
          rowKey={(s) => s.id}
          tabs={SUMMARY_TABS}
          onOpen={(s) => navigate(`/case-records/${s.id}`)}
          search={(s) => `${s.referenceCode} ${s.patientName} ${s.professionalName}`}
          searchPlaceholder="Case, patient or professional"
          emptyIcon="clipboard"
          empty={{ title: 'No case summaries' }}
        />
      )}
    </Async>
  );
}

/* --------------------------------- detail ---------------------------------- */

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="formRow">
    <label>{label}</label>
    <p style={{ margin: 0 }}>{children || <span className="muted">-</span>}</p>
  </div>
);

export function CaseRecordDetailLive({ level: _level }: { level: AdminLevel }) {
  const { caseId = '' } = useParams();
  const consultationFetcher = useCallback(() => consultations.get(caseId), [caseId]);
  const consultation = useResource<Consultation>(consultationFetcher, [caseId]);

  return (
    <Async
      state={consultation}
      resource="this case record"
      empty={
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
      }
    >
      {(c) => <RecordBody consultation={c} />}
    </Async>
  );
}

function RecordBody({ consultation: c }: { consultation: Consultation }) {
  const recordFetcher = useCallback(() => caseRecords.record(c.id), [c.id]);
  const record = useResource<ClinicalRecord | null>(recordFetcher, [c.id]);
  const docsFetcher = useCallback(() => caseRecords.documents(c.id), [c.id]);
  const docs = useResource<DocumentGroup[]>(docsFetcher, [c.id]);

  return (
    <div className="stack">
      <PageHeader
        title={c.referenceCode ?? c.id}
        description={<StatusBadge status={c.displayStatus ?? c.status} />}
        actions={
          <Link to={`/appointments/${c.id}`}>
            <Button variant="secondary" icon="consultations">
              Appointment
            </Button>
          </Link>
        }
      />

      <Card title="Case Overview">
        <DefinitionList
          items={[
            { label: 'Patient', value: c.patientId ? <Link to={`/patients/${c.patientId}`}>{c.patientName ?? 'Open the patient'}</Link> : c.patientName },
            { label: 'Consulting Professional', value: c.doctorId ? <Link to={`/providers/${c.doctorId}`}>{c.doctorName ?? 'Open the provider'}</Link> : (c.doctorName ?? null) },
            { label: 'Specialty / professional category', value: c.serviceName ?? null },
            { label: 'Consultation date/time', value: c.startsAt ? fmtDateTime(c.startsAt) : null },
            {
              label: 'Consultation duration',
              value: c.actualDurationMinutes ? `${c.actualDurationMinutes} minutes` : 'Recorded when the consultation ends',
            },
            { label: 'Appointment status', value: <StatusBadge status={c.displayStatus ?? c.status} /> },
          ]}
        />
      </Card>

      <Async state={record} resource="the clinical record" skeletonRows={4}>
        {(r) =>
          r === null ? (
            <Notice tone="warning">
              There is no clinical record yet. The provider opens one when the consultation is held, and the notes, the
              prescription or care plan and the summary appear here.
            </Notice>
          ) : (
            <Clinical r={r} />
          )
        }
      </Async>

      <Card title="Case Documents">
        <p className="muted">Anything uploaded before, during or after this consultation, grouped by what it was labelled.</p>
        <Async state={docs} resource="the documents" skeletonRows={2}>
          {(groups) => <Documents consultationId={c.id} groups={groups} />}
        </Async>
      </Card>

      <Notice>
        Follow-up is managed under <Link to="/follow-ups">Follow-ups</Link>, not inside the case record. Opening a
        clinical record is written to the audit log.
      </Notice>
    </div>
  );
}

function Clinical({ r }: { r: ClinicalRecord }) {
  const final = r.finalisedAt !== null;
  return (
    <>
      <Notice tone={final ? 'info' : 'warning'}>
        {final ? `Finalised ${fmtDateTime(r.finalisedAt as string)}.` : 'This record is still a draft: the provider can change it.'}{' '}
        Read-only: the professional who saw the patient is the one accountable for what it says.
      </Notice>

      {r.recordKind === 'prescription' ? (
        <>
          <Card title="Clinical Notes & Diagnosis">
            <Field label="Chief Complaint">{r.chiefComplaint}</Field>
            <Field label="Brief Clinical History">{r.clinicalHistory}</Field>
            <Field label="Observations">{r.observations}</Field>
            <Field label={r.isDiagnosisProvisional ? 'Provisional Diagnosis' : 'Diagnosis'}>{r.diagnosis}</Field>
            <Field label="Risk category">{r.riskCategory ? humanise(r.riskCategory) : null}</Field>
            <Field label="Referral">{r.referralNote}</Field>
          </Card>
          <Card title="Prescription">
            <Field label="Medications">
              {r.medicines.length > 0 ? (
                <ul className="plainList">
                  {r.medicines.map((m) => (
                    <li key={m.id}>{medicineLine(m)}</li>
                  ))}
                </ul>
              ) : null}
            </Field>
            <Field label="Advice & Instructions">{r.advice.covered}</Field>
            <Field label="Home practice">{r.advice.homePractice}</Field>
            <Field label="Next focus">{r.advice.nextFocus}</Field>
            <Field label="Warning Signs">{r.advice.warningSigns}</Field>
            <Field label="History of Allergies">{r.allergyHistory}</Field>
            <p className="muted small">The prescription opens only inside authenticated CoraCure systems. It is never sent over WhatsApp.</p>
          </Card>
        </>
      ) : (
        <>
          <Card title="Assessment & Care Plan">
            <Field label="Presenting Concern">{r.presentingConcern ?? r.chiefComplaint}</Field>
            <Field label="Relevant History">{r.clinicalHistory}</Field>
            <Field label="Assessment / Observations">{r.assessment ?? r.observations}</Field>
          </Card>
          <Card title="Care Plan">
            <Field label="Recommendations / Interventions">{r.recommendations ?? r.advice.covered}</Field>
            <Field label="Precautions & Warning Signs">{r.precautions ?? r.advice.warningSigns}</Field>
            <Field label="Home practice">{r.advice.homePractice}</Field>
            <Field label="Next focus">{r.advice.nextFocus}</Field>
          </Card>
        </>
      )}

      <Card title="Case Summary - written by the provider">
        {r.caseSummary ? <p style={{ marginTop: 0 }}>{r.caseSummary}</p> : <p className="muted">No summary has been written yet.</p>}
      </Card>

      {r.addenda.length > 0 && (
        <Card title="Corrections since it was issued">
          <ul className="thread">
            {r.addenda.map((a) => (
              <li key={a.id}>
                <small>{fmtDateTime(a.createdAt)}</small>
                <br />
                {a.text}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

const IMAGE_FILE = /\.(jpe?g|png|gif|webp|bmp|avif)$/i;

/**
 * One uploaded file as a tile: its picture when it is an image, a file mark
 * otherwise (a PDF has no picture to draw). The picture is read through the
 * same signed link as View; a link that fails leaves the file mark, never a
 * broken image. Opening the tile still asks for a fresh link.
 */
function DocTile({ consultationId, file }: { consultationId: string; file: CaseDocument }) {
  const toast = useToast();
  const [opening, setOpening] = useState(false);
  const isImage = IMAGE_FILE.test(file.fileName);
  const fetcher = useCallback(() => caseRecords.documentUrl(consultationId, file.id), [consultationId, file.id]);
  const link = useResource(fetcher, [consultationId, file.id], isImage);
  const src = isImage && link.data && isWebUrl(link.data.url) ? link.data.url : null;
  const ext = file.fileName.includes('.') ? file.fileName.split('.').pop()?.toUpperCase() : null;

  return (
    <li className="docTile">
      <button
        type="button"
        className="docTile__open"
        disabled={opening}
        aria-label={`View ${file.fileName}`}
        onClick={async () => {
          setOpening(true);
          try {
            await openSigned(() => caseRecords.documentUrl(consultationId, file.id));
          } catch (e) {
            toast.fromError(e);
          } finally {
            setOpening(false);
          }
        }}
      >
        <span className="docTile__pic">
          {src ? (
            <img src={src} alt="" loading="lazy" />
          ) : (
            <span className="docTile__mark" aria-hidden="true">
              <Icon name="note" size={28} />
              {ext && <small>{ext}</small>}
            </span>
          )}
        </span>
        <span className="docTile__name">{file.fileName}</span>
      </button>
      <span className="muted docTile__meta">
        {file.uploadedByName ? `${file.uploadedByName} · ` : ''}
        {fmtDateTime(file.createdAt)}
      </span>
    </li>
  );
}

function Documents({ consultationId, groups }: { consultationId: string; groups: DocumentGroup[] }) {
  const withFiles = groups.filter((g) => g.files.length > 0);

  if (withFiles.length === 0) return <p className="muted">No documents uploaded for this case.</p>;

  return (
    <>
      {withFiles.map((g) => (
        <div className="docGroup" key={g.kind}>
          <h4>{humanise(g.kind)}</h4>
          <ul className="docGrid">
            {g.files.map((f) => (
              <DocTile key={f.id} consultationId={consultationId} file={f} />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
