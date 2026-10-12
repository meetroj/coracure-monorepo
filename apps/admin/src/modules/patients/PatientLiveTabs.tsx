import { useCallback } from 'react';
import { Link } from 'react-router-dom';

import { request } from '../../api/http';
import { fromLiveRow, type LivePage } from '../../api/liveAppointments';
import { caseRecords, summaries } from '../../api/liveCaseRecords';
import { followups, type FollowupDetail } from '../../api/liveCare';
import { finance } from '../../api/liveFinance';
import { categoryOf, type RosterCategory } from '../../api/liveProviders';
import { feedback, liveSupport, tickets } from '../../api/liveSupport';
import { useResource } from '../../lib/useResource';
import { Async, Card, DefinitionList, EmptyState, Notice, StatusBadge, Table } from '../../ui';
import { fmtDate, fmtDateTime, inr, words } from '../kit/format';
import { Truncated } from '../kit/Truncated';

/**
 * The patient's Prescriptions / Care Plans, Reports & Documents, Follow-ups,
 * Payments and Support tabs, against the backend (requirements §26-§30).
 *
 * *** NO NEW ENDPOINTS. *** The backend has no `/admin/patients/:id/...` for
 * these, so each tab reads the list the panel already reads elsewhere and keeps
 * this patient's rows. Those lists read up to 2,000 rows and say so when there
 * are more (`Truncated`).
 *
 * *** DE-IDENTIFIED, AND NO CLINICAL RECORD IS OPENED. *** Opening a clinical
 * record is an audit entry on the backend, so these tabs name the consultation
 * and link to its case record; the record is read there, on purpose. File
 * names and statuses only, never content, notes or diagnoses.
 */

/** The patient's bookings, newest first: `GET /admin/patients/:id/consultations`. */
export const patientConsultations = (patientId: string) =>
  request<LivePage>(`/admin/patients/${encodeURIComponent(patientId)}/consultations`, {
    query: { limit: 100, sort: 'newest' },
  }).then((page) => ({ rows: page.items.map(fromLiveRow), total: page.total }));

const STATUS = (c: { displayStatus?: string | null; status: string }) => c.displayStatus ?? c.status;

/* --------------------------- 26 prescriptions / care plans ------------------ */

/** A Prescription for a doctor's consultation, a Care Plan for a non-doctor's. */
export function LivePrescriptions({ patientId }: { patientId: string }) {
  const fetcher = useCallback(async () => {
    const { rows } = await patientConsultations(patientId);
    const held = rows.filter((c) => ['completed', 'awaiting_documentation'].includes(STATUS(c)));
    const doctorIds = [...new Set(held.map((c) => c.doctorId).filter((d): d is string => !!d))];
    // Both lookups are optional: a role that may not read them still gets the rows.
    const [categories, summaryRows] = await Promise.all([
      Promise.all(
        doctorIds.map((id) =>
          request<{ category: RosterCategory | null }>(`/admin/doctors/${encodeURIComponent(id)}`)
            .then((d) => [id, categoryOf(d.category)] as const)
            .catch(() => [id, null] as const),
        ),
      ),
      summaries.list().catch(() => null),
    ]);
    const category = new Map(categories);
    const finalised = new Map(
      (summaryRows?.items ?? []).filter((s) => s.patientId === patientId).map((s) => [s.id, s.finalisedAt]),
    );
    return held.map((c) => ({
      c,
      category: c.doctorId ? (category.get(c.doctorId) ?? null) : null,
      finalisedAt: finalised.get(c.id) ?? null,
      statusKnown: summaryRows !== null,
    }));
  }, [patientId]);
  const state = useResource(fetcher, [patientId]);

  return (
    <Async state={state} resource="prescriptions and care plans" skeletonRows={3}>
      {(rows) =>
        rows.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="No prescriptions or care plans yet"
            description="They appear once a consultation has been held."
          />
        ) : (
          <div className="stack">
            <Notice>
              Prescriptions open only inside authenticated CoraCure systems. They are never sent over WhatsApp. Open
              the case record to read one.
            </Notice>
            <Table
              caption="Prescriptions and care plans"
              columns={[
                {
                  key: 'type',
                  header: 'Type',
                  render: ({ category }) =>
                    category === null ? (
                      <span className="muted">-</span>
                    ) : (
                      <StatusBadge
                        status="approved"
                        tone="info"
                        label={category === 'doctor' ? 'Prescription' : 'Care Plan'}
                      />
                    ),
                },
                { key: 'ref', header: 'Case', render: ({ c }) => <Link to={`/case-records/${c.id}`}>{c.referenceCode}</Link> },
                { key: 'pro', header: 'Consulting professional', render: ({ c }) => c.doctorName ?? '-' },
                { key: 'when', header: 'Date', render: ({ c }) => fmtDateTime(c.startsAt) },
                {
                  key: 'state',
                  header: 'Record',
                  render: ({ finalisedAt, statusKnown }) =>
                    !statusKnown ? (
                      <span className="muted">-</span>
                    ) : finalisedAt ? (
                      `Finalised ${fmtDate(finalisedAt)}`
                    ) : (
                      <span className="muted">Not finalised yet</span>
                    ),
                },
              ]}
              rows={rows}
              rowKey={({ c }) => c.id}
            />
          </div>
        )
      }
    </Async>
  );
}

