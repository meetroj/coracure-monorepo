import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import { finance, type PaymentRow, type PayoutRow, type RefundRow } from '../../api/liveFinance';
import type { Everything } from '../../api/liveList';
import { useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { Async, Button, ConfirmDialog, PermissionGate, StatusBadge, TableSkeleton, skeletonColumns, type Column } from '../../ui';
import { fmtDate, fmtDateTime, inr, opts, words } from '../kit/format';
import { ListScreen, type ListFilter } from '../kit/ListScreen';
import { RecordForm, type FieldDef } from '../kit/RecordForm';
import { Truncated } from '../kit/Truncated';

/**
 * Finances against the real backend (requirements section 78-81).
 *
 * The bill is frozen at checkout, so nothing here recomputes a total. A payout
 * is recorded as paid by a person who made the transfer outside the panel. An
 * initiated refund really goes to the payment gateway, so it is confirmed first.
 */

const inRange = (iso: string, range: string): boolean => {
  if (!range) return true;
  return Date.now() - new Date(iso).getTime() <= Number(range) * 86_400_000;
};

/* ----------------------------- patient payments ---------------------------- */

export function PatientPaymentsLive({ level: _level }: { level: AdminLevel }) {
  const fetcher = useCallback(() => finance.payments(), []);
  const state = useResource<Everything<PaymentRow>>(fetcher, []);

  const filters: ListFilter<PaymentRow>[] = [
    { key: 'payment', label: 'Payment status', options: opts(['paid', 'pending', 'failed', 'refunded']), test: (p, v) => p.status === v },
    {
      key: 'range',
      label: 'Date range',
      options: [
        { value: '7', label: 'Last 7 days' },
        { value: '30', label: 'Last 30 days' },
        { value: '90', label: 'Last 90 days' },
      ],
      test: (p, v) => inRange(p.at, v),
    },
  ];

  const columns: Column<PaymentRow>[] = [
    {
      key: 'patient',
      header: 'Patient',
      render: (p) =>
        p.patientId ? (
          <Link to={`/patients/${p.patientId}`} onClick={(e) => e.stopPropagation()}>
            {p.patientName}
          </Link>
        ) : (
          <span className="muted">{p.patientName}</span>
        ),
    },
    { key: 'service', header: 'Service', render: (p) => words(p.service) },
    {
      key: 'ref',
      header: 'Consultation reference',
      render: (p) =>
        p.to ? (
          <Link to={p.to} onClick={(e) => e.stopPropagation()}>
            {p.ref}
          </Link>
        ) : (
          p.ref
        ),
    },
    { key: 'amount', header: 'Amount', align: 'end', render: (p) => inr(p.amountInr) },
    { key: 'status', header: 'Payment status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'txn', header: 'Transaction reference', render: (p) => (p.txn ? <code>{p.txn}</code> : <span className="muted">-</span>) },
    { key: 'at', header: 'Payment date/time', render: (p) => fmtDateTime(p.at) },
    { key: 'refund', header: 'Refund status', render: (p) => (p.refund === 'none' ? <span className="muted">None</span> : <StatusBadge status={p.refund} />) },
  ];

  return (
    <Async
      state={state}
      resource="payments"
      skeleton={
        <TableSkeleton
          columns={skeletonColumns(columns, { patient: 'name', ref: 'id', amount: 'amount', status: 'status', txn: 'id', at: 'date', refund: 'status' })}
          footer
        />
      }
    >
      {({ items, total }) => (
        <ListScreen
          caption="Patient payments"
          leading={<Truncated shown={items.length} total={total} />}
          rows={[...items].sort((a, b) => b.at.localeCompare(a.at))}
          columns={columns}
          rowKey={(p) => p.id}
          search={(p) => `${p.patientName} ${p.ref} ${p.txn}`}
          searchPlaceholder="Patient, reference or transaction"
          filters={filters}
          emptyIcon="payments"
          empty={{ title: 'No payments yet' }}
        />
      )}
    </Async>
  );
}

/* ------------------------------ provider payouts --------------------------- */

const SETTLE: FieldDef[] = [
  {
    key: 'reference',
    label: 'Bank reference',
    hint: 'Optional. The transfer reference, e.g. NEFT/2026/10/0041. Kept on the payment and shown in the history.',
    validate: (v) => (String(v ?? '').trim().length > 120 ? 'At most 120 characters.' : null),
  },
];

export function ProviderPayoutsLive({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const fetcher = useCallback(() => finance.payouts(), []);
  const state = useResource<Everything<PayoutRow>>(fetcher, []);
  const [settling, setSettling] = useState<PayoutRow | null>(null);

  const columns: Column<PayoutRow>[] = [
    {
      key: 'provider',
      header: 'Provider',
      render: (p) =>
        p.providerId ? (
          <Link to={`/providers/${p.providerId}`} onClick={(e) => e.stopPropagation()}>
            {p.providerName}
          </Link>
        ) : (
          <span className="muted">{p.providerName}</span>
        ),
    },
    { key: 'ref', header: 'Consultation reference', render: (p) => p.ref },
    { key: 'gross', header: 'Provider fee', align: 'end', render: (p) => inr(p.grossInr) },
    { key: 'commission', header: 'Platform commission', align: 'end', render: (p) => `${inr(p.commissionInr)} (${p.commissionPct}%)` },
    { key: 'net', header: 'Net payout', align: 'end', render: (p) => <strong>{inr(p.netInr)}</strong> },
    { key: 'status', header: 'Payout status', render: (p) => <StatusBadge status={p.status === 'paid' ? 'completed' : p.status} label={words(p.status)} /> },
    { key: 'settled', header: 'Settlement date', render: (p) => fmtDate(p.settledAt) },
    { key: 'bank', header: 'Bank reference', render: (p) => (p.bankReference ? <code>{p.bankReference}</code> : <span className="muted">-</span>) },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '150px',
      render: (p) =>
        p.status === 'paid' || !p.consultationId ? null : (
          <PermissionGate level={level} allow={['finance']}>
            <Button size="sm" variant="secondary" onClick={() => setSettling(p)}>
              Record settled
            </Button>
          </PermissionGate>
        ),
    },
  ];

  return (
    <>
      <Async
        state={state}
        resource="payouts"
        skeleton={
          <TableSkeleton
            columns={skeletonColumns(columns, { provider: 'name', ref: 'id', gross: 'amount', commission: 'amount', net: 'amount', status: 'status', settled: 'date', bank: 'id', actions: 'action' })}
            footer
          />
        }
      >
        {({ items, total }) => (
          <ListScreen
            caption="Provider payouts"
            leading={<Truncated shown={items.length} total={total} />}
            rows={items}
            columns={columns}
            rowKey={(p) => p.id}
            tabs={[
              { id: 'pending', label: 'Pending', test: (p) => p.status === 'pending' },
              { id: 'paid', label: 'Paid', test: (p) => p.status === 'paid' },
            ]}
            search={(p) => `${p.providerName} ${p.ref} ${p.bankReference ?? ''}`}
            searchPlaceholder="Provider, reference or bank reference"
            emptyIcon="payments"
            empty={{ title: 'No payouts yet' }}
          />
        )}
      </Async>

      <RecordForm
        open={settling !== null}
        title={settling ? `Record payout to ${settling.providerName}` : 'Record payout'}
        fields={SETTLE}
        initial={{ reference: '' }}
        submitLabel="Record as paid"
        onClose={() => setSettling(null)}
        onSubmit={async (v) => {
          if (!settling?.consultationId) return;
          try {
            await finance.markPayoutPaid(settling.consultationId, String(v.reference ?? ''));
            toast.success(`Payout to ${settling.providerName} recorded as paid.`);
            setSettling(null);
            state.reload();
          } catch (e) {
            toast.fromError(e);
          }
        }}
      />
    </>
  );
}

/* --------------------------------- refunds --------------------------------- */

export function RefundsLive({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const fetcher = useCallback(() => finance.refunds(), []);
  const state = useResource<Everything<RefundRow>>(fetcher, []);
  const [initiating, setInitiating] = useState<RefundRow | null>(null);
  const [rejecting, setRejecting] = useState<RefundRow | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (work: () => Promise<unknown>, ok: string, done: () => void) => {
    setBusy(true);
    try {
      await work();
      toast.success(ok);
      done();
      state.reload();
    } catch (e) {
      toast.fromError(e);
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<RefundRow>[] = [
    { key: 'patient', header: 'Patient', render: (r) => r.patientName },
    {
      key: 'ref',
      header: 'Consultation',
      render: (r) =>
        r.consultationId ? (
          <Link to={`/appointments/${r.consultationId}`} onClick={(e) => e.stopPropagation()}>
            {r.ref}
          </Link>
        ) : (
          r.ref
        ),
    },
    { key: 'amount', header: 'Refund amount', align: 'end', render: (r) => inr(r.amountInr) },
    { key: 'reason', header: 'Refund reason', render: (r) => r.reason },
    { key: 'by', header: 'Requested by', render: (r) => r.requestedBy },
    { key: 'req', header: 'Request date', render: (r) => fmtDate(r.requestedAt) },
    {
      key: 'status',
      header: 'Refund status',
      render: (r) => <StatusBadge status={r.status === 'completed' ? 'refunded' : r.status} label={words(r.status)} />,
    },
    {
      key: 'done',
      header: 'Decided',
      render: (r) =>
        r.decidedAt ? (
          <span className="cellStack">
            <span>{fmtDate(r.decidedAt)}</span>
            {r.note && <small>{r.note}</small>}
          </span>
        ) : (
          <span className="muted">-</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '200px',
      render: (r) =>
        r.status === 'requested' ? (
          <PermissionGate level={level} allow={['finance', 'operations']}>
            <span className="rowActions">
              <Button size="sm" variant="ghost" onClick={() => setRejecting(r)}>
                Reject
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setInitiating(r)}>
                Initiate
              </Button>
            </span>
          </PermissionGate>
        ) : null,
    },
  ];

  return (
    <>
      <Async
        state={state}
        resource="refunds"
        skeleton={
          <TableSkeleton
            columns={skeletonColumns(columns, { patient: 'name', ref: 'id', amount: 'amount', req: 'date', status: 'status', done: 'stack', actions: 'action' })}
            footer
          />
        }
      >
        {({ items, total }) => (
          <ListScreen
            caption="Refunds"
            leading={<Truncated shown={items.length} total={total} />}
            rows={items}
            columns={columns}
            rowKey={(r) => r.id}
            tabs={[
              { id: 'requested', label: 'Requested', test: (r) => r.status === 'requested' },
              { id: 'initiated', label: 'Initiated', test: (r) => r.status === 'initiated' },
              { id: 'completed', label: 'Completed', test: (r) => r.status === 'completed' },
              { id: 'rejected', label: 'Rejected', test: (r) => r.status === 'rejected' },
            ]}
            search={(r) => `${r.patientName} ${r.ref} ${r.reason}`}
            searchPlaceholder="Patient, consultation or reason"
            emptyIcon="payments"
            empty={{ title: 'No refunds' }}
          />
        )}
      </Async>

      <ConfirmDialog
        open={initiating !== null}
        busy={busy}
        onClose={() => setInitiating(null)}
        variant="primary"
        title={initiating ? `Refund ${inr(initiating.amountInr)} to ${initiating.patientName}?` : 'Refund'}
        confirmLabel="Send the refund"
        consequence="This sends the refund to the payment gateway now. It cannot be undone from here."
        onConfirm={async () => {
          if (initiating) {
            await run(() => finance.initiateRefund(initiating.id), 'Refund sent.', () => setInitiating(null));
          }
        }}
      />

      <ConfirmDialog
        open={rejecting !== null}
        busy={busy}
        onClose={() => setRejecting(null)}
        title={rejecting ? `Turn down the refund for ${rejecting.patientName}?` : 'Reject refund'}
        confirmLabel="Reject refund"
        consequence="Nothing happens to the payment. The patient is told it was not approved."
        reason={{ label: 'Why', hint: 'Required. Shown with the decision.', maxLength: 300 }}
        onConfirm={async (note) => {
          if (rejecting) {
            await run(() => finance.rejectRefund(rejecting.id, note), 'Refund rejected.', () => setRejecting(null));
          }
        }}
      />
    </>
  );
}
