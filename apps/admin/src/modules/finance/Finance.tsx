import { Link } from 'react-router-dom';

import { LIVE } from '../../api/live';
import { PatientPaymentsLive, ProviderPayoutsLive, RefundsLive } from './FinanceLive';
import { useToast } from '../../lib/toast';
import { patientPayments, payouts, refunds, type PatientPayment, type Payout, type Refund } from '../../mock/ops/money';
import type { AdminLevel } from '../../nav';
import { Button, PermissionGate, StatusBadge, type Column } from '../../ui';
import { fmtDate, fmtDateTime, inr, opts, words } from '../kit/format';
import { ListScreen, type ListFilter } from '../kit/ListScreen';
import { useStore } from '../kit/store';
import { CATEGORY_LABEL } from '../providers/provider';
import type { ProviderCategory } from '../../api/types';

/**
 * Finances (requirements §78-§81): Patient Payments, Provider Payouts and
 * Refunds. The bill is frozen at checkout, so nothing here recomputes a total;
 * payouts are RECORDED as settled, not paid out by this panel.
 */

/* ----------------------------- patient payments ---------------------------- */

const inRange = (iso: string, range: string): boolean => {
  if (!range) return true;
  const days = Number(range);
  return Date.now() - new Date(iso).getTime() <= days * 86_400_000;
};

function FixturePatientPayments({ level: _level }: { level: AdminLevel }) {
  const rows = useStore(patientPayments);

  const filters: ListFilter<PatientPayment>[] = [
    { key: 'payment', label: 'Payment status', options: opts(['paid', 'pending', 'failed', 'refunded']), test: (p, v) => p.status === v },
    { key: 'service', label: 'Service type', options: [{ value: 'consultation', label: 'Consultation' }, { value: 'lab', label: 'Lab' }], test: (p, v) => p.service === v },
    {
      key: 'range',
      label: 'Date range',
      options: [{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }],
      test: (p, v) => inRange(p.at, v),
    },
  ];

  const columns: Column<PatientPayment>[] = [
    { key: 'patient', header: 'Patient', render: (p) => <Link to={`/patients/${p.patientId}`} onClick={(e) => e.stopPropagation()}>{p.patientName}</Link> },
    { key: 'service', header: 'Service', render: (p) => words(p.service) },
    { key: 'ref', header: 'Consultation / Lab reference', render: (p) => <Link to={p.to} onClick={(e) => e.stopPropagation()}>{p.ref}</Link> },
    { key: 'amount', header: 'Amount', align: 'end', render: (p) => inr(p.amountInr) },
    { key: 'status', header: 'Payment status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'txn', header: 'Transaction reference', render: (p) => <code>{p.txn}</code> },
    { key: 'at', header: 'Payment date/time', render: (p) => fmtDateTime(p.at) },
    { key: 'refund', header: 'Refund status', render: (p) => (p.refund === 'none' ? <span className="muted">None</span> : <StatusBadge status={p.refund} />) },
  ];

  return (
    <ListScreen
      caption="Patient payments"
      rows={[...rows].sort((a, b) => b.at.localeCompare(a.at))}
      columns={columns}
      rowKey={(p) => p.id}
      search={(p) => `${p.patientName} ${p.ref} ${p.txn}`}
      searchPlaceholder="Patient, reference or transaction"
      filters={filters}
      emptyIcon="payments"
      empty={{ title: 'No payments yet' }}
    />
  );
}

/* ------------------------------ provider payouts --------------------------- */

function FixtureProviderPayouts({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const rows = useStore(payouts);

  const filters: ListFilter<Payout>[] = [
    {
      key: 'category',
      label: 'Provider category',
      options: Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label })),
      test: (p, v) => p.category === (v as ProviderCategory),
    },
  ];

  const columns: Column<Payout>[] = [
    { key: 'provider', header: 'Provider', render: (p) => <Link to={`/providers/${p.providerId}`} onClick={(e) => e.stopPropagation()}>{p.providerName}</Link> },
    { key: 'ref', header: 'Service / consultation reference', render: (p) => p.ref },
    { key: 'gross', header: 'Gross amount', align: 'end', render: (p) => inr(p.grossInr) },
    { key: 'commission', header: 'Platform commission', align: 'end', render: (p) => inr(p.commissionInr) },
    { key: 'net', header: 'Net payout', align: 'end', render: (p) => <strong>{inr(p.netInr)}</strong> },
    { key: 'status', header: 'Payout status', render: (p) => <StatusBadge status={p.status === 'paid' ? 'completed' : p.status} label={words(p.status)} /> },
    { key: 'settled', header: 'Settlement date', render: (p) => fmtDate(p.settledAt) },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '150px',
      render: (p) =>
        p.status === 'paid' ? null : (
          <PermissionGate level={level} allow={['finance']}>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                payouts.patch(p.id, { status: 'paid', settledAt: new Date().toISOString() });
                toast.success(`Payout to ${p.providerName} recorded as settled.`);
              }}
            >
              Record settled
            </Button>
          </PermissionGate>
        ),
    },
  ];

  return (
    <ListScreen
      caption="Provider payouts"
      rows={rows}
      columns={columns}
      rowKey={(p) => p.id}
      tabs={[
        { id: 'pending', label: 'Pending', test: (p) => p.status === 'pending' },
        { id: 'processing', label: 'Processing', test: (p) => p.status === 'processing' },
        { id: 'paid', label: 'Paid', test: (p) => p.status === 'paid' },
      ]}
      search={(p) => `${p.providerName} ${p.ref}`}
      searchPlaceholder="Provider or reference"
      filters={filters}
      emptyIcon="payments"
      empty={{ title: 'No payouts yet' }}
    />
  );
}

