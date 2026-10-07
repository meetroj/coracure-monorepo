import { api } from '../http';
import { ClientCode, clientError } from '../errors';
import { putToSignedUrl, type LocalFile } from '../upload';
import type { DoctorVerificationStatus } from './doctorAuth';

/**
 * The doctor's own profile and credentials (API_CONTRACT §7.2).
 *
 * *** WHAT A DOCTOR MAY EDIT ABOUT THEMSELVES IS FOUR FIELDS. *** Name,
 * qualification, registration number, years of experience, specialty and fee
 * are the ADMIN's (`PATCH /v1/admin/doctors/:id`) — an administrator typed them
 * in when creating the account, and a provider cannot restate their own
 * credentials. `UpdateOwnDoctorProfileDto` is the whole of what this endpoint
 * accepts, and `forbidNonWhitelisted` makes anything else a hard 400 rather
 * than a silently ignored field.
 *
 * Everything else the onboarding form collects reaches the backend as a FILE,
 * through the credential upload below — `doctor_documents` stores a type, a
 * name and a storage key, and has no columns for the institution, university,
 * year, position or dates written on the certificate.
 */

/**
 * The consultation languages, by wire code — this app's copy of the backend's
 * `common/languages.ts`, which patients and providers are matched on. The DTO
 * refuses any other code; adding a language is adding it there and here.
 */
export const LANGUAGE_NAMES = {
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
} as const;
export type ApiLanguage = keyof typeof LANGUAGE_NAMES;

export type DoctorDocumentType =
  | 'degree_certificate'
  | 'registration_certificate'
  | 'identity_proof'
  | 'address_proof'
  | 'experience_letter'
  | 'profile_photo'
  | 'signature'
  | 'other';

export const CREDENTIAL_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
] as const;
export type CredentialContentType = (typeof CREDENTIAL_CONTENT_TYPES)[number];

export type DoctorSelfProfile = {
  id: string;
  fullName: string;
  mobileNumber: string;
  qualification: string | null;
  registrationNumber: string | null;
  yearsOfExperience: number | null;
  languages: string[];
  bio: string | null;
  specialtyId: string | null;
  consultationFeeInr: number | null;
  consultationDurationMinutes: number;
  bufferMinutes: number;
  seniorityLevel: 'standard' | 'expert';
  presence: string;
  allowInstantConsult: boolean;
  bankVerified: boolean;
  photoUrl: string | null;
  canPrescribe: boolean;
  verificationStatus: DoctorVerificationStatus;
  isListed: boolean;
  isBookable: boolean;
};

export type CredentialSummary = {
  id: string;
  documentType: DoctorDocumentType;
  fileName: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  verifiedByAdminId: string | null;
  verifiedAt: string | null;
  uploadedAt: string;
};

/** The whole credential screen in one shape. */
export type VerificationProgress = {
  doctorId: string;
  status: DoctorVerificationStatus;
  /** The admin's own words when the whole application was turned down. Null otherwise. */
  rejectionReason: string | null;
  /** Driven by the SPECIALTY, so it changes if an admin moves the doctor. */
  required: DoctorDocumentType[];
  approved: DoctorDocumentType[];
  outstanding: DoctorDocumentType[];
  rejected: DoctorDocumentType[];
  registrationNumberRequired: boolean;
  registrationNumberMissing: boolean;
  /** What gates the admin's verify step. Not something the app can set. */
  readyForVerification: boolean;
  documents: CredentialSummary[];
};

/** The four fields a doctor may change about themselves. */
export type OwnProfilePatch = {
  bio?: string;
  languages?: ApiLanguage[];
  consultationDurationMinutes?: number;
  bufferMinutes?: number;
};

export const getProfile = (): Promise<DoctorSelfProfile> =>
  api.get<DoctorSelfProfile>('/me/doctor/profile');

/**
 * Sends only the keys that are present.
 *
 * An explicit `undefined` would serialise away anyway, but building the body
 * from the allowed list rather than from form state is what keeps a field the
 * screen happens to hold — `fullName`, say — from ever reaching a DTO that
 * would reject the whole request because of it.
 */
export const updateProfile = (patch: OwnProfilePatch): Promise<DoctorSelfProfile> =>
  api.patch<DoctorSelfProfile>('/me/doctor/profile', {
    ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
    ...(patch.languages !== undefined ? { languages: patch.languages } : {}),
    ...(patch.consultationDurationMinutes !== undefined
      ? { consultationDurationMinutes: patch.consultationDurationMinutes }
      : {}),
    ...(patch.bufferMinutes !== undefined ? { bufferMinutes: patch.bufferMinutes } : {}),
  });

export const getCredentials = (): Promise<VerificationProgress> =>
  api.get<VerificationProgress>('/me/doctor/credentials');

export type UploadTicket = {
  storageKey: string;
  upload: { url: string; expiresInSeconds: number };
};

/** Step 1 of 3. The key is minted for THIS doctor; another's is refused. */
export const requestCredentialUpload = (input: {
  documentType: DoctorDocumentType;
  fileName: string;
  contentType: CredentialContentType;
}): Promise<UploadTicket> =>
  api.post<UploadTicket>('/me/doctor/credentials/upload-url', {
    documentType: input.documentType,
    fileName: input.fileName,
    contentType: input.contentType,
  });

