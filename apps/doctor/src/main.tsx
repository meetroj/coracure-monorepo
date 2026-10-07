import { AppRegistry } from 'react-native';
import { registerGlobals } from '@livekit/react-native';
import { configureApi } from '@coracure/api';

import App from './app/App';
import { restoreSession } from './state/actions';
import { setState } from './state/store';

/**
 * `X-Client` is stamped on every request and is how a backend log line is
 * traced to the app that made it. The library's default names the patient app,
 * which would make every doctor request look like a patient one.
 *
 * The base URL cannot come from `CORACURE_API_URL` here: no babel plugin
 * inlines environment variables into the bundle, so `process.env` reads as
 * `undefined` on a device and the library falls back to its platform default.
 * That default is `10.0.2.2`, which is the host loopback *as seen from the
 * Android emulator* and routes nowhere on a physical phone — every request
 * hangs until the 20s timeout and the screen reports the server took too long.
 *
 * So the address is stated here: the live backend for release builds, this computer's backend for
 * debug builds.
 *
 * The server's certificate is self-signed and valid only for its IP address, so the app talks to
 * the IP, and `android/app/src/main/res/xml/network_security_config.xml` trusts that one
 * certificate (and only for that address). A phone would otherwise refuse the connection and the
 * app would report "no internet connection". TEMPORARY: once the server has a certificate from a
 * trusted authority for api.coracure.in, point this back at the domain and delete that config.
 *
 * ponytail: one fixed host for all builds. Swap for a build-time variable the
 * day there is a staging host.
 */
configureApi({
  clientName: 'coracure-doctor',
  // Debug builds (running through Metro) use the backend on this computer; `adb reverse tcp:3000
  // tcp:3000` makes it reachable from a USB-connected phone, and an emulator needs nothing extra.
  // Release builds always use the live server.
  // The domain now has a trusted Let's Encrypt certificate; the bare IP serves the edge's default
  // certificate and no app, so it can no longer be used.
  baseUrl: __DEV__ ? 'http://localhost:3000/api/v1' : 'https://api.coracure.in/api/v1',
});

/**
 * LiveKit needs WebRTC's browser globals in place before a consultation call
 * is joined. Once, here, rather than in the room: the room mounts many times.
 */
registerGlobals();

AppRegistry.registerComponent('Doctor', () => App);

/**
 * Cold start: resume the session before anything is shown.
 *
 * The stage is moved to `restoring` SYNCHRONOUSLY, before the first render, so
 * a doctor who is already signed in never sees the intro carousel or the
 * sign-in form flash past on the way to their dashboard. `restoreSession`
 * lands them — or drops them on sign-in if there is nothing to resume.
 *
 * This lives here rather than in `App`'s own effect on purpose: `App` is
 * rendered directly by a dozen specs, and a network call wired into its mount
 * would make every one of them asynchronous.
 */
setState((s) => ({ ...s, session: { ...s.session, stage: 'restoring' } }));
void restoreSession().then((resumed) => {
  // Nothing to resume is the ordinary first run, and that starts at the intro.
  // `restoreSession` itself falls back to sign-in, which is right for a session
  // that went away mid-use but would skip the carousel on a fresh install.
  if (!resumed) setState((s) => ({ ...s, session: { ...s.session, stage: 'intro' } }));
});
