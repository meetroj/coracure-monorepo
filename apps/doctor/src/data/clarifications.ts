import { useEffect } from 'react';

import { doctorClarificationApi, doctorProfileApi } from '@coracure/api';
import type {
  AuthorCaseView,
  CaseInput,
  ClarificationMessageType,
  ClarificationStatus,
  ClarificationUrgency,
  ExpertCaseView,
  IdentifierFound,
} from '@coracure/api';
import { ApiError } from '@coracure/api/errors';

import { setClarifications, upsertClarification } from '../state/actions';
import { getState } from '../state/store';
import { fmtAgo } from './calendar';
import { PROFILE_KEY } from './profile';
import type { Clarification, ClarificationDraft, ClarificationMessage, ListStatus, ResponseType, Urgency } from './clarification';
import { peekResource, seedResource, useResource } from './useResource';

/**
 * The author's clarifications against the real backend (API_CONTRACT §7.8).
 *
 * The screens keep reading `state.clarifications`; this maps the backend's
 * case onto that shape, replaces the list once it loads, and pushes every
 * action through the API before the local copy changes.
 *
 * Shapes that do not line up, and what this does:
 *
 *  - The human case reference (`CLR-…`) has no backend field. It is derived
 *    from the case id, so it is stable but not sequential.
 *  - The reviewer's name is never sent to the author. Messages from the expert
 *    carry only their id, so the thread reads "Expert".
 *  - There is no "decision" field. A recorded decision is posted as an author
 *    reply prefixed `Decision recorded:` — on the thread, visible to the
 *    expert, scanned for identifiers like any reply — and read back from it.
 *  - There are no attachments in either direction.
 */

export const KEYS = { list: 'doctor:clarifications', one: (caseId: string) => `doctor:clarification:${caseId}` };

/** The experts the author can ask, read fresh each time the picker opens. */
export const useExperts = (enabled: boolean) =>
  useResource('doctor:clarification-experts', () => doctorClarificationApi.listExperts(), { enabled, staleAfter: 0 });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isServerId = (id: string) => UUID.test(id);

const STATUS: Record<ClarificationStatus, ListStatus> = {
  draft: 'draft',
  posted: 'posted',
  awaiting_response: 'expertReview',
  clarification_asked: 'clarificationNeeded',
  response_received: 'responseReceived',
  reviewed: 'reviewed',
  closed: 'closed',
};

const URGENCY_IN: Record<ClarificationUrgency, Urgency> = { routine: 'routine', soon: 'priority', urgent: 'urgent' };
const URGENCY_OUT: Record<Urgency, ClarificationUrgency> = { routine: 'routine', priority: 'soon', urgent: 'urgent' };

const KIND: Partial<Record<ClarificationMessageType, ResponseType>> = {
  comment: 'comment',
  clinical_consideration: 'considerations',
  clarification_request: 'clarification',
  followup_recommendation: 'followUp',
};

const GENDER_IN = { male: 'Male', female: 'Female', other: 'Other', undisclosed: 'Other' } as const;
const GENDER_OUT = { Male: 'male', Female: 'female', Other: 'other' } as const;

const ICON_BY_AREA: Record<string, Clarification['icon']> = {
  'Treatment plan review': 'brain',
  'Diagnostic clarification': 'inPerson',
  'Medication adjustment': 'heart',
  'Risk assessment': 'brain',
  'Referral advice': 'inPerson',
};

export const DECISION_PREFIX = 'Decision recorded: ';

const agoLabel = (iso: string) => fmtAgo(Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000));

const opt = (s: string) => {
  const t = s.trim();
  return t ? t : undefined;
};

