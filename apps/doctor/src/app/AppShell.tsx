import React from 'react';

import { RootNavigator } from './navigation/RootNavigator';

/**
 * The signed-in app: five tabs and every screen pushed over them.
 *
 * Navigation lives in `navigation/` — the route list in `RootNavigator`, and
 * in `routes` the adapters that resolve each route's ids to records and wire
 * screen callbacks to navigation. State lives in `state/`. This file stays a
 * single, stable entry point for the app root and the tests.
 */
export const AppShell = () => <RootNavigator />;

export default AppShell;
