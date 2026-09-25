/**
 * Patient documents: history (DOC-DOC-01), report requests (DOC-DOC-02) and
 * fulfilment notifications (DOC-DOC-03).
 *
 * Visibility rule: a doctor sees a file only through an assigned care
 * relationship. Notification copy never carries a diagnosis.
 */
import { dayOffset, fmtDate, fmtDayTime } from './calendar';
import { doctor } from './doctor';

/* ------------------------------- documents -------------------------------- */

export type DocKind = 'report' | 'prescription' | 'image' | 'journal';
export type DocSource = 'bookingAttachment' | 'requested' | 'consultationRecord' | 'preConsult' | 'patientRecord';

export const SOURCE_LABEL: Record<DocSource, string> = {
  bookingAttachment: 'Booking attachment',
  requested: 'Requested',
  consultationRecord: 'Consultation record',
  preConsult: 'Pre-consult upload',
  patientRecord: 'Patient record',
};

export type PatientDoc = {
  id: string;
  patientId: string;
  /** The consultation the file was shared for; absent for general history. */
  appointmentId?: string;
  title: string;
  kind: DocKind;
  fileType: 'PDF' | 'JPG';
  size: string;
  pages: number;
  uploadedBy: 'patient' | 'coracure';
  uploadedAt: string;
  source: DocSource;
  /** Present when the file answers a specific request. */
  requestId?: string;
  /** Only files inside an assigned care relationship are listed. */
  assigned: boolean;
  /** A short, diagnosis-free description shown in the viewer. */
  summary: string;
};

export const patientDocs: PatientDoc[] = [
  { id: 'd1', patientId: 'PT-10482', appointmentId: 'a1', title: 'Symptoms Journal', kind: 'journal', fileType: 'PDF', size: '1.4 MB', pages: 3, uploadedBy: 'patient', uploadedAt: fmtDayTime(0, 8 * 60 + 40), source: 'bookingAttachment', assigned: true, summary: 'Daily notes on sleep, energy and worry over the last two weeks.' },
  { id: 'd2', patientId: 'PT-10482', appointmentId: 'a1', title: 'Sleep Tracking Report', kind: 'report', fileType: 'PDF', size: '860 KB', pages: 2, uploadedBy: 'patient', uploadedAt: fmtDayTime(0, 11 * 60 + 20), source: 'requested', requestId: 'rq1', assigned: true, summary: 'Seven nights of sleep duration and wake times from a tracking app.' },
  { id: 'd3', patientId: 'PT-10482', appointmentId: 'a11', title: 'Previous Prescription', kind: 'prescription', fileType: 'PDF', size: '420 KB', pages: 1, uploadedBy: 'coracure', uploadedAt: fmtDayTime(-12, 11 * 60 + 45), source: 'consultationRecord', assigned: true, summary: 'Prescription issued after the previous consultation.' },
  { id: 'd4', patientId: 'PT-10482', appointmentId: 'a11', title: 'Therapy Notes Shared by Patient', kind: 'report', fileType: 'PDF', size: '720 KB', pages: 4, uploadedBy: 'patient', uploadedAt: fmtDayTime(-13, 19 * 60), source: 'preConsult', assigned: true, summary: 'Notes from earlier counselling sessions, shared before the consultation.' },
  { id: 'd5', patientId: 'PT-10482', title: 'Initial Medical History', kind: 'report', fileType: 'PDF', size: '540 KB', pages: 2, uploadedBy: 'patient', uploadedAt: fmtDate(dayOffset(-35)), source: 'patientRecord', assigned: true, summary: 'General medical history completed at registration.' },
  { id: 'd6', patientId: 'PT-10459', appointmentId: 'a2', title: 'Previous Prescription', kind: 'prescription', fileType: 'PDF', size: '380 KB', pages: 1, uploadedBy: 'patient', uploadedAt: fmtDayTime(-1, 20 * 60 + 10), source: 'bookingAttachment', assigned: true, summary: 'Prescription from a previous psychiatrist.' },
  { id: 'd7', patientId: 'PT-10459', title: 'Blood Test Report', kind: 'report', fileType: 'PDF', size: '610 KB', pages: 2, uploadedBy: 'patient', uploadedAt: fmtDate(dayOffset(-20)), source: 'patientRecord', assigned: true, summary: 'Routine blood panel from a diagnostic lab.' },
  { id: 'd8', patientId: 'PT-10461', appointmentId: 'a12', title: 'Sleep Diary', kind: 'journal', fileType: 'PDF', size: '320 KB', pages: 2, uploadedBy: 'patient', uploadedAt: fmtDayTime(-2, 21 * 60), source: 'preConsult', assigned: true, summary: 'Two weeks of bedtimes, wake times and night-time awakenings.' },
  { id: 'd9', patientId: 'PT-10460', appointmentId: 'a13', title: 'Thyroid Profile', kind: 'report', fileType: 'PDF', size: '290 KB', pages: 1, uploadedBy: 'patient', uploadedAt: fmtDate(dayOffset(-9)), source: 'preConsult', assigned: true, summary: 'Thyroid function test from a diagnostic lab.' },
  { id: 'd10', patientId: 'PT-10548', appointmentId: 'a14', title: 'Mood Journal', kind: 'journal', fileType: 'JPG', size: '1.1 MB', pages: 1, uploadedBy: 'patient', uploadedAt: fmtDate(dayOffset(-8)), source: 'bookingAttachment', assigned: true, summary: 'Photo of a handwritten mood journal.' },
];

