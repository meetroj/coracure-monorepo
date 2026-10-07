/**
 * Coming back to an app that is already signed in.
 *
 * Two things have to be recovered on a cold start, and they are recovered from
 * the SERVER, not from this device:
 *
 *   1. *where the doctor belongs* — `verificationStatus`, the same field
 *      sign-in routes on. An admin may have approved or suspended the account
 *      while the app was closed, so a stage cached on the phone would be a
 *      guess that is wrong exactly when it matters.
 *   2. *what they already typed* — the registration on file, so an unfinished
 *      onboarding opens filled in rather than blank.
 *
 * The tokens themselves are in the keychain and are restored by
 * `doctorAuthApi.restoreSession`, which also refreshes an expired pair.
 */
import { doctorProfileApi, type CredentialSummary, type DoctorDocumentType, type RegistrationView } from '@coracure/api';

import { useStore } from '../state/store';
import {
  API_GENDER,
  API_ID_TYPE,
  API_LANGUAGE,
  type RegistrationDraft,
  type UploadedFile,
} from './registration';
import { useResource } from './useResource';

/**
 * The newest row of each type.
 *
 * *** THE SERVER RETURNS HISTORY. *** A rejected upload stays on file after the
 * doctor replaces it, so judging a type by ANY rejected row kept an account
 * "rejected" forever after its first correction. Ties keep the first row seen:
 * the backend lists newest first.
 */
export const latestByType = (docs: CredentialSummary[]): Map<DoctorDocumentType, CredentialSummary> => {
  const latest = new Map<DoctorDocumentType, CredentialSummary>();
  docs.forEach((d) => {
    const seen = latest.get(d.documentType);
    if (!seen || d.uploadedAt > seen.uploadedAt) latest.set(d.documentType, d);
  });
  return latest;
};

/**
 * The form's labels, keyed by the code the API returns.
 *
 * Derived from the forward maps rather than written out again: a second table
 * would be one more thing to forget when an ID type is added.
 */
const flip = <T extends Record<string, string>>(map: T): Record<string, string> =>
  Object.fromEntries(Object.entries(map).map(([label, code]) => [code, label]));

const GENDER_LABEL = flip(API_GENDER);
const ID_TYPE_LABEL = flip(API_ID_TYPE);
const LANGUAGE_LABEL = flip(API_LANGUAGE);

/**
 * A file the server already holds, as the form holds it: named, marked with
 * its id, never re-uploaded. Null when there is none — or when an admin
 * rejected it, so the form asks for a replacement instead of re-sending the
 * file that was refused.
 */
const onFile = (doc: CredentialSummary | undefined): UploadedFile =>
  doc && doc.reviewStatus !== 'rejected'
    ? { name: doc.fileName, kind: /\.pdf$/i.test(doc.fileName) ? 'pdf' : 'image', size: 'On file', documentId: doc.id }
    : null;

/** `YYYY-MM-DD` → `DD / MM / YYYY`, the shape the date field holds. */
const dobLabel = (iso: string | null): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return m ? `${m[3]} / ${m[2]} / ${m[1]}` : '';
};

/**
 * The server's registration, as the form holds it.
 *
 * *** TWO FIELDS CANNOT COME BACK, BY DESIGN. ***
 *
 *   - `identity.idNumber` — the API returns `numberLast4` and never the number
 *     itself, so it is left empty and must be re-entered to resubmit. Showing
 *     the last four as though it were the whole number would submit a wrong one.
 *   - the bytes of every file — a document comes back as an id. Each file the
 *     server holds (from `documents`, the credentials list) becomes an `onFile`
 *     placeholder carrying that id, so a resubmit keeps it without uploading
 *     it again; one it does not hold, or an admin rejected, stays null and
 *     must be re-picked.
 *
 * `languages` (API codes) is on the profile, not the registration.
 */
