import { doctorProfileApi } from '@coracure/api';
import type { CredentialSummary, DoctorDocumentType, VerificationProgress } from '@coracure/api';

import type { VerificationItem } from './doctor';
import { useResource } from './useResource';
import { OTHER_ID, maskId, type RegistrationDraft } from './registration';

/**
 * What the verification team is actually looking at.
 *
 * *** THE STATE OF EACH ROW IS THE SERVER'S ANSWER, NOT THIS DEVICE'S. ***
 * Before this, the screen built its rows from the local draft and invented the
 * rejection reasons — every rejected account was shown the same two fixtures,
 * "Name mismatch" and "Document unclear", whatever an admin had actually
 * written. A doctor could be told to fix something nobody had asked about
 * while the real reason sat unread in `doctor_documents.rejection_reason`.
 *
 * So the split is: the DESCRIPTION comes from the draft (the doctor's own name,
 * their degrees — a label, not a claim), and the STATE and the REASON come from
 * `GET /me/doctor/credentials`.
 */

/** Which document type stands behind each section of the form. */
const SECTION_DOCUMENT: Record<string, DoctorDocumentType> = {
  basic: 'profile_photo',
  identity: 'identity_proof',
  qualifications: 'degree_certificate',
  experience: 'experience_letter',
};

const stateOf = (
  docs: CredentialSummary[],
  type: DoctorDocumentType,
): { state: VerificationItem['state']; issueLabel?: string } => {
  const forType = docs.filter((d) => d.documentType === type);
  if (!forType.length) return { state: 'underReview' };

  // A rejection wins over anything else in the same section: it is the one
  // thing the doctor has to act on, and burying it under an approved sibling
  // is how a resubmission goes out still missing the fix.
  const rejected = forType.find((d) => d.reviewStatus === 'rejected');
  if (rejected) {
    return {
      state: 'issue',
      // The admin's own words. Never a canned sentence — an invented reason
      // sends a doctor to correct something nobody objected to.
      issueLabel: rejected.rejectionReason ?? 'Needs correction',
    };
  }

  if (forType.every((d) => d.reviewStatus === 'approved')) return { state: 'verified' };
  return { state: 'underReview' };
};

/**
 * Builds the four rows from the server's view, described with the doctor's own
 * details.
 *
 * `draft` is optional: a doctor signing in on a new device has no local draft,
 * and the rows must still say what is outstanding. Without it the bodies fall
 * back to the section name rather than going blank.
 */
export const itemsFromProgress = (
  progress: VerificationProgress,
  draft?: RegistrationDraft,
): VerificationItem[] => {
  const docs = progress.documents ?? [];

  const identity = draft?.identity;
  const idName = identity
    ? identity.idType === OTHER_ID
      ? identity.idTypeName || 'Government ID'
      : identity.idType || 'Government ID'
    : 'Government ID';

  const rows: (VerificationItem & { section: keyof typeof SECTION_DOCUMENT })[] = [
    {
      key: 'basic',
      section: 'basic',
      icon: 'idCard',
      title: 'Basic details & photo',
      body:
        [draft?.basic.fullName, draft?.basic.languages.join(', ')].filter(Boolean).join(' · ') ||
        'Your name, photo and languages',
      state: 'underReview',
    },
    {
      key: 'identity',
      section: 'identity',
      icon: 'shieldCheck',
      title: 'Proof of identity',
      body: identity?.idNumber
        ? `${idName} · ${maskId(identity.idNumber.replace(/\s/g, ''))}`
        : 'Your government ID',
      state: 'underReview',
    },
    {
      key: 'qualifications',
      section: 'qualifications',
      icon: 'document',
      title: 'Qualifications',
      body: draft?.qualifications.map((q) => q.degree).join(', ') || 'Your degree certificates',
      state: 'underReview',
    },
    {
      key: 'experience',
      section: 'experience',
      icon: 'inPerson',
      title: 'Experience',
      body: draft?.experience.length
        ? `${draft.experience.length} ${draft.experience.length === 1 ? 'role' : 'roles'}`
        : 'Your employment proof',
      state: 'underReview',
    },
  ];

  const items: VerificationItem[] = rows.map(({ section, ...row }) => {
    const type = SECTION_DOCUMENT[section]!;
    const outstanding = progress.outstanding?.includes(type);
    if (outstanding) {
      return { ...row, state: 'issue', issueLabel: 'Not yet uploaded' };
    }
    return { ...row, ...stateOf(docs, type) };
  });

  /**
   * *** THE ONE THING A DOCTOR CANNOT FIX THEMSELVES. *** The medical council
   * number is the administrator's to set, and while it is missing the account
   * cannot be verified however complete the documents are. Leaving it off the
   * list would show four green rows and a stalled account with no explanation.
   */
  if (progress.registrationNumberMissing) {
    items.push({
      key: 'registration-number',
      icon: 'wallet',
      title: 'Medical registration number',
      body: 'The Coracure team adds this to your account. Contact them if it is taking longer than expected.',
      state: 'issue',
      issueLabel: 'With the Coracure team',
    });
  }

  return items;
};

/** Maps the backend status onto the three the screen knows about. */
export const screenStatus = (
  progress: VerificationProgress,
): 'pending' | 'rejected' | 'approved' => {
  if (progress.status === 'verified') return 'approved';
  if (progress.status === 'rejected') return 'rejected';
  // A document an admin rejected puts the whole submission back on the doctor,
  // even while the ACCOUNT is still `under_review`: there is something to fix.
  if ((progress.documents ?? []).some((d) => d.reviewStatus === 'rejected')) return 'rejected';
  return 'pending';
};

export const KEYS = { credentials: 'doctor:credentials' };

/** Safe to poll — it reads and issues nothing. */
export const fetchVerification = (): Promise<VerificationProgress> =>
  doctorProfileApi.getCredentials();

/**
 * The account-status screen's data, on the app's usual loading contract.
 *
 * While the request is in flight the rows read "under review" rather than
 * anything stronger: claiming a section is verified from stale local state, and
 * then flipping it to rejected a second later, is worse than saying nothing
 * yet. `status` is null until the server answers, so a caller falls back to
 * what the store remembers rather than to an invented value.
 */
export const useVerification = (draft?: RegistrationDraft) => {
  const resource = useResource(KEYS.credentials, fetchVerification);
  return {
    ...resource,
    items: itemsFromProgress(resource.data ?? EMPTY_PROGRESS, draft),
    status: resource.data ? screenStatus(resource.data) : null,
  };
};

/** Nothing known yet: every section under review, nothing flagged. */
const EMPTY_PROGRESS = {
  doctorId: '',
  status: 'under_review',
  required: [],
  approved: [],
  outstanding: [],
  rejected: [],
  registrationNumberRequired: false,
  registrationNumberMissing: false,
  readyForVerification: false,
  documents: [],
} as unknown as VerificationProgress;
