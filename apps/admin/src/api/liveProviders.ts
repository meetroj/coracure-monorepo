import { request } from './http';
import type {
  CredentialQueueRow,
  Doctor,
  DoctorDocument,
  DoctorRegistration,
  ProviderCategory,
  Reliability,
  VerificationStatus,
} from './types';

/**
 * Providers against the real backend: `GET /admin/doctors` (the roster),
 * `GET /admin/doctors/:id`, the credential and decision routes under it, and
 * `GET /doctor-credentials/:id/download-url`.
 *
 * Source of truth: `AdminRosterRow`, `AdminDoctorDetail`, `VerificationProgress`,
 * `CredentialSummary`, `ReviewCredentialDto`, `RejectDoctorDto`,
 * `RequestDoctorChangesDto`, `SuspendDoctorDto`, `SetListedDto` and
 * `SetSeniorityDto`. Bodies are built field by field: the backend runs
 * `forbidNonWhitelisted`, so a spread form object is a hard 400.
 *
 * *** WHAT THE ADMIN VIEW DOES NOT CARRY. *** The roster and the detail hold no
 * date of birth, gender, government ID, e-mail or per-employer experience
 * entries, so the Verification cards for those show nothing rather than a
 * made-up value. They are a backend gap, listed in docs/ADMIN_INTEGRATION_GAPS.md.
 */

/** The backend's four provider categories (the panel's four tabs). */
export type RosterCategory = 'medical' | 'super_specialty' | 'paramedical' | 'veterinary';

type LiveAvailability = 'available_now' | 'busy' | 'offline' | 'paused' | 'scheduled_only';

export type LiveSignature = {
  status: 'not_uploaded' | 'pending_review' | 'approved' | 'replacement_requested';
  documentId: string | null;
  uploadedAt: string | null;
  reviewedAt: string | null;
  /** The reviewer's reason; set only while a replacement is requested. */
  reason: string | null;
};

/** One roster row; the detail is the same minus the roster-only counts. */
export type LiveProvider = {
  id: string;
  fullName: string;
  mobileNumber: string;
  mobileVerifiedAt: string | null;
  bio: string | null;
  languages: string[];
  verificationStatus: VerificationStatus;
  registrationNumber: string | null;
  registrationCouncil: string | null;
  qualification: string | null;
  yearsOfExperience: number | null;
  seniorityLevel: 'standard' | 'expert';
  specialtyId: string | null;
  superSpecialtyId: string | null;
  providerCode: string;
  changesRequestedNote: string | null;
  /** What the provider is PAID. The patient's fee is the specialty's. */
  payoutFeeInr: number;
  consultationDurationMinutes: number;
  bufferMinutes: number;
  isListed: boolean;
  photoUrl: string | null;
  createdAt: string;
  category: RosterCategory | null;
  specialtyName: string | null;
  superSpecialtyName: string | null;
  // Roster rows only.
  rating?: number | null;
  totalConsultations?: number;
  availability?: LiveAvailability;
  pendingDocumentCount?: number;
  submittedAt?: string | null;
  // Detail only.
  signature?: LiveSignature;
};

export type LivePage = { items: LiveProvider[]; total: number; limit: number; offset: number };

/** `GET /admin/doctors/:id/registration`: what the provider stated, the ID number already cut to four characters. */
export type LiveRegistration = {
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | 'undisclosed' | null;
  email: string | null;
  identity: { idType: string; idTypeName: string | null; numberLast4: string; abhaId: string | null } | null;
  qualifications: {
    basicQualification: string;
    pgSpecialisation: string | null;
    superSpecialisation: string | null;
    fellowship: string | null;
  } | null;
  experience: { designation: string; institution: string; years: number }[];
  signatureDocumentId: string | null;
};

export type LiveCredential = {
  id: string;
  documentType: string;
  fileName: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  verifiedAt: string | null;
  uploadedAt: string;
};

/** `GET /admin/doctors/:id/credentials` */
export type LiveProgress = {
  doctorId: string;
  status: VerificationStatus;
  rejectionReason: string | null;
  changesRequestedNote: string | null;
  registrationNumberMissing: boolean;
  readyForVerification: boolean;
  documents: LiveCredential[];
};

/* -------------------------------- languages ------------------------------- */

