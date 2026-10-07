import React from 'react';
import { confirm, confirmDiscard } from '../../../components/confirm';
import { render, fireEvent, screen, act } from '@testing-library/react-native';

import { doctorProfileApi } from '@coracure/api';

import OnboardingFlow from './OnboardingFlow';
import { uploadConfig } from '../../../components/upload';
import { demoRegistration, type RegistrationDraft } from '../../../data/registration';
import * as onboardingApi from '../../../data/onboarding';

/**
 * The system picker is a native module. Under Jest it returns whatever the
 * next case queued — the asset shape `react-native-image-picker` actually
 * hands back, so the size check, the type check and the URI all run for real.
 */
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(async () => mockPicker.next()),
  launchImageLibrary: jest.fn(async () => mockPicker.next()),
}));

const ASSETS = [
  { uri: 'file:///photos/IMG_2041.jpg', fileName: 'IMG_2041.jpg', fileSize: 1_887_436, type: 'image/jpeg' },
  { uri: 'file:///photos/IMG_2044.jpg', fileName: 'IMG_2044.jpg', fileSize: 2_202_009, type: 'image/jpeg' },
  // 6.2 MB — over the 5 MB limit the photo field sets.
  { uri: 'file:///photos/Profile_Studio.png', fileName: 'Profile_Studio.png', fileSize: 6_501_171, type: 'image/png' },
];

const mockPicker = {
  queued: [] as unknown[],
  queue(response: unknown) {
    this.queued.push(response);
  },
  next() {
    return this.queued.shift() ?? { didCancel: true };
  },
};

/** The backend's catalogue (`GET /services`) — what the specialty dropdown is filled from. */
const SERVICES = [
  { id: '11111111-1111-4111-8111-111111111111', code: 'psychiatry', name: 'Psychiatry', description: null, consultationFeeInr: 800, providerType: 'doctor', canPrescribe: true },
  { id: '22222222-2222-4222-8222-222222222222', code: 'psychology', name: 'Psychology', description: null, consultationFeeInr: 600, providerType: 'non_doctor', canPrescribe: false },
];

beforeEach(() => {
  mockPicker.queued = [];
  jest.spyOn(doctorProfileApi, 'listServices').mockResolvedValue(SERVICES);
});

const setup = (over: Partial<React.ComponentProps<typeof OnboardingFlow>> = {}) => {
  const props = { mobile: '9123456780', onSubmitted: jest.fn(), onExit: jest.fn(), ...over };
  return { props, ...render(<OnboardingFlow {...props} />) };
};

const pickSelect = (testID: string, option: string) => {
  fireEvent.press(screen.getByTestId(testID));
  fireEvent.press(screen.getAllByTestId(`${testID}-${option}`).slice(-1)[0]);
  const done = screen.queryByTestId(`${testID}-done`);
  if (done) fireEvent.press(done);
};

/** Opens the field, picks from the library, and lets the async picker settle. */
const upload = async (testID: string, index = 0) => {
  mockPicker.queue({ assets: [ASSETS[index]] });
  fireEvent.press(screen.getByTestId(testID));
  fireEvent.press(screen.getByTestId(`${testID}-pick-library`));
  await act(async () => {
    await Promise.resolve();
  });
};

const fillBasic = async () => {
  await upload('photo');
  fireEvent.changeText(screen.getByTestId('fullName'), 'Kavya Rao');
  fireEvent.changeText(screen.getByTestId('dob'), '04081990');
  fireEvent.press(screen.getByTestId('gender'));
  fireEvent.press(screen.getByTestId('gender-Female'));
  fireEvent.changeText(screen.getByTestId('email'), 'kavya.rao@example.com');
  fireEvent.press(screen.getByTestId('languages'));
  fireEvent.press(screen.getByTestId('languages-option-English'));
  fireEvent.press(screen.getByTestId('languages-done'));
};

/* ----------------------------------- basic ---------------------------------- */

test('the number signed in with is shown verified, never asked again', () => {
  setup();
  expect(screen.getByTestId('mobile')).toHaveTextContent(/\+91 91234 56780/);
});

