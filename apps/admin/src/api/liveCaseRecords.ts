import { request } from './http';
import { listAll, type Everything } from './liveList';
import { fromLiveRow, type LiveRow } from './liveAppointments';

/**
 * Case records and case summaries against the backend:
 * `GET /admin/consultations`, `GET /admin/consultations/:id/clinical-record`,
 * `GET /admin/consultations/:id/documents` (and its download link) and
 * `GET /admin/governance/case-summaries`.
 *
 * Source of truth: `ClinicalRecordView`, `RecordNotes`, `Medicine`,
 * `CaseSummaryRow`, `AdminDocumentsService`.
 *
 * *** READ-ONLY, AND AUDITED. *** An admin cannot author or alter a clinical
 * record: the professional who saw the patient is accountable for it. Opening
 * one is an audit entry on the backend (who and which consultation, never what
 * it says), so the panel reads it when the page is opened and not before.
 *
 * *** THE SUMMARY IS WRITTEN BY THE PROVIDER. *** Nothing generates one, so the
 * panel has no "regenerate": a summary is written, or it is pending.
 */

/* ---------------------------------- list ----------------------------------- */

export type SummaryState = 'written' | 'pending' | 'not_required';

type LiveSummaryRow = {
  consultationId: string;
  referenceCode: string;
  status: string;
  scheduledStartAt: string | null;
  endedAt: string | null;
  doctor: { id: string; fullName: string } | null;
  patient: { id: string; fullName: string | null };
  finalisedAt: string | null;
  summaryState: SummaryState;
};

export type CaseRecordRow = {
  /** The consultation id: a case record is one consultation's record. */
  id: string;
  referenceCode: string;
  patientId: string | null;
  patientName: string;
  professionalId: string | null;
  professionalName: string;
  specialty: string;
  startsAt: string | null;
  durationMinutes: number | null;
  status: string;
  /** From the governance list; absent for a consultation it does not list. */
  summaryState: SummaryState | null;
};

export type SummaryRow = {
  id: string;
  referenceCode: string;
  patientId: string;
  patientName: string;
  professionalId: string | null;
  professionalName: string;
  heldAt: string | null;
  endedAt: string | null;
  finalisedAt: string | null;
  state: SummaryState;
};

export const summaryFrom = (r: LiveSummaryRow): SummaryRow => ({
  id: r.consultationId,
  referenceCode: r.referenceCode,
  patientId: r.patient.id,
  patientName: r.patient.fullName ?? 'Unnamed patient',
  professionalId: r.doctor?.id ?? null,
  professionalName: r.doctor?.fullName ?? 'Not assigned',
  heldAt: r.scheduledStartAt,
  endedAt: r.endedAt,
  finalisedAt: r.finalisedAt,
  state: r.summaryState,
});

export function recordRowFrom(row: LiveRow, summaries: ReadonlyMap<string, SummaryState>): CaseRecordRow {
  const c = fromLiveRow(row);
  return {
    id: c.id,
    referenceCode: c.referenceCode ?? c.id,
    patientId: c.patientId ?? null,
    patientName: c.patientName,
    professionalId: c.doctorId ?? null,
    professionalName: c.doctorName ?? 'Not assigned',
    specialty: c.serviceName ?? '-',
    startsAt: c.startsAt ?? null,
    durationMinutes: c.actualDurationMinutes ?? null,
    status: c.displayStatus ?? c.status,
    summaryState: summaries.get(c.id) ?? null,
  };
}

/* --------------------------------- detail ---------------------------------- */

export type LiveMedicine = { id: string; name: string; dose: string; frequency: string; duration: string; instructions?: string | null };

export type ClinicalRecord = {
  consultationId: string;
  chiefComplaint: string;
  clinicalHistory: string | null;
  observations: string | null;
  diagnosis: string | null;
  isDiagnosisProvisional: boolean;
  riskCategory: string | null;
  referralNote: string | null;
  medicines: LiveMedicine[];
  advice: { covered: string | null; homePractice: string | null; nextFocus: string | null; warningSigns: string | null };
  allergyHistory: string | null;
  presentingConcern: string | null;
  assessment: string | null;
  recommendations: string | null;
  precautions: string | null;
  caseSummary: string | null;
  finalisedAt: string | null;
  recordKind: 'prescription' | 'session_note';
  addenda: { id: string; text: string; createdAt: string }[];
  updatedAt: string;
};

export type CaseDocument = { id: string; fileName: string; category: string | null; uploadedByName: string | null; createdAt: string };
export type DocumentGroup = { kind: string; files: CaseDocument[] };

const notFound = (e: unknown) => (e as { statusCode?: number } | null)?.statusCode === 404;

export const caseRecords = {
  list: async (): Promise<Everything<CaseRecordRow>> => {
    const [rows, summaries] = await Promise.all([
      listAll<LiveRow>('/admin/consultations'),
      // A role that may not read summaries still gets the list, without the column.
      listAll<LiveSummaryRow>('/admin/governance/case-summaries').catch(() => null),
    ]);
    const states = new Map<string, SummaryState>((summaries?.items ?? []).map((s) => [s.consultationId, s.summaryState]));
    return { ...rows, items: rows.items.map((r) => recordRowFrom(r, states)) };
  },

  /** `null` when the provider has not opened a record yet: that is a state, not an error. */
  record: async (consultationId: string): Promise<ClinicalRecord | null> => {
    try {
      return await request<ClinicalRecord>(`/admin/consultations/${encodeURIComponent(consultationId)}/clinical-record`);
    } catch (e) {
      if (notFound(e)) return null;
      throw e;
    }
  },

  documents: async (consultationId: string): Promise<DocumentGroup[]> => {
    const got = await request<{ groups: DocumentGroup[] }>(
      `/admin/consultations/${encodeURIComponent(consultationId)}/documents`,
    );
    return got.groups;
  },

  documentUrl: (consultationId: string, fileId: string) =>
    request<{ url: string; expiresInSeconds: number }>(
      `/admin/consultations/${encodeURIComponent(consultationId)}/documents/${encodeURIComponent(fileId)}/download-url`,
    ),
};

export const summaries = {
  list: (): Promise<Everything<SummaryRow>> =>
    listAll<LiveSummaryRow>('/admin/governance/case-summaries').then((r) => ({ ...r, items: r.items.map(summaryFrom) })),
};

/** Medicines as lines a reader can scan: name, dose, how often, how long. */
export const medicineLine = (m: LiveMedicine): string =>
  [m.name, m.dose, m.frequency, m.duration].filter((p) => p && p.trim()).join(', ') +
  (m.instructions?.trim() ? ` (${m.instructions.trim()})` : '');
