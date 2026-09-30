import * as db from '../mock/db';
import type {
  AdminNotification,
  AllocationDecision,
  AllocationPolicy,
  AssignableProvider,
  AuditEntry,
  AvailabilityRule,
  Bill,
  ClarificationCase,
  Complaint,
  Concern,
  ConfigValue,
  Consultation,
  ContentItem,
  CredentialQueueRow,
  DeletionRequest,
  Doctor,
  DoctorDocument,
  Expert,
  Feedback,
  GovernanceDashboard,
  LegalDocument,
  NotificationTemplate,
  Pathway,
  PendingPayout,
  PendingSummary,
  Region,
  Reliability,
  RetentionInfo,
  SafetyAlert,
  SearchConfigShape,
  Slot,
  Specialty,
} from './types';

export * from './types';

/**
 * The panel's data surface.
 *
 * *** THIS BUILD IS UI-ONLY. *** Every function below reads and writes the
 * in-memory fixtures in `mock/db.ts`. Nothing here touches the network, and no
 * backend needs to be running.
 *
 * The shape of this module is exactly what a wired-up version would be: same
 * names, same arguments, same return types, same async signature. Pointing it
 * at the real API is a body-swap in this one file —
 * `return request<Doctor[]>('/admin/doctors', { query })` — with no screen
 * changing. `api/http.ts` already holds the client that would do it, including
 * the single-flight refresh.
 *
 * Mutations mutate the fixtures, so flows behave: verifying a provider really
 * does move them out of the credential queue. State lives in memory, so a page
 * reload resets it.
 */

const ok = <T>(value: T) => db.delay(value);

/** A deep-ish copy, so a screen holding a row cannot mutate the store. */
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const notFound = (what: string) =>
  Promise.reject(
    Object.assign(new Error(`${what} not found`), {
      name: 'ApiError',
      code: 'NOT_FOUND',
      statusCode: 404,
      requestId: null,
      details: null,
      path: null,
    }),
  );

/* -------------------------------- providers ------------------------------- */

