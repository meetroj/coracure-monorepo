import React from 'react';
import { useWindowDimensions } from 'react-native';
import { render } from '@testing-library/react-native';

import { sizeClassFor, scale, MAX_CONTENT_WIDTH } from './responsive';
import AppShell from '../app/AppShell';
import EarningsScreen from '../app/screens/EarningsScreen';
import ReviewsScreen from '../app/screens/ReviewsScreen';
import AppointmentDetailsScreen from '../app/screens/AppointmentDetailsScreen';
import ConsultationRoomScreen from '../app/screens/ConsultationRoomScreen';
import ClinicalNotesScreen from '../app/screens/ClinicalNotesScreen';
import EPrescriptionScreen from '../app/screens/EPrescriptionScreen';
import CaseSummaryScreen from '../app/screens/CaseSummaryScreen';
import ClinicalTemplatesScreen from '../app/screens/ClinicalTemplatesScreen';
import { appointments } from '../data/doctor';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const noop = () => undefined;
const appt = appointments.find((a) => a.id === 'a1')!;
const mockDims = useWindowDimensions as unknown as jest.Mock;

/** Real devices at both ends of the range the app ships to. */
const DEVICES: [string, number, number][] = [
  ['iPhone SE (1st gen)', 320, 568],
  ['Android compact', 360, 640],
  ['iPhone 13 mini', 375, 812],
  ['iPhone 15', 393, 852],
  ['iPhone 15 Pro Max', 430, 932],
  ['Android landscape', 800, 360],
  ['iPad portrait', 768, 1024],
];

const setDevice = (width: number, height: number) =>
  mockDims.mockReturnValue({ width, height, scale: 2, fontScale: 1 });

afterEach(() => jest.clearAllMocks());

/* ------------------------------ size classes ------------------------------ */

test('size classes cover the whole device range', () => {
  expect(sizeClassFor(320)).toBe('small');
  expect(sizeClassFor(359)).toBe('small');
  expect(sizeClassFor(360)).toBe('regular');
  expect(sizeClassFor(393)).toBe('regular');
  expect(sizeClassFor(414)).toBe('large');
  expect(sizeClassFor(430)).toBe('large');
  expect(sizeClassFor(768)).toBe('tablet');
  expect(sizeClassFor(1024)).toBe('tablet');
});

test('scaling is damped, never runaway', () => {
  // a 16pt value on the reference width stays 16
  expect(scale(16, 375)).toBeCloseTo(16, 0);
  // it grows on a wider screen, but by less than the width ratio
  const big = scale(16, 430);
  expect(big).toBeGreaterThan(16);
  expect(big).toBeLessThan(16 * (430 / 375));
  // and shrinks on a small one, without collapsing
  const small = scale(16, 320);
  expect(small).toBeLessThan(16);
  expect(small).toBeGreaterThan(14);
});

/* --------------------------- every screen, every size --------------------- */

const SCREENS: [string, () => React.ReactElement][] = [
  ['AppShell', () => <AppShell onLogout={noop} initialAcknowledged />],
  ['Earnings', () => <EarningsScreen onBack={noop} />],
  ['Reviews', () => <ReviewsScreen onBack={noop} />],
  ['AppointmentDetails', () => <AppointmentDetailsScreen appointment={appt} onBack={noop} />],
  ['ConsultationRoom', () => <ConsultationRoomScreen appointment={appt} onBack={noop} />],
  ['ClinicalNotes', () => <ClinicalNotesScreen appointment={appt} onBack={noop} />],
  ['EPrescription', () => <EPrescriptionScreen appointment={appt} onBack={noop} />],
  ['CaseSummary', () => <CaseSummaryScreen appointment={appt} onBack={noop} />],
  ['ClinicalTemplates', () => <ClinicalTemplatesScreen onBack={noop} />],
];

describe.each(DEVICES)('%s (%ix%i)', (_name, width, height) => {
  test.each(SCREENS)('%s renders', (_screen, build) => {
    setDevice(width, height);
    expect(() => render(build())).not.toThrow();
  });
});

/* ------------------------------- tablet cap ------------------------------- */

test('content is capped and centred on a tablet, uncapped on a phone', () => {
  const flat = (style: unknown): Record<string, unknown> =>
    Array.isArray(style) ? Object.assign({}, ...style.flat(9).filter(Boolean)) : (style as object) ?? {};

  setDevice(768, 1024);
  const tablet = render(<ClinicalTemplatesScreen onBack={noop} />);
  const tabletScroll = tablet.UNSAFE_getAllByType(
    jest.requireActual('react-native').ScrollView
  )[0];
  const capped = flat(tabletScroll.props.contentContainerStyle);
  expect(capped.maxWidth).toBe(MAX_CONTENT_WIDTH);
  expect(capped.alignSelf).toBe('center');

  setDevice(393, 852);
  const phone = render(<ClinicalTemplatesScreen onBack={noop} />);
  const phoneScroll = phone.UNSAFE_getAllByType(
    jest.requireActual('react-native').ScrollView
  )[0];
  expect(flat(phoneScroll.props.contentContainerStyle).maxWidth).toBeUndefined();
});

/* ------------------------- small-screen adaptation ------------------------ */

test('the earnings bento stacks rather than starving the total on a small screen', () => {
  const flat = (style: unknown): Record<string, unknown> =>
    Array.isArray(style) ? Object.assign({}, ...style.flat(9).filter(Boolean)) : (style as object) ?? {};
  const { View } = jest.requireActual('react-native');

  setDevice(320, 568);
  const small = render(<EarningsScreen onBack={noop} />);
  const stacked = small.UNSAFE_getAllByType(View).some(
    (v: { props: { style?: unknown } }) => flat(v.props.style).flexDirection === 'column' &&
      flat(v.props.style).gap !== undefined
  );
  expect(stacked).toBe(true);

  setDevice(393, 852);
  expect(() => render(<EarningsScreen onBack={noop} />)).not.toThrow();
});