export const toClarification = (v: AuthorCaseView): Clarification => {
  const messages: ClarificationMessage[] = v.messages.map((m, i) => ({
    id: `${v.id}-${i}`,
    author: m.authorRole === 'treating_doctor' ? 'me' : m.authorId,
    kind: KIND[m.messageType],
    body: m.body,
    at: agoLabel(m.at),
  }));
  const lastGuidance = [...v.messages].reverse().find((m) => m.authorRole === 'expert' && m.messageType !== 'clarification_request');
  const lastDecision = [...v.messages].reverse().find((m) => m.authorRole === 'treating_doctor' && m.body.startsWith(DECISION_PREFIX));
  const [value, note = ''] = lastDecision ? lastDecision.body.slice(DECISION_PREFIX.length).split(' — ') : [];
  const lastAt = v.messages[v.messages.length - 1]?.at ?? v.closedAt ?? v.postedAt ?? v.createdAt;

  return {
    id: v.id,
    caseId: `CLR-${v.id.slice(0, 8).toUpperCase()}`,
    appointmentId: v.sourceConsultationId ?? '',
    title: v.title,
    blurb: v.specificDoubt.slice(0, 120),
    icon: ICON_BY_AREA[v.topic ?? ''] ?? 'brain',
    urgency: URGENCY_IN[v.urgency],
    status: STATUS[v.status],
    lastActivity: agoLabel(lastAt),
    shared: {
      ageLabel: v.patientAge === null ? 'Age not given' : `${v.patientAge} years`,
      gender: v.patientGender ? GENDER_IN[v.patientGender] : 'Other',
      provisionalDiagnosis: v.diagnosis ?? '',
      history: v.briefHistory,
      currentPlan: v.currentPlan ?? '',
      question: v.specificDoubt,
      guidanceArea: v.topic ?? '',
      files: [],
    },
    expertId: v.expertDoctorId ?? '',
    messages,
    ...(lastGuidance
      ? { guidance: { body: lastGuidance.body, kind: KIND[lastGuidance.messageType] ?? 'comment', at: agoLabel(lastGuidance.at), attachments: 0 } }
      : {}),
    ...(lastDecision ? { outcome: { value: value ?? '', note, at: agoLabel(lastDecision.at) } } : {}),
  };
};

/** Every field, every time — PATCH is not partial, and a missing optional one is cleared. */
export const toCaseInput = (d: ClarificationDraft): CaseInput => ({
  title: d.title.trim(),
  ...(opt(d.guidanceArea) ? { topic: opt(d.guidanceArea) } : {}),
  ...(d.age !== null ? { patientAge: d.age } : {}),
  patientGender: GENDER_OUT[d.gender],
  briefHistory: d.history.trim(),
  ...(opt(d.provisionalDiagnosis) ? { diagnosis: opt(d.provisionalDiagnosis) } : {}),
  ...(opt(d.currentPlan) ? { currentPlan: opt(d.currentPlan) } : {}),
  specificDoubt: d.question.trim(),
  urgency: URGENCY_OUT[d.urgency],
  // `appointmentId` is the real consultation id; a fixture one is not, and is left off.
  ...(isServerId(d.appointmentId) ? { sourceConsultationId: d.appointmentId } : {}),
});

const FIELD_LABEL: Record<IdentifierFound['field'], string> = {
  title: 'the title',
  topic: 'the guidance area',
  briefHistory: 'the history',
  diagnosis: 'the diagnosis',
  currentPlan: 'the current plan',
  specificDoubt: 'the question',
  reply: 'your reply',
};

/** Where the server found an identifier, in words — or null if that was not the refusal. */
export const identifierProblem = (e: unknown): string | null => {
  if (!ApiError.is(e) || e.code !== 'IDENTIFIER_PRESENT') return null;
  const found = (e.details as { found?: IdentifierFound[] } | null)?.found ?? [];
  const where = [...new Set(found.map((f) => FIELD_LABEL[f.field]))];
  return where.length ? `${e.message} Check ${where.join(', ')}.` : e.message;
};

/** The author's real list, laid over the local one once it loads. A failure keeps what is shown. */
export const useAuthorClarifications = () => {
  const resource = useResource(KEYS.list, doctorClarificationApi.listCases);
  useEffect(() => {
    if (resource.data) setClarifications(resource.data.map(toClarification));
  }, [resource.data]);
  return resource;
};