/* ------------------------------ 27 reports & documents ---------------------- */

export function LiveFiles({ patientId }: { patientId: string }) {
  const fetcher = useCallback(async () => {
    const { rows } = await patientConsultations(patientId);
    const cases = rows.filter((c) => !['cancelled', 'expired'].includes(STATUS(c)));
    // ponytail: one request per consultation, in parallel. A patient with hundreds of bookings
    // wants a backend `/admin/patients/:id/documents`.
    const perCase = await Promise.all(
      cases.map((c) =>
        caseRecords
          .documents(c.id)
          .then((groups) => groups.flatMap((g) => g.files.map((f) => ({ c, kind: g.kind, file: f }))))
          .catch(() => []),
      ),
    );
    return perCase.flat();
  }, [patientId]);
  const state = useResource(fetcher, [patientId]);

  return (
    <div className="stack">
      <Notice>Names and categories only. File content is not available in the admin panel.</Notice>
      <Card title="Uploaded files">
        <Async state={state} resource="this patient's documents" skeletonRows={3}>
          {(rows) =>
            rows.length === 0 ? (
              <p className="muted">No files uploaded.</p>
            ) : (
              <Table
                caption="Uploaded files"
                columns={[
                  { key: 'name', header: 'File', render: ({ file }) => file.fileName },
                  { key: 'kind', header: 'Category', render: ({ kind }) => words(kind) },
                  {
                    key: 'case',
                    header: 'Case',
                    render: ({ c }) => <Link to={`/case-records/${c.id}`}>{c.referenceCode}</Link>,
                  },
                  { key: 'by', header: 'Uploaded by', render: ({ file }) => file.uploadedByName ?? '-' },
                  { key: 'at', header: 'Uploaded', render: ({ file }) => fmtDateTime(file.createdAt) },
                ]}
                rows={rows}
                rowKey={({ file }) => file.id}
              />
            )
          }
        </Async>
      </Card>
      <Card title="Lab reports">
        <p className="muted">Lab reports are not available in the admin panel yet: lab orders have their own module.</p>
      </Card>
    </div>
  );
}

/* --------------------------------- 28 follow-ups ---------------------------- */

const CHECKIN_TONE = { green: 'positive', amber: 'warning', red: 'danger' } as const;

function Plan({ f }: { f: FollowupDetail }) {
  const latest = f.checkins[0];
  return (
    <Card title={f.pathwayName}>
      <DefinitionList
        items={[
          { label: 'Consultation', value: <Link to={`/appointments/${f.id}`}>{f.referenceCode}</Link> },
          { label: 'Follow-up status', value: <StatusBadge status={f.state} label={words(f.state)} /> },
          { label: 'Window', value: f.startsOn ? `${fmtDate(f.startsOn)} to ${fmtDate(f.endsOn)}` : null },
          {
            label: 'Patient responses',
            value: latest ? (
              <span className="row">
                <span>
                  {f.checkins.length} check-in{f.checkins.length === 1 ? '' : 's'}, latest {fmtDate(latest.date)}
                </span>
                <StatusBadge status={latest.status} tone={CHECKIN_TONE[latest.status]} />
              </span>
            ) : (
              'Not received yet'
            ),
          },
          {
            label: 'Provider review',
            value: latest
              ? latest.reviewed
                ? `Reviewed${latest.reviewedBy ? ` by ${latest.reviewedBy.fullName}` : ''}`
                : 'Not reviewed yet'
              : null,
          },
          {
            label: 'Follow-up recommendation',
            value: f.checkins.some((c) => c.consultationRecommended) ? 'Consultation recommended' : 'None',
          },
        ]}
      />
    </Card>
  );
}

export function LiveFollowUps({ patientId }: { patientId: string }) {
  const fetcher = useCallback(async () => {
    const all = await followups.list();
    const mine = all.items.filter((f) => f.patientId === patientId);
    const plans = await Promise.all(mine.map((f) => followups.get(f.id)));
    // Newest check-in first, so `checkins[0]` is the latest.
    const ordered = plans.map((p) => ({ ...p, checkins: [...p.checkins].sort((a, b) => b.date.localeCompare(a.date)) }));
    return { plans: ordered, total: all.total, shown: all.items.length };
  }, [patientId]);
  const state = useResource(fetcher, [patientId]);

  return (
    <Async state={state} resource="this patient's follow-ups" skeletonRows={3}>
      {({ plans, total, shown }) => (
        <div className="stack">
          <Truncated shown={shown} total={total} />
          {plans.length === 0 ? (
            <EmptyState icon="clipboard" title="No follow-up plans" />
          ) : (
            plans.map((f) => <Plan key={f.id} f={f} />)
          )}
        </div>
      )}
    </Async>
  );
}

