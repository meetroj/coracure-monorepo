import { request } from './http';
import { listAll, num, type Everything } from './liveList';

/**
 * Finances against the backend: `GET /admin/payments`, `GET /admin/payments/payouts`,
 * `POST /admin/payments/:consultationId/payout`, `GET /admin/refunds`,
 * `POST /admin/refunds/:id/initiate` and `POST /admin/refunds/:id/reject`.
 *
 * Source of truth: `AdminPaymentRow`, `PayoutHistoryRow`, `AdminRefundRow`,
 * `MarkPayoutPaidDto`, `RejectRefundDto`. Money is read as the backend sent it:
 * the bill is frozen at checkout, so nothing here recomputes a total.
 *
 * What the backend does not have, so the panel does not show: a `processing`
 * payout state (a payout is pending or paid), a manual "mark refund completed"
 * (the gateway answers synchronously, so initiating ends in completed or a
 * recorded failure), and a lab service line (lab has its own module).
 */

/* ------------------------------ patient payments --------------------------- */

type LivePaymentRow = {
  id: string;
  consultation: { id: string | null; referenceCode: string | null; erased: boolean };
  patient: { id: string; fullName: string | null } | null;
  totalPayable: number | string;
  status: 'created' | 'pending' | 'paid' | 'failed' | 'refunded';
  method: string | null;
  paidAt: string | null;
  orderReference: string | null;
  transactionReference: string | null;
  refund: { status: 'none' | 'pending' | 'refunded' };
  openRefundRequest: { id: string; status: string; amount: number | string } | null;
  createdAt: string;
};

export type PaymentRow = {
  id: string;
  patientId: string | null;
  patientName: string;
  service: 'consultation';
  ref: string;
  /** The page that explains the reference, or null when the consultation was erased. */
  to: string | null;
  amountInr: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  txn: string;
  at: string;
  refund: 'none' | 'requested' | 'initiated' | 'completed';
};

/** `created` is a checkout that was opened and not paid; the panel calls it pending. */
const PAYMENT_STATUS: Record<LivePaymentRow['status'], PaymentRow['status']> = {
  created: 'pending',
  pending: 'pending',
  paid: 'paid',
  failed: 'failed',
  refunded: 'refunded',
};

export function paymentFrom(r: LivePaymentRow): PaymentRow {
  const open = r.openRefundRequest?.status;
  const refund: PaymentRow['refund'] =
    open === 'requested' || open === 'initiated'
      ? open
      : r.refund.status === 'refunded'
        ? 'completed'
        : r.refund.status === 'pending'
          ? 'requested'
          : 'none';
  return {
    id: r.id,
    patientId: r.patient?.id ?? null,
    // An erased patient keeps their payment record but not their name.
    patientName: r.patient?.fullName ?? (r.patient ? 'Unnamed patient' : 'Erased patient'),
    service: 'consultation',
    ref: r.consultation.referenceCode ?? r.consultation.id ?? '-',
    to: r.consultation.id ? `/appointments/${r.consultation.id}` : null,
    amountInr: num(r.totalPayable),
    status: PAYMENT_STATUS[r.status] ?? 'pending',
    txn: r.transactionReference ?? r.orderReference ?? '',
    at: r.paidAt ?? r.createdAt,
    refund,
  };
}

/* ------------------------------ provider payouts --------------------------- */

type LivePayoutRow = {
  paymentId: string;
  consultationId: string | null;
  referenceCode: string | null;
  provider: { id: string; fullName: string } | null;
  bankVerified: boolean | null;
  consultationFee: number | string;
  commissionPct: number | string;
  commissionAmount: number | string;
  netPayout: number | string;
  status: 'pending' | 'paid';
  paidAt: string | null;
  capturedAt: string | null;
  reference: string | null;
  recordedBy: { id: string; fullName: string } | null;
};

export type PayoutRow = {
  id: string;
  consultationId: string | null;
  providerId: string | null;
  providerName: string;
  ref: string;
  grossInr: number;
  commissionPct: number;
  commissionInr: number;
  netInr: number;
  status: 'pending' | 'paid';
  settledAt: string | null;
  bankReference: string | null;
  bankVerified: boolean | null;
};

