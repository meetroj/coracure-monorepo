import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { API_BASE } from '../api/http';
import { payments, type PatientPayment, type PendingPayout } from '../api/admin';
import { useMutation, useResource } from '../lib/useResource';
import { useToast } from '../lib/toast';
import type { AdminLevel } from '../nav';
import {
  Async,
  Button,
  Card,
  Column,
  ConfirmDialog,
  EmptyState,
  Notice,
  PageHeader,
  PermissionGate,
  StatusBadge,
  Table,
  Tabs,
  TextField,
  may,
} from '../ui';

/**
 * Payments, payouts and refunds (§31, §32).
 *
 * *** THE PAYOUT BUTTON DOES NOT MOVE MONEY. *** Payouts are made by hand this
 * release (SRS 2.4); the endpoint RECORDS that a transfer happened. So the
 * button says "Record payout", never "Pay", and the confirmation spells out
 * that the admin must have already sent the money.
 *
 * *** STORED BILL FIGURES ARE NEVER RECOMPUTED. *** Fee, convenience fee, GST
 * and total are frozen at checkout. A recalculated total stops matching the
 * invoice the patient is holding, so the refund form takes an amount and never
 * derives one.
 */
export function Payments({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const fetcher = useCallback(() => payments.pendingPayouts(), []);
  const state = useResource<PendingPayout[]>(fetcher, []);
  const [paying, setPaying] = useState<PendingPayout | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [refundFor, setRefundFor] = useState('');
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'patients' ? 'patients' : 'doctors';

  const patientFetcher = useCallback(() => payments.patientPayments(), []);
  const patientState = useResource<PatientPayment[]>(patientFetcher, []);

  const record = useMutation(payments.recordPayout);
  const canPayout = may(level, ['finance']);

  const columns: Column<PendingPayout>[] = [
    {
      key: 'provider',
      header: 'Doctor',
      render: (p) =>
        p.doctorId ? (
          <Link to={`/providers/${p.doctorId}`}>{p.doctorName ?? p.doctorId}</Link>
        ) : (
          <span className="muted">-</span>
        ),
    },
    {
      key: 'consultation',
      header: 'Consultation',
      render: (p) => (
        <Link to={`/consultations/${p.consultationId}`}>{p.consultationId}</Link>
      ),
    },
    {
      key: 'completed',
      header: 'Completed',
      render: (p) => (p.completedAt ? new Date(p.completedAt).toLocaleDateString() : '-'),
    },
    {
      key: 'amount',
      header: 'Owed',
      align: 'end',
      render: (p) => (p.amountInr != null ? `₹${p.amountInr.toLocaleString('en-IN')}` : '-'),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '160px',
      render: (p) =>
        canPayout ? (
          <span className="rowActions">
            <Button size="sm" variant="secondary" onClick={() => setPaying(p)}>
              Record payout
            </Button>
          </span>
        ) : null,
    },
  ];

  const patientColumns: Column<PatientPayment>[] = [
    {
      key: 'ref',
      header: 'Consultation',
      render: (p) => <Link to={`/consultations/${p.consultationId}`}>{p.referenceCode}</Link>,
    },
    { key: 'patient', header: 'Patient', render: (p) => p.patientName },
    {
      key: 'date',
      header: 'Date',
      render: (p) => (p.at ? new Date(p.at).toLocaleDateString() : '-'),
    },
    {
      key: 'amount',
      header: 'Charged',
      align: 'end',
      render: (p) => `₹${p.amountInr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
    },
    { key: 'status', header: 'Payment', render: (p) => <StatusBadge status={p.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '130px',
      render: (p) =>
        p.status === 'paid' && may(level, ['finance', 'operations']) ? (
          <span className="rowActions">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setRefundFor(p.consultationId);
                setRefunding(true);
              }}
            >
              Refund
            </Button>
          </span>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Payments & payouts"
        description="What the platform owes doctors, and what patients have paid."
      />

      <div className="tabsRow">
        <Tabs
          tabs={[
            { id: 'doctors', label: 'Doctors' },
            { id: 'patients', label: 'Patients' },
          ]}
          active={tab}
          onChange={(id) => setParams(id === 'doctors' ? {} : { tab: id }, { replace: true })}
        />
        <div className="tabsRow__action">
          <PermissionGate level={level} allow={['finance']}>
            <span className="row">
              <a href={`${API_BASE}${payments.exportUrl('transactions')}`} download>
                <Button variant="secondary" icon="download">
                  Export transactions
                </Button>
              </a>
              <Button variant="primary" icon="refresh" onClick={() => {
                  setRefundFor('');
                  setRefunding(true);
                }}>
                Raise a refund
              </Button>
              </span>
          </PermissionGate>
        </div>
      </div>

      {tab === 'doctors' && (
      <Card title="Pending payouts">
        <Async
          state={state}
          resource="pending payouts"
          empty={
            <EmptyState
              icon="check"
              title="Nothing outstanding"
              description="Every completed consultation has been paid out."
            />
          }
        >
          {(rows) => (
            <Table
              caption="Pending payouts"
              columns={columns}
              rows={rows}
              rowKey={(p) => p.consultationId}
            />
          )}
        </Async>
      </Card>
      )}
      {tab === 'patients' && (
      <Card title="Patient payments">
        <Async
          state={patientState}
          resource="patient payments"
          empty={
            <EmptyState
              icon="payments"
              title="No payments yet"
              description="Payments appear here once patients book."
            />
          }
        >
          {(rows) => (
            <Table
              caption="Patient payments"
              columns={patientColumns}
              rows={rows}
              rowKey={(p) => p.consultationId}
            />
          )}
        </Async>
      </Card>
      )}

      <ConfirmDialog
        open={paying !== null}
        busy={record.busy}
        onClose={() => setPaying(null)}
        variant="primary"
        title="Record this payout?"
        confirmLabel="Record payout"
        consequence={
          <>
            This marks the transfer as done in the platform&apos;s books.{' '}
            <strong>It does not transfer any money</strong> - only record it once you have actually
            sent it.
          </>
        }
        onConfirm={async () => {
          if (!paying) return;
          try {
            await record.mutate(paying.consultationId);
            toast.success('Payout recorded.');
            state.reload();
          } catch (e) {
            toast.fromError(e);
          }
          setPaying(null);
        }}
      />

      {refunding && (
        <RefundForm initialConsultationId={refundFor} onClose={() => setRefunding(false)} />
      )}
    </>
  );
}

/**
 * A refund is raised against one consultation. The amount is typed, never
 * derived - see the note at the top of this file.
 */
function RefundForm({
  initialConsultationId,
  onClose,
}: {
  initialConsultationId: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [consultationId, setConsultationId] = useState(initialConsultationId);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const refund = useMutation(payments.refund);

  const valid =
    consultationId.trim().length > 0 &&
    Number(amount) > 0 &&
    !Number.isNaN(Number(amount)) &&
    reason.trim().length > 0;

  return (
    <Card title="Raise a refund">
      <Notice tone="info">
        Enter the amount from the patient&apos;s invoice. The bill is frozen at checkout - do not
        recalculate it here, or the refund stops matching what they were charged.
      </Notice>

      <div className="formGrid">
        <TextField
          label="Consultation id"
          required
          value={consultationId}
          autoComplete="off"
          onChange={(e) => setConsultationId(e.target.value)}
        />
        <TextField
          label="Amount (₹)"
          required
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <TextField
        label="Reason"
        required
        value={reason}
        hint="Recorded against the payment and visible to the patient in their app."
        onChange={(e) => setReason(e.target.value)}
      />

      <div className="formActions">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          // Disabled while in flight - a double click cannot double-refund,
          // and the backend's unique gatewayRefundId is the second guard.
          loading={refund.busy}
          disabled={!valid}
          onClick={async () => {
            try {
              await refund.mutate(consultationId.trim(), Number(amount), reason.trim());
              toast.success('Refund raised.');
              onClose();
            } catch (e) {
              toast.fromError(e, 'Could not raise this refund.');
            }
          }}
        >
          Raise refund
        </Button>
      </div>
    </Card>
  );
}
