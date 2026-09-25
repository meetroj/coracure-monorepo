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

import { TODAY } from './calendar';

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
  /** The document's name, asked for only when the type is "Other government ID". */
  idTypeName?: string;
  idNumber: string;
  document: UploadedFile;
};

export const OTHER_ID = 'Other government ID';

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

/* ------------------------------- validation ------------------------------- */

/**
 * Field-level checks, as messages keyed by field. A field with no entry is
 * valid. Screens show a message only once the doctor has touched the field or
 * tried to continue, so an untouched form does not open covered in red.
 */
export type FieldErrors = Partial<Record<string, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** `DD / MM / YYYY` → a real calendar date, or null. */
export const parseDob = (dob: string) => {
  const d = dob.replace(/\D/g, '');
  if (d.length !== 8) return null;
  const day = Number(d.slice(0, 2));
  const month = Number(d.slice(2, 4));
  const year = Number(d.slice(4, 8));
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
};

const ageOn = (dob: Date, on: Date) => {
  let age = on.getFullYear() - dob.getFullYear();
  if (on.getMonth() < dob.getMonth() || (on.getMonth() === dob.getMonth() && on.getDate() < dob.getDate())) age -= 1;
  return age;
};

export const validateBasic = (b: BasicDetails, today: Date = TODAY): FieldErrors => {
  const e: FieldErrors = {};
  if (!b.photo) e.photo = 'Add a profile photo.';
  const name = b.fullName.trim();
  if (!name) e.fullName = 'Enter your full name.';
  else if (name.replace(/^dr\.?\s*/i, '').length < 3 || !/[a-z]/i.test(name)) e.fullName = 'Enter your full name as on your registration.';
  if (!b.dob) e.dob = 'Enter your date of birth.';
  else {
    const dob = parseDob(b.dob);
    if (!dob) e.dob = 'Enter a real date as DD / MM / YYYY.';
    else {
      const age = ageOn(dob, today);
      if (age < 21 || age > 90) e.dob = 'Check the year — the age must be between 21 and 90.';
    }
  }
  if (!b.gender) e.gender = 'Select a gender.';
  if (!b.email.trim()) e.email = 'Enter your email address.';
  else if (!EMAIL.test(b.email.trim())) e.email = 'Enter a valid email address, like name@example.com.';
  if (!b.languages.length) e.languages = 'Add at least one language.';
  return e;
};

/** Format rules for the common Indian government IDs. */
const ID_FORMAT: Record<string, { test: (v: string) => boolean; hint: string }> = {
  Aadhaar: { test: (v) => /^\d{12}$/.test(v.replace(/\s/g, '')), hint: 'An Aadhaar number has 12 digits.' },
  Passport: { test: (v) => /^[A-Z][0-9]{7}$/i.test(v.replace(/\s/g, '')), hint: 'A passport number is a letter followed by 7 digits.' },
  'Driving Licence': {
    test: (v) => /^[A-Z]{2}[0-9A-Z-]{11,16}$/i.test(v.replace(/\s/g, '')),
    hint: 'A driving licence number starts with the state code, e.g. MH1420110012345.',
  },
  'Voter ID': { test: (v) => /^[A-Z]{3}[0-9]{7}$/i.test(v.replace(/\s/g, '')), hint: 'A voter ID is 3 letters followed by 7 digits.' },
};

export const validateIdentity = (idp: IdentityProof): FieldErrors => {
  const e: FieldErrors = {};
  if (!idp.idType) e.idType = 'Select the type of ID.';
  if (idp.idType === OTHER_ID && !(idp.idTypeName ?? '').trim()) e.idTypeName = 'Enter the name of the ID document.';
  const num = idp.idNumber.trim();
  if (!num) e.idNumber = 'Enter the ID number.';
  else if (ID_FORMAT[idp.idType] && !ID_FORMAT[idp.idType].test(num)) e.idNumber = ID_FORMAT[idp.idType].hint;
  else if (idp.idType === OTHER_ID && !/^[A-Z0-9 -]{4,24}$/i.test(num)) e.idNumber = 'Use 4–24 letters or digits.';
  if (!idp.document) e.document = 'Upload the ID document.';
  return e;
};

