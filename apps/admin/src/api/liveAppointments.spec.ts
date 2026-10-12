import { describe, expect, it } from 'vitest';

import {
  DISPLAY_STATUSES,
  billFromRecord,
  fromLiveRecord,
  fromLiveRow,
  liveQuery,
  type LiveRecord,
  type LiveRow,
} from './liveAppointments';

/**
 * These pin the panel's side of the backend's appointments contract
 * (`AdminConsultationRow`, `AdminConsultationQuery`, `ConsultationRecord`).
 * No network: they fail when a field is renamed, not when a server is down.
 */

const row = (over: Partial<LiveRow> = {}): LiveRow => ({
  id: 'c-1',
  referenceCode: 'CC-2026-00001',
  status: 'scheduled',
  displayStatus: 'upcoming',
  mode: 'scheduled',
  channel: 'video',
  scheduledStartAt: '2026-10-14T09:00:00.000Z',
  createdAt: '2026-10-12T05:00:00.000Z',
  durationMinutes: 30,
  startedAt: null,
  endedAt: null,
  actualDurationMinutes: null,
  patient: { id: 'p-1', fullName: 'Aarav Mehta' },
  doctor: { id: 'd-1', fullName: 'Dr Ananya Rao' },
  specialty: { id: 's-1', name: 'Psychiatry' },
  paymentStatus: 'paid',
  refundStatus: 'none',
  payment: { status: 'paid', amountInr: 1500, refundedAmountInr: 0 },
  ...over,
});

describe('liveQuery', () => {
  it('sends only what is set, newest first, from offset 0', () => {
    expect(liveQuery({})).toEqual({ sort: 'newest', limit: 25, offset: 0 });
  });

  it('asks the backend for display statuses, and turns Accepted into Upcoming', () => {
    expect(liveQuery({ status: 'completed' }).displayStatuses).toBe('completed');
    // Accepted and Upcoming are one backend state; there is nothing else to ask for.
    expect(liveQuery({ status: 'accepted' }).displayStatuses).toBe('upcoming');
  });

  it('only ever names a status the backend knows', () => {
    for (const s of DISPLAY_STATUSES) expect(liveQuery({ status: s }).displayStatuses).toBe(s);
  });

  it('makes "to" an exclusive instant: the start of the day after the chosen day', () => {
    const q = liveQuery({ from: '2026-10-01', to: '2026-10-01' });
    const from = new Date(q.from as string).getTime();
    const to = new Date(q.to as string).getTime();
    expect(to - from).toBe(86_400_000);
  });

  it('clamps the page size to the API maximum of 100 and trims the search', () => {
    expect(liveQuery({ limit: 500 }).limit).toBe(100);
    expect(liveQuery({ limit: 0 }).limit).toBe(1);
    expect(liveQuery({ search: '  CC-2026  ' }).search).toBe('CC-2026');
    expect(liveQuery({ search: '   ' })).not.toHaveProperty('search');
  });
});

describe('fromLiveRow', () => {
  it('carries the backend status word through unchanged', () => {
    expect(fromLiveRow(row({ displayStatus: 'rescheduled' })).displayStatus).toBe('rescheduled');
  });

  it('uses the booked start, and for Consult Now (no booked start) the request time', () => {
    expect(fromLiveRow(row()).startsAt).toBe('2026-10-14T09:00:00.000Z');
    expect(fromLiveRow(row({ scheduledStartAt: null, mode: 'instant' })).startsAt).toBe('2026-10-12T05:00:00.000Z');
  });

  it('shows an unassigned booking as unassigned, never as an id', () => {
    const r = fromLiveRow(row({ doctor: null }));
    expect(r.doctorId).toBeNull();
    expect(r.doctorName).toBeNull();
  });

  it('shows a patient with no name yet as such, not as an id', () => {
    expect(fromLiveRow(row({ patient: { id: 'p-9', fullName: null } })).patientName).toBe('Unnamed patient');
  });

  it('reads money from the payment row, not from the booking status', () => {
    const w = (payment: LiveRow['payment'], paymentStatus: LiveRow['paymentStatus']) =>
      fromLiveRow(row({ payment, paymentStatus })).paymentStatus;
    expect(w({ status: 'refunded', amountInr: 1, refundedAmountInr: 1 }, 'not_applicable')).toBe('refunded');
    expect(w({ status: 'unpaid', amountInr: 1, refundedAmountInr: 0 }, 'unpaid')).toBe('pending');
    // Refund pending still means money was taken.
    expect(w({ status: 'refund_pending', amountInr: 1, refundedAmountInr: 0 }, 'not_applicable')).toBe('paid');
    // A cancelled booking nobody ever paid for is neither pending nor paid.
    expect(w(null, 'not_applicable')).toBe('not_applicable');
  });

  it('keeps audio as audio and treats everything else as video', () => {
    expect(fromLiveRow(row({ channel: 'audio' })).channel).toBe('audio');
    expect(fromLiveRow(row({ channel: 'video' })).channel).toBe('video');
  });
});

