/**
 * Coracure brand tokens — single source of truth.
 *
 * Values come from "CORACURE - BRAND GUIDELINES.pdf" (2026 rebrand), which is
 * the final authority. Only `surfie` and `paris` are brand colours.
 * Everything under `surface`, `ink`, `warn` and `danger` is UI chrome or a
 * semantic state colour — never a third brand hue, and never applied to the
 * logo.
 *
 * NOTE: designed to be lifted verbatim into `libs/brand` so `patient`
 * consumes the same module instead of duplicating it.
 */

export const colors = {
  /** Surfie Green — PANTONE 328 C. Primary interface colour. */
  surfie: '#0E766C',
  /** Paris Green — PANTONE 3385 C. Secondary accents, active/success. */
  paris: '#34D499',

  white: '#FFFFFF',
  /** Near black, per the brand deck's mono lockups. */
  ink: '#1C1C1C',
  inkMuted: '#5A6B67',
  inkFaint: '#8A9995',

  /** Genuine errors, rejected verification, cancellations, clinical red flags. */
  danger: '#D94A45',
  dangerSoft: '#FDECEB',
  /** Pending, warning, follow-up-required only. */
  warn: '#E0972B',
  warnSoft: '#FDF4E5',
  /** Success / verified. */
  success: '#0E766C',
  successSoft: '#E7F7F0',

  /**
   * Category tints for the clinical-task grid only.
   *
   * NOTE: blue and violet are outside the two-colour brand palette. They are
   * used solely to distinguish task types at a glance, per an explicit design
   * request, and never on the logo, headers, buttons or any brand surface.
   */
  task: {
    blueBg: '#EAF1FC',
    blueFg: '#3E6DB5',
    greenBg: '#E7F7F0',
    greenFg: '#0E766C',
    amberBg: '#FDF4E5',
    amberFg: '#C07C1B',
    violetBg: '#F0EDFB',
    violetFg: '#6B5BB5',
  },

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

import { typography } from './typography';
export { typography } from './typography';

/** Restrained elevation — subtle, never heavy. */
export const shadow = {
  card: {
    shadowColor: '#0E766C',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
} as const;

export const brand = { colors, radius, spacing, typography, shadow };
export default brand;
