/**
 * Skeleton tokens.
 *
 * Deliberately pale: a skeleton is a placeholder, not content. Dark grey
 * blocks read as broken UI, and a strong gradient pulls the eye to the thing
 * that is *not* there yet.
 */
export const skeleton = {
  /** The placeholder body. */
  base: '#E8F1EF',
  /** The shimmer band that sweeps across it. */
  highlight: '#F6FAF9',
  /** For placeholders sitting on a white card that needs a touch more presence. */
  tint: '#E8F8F2',
} as const;

/** One sweep, left to right. Slow enough to read as "working", not "flashing". */
export const SHIMMER_MS = 1600;

/**
 * Below this, a response is fast enough that showing a skeleton would be a
 * flash of layout rather than a loading cue.
 */
export const SKELETON_DELAY_MS = 120;

/**
 * Once a skeleton *is* on screen it stays at least this long, so a response
 * landing at 130ms does not produce a 10ms blink.
 */
export const SKELETON_MIN_MS = 450;

/** How long cached data is served before a background refresh is kicked off. */
export const STALE_AFTER_MS = 30_000;
