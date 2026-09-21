import type { TextStyle } from 'react-native';

/**
 * Shared by doctor and patient, on Android, iOS and web.
 *
 * Per the final Coracure brand guideline: Rounded (by Igor Stepanchenko) for
 * headings/titles, Montserrat (by Julieta Ulanovsky) for body/UI/details.
 * These names must match the PostScript family name baked into whichever
 * font files get bundled natively — see the "needs real font files" note
 * this change ships with.
 */
export const fontFamily = { display: 'Rounded', body: 'Montserrat' } as const;
/**
 * Every weight here has a real font file behind it — `assets/fonts/static`
 * for iOS and `assets/fonts/android/font` for Android, both listed in
 * `assets/fonts/manifest.json`. Adding a weight without its file makes the
 * platform silently fall back to the nearest one, so the two must move
 * together.
 */
export const fontWeight = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

const text = (
  family: 'display' | 'body',
  size: number,
  lineHeight: number,
  weight: keyof typeof fontWeight,
  letterSpacing = 0,
) => ({
  fontFamily: fontFamily[family],
  fontWeight: fontWeight[weight],
  fontSize: size,
  lineHeight,
  letterSpacing,
  flexShrink: 1,
} satisfies TextStyle);

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
  input: text('body', 14, 21, 'regular'),
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
