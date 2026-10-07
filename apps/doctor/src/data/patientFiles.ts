import { doctorConsultationsApi, doctorFilesApi } from '@coracure/api';
import type { DoctorPatientFile, DoctorReportRequest, PatientCard, ReportRequestCategory, UploadContentType } from '@coracure/api';

import { useStore } from '../state/store';
import { fmtDate } from './calendar';
import { UUID } from './clinicalRecord';
import { doctor } from './doctor';
import { patientById } from './patients';
import type { DocKind, DocSource, DocTypeKey, PatientDoc, ReportRequest } from './documents';
import { useResource } from './useResource';

/**
 * A patient's real files and report requests, from the treating side
 * (`DOCTOR_INTEGRATION_PLAN.md` step 8 — API_CONTRACT §7.5).
 *
 * *** THE REAL MODEL IS THINNER THAN THE SCREEN'S. *** `PatientDoc` carries
 * `size` and `pages` because the mock invented a file to go with them; the
 * backend's `PatientFile` is a record about an upload, not the upload itself,
 * and says neither. Both read as "—" here rather than a number nobody sent.
 *
 * *** NO DOWNLOAD LINK IS FETCHED HERE. *** `fileDownloadUrl` is minted per
 * tap, in the viewer, never at list time — one per row would start expiring
 * while a doctor scrolls.
 */

const KIND: Record<DoctorPatientFile['category'], DocKind> = {
  medical_history: 'report',
  report: 'report',
  photo: 'image',
  prescription_pdf: 'prescription',
  clarification_attachment: 'report',
};

/** The only two the viewer knows how to badge; nothing in the contract says which, so the name decides. */
const fileTypeOf = (fileName: string): 'PDF' | 'JPG' => (/\.pdf$/i.test(fileName) ? 'PDF' : 'JPG');

const sourceOf = (f: DoctorPatientFile): DocSource => {
  if (f.reportRequestId) return 'requested';
  if (f.consultationId) return 'consultationRecord';
  return 'patientRecord';
};

export const toPatientDoc = (f: DoctorPatientFile, patientId: string): PatientDoc => ({
  id: f.id,
  patientId,
  appointmentId: f.consultationId ?? undefined,
  title: f.fileName,
  kind: KIND[f.category],
  fileType: fileTypeOf(f.fileName),
  size: '—',
  pages: 1,
  uploadedBy: f.uploadedByDoctorId ? 'coracure' : 'patient',
  uploadedAt: fmtDate(new Date(f.createdAt)),
  source: sourceOf(f),
  requestId: f.reportRequestId ?? undefined,
  assigned: true,
  summary: 'Shared through your assigned care relationship.',
});

/** `therapy` has no backend category; it rides as `other` — the real ask is in `title`, not this bucket. */
const CATEGORY: Record<DocTypeKey, ReportRequestCategory> = {
  prescription: 'prescription',
  lab: 'lab',
  therapy: 'other',
  history: 'history',
  other: 'other',
};
const DOC_TYPE: Record<ReportRequestCategory, DocTypeKey> = {
  prescription: 'prescription',
  lab: 'lab',
  history: 'history',
  other: 'other',
};

export const toReportRequest = (r: DoctorReportRequest, patientId: string): ReportRequest => ({
  id: r.id,
  patientId,
  appointmentId: r.consultationId,
  docType: DOC_TYPE[r.category],
  itemName: r.title,
  reason: r.reason ?? '',
  requestedBy: doctor.name,
  requestedOn: fmtDate(new Date(r.createdAt)),
  consultationId: r.consultationId,
  status: r.status,
  fileIds: r.fulfilledBy.map((f) => f.id),
});

export const KEYS = {
  files: (patientId: string) => `doctor:patient-files:${patientId}`,
  card: (patientId: string) => `doctor:patient-card:${patientId}`,
  requests: (consultationId: string) => `doctor:report-requests:${consultationId}`,
};

export const fetchPatientFiles = async (patientId: string): Promise<PatientDoc[]> => {
  const files = await doctorFilesApi.listPatientFiles(patientId);
  return files.map((f) => toPatientDoc(f, patientId));
};

export const fetchPatientCard = (patientId: string): Promise<PatientCard> => doctorConsultationsApi.getPatientCard(patientId);

/**
 * Requests raised on ONE consultation. There is no "every request this
 * patient has ever had" endpoint — `GET /consultations/:id/report-requests`
 * is scoped to a single consultation, so a patient opened without one has
 * nothing real to show here.
 */