export const doctors = {
  list: (q: { verificationStatus?: string; isListed?: string; search?: string }) => {
    const term = (q.search ?? '').trim().toLowerCase();
    const rows = db.doctors.filter((d) => {
      if (q.verificationStatus && d.verificationStatus !== q.verificationStatus) return false;
      if (q.isListed === 'true' && !d.isListed) return false;
      if (q.isListed === 'false' && d.isListed) return false;
      if (!term) return true;
      // The same three fields the backend's `search` matches on.
      return (
        d.fullName.toLowerCase().includes(term) ||
        (d.mobileNumber ?? '').includes(term) ||
        (d.registrationNumber ?? '').toLowerCase().includes(term)
      );
    });
    return ok(copy(rows));
  },

  get: (doctorId: string) => {
    const found = db.findDoctor(doctorId);
    return found ? ok(copy(found)) : notFound('Provider');
  },

  create: (input: {
    mobileNumber: string;
    fullName: string;
    specialtyId?: string;
    qualification?: string;
    registrationNumber?: string;
    yearsOfExperience?: number;
    languages?: string[];
    payoutFeeInr?: number;
    consultationDurationMinutes?: number;
  }) => {
    const created: Doctor = {
      id: db.newId('dr'),
      fullName: input.fullName,
      mobileNumber: input.mobileNumber,
      specialtyId: input.specialtyId ?? null,
      specialtyName: db.specialties.find((s) => s.id === input.specialtyId)?.name ?? null,
      qualification: input.qualification ?? null,
      registrationNumber: input.registrationNumber ?? null,
      yearsOfExperience: input.yearsOfExperience ?? null,
      languages: input.languages ?? [],
      regionIds: [],
      // Exactly what the backend does: pending and unlisted.
      verificationStatus: 'pending',
      isListed: false,
      seniority: 'standard',
      payoutFeeInr: input.payoutFeeInr ?? null,
      consultationDurationMinutes: input.consultationDurationMinutes ?? null,
      createdAt: new Date().toISOString(),
    };
    db.doctors.unshift(created);
    return ok(copy(created));
  },

  update: (doctorId: string, input: Record<string, unknown>) => {
    const found = db.findDoctor(doctorId);
    if (!found) return notFound('Provider');
    Object.assign(found, input);
    return ok(copy(found));
  },

  credentialQueue: () => ok(copy(db.credentialQueue())),

  credentials: (doctorId: string) => ok(copy(db.documents[doctorId] ?? [])),

  reviewCredential: (documentId: string, approved: boolean, rejectionReason?: string) => {
    for (const list of Object.values(db.documents)) {
      const doc = list.find((d) => d.id === documentId);
      if (doc) {
        doc.status = approved ? 'approved' : 'rejected';
        doc.rejectionReason = approved ? null : (rejectionReason ?? null);
        doc.reviewedAt = new Date().toISOString();
        return ok(copy(doc));
      }
    }
    return notFound('Document');
  },

  verify: (doctorId: string) => {
    const found = db.findDoctor(doctorId);
    if (!found) return notFound('Provider');
    found.verificationStatus = 'verified';
    found.rejectionReason = null;
    return ok(copy(found));
  },

  reject: (doctorId: string, reason: string) => {
    const found = db.findDoctor(doctorId);
    if (!found) return notFound('Provider');
    found.verificationStatus = 'rejected';
    found.rejectionReason = reason;
    found.isListed = false;
    return ok(copy(found));
  },

  reopen: (doctorId: string) => {
    const found = db.findDoctor(doctorId);
    if (!found) return notFound('Provider');
    found.verificationStatus = 'under_review';
    found.rejectionReason = null;
    return ok(copy(found));
  },

  setListing: (doctorId: string, isListed: boolean) => {
    const found = db.findDoctor(doctorId);
    if (!found) return notFound('Provider');
    // The backend refuses listing unless the provider is verified.
    if (isListed && found.verificationStatus !== 'verified') {
      return Promise.reject(
        Object.assign(new Error('This provider is not verified yet.'), {
          name: 'ApiError',
          code: 'CONFLICT',
          statusCode: 409,
          requestId: null,
          details: null,
          path: null,
        }),
      );
    }
    found.isListed = isListed;
    return ok(copy(found));
  },

  regions: (doctorId: string) => {
    const found = db.findDoctor(doctorId);
    const ids = found?.regionIds ?? [];
    return ok(copy(db.regions.filter((r) => ids.includes(r.id))));
  },

  setRegions: (doctorId: string, regionIds: string[]) => {
    const found = db.findDoctor(doctorId);
    if (!found) return notFound('Provider');
    found.regionIds = regionIds;
    return ok(copy(db.regions.filter((r) => regionIds.includes(r.id))));
  },

  setSeniority: (doctorId: string, seniority: 'standard' | 'expert') => {
    const found = db.findDoctor(doctorId);
    if (!found) return notFound('Provider');
    found.seniority = seniority;
    // Expert level is what puts someone in the clarification expert list.
    const already = db.experts.some((e) => e.doctorId === doctorId);
    if (seniority === 'expert' && !already) {
      db.experts.push({
        doctorId,
        fullName: found.fullName,
        specialtyName: found.specialtyName ?? null,
      });
    }
    if (seniority === 'standard' && already) {
      db.experts.splice(
        db.experts.findIndex((e) => e.doctorId === doctorId),
        1,
      );
    }
    return ok(copy(found));
  },

  suspend: (doctorId: string, reason: string) => {
    const found = db.findDoctor(doctorId);
    if (!found) return notFound('Provider');
    found.verificationStatus = 'suspended';
    found.suspensionReason = reason;
    found.isListed = false;
    return ok(copy(found));
  },

  reinstate: (doctorId: string) => {
    const found = db.findDoctor(doctorId);
    if (!found) return notFound('Provider');
    found.verificationStatus = 'verified';
    found.suspensionReason = null;
    return ok(copy(found));
  },

  reliability: (doctorId: string) =>
    ok(
      copy(
        db.reliability[doctorId] ?? {
          acceptanceRate: null,
          noShowRate: null,
          caseSummaryCompletion: null,
          consultationsCompleted: 0,
        },
      ),
    ),
};

/* ------------------------------- scheduling ------------------------------- */

