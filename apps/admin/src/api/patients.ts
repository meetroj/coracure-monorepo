import { ApiError } from '@coracure/api/errors';

import * as db from '../mock/db';
import { patientRecords } from '../mock/patients';

/**
 * The patient directory, on fixtures like the rest of the panel.
 *
 * Deliberately logistics-only: no diagnoses, notes or prescriptions exist in
 * these types, so no screen can show them by accident.
 */

export type PatientStatus = 'active' | 'inactive' | 'pending_deletion';
export type CheckInColour = 'green' | 'amber' | 'red';

export type PatientConsultation = {
  id: string;
  referenceCode: string;
  status: string;
  serviceName: string;
  doctorName: string | null;
  startsAt: string;
};

export type PatientComplaint = {
  id: string;
  subject: string;
  category: string;
  status: string;
  raisedAt: string;
};

export type PatientFollowUp = {
  id: string;
  /** The case (consultation) this plan was assigned after. */
  consultationId: string;
  consultationRef: string;
  planName: string;
  status: 'active' | 'completed' | 'stopped';
  startedAt: string;
  endsAt: string | null;
  checkIn: CheckInColour | null;
  lastCheckInAt: string | null;
};

/** Names and categories only — never file content. */
export type PatientFile = { id: string; name: string; category: string; uploadedAt: string };
export type PatientReportRequest = {
  id: string;
  title: string;
  status: 'requested' | 'received' | 'overdue';
  requestedAt: string;
};

export type PatientConsent = { documentType: string; version: string; acceptedAt: string };

export type PatientSummary = {
  id: string;
  referenceCode: string;
  fullName: string;
  mobileNumber: string;
  /** `YYYY-MM-DD`, as entered at sign-up. Null when the patient left it out. */
  dateOfBirth: string | null;
  age: number;
  gender: string;
  language: string;
  region: string;
  status: PatientStatus;
  joinedAt: string;
  lastActiveAt: string;
  consultationCount: number;
  lastConsultationAt: string | null;
  hasOpenComplaint: boolean;
  hasActiveFollowUp: boolean;
};

/**
 * What the patient filled in on their profile. Basic details and contact
 * details are mandatory at sign-up except where marked; the health profile is
 * an optional section the patient may leave empty.
 */
export type PatientProfile = {
  // Basic details — `photoUploaded` is the only optional one.
  email: string;
  languages: string[];
  photoUploaded: boolean;
  // Contact details — `addressLine2` and `district` are optional.
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district: string | null;
  state: string;
  pinCode: string;
  country: string;
  // Health profile — optional as a whole; any field may be empty.
  health: {
    bloodGroup: string | null;
    heightCm: number | null;
    weightKg: number | null;
    allergies: string | null;
    chronicConditions: string | null;
    regularMedications: string | null;
  } | null;
};

export type PatientDetailRecord = PatientSummary & {
  profile: PatientProfile;
  consultations: PatientConsultation[];
  complaints: PatientComplaint[];
  followUps: PatientFollowUp[];
  files: PatientFile[];
  reportRequests: PatientReportRequest[];
  consents: PatientConsent[];
};

export type PatientQuery = {
  search?: string;
  status?: string;
  hasOpenComplaint?: string;
  hasActiveFollowUp?: string;
  limit?: number;
};

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const notFound = (what: string) =>
  Promise.reject(
    new ApiError({ statusCode: 404, code: 'NOT_FOUND', message: `${what} not found` }),
  );

const OPEN_COMPLAINT = new Set(['open', 'in_progress']);

const summarise = (p: PatientDetailRecord): PatientSummary => {
  const dated = p.consultations.map((c) => c.startsAt).sort();
  return {
    id: p.id,
    referenceCode: p.referenceCode,
    fullName: p.fullName,
    mobileNumber: p.mobileNumber,
    dateOfBirth: p.dateOfBirth,
    age: p.age,
    gender: p.gender,
    language: p.language,
    region: p.region,
    status: p.status,
    joinedAt: p.joinedAt,
    lastActiveAt: p.lastActiveAt,
    consultationCount: p.consultations.length,
    lastConsultationAt: dated.length ? dated[dated.length - 1] : null,
    hasOpenComplaint: p.complaints.some((c) => OPEN_COMPLAINT.has(c.status)),
    hasActiveFollowUp: p.followUps.some((f) => f.status === 'active'),
  };
};

export const patients = {
  /** Newest activity first. `total` is the match count before `limit` is applied. */
  list: (q: PatientQuery = {}) => {
    const term = (q.search ?? '').trim().toLowerCase();
    const digits = term.replace(/\D/g, '');
    const all = patientRecords().map(summarise);
    const rows = all
      .filter((p) => {
        if (q.status && p.status !== q.status) return false;
        if (q.hasOpenComplaint === 'true' && !p.hasOpenComplaint) return false;
        if (q.hasActiveFollowUp === 'true' && !p.hasActiveFollowUp) return false;
        if (!term) return true;
        return (
          p.fullName.toLowerCase().includes(term) ||
          p.id.toLowerCase().includes(term) ||
          p.referenceCode.toLowerCase().includes(term) ||
          (digits.length > 0 && p.mobileNumber.replace(/\D/g, '').includes(digits))
        );
      })
      .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
    return db.delay({ rows: copy(rows.slice(0, q.limit ?? rows.length)), total: rows.length });
  },

  /** Corrects a profile on the patient's behalf. Only profile fields — never records. */
  update: (
    id: string,
    input: {
      fullName: string;
      dateOfBirth: string;
      gender: string;
      email: string;
      languages: string[];
      addressLine1: string;
      addressLine2: string | null;
      city: string;
      district: string | null;
      state: string;
      pinCode: string;
      country: string;
      health: PatientProfile['health'];
    },
  ) => {
    const found = patientRecords().find((p) => p.id === id);
    if (!found) return notFound('Patient');
    const { fullName, dateOfBirth, gender, email, languages, health, ...address } = input;
    found.fullName = fullName;
    found.dateOfBirth = dateOfBirth;
    // Age is derived from the date of birth, never stored on its own.
    const born = new Date(dateOfBirth);
    const now = new Date();
    found.age =
      now.getFullYear() - born.getFullYear() -
      (now < new Date(now.getFullYear(), born.getMonth(), born.getDate()) ? 1 : 0);
    found.gender = gender;
    found.language = languages[0] ?? found.language;
    found.profile = { ...found.profile, ...address, email, languages, health };
    return db.delay(copy(found));
  },

  get: (id: string) => {
    const found = patientRecords().find((p) => p.id === id);
    return found ? db.delay(copy(found)) : notFound('Patient');
  },
};