/** The backend stores ISO 639-1 codes (plus `hinglish`); the panel shows names. */
const LANGUAGE_NAMES: Record<string, string> = {
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

export const LANGUAGE_HINT = Object.values(LANGUAGE_NAMES).join(', ');

export const languageLabel = (code: string): string => LANGUAGE_NAMES[code] ?? code;

/** Names or codes, comma separated, back to the codes the backend accepts. */
export function languageCodes(text: string): { codes: string[]; unknown: string[] } {
  const byName = new Map(Object.entries(LANGUAGE_NAMES).map(([code, name]) => [name.toLowerCase(), code]));
  const codes: string[] = [];
  const unknown: string[] = [];
  for (const raw of text.split(',')) {
    const word = raw.trim().toLowerCase();
    if (!word) continue;
    const code = word in LANGUAGE_NAMES ? word : byName.get(word);
    if (!code) unknown.push(raw.trim());
    else if (!codes.includes(code)) codes.push(code);
  }
  return { codes, unknown };
}

/* -------------------------------- mapping --------------------------------- */

/** `medical` and `super_specialty` are both Doctors in the panel's vocabulary. */
export const categoryOf = (c: RosterCategory | null): ProviderCategory =>
  c === 'paramedical' ? 'paramedical' : c === 'veterinary' ? 'veterinary' : 'doctor';

const SIGNATURE: Record<LiveSignature['status'], NonNullable<Doctor['signatureStatus']>> = {
  not_uploaded: 'not_submitted',
  pending_review: 'submitted',
  approved: 'approved',
  replacement_requested: 'replacement_requested',
};

/**
 * `progress` is the credentials call. It carries the reason a provider was
 * rejected, which the detail does not, so it is merged in when the reader may
 * call it. Without it the Rejected banner simply has no reason line.
 */
/** The signed photo link, only if it is a web address: it ends up in an `<img src>`. */
const photoOf = (p: Pick<LiveProvider, 'photoUrl'>): string | null =>
  p.photoUrl && isWebUrl(p.photoUrl) ? p.photoUrl : null;

const GENDER: Record<NonNullable<LiveRegistration['gender']>, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  undisclosed: 'Prefer not to say',
};

const ID_TYPE: Record<string, string> = {
  aadhaar: 'Aadhaar',
  passport: 'Passport',
  driving_licence: 'Driving licence',
  voter_id: 'Voter ID',
};

/** The registration facts as the review cards read them. */
export function registrationFrom(r: LiveRegistration, p: Pick<LiveProvider, 'mobileVerifiedAt' | 'photoUrl'>): DoctorRegistration {
  const q = r.qualifications;
  return {
    loaded: true,
    dateOfBirth: r.dateOfBirth,
    gender: r.gender ? GENDER[r.gender] : null,
    idType: r.identity ? (r.identity.idType === 'other' ? r.identity.idTypeName || 'Other' : (ID_TYPE[r.identity.idType] ?? r.identity.idType)) : null,
    idNumberLast4: r.identity?.numberLast4 || null,
    abhaId: r.identity?.abhaId ?? null,
    basicQualification: q?.basicQualification ?? null,
    pgSpecialisation: q?.pgSpecialisation ?? null,
    superSpecialisation: q?.superSpecialisation ?? null,
    fellowship: q?.fellowship ?? null,
    experience: r.experience.map((x) => ({ designation: x.designation, institution: x.institution, years: x.years })),
    hasSignature: r.signatureDocumentId != null,
    hasPhoto: photoOf(p) != null,
    mobileVerified: p.mobileVerifiedAt != null,
    emailVerified: undefined,
  };
}