export const validateQualification = (q: Qualification, today: Date = TODAY): FieldErrors => {
  const e: FieldErrors = {};
  if (!q.degree) e.degree = 'Select the qualification.';
  if (!q.institution.trim()) e.institution = 'Enter the institution.';
  if (!q.university.trim()) e.university = 'Enter the university.';
  const year = Number(q.year);
  if (!q.year) e.year = 'Enter the year of passing.';
  else if (q.year.length !== 4 || year < 1950 || year > today.getFullYear()) {
    e.year = `Enter a year between 1950 and ${today.getFullYear()}.`;
  }
  if (!q.certificate) e.certificate = 'Upload the degree certificate.';
  return e;
};

const ym = (v: string) => {
  const d = v.replace(/\D/g, '');
  if (d.length < 5) return NaN;
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(4, 6));
  return m >= 1 && m <= 12 ? y * 12 + (m - 1) : NaN;
};

export const validateExperience = (x: Experience, today: Date = TODAY): FieldErrors => {
  const e: FieldErrors = {};
  const now = today.getFullYear() * 12 + today.getMonth();
  if (!x.position) e.position = 'Select the position.';
  if (!x.institution.trim()) e.institution = 'Enter where you worked.';
  const start = ym(x.start);
  if (!x.start) e.start = 'Enter the start month.';
  else if (Number.isNaN(start) || Math.floor(start / 12) < 1950) e.start = 'Enter the month as YYYY / MM.';
  else if (start > now) e.start = 'The start month cannot be in the future.';
  if (!x.current) {
    const end = ym(x.end ?? '');
    if (!x.end) e.end = 'Enter the end month, or tick "I currently work here".';
    else if (Number.isNaN(end)) e.end = 'Enter the month as YYYY / MM.';
    else if (end > now) e.end = 'The end month cannot be in the future.';
    else if (!Number.isNaN(start) && end < start) e.end = 'The end month must be after the start month.';
  }
  if (!x.proof) e.proof = 'Upload proof of employment.';
  return e;
};

const valid = (e: FieldErrors) => Object.keys(e).length === 0;

/** A step is complete only when every required field AND upload is present and valid. */
export const isStepComplete = (draft: RegistrationDraft, step: StepKey): boolean => {
  const { basic, identity, qualifications, experience } = draft;
  switch (step) {
    case 'basic':
      return valid(validateBasic(basic));
    case 'identity':
      return valid(validateIdentity(identity));
    case 'qualifications':
      return qualifications.length > 0 && qualifications.every((q) => valid(validateQualification(q)));
    case 'experience':
      return experience.length > 0 && experience.every((x) => valid(validateExperience(x)));
  }
};

export const emptyDraft = (mobile: string, email = ''): RegistrationDraft => ({
  basic: { photo: null, fullName: '', dob: '', gender: '', mobile, email, languages: [] },
  identity: { idType: '', idTypeName: '', idNumber: '', document: null },
  qualifications: [],
  experience: [],
  confirmed: false,
});

/**
 * The demo doctor's own registration, as an administrator would hold it. Used
 * when that account is asked to correct and resubmit its details.
 */
export const demoRegistration = (mobile: string): RegistrationDraft => ({
  basic: {
    photo: { name: 'arjun-mehta-profile.jpg', kind: 'image', size: '1.1 MB' },
    fullName: 'Arjun Mehta',
    dob: '12 / 03 / 1988',
    gender: 'Male',
    mobile,
    email: 'arjun.mehta@coracure.in',
    languages: ['English', 'Hindi'],
  },
  identity: { idType: 'Aadhaar', idTypeName: '', idNumber: '4421 8830 1156', document: { name: 'aadhaar-card.pdf', kind: 'pdf', size: '640 KB' } },
  qualifications: [
    { id: 'q-demo-1', degree: 'MBBS', institution: 'Grant Medical College', university: 'Maharashtra University of Health Sciences', year: '2011', certificate: { name: 'mbbs-degree.pdf', kind: 'pdf', size: '1.2 MB' } },
    { id: 'q-demo-2', degree: 'MD Psychiatry', specialty: 'Psychiatry', institution: 'KEM Hospital', university: 'Maharashtra University of Health Sciences', year: '2016', certificate: { name: 'md-psychiatry.pdf', kind: 'pdf', size: '980 KB' } },
  ],
  experience: [
    { id: 'e-demo-1', position: 'Consultant Psychiatrist', institution: 'Lilavati Hospital', start: '2018 / 01', end: null, current: true, proof: { name: 'appointment-letter.pdf', kind: 'pdf', size: '520 KB' } },
  ],
  confirmed: false,
});

/** Masks all but the last four characters, for display after saving. */
export const maskId = (value: string) =>
  value.length <= 4 ? value : `${'•'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
