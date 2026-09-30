import { doctorProfileApi } from '@coracure/api';
import type {
  CredentialSummary,
  DoctorDocumentType,
  CredentialContentType,
  VerificationProgress,
} from '@coracure/api';

import {
  API_GENDER,
  API_ID_TYPE,
  API_LANGUAGE,
  UNMAPPED_FIELDS,
  toApiDate,
  toApiMonth,
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
 * `skipped` reports what still has no home — one field now, the medical
 * council registration number, which is the administrator's to set.
 */

/** Which `documentType` each part of the form maps onto. */
const PHOTO: DoctorDocumentType = 'profile_photo';
const IDENTITY: DoctorDocumentType = 'identity_proof';
const DEGREE: DoctorDocumentType = 'degree_certificate';
const EXPERIENCE: DoctorDocumentType = 'experience_letter';

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
};

/** Every file in the draft, in the order an admin would want to read them. */
export const attachmentsOf = (draft: RegistrationDraft): Attachment[] => {
  const out: Attachment[] = [];
  if (draft.basic.photo) out.push({ documentType: PHOTO, file: draft.basic.photo, label: 'your photo' });
  if (draft.identity.document) {
    out.push({ documentType: IDENTITY, file: draft.identity.document, label: 'your ID document' });
  }
  draft.qualifications.forEach((q) => {
    if (q.certificate) out.push({ documentType: DEGREE, file: q.certificate, label: `the ${q.degree} certificate` });
  });
  draft.experience.forEach((x) => {
    if (x.proof) out.push({ documentType: EXPERIENCE, file: x.proof, label: `proof for ${x.position}` });
  });
  return out;
};

/** The fields this submit cannot send, as data rather than a comment. */
export const skippedFields = (): SkippedField[] =>
  Object.entries(UNMAPPED_FIELDS).map(([field, reason]) => ({ field, reason: reason as 'admin' | 'none' }));

export const submitRegistration = async (
  draft: RegistrationDraft,
  onProgress?: (done: number, total: number) => void,
): Promise<SubmissionOutcome> => {
  const attachments = attachmentsOf(draft);
  const uploaded: CredentialSummary[] = [];
  /** Which stored document proves which row, keyed by the local file name. */
  const documentIds = new Map<string, string>();

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
    documentIds.set(attachment.file.name, saved.id);
    onProgress?.(index + 1, attachments.length);
  }

  // `languages` lives on the profile endpoint, not the registration one: it is
  // a MATCHING input the assignment engine reads, not a verification claim. An
  // empty list would make the doctor unassignable, so it is only sent when at
  // least one label maps.
  const languages = draft.basic.languages
    .map((label) => API_LANGUAGE[label])
    .filter((code): code is 'en' | 'hi' => Boolean(code));
  if (languages.length) await doctorProfileApi.updateProfile({ languages });

  // Everything an admin verifies, in one replace. The lists sent here become
  // the whole of what is on file — see `saveRegistration`.
  await doctorProfileApi.saveRegistration({
    fullName: draft.basic.fullName.trim(),
    ...(toApiDate(draft.basic.dob) ? { dateOfBirth: toApiDate(draft.basic.dob) } : {}),
    ...(API_GENDER[draft.basic.gender] ? { gender: API_GENDER[draft.basic.gender] } : {}),
    ...(draft.basic.email.trim() ? { email: draft.basic.email.trim() } : {}),
    ...(API_ID_TYPE[draft.identity.idType]
      ? {
          identity: {
            idType: API_ID_TYPE[draft.identity.idType],
            ...(draft.identity.idTypeName ? { idTypeName: draft.identity.idTypeName } : {}),
            idNumber: draft.identity.idNumber,
          },
        }
      : {}),
    qualifications: draft.qualifications.map((q) => ({
      degree: q.degree,
      ...(q.specialty ? { specialty: q.specialty } : {}),
      institution: q.institution,
      university: q.university,
      year: Number(q.year),
      ...(q.certificate && documentIds.has(q.certificate.name)
        ? { documentId: documentIds.get(q.certificate.name) }
        : {}),
    })),
    experience: draft.experience.map((x) => ({
      position: x.position,
      institution: x.institution,
      startMonth: toApiMonth(x.start) as string,
      ...(x.current ? { isCurrent: true } : { endMonth: toApiMonth(x.end ?? '') as string }),
      ...(x.proof && documentIds.has(x.proof.name)
        ? { documentId: documentIds.get(x.proof.name) }
        : {}),
    })),
  });

  // Where the account stands is the SERVER's answer, not a local guess: an
  // admin may already have approved or rejected part of this set.
  const progress = await doctorProfileApi.getCredentials();

  return { uploaded, skipped: skippedFields(), progress };
};
