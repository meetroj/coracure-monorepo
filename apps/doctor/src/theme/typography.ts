import type { TextStyle } from 'react-native';

/**
 * The doctor app's type roles.
 *
 * The scale is the one in `libs/typography`; the families are not. That lib
 * names Rounded and Montserrat, which no build of this app bundles, so iOS
 * silently drew every string in the system font. Outfit (display) and Inter
 * (body) are the faces the app actually ships — listed in Info.plist
 * (UIAppFonts) and registered by MainApplication on Android, from the same
 * `assets/fonts` files the web build serves. The lib is left alone because
 * the patient app still reads it.
 */
export const fontFamily = { display: 'Outfit', body: 'Inter' } as const;

/** Every weight here has a bundled file behind it (300–700). */
export const fontWeight = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * The smallest size any text may render at. Below this a label stops being
 * readable at arm's length, which is where a clinician holds a phone.
 */
export const MIN_FONT_SIZE = 11;

/**
 * How far OS text scaling may grow a string. Fixed-height rows and chips fall
 * apart past this; body copy in scroll views is still allowed to reflow.
 */
export const MAX_FONT_SCALE = 1.4;

const text = (
  family: 'display' | 'body',
  size: number,
  lineHeight: number,
  weight: keyof typeof fontWeight,
  letterSpacing = 0
) =>
  ({
    fontFamily: fontFamily[family],
    fontWeight: fontWeight[weight],
    fontSize: Math.max(MIN_FONT_SIZE, size),
    lineHeight,
    letterSpacing,
    flexShrink: 1,
  }) satisfies TextStyle;

/** Mobile-first roles. Text never shrinks with the viewport to fit a row. */
export const typeStyles = {
  pageTitle: text('display', 24, 31, 'bold', -0.3),
  sectionTitle: text('display', 18, 25, 'semibold', -0.1),
  cardTitle: text('display', 15, 21, 'semibold'),
  name: text('display', 15, 21, 'medium'),
  body: text('body', 14, 21, 'regular'),
  bodySmall: text('body', 13, 19, 'regular'),
  caption: text('body', 12, 18, 'regular'),
  label: text('body', 13, 19, 'medium'),
  status: text('body', 12, 18, 'medium'),
  /** Multiline inputs: a line height keeps wrapped clinical text readable. */
  input: text('body', 14, 21, 'regular'),
  /**
   * Single-line inputs. No line height: iOS draws a single-line TextInput's
   * text against the line box, so a fixed `lineHeight` pushed the digits
   * below the centre of the field and out of line with a "+91" or "₹" beside
   * it.
   */
  inputSingle: {
    fontFamily: fontFamily.body,
    fontWeight: fontWeight.regular,
    fontSize: 15,
    paddingVertical: 0,
    includeFontPadding: false,
  } satisfies TextStyle,
  helper: text('body', 12, 18, 'regular'),
  button: text('display', 14, 20, 'medium'),
  buttonSmall: text('display', 13, 19, 'medium'),
  navigation: text('display', 11, 16, 'medium'),
  metric: { ...text('display', 24, 31, 'semibold'), fontVariant: ['tabular-nums'] } satisfies TextStyle,
  metricSmall: { ...text('display', 18, 25, 'medium'), fontVariant: ['tabular-nums'] } satisfies TextStyle,
  number: { ...text('display', 13, 19, 'medium'), fontVariant: ['tabular-nums'] } satisfies TextStyle,
  avatar: text('display', 15, 21, 'medium'),
} as const;

/** Compatibility scale for layout consumers; new text styles use semantic roles. */
export const typography = {
  heading: { family: fontFamily.display, weight: fontWeight.semibold },
  body: { family: fontFamily.body, weight: fontWeight.regular },
  size: { xxs: 12, xs: 13, sm: 14, md: 15, lg: 18, xl: 21, xxl: 24, xxxl: 28 },
  styles: typeStyles,
} as const;
