import { doctorLegalApi, doctorProfileApi } from '@coracure/api';
import type {
  ApiLanguage,
  CredentialSummary,
  DoctorDocumentType,
  CredentialContentType,
  VerificationProgress,
} from '@coracure/api';
import { ApiError } from '@coracure/api/errors';

import {
  API_GENDER,
  API_ID_TYPE,
  API_LANGUAGE,
  STEPS,
  UNMAPPED_FIELDS,
  isStepComplete,
  toApiDate,
  type RegistrationDraft,
  type UploadedFile,
} from './registration';

/**
 * Sending the registration form to the backend.
 *
 * Three phases, in this order and no other:
 *
 *   1. upload every document, one at a time
 *   2. `PUT /me/doctor/registration` with the details AND the document ids
 *   3. read `GET /me/doctor/credentials` back for where the account now stands
 *
 * *** THE DOCUMENTS GO FIRST BECAUSE THE DETAILS REFERENCE THEM. *** A
 * qualification row carries the id of the certificate that proves it, so an
 * admin opening "MD Psychiatry, KEM Hospital, 2016" gets the PDF for THAT
 * degree rather than a pile of files to match up by hand. The ids only exist
 * once the uploads have been confirmed.
 *
 * `skipped` reports what still has no home. It is empty now: every field the
 * form collects, including the medical council registration number the doctor
 * states and an administrator verifies, has a place in the request.
 */

/** Which `documentType` each part of the form maps onto. */
const PHOTO: DoctorDocumentType = 'profile_photo';
const IDENTITY: DoctorDocumentType = 'identity_proof';
const DEGREE: DoctorDocumentType = 'degree_certificate';
const REGISTRATION: DoctorDocumentType = 'registration_certificate';
const EXPERIENCE: DoctorDocumentType = 'experience_letter';
const SIGNATURE: DoctorDocumentType = 'signature';

export type Attachment = {
  documentType: DoctorDocumentType;
  file: NonNullable<UploadedFile>;
  /** Where it came from, for an error the doctor can act on. */
  label: string;
};

export type SkippedField = { field: string; reason: 'admin' | 'none' };

export type SubmissionOutcome = {
  uploaded: CredentialSummary[];
  /** Fields the backend has no home for. Never silently dropped. */
  skipped: SkippedField[];
  /** The server's own view of the account after the upload. */
  progress: VerificationProgress;
  /** The draft as sent, every file now carrying its `documentId`. */
  draft: RegistrationDraft;
};

/**
 * Every file that still has to go up, in the order an admin would want to
 * read them. A file already on the server (`documentId`) is referenced, not
 * re-sent: a resubmit uploads only what the doctor re-picked.
 */
export const attachmentsOf = (draft: RegistrationDraft): Attachment[] => {
  const out: Attachment[] = [];
  const add = (documentType: DoctorDocumentType, file: UploadedFile, label: string) => {
    if (file && !file.documentId) out.push({ documentType, file, label });
  };
  add(PHOTO, draft.basic.photo, 'your photo');
  add(IDENTITY, draft.identity.document, 'your ID document');
  add(DEGREE, draft.qualifications.degreeCertificate, 'your degree certificate');
  add(REGISTRATION, draft.qualifications.registrationCertificate, 'your registration certificate');
  draft.experience.forEach((x) => add(EXPERIENCE, x.certificate, `the experience certificate for ${x.designation}`));
  add(SIGNATURE, draft.signature, 'your signature');
  return out;
};

/** The fields this submit cannot send, as data rather than a comment. */
export const skippedFields = (): SkippedField[] =>
  Object.entries(UNMAPPED_FIELDS).map(([field, reason]) => ({ field, reason: reason as 'admin' | 'none' }));