export const scheduling = {
  availability: (doctorId: string) => ok(copy(db.availability[doctorId] ?? [])),

  /** Replaces the whole weekly pattern, exactly as the real PUT does. */
  replaceWeekly: (
    doctorId: string,
    rules: { dayOfWeek: number; startTime: string; endTime: string }[],
  ) => {
    const existing = db.availability[doctorId] ?? [];
    const exceptions = existing.filter((r) => r.ruleType !== 'weekly');
    db.availability[doctorId] = [
      ...rules.map((r) => ({
        id: db.newId('av'),
        ruleType: 'weekly' as const,
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
      })),
      ...exceptions,
    ];
    return ok(copy(db.availability[doctorId]));
  },

  block: (doctorId: string, input: { date: string; startTime?: string; endTime?: string }) => {
    const rule: AvailabilityRule = {
      id: db.newId('av'),
      ruleType: 'blocked',
      date: input.date,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
    };
    db.availability[doctorId] = [...(db.availability[doctorId] ?? []), rule];
    return ok(copy(rule));
  },

  customHours: (doctorId: string, input: { date: string; startTime: string; endTime: string }) => {
    const rule: AvailabilityRule = {
      id: db.newId('av'),
      ruleType: 'custom_hours',
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
    };
    db.availability[doctorId] = [...(db.availability[doctorId] ?? []), rule];
    return ok(copy(rule));
  },

  deleteRule: (doctorId: string, ruleId: string) => {
    db.availability[doctorId] = (db.availability[doctorId] ?? []).filter((r) => r.id !== ruleId);
    return ok(undefined as void);
  },

  slots: (doctorId: string, _date?: string) => ok(copy(db.slotsFor(doctorId))),

  remaining: (_q: { serviceId?: string; language?: string; regionId?: string; at?: string }) =>
    ok(copy(db.assignable)),
};

/* ------------------------------ consultations ----------------------------- */

const findConsultation = (id: string) =>
  db.consultations.find((c) => c.id === id || c.referenceCode === id);

export const consultations = {
  get: (id: string) => {
    const found = findConsultation(id);
    return found ? ok(copy(found)) : notFound('Consultation');
  },

  override: (id: string, doctorId: string, reason: string) => {
    const found = findConsultation(id);
    if (!found) return notFound('Consultation');
    const provider = db.findDoctor(doctorId);
    found.doctorId = doctorId;
    found.doctorName = provider?.fullName ?? doctorId;
    db.allocationDecisions.unshift({
      consultationId: found.id,
      doctorId,
      doctorName: provider?.fullName ?? doctorId,
      decidedAt: new Date().toISOString(),
      overriddenByAdminId: 'ad-1',
      reason,
    });
    return ok(copy(found));
  },

  cancel: (id: string, _reason: string) => {
    const found = findConsultation(id);
    if (!found) return notFound('Consultation');
    found.status = 'cancelled';
    return ok(copy(found));
  },

  offers: (id: string) =>
    ok([
      { doctorId: 'dr-2', fullName: 'Dr Vikram Sethi', offeredAt: '—', outcome: 'accepted' },
      { doctorId: 'dr-6', fullName: 'Dr Kabir Nair', offeredAt: '—', outcome: 'no_response' },
      { consultationId: id },
    ] as unknown[]),

  videoSession: (id: string) =>
    ok({
      consultationId: id,
      joinedParticipants: 2,
      durationSeconds: 492,
      recorded: false,
      note: 'Consultations are not recorded.',
    } as unknown),

  careRecord: (id: string) =>
    ok({
      consultationId: id,
      caseSummary: 'Fixture record — no real clinical data in a UI build.',
      prescription: null,
    } as unknown),

  auditTrail: (id: string) =>
    ok(copy(db.auditEntries.filter((e) => e.consultationId === id || e.entityId === id))),
};

/* -------------------------------- governance ------------------------------ */

export const governance = {
  dashboard: () => ok(copy(db.dashboard)),
  pendingSummaries: () => ok(copy(db.pendingSummaries)),
  providerQuality: () => ok(copy(db.reliability) as unknown),
  allocationDecisions: () => ok(copy(db.allocationDecisions)),
};

export const safety = {
  list: () => ok(copy(db.safetyAlerts)),

  acknowledge: (alertId: string) => {
    const found = db.safetyAlerts.find((a) => a.id === alertId);
    if (!found) return notFound('Alert');
    found.acknowledgedAt = new Date().toISOString();
    found.acknowledgedByAdminId = 'ad-1';
    return ok(copy(found));
  },

  close: (alertId: string, _whatWasDone: string) => {
    const found = db.safetyAlerts.find((a) => a.id === alertId);
    if (!found) return notFound('Alert');
    found.closedAt = new Date().toISOString();
    return ok(copy(found));
  },
};

