import { doctorProfileApi, type RegistrationView } from '@coracure/api';

import { draftFromRegistration, nationalDigits, readSession } from './session';

const view = (over: Partial<RegistrationView> = {}): RegistrationView => ({
  fullName: 'Meet Roj',
  dateOfBirth: '1988-03-12',
  gender: 'male',
  email: 'meet@coracure.in',
  registrationNumber: 'KMC-4471',
  identity: { idType: 'aadhaar', idTypeName: null, numberLast4: '1156', abhaId: 'meet@abdm' },
  qualifications: {
    basicQualification: 'MBBS',
    pgSpecialisation: 'MD Psychiatry',
    superSpecialisation: null,
    fellowship: null,
    degreeCertificateId: 'doc-1',
    registrationCertificateId: 'doc-3',
  },
  experience: [
    {
      id: 'e-1',
      designation: 'Consultant Psychiatrist',
      institution: 'Lilavati',
      years: 8,
      documentId: 'doc-2',
    },
  ],
  signatureDocumentId: null,
  specialtyId: null,
  totalExperienceYears: 8,
  editable: true,
  ...over,
});

/* ------------------------------- the mapping ------------------------------ */

test('the API codes come back as the labels the form shows', () => {
  const draft = draftFromRegistration(view(), '9406879532');
  expect(draft.basic.gender).toBe('Male');
  expect(draft.identity.idType).toBe('Aadhaar');
  expect(draft.identity.abhaId).toBe('meet@abdm');
});

test('dates and numbers come back in the shape the fields hold', () => {
  const draft = draftFromRegistration(view(), '9406879532');
  expect(draft.basic.dob).toBe('12 / 03 / 1988');
  expect(draft.experience[0].years).toBe('8');
});

test('null optional qualifications come back blank, not "null"', () => {
  const q = draftFromRegistration(view(), '9406879532').qualifications;
  expect([q.basicQualification, q.pgSpecialisation, q.superSpecialisation, q.fellowship]).toEqual(['MBBS', 'MD Psychiatry', '', '']);
});

test('a specialty already on file — chosen earlier, or set by an admin — comes back selected; none comes back empty', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  expect(draftFromRegistration(view({ specialtyId: id }), '9406879532').qualifications.specialtyId).toBe(id);
  expect(draftFromRegistration(view(), '9406879532').qualifications.specialtyId).toBe('');
});

test('the registration number comes back into the form', () => {
  expect(draftFromRegistration(view(), '9406879532').qualifications.registrationNumber).toBe('KMC-4471');
  expect(draftFromRegistration(view({ registrationNumber: null }), '9406879532').qualifications.registrationNumber).toBe('');
});

test('a registration with no qualifications yet opens an empty section', () => {
  expect(draftFromRegistration(view({ qualifications: null }), '9406879532').qualifications.basicQualification).toBe('');
});

/**
 * The two fields the server cannot return. Both must come back EMPTY rather
 * than half-filled: `numberLast4` in the ID field would submit a wrong number,
 * and a file with no bytes would be reported as uploaded when nothing was.
 */
test('the ID number is not prefilled from the last four digits', () => {
  expect(draftFromRegistration(view(), '9406879532').identity.idNumber).toBe('');
});

test('no document comes back as an attached file', () => {
  const draft = draftFromRegistration(view(), '9406879532');
  expect(draft.basic.photo).toBeNull();
  expect(draft.identity.document).toBeNull();
  expect(draft.qualifications.degreeCertificate).toBeNull();
  expect(draft.qualifications.registrationCertificate).toBeNull();
  expect(draft.experience[0].certificate).toBeNull();
  expect(draft.signature).toBeNull();
});

const onServer = (id: string, documentType: string, reviewStatus = 'pending', uploadedAt = '2026-05-15T00:00:00.000Z') =>
  ({ id, documentType, fileName: `${id}.pdf`, reviewStatus, rejectionReason: null, verifiedByAdminId: null, verifiedAt: null, uploadedAt }) as never;

test('a file the server holds comes back marked with its id, so a resubmit keeps it', () => {
  const draft = draftFromRegistration(view(), '9406879532', [
    onServer('doc-1', 'degree_certificate'),
    onServer('doc-2', 'experience_letter', 'approved'),
    onServer('doc-3', 'registration_certificate', 'rejected'),
    onServer('photo-old', 'profile_photo', 'rejected'),
    onServer('photo-new', 'profile_photo', 'pending', '2026-05-16T00:00:00.000Z'),
  ]);

  expect(draft.qualifications.degreeCertificate).toMatchObject({ documentId: 'doc-1', name: 'doc-1.pdf' });
  expect(draft.experience[0].certificate?.documentId).toBe('doc-2');
  // the newest photo, not the one it replaced
  expect(draft.basic.photo?.documentId).toBe('photo-new');
  // a refused file is left for the doctor to replace, never re-sent as it was
  expect(draft.qualifications.registrationCertificate).toBeNull();
});

test('languages come back from the profile as the labels the form shows', () => {
  expect(draftFromRegistration(view(), '9406879532', [], ['en', 'hi', 'xx']).basic.languages).toEqual(['English', 'Hindi']);
});

test('a null date or unknown code is left blank, not rendered as "null"', () => {
  const draft = draftFromRegistration(
    view({ dateOfBirth: null, gender: null, email: null, identity: null }),
    '9406879532',
  );
  expect(draft.basic.dob).toBe('');
  expect(draft.basic.gender).toBe('');
  expect(draft.basic.email).toBe('');
  expect(draft.identity.idType).toBe('');
});

test('the E.164 number becomes the national digits the form shows', () => {
  expect(nationalDigits('+919406879532')).toBe('9406879532');
});

/* -------------------------------- the read -------------------------------- */

const profile = (verificationStatus: 'pending' | 'verified') =>
  jest.spyOn(doctorProfileApi, 'getProfile').mockResolvedValue({
    mobileNumber: '+919406879532',
    verificationStatus,
  } as never);

test('a verified doctor is not asked for a registration at all', async () => {
  profile('verified');
  const get = jest.spyOn(doctorProfileApi, 'getRegistration');

  const restored = await readSession();

  expect(restored).toEqual({ mobile: '9406879532', verificationStatus: 'verified' });
  expect(get).not.toHaveBeenCalled();
});

test('an unverified doctor gets their registration prefilled', async () => {
  profile('pending');
  jest.spyOn(doctorProfileApi, 'getRegistration').mockResolvedValue(view());

  const restored = await readSession();

  expect(restored?.draft?.basic.fullName).toBe('Meet Roj');
});

/** An empty form still works; refusing the whole session would not. */
test('a refused registration still restores the session', async () => {
  profile('pending');
  jest.spyOn(doctorProfileApi, 'getRegistration').mockRejectedValue(new Error('403'));

  const restored = await readSession();

  expect(restored?.verificationStatus).toBe('pending');
  expect(restored?.draft).toBeUndefined();
});