export const payoutFrom = (r: LivePayoutRow): PayoutRow => ({
  id: r.paymentId,
  consultationId: r.consultationId,
  providerId: r.provider?.id ?? null,
  providerName: r.provider?.fullName ?? 'Removed provider',
  ref: r.referenceCode ?? r.consultationId ?? '-',
  grossInr: num(r.consultationFee),
  commissionPct: num(r.commissionPct),
  commissionInr: num(r.commissionAmount),
  netInr: num(r.netPayout),
  status: r.status,
  settledAt: r.paidAt,
  bankReference: r.reference,
  bankVerified: r.bankVerified,
});

/** The bank reference is optional and at most 120 characters; blank is left out. */
export function markPaidBody(reference?: string): Record<string, unknown> {
  const ref = reference?.trim();
  if (ref && ref.length > 120) throw new Error('The bank reference can be at most 120 characters.');
  return ref ? { reference: ref } : {};
}

/* --------------------------------- refunds --------------------------------- */

type LiveRefundRow = {
  id: string;
  status: 'requested' | 'initiated' | 'completed' | 'rejected';
  amount: number | string;
  reason: string;
  requestedByParty: string;
  decisionNote: string | null;
  decidedBySystem: boolean;
  decidedBy: { id: string; fullName: string } | null;
  createdAt: string;
  initiatedAt: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  consultation: { id: string | null; referenceCode: string | null; erased: boolean };
  patient: { id: string; fullName: string | null } | null;
  payment: { refundable: number | string; totalPayable: number | string };
};

export type RefundRow = {
  id: string;
  patientId: string | null;
  patientName: string;
  consultationId: string | null;
  ref: string;
  amountInr: number;
  refundableInr: number;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: 'requested' | 'initiated' | 'completed' | 'rejected';
  decidedAt: string | null;
  decidedBy: string;
  note: string | null;
};

const PARTY: Record<string, string> = { patient: 'Patient', admin: 'Admin', system: 'Platform' };

export const refundFrom = (r: LiveRefundRow): RefundRow => ({
  id: r.id,
  patientId: r.patient?.id ?? null,
  patientName: r.patient?.fullName ?? (r.patient ? 'Unnamed patient' : 'Erased patient'),
  consultationId: r.consultation.id,
  ref: r.consultation.referenceCode ?? r.consultation.id ?? '-',
  amountInr: num(r.amount),
  refundableInr: num(r.payment.refundable),
  reason: r.reason,
  requestedBy: PARTY[r.requestedByParty] ?? r.requestedByParty,
  requestedAt: r.createdAt,
  status: r.status,
  decidedAt: r.completedAt ?? r.rejectedAt ?? r.initiatedAt,
  decidedBy: r.decidedBySystem ? 'Platform' : (r.decidedBy?.fullName ?? ''),
  note: r.decisionNote,
});

/** A rejection is owed an explanation: required, at most 300 characters. */
export function rejectBody(note: string): { note: string } {
  const text = note.trim();
  if (!text) throw new Error('Say why the refund is being turned down.');
  if (text.length > 300) throw new Error('The explanation can be at most 300 characters.');
  return { note: text };
}

/* -------------------------------- requests --------------------------------- */

const withRows = <A, B>(r: Everything<A>, map: (a: A) => B): Everything<B> => ({ ...r, items: r.items.map(map) });

export const finance = {
  payments: () => listAll<LivePaymentRow>('/admin/payments').then((r) => withRows(r, paymentFrom)),

  payouts: () => listAll<LivePayoutRow>('/admin/payments/payouts', { status: 'all' }).then((r) => withRows(r, payoutFrom)),

  markPayoutPaid: (consultationId: string, reference?: string) =>
    request<unknown>(`/admin/payments/${encodeURIComponent(consultationId)}/payout`, {
      method: 'POST',
      body: markPaidBody(reference),
    }),

  refunds: () => listAll<LiveRefundRow>('/admin/refunds').then((r) => withRows(r, refundFrom)),

  initiateRefund: (id: string) =>
    request<unknown>(`/admin/refunds/${encodeURIComponent(id)}/initiate`, { method: 'POST', body: {} }),

  rejectRefund: (id: string, note: string) =>
    request<unknown>(`/admin/refunds/${encodeURIComponent(id)}/reject`, { method: 'POST', body: rejectBody(note) }),
};