test('Continue shows every missing field instead of sitting disabled', () => {
  setup();
  fireEvent.press(screen.getByTestId('onboarding-primary'));
  ['Add a profile photo.', 'Enter your full name.', 'Enter your date of birth.', 'Select a gender.', 'Enter your email address.'].forEach((m) =>
    expect(screen.getByText(m)).toBeTruthy()
  );
  expect(screen.getByText('Basic Details')).toBeTruthy();
});

test('a field is checked when it is left, not while it is typed', () => {
  setup();
  fireEvent.changeText(screen.getByTestId('email'), 'kavya@');
  expect(screen.queryByText(/valid email/)).toBeNull();
  fireEvent(screen.getByTestId('email'), 'blur');
  expect(screen.getByText('Enter a valid email address, like name@example.com.')).toBeTruthy();
});

test('the chosen photo shows in the avatar; Change replaces it and Remove brings the placeholder back', async () => {
  setup();
  // no photo yet: one clear way to add one
  expect(screen.queryByTestId('photo-image')).toBeNull();
  expect(screen.getByTestId('photo-add')).toHaveTextContent('Add photo');
  expect(screen.queryByTestId('photo-remove')).toBeNull();

  mockPicker.queue({ assets: [ASSETS[0]] });
  fireEvent.press(screen.getByTestId('photo-add'));
  fireEvent.press(screen.getByTestId('photo-pick-library'));
  await act(async () => {
    await Promise.resolve();
  });
  const first = screen.getByTestId('photo-image').props.source;
  expect(first).toBeTruthy();
  // with a photo: Change is the action, Remove the quieter one beside the file
  expect(screen.getByTestId('photo-change')).toHaveTextContent('Change');
  expect(screen.getByTestId('photo-remove')).toHaveTextContent('Remove');

  mockPicker.queue({ assets: [ASSETS[1]] });
  fireEvent.press(screen.getByTestId('photo-change'));
  fireEvent.press(screen.getByTestId('photo-pick-library'));
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.getByTestId('photo-image').props.source).not.toEqual(first);
  expect(screen.getByTestId('photo-status')).toHaveTextContent(/IMG_2044\.jpg/);

  fireEvent.press(screen.getByTestId('photo-remove'));
  expect(screen.queryByTestId('photo-image')).toBeNull();
  expect(screen.getByTestId('photo-add')).toBeTruthy();
});

test('the photo goes through the upload states: too large, retry, uploading, uploaded, replace, remove', async () => {
  uploadConfig.durationMs = 1000;
  jest.useFakeTimers();
  const r = setup();

  mockPicker.queue({ assets: [ASSETS[2]] }); // Profile_Studio.png, 6.2 MB
  fireEvent.press(screen.getByTestId('photo'));
  fireEvent.press(screen.getByTestId('photo-pick-library'));
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.getByTestId('photo-error')).toHaveTextContent(/under 5 MB/);

  mockPicker.queue({ assets: [ASSETS[0]] });
  fireEvent.press(screen.getByTestId('photo-retry'));
  fireEvent.press(screen.getByTestId('photo-pick-library'));
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.getByTestId('photo-cancel')).toBeTruthy();
  act(() => jest.advanceTimersByTime(1100));
  expect(screen.getByTestId('photo-status')).toHaveTextContent(/IMG_2041\.jpg/);

  mockPicker.queue({ assets: [ASSETS[1]] });
  fireEvent.press(screen.getByTestId('photo-change'));
  fireEvent.press(screen.getByTestId('photo-pick-library'));
  await act(async () => {
    await Promise.resolve();
  });
  // cancelling a replacement keeps the photo that was there
  fireEvent.press(screen.getByTestId('photo-cancel'));
  expect(screen.getByTestId('photo-status')).toHaveTextContent(/IMG_2041\.jpg/);

  fireEvent.press(screen.getByTestId('photo-remove'));
  expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Remove your photo?' }));
  expect(screen.getByTestId('photo-status')).toHaveTextContent(/JPG or PNG/);

  r.unmount();
  jest.useRealTimers();
});

/* ---------------------------------- identity -------------------------------- */