/** The server's case in the store, keyed to the consultation it came from — real id or a local one. */
const land = (v: AuthorCaseView, appointmentId: string, replaces?: string): Clarification => {
  const c = { ...toClarification(v), appointmentId: v.sourceConsultationId ?? appointmentId };
  upsertClarification(c, replaces);
  return c;
};

/**
 * A case the server just answered a change with — into the store AND both
 * caches. Without the caches, the next mount of the list (fresh for a while)
 * would lay the list from before the change over it.
 */
const keep = (v: AuthorCaseView, appointmentId: string, replaces?: string): Clarification => {
  seedResource(KEYS.one(v.id), v);
  const list = peekResource<AuthorCaseView[]>(KEYS.list);
  // never loaded: leave it unloaded, or a later read would take this one case for the whole list
  if (list) seedResource(KEYS.list, list.some((x) => x.id === v.id) ? list.map((x) => (x.id === v.id ? v : x)) : [v, ...list]);
  return land(v, appointmentId, replaces);
};

/** One case, read fresh, so the thread shows the server's messages rather than the list row's. */
export const useAuthorClarification = (caseId: string) => {
  const resource = useResource(KEYS.one(caseId), () => doctorClarificationApi.getCase(caseId), { enabled: isServerId(caseId) });
  useEffect(() => {
    if (resource.data) land(resource.data, getState().clarifications.find((c) => c.id === caseId)?.appointmentId ?? '');
  }, [resource.data, caseId]);
  return resource;
};

/**
 * Saves the case to the server — creating it, or patching the draft it
 * already is — and posts it when asked. Returns the case's real id.
 *
 * `onSaved` hears the id as soon as the case exists: if the post then fails,
 * the retry must patch and post this same case, not create a second one.
 * A local-only id (a seeded draft) is created fresh, and the old local row is
 * replaced by the server's.
 */
export const saveCase = async (
  draft: ClarificationDraft,
  post: boolean,
  existingId?: string,
  onSaved?: (id: string) => void
): Promise<string> => {
  const input = toCaseInput(draft);
  let view =
    existingId && isServerId(existingId)
      ? await doctorClarificationApi.updateDraft(existingId, input)
      : await doctorClarificationApi.createCase(input);
  keep(view, draft.appointmentId, existingId);
  onSaved?.(view.id);
  if (post) {
    view = await doctorClarificationApi.postCase(view.id, draft.expertDoctorId);
    keep(view, draft.appointmentId);
  }
  return view.id;
};

export const replyToCase = async (c: Clarification, body: string) =>
  keep(await doctorClarificationApi.replyToCase(c.id, body), c.appointmentId, c.id);

/**
 * Marks the case reviewed, records the decision on the thread, and closes it
 * when asked.
 *
 * Reviewed comes FIRST: a reply to a `clarification_asked` case is taken as
 * the answer to the expert's question and hands the case back to them, after
 * which /reviewed is refused. A reviewed case still takes the author's reply.
 *
 * Every step lands in the store before the next, and the caller passes the
 * store's row, so a retry after a failure resumes where it stopped — a
 * decision already on the thread is not posted twice.
 */
export const recordDecision = async (c: Clarification, outcome: string, note: string, close: boolean) => {
  // trimmed as the server stores it, so the retry check below compares like with like
  const body = `${DECISION_PREFIX}${outcome}${note ? ` — ${note}` : ''}`.trim();
  let now = c;
  if (now.status === 'responseReceived' || now.status === 'clarificationNeeded') {
    now = keep(await doctorClarificationApi.markCaseReviewed(c.id), c.appointmentId, c.id);
  }
  const last = now.messages[now.messages.length - 1];
  if (!(last?.author === 'me' && last.body === body)) {
    now = keep(await doctorClarificationApi.replyToCase(c.id, body), c.appointmentId, c.id);
  }
  if (close && now.status !== 'closed') keep(await doctorClarificationApi.closeCase(c.id), c.appointmentId, c.id);
};

export const closeCase = async (c: Clarification) => keep(await doctorClarificationApi.closeCase(c.id), c.appointmentId, c.id);

/* ------------------------------ the expert side ---------------------------- */

