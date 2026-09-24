import { apiClient } from '../client';
import { getConsultation } from './consultations';
import type { Consultation } from '../types';

/**
 * The bill and checkout (FR-7, PT-12-01..03).
 */

export type BillLine = {
  label: string;
  amountInr: number;
};

export type Bill = {
  consultationId: string;
  lines?: BillLine[];
  totalInr: number;
  currency?: string;
  status?: string;
  paidAt?: string | null;
  /** PT-12-03. Present once a refund has been raised. */
  refundStatus?: string | null;
  refundAmountInr?: number | null;
};

export const getBill = (consultationId: string): Promise<Bill> =>
  apiClient.get<Bill>(`/me/consultations/${consultationId}/bill`);

/** The methods PT-12-01 names. Which are actually live is the gateway's call. */
export const PAYMENT_METHODS = ['upi', 'card', 'netbanking', 'wallet'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type CheckoutSession = Record<string, unknown> & {
  /** Present on most gateways; used only for display and support tickets. */
  orderId?: string;
  /** Some gateways return a URL to open instead of an SDK payload. */
  paymentUrl?: string;
};

export const openCheckout = (consultationId: string): Promise<CheckoutSession> =>
  apiClient.post<CheckoutSession>(`/me/consultations/${consultationId}/checkout`);

/**
 * *** THE ONLY WAY THE APP LEARNS A PAYMENT SETTLED. ***
 *
 * Re-reads the consultation and reports whether the backend has moved it on.
 * `pending_payment` means the webhook has not landed — which after a successful
 * gateway return usually means "wait a moment", not "it failed".
 *
 * Deliberately NOT a webhook listener and NOT a trust of the gateway callback:
 * both would let a client-side claim of success through.
 */
export type SettlementState =
  /** Backend has confirmed. The consultation is booked. */
  | { settled: true; consultation: Consultation }
  /** Still holding. Keep waiting or let the user retry. */
  | { settled: false; consultation: Consultation; holdExpired: boolean };

export const checkSettlement = async (consultationId: string): Promise<SettlementState> => {
  const consultation = await getConsultation(consultationId);

  if (consultation.status === 'pending_payment') {
    const holdExpired =
      !!consultation.holdExpiresAt && new Date(consultation.holdExpiresAt).getTime() <= Date.now();
    return { settled: false, consultation, holdExpired };
  }

  // `expired` is the sweep having released the hold; that is not settlement.
  if (consultation.status === 'expired') {
    return { settled: false, consultation, holdExpired: true };
  }

  return { settled: true, consultation };
};
