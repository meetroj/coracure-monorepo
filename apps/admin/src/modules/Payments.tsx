import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import { API_BASE } from '../api/http';
import { payments, type PendingPayout } from '../api/admin';
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
  Table,
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

  const record = useMutation(payments.recordPayout);
  const canPayout = may(level, ['finance']);

  const columns: Column<PendingPayout>[] = [
    {
      key: 'provider',
      header: 'Provider',
      render: (p) =>
        p.doctorId ? (
          <Link to={`/providers/${p.doctorId}`}>{p.doctorName ?? p.doctorId}</Link>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      key: 'consultation',
      header: 'Consultation',
      render: (p) => (
        <Link to={`/consultations/${p.consultationId}`}>{p.consultationId.slice(0, 8)}…</Link>
      ),
    },
    {
      key: 'completed',
      header: 'Completed',
      render: (p) => (p.completedAt ? new Date(p.completedAt).toLocaleDateString() : '—'),
    },
    {
      key: 'amount',
      header: 'Owed',
      align: 'end',
      render: (p) => (p.amountInr != null ? `₹${p.amountInr.toLocaleString('en-IN')}` : '—'),
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

  return (
    <>
      <PageHeader
        title="Payments & payouts"
        description="What the platform still owes providers, and the refunds it has raised."
        actions={
          <PermissionGate level={level} allow={['finance']}>
            <a href={`${API_BASE}${payments.exportUrl('transactions')}`} download>
              <Button variant="secondary" icon="download">
                Export transactions
              </Button>
            </a>
            <Button variant="primary" icon="refresh" onClick={() => setRefunding(true)}>
              Raise a refund
            </Button>
          </PermissionGate>
        }
      />

      <Notice tone="warning">
        Payouts are transferred manually by the client this release. “Record payout” marks a
        transfer you have <strong>already made</strong> — it does not send money.
      </Notice>

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
            <strong>It does not transfer any money</strong> — only record it once you have actually
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

      {refunding && <RefundForm onClose={() => setRefunding(false)} />}
    </>
  );
}

/**
 * A refund is raised against one consultation. The amount is typed, never
 * derived — see the note at the top of this file.
 */
function RefundForm({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [consultationId, setConsultationId] = useState('');
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
        Enter the amount from the patient&apos;s invoice. The bill is frozen at checkout — do not
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
          // Disabled while in flight — a double click cannot double-refund,
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
