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

/**
 * `colors` and `gradient` are the LIVE theme values (see `./theme`): Light is
 * the brand values below, and `applyColorScheme('dark')` rewrites them in
 * place. The light values are the originals — `surfie` #0E766C (PANTONE 328 C,
 * primary interface colour), `cta` #10AA80 (the brand gradient's midpoint,
 * applied flat), `paris` #34D499 (PANTONE 3385 C), `ink` #1C1C1C, and the
 * surface tints — now defined, with their dark counterparts, in `./palette`.
 */
export {
  colors,
  gradient,
  applyColorScheme,
  getColorScheme,
  getThemeVersion,
  subscribeColorScheme,
  useColorScheme,
  themed,
  themedValue,
  lightPalette,
  darkPalette,
} from './theme';
export type { ColorScheme, Palette } from './theme';
import { colors, gradient } from './theme';

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
 * The guideline specifies "Rounded" (Igor Stepanchenko) for headlines and
 * "Montserrat" (Julieta Ulanovsky) for body, UI labels and buttons.
 *
 * Montserrat is bundled (`assets/fonts`). The Rounded files have not been
 * supplied, so headlines use Outfit - already bundled, and the face the deck
 * used - until they arrive. To switch: add the Rounded TTFs beside the others,
 * register them in both apps (Info.plist + project.pbxproj, MainApplication.kt)
 * and change `heading.family` to 'Rounded'. Nothing else changes.
 *
 * Use `heading` only for headlines (>= 17px). Rounded draws "v" like "u", so
 * small UI text - buttons, chips, labels - must use `body`.
 */
export const typography = {
  heading: {
    family: 'Outfit' as string, // 'Rounded' once its font files are bundled
    weight: '700' as const,
  },
  body: {
    family: 'Montserrat' as string,
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
  /**
   * The whole app column on a tablet, foldable or desktop browser. These
   * screens were drawn for a phone; stretching them to 1200pt turns every card
   * into a letterbox, so the app is centred at phone-plus width instead and
   * the viewport shows page colour either side.
   */
  appMaxWidth: 600,
} as const;

export const brand = { colors, gradient, radius, spacing, typography, shadow, breakpoint };
export default brand;
