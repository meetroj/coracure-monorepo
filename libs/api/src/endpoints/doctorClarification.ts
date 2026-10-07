import { api } from '../http';

/**
 * Expert clarifications — a de-identified case raised for a second opinion
 * (API_CONTRACT §7.8).
 *
 * *** THE AUTHOR MAY NAME THE EXPERT AT POST TIME. *** `listExperts` gives
 * name and specialty only; `postCase(id, expertId)` sends the case straight to
 * that expert. With no expert named it waits in the admin's queue, and an
 * administrator can still reassign. The author's view of a case carries only
 * `expertDoctorId`.
 *
 * *** THE SERVER REFUSES, IT DOES NOT REDACT. *** A case (or an author reply)
 * containing an email, URL, Aadhaar number, Indian mobile number or a long run
 * of digits is refused with `IDENTIFIER_PRESENT` (400); `details.found` names
 * the field and the kind, never the matched text.
 *
 * *** THE SAME DTO CREATES AND PATCHES, AND PATCH IS NOT PARTIAL. *** Every
 * required field goes again; an optional one left out is cleared. Only a
 * `draft` can be patched.
 *
 * There is no attachment route in either direction — `attachmentIds` is read
 * only, and list endpoints always return it empty.
 */

export type ClarificationStatus =
  | 'draft'
  | 'posted'
  | 'awaiting_response'
  | 'response_received'
  | 'clarification_asked'
  | 'reviewed'
  | 'closed';

export type ClarificationUrgency = 'routine' | 'soon' | 'urgent';

export type ClarificationMessageType =
  | 'comment'
  | 'clinical_consideration'
  | 'clarification_request'
  | 'followup_recommendation'
  | 'author_reply';

export type CaseMessage = {
  authorId: string;
  authorRole: 'treating_doctor' | 'expert';
  messageType: ClarificationMessageType;
  body: string;
  at: string;
};

export type ExpertCaseView = {
  id: string;
  title: string;
  topic: string | null;
  patientAge: number | null;
  patientGender: 'male' | 'female' | 'other' | 'undisclosed' | null;
  briefHistory: string;
  diagnosis: string | null;
  currentPlan: string | null;
  specificDoubt: string;
  urgency: ClarificationUrgency;
  status: ClarificationStatus;
  assignedAt: string | null;
  /** Oldest first, at most 200. */
  messages: CaseMessage[];
  /** Always empty on a list response. */
  attachmentIds: string[];
  createdAt: string;
};

export type AuthorCaseView = ExpertCaseView & {
  sourceConsultationId: string | null;
  /** A uuid only — the reviewer's name is never exposed to the author. */
  expertDoctorId: string | null;
  postedAt: string | null;
  closedAt: string | null;
};

export type CaseInput = {
  title: string;
  topic?: string;
  patientAge?: number;
  patientGender?: 'male' | 'female' | 'other' | 'undisclosed';
  briefHistory: string;
  diagnosis?: string;
  currentPlan?: string;
  specificDoubt: string;
  urgency?: ClarificationUrgency;
  /** Kept only if the consultation is the caller's; set on create, ignored on patch. */
  sourceConsultationId?: string;
};

/** `details` of an `IDENTIFIER_PRESENT` refusal. */
export type IdentifierFound = {
  field: 'title' | 'topic' | 'briefHistory' | 'diagnosis' | 'currentPlan' | 'specificDoubt' | 'reply';
  kind: 'phone' | 'email' | 'aadhaar' | 'url' | 'long_digits';
};

/* --------------------------------- author --------------------------------- */

/**
 * Every case I raised, newest first. `openOnly` is left off rather than sent
 * as `false`: the query is coerced to a boolean server-side and the string
 * `"false"` would read as true.
 */
export const listCases = (): Promise<AuthorCaseView[]> =>
  api.get<AuthorCaseView[]>('/doctor/clarification-cases');

/** Creates a DRAFT. Nothing is shared until `postCase`. */
export const createCase = (input: CaseInput): Promise<AuthorCaseView> =>
  api.post<AuthorCaseView>('/doctor/clarification-cases', input);

export const getCase = (caseId: string): Promise<AuthorCaseView> =>
  api.get<AuthorCaseView>(`/doctor/clarification-cases/${caseId}`);

/** Draft only — `ALREADY_POSTED` (409) otherwise. The whole input, every time. */
export const updateDraft = (caseId: string, input: CaseInput): Promise<AuthorCaseView> =>
  api.patch<AuthorCaseView>(`/doctor/clarification-cases/${caseId}`, input);

/** An expert the author may ask: name and specialty, nothing else. */
export type ExpertChoice = { id: string; fullName: string; specialty: string | null };

export const listExperts = (): Promise<ExpertChoice[]> =>
  api.get<ExpertChoice[]>('/doctor/clarification-cases/experts');

/** To the named expert, or into the admin's queue when none is named. Re-scans for identifiers first. */
export const postCase = (caseId: string, expertDoctorId?: string): Promise<AuthorCaseView> =>
  api.post<AuthorCaseView>(`/doctor/clarification-cases/${caseId}/post`, expertDoctorId ? { expertDoctorId } : undefined);

/** Answering a `clarification_asked` hands the case back to the expert. */
export const replyToCase = (caseId: string, body: string): Promise<AuthorCaseView> =>
  api.post<AuthorCaseView>(`/doctor/clarification-cases/${caseId}/reply`, { body });

/** Only from `response_received` or `clarification_asked`. No body. */
export const markCaseReviewed = (caseId: string): Promise<AuthorCaseView> =>
  api.post<AuthorCaseView>(`/doctor/clarification-cases/${caseId}/reviewed`);

/** Any posted state; a draft cannot be closed. No body. */
export const closeCase = (caseId: string): Promise<AuthorCaseView> =>
  api.post<AuthorCaseView>(`/doctor/clarification-cases/${caseId}/close`);

/* --------------------------------- expert --------------------------------- */

/** Cases assigned to me, open only by default, never drafts. */
export const listReviews = (): Promise<ExpertCaseView[]> =>
  api.get<ExpertCaseView[]>('/doctor/expert-reviews');

export const getReview = (caseId: string): Promise<ExpertCaseView> =>
  api.get<ExpertCaseView>(`/doctor/expert-reviews/${caseId}`);

export const replyAsExpert = (
  caseId: string,
  input: { messageType: Exclude<ClarificationMessageType, 'author_reply'>; body: string },
): Promise<ExpertCaseView> => api.post<ExpertCaseView>(`/doctor/expert-reviews/${caseId}/reply`, input);
