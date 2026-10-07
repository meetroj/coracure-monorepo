import { api } from '../http';

/**
 * What a consultation paid out (API_CONTRACT §7 — payouts).
 *
 * *** ONLY TWO STATES. *** `pending` or `paid` — there is no middle
 * "processed" step on the server, unlike the old local fixture's three-state
 * `PayoutState`. A screen built around three states has nothing real to put
 * in the middle one.
 */
export type Payout = {
  consultationFee: number;
  platformDeduction: number;
  doctorEarning: number;
  status: 'pending' | 'paid';
  paidAt: string | null;
};

/** A list row also names the consultation it was earned on. */
export type PayoutRow = Payout & { consultationId: string; referenceCode: string };

export const listPayouts = (): Promise<PayoutRow[]> => api.get<PayoutRow[]>('/doctor/payouts');

export const getPayout = (consultationId: string): Promise<Payout> =>
  api.get<Payout>(`/doctor/consultations/${consultationId}/payout`);
