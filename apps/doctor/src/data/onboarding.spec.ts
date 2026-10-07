import { doctorLegalApi, doctorProfileApi } from '@coracure/api';
import { ApiError } from '@coracure/api/errors';

import { attachmentsOf, skippedFields, submitRegistration } from './onboarding';
import { demoRegistration, type RegistrationDraft } from './registration';

/**
 * Submitting the registration form.
 *
 * The cases that matter are the ones that would quietly mislead: a file with no
 * bytes "uploaded", a language list the matcher cannot use, and a partial
 * failure that leaves an admin holding half a registration with no idea which
 * half.
 */

const withBytes = (file: NonNullable<RegistrationDraft['basic']['photo']>) => ({
  ...file,
  uri: `file:///tmp/${file.name}`,
  contentType: file.kind === 'pdf' ? 'application/pdf' : 'image/jpeg',
});

/** The demo draft, with every attachment carrying real bytes. */
const readyDraft = (): RegistrationDraft => {
  const d = demoRegistration('9876543210');
  return {
    ...d,
    basic: { ...d.basic, photo: withBytes(d.basic.photo!) },
    identity: { ...d.identity, document: withBytes(d.identity.document!) },
    qualifications: {
      ...d.qualifications,
      degreeCertificate: withBytes(d.qualifications.degreeCertificate!),
      registrationCertificate: withBytes(d.qualifications.registrationCertificate!),
    },
    experience: d.experience.map((x) => ({ ...x, certificate: withBytes(x.certificate!) })),
    confirmed: true,
  };
};

let upload: jest.SpyInstance;
let updateProfile: jest.SpyInstance;
let saveRegistration: jest.SpyInstance;
let getCredentials: jest.SpyInstance;
let acceptConsent: jest.SpyInstance;

beforeEach(() => {
  upload = jest
    .spyOn(doctorProfileApi, 'uploadCredential')
    .mockImplementation(async (input: any) => ({ id: `doc-${input.documentType}`, ...input }) as any);
  updateProfile = jest.spyOn(doctorProfileApi, 'updateProfile').mockResolvedValue({} as any);
  saveRegistration = jest.spyOn(doctorProfileApi, 'saveRegistration').mockResolvedValue({} as any);
  getCredentials = jest
    .spyOn(doctorProfileApi, 'getCredentials')
    .mockResolvedValue({ status: 'under_review', outstanding: [], documents: [] } as any);
  acceptConsent = jest.spyOn(doctorLegalApi, 'acceptConsent').mockResolvedValue({});

  // No file read happens here any more: the URI goes to `libs/api`, which
  // streams the file natively. Nothing to stub.

});

/* ------------------------------ what is sent ------------------------------ */

test('maps each part of the form onto the document type the backend expects', () => {
  const types = attachmentsOf(readyDraft()).map((a) => a.documentType);

  expect(types).toEqual([
    'profile_photo',
    'identity_proof',
    // exactly two for the whole qualifications section, never one per degree
    'degree_certificate',
    'registration_certificate',
    'experience_letter',
  ]);
});

test('the prescription signature goes up last, and only when there is one', () => {
  const draft = readyDraft();
  expect(attachmentsOf(draft).map((a) => a.documentType)).not.toContain('signature');

  draft.signature = { name: 'sig.png', kind: 'image', size: '40 KB', uri: 'file:///tmp/sig.png', contentType: 'image/png' };
  expect(attachmentsOf(draft).map((a) => a.documentType).slice(-1)).toEqual(['signature']);
});

test('uploads one at a time, so a failure names the file that failed', async () => {
  const order: string[] = [];
  upload.mockImplementation(async (input: any) => {
    order.push(input.documentType);
    return { id: 'doc-1' } as any;
  });

  await submitRegistration(readyDraft());

  // Five sequential uploads, not five in flight: the first flips the account to
  // `under_review`, and racing that leaves a half-visible registration.
  expect(order).toEqual([
    'profile_photo',
    'identity_proof',
    'degree_certificate',
    'registration_certificate',
    'experience_letter',
  ]);
});

test('sends the languages as the two codes the API accepts', async () => {
  await submitRegistration(readyDraft());

  expect(updateProfile).toHaveBeenCalledWith({ languages: ['en', 'hi'] });
});

test('never sends a language the assignment engine cannot route on', async () => {
  const draft = readyDraft();
  draft.basic.languages = ['English', 'French'];

  await submitRegistration(draft);

  // 'French' has no code. Sending it would be a 400 on the whole request and,
  // worse, would promise a patient a language nobody can be matched on.
  expect(updateProfile).toHaveBeenCalledWith({ languages: ['en'] });
});