export const clarification = {
  list: () => ok(copy(db.clarificationCases)),
  experts: () => ok(copy(db.experts)),

  assign: (caseId: string, doctorId: string) => {
    const found = db.clarificationCases.find((c) => c.id === caseId);
    if (!found) return notFound('Case');
    const expert = db.experts.find((e) => e.doctorId === doctorId);
    found.assignedExpertId = doctorId;
    found.assignedExpertName = expert?.fullName ?? doctorId;
    found.status = 'in_progress';
    return ok(copy(found));
  },

  close: (caseId: string) => {
    const found = db.clarificationCases.find((c) => c.id === caseId);
    if (!found) return notFound('Case');
    found.status = 'closed';
    return ok(copy(found));
  },
};

/* --------------------------------- payments ------------------------------- */

export const payments = {
  pendingPayouts: () => ok(copy(db.pendingPayouts)),

  bill: (_consultationId: string) =>
    ok({
      consultationFee: 1200,
      convenienceFeePct: 8,
      convenienceFee: 96,
      gstPct: 18,
      gstAmount: 17.28,
      total: 1313.28,
      status: 'paid',
      refundAmount: 0,
    } as Bill),

  refund: (_consultationId: string, _amount: number, _reason: string) => ok({} as unknown),

  recordPayout: (consultationId: string) => {
    const index = db.pendingPayouts.findIndex((p) => p.consultationId === consultationId);
    if (index >= 0) db.pendingPayouts.splice(index, 1);
    return ok({} as unknown);
  },

  /** No file to serve in a UI build — the button explains that. */
  exportUrl: (kind: 'transactions' | 'refunds') => `#export-${kind}-unavailable-in-ui-build`,
};

/* --------------------------------- support -------------------------------- */

export const support = {
  feedback: () => ok(copy(db.feedback)),

  complaints: (q: { status?: string } = {}) =>
    ok(copy(q.status ? db.complaints.filter((c) => c.status === q.status) : db.complaints)),

  complaint: (id: string) => {
    const found = db.complaints.find((c) => c.id === id);
    return found ? ok(copy(found)) : notFound('Complaint');
  },

  assign: (id: string) => {
    const found = db.complaints.find((c) => c.id === id);
    if (!found) return notFound('Complaint');
    found.assignedAdminId = 'ad-1';
    found.status = 'in_progress';
    return ok(copy(found));
  },

  reply: (id: string, body: string, visibleToPatient: boolean) => {
    const found = db.complaints.find((c) => c.id === id);
    if (!found) return notFound('Complaint');
    found.messages = [
      ...(found.messages ?? []),
      {
        id: db.newId('m'),
        body,
        authorType: 'admin',
        visibleToPatient,
        createdAt: new Date().toISOString(),
      },
    ];
    if (found.status === 'open') found.status = 'in_progress';
    return ok(copy(found));
  },

  close: (id: string, outcome: 'resolved' | 'rejected', _note: string) => {
    const found = db.complaints.find((c) => c.id === id);
    if (!found) return notFound('Complaint');
    found.status = outcome;
    return ok(copy(found));
  },
};

/* -------------------------------- catalogue ------------------------------- */

