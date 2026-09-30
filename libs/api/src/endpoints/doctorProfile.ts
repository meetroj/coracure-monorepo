import { api } from '../http';
import { ClientCode, clientError } from '../errors';
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

/** `doctors.languages`. The column is free-form JSON; the DTO is not. */
export const API_LANGUAGES = ['en', 'hi'] as const;
export type ApiLanguage = (typeof API_LANGUAGES)[number];

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

/** A file still on the device, identified by the URI a picker returned. */
export type LocalFile = { uri: string };

const isLocalFile = (body: unknown): body is LocalFile =>
  typeof (body as LocalFile | null)?.uri === 'string';

const putBytes = async (
  url: string,
  contentType: string,
  body: Blob | ArrayBuffer | Uint8Array,
): Promise<number> => {
  const response = await fetch(url, {
    method: 'PUT',
    // The store signed the URL for this exact type; sending another is a 403
    // from the store, long after the app thought it had picked a valid file.
    headers: { 'Content-Type': contentType },
    body: body as BodyInit,
  });
  return response.status;
};

/**
 * Streams a file straight off the device into the signed URL.
 *
 * *** NEITHER `fetch` NOR `XMLHttpRequest` CAN READ A `file://` URI HERE. ***
 * Both hand the URL to OkHttp, which parses http and https and refuses
 * anything else outright:
 *
 *     IllegalArgumentException: Expected URL scheme 'http' or 'https' but was 'file'
 *         at NetworkingModule.sendRequestInternalReal(NetworkingModule.kt:318)
 *
 * React Native reports that as "Network request failed", which sends everyone
 * looking at the network while the server is up and the real fault is a local
 * read. Setting `responseType = 'blob'` is supposed to hand the request to
 * `BlobModule`'s URI handler instead — it does not under the New Architecture
 * (`newArchEnabled=true`), where the handler never claims the request and it
 * falls through to OkHttp anyway.
 *
 * `react-native-blob-util` reads the path natively and streams it, so no URL
 * parser ever sees `file://`. The same call uploads to real S3 unchanged.
 *
 * `wrap()` wants a plain path, not a URI, so the scheme is stripped.
 */
const putLocalFile = async (
  url: string,
  contentType: string,
  uri: string,
): Promise<number> => {
   
  const blobUtil = require('react-native-blob-util').default as {
    fetch: (
      method: string,
      url: string,
      headers: Record<string, string>,
      body: unknown,
    ) => Promise<{ info: () => { status: number } }>;
    wrap: (path: string) => unknown;
  };
  const response = await blobUtil.fetch(
    'PUT',
    url,
    { 'Content-Type': contentType },
    blobUtil.wrap(decodeURI(uri.replace(/^file:\/\//, ''))),
  );
  return response.info().status;
};

/**
 * All three steps, because two of them alone are a bug.
 *
 * *** THE CONFIRM MUST NOT RUN IF THE PUT FAILED. *** The row is written last
 * on purpose: an object with no row is an orphan the retention sweep collects,
 * while a row with no object is a credential an admin opens to find nothing —
 * and approves or rejects a doctor on the strength of it. So a failed upload
 * throws here and never reaches step 3.
 *
 * The PUT goes out with NO Authorization header: it is addressed to the object
 * store, not to Coracure, and the permission is already signed into the URL.
 * Sending a bearer to a third-party host leaks it.
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

  let status: number;
  try {
    status = isLocalFile(body)
      ? await putLocalFile(ticket.upload.url, input.contentType, body.uri)
      : await putBytes(ticket.upload.url, input.contentType, body);
  } catch {
    throw clientError(
      ClientCode.NETWORK_UNAVAILABLE,
      'We could not upload that file. Check your connection and try again.',
    );
  }

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
  /** The number itself is never returned — only enough to recognise it. */
  identity: { idType: string; idTypeName: string | null; numberLast4: string } | null;
  qualifications: {
    id: string;
    degree: string;
    specialty: string | null;
    institution: string;
    university: string;
    year: number;
    documentId: string | null;
  }[];
  experience: {
    id: string;
    position: string;
    institution: string;
    startMonth: string;
    endMonth: string | null;
    isCurrent: boolean;
    documentId: string | null;
  }[];
  /** Derived server-side from the dated rows, overlaps merged. */
  totalExperienceYears: number;
  /** False once an admin has verified the account. */
  editable: boolean;
};

export type SaveRegistration = {
  fullName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'undisclosed';
  email?: string;
  identity?: { idType: RegistrationIdType; idTypeName?: string; idNumber: string };
  qualifications?: {
    degree: string;
    specialty?: string;
    institution: string;
    university: string;
    year: number;
    documentId?: string;
  }[];
  experience?: {
    position: string;
    institution: string;
    startMonth: string;
    endMonth?: string;
    isCurrent?: boolean;
    documentId?: string;
  }[];
};

export const getRegistration = (): Promise<RegistrationView> =>
  api.get<RegistrationView>('/me/doctor/registration');

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