const toIdentity = async () => {
  const r = setup();
  await fillBasic();
  fireEvent.press(screen.getByTestId('onboarding-primary'));
  expect(screen.getByText('Proof of Identity')).toBeTruthy();
  return r;
};

test('choosing "Other government ID" asks for the name of the document', async () => {
  await toIdentity();
  expect(screen.queryByTestId('idTypeName')).toBeNull();
  pickSelect('idType', 'Other government ID');
  expect(screen.getByTestId('idTypeName')).toBeTruthy();
  fireEvent.press(screen.getByTestId('onboarding-primary'));
  expect(screen.getByText('Enter the name of the ID document.')).toBeTruthy();
});

test('the ID number is checked against its type and masked once left', async () => {
  await toIdentity();
  pickSelect('idType', 'Aadhaar');
  fireEvent.changeText(screen.getByTestId('idNumber'), '1234');
  fireEvent(screen.getByTestId('idNumber'), 'blur');
  expect(screen.getByText('An Aadhaar number has 12 digits.')).toBeTruthy();

  fireEvent.changeText(screen.getByTestId('idNumber'), '4321 8765 1098');
  fireEvent(screen.getByTestId('idNumber'), 'focus');
  expect(screen.queryByText(/Saved as/)).toBeNull();
  fireEvent(screen.getByTestId('idNumber'), 'blur');
  expect(screen.getByText(/Saved as •+1098/)).toBeTruthy();
});

/* ------------------------------- qualifications ------------------------------ */

const toQualifications = async () => {
  await toIdentity();
  pickSelect('idType', 'Aadhaar');
  fireEvent.changeText(screen.getByTestId('idNumber'), '4321 8765 1098');
  await upload('idDocument', 1);
  // ABHA left blank on purpose: it must never block registration
  fireEvent.press(screen.getByTestId('onboarding-primary'));
  expect(screen.getByText('Professional Qualifications')).toBeTruthy();
};

test('qualifications are a specialty dropdown, four free-text fields and two uploads; the specialty, registration number, Basic Qualification and the uploads are required', async () => {
  await toQualifications();
  ['specialty', 'registrationNumber', 'basicQualification', 'pgSpecialisation', 'superSpecialisation', 'fellowship', 'degreeCertificate', 'registrationCertificate'].forEach(
    (id) => expect(screen.getByTestId(id)).toBeTruthy()
  );
  // no per-qualification records, no institution / university / year
  ['add-qualification', 'institution', 'university', 'year'].forEach((id) => expect(screen.queryByTestId(id)).toBeNull());

  fireEvent.press(screen.getByTestId('onboarding-primary'));
  [
    'Select your specialty.',
    'Enter your registration number.',
    'Enter your basic qualification, e.g. MBBS.',
    'Upload your degree certificate.',
    'Upload your registration certificate.',
  ].forEach((m) =>
    expect(screen.getByText(m)).toBeTruthy()
  );
  expect(screen.getByText('Professional Qualifications')).toBeTruthy();
});

test('the specialty is chosen from what the backend returned — there is nothing to type, and nothing else to pick', async () => {
  await toQualifications();
  await act(async () => {});
  expect(doctorProfileApi.listServices).toHaveBeenCalled();

  fireEvent.press(screen.getByTestId('specialty'));
  // exactly the catalogue, in the catalogue's words
  expect(screen.getAllByTestId('specialty-Psychiatry').length).toBeGreaterThan(0);
  expect(screen.getAllByTestId('specialty-Psychology').length).toBeGreaterThan(0);
  expect(screen.queryByTestId('specialty-Dermatology')).toBeNull();
});

