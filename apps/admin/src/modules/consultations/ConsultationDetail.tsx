import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { consultations, payments, type Bill, type Consultation } from '../../api/admin';
import { summaries } from '../../api/caseSummaries';
import { useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { CaseSummaryDetail } from '../CaseSummaryDetail';
import { ChatWindow } from './ChatWindow';
import { appointmentStatus, durationMinutes } from '../../mock/ops/appointment';
import { LIVE } from '../../api/live';
import {
  Async,
  Button,
  Card,
  CardSkeleton,
  DefinitionList,
  DefinitionListSkeleton,
  Modal,
  Notice,
  PageHeader,
  PageHeaderSkeleton,
  SkeletonBlock,
  StatusBadge,
  humanise,
  may,
} from '../../ui';

/**
 * One consultation: the overview only. Reassigning or cancelling, the evidence
 * panes and the audit trail are not part of this page.
 */
export function ConsultationDetail({ level }: { level: AdminLevel }) {
  const { consultationId = '' } = useParams();

  const fetcher = useCallback(() => consultations.get(consultationId), [consultationId]);
  const state = useResource<Consultation>(fetcher, [consultationId]);
  const toast = useToast();
  const navigate = useNavigate();
  // The summary opens in a window on this page; nobody is sent to the Case summaries list.
  const [summaryId, setSummaryId] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);

  const openSummary = async () => {
    const row = (await summaries.list()).find((r) => r.consultationId === consultationId);
    if (row) setSummaryId(row.id);
    else toast.error('No case summary for this consultation yet.');
  };

  return (
    <Async state={state} resource="this consultation" skeleton={<OverviewSkeleton billing={may(level, ['finance', 'operations'])} />}>
      {(c) => (
        <>
          <PageHeader
            title={c.referenceCode ?? `Appointment ${c.id}`}
            description={<StatusBadge status={c.displayStatus ?? appointmentStatus(c.status, c.id)} />}
            actions={
              <>
                {may(level, ['operations', 'clinical_governance']) && (
                  <Button variant="secondary" icon="consultations" onClick={() => setChatOpen(true)}>
                    Chat
                  </Button>
                )}
                {may(level, ['operations', 'clinical_governance']) && (
                  <Button variant="secondary" icon="note" onClick={() => navigate(`/case-records/${c.id}`)}>
                    Case record
                  </Button>
                )}
                {/* The summary is the provider's own text, shown on the case record itself in a live build. */}
                {!LIVE && (
                  <Button variant="secondary" icon="clipboard" onClick={openSummary}>
                    Case summary
                  </Button>
                )}
              </>
            }
          />

          {c.status === 'pending_payment' && (
            <Notice tone="warning">
              A <strong>pending payment is the slot hold</strong>, and it expires. Refresh before
              acting - this may already have become <code>expired</code>.
            </Notice>
          )}

          <Overview c={c} level={level} />

          {chatOpen && (
            <ChatWindow
              consultationId={c.id}
              doctor={c.doctorName ?? 'Doctor'}
              patient={c.patientName ?? 'Patient'}
              onClose={() => setChatOpen(false)}
            />
          )}

          <Modal
            open={summaryId !== null}
            onClose={() => setSummaryId(null)}
            title={`Case summary - ${c.referenceCode ?? c.id}`}
            width={920}
          >
            {summaryId && <CaseSummaryDetail level={level} summaryId={summaryId} embedded />}
          </Modal>
        </>
      )}
    </Async>
  );
}

/** The page as it will stand: header, the four key facts, two cards, billing (only for the levels that see it). */
function OverviewSkeleton({ billing }: { billing: boolean }) {
  return (
    <>
      <PageHeaderSkeleton actions={0} />
      <div className="stack" aria-hidden="true">
        <section className="card keyFacts">
          <div className="keyFacts__grid">
            {[0, 1, 2, 3].map((i) => (
              <div className="keyFact" key={i}>
                <SkeletonBlock w="46%" h={12} />
                <SkeletonBlock w="70%" h={24} />
                <SkeletonBlock w="40%" h={10} />
              </div>
            ))}
          </div>
        </section>
        <div className="twoCol">
          <CardSkeleton title="Consultation">
            <DefinitionListSkeleton items={9} />
          </CardSkeleton>
          <CardSkeleton title="Schedule">
            <DefinitionListSkeleton items={3} />
          </CardSkeleton>
        </div>
        {billing && (
          <CardSkeleton title="Billing">
            <DefinitionListSkeleton items={7} />
          </CardSkeleton>
        )}
      </div>
    </>
  );
}

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : null);

