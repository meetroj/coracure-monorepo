/**
 * Where the session tokens live.
 *
 * *** KEYCHAIN, NEVER AsyncStorage. *** AsyncStorage is a plaintext SQLite file
 * on disk that any rooted device or ADB backup can read. This app holds
 * clinical data, so an access token in it is a patient record in it.
 *
 * `react-native-keychain` is a native module. If the JS bundle is running
 * before the app has been rebuilt with it linked — or under Jest, where no
 * native modules exist — the require below fails. The fallback in that case is
 * memory only: the session works for the life of the process and is gone on
 * restart. It is deliberately NOT a disk fallback, because silently degrading
 * to plaintext is exactly the failure this module exists to prevent.
 */

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds. Derived from the response's `expiresIn` seconds. */
  expiresAt: number;
};

type KeychainModule = {
  setGenericPassword: (
    username: string,
    password: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>;
  getGenericPassword: (
    options?: Record<string, unknown>,
  ) => Promise<false | { username: string; password: string }>;
  resetGenericPassword: (options?: Record<string, unknown>) => Promise<boolean>;
  ACCESSIBLE?: Record<string, string>;
};

const SERVICE = 'in.coracure.patient.session';

const loadKeychain = (): KeychainModule | null => {
  try {
     
    const mod = require('react-native-keychain') as KeychainModule & { default?: KeychainModule };
    const resolved = mod?.default ?? mod;
    return typeof resolved?.setGenericPassword === 'function' ? resolved : null;
  } catch {
    // The package is not installed at all.
    return null;
  }
};

let keychain = loadKeychain();

/** The process-lifetime fallback. Never touches disk. */
let memory: SessionTokens | null = null;
let warned = false;

const warnOnce = () => {
  if (warned) return;
  warned = true;
  if (typeof __DEV__ !== 'undefined' && !__DEV__) return;
   
  console.warn(
    '[coracure] react-native-keychain is not available — the session is being held in memory only ' +
      'and will not survive a restart. Run a native rebuild (npm run patient:android / patient:ios) ' +
      'to enable secure persistence. Tokens are never written to plaintext storage.',
  );
};

/**
 * The JS package resolving does NOT mean the native module is linked.
 *
 * `react-native-keychain` exports its functions unconditionally and only fails
 * when one is called and the underlying `NativeModules` entry is undefined —
 * which is what happens in Jest, in a JS-only context, and in any build where
 * autolinking has not run yet. So a throw from a keychain call is treated as
 * "not available" and the store drops to memory for the rest of the process,
 * rather than letting the exception escape into a sign-in flow.
 *
 * Dropping to memory is the ONLY fallback. There is deliberately no plaintext
 * one: degrading a clinical app's token storage silently is the failure this
 * module exists to prevent.
 */
const disableKeychain = () => {
  keychain = null;
  warnOnce();
};

export const secureStorageAvailable = (): boolean => keychain !== null;

export const saveTokens = async (tokens: SessionTokens): Promise<void> => {
  // The in-memory copy is written FIRST and unconditionally, so the session
  // works for this process even if persistence is unavailable.
  memory = tokens;
  if (!keychain) {
    warnOnce();
    return;
  }
  try {
    await keychain.setGenericPassword(SERVICE, JSON.stringify(tokens), {
      service: SERVICE,
      // Readable only after the first unlock and never restored to a new device.
      accessible: keychain.ACCESSIBLE?.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    disableKeychain();
  }
};

export const loadTokens = async (): Promise<SessionTokens | null> => {
  if (memory) return memory;
  if (!keychain) {
    warnOnce();
    return null;
  }
  try {
    const stored = await keychain.getGenericPassword({ service: SERVICE });
    if (!stored) return null;
    const parsed = JSON.parse(stored.password) as Partial<SessionTokens>;
    if (
      typeof parsed?.accessToken !== 'string' ||
      typeof parsed?.refreshToken !== 'string' ||
      typeof parsed?.expiresAt !== 'number'
    ) {
      // A shape we do not recognise is a corrupt or superseded entry. Drop it
      // rather than handing a half-session to the client.
      await clearTokens();
      return null;
    }
    memory = parsed as SessionTokens;
    return memory;
  } catch {
    // Could be a corrupt entry or a missing native module; either way there is
    // no session to restore and the next save will re-test availability.
    return null;
  }
};

export const clearTokens = async (): Promise<void> => {
  memory = null;
  if (!keychain) return;
  try {
    await keychain.resetGenericPassword({ service: SERVICE });
  } catch {
    // Nothing stored, or the keychain refused. Either way the in-memory copy is
    // gone, which is what signs the user out of this process.
  }
};

/** Test seam: drops the in-memory copy without touching the keychain. */
export const __resetMemoryForTests = (): void => {
  memory = null;
};