test('a specialty list that will not load says so and can be retried, rather than leaving an empty dropdown', async () => {
  (doctorProfileApi.listServices as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await toQualifications();
  await act(async () => {});
  expect(screen.getByTestId('specialty-retry')).toBeTruthy();

  fireEvent.press(screen.getByTestId('specialty-retry'));
  await act(async () => {});
  expect(screen.queryByTestId('specialty-retry')).toBeNull();
});

const toExperience = async () => {
  await toQualifications();
  await act(async () => {});
  pickSelect('specialty', 'Psychology');
  fireEvent.changeText(screen.getByTestId('registrationNumber'), 'KMC-4471');
  fireEvent.changeText(screen.getByTestId('basicQualification'), 'BDS');
  await upload('degreeCertificate', 1);
  await upload('registrationCertificate', 0);
  fireEvent.press(screen.getByTestId('onboarding-primary'));
  expect(screen.getByText('Experience Details')).toBeTruthy();
};

const addExperience = async (designation: string, institute: string, years: string) => {
  fireEvent.press(screen.getByTestId('add-experience'));
  fireEvent.changeText(screen.getByTestId('designation'), designation);
  fireEvent.changeText(screen.getByTestId('workplace'), institute);
  fireEvent.changeText(screen.getByTestId('years'), years);
  await upload('experienceCertificate', 1);
  fireEvent.press(screen.getByTestId('onboarding-primary'));
};

test('the first button says Add Experience; Add Another Experience once one exists', async () => {
  await toExperience();
  expect(screen.getByText('Add Experience')).toBeTruthy();
  expect(screen.queryByText('Add Another Experience')).toBeNull();
  await addExperience('Consultant', 'City Dental Clinic', '5');
  expect(screen.getByText('Add Another Experience')).toBeTruthy();
});

test('the entry editor has Cancel, and asks before throwing away what was typed', async () => {
  await toExperience();
  fireEvent.press(screen.getByTestId('add-experience'));
  fireEvent.changeText(screen.getByTestId('workplace'), 'Half-typed hospital');
  fireEvent.press(screen.getByTestId('onboarding-cancel'));
  expect(confirmDiscard).toHaveBeenCalled();
  expect(screen.getByText('Experience Details')).toBeTruthy();
  expect(screen.queryByText(/Half-typed hospital/)).toBeNull();
});

test('removing a role and adding another never overwrites a surviving one, and the total adds up', async () => {
  await toExperience();
  await addExperience('Resident', 'First Hospital', '2');
  await addExperience('Consultant', 'Second Hospital', '3');
  fireEvent.press(screen.getAllByTestId(/^exp-e-.*-remove$/)[0]);
  await addExperience('Senior Consultant', 'Third Hospital', '4');
  expect(screen.getByText('Second Hospital · 3 years')).toBeTruthy();
  expect(screen.getByText('Third Hospital · 4 years')).toBeTruthy();
  expect(screen.queryByText('First Hospital · 2 years')).toBeNull();
  expect(screen.getByTestId('total-experience')).toHaveTextContent(/7 Years/);
});

test('years of experience must be a real number', async () => {
  await toExperience();
  fireEvent.press(screen.getByTestId('add-experience'));
  fireEvent.changeText(screen.getByTestId('years'), '0');
  fireEvent.press(screen.getByTestId('onboarding-primary'));
  expect(screen.getByText('Enter a realistic number of years.')).toBeTruthy();
});

/* ---------------------------------- signature -------------------------------- */

const toSignature = async () => {
  await toExperience();
  await addExperience('Consultant', 'City Dental Clinic', '5');
  fireEvent.press(screen.getByTestId('onboarding-primary'));
  expect(screen.getByText('Digital Signature')).toBeTruthy();
};

test('the signature is optional: continuing without one reaches Review', async () => {
  await toSignature();
  fireEvent.press(screen.getByTestId('onboarding-primary'));
  expect(screen.getByTestId('onboarding-review')).toBeTruthy();
  expect(screen.getByTestId('review-signature')).toHaveTextContent(/not uploaded/);
});

test('an uploaded signature is previewed, and only JPG or PNG is accepted', async () => {
  await toSignature();
  mockPicker.queue({ assets: [{ uri: 'file:///s.webp', fileName: 's.webp', fileSize: 20_000, type: 'image/webp' }] });
  fireEvent.press(screen.getByTestId('signature'));
  fireEvent.press(screen.getByTestId('signature-pick-library'));
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.queryByTestId('signature-preview')).toBeNull();

  await upload('signature', 0);
  expect(screen.getByTestId('signature-preview')).toBeTruthy();
  expect(screen.getByTestId('signature-replace')).toBeTruthy();
  expect(screen.getByTestId('signature-remove')).toBeTruthy();
});

