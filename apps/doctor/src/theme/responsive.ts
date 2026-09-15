import { useWindowDimensions, PixelRatio, Platform } from 'react-native';

/**
 * One place that answers "how much room do we actually have?".
 *
 * The doctor app ships to everything from a 320 pt iPhone SE to a 1024 pt
 * tablet, and Android OEMs land all over that range. Rather than sprinkle
 * `Dimensions.get` around, screens ask this hook and get a gutter, a content
 * width and a density flag that already account for the device.
 *
 * The reference width is 375 pt — the iPhone that most of these layouts were
 * drawn against.
 */

const BASE_WIDTH = 375;

export const BREAKPOINTS = {
  /** iPhone SE 1st gen, Android Go devices. Everything must survive here. */
  small: 360,
  /** The bulk of phones: iPhone 12–16, Pixel, most Samsungs. */
  regular: 414,
  /** Plus/Max phones and small foldables. */
  large: 600,
} as const;

export type SizeClass = 'small' | 'regular' | 'large' | 'tablet';

/**
 * Beyond this a single column of clinical text is uncomfortable to read, so
 * content is capped and centred rather than stretched across a tablet.
 */
export const MAX_CONTENT_WIDTH = 560;

/**
 * The ceiling we want on OS font scaling: past ~1.4x the compact rows collapse
 * and clinical values start truncating.
 *
 * NOT applied globally. React 19 removed `defaultProps` on function
 * components, so the usual `Text.defaultProps.maxFontSizeMultiplier` trick is
 * a silent no-op. Pass this to `maxFontSizeMultiplier` on a Text that must not
 * grow, or introduce a shared Text wrapper if we want it everywhere.
 */
export const MAX_FONT_SCALE = 1.4;

export const sizeClassFor = (width: number): SizeClass =>
  width < BREAKPOINTS.small ? 'small'
  : width < BREAKPOINTS.regular ? 'regular'
  : width < BREAKPOINTS.large ? 'large'
  : 'tablet';

/**
 * Linear scale against the reference width, damped by `factor` so type and
 * spacing grow more slowly than the screen. Rounded to the device pixel grid
 * to avoid blurry hairlines.
 */
export const scale = (size: number, width: number, factor = 0.5) => {
  const ratio = width / BASE_WIDTH;
  const scaled = size + (size * ratio - size) * factor;
  return PixelRatio.roundToNearestPixel(scaled);
};

export type Responsive = {
  width: number;
  height: number;
  sizeClass: SizeClass;
  isSmall: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  /** Horizontal page margin. Tightens on small screens, opens up on tablets. */
  gutter: number;
  /** Usable width inside the gutters, after the tablet cap. */
  contentWidth: number;
  /** Damped scale helper bound to this screen. */
  ms: (size: number, factor?: number) => number;
  /** True where a two-up row would leave each half under ~140 pt. */
  stackPairs: boolean;
};

export const useResponsive = (): Responsive => {
  const { width, height } = useWindowDimensions();
  const sizeClass = sizeClassFor(width);
  const isSmall = sizeClass === 'small';
  const isTablet = sizeClass === 'tablet';

  const gutter = isSmall ? 12 : isTablet ? 24 : 16;
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH) - gutter * 2;

  return {
    width,
    height,
    sizeClass,
    isSmall,
    isTablet,
    isLandscape: width > height,
    gutter,
    contentWidth,
    ms: (size, factor = 0.5) => scale(size, Math.min(width, MAX_CONTENT_WIDTH), factor),
    // below this a side-by-side pair is narrower than a readable currency value
    stackPairs: contentWidth < 300,
  };
};

/**
 * Android measures elevation separately from iOS shadows; keeping the mapping
 * here stops each screen inventing its own.
 */
export const elevation = (level: number) =>
  Platform.select({
    android: { elevation: level },
    default: {
      shadowColor: '#0E766C',
      shadowOpacity: 0.06 + level * 0.01,
      shadowRadius: level * 2,
      shadowOffset: { width: 0, height: Math.ceil(level / 2) },
    },
  });
