import { doctorProfileApi } from '@coracure/api';

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
    qualifications: d.qualifications.map((q) => ({ ...q, certificate: withBytes(q.certificate!) })),
    experience: d.experience.map((x) => ({ ...x, proof: withBytes(x.proof!) })),
  };
};

let upload: jest.SpyInstance;
let updateProfile: jest.SpyInstance;
let saveRegistration: jest.SpyInstance;
let getCredentials: jest.SpyInstance;

beforeEach(() => {
  upload = jest
    .spyOn(doctorProfileApi, 'uploadCredential')
    .mockImplementation(async (input: any) => ({ id: `doc-${input.documentType}`, ...input }) as any);
  updateProfile = jest.spyOn(doctorProfileApi, 'updateProfile').mockResolvedValue({} as any);
  saveRegistration = jest.spyOn(doctorProfileApi, 'saveRegistration').mockResolvedValue({} as any);
  getCredentials = jest
    .spyOn(doctorProfileApi, 'getCredentials')
    .mockResolvedValue({ status: 'under_review', outstanding: [], documents: [] } as any);

  // No file read happens here any more: the URI goes to `libs/api`, which
  // streams the file natively. Nothing to stub.

});

/* ------------------------------ what is sent ------------------------------ */

test('maps each part of the form onto the document type the backend expects', () => {
  const types = attachmentsOf(readyDraft()).map((a) => a.documentType);

  expect(types).toEqual([
    'profile_photo',
    'identity_proof',
    // one per qualification, in the order they were entered
    'degree_certificate',
    'degree_certificate',
    'experience_letter',
  ]);
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
    'degree_certificate',
    'experience_letter',
  ]);
});

test('sends the languages as the two codes the API accepts', async () => {
  await submitRegistration(readyDraft());

  expect(updateProfile).toHaveBeenCalledWith({ languages: ['en', 'hi'] });
});

test('never sends a language the assignment engine cannot route on', async () => {
  const draft = readyDraft();
  draft.basic.languages = ['English', 'Marathi'];

  await submitRegistration(draft);

  // 'Marathi' has no code. Sending it would be a 400 on the whole request and,
  // worse, would promise a patient a language nobody can be matched on.
  expect(updateProfile).toHaveBeenCalledWith({ languages: ['en'] });
});

test('does not call the profile endpoint at all when no language maps', async () => {
  const draft = readyDraft();
  draft.basic.languages = ['Marathi'];

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

  // The date of birth, gender, email, government ID, every qualification and
  // every post now have columns — `PUT /me/doctor/registration` writes them.
  // What is left is the one claim verification exists to check, and it is the
  // administrator's to set.
  expect(skipped).toEqual([{ field: 'basic.registrationNumber', reason: 'admin' }]);
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

test('links each qualification to the certificate that proves it', async () => {
  upload.mockImplementation(async (input: any) => ({ id: `doc-for-${input.fileName}` }) as any);

  await submitRegistration(readyDraft());

  const sent = saveRegistration.mock.calls[0][0];
  // An admin opening "MD Psychiatry, KEM Hospital, 2016" gets the PDF for THAT
  // degree, not a pile of files to match up by hand.
  expect(sent.qualifications).toEqual([
    expect.objectContaining({ degree: 'MBBS', year: 2011, documentId: 'doc-for-mbbs-degree.pdf' }),
    expect.objectContaining({ degree: 'MD Psychiatry', year: 2016, documentId: 'doc-for-md-psychiatry.pdf' }),
  ]);
  expect(sent.experience[0]).toMatchObject({
    position: 'Consultant Psychiatrist',
    startMonth: '2018-01',
    isCurrent: true,
    documentId: 'doc-for-appointment-letter.pdf',
  });
  // A post still held carries no end month — the database refuses both.
  expect(sent.experience[0]).not.toHaveProperty('endMonth');
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