export function doctorFromLive(
  p: LiveProvider,
  progress?: LiveProgress | null,
  registration?: LiveRegistration | null,
): Doctor {
  return {
    id: p.id,
    fullName: p.fullName,
    mobileNumber: p.mobileNumber,
    specialtyId: p.specialtyId,
    specialtyName: p.specialtyName,
    superSpecialtyName: p.superSpecialtyName,
    superSpecialtyId: p.superSpecialtyId,
    bio: p.bio,
    qualification: p.qualification,
    registrationNumber: p.registrationNumber,
    registrationCouncil: p.registrationCouncil,
    yearsOfExperience: p.yearsOfExperience,
    languages: p.languages.map(languageLabel),
    verificationStatus: p.verificationStatus,
    isListed: p.isListed,
    seniority: p.seniorityLevel,
    payoutFeeInr: p.payoutFeeInr,
    consultationDurationMinutes: p.consultationDurationMinutes,
    bufferMinutes: p.bufferMinutes,
    createdAt: p.createdAt,
    category: categoryOf(p.category),
    providerCode: p.providerCode,
    rating: p.rating ?? null,
    totalConsultations: p.totalConsultations,
    // ponytail: the backend has five availabilities; the panel's filter has two.
    // Busy and scheduled-only read as Unavailable. Widen AVAILABILITY_OPTIONS if asked.
    availabilityStatus: p.availability === 'available_now' ? 'available' : 'unavailable',
    signatureStatus: p.signature ? SIGNATURE[p.signature.status] : undefined,
    signatureDocumentId: p.signature?.documentId ?? null,
    photoUrl: photoOf(p),
    changesRequiredNote: progress?.changesRequestedNote ?? p.changesRequestedNote,
    rejectionReason: progress?.rejectionReason ?? null,
    email: registration?.email ?? null,
    registration: registration
      ? {
          ...registrationFrom(registration, p),
          // The signature card of the detail is the later word than the document id.
          hasSignature: p.signature ? p.signature.status !== 'not_uploaded' : registration.signatureDocumentId != null,
        }
      : {
          hasPhoto: photoOf(p) != null,
          hasSignature: p.signature ? p.signature.status !== 'not_uploaded' : undefined,
          mobileVerified: p.mobileVerifiedAt != null,
        },
  };
}

/** The Verification worklist row: every provider, with how many documents wait. */
export const queueRowOf = (p: LiveProvider): CredentialQueueRow => ({
  doctorId: p.id,
  fullName: p.fullName,
  specialtyName: p.specialtyName,
  category: categoryOf(p.category),
  verificationStatus: p.verificationStatus,
  pendingDocuments: p.pendingDocumentCount ?? 0,
  submittedAt: p.submittedAt ?? null,
  photoUrl: photoOf(p),
});

export const documentOf = (c: LiveCredential): DoctorDocument => ({
  id: c.id,
  documentType: c.documentType,
  status: c.reviewStatus,
  fileId: c.fileName,
  rejectionReason: c.rejectionReason,
  uploadedAt: c.uploadedAt,
  reviewedAt: c.verifiedAt,
});

/* -------------------------------- requests -------------------------------- */

/** The backend's page ceiling for the roster (`@Max(100)` on `limit`). */
export const PAGE = 100;
/** Twenty pages is two thousand providers; past that the list says so. */
const MAX_PAGES = 20;

export type RosterQuery = {
  verificationStatus?: string;
  isListed?: string;
  search?: string;
  /** Backend categories. Several are fetched separately and merged. */
  categories?: RosterCategory[];
};

/** The query string for one page of one category. Pure, so it is pinned by a spec. */
export function rosterParams(
  q: RosterQuery,
  category: RosterCategory | undefined,
  offset: number,
): Record<string, string | number | undefined> {
  const search = q.search?.trim();
  return {
    limit: PAGE,
    offset,
    sort: 'name',
    category,
    verificationStatus: q.verificationStatus || undefined,
    isListed: q.isListed === 'true' || q.isListed === 'false' ? q.isListed : undefined,
    search: search || undefined,
  };
}

async function allOf(q: RosterQuery, category: RosterCategory | undefined): Promise<LiveProvider[]> {
  const rows: LiveProvider[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const got = await request<LivePage>('/admin/doctors', { query: rosterParams(q, category, page * PAGE) });
    rows.push(...got.items);
    if (rows.length >= got.total || got.items.length === 0) break;
  }
  return rows;
}