/* --------------------------------- refunds --------------------------------- */

function FixtureRefunds({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const rows = useStore(refunds);

  const step = (r: Refund, status: Refund['status'], msg: string) => {
    refunds.patch(r.id, { status, completedAt: status === 'completed' || status === 'rejected' ? new Date().toISOString() : null });
    toast.success(msg);
  };

  const columns: Column<Refund>[] = [
    { key: 'patient', header: 'Patient', render: (r) => r.patientName },
    { key: 'txn', header: 'Transaction reference', render: (r) => <code>{r.txn}</code> },
    { key: 'service', header: 'Service', render: (r) => r.service },
    { key: 'amount', header: 'Refund amount', align: 'end', render: (r) => inr(r.amountInr) },
    { key: 'reason', header: 'Refund reason', render: (r) => r.reason },
    { key: 'req', header: 'Request date', render: (r) => fmtDate(r.requestedAt) },
    { key: 'status', header: 'Refund status', render: (r) => <StatusBadge status={r.status === 'completed' ? 'refunded' : r.status} label={words(r.status)} /> },
    { key: 'done', header: 'Completion date', render: (r) => fmtDate(r.completedAt) },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '220px',
      render: (r) => (
        <PermissionGate level={level} allow={['finance', 'operations']}>
          <span className="rowActions">
            {r.status === 'requested' && (
              <>
                <Button size="sm" variant="ghost" onClick={() => step(r, 'rejected', 'Refund rejected.')}>
                  Reject
                </Button>
                <Button size="sm" variant="secondary" onClick={() => step(r, 'initiated', 'Refund initiated.')}>
                  Initiate
                </Button>
              </>
            )}
            {r.status === 'initiated' && (
              <Button size="sm" variant="success" onClick={() => step(r, 'completed', 'Refund completed.')}>
                Mark completed
              </Button>
            )}
          </span>
        </PermissionGate>
      ),
    },
  ];

  return (
    <ListScreen
      caption="Refunds"
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      tabs={[
        { id: 'requested', label: 'Requested', test: (r) => r.status === 'requested' },
        { id: 'initiated', label: 'Initiated', test: (r) => r.status === 'initiated' },
        { id: 'completed', label: 'Completed', test: (r) => r.status === 'completed' },
        { id: 'rejected', label: 'Rejected', test: (r) => r.status === 'rejected' },
      ]}
      search={(r) => `${r.patientName} ${r.txn} ${r.service}`}
      searchPlaceholder="Patient, transaction or service"
      emptyIcon="payments"
      empty={{ title: 'No refunds' }}
    />
  );
}

/** Live against a configured backend, fixtures otherwise. Chosen once, at load. */
export const PatientPayments = LIVE ? PatientPaymentsLive : FixturePatientPayments;
export const ProviderPayouts = LIVE ? ProviderPayoutsLive : FixtureProviderPayouts;
export const Refunds = LIVE ? RefundsLive : FixtureRefunds;
