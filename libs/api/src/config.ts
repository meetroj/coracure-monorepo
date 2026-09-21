import { Platform } from 'react-native';

/**
 * Where the API lives.
 *
 * There is no `react-native-config` in this workspace and adding one means a
 * native rebuild, so configuration resolves in this order:
 *
 *   1. `configureApi({ baseUrl })` — called once from the app entry point.
 *   2. `process.env.CORACURE_API_URL` — set for Vitest/Jest and for any build
 *      that adds `babel-plugin-transform-inline-environment-variables`.
 *   3. A platform-aware development default.
 *
 * The default is per-platform because an Android emulator cannot reach the
 * host's `localhost` — `10.0.2.2` is the host loopback as seen from inside the
 * emulator, and getting this wrong is the single most common reason a first
 * integration attempt appears to hang.
 *
 * *** NOTHING SECRET GOES HERE. *** Anything in a frontend bundle is readable
 * by anyone holding the APK. API keys, HMAC secrets and the payment gateway's
 * private credentials stay on the backend; the app only ever holds the user's
 * own short-lived tokens.
 */

const DEV_DEFAULT = Platform.select({
  android: 'http://10.0.2.2:3000/api/v1',
  ios: 'http://localhost:3000/api/v1',
  default: 'http://localhost:3000/api/v1',
}) as string;

export type ApiConfig = {
  baseUrl: string;
  /** Milliseconds before a request is abandoned. */
  timeoutMs: number;
  /** Sent on every request so a device can be traced through the backend log. */
  clientName: string;
};

let config: ApiConfig = {
  baseUrl:
    (typeof process !== 'undefined' && process.env?.CORACURE_API_URL) || DEV_DEFAULT,
  timeoutMs: 20_000,
  clientName: 'coracure-patient',
};

export const configureApi = (next: Partial<ApiConfig>): void => {
  config = { ...config, ...next };
};

export const getApiConfig = (): Readonly<ApiConfig> => config;

/** Joins the base URL and a path without doubling or dropping the slash. */
export const apiUrl = (path: string): string => {
  const base = config.baseUrl.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
};