/** Step 3 of 3. Writes the row, which is what makes the file exist to the app. */
export const confirmCredentialUpload = (input: {
  documentType: DoctorDocumentType;
  fileName: string;
  storageKey: string;
}): Promise<CredentialSummary> =>
  api.post<CredentialSummary>('/me/doctor/credentials', {
    documentType: input.documentType,
    fileName: input.fileName,
    storageKey: input.storageKey,
  });

export type { LocalFile };

/**
 * All three steps, because two of them alone are a bug.
 *
 * *** THE CONFIRM MUST NOT RUN IF THE PUT FAILED. *** The row is written last
 * on purpose: an object with no row is an orphan the retention sweep collects,
 * while a row with no object is a credential an admin opens to find nothing —
 * and approves or rejects a doctor on the strength of it. So a failed upload
 * throws here and never reaches step 3.
 */
export const uploadCredential = async (
  input: {
    documentType: DoctorDocumentType;
    fileName: string;
    contentType: CredentialContentType;
  },
  body: Blob | ArrayBuffer | Uint8Array | LocalFile,
): Promise<CredentialSummary> => {
  const ticket = await requestCredentialUpload(input);
  const status = await putToSignedUrl(ticket.upload.url, input.contentType, body);

  if (status < 200 || status >= 300) {
    throw clientError(
      ClientCode.MALFORMED_RESPONSE,
      status === 403
        ? 'That upload link has expired. Please choose the file again.'
        : 'We could not upload that file. Please try again.',
      status,
    );
  }

  return confirmCredentialUpload({
    documentType: input.documentType,
    fileName: input.fileName,
    storageKey: ticket.storageKey,
  });
};

/** A short-lived link to re-open a credential already uploaded. */
export const credentialDownloadUrl = (
  documentId: string,
): Promise<{ url: string; expiresInSeconds: number }> =>
  api.get<{ url: string; expiresInSeconds: number }>(
    `/doctor-credentials/${documentId}/download-url`,
  );

/* ------------------------------ registration ------------------------------ */

export type RegistrationIdType = 'aadhaar' | 'passport' | 'driving_licence' | 'voter_id' | 'other';

export type RegistrationView = {
  fullName: string;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | 'undisclosed' | null;
  email: string | null;
  /** Medical council / professional registration number, as the doctor stated it. */
  registrationNumber: string | null;
  /** The number itself is never returned — only enough to recognise it. */
  identity: { idType: string; idTypeName: string | null; numberLast4: string; abhaId: string | null } | null;
  /** One flat qualifications record for the doctor, not a per-degree list. */
  qualifications: {
    basicQualification: string;
    pgSpecialisation: string | null;
    superSpecialisation: string | null;
    fellowship: string | null;
    degreeCertificateId: string | null;
    registrationCertificateId: string | null;
  } | null;
  experience: {
    id: string;
    designation: string;
    institution: string;
    years: number;
    documentId: string | null;
  }[];
  signatureDocumentId: string | null;
  /** The specialty chosen from the catalogue (or set by an admin). Null until one is. */
  specialtyId: string | null;
  /** Derived server-side from the years stated on each role, summed. */
  totalExperienceYears: number;
  /** False once an admin has verified the account. */
  editable: boolean;
};

export type SaveRegistration = {
  fullName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'undisclosed';
  email?: string;
  registrationNumber?: string;
  identity?: { idType: RegistrationIdType; idTypeName?: string; idNumber: string; abhaId?: string };
  qualifications?: {
    basicQualification: string;
    pgSpecialisation?: string;
    superSpecialisation?: string;
    fellowship?: string;
    degreeCertificateId?: string;
    registrationCertificateId?: string;
  };
  experience?: {
    designation: string;
    institution: string;
    years: number;
    documentId?: string;
  }[];
  signatureDocumentId?: string;
  /** From `listServices()` — the active catalogue. The server refuses any other id. */
  specialtyId?: string;
};

export const getRegistration = (): Promise<RegistrationView> =>
  api.get<RegistrationView>('/me/doctor/registration');

/** One active service in the catalogue (`GET /services`) — a specialty, as patients see it. */
export type ServiceListing = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  consultationFeeInr: number;
  providerType: string;
  canPrescribe: boolean;
};

/** What names the profile's `specialtyId`. Active services only. */
export const listServices = (): Promise<ServiceListing[]> => api.get<ServiceListing[]>('/services');

/**
 * *** A REPLACE, NOT A PATCH. *** The lists sent here become the whole of
 * what is on file: a resubmission is a new statement of the same facts, and
 * merging row by row would leave a corrected degree beside the one an admin
 * rejected. Omit a list entirely to leave it untouched.
 *
 * `yearsOfExperience` is derived server-side from the dated rows and is not a
 * field the app can set. `registrationNumber` is absent on purpose: a provider
 * stating their own medical council number is the one claim verification
 * exists to check.
 *
 * Refused with `REGISTRATION_LOCKED` once the account is verified.
 */
export const saveRegistration = (input: SaveRegistration): Promise<RegistrationView> =>
  api.put<RegistrationView>('/me/doctor/registration', input);