export const fetchReportRequests = async (patientId: string, consultationId: string): Promise<ReportRequest[]> => {
  const requests = await doctorFilesApi.consultationReportRequests(consultationId);
  return requests.map((r) => toReportRequest(r, patientId));
};

export const usePatientFiles = (patientId: string | undefined) =>
  useResource(KEYS.files(patientId ?? 'none'), () => fetchPatientFiles(patientId!), { enabled: !!patientId });

export const usePatientCard = (patientId: string, enabled = true) =>
  useResource(KEYS.card(patientId), () => fetchPatientCard(patientId), { enabled });

export type PatientIdentity = { name: string; initials: string; age: number | null; gender: string };

const GENDER: Record<PatientCard['gender'], string> = { male: 'Male', female: 'Female', other: 'Other', undisclosed: 'Undisclosed' };

/**
 * Who a patient is, for a header strip: a loaded appointment of theirs, else
 * the demo fixture, else `GET /patients/:id/card` (asked only for a real id
 * that neither knows). `loading` is true while that card is the only hope left.
 */
export const usePatientIdentity = (patientId: string | undefined): { patient?: PatientIdentity; loading: boolean } => {
  const known = useStore((s) => s.appointments.find((a) => a.patientId === patientId)) ?? patientById(patientId);
  const ask = !!patientId && UUID.test(patientId) && !known;
  const card = usePatientCard(patientId ?? 'none', ask);
  if (known) return { patient: { name: known.name, initials: known.initials, age: known.age, gender: known.gender }, loading: false };
  const c = card.data;
  if (c) {
    const name = c.fullName ?? 'Patient';
    return { patient: { name, initials: c.initials ?? name.slice(0, 2).toUpperCase(), age: c.age, gender: GENDER[c.gender] }, loading: false };
  }
  return { loading: ask && !card.error };
};

export const useReportRequests = (patientId: string, consultationId: string | undefined) =>
  useResource(
    KEYS.requests(consultationId ?? 'none'),
    () => fetchReportRequests(patientId, consultationId!),
    { enabled: !!consultationId }
  );

export const raiseReportRequest = (input: {
  consultationId: string;
  docType: DocTypeKey;
  itemName: string;
  reason: string;
}): Promise<DoctorReportRequest> =>
  doctorFilesApi.raiseReportRequest({
    consultationId: input.consultationId,
    title: input.itemName,
    category: CATEGORY[input.docType],
    ...(input.reason ? { reason: input.reason } : {}),
  });

export const cancelReportRequest = (requestId: string): Promise<DoctorReportRequest> =>
  doctorFilesApi.cancelReportRequest(requestId);

export const fetchFileDownloadUrl = (fileId: string) => doctorFilesApi.fileDownloadUrl(fileId);

/**
 * The issued prescription — the PDF the server renders when the record is
 * finalised (the case-summary submit). None until then, and none if that
 * render failed: the record stays finalised either way.
 */
export const useIssuedPrescription = (patientId: string, consultationId: string, enabled: boolean) =>
  useResource(
    `doctor:prescription-pdf:${consultationId}`,
    () => doctorFilesApi.listPatientFiles(patientId, { category: 'prescription_pdf', consultationId }),
    { enabled }
  );

/** A clinical photo picked here is `photo`; anything else (a PDF report) is `report`. */
const categoryFor = (kind: 'pdf' | 'image'): 'report' | 'photo' => (kind === 'image' ? 'photo' : 'report');

/**
 * A doctor's own upload for this consultation — real now (API_CONTRACT §7.5,
 * added 1 Oct 2026). Always anchored to the consultation it was picked on;
 * `uploadPatientFile` refuses one that is not this doctor's.
 */
export const uploadDoctorFile = (
  patientId: string,
  consultationId: string,
  file: { name: string; kind: 'pdf' | 'image'; uri?: string; contentType?: string },
): Promise<DoctorPatientFile> => {
  if (!file.uri || !file.contentType) {
    return Promise.reject(new Error(`${file.name} could not be read. Choose it again.`));
  }
  return doctorFilesApi.uploadPatientFile(
    patientId,
    {
      category: categoryFor(file.kind),
      fileName: file.name,
      contentType: file.contentType as UploadContentType,
      consultationId,
    },
    { uri: file.uri },
  );
};