/* ---------------------------- review and submission --------------------------- */

const draft = (): RegistrationDraft => ({ ...demoRegistration('+91 91234 56780'), confirmed: false });

test('editing a section from Review returns to Review', () => {
  setup({ mode: 'resubmit', initialDraft: draft() });
  fireEvent.press(screen.getByTestId('edit-basic'));
  expect(screen.getByText('Save & return to review')).toBeTruthy();
  fireEvent.press(screen.getByTestId('onboarding-primary'));
  expect(screen.getByTestId('onboarding-review')).toBeTruthy();
});

test('submitting needs the declaration, asks first, uploads, then hands over the draft', async () => {
  const outcome = { uploaded: [], skipped: [], progress: { status: 'under_review' } };
  const send = jest.spyOn(onboardingApi, 'submitRegistration').mockResolvedValue(outcome as never);

  const { props } = setup({ mode: 'resubmit', initialDraft: draft() });

  // The declaration gates the button itself, so an unticked form cannot be
  // submitted by pressing at all — not by pressing and being told afterwards.
  expect(screen.getByTestId('onboarding-primary')).toBeDisabled();
  fireEvent.press(screen.getByTestId('onboarding-primary'));
  expect(props.onSubmitted).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();

  fireEvent.press(screen.getByTestId('confirm'));
  expect(screen.getByTestId('onboarding-primary')).not.toBeDisabled();
  fireEvent.press(screen.getByTestId('onboarding-primary'));
  expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Resubmit for verification?' }));
  await act(async () => {
    await Promise.resolve();
  });

  // The documents go up BEFORE the doctor leaves the screen, and the outcome
  // — the server's own view of the account — is handed on with the draft.
  expect(send).toHaveBeenCalledTimes(1);
  expect(props.onSubmitted).toHaveBeenCalledWith(
    expect.objectContaining({ confirmed: true, basic: expect.objectContaining({ fullName: 'Arjun Mehta' }) }),
    outcome,
  );
});

test('a failed upload keeps the doctor on Review with the file named', async () => {
  jest
    .spyOn(onboardingApi, 'submitRegistration')
    .mockRejectedValue(new Error('Choose your ID document again — the file could not be read.'));

  const { props } = setup({ mode: 'resubmit', initialDraft: draft() });
  fireEvent.press(screen.getByTestId('confirm'));
  fireEvent.press(screen.getByTestId('onboarding-primary'));
  await act(async () => {
    await Promise.resolve();
  });

  expect(screen.getByTestId('review-error')).toHaveTextContent(/ID document/i);
  // Moving on would leave an admin holding a partial set with no way to know
  // the rest is coming.
  expect(props.onSubmitted).not.toHaveBeenCalled();
});

test('a rejection’s sections are flagged until the doctor opens them', () => {
  setup({ mode: 'resubmit', initialDraft: draft(), flagged: [{ step: 'identity', label: 'Name mismatch' }] });
  expect(screen.getByTestId('flag-identity')).toHaveTextContent('Flagged: Name mismatch');
  fireEvent.press(screen.getByTestId('edit-identity'));
  fireEvent.press(screen.getByTestId('onboarding-primary'));
  expect(screen.queryByTestId('flag-identity')).toBeNull();
});

test('leaving a touched registration asks first; an untouched one just leaves', () => {
  const clean = setup();
  fireEvent.press(screen.getByTestId('back'));
  expect(clean.props.onExit).toHaveBeenCalledTimes(1);
  expect(confirm).not.toHaveBeenCalled();
  expect(confirmDiscard).not.toHaveBeenCalled();
  clean.unmount();

  const touched = setup();
  fireEvent.changeText(screen.getByTestId('fullName'), 'Kavya');
  fireEvent.press(screen.getByTestId('back'));
  expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Leave registration?' }));
  expect(touched.props.onExit).toHaveBeenCalledTimes(1);
});
