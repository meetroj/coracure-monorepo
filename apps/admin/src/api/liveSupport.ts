import { getSession, request } from './http';
import { listAll, type Everything } from './liveList';
import type { Complaint, ComplaintMessage } from './types';

/**
 * Support against the backend: tickets (`/admin/tickets`), complaints
 * (`/admin/complaints`) and feedback (`/admin/feedback`, `/admin/feedback/app`).
 *
 * Source of truth: `AdminTicketRow`, `AdminTicketView`, `AdminComplaintView`,
 * `FeedbackSummary`, `AppFeedbackRow` and their DTOs.
 *
 * What the backend does not have, so the panel does not show: a `new` ticket
 * status (a ticket is open from the start), a ticket category list (the
 * category is a free word of at most 60 characters), and patient or provider
 * NAMES on consultation feedback (only the consultation reference and the
 * provider's id).
 */

/* ------------------------------ the admin's id ------------------------------ */

/**
 * The signed-in admin's own id, from the token's `sub` claim. It is what
 * "assign to me" sends. A decode, not a verification: the backend checks the
 * signature on every request, and refuses an assignee that is not an active
 * admin.
 */
export function adminIdFromToken(accessToken: string): string | null {
  const payload = accessToken.split('.')[1];
  if (!payload) return null;
  try {
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))) as { sub?: string; typ?: string };
    return claims.typ === 'admin' && claims.sub ? claims.sub : null;
  } catch {
    return null;
  }
}

const myId = (): string => {
  const token = getSession()?.accessToken;
  const id = token ? adminIdFromToken(token) : null;
  if (!id) throw new Error('Sign in again to assign this to yourself.');
  return id;
};

/* --------------------------------- threads --------------------------------- */

type LiveMessage = { seq: number; authorId: string; authorRole: 'patient' | 'provider' | 'admin'; body: string; isInternal: boolean; at: string };

/** An internal note is the only thing the patient or provider cannot read. */
export const messageFrom = (m: LiveMessage): ComplaintMessage => ({
  id: String(m.seq),
  body: m.body,
  authorType: m.authorRole,
  visibleToPatient: !m.isInternal,
  createdAt: m.at,
});

/* -------------------------------- complaints ------------------------------- */

type LiveComplaint = {
  id: string;
  referenceCode: string;
  category: string;
  subject: string;
  description: string;
  status: Complaint['status'];
  consultationId: string | null;
  messages: LiveMessage[];
  resolutionNote: string | null;
  createdAt: string;
  patientId: string;
  assignedToAdminId: string | null;
};

export type ComplaintRow = Complaint & { referenceCode: string; description: string; resolutionNote: string | null; patientId: string };

export const complaintFrom = (c: LiveComplaint): ComplaintRow => ({
  id: c.id,
  category: c.category,
  status: c.status,
  subject: c.subject,
  consultationId: c.consultationId,
  raisedAt: c.createdAt,
  assignedAdminId: c.assignedToAdminId,
  messages: c.messages.map(messageFrom),
  referenceCode: c.referenceCode,
  description: c.description,
  resolutionNote: c.resolutionNote,
  patientId: c.patientId,
});

/** Both endings need a note, at most 4000 characters (`CloseComplaintDto`). */
export function closeBody(outcome: 'resolved' | 'rejected', note: string): { outcome: string; resolutionNote: string } {
  const text = note.trim();
  if (!text) throw new Error('Write a note: both endings need one.');
  if (text.length > 4000) throw new Error('The note can be at most 4000 characters.');
  return { outcome, resolutionNote: text };
}

/** A reply is 1 to 4000 characters; `isInternal` is the opposite of "shared with the patient". */
export function replyBody(body: string, visibleToRequester: boolean): { body: string; isInternal: boolean } {
  const text = body.trim();
  if (!text) throw new Error('Write a message first.');
  if (text.length > 4000) throw new Error('A message can be at most 4000 characters.');
  return { body: text, isInternal: !visibleToRequester };
}

