/**
 * The bridge from `@coracure/brand` to CSS custom properties.
 *
 * `libs/brand` is the single source of truth for every app in this workspace,
 * but it is written for React Native — numbers for spacing, no units. Rather
 * than fork the palette into a `.css` file (where it would drift the first time
 * a token changes), this walks the tokens once at boot and writes them onto
 * `:root`. `styles.css` then refers to `var(--c-cta)` and never holds a hex.
 *
 * Adding a token to `libs/brand` makes it available here with no edit. The only
 * thing this file decides is the naming convention.
 */

import { colors, gradient, radius, spacing, typography } from '@coracure/brand';

/**
 * `colors` is `as const`, so its values are hex literal types and the nested
 * `surface` group widens differently from the flat ones. Erasing both to
 * `string` here is what keeps the walk below one expression instead of two.
 */
const colorEntries = Object.entries(colors) as [string, string | Record<string, string>][];

const vars: Record<string, string> = {
  // Colours. `surface` is the one nested group, flattened to --c-surface-page.
  ...Object.fromEntries(
    colorEntries.flatMap(([key, value]): [string, string][] =>
      typeof value === 'string'
        ? [[`--c-${kebab(key)}`, value]]
        : Object.entries(value).map(([sub, hex]): [string, string] => [
            `--c-${kebab(key)}-${kebab(sub)}`,
            hex,
          ]),
    ),
  ),

  '--c-gradient-brand': `linear-gradient(135deg, ${gradient.brand[0]}, ${gradient.brand[1]})`,

  ...px('space', spacing),
  ...px('radius', radius),
  ...px('text', typography.size),

  /*
   * The deck names Rounded (headings) and Montserrat (body) — the same two
   * `libs/typography` declares. Neither binary exists anywhere in the repo, so
   * both are listed FIRST and fall through to the system stack until the files
   * land. Adding an `@font-face` for either makes it take effect with no change
   * here. The names are repeated rather than imported because
   * `libs/typography` is typed against react-native.
   */
  '--font-heading': `'${typography.heading.family ?? 'Rounded'}', 'Outfit', system-ui, -apple-system, 'Segoe UI', sans-serif`,
  '--font-body': `'${typography.body.family ?? 'Montserrat'}', system-ui, -apple-system, 'Segoe UI', sans-serif`,

  /*
   * The deck's flat Soft Grey. `libs/brand` has no token for it — its surface
   * scale is green-tinted — and the panel needs a quiet neutral for page
   * ground, table headers and read-only rows. Declared here rather than added
   * to `libs/brand`, which the two native apps consume and this work does not
   * own.
   */
  '--c-soft-grey': '#F2F7F5',

  // Brighter approve / reject colours for the panel's decision buttons; the
  // brand tokens (--c-cta, --c-danger) read dull on a white desktop page.
  '--c-action-ok': '#0FA968',
  '--c-action-ok-pressed': '#0B8F58',
  '--c-action-bad': '#E5333A',
  '--c-action-bad-pressed': '#C92A30',

  // Web-only chrome the RN tokens have no equivalent for. Derived from the
  // brand shadow colour so they stay inside the palette.
  '--shadow-card': '0 2px 10px rgba(14, 118, 108, 0.06)',
  '--shadow-raised': '0 6px 18px rgba(14, 118, 108, 0.10)',
  '--sidebar-width': '248px',
  '--header-height': '60px',
};

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

function px(prefix: string, group: Record<string, number>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(group).map(([key, n]) => [`--${prefix}-${kebab(key)}`, `${n}px`]),
  );
}

export const applyBrandTheme = (root: HTMLElement = document.documentElement): void => {
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
};

/** Exported for the spec, so a renamed brand token fails a test not a screen. */
export const brandVars = vars;