test('does not call the profile endpoint at all when no language maps', async () => {
  const draft = readyDraft();
  draft.basic.languages = ['French'];

  await submitRegistration(draft);

  // An empty list would make the doctor unassignable — worse than leaving what
  // is already on the account.
  expect(updateProfile).not.toHaveBeenCalled();
});

test('reads the verification state back from the server rather than assuming it', async () => {
  getCredentials.mockResolvedValue({ status: 'under_review', outstanding: ['registration_certificate'] } as any);

  const outcome = await submitRegistration(readyDraft());

  expect(outcome.progress.status).toBe('under_review');
  expect(outcome.progress.outstanding).toEqual(['registration_certificate']);
});

/* ------------------------------ what is not ------------------------------- */

test('reports what still has no home, and nothing that now does', () => {
  const skipped = skippedFields();

  // The date of birth, gender, email, registration number, government ID, ABHA,
  // the qualifications and every post have a field in
  // `PUT /me/doctor/registration`. Only specialty and fee stay the
  // administrator's, and the form never asks for those.
  expect(skipped).toEqual([]);
});

test('sends the registration number the doctor stated, trimmed', async () => {
  const draft = readyDraft();
  draft.qualifications.registrationNumber = '  KMC-4471 ';
  await submitRegistration(draft);
  expect(saveRegistration.mock.calls[0][0].registrationNumber).toBe('KMC-4471');
});

test('refuses to submit without a registration number, and sends nothing', async () => {
  const blank = readyDraft();
  blank.qualifications.registrationNumber = '   ';
  await expect(submitRegistration(blank)).rejects.toThrow(/Professional Qualifications/);
  expect(upload).not.toHaveBeenCalled();
  expect(saveRegistration).not.toHaveBeenCalled();
});

test('refuses a file with no bytes instead of reporting it as uploaded', async () => {
  const draft = readyDraft();
  // An authored fixture, or anything that reached the draft without a URI.
  draft.identity.document = { name: 'aadhaar.pdf', kind: 'pdf', size: '640 KB' };

  await expect(submitRegistration(draft)).rejects.toThrow(/ID document/i);

  // It stopped at the bad file — the photo before it went, the rest did not.
  expect(upload).toHaveBeenCalledTimes(1);
  expect(getCredentials).not.toHaveBeenCalled();
});

test('stops at the first upload that fails, and does not save the profile after it', async () => {
  upload
    .mockResolvedValueOnce({ id: 'doc-1' } as any)
    .mockRejectedValueOnce(new Error('That upload link has expired.'));

  await expect(submitRegistration(readyDraft())).rejects.toThrow(/expired/i);

  expect(upload).toHaveBeenCalledTimes(2);
  expect(updateProfile).not.toHaveBeenCalled();
  expect(saveRegistration).not.toHaveBeenCalled();
});

test('sends the details an admin verifies, in the codes the API takes', async () => {
  await submitRegistration(readyDraft());

  expect(saveRegistration).toHaveBeenCalledWith(
    expect.objectContaining({
      fullName: 'Arjun Mehta',
      // the form types "12 / 03 / 1988"; the API takes a calendar date
      dateOfBirth: '1988-03-12',
      gender: 'male',
      email: 'arjun.mehta@coracure.in',
      identity: expect.objectContaining({ idType: 'aadhaar', idNumber: '4421 8830 1156' }),
    }),
  );
});

test('sends the four qualification fields once, linked to the two certificates', async () => {
  upload.mockImplementation(async (input: any) => ({ id: `doc-for-${input.fileName}` }) as any);

  await submitRegistration(readyDraft());

  const sent = saveRegistration.mock.calls[0][0];
  expect(sent.qualifications).toEqual({
    basicQualification: 'MBBS',
    pgSpecialisation: 'MD Psychiatry',
    degreeCertificateId: 'doc-for-mbbs-degree.pdf',
    registrationCertificateId: 'doc-for-medical-council-registration.pdf',
  });
  // an optional field left blank is not sent as an empty string
  expect(sent.qualifications).not.toHaveProperty('superSpecialisation');
  expect(sent.experience[0]).toEqual({
    designation: 'Consultant Psychiatrist',
    institution: 'Lilavati Hospital',
    years: 8,
    documentId: 'doc-for-appointment-letter.pdf',
  });
});

test('sends the specialty the doctor chose, as its catalogue id', async () => {
  const draft = readyDraft();
  draft.qualifications.specialtyId = '11111111-1111-4111-8111-111111111111';

  await submitRegistration(draft);

  // top level, beside the registration number — not inside `qualifications`, which the server reads as free text
  expect(saveRegistration.mock.calls[0][0].specialtyId).toBe('11111111-1111-4111-8111-111111111111');
  expect(saveRegistration.mock.calls[0][0].qualifications).not.toHaveProperty('specialtyId');
});