/**
 * A case as the assigned EXPERT sees it — the same case from the other side.
 *
 * Deliberately its own shape, not `Clarification`: the expert gets no source
 * consultation, no patient initials, no treating doctor's name and no
 * decision — the backend's `ExpertCaseView` leaves all of them out, and so
 * must anything rendered from it. Messages are from the expert's point of
 * view: `me` is the expert, the other party is "Treating doctor".
 */
export type ReviewCase = {
  id: string;
  ref: string;
  title: string;
  ageLabel: string;
  gender: 'Male' | 'Female' | 'Other';
  urgency: Urgency;
  status: ClarificationStatus;
  history: string;
  diagnosis: string;
  currentPlan: string;
  question: string;
  guidanceArea: string;
  assignedAgo: string;
  messages: ClarificationMessage[];
};

export const REVIEW_KEYS = {
  list: 'doctor:expert-reviews',
  one: (caseId: string) => `doctor:expert-review:${caseId}`,
};

/** What the expert may still do. Reviewed or closed is read-only for them. */
export const canExpertReply = (status: ClarificationStatus) =>
  status === 'awaiting_response' || status === 'response_received' || status === 'clarification_asked';

export const REVIEW_STATUS_LABEL: Record<ClarificationStatus, string> = {
  draft: 'Draft',
  posted: 'Posted',
  awaiting_response: 'Awaiting your response',
  clarification_asked: 'Waiting on the doctor',
  response_received: 'Answered',
  reviewed: 'Reviewed by the doctor',
  closed: 'Closed',
};

export const toReviewCase = (v: ExpertCaseView): ReviewCase => ({
  id: v.id,
  ref: `CLR-${v.id.slice(0, 8).toUpperCase()}`,
  title: v.title,
  ageLabel: v.patientAge === null ? 'Age not given' : `${v.patientAge} years`,
  gender: v.patientGender ? GENDER_IN[v.patientGender] : 'Other',
  urgency: URGENCY_IN[v.urgency],
  status: v.status,
  history: v.briefHistory,
  diagnosis: v.diagnosis ?? '',
  currentPlan: v.currentPlan ?? '',
  question: v.specificDoubt,
  guidanceArea: v.topic ?? '',
  assignedAgo: agoLabel(v.assignedAt ?? v.createdAt),
  messages: v.messages.map((m, i) => ({
    id: `${v.id}-${i}`,
    author: m.authorRole === 'expert' ? 'me' : 'doctor',
    kind: KIND[m.messageType],
    body: m.body,
    at: agoLabel(m.at),
  })),
});

/** Cases assigned to me, open ones only — the server's default. */
export const useExpertReviews = () =>
  useResource(REVIEW_KEYS.list, async () => (await doctorClarificationApi.listReviews()).map(toReviewCase));

export const useExpertReview = (caseId: string) =>
  useResource(REVIEW_KEYS.one(caseId), async () => toReviewCase(await doctorClarificationApi.getReview(caseId)));

/**
 * Whether the backend counts this doctor as an expert. Only experts are ever
 * assigned cases, so only they are shown the inbox. A failed read hides it —
 * an inbox that might be empty for everyone is worse than one that is late.
 */
export const useIsExpert = () => {
  // the same cache key as the shell's profile read, so this costs no request
  const profile = useResource(PROFILE_KEY, doctorProfileApi.getProfile);
  return profile.data?.seniorityLevel === 'expert';
};

const MESSAGE_TYPE_OUT: Record<ResponseType, Exclude<ClarificationMessageType, 'author_reply'>> = {
  comment: 'comment',
  considerations: 'clinical_consideration',
  clarification: 'clarification_request',
  followUp: 'followup_recommendation',
};

/** Sends the expert's guidance. `clarification` asks the treating doctor a question back. */
export const replyAsExpert = async (caseId: string, kind: ResponseType, body: string): Promise<ReviewCase> =>
  toReviewCase(await doctorClarificationApi.replyAsExpert(caseId, { messageType: MESSAGE_TYPE_OUT[kind], body }));