export const catalogue = {
  specialties: () => ok(copy(db.specialties)),

  specialty: (id: string) => {
    const found = db.specialties.find((s) => s.id === id);
    return found ? ok(copy(found)) : notFound('Specialty');
  },

  createSpecialty: (input: { name: string; providerType: string }) => {
    const created: Specialty = {
      id: db.newId('sp'),
      name: input.name,
      isActive: true,
      providerType: input.providerType as 'doctor' | 'non_doctor',
      mayPrescribe: input.providerType === 'doctor',
    };
    db.specialties.push(created);
    return ok(copy(created));
  },

  updateSpecialty: (id: string, input: { name?: string; isActive?: boolean }) => {
    const found = db.specialties.find((s) => s.id === id);
    if (!found) return notFound('Specialty');
    Object.assign(found, input);
    return ok(copy(found));
  },

  concerns: () => ok(copy(db.concerns)),

  createConcern: (input: { name: string; specialtyId?: string; weight?: number }) => {
    const created: Concern = {
      id: db.newId('cn'),
      name: input.name,
      specialtyId: input.specialtyId ?? null,
      matchPhrases: [],
      weight: input.weight ?? 5,
      isActive: true,
    };
    db.concerns.push(created);
    return ok(copy(created));
  },

  updateConcern: (id: string, input: { name?: string; weight?: number; isActive?: boolean }) => {
    const found = db.concerns.find((c) => c.id === id);
    if (!found) return notFound('Concern');
    Object.assign(found, input);
    return ok(copy(found));
  },

  regions: () => ok(copy(db.regions)),

  createRegion: (input: { name: string }) => {
    const created: Region = { id: db.newId('rg'), name: input.name, isActive: true };
    db.regions.push(created);
    return ok(copy(created));
  },

  updateRegion: (id: string, input: { name?: string; isActive?: boolean }) => {
    const found = db.regions.find((r) => r.id === id);
    if (!found) return notFound('Region');
    Object.assign(found, input);
    return ok(copy(found));
  },

  allocationPolicy: () => ok(copy(db.allocationPolicy)),

  updateAllocationPolicy: (input: Record<string, unknown>) => {
    Object.assign(db.allocationPolicy, input);
    return ok(copy(db.allocationPolicy));
  },
};

/* --------------------------------- content -------------------------------- */

export const content = {
  items: () => ok(copy(db.contentItems)),

  item: (id: string) => {
    const found = db.contentItems.find((i) => i.id === id);
    return found ? ok(copy(found)) : notFound('Item');
  },

  create: (input: { title: string; category?: string; body?: string }) => {
    const created: ContentItem = {
      id: db.newId('ci'),
      title: input.title,
      category: input.category ?? null,
      body: input.body ?? null,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };
    db.contentItems.unshift(created);
    return ok(copy(created));
  },

  update: (id: string, input: { title?: string; body?: string }) => {
    const found = db.contentItems.find((i) => i.id === id);
    if (!found) return notFound('Item');
    Object.assign(found, input, { updatedAt: new Date().toISOString() });
    return ok(copy(found));
  },

  submit: (id: string) => {
    const found = db.contentItems.find((i) => i.id === id);
    if (!found) return notFound('Item');
    found.status = 'in_review';
    found.updatedAt = new Date().toISOString();
    return ok(copy(found));
  },

  publish: (id: string) => {
    const found = db.contentItems.find((i) => i.id === id);
    if (!found) return notFound('Item');
    found.status = 'published';
    found.updatedAt = new Date().toISOString();
    return ok(copy(found));
  },

  archive: (id: string) => {
    const found = db.contentItems.find((i) => i.id === id);
    if (!found) return notFound('Item');
    found.status = 'archived';
    found.updatedAt = new Date().toISOString();
    return ok(copy(found));
  },
};

export const notificationTemplates = {
  list: () => ok(copy(db.templates)),

  get: (code: string) => {
    const found = db.templates.find((t) => t.code === code);
    return found ? ok(copy(found)) : notFound('Template');
  },

  update: (code: string, input: { title?: string; body?: string }) => {
    const found = db.templates.find((t) => t.code === code);
    if (!found) return notFound('Template');
    Object.assign(found, input, { isCustomised: true });
    return ok(copy(found));
  },

  reset: (code: string) => {
    const found = db.templates.find((t) => t.code === code);
    if (!found) return notFound('Template');
    found.isCustomised = false;
    return ok(copy(found));
  },
};

export const searchConfig = {
  get: () => ok(copy(db.searchConfiguration)),

  crisisKeywords: (keywords: string[]) => {
    db.searchConfiguration.crisisKeywords = keywords;
    return ok(copy(db.searchConfiguration) as unknown);
  },

  emergencyGuidance: (guidance: unknown) => {
    db.searchConfiguration.emergencyGuidance = guidance;
    return ok({} as unknown);
  },

  synonyms: (synonyms: unknown) => {
    db.searchConfiguration.synonyms = synonyms;
    return ok({} as unknown);
  },

  popularSearches: (searches: string[]) => {
    db.searchConfiguration.popularSearches = searches;
    return ok({} as unknown);
  },

  disclaimer: (disclaimer: string) => {
    db.searchConfiguration.disclaimer = disclaimer;
    return ok({} as unknown);
  },
};

