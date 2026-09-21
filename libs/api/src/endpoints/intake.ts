import { bookConsultation, requestInstantConsultation } from './consultations';
import type { Consultation } from '../types';

/**
 * *** GAP G-4 — THE INTAKE FORM HAS NO PATIENT ENDPOINT. ***
 *
 * `USER_STORIES.md` §3, gap G-4, against story PT-11-03:
 *
 *   "Intake answers and the specialty intake form have no dedicated patient
 *    endpoint in the shipped controllers. Confirm whether they ride on the
 *    booking body or need their own contract."
 *
 * Reading the backend settles half of it and leaves half open:
 *
 * - **The ANSWERS ride on the booking body.** `BookScheduledDto` and
 *   `RequestInstantDto` both accept `intakeAnswers?: Record<string, unknown>`,
 *   which `BookingService.create` snapshots onto the consultation row. So
 *   submitting answers needs no new endpoint — `submitIntakeWithBooking` below
 *   is the real, shipped path.
 *
 * - **The FORM does not.** `intakeForm` is a column on the specialty and is
 *   returned only by `GET /v1/admin/specialties/:id` (`SpecialtyRecord`), which
 *   is admin-scoped. `GET /v1/services` returns `ServiceListing`, which
 *   deliberately omits it. So the patient app has no way to ask what questions
 *   to render.
 *
 * *** THEREFORE `fetchIntakeForm` DOES NOT CALL AN ENDPOINT. *** Inventing
 * `GET /v1/services/:id/intake-form` and shipping a call to it would produce a
 * 404 in production and a contract nobody agreed. Instead it returns a
 * `formAvailable: false` result carrying the ONE question every specialty needs
 * and the backend already accepts — free text — and the screen renders that and
 * says plainly that the specialty-specific questions are not available yet.
 *
 * PT-11-03 also requires that "later consultations carry the existing history
 * forward and ask only what changed". That needs the same missing contract to
 * read prior answers back; `previousAnswers` is threaded through the types so
 * the screen is already shaped for it.
 *
 * WHEN G-4 CLOSES: implement `fetchIntakeForm` against the real endpoint and
 * set `formAvailable: true`. `IntakeQuestion` below is modelled on the JSON
 * shape `intakeForm` already stores, so the mapping should be thin.
 */

export type IntakeQuestionType = 'text' | 'longtext' | 'single' | 'multi' | 'number';

export type IntakeQuestion = {
  id: string;
  type: IntakeQuestionType;
  /** Rendered as-is. Backend-authored copy, never composed in the app. */
  label: string;
  help?: string;
  required?: boolean;
  /** For `single` and `multi`. */
  options?: { value: string; label: string }[];
  maxLength?: number;
};

export type IntakeForm = {
  specialtyId: string;
  questions: IntakeQuestion[];
  /**
   * FALSE while G-4 is open. The screen shows an honest note rather than
   * implying these are the specialty's real questions.
   */
  formAvailable: boolean;
  /** PT-11-03's "ask only what changed". Empty until the read contract exists. */
  previousAnswers: Record<string, unknown> | null;
};

/**
 * The single free-text question that works today.
 *
 * It is deliberately NOT clinical triage: it asks the patient what they want
 * the professional to know, which is the thing a consultation actually opens
 * with. `intakeAnswers` is free-form JSON on the backend, so this key is ours
 * to choose; `notes` is used because it is what the value is.
 */
export const FREE_TEXT_QUESTION: IntakeQuestion = {
  id: 'notes',
  type: 'longtext',
  // The one string in this file that is user-visible. The screen replaces it
  // with a localised label; this is the fallback if it does not.
  label: 'Anything you would like your professional to know before the call?',
  required: false,
  maxLength: 2000,
};

/**
 * What to render on the intake screen.
 *
 * No network call while G-4 is open — see the header. This is async because the
 * real implementation will be, so callers do not change shape later.
 */
export const fetchIntakeForm = async (specialtyId: string): Promise<IntakeForm> => ({
  specialtyId,
  questions: [FREE_TEXT_QUESTION],
  formAvailable: false,
  previousAnswers: null,
});

/**
 * Submits intake WITH the booking, which is the shipped contract.
 *
 * *** INTAKE CANNOT BE SUBMITTED AFTER BOOKING. *** There is no
 * `PATCH .../intake` route, so answers have to travel in the create call. That
 * is why the booking flow collects intake BEFORE `POST /me/consultations` and
 * not after payment, even though the reference flow shows intake later.
 */
export const submitIntakeWithBooking = (input: {
  specialtyId: string;
  startsAt: string;
  concernId?: string;
  answers: Record<string, unknown>;
}): Promise<Consultation> =>
  bookConsultation({
    specialtyId: input.specialtyId,
    startsAt: input.startsAt,
    ...(input.concernId ? { concernId: input.concernId } : {}),
    ...(hasAnswers(input.answers) ? { intakeAnswers: input.answers } : {}),
  });

export const submitIntakeWithInstant = (input: {
  specialtyId: string;
  concernId?: string;
  answers: Record<string, unknown>;
}): Promise<Consultation> =>
  requestInstantConsultation({
    specialtyId: input.specialtyId,
    ...(input.concernId ? { concernId: input.concernId } : {}),
    ...(hasAnswers(input.answers) ? { intakeAnswers: input.answers } : {}),
  });

/** An object of empty strings is not an answer; do not send it. */
const hasAnswers = (answers: Record<string, unknown>): boolean =>
  Object.values(answers).some((v) =>
    typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) ? v.length > 0 : v != null,
  );
