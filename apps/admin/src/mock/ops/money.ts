import { allListed } from '../../api/consultationsList';
import { createStore, daysAgo, hoursAgo } from '../../modules/kit/store';
import * as db from '../db';
import { labOrders } from './lab';

/**
 * Finances fixtures (requirements §78-§81): patient payments, provider
 * payouts and refunds. Consultation and lab money share one list each, so a
 * lab refund appears under Refunds exactly as §70 asks.
 */

const hash = (s: string) => [...s].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 11);

/* ------------------------------ patient payments --------------------------- */

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';
export type RefundStatus = 'none' | 'requested' | 'initiated' | 'completed';

export type PatientPayment = {
  id: string;
  patientId: string;
  patientName: string;
  service: 'consultation' | 'lab';
  ref: string;
  /** The page that explains the reference. */
  to: string;
  amountInr: number;
  status: PaymentStatus;
  txn: string;
  at: string;
  refund: RefundStatus;
};

const feeOf = (doctorId?: string | null) => db.findDoctor(doctorId ?? '')?.consultationFeeInr ?? 1000;

export const patientPayments = createStore<PatientPayment>([
  ...allListed().map((c): PatientPayment => ({
    id: `pay-${c.id}`,
    patientId: c.patientId ?? 'pt-1001',
    patientName: c.patientName,
    service: 'consultation',
    ref: c.referenceCode ?? c.id,
    to: `/appointments/${c.id}`,
    amountInr: feeOf(c.doctorId),
    // Fixture rows are always one of the four; the fifth is a live-only word.
    status: c.paymentStatus === 'not_applicable' ? 'pending' : c.paymentStatus,
    txn: `pay_${(hash(c.id) % 900000) + 100000}`,
    at: c.createdAt ?? daysAgo(1),
    refund: c.paymentStatus === 'refunded' ? 'completed' : 'none',
  })),
  ...labOrders.all().map((o): PatientPayment => ({
    id: `pay-${o.id}`,
    patientId: o.patientId,
    patientName: o.patientName,
    service: 'lab',
    ref: o.code,
    to: `/lab-orders?q=${encodeURIComponent(o.code)}`,
    amountInr: o.payment.amountInr,
    status: o.payment.status,
    txn: o.payment.txn,
    at: o.payment.at ?? o.orderedAt,
    refund: o.refund === 'none' ? 'none' : o.refund,
  })),
]);

/* ------------------------------ provider payouts --------------------------- */

export type Payout = {
  id: string;
  providerId: string;
  providerName: string;
  category: string;
  ref: string;
  grossInr: number;
  commissionInr: number;
  netInr: number;
  status: 'pending' | 'processing' | 'paid';
  settledAt: string | null;
};

const COMMISSION = 0.2;

export const payouts = createStore<Payout>(
  allListed()
    .filter((c) => c.status === 'completed' || c.status === 'awaiting_documentation')
    .map((c): Payout => {
      const gross = feeOf(c.doctorId);
      const commission = Math.round(gross * COMMISSION);
      const mod = hash(c.id) % 3;
      return {
        id: `po-${c.id}`,
        providerId: c.doctorId ?? '',
        providerName: c.doctorName ?? '-',
        category: db.findDoctor(c.doctorId ?? '')?.category ?? 'doctor',
        ref: c.referenceCode ?? c.id,
        grossInr: gross,
        commissionInr: commission,
        netInr: gross - commission,
        status: c.status === 'awaiting_documentation' ? 'pending' : (['pending', 'processing', 'paid'] as const)[mod],
        settledAt: c.status === 'completed' && mod === 2 ? daysAgo(1 + (hash(c.id) % 6)) : null,
      };
    }),
);

/* ---------------------------------- refunds -------------------------------- */

export type Refund = {
  id: string;
  patientName: string;
  txn: string;
  service: string;
  amountInr: number;
  reason: string;
  requestedAt: string;
  status: 'requested' | 'initiated' | 'completed' | 'rejected';
  completedAt: string | null;
};

const lab8 = labOrders.get('lo-8');

export const refunds = createStore<Refund>([
  { id: 'rf-1', patientName: 'Meera Pillai', txn: lab8?.payment.txn ?? 'pay_Q88nO', service: `Lab order ${lab8?.code ?? 'CLO-2026-08'}`, amountInr: lab8?.payment.amountInr ?? 550, reason: 'No partner accepted the order', requestedAt: daysAgo(2), status: 'initiated', completedAt: null },
  { id: 'rf-2', patientName: 'Sneha Iyer', txn: 'pay_492011', service: 'Consultation CC-2026-01122', amountInr: 1100, reason: 'Provider cancelled the appointment', requestedAt: hoursAgo(30), status: 'requested', completedAt: null },
  { id: 'rf-3', patientName: 'Kabir Singh', txn: 'pay_731845', service: 'Consultation CC-2026-01123', amountInr: 1200, reason: 'Patient cancelled more than 24 hours ahead', requestedAt: daysAgo(6), status: 'completed', completedAt: daysAgo(4) },
  { id: 'rf-4', patientName: 'Vikram Joshi', txn: 'pay_219990', service: 'Consultation CC-2026-01110', amountInr: 1500, reason: 'Duplicate payment', requestedAt: daysAgo(9), status: 'rejected', completedAt: daysAgo(8) },
]);

export const inr = (n: number): string => `₹${n.toLocaleString('en-IN')}`;
