/**
 * The admin panel is a web app, but `@coracure/brand` re-exports a theme helper
 * (`libs/brand/src/theme.ts`) that imports `StyleSheet` from react-native, and
 * react-native's entry file is Flow, which Vite cannot parse. The panel only
 * reads colour, spacing and type tokens and never calls `themed()`, so this
 * stands in for the one function that file touches.
 *
 * Wired in by `resolve.alias` in `vite.config.mts`. Types still come from the
 * real package, so nothing here changes what type-checks.
 */
export const StyleSheet = {
  create: <T>(styles: T): T => styles,
  flatten: <T>(style: T): T => style,
};