export const pathways = {
  list: () => ok(copy(db.pathways)),

  /** Publishes a NEW version; the live one is never edited. */
  publish: (code: string, input: { questions?: unknown; redFlagRules?: unknown }) => {
    const highest = db.pathways
      .filter((p) => p.code === code)
      .reduce((max, p) => Math.max(max, p.version ?? 0), 0);
    const created: Pathway = {
      code,
      version: highest + 1,
      publishedAt: new Date().toISOString(),
      questions: input.questions,
      redFlagRules: input.redFlagRules,
    };
    db.pathways.unshift(created);
    return ok(copy(created));
  },
};

export const legal = {
  versions: (documentType: string) => ok(copy(db.legalDocuments[documentType] ?? [])),

  publish: (input: { documentType: string; body: string; version?: string }) => {
    const list = db.legalDocuments[input.documentType] ?? [];
    const created: LegalDocument = {
      documentType: input.documentType,
      version: input.version ?? `${list.length + 1}.0`,
      publishedAt: new Date().toISOString(),
      body: input.body,
    };
    db.legalDocuments[input.documentType] = [created, ...list];
    return ok(copy(created));
  },
};

/* -------------------------------- platform -------------------------------- */

export const config = {
  list: () => ok(copy(db.configValues)),

  set: (key: string, value: unknown) => {
    const found = db.configValues.find((c) => c.key === key);
    if (!found) return notFound('Setting');
    found.value = value;
    return ok(copy(found));
  },
};

export const compliance = {
  audit: (q: {
    actorType?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    consultationId?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) => {
    const rows = db.auditEntries.filter((e) => {
      if (q.actorType && e.actorType !== q.actorType) return false;
      if (q.action && e.action !== q.action) return false;
      if (q.entityType && e.entityType !== q.entityType) return false;
      if (q.entityId && e.entityId !== q.entityId) return false;
      if (q.consultationId && e.consultationId !== q.consultationId) return false;
      return true;
    });
    return ok(copy(rows.slice(0, q.limit ?? 200)));
  },

  retention: () => ok(copy(db.retention)),

  applyRetention: () => {
    const deleted = db.retention.inScope ?? 0;
    db.retention.inScope = 0;
    return ok({ deleted });
  },

  deletionRequests: () => ok(copy(db.deletionRequests)),

  reviewDeletion: (id: string, decision: 'approved' | 'rejected', note: string) => {
    const found = db.deletionRequests.find((r) => r.id === id);
    if (!found) return notFound('Request');
    found.status = decision;
    found.reviewedAt = new Date().toISOString();
    found.reviewNote = note;
    return ok(copy(found));
  },

  executeDeletion: (requestId: string) => {
    const found = db.deletionRequests.find((r) => r.id === requestId);
    if (!found) return notFound('Request');
    found.status = 'executed';
    return ok(copy(found));
  },
};

export const adminAccounts = {
  create: (_input: {
    email: string;
    password: string;
    fullName: string;
    permissionLevel: string;
  }) => ok({ id: db.newId('ad') }),
};

export const inbox = {
  list: () => ok(copy(db.notifications)),

  unreadCount: () => ok({ count: db.notifications.filter((n) => !n.readAt).length }),

  markRead: (id: string) => {
    const found = db.notifications.find((n) => n.id === id);
    if (found) found.readAt = new Date().toISOString();
    return ok(undefined as void);
  },

  markAllRead: () => {
    db.notifications.forEach((n) => {
      n.readAt ??= new Date().toISOString();
    });
    return ok(undefined as void);
  },
};

/* Re-exported so screens keep importing types from one place. */
export type {
  AdminNotification,
  AllocationDecision,
  AllocationPolicy,
  AssignableProvider,
  AuditEntry,
  AvailabilityRule,
  Bill,
  ClarificationCase,
  Complaint,
  Concern,
  ConfigValue,
  Consultation,
  ContentItem,
  CredentialQueueRow,
  DeletionRequest,
  Doctor,
  DoctorDocument,
  Expert,
  Feedback,
  GovernanceDashboard,
  LegalDocument,
  NotificationTemplate,
  Pathway,
  PendingPayout,
  PendingSummary,
  Region,
  Reliability,
  RetentionInfo,
  SafetyAlert,
  SearchConfigShape,
  Slot,
  Specialty,
};
