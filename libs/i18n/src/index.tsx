import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { NativeModules, Platform } from 'react-native';

import { en, type Dictionary } from './en';
import { hi, type DeepPartial } from './hi';

/**
 * Localisation.
 *
 * The workspace had no localisation system, so this is it: a typed dictionary,
 * a provider, and a `t()` that falls back per key.
 *
 * Three rules it enforces:
 *
 * 1. **No user-visible string is written in a component.** Components call
 *    `t('section.key')`. The English file is the key set, so a typo is a
 *    compile error rather than a blank label.
 * 2. **A missing translation renders English, never a key.** `hi` is a deep
 *    partial and lookup walks it first, then `en`. That is what lets Hindi ship
 *    incrementally as strings are reviewed.
 * 3. **Backend-owned copy is never translated here.** Consent text, the search
 *    disclaimer, crisis guidance, notification bodies and service names all
 *    arrive from the API — they are versioned, clinically approved, or editable
 *    without a release, and a local copy would go stale or contradict what was
 *    recorded against the patient.
 *
 * The active language follows the patient's own `preferredLanguage` from
 * `GET /me/profile`, because that is the same value provider assignment matches
 * on — the app should speak the language the platform promised them.
 */

export const LOCALES = ['en', 'hi'] as const;
export type Locale = (typeof LOCALES)[number];

const DICTIONARIES: Record<Locale, DeepPartial<Dictionary>> = { en, hi };

/** Dotted paths into the dictionary, e.g. `'login.title'`. */
type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = Leaves<Dictionary>;

const lookup = (dict: unknown, path: string): string | undefined => {
  const value = path
    .split('.')
    .reduce<unknown>((node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined), dict);
  return typeof value === 'string' ? value : undefined;
};

/** `{name}` → params.name. A missing param is left visible rather than blanked. */
const interpolate = (template: string, params?: Record<string, string | number>): string => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in params ? String(params[key]) : whole,
  );
};

export type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

type I18nValue = {
  locale: Locale;
  t: Translate;
  setLocale: (next: Locale) => void;
  /** True when the active locale has no entry for the key and English is shown. */
  isFallback: (key: TranslationKey) => boolean;
};

const I18nContext = createContext<I18nValue | null>(null);

/**
 * The device's language, used only until the profile is loaded.
 *
 * Read from the platform rather than a library: pulling in a locale package for
 * one string would be a native dependency for something two NativeModules
 * fields already answer. Anything that is not Hindi falls to English, which is
 * the launch language.
 */
export const deviceLocale = (): Locale => {
  try {
    const tag =
      Platform.OS === 'ios'
        ? (NativeModules.SettingsManager?.settings?.AppleLocale ??
          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0])
        : NativeModules.I18nManager?.localeIdentifier;
    return typeof tag === 'string' && tag.toLowerCase().startsWith('hi') ? 'hi' : 'en';
  } catch {
    return 'en';
  }
};

export const I18nProvider = ({
  children,
  locale: controlled,
}: {
  children: ReactNode;
  /** Supplied once the profile is known; otherwise the device default is used. */
  locale?: Locale | null;
}) => {
  const [fallbackLocale, setFallbackLocale] = useState<Locale>(deviceLocale);
  const locale = controlled ?? fallbackLocale;

  const t = useCallback<Translate>(
    (key, params) => {
      const active = lookup(DICTIONARIES[locale], key);
      // English is the key set, so this second lookup always resolves for a
      // valid key — which is why a missing translation can never render blank.
      const fallback = lookup(en, key);
      return interpolate(active ?? fallback ?? key, params);
    },
    [locale],
  );

  const isFallback = useCallback(
    (key: TranslationKey) => lookup(DICTIONARIES[locale], key) === undefined,
    [locale],
  );

  const value = useMemo<I18nValue>(
    () => ({ locale, t, setLocale: setFallbackLocale, isFallback }),
    [locale, t, isFallback],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
};

/** The common case: `const t = useT()` then `t('login.title')`. */
export const useT = (): Translate => useI18n().t;

/** The language's own name, for a picker. Always in that language. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  hi: 'हिन्दी',
};

export { en, hi };
export type { Dictionary };
