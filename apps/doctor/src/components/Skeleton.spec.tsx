import React from 'react';
import { View, AccessibilityInfo } from 'react-native';
import { render, act } from '@testing-library/react-native';

import { Skeleton, SkeletonCircle, SkeletonText } from './Skeleton';
import { SkeletonAppointmentRow, SkeletonAppointmentList } from './skeletons';
import { skeleton } from '../theme/skeleton';

const flat = (style: unknown): Record<string, unknown> =>
  Array.isArray(style)
    ? Object.assign({}, ...style.flat(9).filter(Boolean))
    : ((style as object) ?? {});

const styleOf = (node: { props: { style?: unknown } }) => flat(node.props.style);

beforeEach(() => {
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(false);
});
afterEach(() => jest.restoreAllMocks());

/* -------------------------------- palette --------------------------------- */

test('placeholders use the pale skeleton palette, never dark grey', () => {
  const { getByTestId } = render(<Skeleton testID="box" width={100} height={14} />);
  const st = styleOf(getByTestId('box', { includeHiddenElements: true }));

  expect(st.backgroundColor).toBe(skeleton.base);
  expect(st.backgroundColor).toBe('#E8F1EF');
  // clipped, so the sweep cannot escape the rounded corners
  expect(st.overflow).toBe('hidden');
});

test('a tinted placeholder uses the mint token', () => {
  const { getByTestId } = render(<Skeleton testID="box" tinted />);
  expect(styleOf(getByTestId('box', { includeHiddenElements: true })).backgroundColor).toBe(skeleton.tint);
});

/* ------------------------------- dimensions ------------------------------- */

test('a placeholder occupies exactly the size it is given', () => {
  const { getByTestId } = render(<Skeleton testID="box" width={120} height={18} radius={9} />);
  const st = styleOf(getByTestId('box', { includeHiddenElements: true }));

  expect(st.width).toBe(120);
  expect(st.height).toBe(18);
  expect(st.borderRadius).toBe(9);
});

test('a circle is square with a half-side radius', () => {
  const { UNSAFE_getAllByType } = render(<SkeletonCircle size={34} />);
  const st = styleOf(UNSAFE_getAllByType(View)[0]);

  expect(st.width).toBe(34);
  expect(st.height).toBe(34);
  expect(st.borderRadius).toBe(17);
});

test('text runs end on a short line, like real prose', () => {
  const { UNSAFE_getAllByType } = render(<SkeletonText lines={3} />);
  const boxes = UNSAFE_getAllByType(View)
    .map(styleOf)
    .filter((st) => st.backgroundColor === skeleton.base);

  expect(boxes).toHaveLength(3);
  expect(boxes[0].width).toBe('100%');
  expect(boxes[2].width).toBe('62%');
});

/* --------------------------- layout parity -------------------------------- */

test('the appointment skeleton reserves the real row geometry', () => {
  const { UNSAFE_getAllByType } = render(<SkeletonAppointmentRow />);
  const styles = UNSAFE_getAllByType(View).map(styleOf);

  // the row cannot be shorter than the real one, or the list jumps on load
  expect(styles.some((st) => st.minHeight === 86)).toBe(true);
  // 46pt time column and 34pt avatar, matching AppointmentsScreen exactly
  expect(styles.some((st) => st.width === 46)).toBe(true);
  expect(styles.some((st) => st.width === 34 && st.height === 34)).toBe(true);
  // the flexible body carries minWidth 0, the guard against mid-word breaks
  expect(styles.some((st) => st.flex === 1 && st.minWidth === 0)).toBe(true);
});

test('a skeleton list renders one row per expected item', () => {
  const { UNSAFE_getAllByType } = render(<SkeletonAppointmentList rows={5} />);
  const rows = UNSAFE_getAllByType(View)
    .map(styleOf)
    .filter((st) => st.minHeight === 86);

  expect(rows).toHaveLength(5);
});

/* ----------------------------- reduced motion ----------------------------- */

test('no shimmer is rendered when Reduce Motion is on', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

  const { UNSAFE_queryAllByType, rerender } = render(<Skeleton testID="box" width={100} />);
  await act(async () => {
    rerender(<Skeleton testID="box" width={100} />);
  });

  const Svg = require('react-native-svg').default;
  expect(UNSAFE_queryAllByType(Svg)).toHaveLength(0);
});

test('placeholders are hidden from assistive technology', () => {
  const { getByTestId } = render(<Skeleton testID="box" />);
  const node = getByTestId('box', { includeHiddenElements: true });

  // a screen reader should announce the loaded content, never the placeholder
  expect(node.props.accessibilityElementsHidden).toBe(true);
  expect(node.props.importantForAccessibility).toBe('no-hide-descendants');
});