/** Every roster row matching the query, all categories merged and de-duplicated. */
export async function rosterAll(q: RosterQuery = {}): Promise<LiveProvider[]> {
  const cats = q.categories?.length ? q.categories : [undefined];
  const groups = await Promise.all(cats.map((c) => allOf(q, c)));
  const seen = new Set<string>();
  return groups.flat().filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

const base = (id: string) => `/admin/doctors/${encodeURIComponent(id)}`;

/**
 * 403: this level may not read it. 404: the backend predates the route. Either
 * way the provider page still opens, without that part.
 */
const forbidden = (e: unknown) => {
  const status = (e as { statusCode?: number } | null)?.statusCode;
  return status === 403 || status === 404;
};

/** Only http(s) is ever opened: a signed link is the only thing this accepts. */
export const isWebUrl = (u: string): boolean => /^https?:\/\//i.test(u);

export const liveDoctors = {
  list: (q: RosterQuery = {}) => rosterAll(q).then((rows) => rows.map((p) => doctorFromLive(p))),

  /** The Verification worklist: the whole roster, every status, with document counts. */
  queue: () => rosterAll().then((rows) => rows.map(queueRowOf)),

  get: async (id: string): Promise<Doctor> => {
    // Credentials and the registration are clinical governance and operations
    // only; a care coordinator still gets the profile, without those.
    const onlyIfAllowed = <T,>(path: string) =>
      request<T>(path).catch((e: unknown) => {
        if (forbidden(e)) return null;
        throw e;
      });
    const [detail, progress, registration] = await Promise.all([
      request<LiveProvider>(base(id)),
      onlyIfAllowed<LiveProgress>(`${base(id)}/credentials`),
      onlyIfAllowed<LiveRegistration>(`${base(id)}/registration`),
    ]);
    return doctorFromLive(detail, progress, registration);
  },

  credentials: (id: string) =>
    request<LiveProgress>(`${base(id)}/credentials`).then((p) => p.documents.map(documentOf)),

  /** A short-lived signed link to one credential file; every read is audited server side. */
  downloadUrl: (documentId: string) =>
    request<{ url: string; expiresInSeconds: number }>(
      `/doctor-credentials/${encodeURIComponent(documentId)}/download-url`,
    ),

  reviewCredential: (documentId: string, approved: boolean, rejectionReason?: string) =>
    request<unknown>(`/admin/doctors/credentials/${encodeURIComponent(documentId)}/review`, {
      method: 'POST',
      body: approved ? { approved: true } : { approved: false, rejectionReason: rejectionReason?.trim() },
    }),

  verify: (id: string) => request<unknown>(`${base(id)}/verify`, { method: 'POST', body: {} }),

  reject: (id: string, reason: string) =>
    request<unknown>(`${base(id)}/reject`, { method: 'POST', body: { reason: reason.trim() } }),

  requestChanges: (id: string, note: string) =>
    request<unknown>(`${base(id)}/request-changes`, { method: 'POST', body: { note: note.trim() } }),

  reopen: (id: string) => request<unknown>(`${base(id)}/reopen`, { method: 'POST', body: {} }),

  suspend: (id: string, reason: string) =>
    request<unknown>(`${base(id)}/suspend`, { method: 'POST', body: { reason: reason.trim() } }),

  reinstate: (id: string) => request<unknown>(`${base(id)}/reinstate`, { method: 'POST', body: {} }),

  setListing: (id: string, isListed: boolean) =>
    request<unknown>(`${base(id)}/listing`, { method: 'PATCH', body: { isListed } }),

  setSeniority: (id: string, seniority: 'standard' | 'expert') =>
    request<unknown>(`${base(id)}/seniority`, { method: 'PATCH', body: { seniorityLevel: seniority } }),

  setSignature: (id: string, status: 'approved' | 'replacement_requested', reason?: string) =>
    status === 'approved'
      ? request<unknown>(`${base(id)}/signature/approve`, { method: 'POST', body: {} })
      : request<unknown>(`${base(id)}/signature/request-replacement`, {
          method: 'POST',
          body: { reason: (reason ?? '').trim() },
        }),

  reliability: (id: string) => request<Reliability>(`${base(id)}/reliability`),
};

/**
 * `PATCH /admin/doctors/:id` for the two things the Commercials and Languages
 * cards edit. Only the keys given are sent, and only the ones the DTO knows.
 */
export function profilePatchBody(input: {
  payoutFeeInr?: number;
  consultationDurationMinutes?: number;
  languages?: string[];
}): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (typeof input.payoutFeeInr === 'number' && Number.isFinite(input.payoutFeeInr)) {
    body.payoutFeeInr = input.payoutFeeInr;
  }
  if (typeof input.consultationDurationMinutes === 'number' && Number.isFinite(input.consultationDurationMinutes)) {
    body.consultationDurationMinutes = input.consultationDurationMinutes;
  }
  if (input.languages) {
    const { codes, unknown } = languageCodes(input.languages.join(','));
    if (unknown.length > 0) {
      throw new Error(`Not a language the platform knows: ${unknown.join(', ')}. Use ${LANGUAGE_HINT}.`);
    }
    body.languages = codes;
  }
  return body;
}

export const updateProfile = (id: string, input: Parameters<typeof profilePatchBody>[0]) =>
  request<unknown>(base(id), { method: 'PATCH', body: profilePatchBody(input) });

