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
import { doctorProfileApi, type RegistrationView } from '@coracure/api';

import {
  API_GENDER,
  API_ID_TYPE,
  type RegistrationDraft,
} from './registration';

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

/** `YYYY-MM-DD` → `DD / MM / YYYY`, the shape the date field holds. */
const dobLabel = (iso: string | null): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return m ? `${m[3]} / ${m[2]} / ${m[1]}` : '';
};

/** `YYYY-MM` → `YYYY / MM`, the shape the month fields hold. */
const monthLabel = (iso: string | null): string => {
  const m = /^(\d{4})-(\d{2})$/.exec(iso ?? '');
  return m ? `${m[1]} / ${m[2]}` : '';
};

/**
 * The server's registration, as the form holds it.
 *
 * *** TWO FIELDS CANNOT COME BACK, BY DESIGN. ***
 *
 *   - `identity.idNumber` — the API returns `numberLast4` and never the number
 *     itself, so it is left empty and must be re-entered to resubmit. Showing
 *     the last four as though it were the whole number would submit a wrong one.
 *   - every file — a document comes back as an id, not as bytes. `photo`,
 *     `document`, `certificate` and `proof` stay null, so the upload path
 *     refuses rather than reporting an upload that never happened. A resubmit
 *     re-picks whatever it needs to replace.
 */
export const draftFromRegistration = (
  view: RegistrationView,
  mobile: string,
): RegistrationDraft => ({
  basic: {
    photo: null,
    fullName: view.fullName ?? '',
    dob: dobLabel(view.dateOfBirth),
    gender: view.gender ? GENDER_LABEL[view.gender] ?? '' : '',
    mobile,
    email: view.email ?? '',
    // `languages` is on the profile, not the registration; the Basic step reads
    // it from there and an empty list here is not a claim that there are none.
    languages: [],
  },
  identity: view.identity
    ? {
        idType: ID_TYPE_LABEL[view.identity.idType] ?? '',
        idTypeName: view.identity.idTypeName ?? '',
        idNumber: '',
        document: null,
      }
    : { idType: '', idTypeName: '', idNumber: '', document: null },
  qualifications: view.qualifications.map((q) => ({
    id: q.id,
    degree: q.degree,
    ...(q.specialty ? { specialty: q.specialty } : {}),
    institution: q.institution,
    university: q.university,
    year: String(q.year),
    certificate: null,
  })),
  experience: view.experience.map((x) => ({
    id: x.id,
    position: x.position,
    institution: x.institution,
    start: monthLabel(x.startMonth),
    end: x.isCurrent ? null : monthLabel(x.endMonth),
    current: x.isCurrent,
    proof: null,
  })),
  confirmed: false,
});

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
  // an empty form still works. Onboarding just opens blank.
  const view = await doctorProfileApi.getRegistration().catch(() => null);
  return {
    mobile,
    verificationStatus: profile.verificationStatus,
    ...(view ? { draft: draftFromRegistration(view, mobile) } : {}),
  };
};
