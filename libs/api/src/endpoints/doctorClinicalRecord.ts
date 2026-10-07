import { api } from '../http';

/**
 * Writing up a consultation — notes, prescription/advice, case summary and
 * finalising (API_CONTRACT §7.6).
 *
 * *** THE SAVE IS A FULL REPLACE, NOT A PATCH. *** Every `PUT` sends the
 * complete current record — a caller that sends only the field it just edited
 * silently erases everything else the backend already had. Every save call in
 * this app must build the whole `SaveClinicalRecordRequest` from the full
 * local record, never just the section the screen owns.
 *
 * *** ADVICE IS ASYMMETRIC. *** The request carries four flat sibling
 * strings (`adviceCovered`, `adviceHomePractice`, `adviceNextFocus`,
 * `adviceWarningSigns`); the response groups the same four into a nested
 * `advice` object. They are deliberately two different types here, not one
 * shared shape with optional nesting.
 *
 * *** THERE IS ONE LOCK FOR THE WHOLE RECORD, NOT THREE. *** `finalisedAt` is
 * a single timestamp — there is no backend concept of "notes saved but
 * prescription still open". The app's own notes/prescription/summary
 * checkpoints are local UI milestones layered on top; only the very last one
 * (finalising) should ever call `finaliseClinicalRecord`.
 */

export type RiskCategory = 'low' | 'moderate' | 'high';

export type MedicineInput = {
  /** Omit for a new line; send back to edit an existing line in place. */
  id?: string;
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions?: string;
  genericName?: string;
  route?: string;
  quantity?: string;
};

export type Medicine = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions?: string | null;
  genericName?: string | null;
  route?: string | null;
  quantity?: string | null;
};

export type Advice = {
  covered: string | null;
  homePractice: string | null;
  nextFocus: string | null;
  warningSigns: string | null;
};

/**
 * What finalising still needs. Present on every read (GET, PUT and finalise
 * responses), not only on a failed finalise — an empty array means finalise
 * is allowed right now.
 */
export type Outstanding = {
  code:
    | 'CASE_SUMMARY_MISSING'
    | 'CASE_SUMMARY_TOO_SHORT'
    | 'CASE_SUMMARY_TOO_LONG'
    | 'PRESCRIPTION_OR_ADVICE_MISSING'
    | 'ADVICE_MISSING';
  message: string;
};

export type ClinicalRecordView = {
  consultationId: string;
  chiefComplaint: string;
  clinicalHistory: string | null;
  diagnosis: string | null;
  isDiagnosisProvisional: boolean;
  riskCategory: RiskCategory;
  referralNote: string | null;
  /** Derived server-side: true iff `referralNote` is set. Not a separate flag to send. */
  referralAdvised: boolean;
  medicines: Medicine[];
  advice: Advice;
  caseSummary: string | null;
  recommendedContentIds: string[];
  /** Null = still a draft. There is no separate status field. */
  finalisedAt: string | null;
  /** Whether THIS doctor's specialty may prescribe — decides whether to show the medicines form at all. */
  canPrescribe: boolean;
  outstanding: Outstanding[];
  updatedAt: string;
};

export type SaveClinicalRecordRequest = {
  chiefComplaint: string;
  riskCategory: RiskCategory;
  clinicalHistory?: string;
  diagnosis?: string;
  isDiagnosisProvisional?: boolean;
  referralNote?: string;
  medicines?: MedicineInput[];
  adviceCovered?: string;
  adviceHomePractice?: string;
  adviceNextFocus?: string;
  adviceWarningSigns?: string;
  caseSummary?: string;
  recommendedContentIds?: string[];
};

export const getClinicalRecord = (consultationId: string): Promise<ClinicalRecordView> =>
  api.get<ClinicalRecordView>(`/doctor/consultations/${consultationId}/clinical-record`);

export const saveClinicalRecord = (
  consultationId: string,
  body: SaveClinicalRecordRequest,
): Promise<ClinicalRecordView> =>
  api.put<ClinicalRecordView>(`/doctor/consultations/${consultationId}/clinical-record`, body);

/** No request body. Refused with `RECORD_INCOMPLETE` (409) while `outstanding` is non-empty. */
export const finaliseClinicalRecord = (consultationId: string): Promise<ClinicalRecordView> =>
  api.post<ClinicalRecordView>(`/doctor/consultations/${consultationId}/clinical-record/finalise`);
