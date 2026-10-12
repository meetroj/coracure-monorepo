import { useSyncExternalStore } from 'react';
import { StyleSheet } from 'react-native';
import {
  darkGradient,
  darkPalette,
  lightGradient,
  lightPalette,
  type ColorScheme,
  type Palette,
} from './palette';

/**
 * *** THE ONE THEME SYSTEM. ***
 *
 * `colors` (and `gradient`) are LIVE objects: every screen reads them through
 * `colors.ink`, `colors.surface.card`… at render time or inside a `themed()`
 * style sheet, and switching scheme rewrites their values in place. There is no
 * second palette to keep in step and no prop drilling.
 *
 * Style sheets are the part that would otherwise go stale — `StyleSheet.create`
 * at module load copies the values once — so every sheet is built with
 * `themed(() => ({ … }))` instead: a lazy sheet rebuilt the first time it is
 * read after a scheme change. Components keep writing `s.card`.
 *
 * After a switch the screen tree has to render again to pick the new values up;
 * `useColorScheme()` subscribes, and the navigator re-mounts the visible screen
 * on a change (see RootNavigator).
 */

const clonePalette = (p: Palette): Palette => ({ ...p, surface: { ...p.surface }, ui: { ...p.ui } });

/** The live palette. Starts as Light, which is the existing design exactly. */
export const colors: Palette = clonePalette(lightPalette);

/** The live gradients. */
export const gradient = { brand: [...lightGradient.brand], wash: [...lightGradient.wash] };

let scheme: ColorScheme = 'light';
let version = 0;
const listeners = new Set<() => void>();

const assignPalette = (next: Palette) => {
  Object.assign(colors, { ...next, surface: colors.surface, ui: colors.ui });
  Object.assign(colors.surface, next.surface);
  Object.assign(colors.ui, next.ui);
};

/**
 * Switches every colour the app reads. Idempotent; listeners are told only when
 * the scheme really changed.
 */
export const applyColorScheme = (next: ColorScheme): void => {
  if (next === scheme) return;
  scheme = next;
  assignPalette(next === 'dark' ? darkPalette : lightPalette);
  const g = next === 'dark' ? darkGradient : lightGradient;
  gradient.brand = [...g.brand];
  gradient.wash = [...g.wash];
  version += 1;
  listeners.forEach((fn) => fn());
};

export const getColorScheme = (): ColorScheme => scheme;

/** Bumped on every scheme change; a key for anything that must re-mount. */
export const getThemeVersion = (): number => version;

export const subscribeColorScheme = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** The active scheme, re-rendering the caller when it changes. */
export const useColorScheme = (): ColorScheme =>
  useSyncExternalStore(subscribeColorScheme, getColorScheme, getColorScheme);

/**
 * A style sheet that follows the scheme.
 *
 * `factory` is called (and handed to `StyleSheet.create`) the first time any
 * style is read, and again the first time one is read after a scheme change.
 * The returned object behaves like the sheet itself: `s.card`, `[s.row, s.on]`,
 * `StyleSheet.flatten(s.title)` all work unchanged.
 */
export function themed<T extends StyleSheet.NamedStyles<T>>(factory: () => T & StyleSheet.NamedStyles<T>): T {
  return themedValue(() => StyleSheet.create(factory()) as T);
}

/**
 * The same laziness for any table of colours that is not a style sheet — a
 * tone map such as `{ brand: { bg, fg } }` written at module scope would
 * otherwise keep the colours it was created with.
 */
export function themedValue<T extends object>(factory: () => T): T {
  let builtFor = -1;
  let current: T | null = null;
  const get = (): T => {
    if (current === null || builtFor !== version) {
      current = factory();
      builtFor = version;
    }
    return current;
  };
  return new Proxy({} as T, {
    get: (_target, key) => (get() as Record<string | symbol, unknown>)[key],
    has: (_target, key) => key in get(),
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_target, key) => {
      const desc = Object.getOwnPropertyDescriptor(get(), key);
      return desc ? { ...desc, configurable: true } : undefined;
    },
  });
}

export type { ColorScheme, Palette };
export { lightPalette, darkPalette };
