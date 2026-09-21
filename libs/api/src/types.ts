/**
 * The response and request shapes the patient app consumes.
 *
 * *** THESE ARE A STOPGAP. *** `CLAUDE.md` says to generate types from the
 * running backend rather than hand-write them:
 *
 *   npx openapi-typescript http://localhost:3000/docs-json -o libs/api/src/schema.d.ts
 *
 * That could not run during this work because it needs the backend up with
 * Postgres behind it. Every type below was read off the backend source rather
 * than guessed — the file and symbol are cited on each block — so regenerating
 * should confirm them rather than rewrite them. When `schema.d.ts` lands,
 * re-point these aliases at it and delete the literals; the compiler will then
 * report anything that actually differed.
 */

/* --------------------------------- shared --------------------------------- */

/** `prisma/schema.prisma` → enum Gender. */
export const GENDERS = ['male', 'female', 'other', 'undisclosed'] as const;
export type Gender = (typeof GENDERS)[number];

/**
 * `src/patients/dto/patient-profile.dto.ts` → LANGUAGES.
 *
 * *** ONLY TWO. *** Launch is single-language (SRS 11 defers a multilingual app
 * to Phase 3) and `@IsIn(LANGUAGES)` rejects anything else with a 400. The
 * reference design shows a third chip; sending it would fail the request, so
 * the profile screen offers exactly what the enum allows.
 */
export const LANGUAGES = ['en', 'hi'] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  hi: 'हिन्दी',
};

/** `prisma/schema.prisma` → enum AccountStatus. */
export type AccountStatus = 'pending' | 'active' | 'suspended' | 'deleted';

/** `prisma/schema.prisma` → enum ConsultationStatus. */
export const CONSULTATION_STATUSES = [
  'pending_payment',
  'scheduled',
  'awaiting_doctor',
  'in_progress',
  'awaiting_documentation',
  'completed',
  'cancelled',
  'no_show',
  'expired',
] as const;
export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number];

/** `prisma/schema.prisma` → enum ConsultationMode. */
export type ConsultationMode = 'scheduled' | 'instant';

/* ---------------------------------- auth ---------------------------------- */

/** `src/identity/patient-auth.service.ts` → requestOtp. */
export type OtpChallenge = { challengeId: string };

/** `src/identity/tokens.service.ts` → TokenPair, plus verifyOtp's own field. */
export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  /** Seconds. */
  expiresIn: number;
};

export type PatientVerifyResult = TokenPair & { isNewAccount: boolean };

/**
 * `src/identity/dto/auth.dto.ts` → VerifyOtpDto.
 *
 * *** `challengeId` IS REQUIRED. *** `docs/API_CONTRACT.md` §2 documents this
 * call as `{ mobileNumber, code }`, which is incomplete — the DTO also requires
 * the `challengeId` returned by the request call. With
 * `forbidNonWhitelisted: true` on one side and `@IsNotEmpty()` on the other,
 * omitting it is a hard 400 rather than a silent default.
 */
export type VerifyOtpBody = {
  mobileNumber: string;
  challengeId: string;
  code: string;
  pushToken?: string;
  deviceId?: string;
};

/* --------------------------------- profile -------------------------------- */

/** `src/patients/patient-profile.service.ts` → OwnProfile. */
export type PatientProfile = {
  id: string;
  fullName: string | null;
  /** `YYYY-MM-DD`. */
  dateOfBirth: string | null;
  /** DERIVED server-side from dateOfBirth on every read. Never stored, never sent. */
  age: number | null;
  gender: Gender;
  preferredLanguage: string;
  regionId: string | null;
  mobileNumber: string;
  status: AccountStatus;
  /** False while name or date of birth is still missing. Routes the app. */
  isComplete: boolean;
};

/**
 * `src/patients/dto/patient-profile.dto.ts` → UpdatePatientProfileDto.
 *
 * Every field optional, and `mobileNumber` deliberately absent — it is the
 * sign-in identifier and cannot be edited. Build this object field by field;
 * never spread form state into it (`forbidNonWhitelisted: true`).
 */
export type UpdateProfileBody = {
  fullName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  preferredLanguage?: Language;
  regionId?: string;
};

/* ---------------------------------- legal --------------------------------- */

/** `src/legal/dto/legal.dto.ts` → LEGAL_DOCUMENT_TYPES. */
export const LEGAL_DOCUMENT_TYPES = [
  'teleconsultation_consent',
  'privacy_policy',
  'terms_of_use',
  'refund_policy',
  'reconsult_policy',
  'doctor_agreement',
] as const;
export type LegalDocumentType = (typeof LEGAL_DOCUMENT_TYPES)[number];

export type LegalDocumentSummary = {
  documentType: LegalDocumentType;
  version: string;
  title: string;
  publishedAt?: string;
};

export type LegalDocument = LegalDocumentSummary & {
  /** The full legal copy, as supplied by the client. Rendered, never invented. */
  body: string;
};

/** `src/legal/legal.controller.ts` → myStatus. */
export type ConsentStatus = {
  teleconsultationConsent: boolean;
  privacyPolicy: boolean;
  termsOfUse: boolean;
};

/* -------------------------------- catalogue ------------------------------- */

/** `src/catalogue/specialties.service.ts` → ServiceListing. */
export type Service = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  /** What the patient pays, quoted before a provider is assigned. */
  consultationFeeInr: number;
  providerType: string;
  canPrescribe: boolean;
};

export type Concern = {
  id: string;
  name: string;
  specialtyId: string;
};

export type Region = {
  id: string;
  name: string;
  code?: string;
};

/* ------------------------------ consultations ----------------------------- */

/**
 * `src/booking/booking.service.ts` → ConsultationRecord.
 *
 * Dates cross the wire as ISO strings even though the service types them as
 * `Date`; Nest serialises them on the way out.
 */
export type Consultation = {
  id: string;
  referenceCode: string;
  status: ConsultationStatus;
  mode: ConsultationMode;
  specialtyId: string;
  concernId: string | null;
  doctorId: string | null;
  scheduledStartAt: string | null;
  durationMinutes: number;
  /** The slot hold's deadline. A `pending_payment` row IS the hold. */
  holdExpiresAt: string | null;
  consultationFeeInr: number | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
};

/** Statuses that still hold time — what `?upcoming=true` returns. */
export const UPCOMING_STATUSES: readonly ConsultationStatus[] = [
  'pending_payment',
  'scheduled',
  'awaiting_doctor',
  'in_progress',
  'awaiting_documentation',
];

/* ------------------------------ notifications ----------------------------- */

/** `src/notifications/notifications.service.ts` → NotificationRecord. */
export type Notification = {
  id: string;
  templateCode: string;
  /**
   * Copy comes from the backend and is never composed in the app: FR-16.2
   * forbids naming a diagnosis, and that rule is enforced where the template
   * is edited.
   */
  title: string;
  body: string;
  deepLinkData: unknown;
  consultationId: string | null;
  status: string;
  createdAt: string;
  readAt: string | null;
};

export type UnreadCount = { unread: number };