test('a registration with no specialty chosen is not submitted at all', async () => {
  const draft = readyDraft();
  draft.qualifications.specialtyId = '';

  await expect(submitRegistration(draft)).rejects.toThrow(/Professional Qualifications/);

  // nothing uploaded, nothing saved: the doctor is sent back to pick one, not left half-registered
  expect(upload).not.toHaveBeenCalled();
  expect(saveRegistration).not.toHaveBeenCalled();
});

test('ABHA is optional: sent when given, absent when not', async () => {
  await submitRegistration(readyDraft());
  expect(saveRegistration.mock.calls[0][0].identity).not.toHaveProperty('abhaId');

  const draft = readyDraft();
  draft.identity.abhaId = ' name@abdm ';
  await submitRegistration(draft);
  expect(saveRegistration.mock.calls[1][0].identity).toMatchObject({ abhaId: 'name@abdm' });
});

test('saves the registration only after every document is stored', async () => {
  const order: string[] = [];
  upload.mockImplementation(async () => {
    order.push('upload');
    return { id: 'doc-1' } as any;
  });
  saveRegistration.mockImplementation(async () => {
    order.push('save');
    return {} as any;
  });

  await submitRegistration(readyDraft());

  // The rows reference document ids, and those only exist once the uploads are
  // confirmed.
  expect(order).toEqual(['upload', 'upload', 'upload', 'upload', 'upload', 'save']);
});

test('reports progress so the button can say 3 of 5', async () => {
  const seen: string[] = [];

  await submitRegistration(readyDraft(), (done, total) => seen.push(`${done}/${total}`));

  expect(seen).toEqual(['1/5', '2/5', '3/5', '4/5', '5/5']);
});

/* ------------------------------ resubmitting ------------------------------ */

test('a file already on the server is referenced, never uploaded again', async () => {
  const draft = readyDraft();
  draft.qualifications.degreeCertificate = { name: 'mbbs.pdf', kind: 'pdf', size: 'On file', documentId: 'doc-kept' };

  const outcome = await submitRegistration(draft);

  // Four uploads, not five: only what the doctor re-picked goes up.
  expect(upload.mock.calls.map((c) => c[0].documentType)).not.toContain('degree_certificate');
  expect(saveRegistration.mock.calls[0][0].qualifications.degreeCertificateId).toBe('doc-kept');
  // ...and what did go up comes back with its id, so the next resubmit keeps it too.
  expect(outcome.draft.basic.photo?.documentId).toBe('doc-profile_photo');
  expect(attachmentsOf(outcome.draft)).toEqual([]);
});

test('two certificates with the same file name keep their own ids', async () => {
  const draft = readyDraft();
  const scan = (uri: string) => ({ name: 'scan.pdf', kind: 'pdf' as const, size: '1 MB', uri, contentType: 'application/pdf' });
  draft.experience = [
    { id: 'e1', designation: 'Registrar', institution: 'KEM', years: '2', certificate: scan('file:///a') },
    { id: 'e2', designation: 'Consultant', institution: 'Lilavati', years: '6', certificate: scan('file:///b') },
  ];
  let n = 0;
  upload.mockImplementation(async () => ({ id: `doc-${(n += 1)}` }) as any);

  await submitRegistration(draft);

  const ids = saveRegistration.mock.calls[0][0].experience.map((x: { documentId: string }) => x.documentId);
  expect(ids[0]).not.toBe(ids[1]);
});

/* ------------------------------ before upload ----------------------------- */

test('a years value the backend would refuse stops the submit before any upload', async () => {
  const draft = readyDraft();
  draft.experience[0]!.years = '2.25';

  await expect(submitRegistration(draft)).rejects.toThrow(/Experience Details/);
  expect(upload).not.toHaveBeenCalled();
  expect(acceptConsent).not.toHaveBeenCalled();
});

test('records the declaration as consent to the doctor agreement', async () => {
  await submitRegistration(readyDraft());
  expect(acceptConsent).toHaveBeenCalledWith('doctor_agreement');

  const unticked = { ...readyDraft(), confirmed: false };
  await expect(submitRegistration(unticked)).rejects.toThrow(/declaration/);
});

test('an agreement not yet published does not block the submission; any other failure does', async () => {
  acceptConsent.mockRejectedValueOnce(new ApiError({ statusCode: 404, code: 'DOCUMENT_NOT_PUBLISHED', message: 'x' }));
  await expect(submitRegistration(readyDraft())).resolves.toBeTruthy();

  acceptConsent.mockRejectedValueOnce(new ApiError({ statusCode: 503, code: 'INTERNAL_ERROR', message: 'x' }));
  await expect(submitRegistration(readyDraft())).rejects.toBeTruthy();
});
