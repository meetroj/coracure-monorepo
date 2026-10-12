/**
 * The two palettes.
 *
 * *** LIGHT IS THE EXISTING DESIGN, VALUE FOR VALUE. *** Every light value below
 * is either an original brand token or a colour that used to be written into a
 * screen as a hex literal. Moving it here changed where it lives, not what it
 * is, so the light app renders exactly as it did.
 *
 * *** DARK IS DERIVED, NOT A REBRAND. *** Surfaces go dark, text goes light,
 * and the brand greens keep their hue. Only `surfie` changes value, and only as
 * a FOREGROUND: on a dark surface #0E766C is too dark to read, so text and icons
 * use a lighter step of the same green. A brand-coloured FILL uses `brand`,
 * which is #0E766C in both schemes, so a pill or button keeps its colour and its
 * white label keeps its contrast.
 *
 * Colours that sit on a brand-coloured area in both schemes (the Dashboard
 * hero, the video room, the tab bar's centre button) are deliberately NOT here:
 * those screens keep their literals because they look the same in both modes.
 */

export type ColorScheme = 'light' | 'dark';

export type Palette = {
  /** Surfie Green. FOREGROUND brand colour: text, icons, outlines. */
  surfie: string;
  /** The brand FILL: a button, pill or dot painted in brand green. Fixed in both schemes. */
  brand: string;
  cta: string;
  ctaPressed: string;
  paris: string;
  /** Literal white. Text and icons on a coloured fill; never a page or card background. */
  white: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  danger: string;
  /** A danger FILL with white text on it. Fixed in both schemes. */
  dangerFill: string;
  dangerSoft: string;
  warn: string;
  warnSoft: string;
  success: string;
  successSoft: string;
  surface: {
    page: string;
    mint: string;
    mintSoft: string;
    /** Card and sheet background. */
    card: string;
    line: string;
    inputBorder: string;
    selected: string;
  };
  /** Colours that were literals in screens, by the role they play there. */
  ui: {
    /** Card outline and hairline (#E5E7EB). */
    border: string;
    borderStrong: string;
    /** Neutral muted fill: icon wells, chips, dividers (#F3F4F6). */
    muted: string;
    inputBg: string;
    /** Near-white rows and panels. */
    paper: string;
    paper2: string;
    paperWarm: string;
    softA: string;
    softB: string;
    softC: string;
    softD: string;
    softE: string;
    softF: string;
    /** Mint tint fill: icon circles, badges, notes (#EEF8F5). */
    tint: string;
    tint2: string;
    tintStrong: string;
    tintCard: string;
    tintSuccess: string;
    tintTeal: string;
    tintGreen: string;
    tintGreenSoft: string;
    tintMint: string;
    /** Mint outlines. */
    tintBorder: string;
    tintBorder2: string;
    tintBorder3: string;
    tintBorder4: string;
    tintBorder5: string;
    tintBorderGreen: string;
    tintBorderGreen2: string;
    /** Strong body text that used to be hard-coded (#111827). */
    textStrong: string;
    textStrong2: string;
    textSecondary: string;
    textSecondary2: string;
    dotIdle: string;
    /** Danger text and icons (#DC2626) — a foreground. */
    dangerStrong: string;
    /** The same red as a FILL with white text. Fixed. */
    dangerStrongFill: string;
    dangerText: string;
    dangerTextDeep: string;
    dangerTint: string;
    dangerTint2: string;
    dangerTint3: string;
    dangerTint4: string;
    dangerTint5: string;
    dangerPaper: string;
    dangerBorder: string;
    dangerBorder2: string;
    warnTint: string;
    warnTint2: string;
    warnText: string;
    warnSolid: string;
    successSolid: string;
    /** Success text (#059669) — a foreground. */
    successText: string;
    /** The same green as a FILL. Fixed. */
    successFill: string;
    successText2: string;
    successText3: string;
    infoTint: string;
    infoBorder: string;
    /** The translucent highlight behind headline text on the onboarding art. */
    veil: string;
  };
};