/* ----------------------------- create and edit ----------------------------- */

/** The same E.164 pattern as the backend's `CreateDoctorDto`. */
export const E164 = /^\+[1-9]\d{7,14}$/;

/** Spaces, dashes and brackets removed; a bare ten-digit Indian number gets +91. */
export function normaliseMobile(input: string): string {
  const compact = input.replace(/[\s\-()]/g, '');
  return /^\d{10}$/.test(compact) ? `+91${compact}` : compact;
}

/** Every field of the create and edit forms, as the text the admin typed. */
export type ProviderFields = {
  fullName: string;
  specialtyId: string;
  /** '' means none. */
  superSpecialtyId: string;
  /** What a patient sees: names only. */
  qualification: string;
  registrationNumber: string;
  registrationCouncil: string;
  yearsOfExperience: string;
  /** Names or codes, comma separated. */
  languages: string;
  bio: string;
  payoutFeeInr: string;
  consultationDurationMinutes: string;
  bufferMinutes: string;
};

export const BLANK_FIELDS: ProviderFields = {
  fullName: '',
  specialtyId: '',
  superSpecialtyId: '',
  qualification: '',
  registrationNumber: '',
  registrationCouncil: '',
  yearsOfExperience: '',
  languages: '',
  bio: '',
  payoutFeeInr: '',
  consultationDurationMinutes: '',
  bufferMinutes: '',
};

const text = (v: string | number | null | undefined) => (v == null ? '' : String(v));

export const fieldsOf = (d: Doctor): ProviderFields => ({
  fullName: d.fullName,
  specialtyId: text(d.specialtyId),
  superSpecialtyId: text(d.superSpecialtyId),
  qualification: text(d.qualification),
  registrationNumber: text(d.registrationNumber),
  registrationCouncil: text(d.registrationCouncil),
  yearsOfExperience: text(d.yearsOfExperience),
  languages: (d.languages ?? []).join(', '),
  bio: text(d.bio),
  payoutFeeInr: text(d.payoutFeeInr),
  consultationDurationMinutes: text(d.consultationDurationMinutes),
  bufferMinutes: text(d.bufferMinutes),
});

const wholeIn = (s: string, min: number, max: number) => /^\d+$/.test(s) && Number(s) >= min && Number(s) <= max;

/** The first thing the backend would refuse, in words, or null. Mirrors `UpdateDoctorDto`. */
export function fieldProblem(f: ProviderFields): string | null {
  const t = (s: string) => s.trim();
  if (t(f.fullName).length < 2) return 'Enter the provider’s full name.';
  if (t(f.fullName).length > 160) return 'The name can be at most 160 characters.';
  if (t(f.qualification).length > 255) return 'The qualification can be at most 255 characters.';
  if (t(f.registrationNumber).length > 80) return 'The registration number can be at most 80 characters.';
  if (t(f.registrationCouncil).length > 160) return 'The registration council can be at most 160 characters.';
  if (t(f.bio).length > 4000) return 'The bio can be at most 4000 characters.';
  if (t(f.yearsOfExperience) && !wholeIn(t(f.yearsOfExperience), 0, 70)) {
    return 'Years of experience must be a whole number from 0 to 70.';
  }
  if (t(f.payoutFeeInr) && !(/^\d+(\.\d{1,2})?$/.test(t(f.payoutFeeInr)) && Number(t(f.payoutFeeInr)) <= 99_999_999)) {
    return 'The payout fee must be an amount in rupees with at most two decimals.';
  }
  if (t(f.consultationDurationMinutes) && !wholeIn(t(f.consultationDurationMinutes), 5, 180)) {
    return 'The consultation length must be a whole number of minutes from 5 to 180.';
  }
  if (t(f.bufferMinutes) && !wholeIn(t(f.bufferMinutes), 0, 120)) {
    return 'The buffer must be a whole number of minutes from 0 to 120.';
  }
  return null;
}

const codesOf = (languages: string): string[] => {
  const { codes, unknown } = languageCodes(languages);
  if (unknown.length > 0) {
    throw new Error(`Not a language the platform knows: ${unknown.join(', ')}. Use ${LANGUAGE_HINT}.`);
  }
  return codes;
};

/**
 * `POST /admin/doctors`. Only what `CreateDoctorDto` takes: the provider
 * completes identity, qualifications, experience and documents in their own
 * app after signing in with this number.
 */
