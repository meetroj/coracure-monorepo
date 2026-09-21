import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import OnboardingFlow from './OnboardingFlow';
import {
  totalExperienceYears,
  isStepComplete,
  emptyDraft,
  maskId,
  PATIENT_VISIBLE,
  type Experience,
} from '../../../data/registration';

const noop = () => undefined;
const NOW = '2026-09';

const job = (start: string, end: string | null, current = false): Experience => ({
  id: start,
  position: 'Consultant Psychiatrist',
  institution: 'A Hospital',
  start,
  end,
  current,
  proof: { name: 'proof.pdf', kind: 'pdf', size: '1 MB' },
});

/* --------------------------- experience maths ----------------------------- */

test('total experience merges overlapping roles instead of summing them', () => {
  // two concurrent posts over the same three years are three years, not six
  const overlapping = [job('2020-01', '2023-01'), job('2021-01', '2023-01')];
  expect(totalExperienceYears(overlapping, NOW)).toBe(3);

  // the same two spans back to back really are six
  const sequential = [job('2017-01', '2020-01'), job('2020-01', '2023-01')];
  expect(totalExperienceYears(sequential, NOW)).toBe(6);
});

test('a gap between roles is not counted as worked time', () => {
  const withGap = [job('2016-01', '2018-01'), job('2020-01', '2022-01')];
  expect(totalExperienceYears(withGap, NOW)).toBe(4);
});

test('a current role counts up to now', () => {
  expect(totalExperienceYears([job('2023-09', null, true)], NOW)).toBe(3);
});

test('malformed or reversed dates are ignored rather than producing nonsense', () => {
  expect(totalExperienceYears([job('not-a-date', '2020-01')], NOW)).toBe(0);
  // end before start
  expect(totalExperienceYears([job('2022-01', '2019-01')], NOW)).toBe(0);
  expect(totalExperienceYears([], NOW)).toBe(0);
});

/* ------------------------------ step gating ------------------------------- */

test('a step is incomplete until every required field AND upload is present', () => {
  const d = emptyDraft('+91 90000 00000', 'a@b.com');
  expect(isStepComplete(d, 'basic')).toBe(false);

  d.basic = {
    ...d.basic,
    photo: { name: 'p.jpg', kind: 'image', size: '1 MB' },
    fullName: 'Dr Anushri Dhole',
    dob: '01 / 01 / 1990',
    gender: 'Female',
    languages: ['English'],
  };
  expect(isStepComplete(d, 'basic')).toBe(true);

  // identity needs the document, not just the number
  d.identity = { idType: 'Aadhaar', idNumber: '1234 5678 9012', document: null };
  expect(isStepComplete(d, 'identity')).toBe(false);
  d.identity.document = { name: 'id.pdf', kind: 'pdf', size: '1 MB' };
  expect(isStepComplete(d, 'identity')).toBe(true);

  // a qualification without its certificate does not count
  d.qualifications = [
    { id: 'q1', degree: 'MBBS', institution: 'AIIMS', university: 'AIIMS', year: '2018', certificate: null },
  ];
  expect(isStepComplete(d, 'qualifications')).toBe(false);
});

/* ---------------------------- patient visibility -------------------------- */

test('verification-only fields are never marked patient visible', () => {
  // the whole point of the split: documents and history stay private
  (
    [
      'dob', 'mobile', 'email', 'governmentId', 'institution', 'university',
      'yearOfPassing', 'degreeCertificate', 'positionHistory',
      'employmentDates', 'experienceCertificate',
    ] as const
  ).forEach((k) => expect(PATIENT_VISIBLE[k]).toBe(false));

  // and what helps a patient choose is
  (['name', 'photo', 'languages', 'degreeNames', 'totalExperience', 'specialty'] as const).forEach(
    (k) => expect(PATIENT_VISIBLE[k]).toBe(true)
  );
});

test('an id is masked to its last four characters', () => {
  expect(maskId('123456789012')).toBe('••••••••9012');
  expect(maskId('9012')).toBe('9012');
});

/* -------------------------------- the flow -------------------------------- */

test('onboarding opens on Basic Details and cannot continue while it is empty', () => {
  const { getByText, getByTestId } = render(
    <OnboardingFlow onSubmitted={noop} onExit={noop} now={NOW} />
  );

  expect(getByText('Basic Details')).toBeTruthy();
  // the step count sits with the title; the bars carry the progress
  expect(getByText('1 of 4')).toBeTruthy();

  // the CTA is present but refuses until the step is complete
  const cta = getByTestId('onboarding-primary');
  expect(cta.props.accessibilityState.disabled).toBe(true);
  fireEvent.press(cta);
  expect(getByText('Basic Details')).toBeTruthy();
});

test('only the mobile is pre-verified; the email is asked for', () => {
  const { getByTestId, getAllByText } = render(
    <OnboardingFlow mobile="+91 98765 43210" onSubmitted={noop} now={NOW} />
  );

  // OTP proved the number, so it is shown rather than collected
  expect(getAllByText('Verified')).toHaveLength(1);
  expect(getByTestId('mobile')).toBeTruthy();

  // the address was never confirmed anywhere, so it is an ordinary field
  const email = getByTestId('email');
  expect(email.props.value).toBe('');
  fireEvent.changeText(email, 'doc@coracure.in');
});