export const submitRegistration = async (
  draft: RegistrationDraft,
  onProgress?: (done: number, total: number) => void,
): Promise<SubmissionOutcome> => {
  // Every check the form makes, BEFORE the first upload: a value the backend
  // refuses after the files went up leaves an admin holding documents with no
  // registration behind them.
  const incomplete = STEPS.filter((st) => !isStepComplete(draft, st.key));
  if (incomplete.length) throw new Error(`Complete ${incomplete.map((x) => x.label).join(', ')} before submitting.`);
  if (!draft.confirmed) throw new Error('Confirm the declaration to submit.');

  // The declaration is recorded as consent to the doctor agreement — the
  // tick alone was never stored anywhere. Nothing published yet means nothing
  // to accept, which must not block the submission.
  await doctorLegalApi.acceptConsent('doctor_agreement').catch((e) => {
    if (ApiError.of(e)?.code !== 'DOCUMENT_NOT_PUBLISHED') throw e;
  });

  const attachments = attachmentsOf(draft);
  const uploaded: CredentialSummary[] = [];
  /**
   * Which stored document proves which row, keyed by the file OBJECT — two
   * certificates both called `scan.pdf` are still two files.
   */
  const documentIds = new Map<NonNullable<UploadedFile>, string>();

  for (const [index, attachment] of attachments.entries()) {
    const { uri, contentType, name } = attachment.file;
    if (!uri || !contentType) {
      // An authored fixture, or a file picked before the picker carried bytes.
      // Refusing beats confirming an upload that never happened.
      throw new Error(`Choose ${attachment.label} again — the file could not be read.`);
    }
    // The URI, not the bytes: `libs/api` streams the file off the device.
    // Reading it here first is what used to fail — OkHttp refuses `file://`,
    // and React Native calls that "Network request failed".
    const saved = await doctorProfileApi.uploadCredential(
      {
        documentType: attachment.documentType,
        fileName: name,
        contentType: contentType as CredentialContentType,
      },
      { uri },
    );
    uploaded.push(saved);
    documentIds.set(attachment.file, saved.id);
    onProgress?.(index + 1, attachments.length);
  }

  // `languages` lives on the profile endpoint, not the registration one: it is
  // a MATCHING input the assignment engine reads, not a verification claim. An
  // empty list would make the doctor unassignable, so it is only sent when at
  // least one label maps.
  const languages = draft.basic.languages
    .map((label) => API_LANGUAGE[label])
    .filter((code): code is ApiLanguage => Boolean(code));
  if (languages.length) await doctorProfileApi.updateProfile({ languages });

  const q = draft.qualifications;
  /** The stored document behind a file: already on file, or uploaded above. */
  const idFor = (file: UploadedFile) => (file ? (file.documentId ?? documentIds.get(file)) : undefined);
  /** `{ [key]: id }` for a file the server holds, otherwise nothing. */
  const idOf = <K extends string>(key: K, file: UploadedFile) => {
    const id = idFor(file);
    return id ? ({ [key]: id } as Record<K, string>) : {};
  };
  /** The same file, now carrying its id, so the next resubmit keeps it. */
  const stamped = (file: UploadedFile): UploadedFile => (file && idFor(file) ? { ...file, documentId: idFor(file) } : file);

  // Everything an admin verifies, in one replace. The lists sent here become
  // the whole of what is on file — see `saveRegistration`.
  await doctorProfileApi.saveRegistration({
    fullName: draft.basic.fullName.trim(),
    ...(toApiDate(draft.basic.dob) ? { dateOfBirth: toApiDate(draft.basic.dob) } : {}),
    ...(API_GENDER[draft.basic.gender] ? { gender: API_GENDER[draft.basic.gender] } : {}),
    ...(draft.basic.email.trim() ? { email: draft.basic.email.trim() } : {}),
    ...(q.specialtyId ? { specialtyId: q.specialtyId } : {}),
    ...(q.registrationNumber.trim() ? { registrationNumber: q.registrationNumber.trim() } : {}),
    ...(API_ID_TYPE[draft.identity.idType]
      ? {
          identity: {
            idType: API_ID_TYPE[draft.identity.idType],
            ...(draft.identity.idTypeName ? { idTypeName: draft.identity.idTypeName } : {}),
            idNumber: draft.identity.idNumber,
            ...(draft.identity.abhaId.trim() ? { abhaId: draft.identity.abhaId.trim() } : {}),
          },
        }
      : {}),
    qualifications: {
      basicQualification: q.basicQualification.trim(),
      ...(q.pgSpecialisation.trim() ? { pgSpecialisation: q.pgSpecialisation.trim() } : {}),
      ...(q.superSpecialisation.trim() ? { superSpecialisation: q.superSpecialisation.trim() } : {}),
      ...(q.fellowship.trim() ? { fellowship: q.fellowship.trim() } : {}),
      ...idOf('degreeCertificateId', q.degreeCertificate),
      ...idOf('registrationCertificateId', q.registrationCertificate),
    },
    experience: draft.experience.map((x) => ({
      designation: x.designation.trim(),
      institution: x.institution.trim(),
      years: Number(x.years),
      ...idOf('documentId', x.certificate),
    })),
    ...idOf('signatureDocumentId', draft.signature),
  });

  // Where the account stands is the SERVER's answer, not a local guess: an
  // admin may already have approved or rejected part of this set.
  const progress = await doctorProfileApi.getCredentials();

  const saved: RegistrationDraft = {
    ...draft,
    basic: { ...draft.basic, photo: stamped(draft.basic.photo) },
    identity: { ...draft.identity, document: stamped(draft.identity.document) },
    qualifications: {
      ...q,
      degreeCertificate: stamped(q.degreeCertificate),
      registrationCertificate: stamped(q.registrationCertificate),
    },
    experience: draft.experience.map((x) => ({ ...x, certificate: stamped(x.certificate) })),
    signature: stamped(draft.signature),
    // A resubmission is a new declaration; it is never carried over ticked.
    confirmed: false,
  };

  return { uploaded, skipped: skippedFields(), progress, draft: saved };
};