export const draftFromRegistration = (
  view: RegistrationView,
  mobile: string,
  documents: CredentialSummary[] = [],
  languages: string[] = [],
): RegistrationDraft => {
  const latest = latestByType(documents);
  const byId = (id: string | null | undefined) => onFile(documents.find((d) => d.id === id));
  return {
    basic: {
      photo: onFile(latest.get('profile_photo')),
      fullName: view.fullName ?? '',
      dob: dobLabel(view.dateOfBirth),
      gender: view.gender ? GENDER_LABEL[view.gender] ?? '' : '',
      mobile,
      email: view.email ?? '',
      languages: languages.map((code) => LANGUAGE_LABEL[code]).filter((l): l is string => Boolean(l)),
    },
    identity: view.identity
      ? {
          idType: ID_TYPE_LABEL[view.identity.idType] ?? '',
          idTypeName: view.identity.idTypeName ?? '',
          idNumber: '',
          document: onFile(latest.get('identity_proof')),
          abhaId: view.identity.abhaId ?? '',
        }
      : { idType: '', idTypeName: '', idNumber: '', document: null, abhaId: '' },
    qualifications: {
      specialtyId: view.specialtyId ?? '',
      registrationNumber: view.registrationNumber ?? '',
      basicQualification: view.qualifications?.basicQualification ?? '',
      pgSpecialisation: view.qualifications?.pgSpecialisation ?? '',
      superSpecialisation: view.qualifications?.superSpecialisation ?? '',
      fellowship: view.qualifications?.fellowship ?? '',
      degreeCertificate: byId(view.qualifications?.degreeCertificateId),
      registrationCertificate: byId(view.qualifications?.registrationCertificateId),
    },
    experience: view.experience.map((x) => ({
      id: x.id,
      designation: x.designation,
      institution: x.institution,
      years: String(x.years),
      certificate: byId(x.documentId),
    })),
    signature: byId(view.signatureDocumentId),
    confirmed: false,
  };
};

/** The national digits the form shows, from the E.164 number the API returns. */
export const nationalDigits = (e164: string): string =>
  e164.replace(/\D/g, '').replace(/^91/, '');

export type RestoredSession = {
  mobile: string;
  verificationStatus: RegistrationStatus;
  /** The registration already on file, when onboarding is still unfinished. */
  draft?: RegistrationDraft;
};

type RegistrationStatus = Awaited<ReturnType<typeof doctorProfileApi.getProfile>>['verificationStatus'];

/**
 * Reads the signed-in doctor back off the server.
 *
 * Returns `null` for "there is no session", which is the ordinary first-run
 * case and not an error. A profile call that fails for any other reason is
 * also `null`: the app cannot show a shell it has no identity for, and sending
 * the doctor to sign in again is the only honest outcome.
 */
export const readSession = async (): Promise<RestoredSession | null> => {
  const profile = await doctorProfileApi.getProfile();
  const mobile = nationalDigits(profile.mobileNumber);

  // Nothing to prefill once an admin has verified the account: the form is
  // closed (`REGISTRATION_LOCKED`) and the doctor goes straight to the shell.
  if (profile.verificationStatus === 'verified') {
    return { mobile, verificationStatus: profile.verificationStatus };
  }

  // A missing or refused registration is not a reason to refuse the session —
  // an empty form still works. Onboarding just opens blank. Without the
  // credentials list the files simply have to be picked again.
  const [view, documents] = await Promise.all([
    doctorProfileApi.getRegistration().catch(() => null),
    doctorProfileApi.getCredentials().then((p) => p.documents ?? [], () => []),
  ]);
  return {
    mobile,
    verificationStatus: profile.verificationStatus,
    ...(view ? { draft: draftFromRegistration(view, mobile, documents, profile.languages) } : {}),
  };
};

export const REGISTRATION_KEY = 'doctor:registration';

/**
 * The registration as the form holds it, for Account Status and Resubmit.
 *
 * *** NEVER A FIXTURE. *** These screens used to fall back to the demo doctor's
 * registration ("Arjun Mehta") whenever this session had not submitted one —
 * every doctor signing in on a new device was asked to resubmit someone
 * else's details. This session's own submission wins when there is one;
 * otherwise it is the server's, and `draft` is undefined until that arrives.
 *
 * `documents` is the credentials list the caller already reads, so the files
 * on record come back as placeholders rather than blanks.
 */
export const useRegistrationDraft = (documents?: CredentialSummary[]) => {
  const submission = useStore((s) => s.submission);
  const mobile = useStore((s) => s.session.mobile);
  const languages = useStore((s) => s.selfProfile?.languages);
  const resource = useResource(REGISTRATION_KEY, doctorProfileApi.getRegistration, { enabled: !submission });
  const draft = submission ?? (resource.data ? draftFromRegistration(resource.data, mobile, documents, languages) : undefined);
  return { ...resource, draft };
};
