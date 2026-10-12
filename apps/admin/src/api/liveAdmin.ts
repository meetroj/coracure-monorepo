import { request } from './http';
import type { AuditEntry, ConfigValue, DeletionRequest, LegalDocument, Pathway, RetentionInfo } from './types';

/**
 * Platform configuration, compliance, legal documents and follow-up pathways
 * against the backend.
 *
 * - config: `GET /admin/config`, `PUT /admin/config/:key`
 * - compliance: `GET /admin/compliance/audit`, `GET /admin/compliance/retention`,
 *   `POST /admin/compliance/retention/apply`, `GET /admin/deletion-requests`,
 *   `POST /admin/deletion-requests/:id/review`,
 *   `POST /admin/compliance/deletion-requests/:id/execute`
 * - legal: `GET /admin/legal/documents/:type/versions`, `POST /admin/legal/documents`
 * - pathways: `GET /admin/followup-pathways`, `POST /admin/followup-pathways/:code`
 *
 * Source of truth: `ConfigEntry`, `AuditEntryView`, `DataDeletionRequest`,
 * `LegalDocumentSummary`, `PublishLegalDocumentDto`, `PathwayRecord`,
 * `PublishPathwayDto`.
 */

/* --------------------------------- config ---------------------------------- */

type LiveConfig = {
  key: string;
  description: string | null;
  value: unknown;
  editable: boolean;
  managedBy: string | null;
  updatedAt: string | null;
};

export const configFrom = (c: LiveConfig): ConfigValue => ({
  key: c.key,
  value: c.value,
  description: c.description,
  editable: c.editable,
  managedBy: c.managedBy,
});

export const liveConfig = {
  list: async () => (await request<LiveConfig[]>('/admin/config')).map(configFrom),

  set: async (key: string, value: unknown) =>
    request<unknown>(`/admin/config/${encodeURIComponent(key)}`, { method: 'PUT', body: { value } }),
};

/* ------------------------------- compliance -------------------------------- */

type LiveAudit = {
  id: string;
  actorType: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  consultationId: string | null;
  metadata: unknown;
  createdAt: string;
};

export const auditFrom = (a: LiveAudit): AuditEntry => ({
  id: a.id,
  at: a.createdAt,
  createdAt: a.createdAt,
  actorType: a.actorType,
  actorId: a.actorId,
  action: a.action,
  entityType: a.entityType,
  entityId: a.entityId,
  consultationId: a.consultationId,
  metadata: a.metadata,
});

/** The backend caps a search at 1000 entries and defaults it lower. */
export const AUDIT_MAX = 1000;