export const lightPalette: Palette = {
  surfie: '#0E766C',
  brand: '#0E766C',
  cta: '#10AA80',
  ctaPressed: '#0D8F6B',
  paris: '#34D499',
  white: '#FFFFFF',
  ink: '#1C1C1C',
  inkMuted: '#5A6B67',
  inkFaint: '#6B7E78',
  danger: '#D94A45',
  dangerFill: '#D94A45',
  dangerSoft: '#FDECEB',
  warn: '#E0972B',
  warnSoft: '#FDF4E5',
  success: '#0E766C',
  successSoft: '#E7F7F0',
  surface: {
    page: '#F7FBF9',
    mint: '#EFFDF8',
    mintSoft: '#F2FAF6',
    card: '#FFFFFF',
    line: '#E4EEEA',
    inputBorder: '#D5E4DF',
    selected: '#E7F7F0',
  },
  ui: {
    border: '#E5E7EB',
    borderStrong: '#D1D5DB',
    muted: '#F3F4F6',
    inputBg: '#F9FAFB',
    paper: '#FCFDFD',
    paper2: '#FAFDFB',
    paperWarm: '#FFFBFB',
    softA: '#F0F7F4',
    softB: '#F1F5F3',
    softC: '#F1F3F2',
    softD: '#EEF2F1',
    softE: '#EFF3F1',
    softF: '#E3EBE8',
    tint: '#EEF8F5',
    tint2: '#E6F3EE',
    tintStrong: '#CDEBDF',
    tintCard: '#D8F2E7',
    tintSuccess: '#DEF7EC',
    tintTeal: '#CCFBF1',
    tintGreen: '#DCFCE7',
    tintGreenSoft: '#F0FDF4',
    tintMint: '#ECFDF5',
    tintBorder: '#A7F3D0',
    tintBorder2: '#D4EFE5',
    tintBorder3: '#C7EBE0',
    tintBorder4: '#D8EDE4',
    tintBorder5: '#D1EAE0',
    tintBorderGreen: '#BBF7D0',
    tintBorderGreen2: '#86EFAC',
    textStrong: '#111827',
    textStrong2: '#1F2937',
    textSecondary: '#4B5563',
    textSecondary2: '#374151',
    dotIdle: '#C9D3CF',
    dangerStrong: '#DC2626',
    dangerStrongFill: '#DC2626',
    dangerText: '#991B1B',
    dangerTextDeep: '#7F1D1D',
    dangerTint: '#FEE2E2',
    dangerTint2: '#FEF2F2',
    dangerTint3: '#F6D5D3',
    dangerTint4: '#F7D5D3',
    dangerTint5: '#FBDDDB',
    dangerPaper: '#F0C4C1',
    dangerBorder: '#FECACA',
    dangerBorder2: '#FCA5A5',
    warnTint: '#F5E3C4',
    warnTint2: '#FEF3C7',
    warnText: '#92400E',
    warnSolid: '#F59E0B',
    successSolid: '#10B981',
    successText: '#059669',
    successFill: '#059669',
    successText2: '#16A34A',
    successText3: '#15803D',
    infoTint: '#F0F9FF',
    infoBorder: '#0284C7',
    veil: 'rgba(255,255,255,0.95)',
  },
};

export const darkPalette: Palette = {
  surfie: '#3CC79A',
  brand: '#0E766C',
  cta: '#10AA80',
  ctaPressed: '#0D8F6B',
  paris: '#34D499',
  white: '#FFFFFF',
  ink: '#E9F0ED',
  inkMuted: '#A3B4AF',
  inkFaint: '#83968F',
  danger: '#F07A75',
  dangerFill: '#D94A45',
  dangerSoft: '#3A1F1E',
  warn: '#F2B14E',
  warnSoft: '#3A2F1A',
  success: '#3CC79A',
  successSoft: '#173129',
  surface: {
    page: '#0F1714',
    mint: '#13201C',
    mintSoft: '#141F1C',
    card: '#18221F',
    line: '#26332F',
    inputBorder: '#34433E',
    selected: '#1B3A31',
  },
  ui: {
    border: '#2B3633',
    borderStrong: '#3A4743',
    muted: '#1F2926',
    inputBg: '#141D1A',
    paper: '#18221F',
    paper2: '#17211E',
    paperWarm: '#2A1B1B',
    softA: '#131C19',
    softB: '#17201D',
    softC: '#1C2522',
    softD: '#1C2623',
    softE: '#1E2825',
    softF: '#24302C',
    tint: '#15302A',
    tint2: '#173129',
    tintStrong: '#1F4A3E',
    tintCard: '#173A30',
    tintSuccess: '#173A30',
    tintTeal: '#15403A',
    tintGreen: '#16351F',
    tintGreenSoft: '#132A1D',
    tintMint: '#13302A',
    tintBorder: '#24604F',
    tintBorder2: '#235A4B',
    tintBorder3: '#22574A',
    tintBorder4: '#24433A',
    tintBorder5: '#24463C',
    tintBorderGreen: '#245C3A',
    tintBorderGreen2: '#2E7A4C',
    textStrong: '#EEF3F1',
    textStrong2: '#E6ECEA',
    textSecondary: '#AAB7B3',
    textSecondary2: '#C2CDC9',
    dotIdle: '#3A4743',
    dangerStrong: '#F87171',
    dangerStrongFill: '#DC2626',
    dangerText: '#FCA5A5',
    dangerTextDeep: '#FECACA',
    dangerTint: '#3A1D1D',
    dangerTint2: '#2E1A1A',
    dangerTint3: '#4A2422',
    dangerTint4: '#4A2422',
    dangerTint5: '#432220',
    dangerPaper: '#552B28',
    dangerBorder: '#5B2828',
    dangerBorder2: '#7A3333',
    warnTint: '#4A3A1E',
    warnTint2: '#3A2F14',
    warnText: '#FCD34D',
    warnSolid: '#F59E0B',
    successSolid: '#10B981',
    successText: '#34D399',
    successFill: '#059669',
    successText2: '#4ADE80',
    successText3: '#4ADE80',
    infoTint: '#0F2433',
    infoBorder: '#38BDF8',
    veil: 'rgba(24,34,31,0.92)',
  },
};

export const lightGradient = {
  brand: ['#0E9C7E', '#12B981'] as string[],
  wash: ['#FFFFFF', '#F6FCF9', '#ECF9F3'] as string[],
};

export const darkGradient = {
  brand: ['#0E9C7E', '#12B981'] as string[],
  wash: ['#0F1714', '#111B18', '#13201C'] as string[],
};
