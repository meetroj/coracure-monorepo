import { api } from '../http';
import { getConsultation } from './consultations';
import type { Consultation } from '../types';

/**
 * The bill and checkout (FR-7, PT-12-01..03).
 *
 * *** THE CLIENT NEVER DECIDES THAT PAYMENT SUCCEEDED. *** PT-12-01: "success
 * is confirmed by the backend, never by the client alone." The gateway
 * returning to the app means the gateway is finished with the user — it does
 * not mean money moved. Only a verified webhook moves the consultation out of
 * `pending_payment`, so the app confirms by RE-READING the consultation and
 * looking at `status`, and says "confirming" until it changes.
 *
 * `getBill` is a safe read. `openCheckout` is not — it freezes the bill on the
 * payment row — so it is called at the moment the patient commits to paying and
 * never speculatively.
 */

export type BillLine = {
  label: string;
  amountInr: number;
};

/**
 * PT-12-02 wants the consultation fee, convenience fee, GST and total broken
 * out. The backend returns the frozen bill; `lines` is optional because the
 * exact key names are not frozen in the contract document, and the UI falls
 * back to the consultation's quoted fee rather than rendering nothing.
 */
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
  api.get<Bill>(`/me/consultations/${consultationId}/bill`);

/** The methods PT-12-01 names. Which are actually live is the gateway's call. */
export const PAYMENT_METHODS = ['upi', 'card', 'netbanking', 'wallet'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Whatever the gateway SDK needs to open its sheet.
 *
 * Left deliberately loose: the backend returns "what the gateway SDK needs",
 * and that shape belongs to the gateway, not to us. Typing it precisely before
 * the SDK is chosen would be inventing a contract.
 */
export type CheckoutSession = Record<string, unknown> & {
  /** Present on most gateways; used only for display and support tickets. */
  orderId?: string;
  /** Some gateways return a URL to open instead of an SDK payload. */
  paymentUrl?: string;
};

/**
 * Opens checkout.
 *
 * Refused with `ALREADY_PAID` or `NOT_PAYABLE` — neither should be retried
 * blindly. Reconcile against `getBill` and `getConsultation` instead.
 */
export const openCheckout = (consultationId: string): Promise<CheckoutSession> =>
  api.post<CheckoutSession>(`/me/consultations/${consultationId}/checkout`);

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