const complaintPath = (id: string) => `/admin/complaints/${encodeURIComponent(id)}`;

/** The `support` facade's live half. */
export const liveSupport = {
  complaints: async (q: { status?: string } = {}) => {
    const rows = await request<LiveComplaint[]>('/admin/complaints', {
      query: { status: q.status || undefined, limit: 200 },
    });
    return rows.map(complaintFrom);
  },

  complaint: async (id: string) => request<LiveComplaint>(complaintPath(id)).then(complaintFrom),

  assign: async (id: string) =>
    request<LiveComplaint>(`${complaintPath(id)}/assign`, { method: 'POST', body: { assignToAdminId: myId() } }).then(
      complaintFrom,
    ),

  reply: async (id: string, body: string, visibleToPatient: boolean) =>
    request<LiveComplaint>(`${complaintPath(id)}/reply`, { method: 'POST', body: replyBody(body, visibleToPatient) }).then(
      complaintFrom,
    ),

  close: async (id: string, outcome: 'resolved' | 'rejected', note: string) =>
    request<LiveComplaint>(`${complaintPath(id)}/close`, { method: 'POST', body: closeBody(outcome, note) }).then(
      complaintFrom,
    ),
};

/* --------------------------------- tickets --------------------------------- */

export const TICKET_STATUSES = ['open', 'in_progress', 'awaiting_user_response', 'resolved', 'closed'] as const;
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

