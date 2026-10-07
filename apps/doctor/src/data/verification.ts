import { useContext, useEffect } from 'react';
import { NavigationContext } from '@react-navigation/native';
import { doctorProfileApi } from '@coracure/api';
import type { CredentialSummary, DoctorDocumentType, VerificationProgress } from '@coracure/api';

import type { VerificationItem } from './doctor';
import { useResource } from './useResource';
import { OTHER_ID, maskId, type RegistrationDraft, type StepKey } from './registration';
import { latestByType, useRegistrationDraft } from './session';

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

/**
 * Which document types stand behind each section of the form. The keys are
 * the onboarding step keys, so a flagged row opens the step that fixes it.
 */
const SECTION_DOCUMENTS: Record<StepKey, DoctorDocumentType[]> = {
  basic: ['profile_photo'],
  identity: ['identity_proof'],
  qualifications: ['degree_certificate', 'registration_certificate'],
  experience: ['experience_letter'],
  signature: ['signature'],
};

/** Named in the label when it is not the section's main document. */
const SECONDARY_LABEL: Partial<Record<DoctorDocumentType, string>> = {
  registration_certificate: 'Registration certificate',
};

type RowState = { state: VerificationItem['state']; issueLabel?: string };

/** One type's state, or null when it is neither required nor on file. */
const stateOf = (progress: VerificationProgress, latest: CredentialSummary | undefined, type: DoctorDocumentType): RowState | null => {
  // "Not yet uploaded" only when nothing of the type exists. `outstanding` is
  // "not yet APPROVED", so it also lists files sitting in the review queue.
  if (!latest) return progress.outstanding?.includes(type) ? { state: 'issue', issueLabel: 'Not yet uploaded' } : null;
  if (latest.reviewStatus === 'rejected') {
    // The admin's own words. Never a canned sentence — an invented reason
    // sends a doctor to correct something nobody objected to.
    const reason = latest.rejectionReason ?? 'Needs correction';
    return { state: 'issue', issueLabel: SECONDARY_LABEL[type] ? `${SECONDARY_LABEL[type]}: ${reason}` : reason };
  }
  return { state: latest.reviewStatus === 'approved' ? 'verified' : 'underReview' };
};

/**
 * A section's state from its types. An issue wins over anything else: it is
 * the one thing the doctor has to act on, and burying it under an approved
 * sibling is how a resubmission goes out still missing the fix.
 */
const sectionState = (progress: VerificationProgress, latest: Map<DoctorDocumentType, CredentialSummary>, section: StepKey): RowState | null => {
  const states = SECTION_DOCUMENTS[section]
    .map((type) => stateOf(progress, latest.get(type), type))
    .filter((x): x is RowState => x !== null);
  if (!states.length) return null;
  return (
    states.find((x) => x.state === 'issue') ??
    (states.every((x) => x.state === 'verified') ? { state: 'verified' } : { state: 'underReview' })
  );
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
  const latest = latestByType(progress.documents ?? []);

  const identity = draft?.identity;
  const idName = identity
    ? identity.idType === OTHER_ID
      ? identity.idTypeName || 'Government ID'
      : identity.idType || 'Government ID'
    : 'Government ID';

  const rows: (VerificationItem & { section: StepKey })[] = [
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
      body: draft?.qualifications.basicQualification || 'Your degree certificates',
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
    {
      key: 'signature',
      section: 'signature',
      icon: 'document',
      title: 'Digital signature',
      body: 'Placed on the prescriptions you issue',
      state: 'underReview',
    },
  ];

  const items: VerificationItem[] = rows.flatMap(({ section, ...row }) => {
    const state = sectionState(progress, latest, section);
    // The four core sections always show; the optional signature only once
    // it is on file or the specialty requires it.
    if (!state) return section === 'signature' ? [] : [row];
    return [{ ...row, ...state }];
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
  // Only the LATEST row of a type counts — a rejection a newer upload replaced
  // is history. (`progress.rejected` does not fit: it still lists a type whose
  // replacement is waiting in the queue.)
  if ([...latestByType(progress.documents ?? []).values()].some((d) => d.reviewStatus === 'rejected')) return 'rejected';
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
export const useVerification = () => {
  const resource = useResource(KEYS.credentials, fetchVerification);
  // The rows are described with the doctor's own registration — the real
  // one, read from the server when this session has not submitted one.
  const registration = useRegistrationDraft(resource.data?.documents);
  // An admin decides while the app is open: re-read whenever the screen comes
  // back into view, so an approval shows without a restart. The context, not
  // `useFocusEffect`, because a screen rendered outside a navigator (a spec)
  // has none.
  const navigation = useContext(NavigationContext);
  const { refresh } = resource;
  useEffect(() => navigation?.addListener('focus', refresh), [navigation, refresh]);
  return {
    ...resource,
    showSkeleton: resource.showSkeleton || registration.showSkeleton,
    /** Undefined until the registration has loaded. Never a fixture. */
    draft: registration.draft,
    registrationError: registration.error,
    retryRegistration: registration.retry,
    items: itemsFromProgress(resource.data ?? EMPTY_PROGRESS, registration.draft),
    status: resource.data ? screenStatus(resource.data) : null,
    /** The admin's own words when the whole application was turned down; null otherwise. */
    rejectionReason: resource.data?.rejectionReason ?? null,
  };
};

/** Nothing known yet: every section under review, nothing flagged. */
const EMPTY_PROGRESS = {
  doctorId: '',
  status: 'under_review',
  rejectionReason: null,
  required: [],
  approved: [],
  outstanding: [],
  rejected: [],
  registrationNumberRequired: false,
  registrationNumberMissing: false,
  readyForVerification: false,
  documents: [],
} as unknown as VerificationProgress;
