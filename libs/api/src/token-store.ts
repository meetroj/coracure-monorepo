import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { TokenPair } from './types';

const SERVICE_NAME = 'coracure-auth';
const USERNAME = 'coracure';

let memoryTokens: { accessToken: string; refreshToken: string } | null = null;

const isWeb = Platform.OS === 'web';

export const saveTokens = async (accessToken: string, refreshToken: string): Promise<void> => {
  memoryTokens = { accessToken, refreshToken };
  if (isWeb) return;
  try {
    const credentials = JSON.stringify({ accessToken, refreshToken });
    if (Keychain && typeof Keychain.setGenericPassword === 'function') {
      await Keychain.setGenericPassword(USERNAME, credentials, { service: SERVICE_NAME });
    }
  } catch {
    // In-memory fallback for web / preview
  }
};

export const getTokens = async (): Promise<{ accessToken: string; refreshToken: string } | null> => {
  if (isWeb || memoryTokens) return memoryTokens;
  try {
    if (Keychain && typeof Keychain.getGenericPassword === 'function') {
      const credentials = await Keychain.getGenericPassword({ service: SERVICE_NAME });
      if (credentials) {
        memoryTokens = JSON.parse(credentials.password);
        return memoryTokens;
      }
    }
  } catch {
    // In-memory fallback
  }
  return memoryTokens;
};

export const clearTokens = async (): Promise<void> => {
  memoryTokens = null;
  if (isWeb) return;
  try {
    if (Keychain && typeof Keychain.resetGenericPassword === 'function') {
      await Keychain.resetGenericPassword({ service: SERVICE_NAME });
    }
  } catch {
    // In-memory fallback
  }
};