/* --------------------------------- 29 payments ------------------------------ */

export function LivePayments({ patientId }: { patientId: string }) {
  const fetcher = useCallback(async () => {
    const [pay, ref] = await Promise.all([finance.payments(), finance.refunds()]);
    return {
      payments: pay.items.filter((p) => p.patientId === patientId),
      refunds: ref.items.filter((r) => r.patientId === patientId),
      shown: pay.items.length,
      total: pay.total,
    };
  }, [patientId]);
  const state = useResource(fetcher, [patientId]);

  return (
    <Async state={state} resource="this patient's payments" skeletonRows={3}>
      {({ payments, refunds, shown, total }) => (
        <div className="stack">
          <Truncated shown={shown} total={total} />
          {payments.length === 0 ? (
            <EmptyState icon="payments" title="No payments yet" />
          ) : (
            <Table
              caption="Payments"
              columns={[
                { key: 'service', header: 'Payment', render: () => 'Consultation payment' },
                {
                  key: 'ref',
                  header: 'Reference',
                  render: (x) => (x.to ? <Link to={x.to}>{x.ref}</Link> : x.ref),
                },
                { key: 'amount', header: 'Amount', align: 'end', render: (x) => inr(x.amountInr) },
                { key: 'status', header: 'Payment status', render: (x) => <StatusBadge status={x.status} /> },
                {
                  key: 'refund',
                  header: 'Refund',
                  render: (x) => (x.refund === 'none' ? <span className="muted">None</span> : <StatusBadge status={x.refund} />),
                },
                { key: 'txn', header: 'Transaction reference', render: (x) => (x.txn ? <code>{x.txn}</code> : '-') },
              ]}
              rows={payments}
              rowKey={(x) => x.id}
            />
          )}
          {refunds.length > 0 && (
            <Card title="Refunds">
              <Table
                caption="Refunds"
                columns={[
                  { key: 'ref', header: 'Consultation', render: (r) => r.ref },
                  { key: 'amount', header: 'Amount', align: 'end', render: (r) => inr(r.amountInr) },
                  { key: 'status', header: 'Refund status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'by', header: 'Requested by', render: (r) => r.requestedBy },
                  { key: 'at', header: 'Requested', render: (r) => fmtDate(r.requestedAt) },
                ]}
                rows={refunds}
                rowKey={(r) => r.id}
              />
            </Card>
          )}
          <Notice>Lab payments are not listed here yet: the backend keeps lab billing in its own module.</Notice>
        </div>
      )}
    </Async>
  );
}

/* ---------------------------------- 30 support ------------------------------ */

export function LiveSupport({ patientId }: { patientId: string }) {
  const fetcher = useCallback(async () => {
    const [t, complaints, mine, ratings] = await Promise.all([
      tickets.list(),
      liveSupport.complaints(),
      patientConsultations(patientId),
      feedback.list('patient'),
    ]);
    const ids = new Set(mine.rows.map((c) => c.id));
    return {
      tickets: t.items.filter((x) => x.requesterType === 'patient' && x.requesterId === patientId),
      complaints: complaints.filter((c) => c.patientId === patientId),
      // A rating is per consultation, so it is this patient's when the consultation is.
      feedback: ratings.items.filter((f) => ids.has(f.id)),
      truncated: t.truncated || ratings.truncated,
    };
  }, [patientId]);
  const state = useResource(fetcher, [patientId]);

  return (
    <Async state={state} resource="this patient's support history" skeletonRows={3}>
      {(d) => (
        <div className="stack">
          {d.truncated && (
            <Notice tone="warning">The backend has more tickets or ratings than were loaded, so some may be missing.</Notice>
          )}
          <Card title="Support tickets">
            {d.tickets.length === 0 ? (
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
                rows={d.tickets}
                rowKey={(t) => t.id}
              />
            )}
          </Card>
          <Card title="Complaints">
            {d.complaints.length === 0 ? (
              <p className="muted">No complaints.</p>
            ) : (
              <Table
                caption="Complaints"
                columns={[
                  {
                    key: 'subject',
                    header: 'Subject',
                    render: (c) => <Link to={`/support-tickets/${c.id}`}>{c.subject}</Link>,
                  },
                  { key: 'cat', header: 'Category', render: (c) => words(c.category) },
                  { key: 'at', header: 'Raised', render: (c) => fmtDate(c.raisedAt) },
                  { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
                ]}
                rows={d.complaints}
                rowKey={(c) => c.id}
              />
            )}
          </Card>
          <Card title="Feedback">
            {d.feedback.length === 0 ? (
              <p className="muted">No feedback from this patient.</p>
            ) : (
              <ul className="plainList">
                {d.feedback.map((f) => (
                  <li key={f.id}>
                    {f.rating} / 5 about {f.to ? <Link to={f.to}>{f.about}</Link> : f.about}
                    {f.comment ? `: ${f.comment}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </Async>
  );
}