test('the date of birth types its own separators', () => {
  const { getByTestId } = render(<OnboardingFlow onSubmitted={noop} now={NOW} />);
  const dob = getByTestId('dob');

  fireEvent.changeText(dob, '14');
  expect(getByTestId('dob').props.value).toBe('14');

  fireEvent.changeText(dob, '1408');
  expect(getByTestId('dob').props.value).toBe('14 / 08');

  fireEvent.changeText(dob, '14081986');
  expect(getByTestId('dob').props.value).toBe('14 / 08 / 1986');

  // letters and extra digits are simply refused
  fireEvent.changeText(dob, '14081986xx9');
  expect(getByTestId('dob').props.value).toBe('14 / 08 / 1986');
});

test('the basic step no longer carries its explanatory lines', () => {
  const { queryByText } = render(<OnboardingFlow onSubmitted={noop} now={NOW} />);
  expect(queryByText(/Tell us a little about yourself/)).toBeNull();
  expect(queryByText(/Shown on your patient profile/)).toBeNull();
  expect(queryByText(/as it appears on your medical registration/)).toBeNull();
  expect(queryByText(/Patients are matched to you by language/)).toBeNull();
  expect(queryByText(/Date of birth,\s*mobile number and email stay private/)).toBeNull();
});

/* ------------------------------ the calendar ------------------------------ */

test('the calendar glyph opens a picker and writes the date back', () => {
  const { getByTestId } = render(<OnboardingFlow onSubmitted={noop} now={NOW} />);

  fireEvent.press(getByTestId('dob-calendar'));

  // it opens on January 1990 when the field is empty, and steps month and year
  fireEvent.press(getByTestId('dob-month-next'));
  fireEvent.press(getByTestId('dob-year-back'));
  fireEvent.press(getByTestId('dob-day-14'));

  expect(getByTestId('dob').props.value).toBe('14 / 02 / 1989');
});

test('the picker reopens on the month the field already holds', () => {
  const { getByTestId } = render(<OnboardingFlow onSubmitted={noop} now={NOW} />);

  fireEvent.changeText(getByTestId('dob'), '05121972');
  fireEvent.press(getByTestId('dob-calendar'));
  fireEvent.press(getByTestId('dob-day-9'));

  expect(getByTestId('dob').props.value).toBe('09 / 12 / 1972');
});

test('a sheet dropdown commits through Apply rather than closing on a tap', () => {
  const { getByTestId, getByText, queryByTestId } = render(
    <OnboardingFlow onSubmitted={noop} now={NOW} />
  );

  fireEvent.press(getByTestId('languages'));
  // nothing picked yet, so no count and nothing to clear
  expect(getByText('Apply')).toBeTruthy();
  expect(queryByTestId('languages-clear')).toBeNull();

  fireEvent.press(getByTestId('languages-option-Hindi'));
  fireEvent.press(getByTestId('languages-option-Tamil'));
  // still open: picking selects, Apply is what closes, and it counts the picks
  expect(getByText('Apply (2)')).toBeTruthy();
  expect(getByTestId('languages-clear')).toBeTruthy();

  fireEvent.press(getByTestId('languages-done'));
  expect(getByText('Hindi')).toBeTruthy();
  expect(getByText('Tamil')).toBeTruthy();
});

test('Clear all empties the picks without closing the sheet', () => {
  const { getByTestId, getByText, queryByTestId } = render(
    <OnboardingFlow onSubmitted={noop} now={NOW} />
  );

  fireEvent.press(getByTestId('languages'));
  fireEvent.press(getByTestId('languages-option-Hindi'));
  fireEvent.press(getByTestId('languages-clear'));

  expect(getByText('Apply')).toBeTruthy();
  expect(queryByTestId('languages-clear')).toBeNull();
});

test('gender opens an anchored menu that commits on the tap itself', () => {
  const { getByTestId, queryByText } = render(<OnboardingFlow onSubmitted={noop} now={NOW} />);

  fireEvent.press(getByTestId('gender'));
  // an inline menu, so no sheet title and no Apply
  expect(queryByText('Select gender')).toBeNull();
  expect(queryByText('Apply')).toBeNull();

  fireEvent.press(getByTestId('gender-Female'));
  expect(getByTestId('gender').props.accessibilityLabel).toBe('Gender: Female');
});

/* ------------------------- experience dates and total --------------------- */

test('the experience months type their own separator and still total', () => {
  // the parser ignores the separator, so a slashed entry counts the same
  const slashed = [{ ...job('2018 / 01', '2022 / 01'), start: '2018 / 01', end: '2022 / 01' }];
  expect(totalExperienceYears(slashed, NOW)).toBe(4);

  // and a hyphenated fixture is unchanged
  expect(totalExperienceYears([job('2018-01', '2022-01')], NOW)).toBe(4);

  // a half-typed month contributes nothing rather than counting as year zero
  expect(totalExperienceYears([{ ...job('2018-01', '2022-01'), start: '2018' }], NOW)).toBe(0);
});

test('a single-digit month still counts toward the total', () => {
  // typed as 2018 / 1 rather than 2018 / 01
  const short = [{ ...job('2018-01', '2022-01'), start: '2018 / 1', end: '2022 / 1' }];
  expect(totalExperienceYears(short, NOW)).toBe(4);
});