export function auditParams(q: {
  actorType?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  consultationId?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Record<string, string | number | undefined> {
  const clip = (s?: string) => (s && s.trim() ? s.trim() : undefined);
  return {
    actorType: clip(q.actorType),
    action: clip(q.action),
    entityType: clip(q.entityType),
    entityId: clip(q.entityId),
    consultationId: clip(q.consultationId),
    from: clip(q.from),
    to: clip(q.to),
    limit: q.limit ? Math.min(Math.max(1, Math.floor(q.limit)), AUDIT_MAX) : undefined,
  };
}

type LiveDeletion = {
  id: string;
  patientId: string | null;
  status: DeletionRequest['status'];
  reason: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  executedAt: string | null;
  createdAt: string;
};

export const deletionFrom = (d: LiveDeletion): DeletionRequest => ({
  id: d.id,
  patientId: d.patientId,
  status: d.status,
  requestedAt: d.createdAt,
  reviewedAt: d.reviewedAt,
  reviewNote: d.reviewNote,
});

export function reviewBody(decision: 'approved' | 'rejected', note: string): { status: string; note?: string } {
  const text = note.trim();
  if (text.length > 2000) throw new Error('The note can be at most 2000 characters.');
  return { status: decision, ...(text ? { note: text } : {}) };
}

export const liveCompliance = {
  audit: async (q: Parameters<typeof auditParams>[0]) =>
    (await request<LiveAudit[]>('/admin/compliance/audit', { query: auditParams(q) })).map(auditFrom),

  retention: async (): Promise<RetentionInfo> => {
    const r = await request<{ retentionDays: number }>('/admin/compliance/retention');
    return { retentionDays: r.retentionDays, inScope: null };
  },

  applyRetention: () => request<{ deleted: number }>('/admin/compliance/retention/apply', { method: 'POST', body: {} }),

  deletionRequests: async () => (await request<LiveDeletion[]>('/admin/deletion-requests')).map(deletionFrom),

  reviewDeletion: async (id: string, decision: 'approved' | 'rejected', note: string) =>
    deletionFrom(
      await request<LiveDeletion>(`/admin/deletion-requests/${encodeURIComponent(id)}/review`, {
        method: 'POST',
        body: reviewBody(decision, note),
      }),
    ),

  executeDeletion: (requestId: string) =>
    request<unknown>(`/admin/compliance/deletion-requests/${encodeURIComponent(requestId)}/execute`, {
      method: 'POST',
      body: {},
    }),
};

/* --------------------------------- legal ----------------------------------- */

type LiveLegal = { id: string; documentType: string; version: string; title: string; isCurrent: boolean; createdAt: string };

const TITLE: Record<string, string> = {
  teleconsultation_consent: 'Teleconsultation consent',
  privacy_policy: 'Privacy policy',
  terms_of_use: 'Terms of use',
  refund_policy: 'Refund policy',
  reconsult_policy: 'Reconsult policy',
  doctor_agreement: 'Doctor agreement',
  contact_us: 'Contact us',
};

export const legalFrom = (d: LiveLegal): LegalDocument => ({
  documentType: d.documentType,
  version: d.version,
  publishedAt: d.createdAt,
  // The version list carries no text, only its title and whether it is the one in force.
  body: null,
  title: d.title,
  isCurrent: d.isCurrent,
});

export function publishBody(input: { documentType: string; body: string; version?: string; title?: string }): Record<string, unknown> {
  const body = input.body.trim();
  if (!body) throw new Error('Write the document text first.');
  const version = (input.version ?? '').trim();
  if (!version) throw new Error('Give this version a number, e.g. 2.0.');
  if (!/^[A-Za-z0-9._-]{1,20}$/.test(version)) throw new Error('A version may contain letters, digits, dots, dashes and underscores.');
  const title = (input.title ?? TITLE[input.documentType] ?? input.documentType).trim().slice(0, 200);
  return { documentType: input.documentType, version, title, body };
}

export const liveLegal = {
  versions: async (documentType: string) =>
    (await request<LiveLegal[]>(`/admin/legal/documents/${encodeURIComponent(documentType)}/versions`)).map(legalFrom),

  publish: async (input: { documentType: string; body: string; version?: string; title?: string }) =>
    request<unknown>('/admin/legal/documents', { method: 'POST', body: publishBody(input) }),
};

/* -------------------------------- pathways --------------------------------- */

type LivePathway = {
  id: string;
  code: string;
  name: string;
  version: number;
  durationDays: number;
  questions: unknown[];
  redFlagRules: unknown[];
  isCurrent: boolean;
  createdAt: string;
};

export const pathwayFrom = (p: LivePathway): Pathway => ({
  code: p.code,
  version: p.version,
  publishedAt: p.createdAt,
  questions: p.questions,
  redFlagRules: p.redFlagRules,
  name: p.name,
  durationDays: p.durationDays,
  isCurrent: p.isCurrent,
});

/**
 * A new version keeps the pathway's name and window; the panel edits the
 * questions and the rules. The backend wants all four, so the latest version is
 * read first, and a code that was never published cannot be created from here.
 */
export function pathwayBody(
  latest: { name: string; durationDays: number } | undefined,
  input: { questions?: unknown; redFlagRules?: unknown },
): Record<string, unknown> {
  if (!latest) throw new Error('That pathway has never been published, so there is no name or length to carry forward.');
  if (!Array.isArray(input.questions)) throw new Error('The questions must be a list.');
  if (!Array.isArray(input.redFlagRules)) throw new Error('The red-flag rules must be a list.');
  return { name: latest.name, durationDays: latest.durationDays, questions: input.questions, redFlagRules: input.redFlagRules };
}

export const livePathways = {
  list: async () => (await request<LivePathway[]>('/admin/followup-pathways')).map(pathwayFrom),

  publish: async (code: string, input: { questions?: unknown; redFlagRules?: unknown }) => {
    const all = await request<LivePathway[]>('/admin/followup-pathways');
    const latest = all.filter((p) => p.code === code).sort((a, b) => b.version - a.version)[0];
    return request<unknown>(`/admin/followup-pathways/${encodeURIComponent(code)}`, {
      method: 'POST',
      body: pathwayBody(latest, input),
    });
  },
};