export const docsForPatient = (patientId: string | undefined) =>
  patientDocs.filter((d) => d.patientId === patientId);

export const docById = (id: string | undefined) => patientDocs.find((d) => d.id === id);

export const DOC_FILTERS: { key: 'all' | DocKind | 'requested'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'report', label: 'Reports' },
  { key: 'prescription', label: 'Prescriptions' },
  { key: 'image', label: 'Images' },
  { key: 'journal', label: 'Journals' },
  { key: 'requested', label: 'Requested' },
];

/** Never surface a file outside the assigned care relationship. */
export const visibleDocs = (docs: PatientDoc[]) => docs.filter((d) => d.assigned);

/* -------------------------------- requests -------------------------------- */

export type RequestStatus = 'draft' | 'open' | 'fulfilled' | 'cancelled';

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

export type DocTypeKey = 'prescription' | 'lab' | 'therapy' | 'history' | 'other';

export const DOC_TYPES: { key: DocTypeKey; label: string; icon: 'document' | 'flask' | 'prescription' | 'folder' | 'more' }[] = [
  { key: 'prescription', label: 'Previous Prescription', icon: 'document' },
  { key: 'lab', label: 'Lab Report', icon: 'flask' },
  { key: 'therapy', label: 'Therapy Notes', icon: 'prescription' },
  { key: 'history', label: 'Medical History', icon: 'folder' },
  { key: 'other', label: 'Other', icon: 'more' },
];

export type ReportRequest = {
  id: string;
  patientId: string;
  appointmentId: string;
  docType: DocTypeKey;
  /** What the doctor asked for, in plain words. */
  itemName: string;
  reason: string;
  requestedBy: string;
  requestedOn: string;
  consultationId: string;
  status: RequestStatus;
  /** Ids of file records accepted against this request. */
  fileIds: string[];
};

export const REASON_MAX = 1000;

export const newRequest = (over: Partial<ReportRequest> = {}): ReportRequest => ({
  id: 'rq-new',
  patientId: 'PT-10482',
  appointmentId: 'a1',
  docType: 'prescription',
  itemName: '',
  reason: '',
  requestedBy: doctor.name,
  requestedOn: fmtDate(dayOffset(0)),
  consultationId: 'CON-10482',
  status: 'open',
  fileIds: [],
  ...over,
});

/**
 * A request is fulfilled only once a valid file record exists against it.
 *
 * "Valid" means a real, non-empty file that is linked to this request — a
 * pending or zero-byte upload does not complete anything. Re-uploading the
 * same file is idempotent, so a duplicate cannot manufacture a second
 * completion or flip an already-cancelled request back to fulfilled.
 */
export type FileRecord = { id: string; requestId: string; bytes: number; committed: boolean };

export const isValidFileRecord = (f: FileRecord, requestId: string) =>
  f.requestId === requestId && f.committed && f.bytes > 0;

export const applyUpload = (req: ReportRequest, file: FileRecord): ReportRequest => {
  // terminal states never reopen
  if (req.status === 'cancelled') return req;
  if (!isValidFileRecord(file, req.id)) return req;
  // duplicate upload of the same record changes nothing
  if (req.fileIds.includes(file.id)) return req;
  return { ...req, status: 'fulfilled', fileIds: [...req.fileIds, file.id] };
};

/** An open request may be withdrawn by the raising doctor. */
export const cancelRequest = (req: ReportRequest): ReportRequest =>
  req.status === 'open' || req.status === 'draft' ? { ...req, status: 'cancelled' } : req;

/** The request already fulfilled by Rahul's sleep report (d2). */
export const seedRequests: ReportRequest[] = [
  {
    id: 'rq1',
    patientId: 'PT-10482',
    appointmentId: 'a1',
    docType: 'other',
    itemName: 'Sleep tracking report',
    reason: 'To review sleep duration over the last week before the follow-up consultation.',
    requestedBy: doctor.name,
    requestedOn: fmtDate(dayOffset(-1)),
    consultationId: 'CON-10482',
    status: 'fulfilled',
    fileIds: ['d2'],
  },
];

/* ------------------------------ notifications ----------------------------- */

export type DocNotification = {
  id: string;
  requestId: string;
  docId: string;
  title: string;
  body: string;
  receivedAgo: string;
  read: boolean;
};

/**
 * Copy shown to the patient when a document is requested.
 * Deliberately free of any diagnosis or clinical reason.
 */
export const patientRequestNotice = (doctorName: string) =>
  `${doctorName} has requested a document for your upcoming consultation. Open CoraCure to view the request and upload the file.`;

/**
 * Copy shown to the doctor when a requested file arrives (DOC-DOC-03).
 * Names the document and the patient, never a diagnosis or the reason text.
 */
export const fulfilmentNotice = (patient: string, itemName: string) =>
  `${patient} uploaded ${itemName}. Open CoraCure to review it.`;

export const buildFulfilmentNotification = (
  req: ReportRequest,
  file: FileRecord,
  patient: string,
  itemName: string
): DocNotification | null => {
  // no notification unless the upload actually fulfilled the request
  const after = applyUpload(req, file);
  if (after.status !== 'fulfilled' || after.fileIds.length === 0) return null;
  return {
    id: `nt-${file.id}`,
    requestId: req.id,
    docId: file.id,
    title: 'Requested document uploaded',
    body: fulfilmentNotice(patient, itemName),
    receivedAgo: 'Just now',
    read: false,
  };
};
