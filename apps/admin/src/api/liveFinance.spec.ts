import { describe, expect, it } from 'vitest';

import { markPaidBody, paymentFrom, payoutFrom, refundFrom, rejectBody } from './liveFinance';

/** `AdminPaymentRow`, `PayoutHistoryRow`, `AdminRefundRow` as the panel reads them. No network. */

const payment = (over: Record<string, unknown> = {}) =>
  ({
    id: 'pay-1',
    consultation: { id: 'c-1', referenceCode: 'CC-2026-0001', erased: false },
    patient: { id: 'p-1', fullName: 'Aarav Mehta' },
    totalPayable: '1180.00',
    status: 'paid',
    method: 'upi',
    paidAt: '2026-10-10T09:00:00.000Z',
    orderReference: 'order_1',
    transactionReference: 'pay_1',
    refund: { status: 'none' },
    openRefundRequest: null,
    createdAt: '2026-10-10T08:50:00.000Z',
    ...over,
  }) as Parameters<typeof paymentFrom>[0];

describe('paymentFrom', () => {
  it('reads a paid consultation payment', () => {
    expect(paymentFrom(payment())).toEqual({
      id: 'pay-1',
      patientId: 'p-1',
      patientName: 'Aarav Mehta',
      service: 'consultation',
      ref: 'CC-2026-0001',
      to: '/appointments/c-1',
      amountInr: 1180,
      status: 'paid',
      txn: 'pay_1',
      at: '2026-10-10T09:00:00.000Z',
      refund: 'none',
    });
  });

  it('calls a checkout that was opened and not paid pending, dated by when it was created', () => {
    const p = paymentFrom(payment({ status: 'created', paidAt: null, transactionReference: null }));
    expect(p.status).toBe('pending');
    expect(p.at).toBe('2026-10-10T08:50:00.000Z');
    expect(p.txn).toBe('order_1');
  });

  it('shows an open refund request over the bill-level refund state', () => {
    const open = { id: 'rr-1', status: 'initiated', amount: 1180 };
    expect(paymentFrom(payment({ openRefundRequest: open })).refund).toBe('initiated');
    expect(paymentFrom(payment({ refund: { status: 'refunded' } })).refund).toBe('completed');
    expect(paymentFrom(payment({ refund: { status: 'pending' } })).refund).toBe('requested');
  });

  it('keeps a payment whose patient or consultation was erased, without inventing a name or a link', () => {
    const erased = paymentFrom(payment({ patient: null, consultation: { id: null, referenceCode: 'CC-2026-0009', erased: true } }));
    expect(erased.patientName).toBe('Erased patient');
    expect(erased.patientId).toBeNull();
    expect(erased.to).toBeNull();
    expect(erased.ref).toBe('CC-2026-0009');
  });
});

describe('payoutFrom', () => {
  it('reads what was owed and what is transferred, with the bank reference once paid', () => {
    const row = payoutFrom({
      paymentId: 'pay-1',
      consultationId: 'c-1',
      referenceCode: 'CC-2026-0001',
      provider: { id: 'd-1', fullName: 'Dr Asha Menon' },
      bankVerified: true,
      consultationFee: '800.00',
      commissionPct: 20,
      commissionAmount: '160.00',
      netPayout: '640.00',
      status: 'paid',
      paidAt: '2026-10-12T10:00:00.000Z',
      capturedAt: '2026-10-10T09:00:00.000Z',
      reference: 'NEFT/2026/10/0041',
      recordedBy: { id: 'a-1', fullName: 'Fin Admin' },
    });
    expect(row).toMatchObject({
      id: 'pay-1',
      consultationId: 'c-1',
      grossInr: 800,
      commissionInr: 160,
      netInr: 640,
      status: 'paid',
      bankReference: 'NEFT/2026/10/0041',
    });
  });
});

describe('markPaidBody', () => {
  it('sends nothing for a blank reference and the trimmed reference otherwise', () => {
    expect(markPaidBody('  ')).toEqual({});
    expect(markPaidBody(undefined)).toEqual({});
    expect(markPaidBody(' NEFT/1 ')).toEqual({ reference: 'NEFT/1' });
  });

  it('refuses a reference longer than the backend takes', () => {
    expect(() => markPaidBody('x'.repeat(121))).toThrow(/120/);
  });
});

describe('refundFrom and rejectBody', () => {
  const row = {
    id: 'rf-1',
    status: 'requested',
    amount: '1180.00',
    reason: 'Provider cancelled',
    requestedByParty: 'patient',
    decisionNote: null,
    decidedBySystem: false,
    decidedBy: null,
    createdAt: '2026-10-11T08:00:00.000Z',
    initiatedAt: null,
    completedAt: null,
    rejectedAt: null,
    consultation: { id: 'c-1', referenceCode: 'CC-2026-0001', erased: false },
    patient: { id: 'p-1', fullName: 'Aarav Mehta' },
    payment: { refundable: '1180.00', totalPayable: '1180.00' },
  } as Parameters<typeof refundFrom>[0];

  it('reads a request with its amount in rupees and who asked', () => {
    expect(refundFrom(row)).toMatchObject({
      id: 'rf-1',
      patientName: 'Aarav Mehta',
      amountInr: 1180,
      refundableInr: 1180,
      requestedBy: 'Patient',
      status: 'requested',
      decidedAt: null,
    });
  });

  it('says the platform decided, not nobody, when it refunded automatically', () => {
    const auto = refundFrom({ ...row, status: 'completed', decidedBySystem: true, completedAt: '2026-10-11T08:01:00.000Z' });
    expect(auto.decidedBy).toBe('Platform');
    expect(auto.decidedAt).toBe('2026-10-11T08:01:00.000Z');
  });

  it('requires a rejection to be explained, within the backend limit', () => {
    expect(rejectBody('  The consultation took place. ')).toEqual({ note: 'The consultation took place.' });
    expect(() => rejectBody('   ')).toThrow(/why/);
    expect(() => rejectBody('x'.repeat(301))).toThrow(/300/);
  });
});
