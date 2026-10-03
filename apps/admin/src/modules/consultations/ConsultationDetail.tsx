import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { consultations, payments, type Bill, type Consultation } from '../../api/admin';
import type { ChatMessage } from '../../mock/consultationChat';
import { summaries } from '../../api/caseSummaries';
import { useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { CaseSummaryDetail } from '../CaseSummaryDetail';
import {
  Async,
  Button,
  Card,
  DefinitionList,
  Modal,
  Notice,
  PageHeader,
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
  // The summary opens in a window on this page; nobody is sent to the Case summaries list.
  const [summaryId, setSummaryId] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);

  const openSummary = async () => {
    const row = (await summaries.list()).find((r) => r.consultationId === consultationId);
    if (row) setSummaryId(row.id);
    else toast.error('No case summary for this consultation yet.');
  };

  return (
    <Async state={state} resource="this consultation">
      {(c) => (
        <>
          <PageHeader
            title={c.referenceCode ?? `Consultation ${c.id}`}
            description={<StatusBadge status={c.status} />}
            actions={
              <>
                {may(level, ['operations', 'clinical_governance']) && (
                  <Button variant="secondary" icon="consultations" onClick={() => setChatOpen(true)}>
                    Chat
                  </Button>
                )}
                <Button variant="secondary" icon="clipboard" onClick={openSummary}>
                  Case summary
                </Button>
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
            <span className="keyFact__label">Doctor</span>
            <span className="keyFact__value">
              {c.doctorId ? (
                <Link to={`/providers/${c.doctorId}`}>{c.doctorName ?? c.doctorId}</Link>
              ) : (
                (c.doctorName ?? '-')
              )}
            </span>
            <span className="keyFact__hint">Open doctor details</span>
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
      <Async state={state} resource="the bill" skeletonRows={2}>
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

/**
 * The conversation between the doctor and the patient on this case, read-only. Opening it is
 * itself an act worth knowing about, so the window says so.
 */
function ChatWindow({
  consultationId,
  doctor,
  patient,
  onClose,
}: {
  consultationId: string;
  doctor: string;
  patient: string;
  onClose: () => void;
}) {
  const fetcher = useCallback(() => consultations.chat(consultationId), [consultationId]);
  const state = useResource<ChatMessage[]>(fetcher, [consultationId]);
  return (
    <Modal open onClose={onClose} title={`Chat - ${doctor} and ${patient}`} width={620}>
      <Notice tone="info">Read-only. Opening a chat is recorded against your admin account.</Notice>
      <Async
        state={state}
        resource="the chat"
        skeletonRows={3}
        empty={<p className="muted">No messages were exchanged on this case.</p>}
      >
        {(messages) => (
          <ul className="chatThread" aria-label="Messages">
            {messages.map((m) => (
              <li key={m.id} className={`chatMsg chatMsg--${m.from}`}>
                <span className="chatMsg__who">{m.from === 'doctor' ? doctor : patient}</span>
                <span className="chatMsg__bubble">{m.text}</span>
                <span className="chatMsg__time">{new Date(m.at).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Async>
    </Modal>
  );
}
