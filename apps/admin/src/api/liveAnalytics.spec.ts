import { describe, expect, it } from 'vitest';

import {
  changeLabel,
  customProblem,
  followUpCompletion,
  labReportsCompleted,
  percentLabel,
  providerCancellation,
  providerTotals,
  rateLabel,
  reportParams,
  type AnalyticsFilters,
  type Consultations,
  type ProviderQuality,
} from './liveAnalytics';

/**
 * The panel's side of the analytics contract: how a window is asked for, how a
 * rate (a fraction) and a share (a percent) are shown, and the few totals it
 * adds up from what the backend sent. No network.
 */

const base: AnalyticsFilters = { range: '30', from: '', to: '', category: '', specialtyId: '', serviceType: '' };
const NOW = new Date('2026-10-12T10:00:00.000Z');

describe('reportParams', () => {
  it('asks for the last N days up to a minute past now, so the current day is included', () => {
    const p = reportParams({ ...base, range: '7' }, NOW);
    expect(p.from).toBe('2026-10-05T10:00:00.000Z');
    expect(p.to).toBe('2026-10-12T10:01:00.000Z');
  });

  it('passes only the filters that are set', () => {
    const p = reportParams({ ...base, category: 'medical', specialtyId: 'sp-1', serviceType: 'consultation' }, NOW);
    expect(p).toMatchObject({ category: 'medical', specialtyId: 'sp-1', serviceType: 'consultation' });
    const none = reportParams(base, NOW);
    expect(none.category).toBeUndefined();
    expect(none.serviceType).toBeUndefined();
  });

  it('takes a custom window as whole days with the last day included', () => {
    const p = reportParams({ ...base, range: 'custom', from: '2026-09-01', to: '2026-09-30' }, NOW);
    expect(new Date(p.from as string).getTime()).toBe(new Date('2026-09-01T00:00:00').getTime());
    expect(new Date(p.to as string).getTime()).toBe(new Date('2026-10-01T00:00:00').getTime());
  });

  it('falls back to thirty days when a custom window is not usable, and says why', () => {
    expect(customProblem({ range: 'custom', from: '', to: '' })).toMatch(/both dates/);
    expect(customProblem({ range: 'custom', from: '2026-10-05', to: '2026-10-01' })).toMatch(/not be after/);
    expect(customProblem({ range: 'custom', from: '2026-10-01', to: '2026-10-05' })).toBeNull();
    expect(customProblem(base)).toBeNull();
    const p = reportParams({ ...base, range: 'custom', from: '', to: '' }, NOW);
    expect(p.from).toBe('2026-09-12T10:00:00.000Z');
  });
});

describe('formatting', () => {
  it('shows a rate, which is a fraction, as a percentage', () => {
    expect(rateLabel(0.0523)).toBe('5.2%');
    expect(rateLabel(1)).toBe('100%');
    expect(rateLabel(0)).toBe('0%');
  });

  it('shows a share, which is already a percentage, as it is', () => {
    expect(percentLabel(33.3)).toBe('33.3%');
    expect(percentLabel(100)).toBe('100%');
  });

  it('never turns "not measured" into a zero', () => {
    expect(rateLabel(null)).toBe('-');
    expect(percentLabel(null)).toBe('-');
    expect(changeLabel({ changePercent: null })).toBeNull();
  });

  it('signs a change', () => {
    expect(changeLabel({ changePercent: 12.34 })).toBe('+12.3%');
    expect(changeLabel({ changePercent: -3 })).toBe('-3%');
    expect(changeLabel({ changePercent: 0 })).toBe('0%');
  });
});

const row = (over: Partial<ProviderQuality> = {}): ProviderQuality => ({
  doctorId: 'd',
  fullName: 'Dr A',
  verificationStatus: 'verified',
  category: 'medical',
  specialty: null,
  offered: 10,
  accepted: 8,
  acceptanceRate: 0.8,
  completed: 7,
  noShow: 1,
  attended: 8,
  noShowRate: 0.125,
  averageRating: 4.5,
  ratingCount: 4,
  complaints: 1,
  summaryCompletion: 0.9,
  ...over,
});

describe('providerTotals', () => {
  it('adds up the table and derives the rates from the totals, not by averaging rates', () => {
    const t = providerTotals({
      items: [row({ offered: 10, accepted: 8 }), row({ offered: 30, accepted: 6, noShow: 0, attended: 20, complaints: 2 })],
      total: 2,
      limit: 100,
      offset: 0,
      sort: 'completed',
    });
    expect(t).toMatchObject({ offered: 40, accepted: 14, acceptanceRate: 0.35, complaints: 3, completed: 14, complete: true });
    expect(t.noShowRate).toBeCloseTo(1 / 28, 5);
  });

  it('says so when the table is only the top of the providers', () => {
    expect(providerTotals({ items: [row()], total: 250, limit: 100, offset: 0, sort: 'completed' }).complete).toBe(false);
  });

  it('has no rate when nothing was offered', () => {
    const t = providerTotals({ items: [row({ offered: 0, accepted: 0, attended: 0, noShow: 0 })], total: 1, limit: 100, offset: 0, sort: 'completed' });
    expect(t.acceptanceRate).toBeNull();
    expect(t.noShowRate).toBeNull();
  });
});

describe('providerCancellation', () => {
  const report = (requested: number, byParty: { party: string; count: number }[]) =>
    ({
      kpis: { requested: { value: requested, previous: 0, changePercent: null } },
      cancellations: { byParty: byParty.map((p) => ({ ...p, percent: 0 })) },
    }) as unknown as Consultations;

  it('counts only the cancellations a provider made, out of every appointment', () => {
    const c = providerCancellation(report(200, [{ party: 'patient', count: 12 }, { party: 'doctor', count: 6 }, { party: 'admin', count: 2 }]));
    expect(c).toEqual({ count: 6, rate: 0.03 });
  });

  it('has no rate with no appointments', () => {
    expect(providerCancellation(report(0, [{ party: 'doctor', count: 0 }])).rate).toBeNull();
  });
});

describe('follow-up completion and lab reports', () => {
  it('is completed plans over every plan, active or done', () => {
    expect(followUpCompletion({ active: 6, completed: 4, checkinsSubmitted: 30 })).toEqual({ completed: 4, total: 10, rate: 0.4 });
    expect(followUpCompletion({ active: 0, completed: 0, checkinsSubmitted: 0 }).rate).toBeNull();
  });

  it('counts a report as completed once it is uploaded or the order is closed', () => {
    expect(labReportsCompleted({ byStatus: { report_uploaded: 3, completed: 9, processing: 5 } })).toBe(12);
    expect(labReportsCompleted({ byStatus: {} })).toBe(0);
  });
});
