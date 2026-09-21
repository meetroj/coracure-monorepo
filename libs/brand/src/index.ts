/**
 * Coracure brand tokens — single source of truth for every app in this
 * workspace.
 *
 * Values come from "CORACURE - BRAND GUIDELINES.pdf" (2026 rebrand), which is
 * the final authority. Only `surfie` and `paris` are brand colours.
 * Everything under `surface`, `ink`, `warn` and `danger` is UI chrome or a
 * semantic state colour — never a third brand hue, and never applied to the
 * logo.
 *
 * This is the verbatim lift of `apps/doctor/src/theme/brand.ts` that the note
 * in that file anticipated, plus the tokens the patient screens needed
 * (`gradient`, `shadow.raised`, `shadow.floating`, two extra type sizes).
 * Nothing that existed was changed, so repointing the doctor app at this
 * module is a one-line re-export whenever its owner wants it.
 */

export const colors = {
  /** Surfie Green — PANTONE 328 C. Primary interface colour. */
  surfie: '#0E766C',
  /**
   * The solid primary-action green.
   *
   * Taken as the midpoint of the brand gradient (`#0E9C7E` → `#12B981`) rather
   * than invented, so it stays inside the brand's own range. It is applied
   * FLAT: the visual direction avoids gradients on controls, and a gradient
   * under a pill button reads as a 2018 dashboard rather than a 2026 health
   * product. The gradient is kept for the logo tile, where it belongs.
   */
  cta: '#10AA80',
  /** Pressed / darker step of `cta`. */
  ctaPressed: '#0D8F6B',
  /** Paris Green — PANTONE 3385 C. Secondary accents, active/success. */
  paris: '#34D499',

  white: '#FFFFFF',
  /** Near black, per the brand deck's mono lockups. */
  ink: '#1C1C1C',
  inkMuted: '#5A6B67',
  inkFaint: '#6B7E78',

  /** Genuine errors, rejected verification, cancellations, clinical red flags. */
  danger: '#D94A45',
  dangerSoft: '#FDECEB',
  /** Pending, warning, follow-up-required only. */
  warn: '#E0972B',
  warnSoft: '#FDF4E5',
  /** Success / verified. */
  success: '#0E766C',
  successSoft: '#E7F7F0',

  /** Derived tints of the brand greens — chrome only, not brand colours. */
  surface: {
    /** App background. */
    page: '#F7FBF9',
    /** Banner / hero tint, sampled from the supplied banner artwork. */
    mint: '#EFFDF8',
    mintSoft: '#F2FAF6',
    /** Card background. */
    card: '#FFFFFF',
    /** Hairline dividers. */
    line: '#E4EEEA',
    /** Input + card outline. */
    inputBorder: '#D5E4DF',
    /** Selected tab / chip background. */
    selected: '#E7F7F0',
  },
} as const;

/**
 * The two gradients in the visual direction. Both run surfie → paris; the
 * onboarding artwork is the same pair at low opacity over `surface.page`.
 * Consumed by `BrandBackground` and the primary CTA, never mixed by hand.
 */
export const gradient = {
  /** Primary CTA and the logo tile. */
  brand: ['#0E9C7E', '#12B981'] as const,
  /** The mint wash behind onboarding. Painted, never an image of the mock. */
  wash: ['#FFFFFF', '#F6FCF9', '#ECF9F3'] as const,
} as const;

/** 8px spacing system. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  /** Card radius per the visual direction: ~16–20px. */
  card: 18,
  input: 14,
  pill: 999,
} as const;

/**
 * Typography.
 *
 * The deck specifies "Rounded" (Igor Stepanchenko) for headings and
 * "Montserrat" (Julieta Ulanovsky) for body. Neither font file is in the repo
 * as a .ttf (only .woff2, which React Native cannot load), so `family` stays
 * undefined and React Native falls back to the platform font — the temporary
 * development fallback. Drop the .ttf files into
 * `android/app/src/main/assets/fonts` and set the two names here; nothing else
 * changes.
 */
export const typography = {
  heading: {
    family: undefined as string | undefined, // 'Rounded'
    weight: '700' as const,
  },
  body: {
    family: undefined as string | undefined, // 'Montserrat'
    weight: '400' as const,
  },
  size: {
    xxs: 10,
    xs: 11,
    sm: 13,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    /** Onboarding hero — "Expert care, anytime, anywhere." */
    display: 30,
  },
} as const;

/** Restrained elevation — subtle, never heavy. */
export const shadow = {
  card: {
    shadowColor: '#0E766C',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  /** The appointment card and other cards that sit on a tinted ground. */
  raised: {
    shadowColor: '#0E766C',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  /** Primary CTA only. */
  floating: {
    shadowColor: '#0E766C',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;

/**
 * Breakpoints, on the shortest edge.
 *
 * Mobile is the first-class experience; `wide` exists so a tablet or a
 * react-native-web desktop window gets a centred column at a comfortable
 * measure instead of a stretched phone layout.
 */
export const breakpoint = {
  /** Below this, drop to the tightest padding (iPhone SE, 320pt). */
  compact: 340,
  /** At or above this, centre the content column. */
  wide: 700,
  /** The measure a phone layout was designed at — never exceeded. */
  maxContentWidth: 520,
} as const;

export const brand = { colors, gradient, radius, spacing, typography, shadow, breakpoint };
export default brand;
