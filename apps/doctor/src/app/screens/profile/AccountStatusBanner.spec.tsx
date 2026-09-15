import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import {
  ApprovedStatusScreen,
  PendingStatusScreen,
  RejectedStatusScreen,
} from './AccountStatusScreens';

const noop = () => undefined;

const APPROVED = require('../../../assets/b1.png');
const REVIEW = require('../../../assets/b2.png');
const REJECTED = require('../../../assets/b3.png');

test('each account state renders its supplied banner artwork', () => {
  const cases: [React.ReactElement, unknown, string][] = [
    [<ApprovedStatusScreen onAcknowledge={noop} />, APPROVED, 'Account Approved'],
    [<PendingStatusScreen onContact={noop} />, REVIEW, 'Under Review'],
    [<RejectedStatusScreen onResubmit={noop} onContact={noop} />, REJECTED, 'Changes Required'],
  ];

  cases.forEach(([el, art, title]) => {
    const { UNSAFE_getAllByType, getByText } = render(el);
    const sources = UNSAFE_getAllByType(Image).map((i) => i.props.source);
    expect(sources).toContain(art);
    // the copy sits over the artwork's empty left side, not under the image
    expect(getByText(title)).toBeTruthy();
  });
});

test.each([
  [ApprovedStatusScreen, { onAcknowledge: noop }, APPROVED],
  [PendingStatusScreen, { onContact: noop }, REVIEW],
  [RejectedStatusScreen, { onResubmit: noop, onContact: noop }, REJECTED],
] as const)('banner artwork cannot impose its native height on the card (%#)', (Screen, props, art) => {
  const { UNSAFE_getAllByType } = render(React.createElement(Screen as React.ComponentType<any>, props));
  const banner = UNSAFE_getAllByType(Image).find((i) => i.props.source === art)!;
  const style = StyleSheet.flatten(banner.props.style);

  expect(banner.props.resizeMode).toBe('contain');
  expect(style.position).toBe('absolute');
  // Both axes must be given explicitly, so the artwork's intrinsic size can
  // never drive the card's height. The width is a right-hand fraction rather
  // than the full card, which is what keeps the art off the copy.
  expect(style.height).toBe('100%');
  expect(typeof style.width).toBe('string');
  expect(style.width).toMatch(/%$/);
  expect(style.right).toBe(0);
});
