import React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react-native';

import App from '../app/App';
import { resetStore, type AppState } from '../state/store';
import { DEMO_MOBILE } from '../state/actions';

/**
 * Spec helpers for driving the whole app.
 *
 * A native stack keeps the screens underneath mounted (that is how returning
 * to one finds it as it was), so a query can match the same testID on more
 * than one screen. `topmost` picks the newest — the one the doctor sees.
 */

/** Signs the demo doctor in (verified, onboarded) with any state overrides. */
export const signedIn = (over: Partial<AppState> = {}) =>
  resetStore({
    session: { stage: 'shell', mobile: DEMO_MOBILE },
    onboardingCompleted: true,
    verification: { status: 'approved', acknowledged: true },
    ...over,
  });

/** Renders the full app — navigation, sheets host and toasts — signed in. */
export const renderShell = (over: Partial<AppState> = {}) => {
  signedIn(over);
  return render(<App />);
};

/** The newest element with this testID. */
export const topmost = (testID: string) => {
  const all = screen.getAllByTestId(testID);
  return all[all.length - 1];
};

/** Queries scoped to the newest instance of a screen. */
export const on = (testID: string) => within(topmost(testID));

/** Presses the newest element with this testID. */
export const tap = (testID: string) => fireEvent.press(topmost(testID));

/** Presses Back on the screen the doctor is looking at. */
export const pressBack = () => tap('back');

/** The current toast text, if one is showing. */
export const toastText = () => {
  const t = screen.queryByTestId('toast', { includeHiddenElements: true });
  return t ? within(t).queryAllByText(/.+/, { includeHiddenElements: true }).map((n) => n.props.children).join(' ') : '';
};
