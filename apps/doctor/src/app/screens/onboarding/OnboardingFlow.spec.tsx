import React from 'react';
import { confirm, confirmDiscard } from '../../../components/confirm';
import { render, fireEvent, screen, act } from '@testing-library/react-native';

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

beforeEach(() => {
  mockPicker.queued = [];
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
  fireEvent.press(screen.getByTestId('onboarding-primary'));
  expect(screen.getByText('Professional Qualifications')).toBeTruthy();
};

const addQualification = async (degree: string, institution: string) => {
  fireEvent.press(screen.getByTestId('add-qualification'));
  pickSelect('degree', degree);
  fireEvent.changeText(screen.getByTestId('institution'), institution);
  fireEvent.changeText(screen.getByTestId('university'), 'State Health University');
  fireEvent.changeText(screen.getByTestId('year'), '2014');
  await upload('certificate', 2);
  fireEvent.press(screen.getByTestId('onboarding-primary'));
};

test('the first button says Add Qualification; Add Another only once one exists', async () => {
  await toQualifications();
  expect(screen.getByText('Add Qualification')).toBeTruthy();
  expect(screen.queryByText('Add Another Qualification')).toBeNull();
  await addQualification('MBBS', 'Bangalore Medical College');
  expect(screen.getByText('Add Another Qualification')).toBeTruthy();
});

test('the entry editor has Cancel, and asks before throwing away what was typed', async () => {
  await toQualifications();
  fireEvent.press(screen.getByTestId('add-qualification'));
  fireEvent.changeText(screen.getByTestId('institution'), 'Half-typed college');
  fireEvent.press(screen.getByTestId('onboarding-cancel'));
  expect(confirmDiscard).toHaveBeenCalled();
  expect(screen.getByText('Professional Qualifications')).toBeTruthy();
  expect(screen.queryByText('Half-typed college')).toBeNull();
});

test('removing an entry and adding another never overwrites a surviving one', async () => {
  await toQualifications();
  await addQualification('MBBS', 'First College');
  await addQualification('MD Psychiatry', 'Second College');
  // remove the first, then add a third
  const first = screen.getAllByTestId(/^qual-q-.*-remove$/)[0];
  fireEvent.press(first);
  await addQualification('DPM', 'Third College');
  expect(screen.getByText('Second College · 2014')).toBeTruthy();
  expect(screen.getByText('Third College · 2014')).toBeTruthy();
  expect(screen.queryByText('First College · 2014')).toBeNull();
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