export function createDoctorBody(mobile: string, f: ProviderFields): Record<string, unknown> {
  const number = normaliseMobile(mobile);
  if (!E164.test(number)) throw new Error('Enter the mobile number with its country code, for example +919876543210.');
  if (!f.specialtyId) throw new Error('Choose a specialty.');
  const problem = fieldProblem(f);
  if (problem) throw new Error(problem);

  const body: Record<string, unknown> = { mobileNumber: number, fullName: f.fullName.trim(), specialtyId: f.specialtyId };
  if (f.qualification.trim()) body.qualification = f.qualification.trim();
  if (f.registrationNumber.trim()) body.registrationNumber = f.registrationNumber.trim();
  if (f.registrationCouncil.trim()) body.registrationCouncil = f.registrationCouncil.trim();
  if (f.yearsOfExperience.trim()) body.yearsOfExperience = Number(f.yearsOfExperience);
  if (f.languages.trim()) body.languages = codesOf(f.languages);
  if (f.bio.trim()) body.bio = f.bio.trim();
  if (f.payoutFeeInr.trim()) body.payoutFeeInr = Number(f.payoutFeeInr);
  if (f.consultationDurationMinutes.trim()) body.consultationDurationMinutes = Number(f.consultationDurationMinutes);
  if (f.bufferMinutes.trim()) body.bufferMinutes = Number(f.bufferMinutes);
  return body;
}

/**
 * `PATCH /admin/doctors/:id`: only what changed, so the audit entry names the
 * real edit. A council or super-specialty emptied is sent as `null` (the DTO
 * clears on null); every other blank is left alone rather than sent empty.
 */
export function updateDoctorBody(before: ProviderFields, after: ProviderFields): Record<string, unknown> {
  const problem = fieldProblem(after);
  if (problem) throw new Error(problem);

  const body: Record<string, unknown> = {};
  const changed = (k: keyof ProviderFields) => after[k].trim() !== before[k].trim();
  const set = (k: keyof ProviderFields, value: unknown) => {
    if (changed(k) && after[k].trim() !== '') body[k] = value;
  };

  set('fullName', after.fullName.trim());
  set('specialtyId', after.specialtyId);
  set('qualification', after.qualification.trim());
  set('registrationNumber', after.registrationNumber.trim());
  set('bio', after.bio.trim());
  set('yearsOfExperience', Number(after.yearsOfExperience));
  set('payoutFeeInr', Number(after.payoutFeeInr));
  set('consultationDurationMinutes', Number(after.consultationDurationMinutes));
  set('bufferMinutes', Number(after.bufferMinutes));

  if (changed('registrationCouncil')) body.registrationCouncil = after.registrationCouncil.trim() || null;
  if (changed('superSpecialtyId')) body.superSpecialtyId = after.superSpecialtyId || null;

  const was = codesOf(before.languages).slice().sort().join(',');
  const now = codesOf(after.languages);
  if (after.languages.trim() && now.slice().sort().join(',') !== was) body.languages = now;
  return body;
}

export type LiveSpecialty = {
  id: string;
  name: string;
  category: RosterCategory;
  isActive: boolean;
  parentSpecialtyId: string | null;
};

export const specialties = {
  list: () => request<LiveSpecialty[]>('/admin/specialties'),
};

/** The super-specialties that sit under the chosen specialty: the only ones the backend accepts. */
export const superSpecialtiesUnder = (all: LiveSpecialty[], specialtyId: string): LiveSpecialty[] =>
  all.filter((s) => s.category === 'super_specialty' && s.isActive && s.parentSpecialtyId === specialtyId);

export const createProvider = (mobile: string, f: ProviderFields) =>
  request<{ id: string }>('/admin/doctors', { method: 'POST', body: createDoctorBody(mobile, f) });

export const editProvider = (id: string, before: ProviderFields, after: ProviderFields) =>
  request<unknown>(base(id), { method: 'PATCH', body: updateDoctorBody(before, after) });

/** `GET/PATCH /admin/doctors/:id/regions`: the region ids a provider serves. Sent whole, not incrementally. */
export const regionsBody = (regionIds: string[]) => ({ regionIds: [...new Set(regionIds)] });

export const providerRegions = {
  get: (id: string) => request<string[]>(`${base(id)}/regions`),
  set: (id: string, regionIds: string[]) =>
    request<string[]>(`${base(id)}/regions`, { method: 'PATCH', body: regionsBody(regionIds) }),
};