type LiveTicketRow = {
  id: string;
  referenceCode: string;
  requester: { type: 'patient' | 'provider' | 'lab'; id: string | null; name: string | null };
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  consultationId: string | null;
  assignee: { id: string; name: string } | null;
  messageCount: number;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type LiveTicketView = LiveTicketRow & { description: string; resolutionNote: string | null; messages: LiveMessage[] };

export type TicketRow = {
  id: string;
  code: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  requesterType: 'patient' | 'provider' | 'lab';
  requesterId: string | null;
  requesterName: string;
  consultationId: string | null;
  assigneeId: string | null;
  assignee: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TicketDetail = TicketRow & {
  description: string;
  resolutionNote: string | null;
  messages: { seq: number; by: string; body: string; internal: boolean; at: string }[];
};

const REQUESTER_LABEL = { patient: 'Patient', provider: 'Provider', lab: 'Lab partner' } as const;
export const requesterLabel = (t: TicketRow['requesterType']): string => REQUESTER_LABEL[t] ?? t;

export const ticketFrom = (t: LiveTicketRow): TicketRow => ({
  id: t.id,
  code: t.referenceCode,
  subject: t.subject,
  category: t.category,
  priority: t.priority,
  status: t.status,
  requesterType: t.requester.type,
  requesterId: t.requester.id,
  requesterName: t.requester.name ?? 'Unnamed',
  consultationId: t.consultationId,
  assigneeId: t.assignee?.id ?? null,
  assignee: t.assignee?.name ?? null,
  messageCount: t.messageCount,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});

const WHO: Record<LiveMessage['authorRole'], string> = { patient: 'Requester', provider: 'Requester', admin: 'Support' };

export const ticketDetailFrom = (t: LiveTicketView): TicketDetail => ({
  ...ticketFrom(t),
  description: t.description,
  resolutionNote: t.resolutionNote,
  messages: t.messages.map((m) => ({ seq: m.seq, by: WHO[m.authorRole] ?? m.authorRole, body: m.body, internal: m.isInternal, at: m.at })),
});

/** Resolve and close both need a note, at most 4000 characters (`TicketNoteDto`). */
export function ticketNoteBody(note: string): { note: string } {
  const text = note.trim();
  if (!text) throw new Error('Write a note: the requester reads it.');
  if (text.length > 4000) throw new Error('The note can be at most 4000 characters.');
  return { note: text };
}

const ticketPath = (id: string) => `/admin/tickets/${encodeURIComponent(id)}`;

export const tickets = {
  list: (): Promise<Everything<TicketRow>> =>
    listAll<LiveTicketRow>('/admin/tickets').then((r) => ({ ...r, items: r.items.map(ticketFrom) })),

  get: async (id: string) => request<LiveTicketView>(ticketPath(id)).then(ticketDetailFrom),

  assignToMe: async (id: string) =>
    request<unknown>(`${ticketPath(id)}/assign`, { method: 'POST', body: { assignToAdminId: myId() } }),

  setPriority: async (id: string, priority: TicketPriority) =>
    request<unknown>(`${ticketPath(id)}/priority`, { method: 'POST', body: { priority } }),

  reply: async (id: string, body: string, visibleToRequester: boolean) =>
    request<unknown>(`${ticketPath(id)}/reply`, { method: 'POST', body: replyBody(body, visibleToRequester) }),

  resolve: async (id: string, note: string) =>
    request<unknown>(`${ticketPath(id)}/resolve`, { method: 'POST', body: ticketNoteBody(note) }),

  close: async (id: string, note: string) =>
    request<unknown>(`${ticketPath(id)}/close`, { method: 'POST', body: ticketNoteBody(note) }),

  reopen: async (id: string) => request<unknown>(`${ticketPath(id)}/reopen`, { method: 'POST', body: {} }),
};

/* --------------------------------- feedback -------------------------------- */

type LiveConsultationFeedback = {
  consultationId: string;
  referenceCode: string;
  doctorId: string | null;
  rating: number;
  comment: string | null;
  consultedAt: string | null;
};

type LiveAppFeedback = {
  id: string;
  kind: 'app' | 'provider_experience' | 'lab_service';
  rating: number;
  comment: string | null;
  author: { type: 'patient' | 'provider'; id: string | null; name: string | null };
  createdAt: string;
};

export type FeedbackRow = {
  id: string;
  from: string;
  about: string;
  /** Where "about" opens, when it names a consultation. */
  to: string | null;
  rating: number;
  comment: string;
  at: string | null;
};

export const consultationFeedbackFrom = (f: LiveConsultationFeedback): FeedbackRow => ({
  id: f.consultationId,
  from: 'Patient',
  about: f.referenceCode,
  to: `/appointments/${f.consultationId}`,
  rating: f.rating,
  comment: f.comment ?? '',
  at: f.consultedAt,
});

const KIND_ABOUT: Record<LiveAppFeedback['kind'], string> = {
  app: 'The app',
  provider_experience: 'The provider experience',
  lab_service: 'A lab service',
};

export const appFeedbackFrom = (f: LiveAppFeedback): FeedbackRow => ({
  id: f.id,
  from: f.author.name ?? (f.author.type === 'provider' ? 'A provider' : 'A patient'),
  about: KIND_ABOUT[f.kind] ?? f.kind,
  to: null,
  rating: f.rating,
  comment: f.comment ?? '',
  at: f.createdAt,
});

export type FeedbackKind = 'patient' | 'provider' | 'app' | 'lab_service';

export type FeedbackPage = Everything<FeedbackRow> & { average: number | null };

const average = (rows: FeedbackRow[]): number | null =>
  rows.length === 0 ? null : Math.round((rows.reduce((n, r) => n + r.rating, 0) / rows.length) * 10) / 10;

export const feedback = {
  /**
   * `patient` is the rating on a consultation; the others are app feedback of
   * one `kind`. The backend caps the consultation list at 200 and does not page
   * it, so a list that long says it may be incomplete.
   */
  list: async (kind: FeedbackKind): Promise<FeedbackPage> => {
    if (kind === 'patient') {
      const rows = await request<LiveConsultationFeedback[]>('/admin/feedback', { query: { limit: 200 } });
      const items = rows.map(consultationFeedbackFrom);
      return { items, total: items.length, truncated: rows.length >= 200, average: average(items) };
    }
    const kindParam = kind === 'provider' ? 'provider_experience' : kind;
    const got = await listAll<LiveAppFeedback>('/admin/feedback/app', { kind: kindParam });
    const items = got.items.map(appFeedbackFrom);
    return { items, total: got.total, truncated: got.truncated, average: average(items) };
  },
};

