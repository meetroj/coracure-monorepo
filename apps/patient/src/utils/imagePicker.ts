import { NativeModules, TurboModuleRegistry } from 'react-native';
import type { ImageLibraryOptions, ImagePickerResponse } from 'react-native-image-picker';

/**
 * react-native-image-picker 8.2.1 chooses its native module with
 * `global.__turboModuleProxy != null` (see its `src/platforms/native.ts`). That
 * is not a reliable signal on RN 0.84 bridgeless: when the guess goes the wrong
 * way the module resolves to `undefined` and the very first call throws a bare
 * TypeError, which is what surfaced as "photo picker unavailable" on a build
 * that does contain the module.
 *
 * So we resolve it ourselves — TurboModule first, legacy bridge second — and
 * call it directly.
 */
const native: any = TurboModuleRegistry.get('ImagePicker') ?? (NativeModules as any).ImagePicker;

/**
 * ponytail: copied from the library's DEFAULT_OPTIONS because the native side
 * reads every key. Re-check on upgrade; drop this file entirely if upstream
 * fixes its module resolution.
 */
const DEFAULTS = {
  mediaType: 'photo',
  restrictMimeTypes: [],
  videoQuality: 'high',
  quality: 1,
  maxWidth: 0,
  maxHeight: 0,
  includeBase64: false,
  cameraType: 'back',
  selectionLimit: 1,
  saveToPhotos: false,
  durationLimit: 0,
  includeExtra: false,
  presentationStyle: 'pageSheet',
  assetRepresentationMode: 'auto',
};

export const isImagePickerAvailable = () => !!native;

export const pickImageFromLibrary = (options: Partial<ImageLibraryOptions> = {}) =>
  new Promise<ImagePickerResponse>((resolve, reject) => {
    if (!native) {
      reject(new Error('ImagePicker native module is missing. Rebuild the app (npm run patient:android).'));
      return;
    }
    native.launchImageLibrary({ ...DEFAULTS, ...options }, resolve);
  });
