/**
 * Patient documents: history (DOC-DOC-01), report requests (DOC-DOC-02) and
 * fulfilment notifications (DOC-DOC-03).
 *
 * Visibility rule: a doctor sees a file only through an assigned care
 * relationship. Notification copy never carries a diagnosis.
 */

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
  title: string;
  kind: DocKind;
  fileType: 'PDF';
  size: string;
  uploadedBy: 'patient' | 'coracure';
  uploadedAt: string;
  source: DocSource;
  /** Present when the file answers a specific request. */
  requestId?: string;
  group: 'current' | 'previous' | 'history';
  /** Only files inside an assigned care relationship are listed. */
  assigned: boolean;
};

export const docGroups: { key: PatientDoc['group']; title: string; sub?: string }[] = [
  { key: 'current', title: 'Current consultation', sub: '15 May 2024 • Consultation CON-10482' },
  { key: 'previous', title: 'Previous consultation', sub: '28 April 2024 • Consultation CON-10431' },
  { key: 'history', title: 'Medical history' },
];

export const patientDocs: PatientDoc[] = [
  { id: 'd1', title: 'Symptoms Journal', kind: 'journal', fileType: 'PDF', size: '1.4 MB', uploadedBy: 'patient', uploadedAt: '15 May 2024, 8:40 AM', source: 'bookingAttachment', group: 'current', assigned: true },
  { id: 'd2', title: 'Sleep Tracking Report', kind: 'report', fileType: 'PDF', size: '860 KB', uploadedBy: 'patient', uploadedAt: '14 May 2024, 7:15 PM', source: 'requested', requestId: 'rq1', group: 'current', assigned: true },
  { id: 'd3', title: 'Previous Prescription', kind: 'prescription', fileType: 'PDF', size: '420 KB', uploadedBy: 'coracure', uploadedAt: '28 April 2024, 11:05 AM', source: 'consultationRecord', group: 'previous', assigned: true },
  { id: 'd4', title: 'Therapy Notes Shared by Patient', kind: 'report', fileType: 'PDF', size: '720 KB', uploadedBy: 'patient', uploadedAt: '27 April 2024', source: 'preConsult', group: 'previous', assigned: true },
  { id: 'd5', title: 'Initial Medical History', kind: 'report', fileType: 'PDF', size: '540 KB', uploadedBy: 'patient', uploadedAt: '10 April 2024', source: 'patientRecord', group: 'history', assigned: true },
];

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

export const REASON_MAX = 300;

export const newRequest = (over: Partial<ReportRequest> = {}): ReportRequest => ({
  id: 'rq-new',
  docType: 'prescription',
  itemName: 'Previous psychiatric prescription',
  reason:
    'Required to review the patient’s previous medication history before the next consultation.',
  requestedBy: 'Dr. Arjun Mehta',
  requestedOn: '15 May 2024',
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
export const patientRequestNotice = (doctor: string) =>
  `${doctor} has requested a document for your upcoming consultation. Open CoraCure to view the request and upload the file.`;

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

export const docNotifications: DocNotification[] = [
  {
    id: 'nt-d2',
    requestId: 'rq1',
    docId: 'd2',
    title: 'Requested document uploaded',
    body: fulfilmentNotice('Rahul Sharma', 'Sleep Tracking Report'),
    receivedAgo: '14 May, 7:15 PM',
    read: false,
  },
];

export const docPatient = {
  initials: 'RS',
  name: 'Rahul Sharma',
  gender: 'Male' as const,
  age: 32,
  patientId: 'PT-10482',
  consultationId: 'CON-10482',
};
