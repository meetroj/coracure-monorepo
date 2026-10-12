import type { PatientDetailRecord, PatientQuery, PatientStatus, PatientSummary } from './patients';

/**
 * The backend's admin patients contract, and the translations the panel needs.
 *
 * Source of truth: `AdminPatientRow`, `AdminPatientDetail`, `AdminPatientUpdate`
 * and `AdminPatientListQueryDto` in `src/patients/`. Pure and network-free, so a
 * backend rename fails a spec instead of a screen.
 *
 * *** WHAT THE BACKEND WITHHOLDS ON PURPOSE. *** No health data (allergies,
 * conditions, medications) and no consents: the admin reads a clinical record
 * per consultation, never off the patient. The detail therefore carries
 * `health: null` and the screen says why rather than "not filled in".
 */

export const LIVE_PATIENT_STATUSES = ['pending', 'active', 'suspended'] as const;

export type LivePatientRow = {
  id: string;
  patientCode: string;
  fullName: string | null;
  mobileNumber: string | null;
  email: string | null;
  status: 'pending' | 'active' | 'suspended' | 'deleted';
  gender: string;
  age: number | null;
  region: { id: string; name: string } | null;
  consultationCount: number;
  lastConsultationAt: string | null;
  createdAt: string;
};

export type LivePatientPage = { items: LivePatientRow[]; total: number; limit: number; offset: number };

export type LivePatientDetail = Omit<LivePatientRow, 'consultationCount' | 'lastConsultationAt'> & {
  dateOfBirth: string | null;
  preferredLanguage: string;
  languages: string[];
  emailVerified: boolean;
  address: { line: string | null; pinCode: string | null; city: string | null; district: string | null; state: string | null } | null;
  profileComplete: boolean;
  updatedAt: string;
  activity: {
    consultations: number;
    completed: number;
    cancelled: number;
    noShow: number;
    upcoming: number;
    openComplaints: number;
    lastConsultationAt: string | null;
  };
};

/** `LANGUAGES` in the backend's `common/languages.ts`, with the names a person reads. */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  hinglish: 'Hinglish',
  mr: 'Marathi',
  kn: 'Kannada',
  pa: 'Punjabi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  gu: 'Gujarati',
  ml: 'Malayalam',
  ur: 'Urdu',
};

export const languageName = (code: string): string => LANGUAGE_NAMES[code] ?? code;

/** The backend's genders, offered in the order it lists them. */
export const LIVE_GENDERS = ['male', 'female', 'other', 'undisclosed'] as const;

const asStatus = (s: LivePatientRow['status']): PatientStatus => (s === 'deleted' ? 'pending_deletion' : s);

/** `GET /admin/patients` query. The two fixture-only filters (complaint, follow-up) have no backend field. */
export function patientListQuery(q: PatientQuery): Record<string, string | number> {
  const out: Record<string, string | number> = {
    sort: 'newest',
    limit: Math.min(Math.max(q.limit ?? 25, 1), 100),
    offset: 0,
  };
  const search = q.search?.trim();
  if (search) out.search = search;
  if (q.status) out.status = q.status;
  return out;
}

export function fromLivePatientRow(row: LivePatientRow): PatientSummary {
  return {
    id: row.id,
    referenceCode: row.patientCode,
    fullName: row.fullName ?? 'Unnamed patient',
    mobileNumber: row.mobileNumber ?? '-',
    dateOfBirth: null,
    age: row.age,
    gender: row.gender,
    language: '',
    region: row.region?.name ?? '-',
    status: asStatus(row.status),
    joinedAt: row.createdAt,
    // The list does not carry "last active"; the newest signal it has is the last consultation.
    lastActiveAt: row.lastConsultationAt ?? row.createdAt,
    consultationCount: row.consultationCount,
    lastConsultationAt: row.lastConsultationAt,
    hasOpenComplaint: false,
    hasActiveFollowUp: false,
  };
}

/**
 * The detail, in the record shape the patient screen already renders. The arrays
 * the live read does not carry are left empty and the screen does not draw their
 * tabs while live - an empty array must never read as "nothing happened".
 */
export function fromLivePatientDetail(d: LivePatientDetail): PatientDetailRecord {
  const languages = d.languages.length ? d.languages : [d.preferredLanguage];
  return {
    id: d.id,
    referenceCode: d.patientCode,
    fullName: d.fullName ?? 'Unnamed patient',
    mobileNumber: d.mobileNumber ?? '-',
    dateOfBirth: d.dateOfBirth,
    age: d.age,
    gender: d.gender,
    language: languageName(languages[0]),
    region: d.region?.name ?? '-',
    regionId: d.region?.id ?? null,
    languageCodes: languages,
    status: asStatus(d.status),
    joinedAt: d.createdAt,
    lastActiveAt: d.activity.lastConsultationAt ?? d.updatedAt,
    consultationCount: d.activity.consultations,
    lastConsultationAt: d.activity.lastConsultationAt,
    hasOpenComplaint: d.activity.openComplaints > 0,
    hasActiveFollowUp: false,
    profile: {
      email: d.email ?? '',
      languages: languages.map(languageName),
      photoUploaded: false,
      addressLine1: d.address?.line ?? '',
      addressLine2: null,
      city: d.address?.city ?? '',
      district: d.address?.district ?? null,
      state: d.address?.state ?? '',
      pinCode: d.address?.pinCode ?? '',
      country: 'India',
      health: null,
    },
    consultations: [],
    complaints: [],
    followUps: [],
    files: [],
    reportRequests: [],
    consents: [],
  };
}

/** What a support edit may send. The email, mobile number and every health field are refused by the backend. */
export type LivePatientEdit = {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  languages: string[];
  regionId: string;
  addressLine: string;
  pinCode: string;
};

/**
 * `PATCH /admin/patients/:id` body. Built field by field (the backend runs
 * `forbidNonWhitelisted`), and a field that is blank is left out: there is no
 * way to clear a name or a birth date through this endpoint.
 */
export function patientEditBody(input: LivePatientEdit): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const name = input.fullName.trim();
  if (name) body.fullName = name;
  if (input.dateOfBirth) body.dateOfBirth = input.dateOfBirth;
  if (input.gender) body.gender = input.gender;
  if (input.languages.length) body.languages = input.languages;
  if (input.regionId) body.regionId = input.regionId;
  // The address line and the PIN code travel together: a PIN with no street is not an address.
  if (input.addressLine.trim() && input.pinCode.trim()) {
    body.addressLine = input.addressLine.trim();
    body.pinCode = input.pinCode.trim();
  }
  return body;
}

/** Indian PIN code: six digits, not starting with 0 - the backend's own rule. */
export const PIN_CODE = /^[1-9][0-9]{5}$/;
