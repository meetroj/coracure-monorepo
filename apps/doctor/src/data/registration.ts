/**
 * Doctor onboarding — the four sections completed after OTP sign-in.
 *
 * This is NOT self-registration. An administrator creates the account; the
 * doctor signs in and completes their own details and documents, which are
 * then verified. See `App.tsx` and DR-02-01.
 *
 * The governing rule is the split between what is collected and what is
 * shown: registration gathers enough to verify a doctor, while the patient
 * sees only what helps them choose one. `PATIENT_VISIBLE` below is the single
 * statement of that rule — screens read it rather than each deciding again.
 */

/* --------------------------------- options -------------------------------- */

export const GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say'] as const;

export const ID_TYPES = [
  'Aadhaar',
  'Passport',
  'Driving Licence',
  'Voter ID',
  'Other government ID',
] as const;

/** Offered for consultation. Searchable, multi-select. */
export const CONSULT_LANGUAGES = [
  'English', 'Hindi', 'Marathi', 'Kannada', 'Punjabi', 'Tamil', 'Telugu',
  'Bengali', 'Gujarati', 'Malayalam', 'Odia', 'Urdu',
] as const;

export const QUALIFICATION_OPTIONS = [
  'MBBS', 'MD Psychiatry', 'DNB Psychiatry', 'DM Addiction Psychiatry',
  'MD Psychological Medicine', 'DPM', 'MPhil Clinical Psychology',
  'MA Clinical Psychology', 'PhD Clinical Psychology',
] as const;

export const POSITION_OPTIONS = [
  'Consultant Psychiatrist', 'Senior Consultant', 'Senior Resident',
  'Junior Resident', 'Assistant Professor', 'Associate Professor',
  'Professor', 'Clinical Psychologist', 'Therapist', 'Counsellor',
] as const;

export const UPLOAD_HINT = 'PDF, JPG or PNG';

/* --------------------------------- shapes --------------------------------- */

/** An uploaded document. `null` until something is attached. */
export type UploadedFile = { name: string; kind: 'pdf' | 'image'; size: string } | null;

export type BasicDetails = {
  photo: UploadedFile;
  fullName: string;
  dob: string;
  gender: string;
  /** Carried from sign-in — verified there, never asked again. */
  mobile: string;
  email: string;
  languages: string[];
};

export type IdentityProof = {
  idType: string;
  idNumber: string;
  document: UploadedFile;
};

export type Qualification = {
  id: string;
  degree: string;
  specialty?: string;
  institution: string;
  university: string;
  year: string;
  certificate: UploadedFile;
};

export type Experience = {
  id: string;
  position: string;
  institution: string;
  /** `YYYY-MM`, so ranges sort and compare without a date library. */
  start: string;
  /** `YYYY-MM`, or null while `current` is set. */
  end: string | null;
  current: boolean;
  proof: UploadedFile;
};

export type RegistrationDraft = {
  basic: BasicDetails;
  identity: IdentityProof;
  qualifications: Qualification[];
  experience: Experience[];
  confirmed: boolean;
};

/* ------------------------------ patient rules ----------------------------- */

/**
 * What a patient may see once the doctor is approved. Everything absent from
 * this list is collected for verification only and never leaves the doctor
 * and admin side — identity documents, institutions, dates and certificates.
 */
export const PATIENT_VISIBLE = {
  name: true,
  photo: true,
  languages: true,
  /** Degree NAMES only — never institution, university, year or certificate. */
  degreeNames: true,
  /** The total only — never the institution-wise history behind it. */
  totalExperience: true,
  specialty: true,
  bio: true,
  fee: true,
  availability: true,

  dob: false,
  gender: false,
  mobile: false,
  email: false,
  governmentId: false,
  institution: false,
  university: false,
  yearOfPassing: false,
  degreeCertificate: false,
  positionHistory: false,
  employmentDates: false,
  experienceCertificate: false,
} as const;

/* ---------------------------- experience maths ---------------------------- */

/**
 * Months since year zero, from a `YYYY-MM` or `YYYY / MM` string.
 *
 * The separator is ignored deliberately: the field types its own slashes as
 * the doctor enters digits, and authored fixtures use hyphens.
 */
const monthsSinceEpoch = (ym: string) => {
  const d = ym.replace(/\D/g, '');
  // five digits is a single-digit month — 2020 / 1 counts the same as 2020 / 01
  if (d.length < 5) return NaN;
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(4, 6));
  return Number.isFinite(y) && m >= 1 && m <= 12 ? y * 12 + (m - 1) : NaN;
};

/**
 * Total professional experience in whole years, **merging overlaps**.
 *
 * Two concurrent posts — a hospital consultancy alongside a college
 * appointment — are one span of time, not two. Summing each row separately
 * would inflate the figure a patient sees, so intervals are merged first.
 *
 * `now` is injected so the result is testable and does not drift with the
 * clock; callers pass the current month.
 */
export const totalExperienceYears = (rows: Experience[], now: string): number => {
  const spans = rows
    .map((r) => [monthsSinceEpoch(r.start), monthsSinceEpoch(r.current || !r.end ? now : r.end)])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b >= a)
    .sort((x, y) => x[0] - y[0]);

  if (spans.length === 0) return 0;

  let months = 0;
  let [curStart, curEnd] = spans[0];
  for (const [s, e] of spans.slice(1)) {
    if (s <= curEnd) {
      curEnd = Math.max(curEnd, e);
    } else {
      months += curEnd - curStart;
      [curStart, curEnd] = [s, e];
    }
  }
  months += curEnd - curStart;
  return Math.floor(months / 12);
};

/* -------------------------------- progress -------------------------------- */

export type StepKey = 'basic' | 'identity' | 'qualifications' | 'experience';

export const STEPS: { key: StepKey; label: string; short: string }[] = [
  { key: 'basic', label: 'Basic Details', short: 'Basic' },
  { key: 'identity', label: 'Proof of Identity', short: 'Identity' },
  { key: 'qualifications', label: 'Professional Qualifications', short: 'Qualifications' },
  { key: 'experience', label: 'Experience Details', short: 'Experience' },
];

/** A step is complete only when every required field AND upload is present. */
export const isStepComplete = (draft: RegistrationDraft, step: StepKey): boolean => {
  const { basic, identity, qualifications, experience } = draft;
  switch (step) {
    case 'basic':
      return Boolean(
        basic.photo &&
          basic.fullName.trim() &&
          basic.dob &&
          basic.gender &&
          basic.email.trim() &&
          basic.languages.length
      );
    case 'identity':
      return Boolean(identity.idType && identity.idNumber.trim() && identity.document);
    case 'qualifications':
      return (
        qualifications.length > 0 &&
        qualifications.every((q) => q.degree && q.institution && q.university && q.year && q.certificate)
      );
    case 'experience':
      return (
        experience.length > 0 &&
        experience.every((e) => e.position && e.institution && e.start && (e.current || e.end) && e.proof)
      );
  }
};

export const emptyDraft = (mobile: string, email = ''): RegistrationDraft => ({
  basic: { photo: null, fullName: '', dob: '', gender: '', mobile, email, languages: [] },
  identity: { idType: '', idNumber: '', document: null },
  qualifications: [],
  experience: [],
  confirmed: false,
});

/** Masks all but the last four characters, for display after saving. */
export const maskId = (value: string) =>
  value.length <= 4 ? value : `${'•'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
