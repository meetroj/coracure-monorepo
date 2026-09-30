import { doctorProfileApi, type RegistrationView } from '@coracure/api';

import { draftFromRegistration, nationalDigits, readSession } from './session';

const view = (over: Partial<RegistrationView> = {}): RegistrationView => ({
  fullName: 'Meet Roj',
  dateOfBirth: '1988-03-12',
  gender: 'male',
  email: 'meet@coracure.in',
  identity: { idType: 'aadhaar', idTypeName: null, numberLast4: '1156' },
  qualifications: [
    {
      id: 'q-1',
      degree: 'MD Psychiatry',
      specialty: 'Psychiatry',
      institution: 'KEM Hospital',
      university: 'MUHS',
      year: 2016,
      documentId: 'doc-1',
    },
  ],
  experience: [
    {
      id: 'e-1',
      position: 'Consultant Psychiatrist',
      institution: 'Lilavati',
      startMonth: '2018-01',
      endMonth: null,
      isCurrent: true,
      documentId: 'doc-2',
    },
  ],
  totalExperienceYears: 8,
  editable: true,
  ...over,
});

/* ------------------------------- the mapping ------------------------------ */

test('the API codes come back as the labels the form shows', () => {
  const draft = draftFromRegistration(view(), '9406879532');
  expect(draft.basic.gender).toBe('Male');
  expect(draft.identity.idType).toBe('Aadhaar');
});

test('dates come back in the shape the fields hold, not ISO', () => {
  const draft = draftFromRegistration(view(), '9406879532');
  expect(draft.basic.dob).toBe('12 / 03 / 1988');
  expect(draft.experience[0].start).toBe('2018 / 01');
});

test('a current role keeps a null end date rather than an empty string', () => {
  const draft = draftFromRegistration(view(), '9406879532');
  expect(draft.experience[0].current).toBe(true);
  expect(draft.experience[0].end).toBeNull();
});

test('a past role carries its end month', () => {
  const draft = draftFromRegistration(
    view({
      experience: [
        {
          id: 'e-2',
          position: 'Senior Resident',
          institution: 'KEM',
          startMonth: '2014-07',
          endMonth: '2017-06',
          isCurrent: false,
          documentId: null,
        },
      ],
    }),
    '9406879532',
  );
  expect(draft.experience[0].end).toBe('2017 / 06');
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
  expect(draft.qualifications[0].certificate).toBeNull();
  expect(draft.experience[0].proof).toBeNull();
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