const record = (over: Partial<LiveRecord> = {}): LiveRecord => ({
  id: 'c-1',
  referenceCode: 'CC-2026-00001',
  patientId: 'p-1',
  status: 'completed',
  displayStatus: 'completed',
  mode: 'scheduled',
  channel: 'video',
  specialtyId: 's-1',
  doctorId: 'd-1',
  scheduledStartAt: '2026-10-14T09:00:00.000Z',
  durationMinutes: 30,
  startedAt: '2026-10-14T09:02:00.000Z',
  endedAt: '2026-10-14T09:27:00.000Z',
  consultationFeeInr: 1500,
  paymentStatus: 'paid',
  payment: { status: 'paid', amountInr: 1770, refundedAmountInr: 0 },
  createdAt: '2026-10-12T05:00:00.000Z',
  ...over,
});

describe('fromLiveRecord', () => {
  it('uses the names it was given and a dash when a lookup failed', () => {
    const full = fromLiveRecord(record(), { patient: 'Aarav Mehta', doctor: 'Dr Rao', service: 'Psychiatry' });
    expect(full.patientName).toBe('Aarav Mehta');
    expect(full.doctorName).toBe('Dr Rao');
    expect(full.serviceName).toBe('Psychiatry');

    const bare = fromLiveRecord(record(), {});
    expect(bare.patientName).toBe('-');
    expect(bare.doctorName).toBeNull();
  });

  it('ends at the real end of the call when there is one, else the planned end', () => {
    expect(fromLiveRecord(record(), {}).endsAt).toBe('2026-10-14T09:27:00.000Z');
    const planned = fromLiveRecord(record({ endedAt: null, startedAt: null }), {});
    expect(planned.endsAt).toBe('2026-10-14T09:30:00.000Z');
  });

  it('reports the minutes the call actually ran, and nothing for a call that has not ended', () => {
    const ran = fromLiveRecord(record({ startedAt: '2026-10-14T09:00:00.000Z', endedAt: '2026-10-14T09:27:00.000Z' }), {});
    expect(ran.actualDurationMinutes).toBe(27);
    expect(fromLiveRecord(record({ startedAt: '2026-10-14T09:00:00.000Z', endedAt: null }), {}).actualDurationMinutes).toBeNull();
    expect(fromLiveRecord(record({ startedAt: null, endedAt: null }), {}).actualDurationMinutes).toBeNull();
  });

  it('has no end for a Consult Now request that has not started', () => {
    const r = fromLiveRecord(record({ scheduledStartAt: null, startedAt: null, endedAt: null, mode: 'instant' }), {});
    expect(r.startsAt).toBeNull();
    expect(r.endsAt).toBeNull();
  });
});

describe('billFromRecord', () => {
  it('shows what was charged and what went back, and leaves the breakdown empty', () => {
    const bill = billFromRecord(record({ payment: { status: 'refunded', amountInr: 1770, refundedAmountInr: 1770 } }));
    expect(bill).toMatchObject({ status: 'refunded', total: 1770, refundAmount: 1770 });
    // The fee split is on the patient's own bill; the panel does not recompute it.
    expect(bill.consultationFee).toBeUndefined();
    expect(bill.gstAmount).toBeUndefined();
  });

  it('says pending when there is no bill at all', () => {
    expect(billFromRecord(record({ payment: null }))).toMatchObject({ status: 'pending', total: null });
  });
});