const inr = (n?: number | null) =>
  n == null ? null : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function Overview({ c, level }: { c: Consultation; level: AdminLevel }) {
  const minutes =
    c.startsAt && c.endsAt
      ? Math.round((new Date(c.endsAt).getTime() - new Date(c.startsAt).getTime()) / 60000)
      : null;

  return (
    <div className="stack">
      {/* What an admin opens this page for, first and largest. */}
      <Card className="keyFacts">
        <div className="keyFacts__grid">
          <div className="keyFact">
            <span className="keyFact__label">Patient</span>
            <span className="keyFact__value">
              {c.patientId ? (
                <Link to={`/patients/${c.patientId}`}>{c.patientName ?? 'Open patient'}</Link>
              ) : (
                (c.patientName ?? '-')
              )}
            </span>
            <span className="keyFact__hint">Open patient details</span>
          </div>
          <div className="keyFact">
            <span className="keyFact__label">Consulting Professional</span>
            <span className="keyFact__value">
              {c.doctorId ? (
                <Link to={`/providers/${c.doctorId}`}>{c.doctorName ?? c.doctorId}</Link>
              ) : (
                (c.doctorName ?? '-')
              )}
            </span>
            <span className="keyFact__hint">Open provider details</span>
          </div>
          <div className="keyFact">
            <span className="keyFact__label">Starts at</span>
            <span className="keyFact__value">
              {c.startsAt ? (
                <>
                  {new Date(c.startsAt).toLocaleDateString()}
                  {/* The time sits on its own line under the date. */}
                  <span className="keyFact__time">{new Date(c.startsAt).toLocaleTimeString()}</span>
                </>
              ) : (
                '-'
              )}
            </span>
          </div>
          <div className="keyFact">
            <span className="keyFact__label">Payment</span>
            <span className="keyFact__value">
              {c.paymentStatus ? <StatusBadge status={c.paymentStatus} /> : '-'}
            </span>
          </div>
        </div>
      </Card>

      <div className="twoCol">
        <Card title="Consultation">
          <DefinitionList
            items={[
              { label: 'Consultation ID', value: <code>{c.id}</code> },
              { label: 'Reference', value: c.referenceCode },
              { label: 'Appointment status', value: <StatusBadge status={c.displayStatus ?? appointmentStatus(c.status, c.id)} /> },
              {
                label: 'Consultation duration',
                value: (() => {
                  // Live: what the backend recorded. The fixtures derive one from the id.
                  const m = LIVE ? c.actualDurationMinutes : durationMinutes(c.status, c.id);
                  return m ? `${m} minutes` : 'Recorded when the consultation ends';
                })(),
              },
              { label: 'Mode', value: c.mode ? humanise(c.mode) : null },
              { label: 'Channel', value: c.channel ? humanise(c.channel) : null },
              { label: 'Service', value: c.serviceName },
              { label: 'Language', value: c.language },
              { label: 'Region', value: c.regionName ?? c.regionId },
              { label: 'Created', value: when(c.createdAt) },
            ]}
          />
        </Card>

        <Card title="Schedule">
          <DefinitionList
            items={[
              { label: 'Starts at', value: when(c.startsAt) },
              { label: 'Ends at', value: when(c.endsAt) },
              { label: 'Duration', value: minutes != null ? `${minutes} min` : null },
            ]}
          />
        </Card>
      </div>

      {may(level, ['finance', 'operations']) && <Billing consultationId={c.id} status={c.paymentStatus} />}
    </div>
  );
}

/** The stored figures are frozen at checkout - shown as written, never recomputed. */
function Billing({
  consultationId,
  status,
}: {
  consultationId: string;
  status?: Consultation['paymentStatus'];
}) {
  const fetcher = useCallback(() => payments.bill(consultationId), [consultationId]);
  const state = useResource<Bill>(fetcher, [consultationId]);
  return (
    <Card title="Billing">
      <Async state={state} resource="the bill" skeleton={<DefinitionListSkeleton items={7} />}>
        {(b) => (
          <DefinitionList
            items={[
              { label: 'Payment', value: <StatusBadge status={status ?? b.status ?? 'pending'} /> },
              { label: 'Consultation fee', value: inr(b.consultationFee) },
              {
                label: `Convenience fee${b.convenienceFeePct != null ? ` (${b.convenienceFeePct}%)` : ''}`,
                value: inr(b.convenienceFee),
              },
              {
                label: `GST${b.gstPct != null ? ` (${b.gstPct}%)` : ''}`,
                value: inr(b.gstAmount),
              },
              { label: 'Total', value: <strong>{inr(b.total)}</strong> },
              { label: 'Refunded', value: inr(b.refundAmount) },
              { label: 'Paid at', value: when(b.paidAt) },
            ]}
          />
        )}
      </Async>
    </Card>
  );
}
