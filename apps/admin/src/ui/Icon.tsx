/**
 * One icon system for the panel (§63).
 *
 * Outline, monoline, rounded caps and joins, all drawn on the same 24×24 grid
 * at a 1.8 stroke — the construction rule in the brand deck. `currentColor`
 * throughout, so an icon takes the colour of whatever it sits in rather than
 * carrying a palette of its own.
 *
 * Hand-drawn rather than pulled from a package: the set is small, the deck is
 * specific about construction, and a dependency would bring a few hundred
 * glyphs in a style that is not this one.
 */

const P = {
  /* navigation + chrome */
  dashboard: 'M4 4h6v7H4zM14 4h6v4h-6zM14 12h6v8h-6zM4 15h6v5H4z',
  providers: 'M9 4.5a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4M2.8 20c.6-3.5 3-5.4 6.2-5.4s5.6 1.9 6.2 5.4M16.4 5.2a3 3 0 0 1 0 5.6M18 14.6c1.9.7 3.1 2.5 3.4 5',
  credentials: 'M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5ZM13.5 3.6V8h4.4M9.5 14.2l1.9 1.9 3.4-3.6',
  calendar: 'M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 3.5v4M15.5 3.5v4',
  consultations: 'M4 5.5h16v10H8.5L4 19z',
  alert: 'M12 4.2 2.8 20h18.4zM12 10v4M12 17.2v.1',
  clipboard: 'M9 4.5h6M8 5.5H6.5A1.5 1.5 0 0 0 5 7v12a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V7a1.5 1.5 0 0 0-1.5-1.5H16M9 3.5h6v3H9z',
  clarify: 'M4 5.5h16v10h-8l-4 3.5v-3.5H4zM9 10.5h.1M12 10.5h.1M15 10.5h.1',
  route: 'M6 20V9a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3M6 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4M18 21.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  payments: 'M2.5 7.5h19v10h-19zM2.5 11h19M6 15h3',
  catalogue: 'M4 6h16M4 12h16M4 18h16M4 6h.01M4 12h.01M4 18h.01',
  content: 'M5 3.5h14v17l-7-3.5-7 3.5z',
  bell: 'M12 3.5a5.5 5.5 0 0 0-5.5 5.5c0 5-2 6.5-2 6.5h15s-2-1.5-2-6.5A5.5 5.5 0 0 0 12 3.5M10.3 19a2 2 0 0 0 3.4 0',
  search: 'M11 4.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13M20 20l-4.4-4.4',
  pathway: 'M12 3.5v17M12 8.5H7a2 2 0 0 0-2 2v2M12 14.5h5a2 2 0 0 1 2 2v2',
  legal: 'M12 4v16M5 8h14M7.5 8 5 14h5zM16.5 8 14 14h5z',
  settings:
    'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 12h-.3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V1a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1.1Z',
  audit: 'M6 3.5h9l4 4v13H6zM14 3.6V8h4.3M9 12h7M9 15.5h7M9 8.5h2',
  trash: 'M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5 7.4 20h9.2l.9-13.5M10.5 10v6M13.5 10v6',
  shieldCheck: 'M12 3.2 5 6v5.5c0 4.2 2.9 7.4 7 9.3 4.1-1.9 7-5.1 7-9.3V6ZM9.2 12l2 2 3.6-3.8',
  users: 'M9 4.5a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4M2.8 20c.6-3.5 3-5.4 6.2-5.4s5.6 1.9 6.2 5.4',
  /* actions */
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5 10 17.5 19 7',
  close: 'M6 6l12 12M18 6 6 18',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  refresh: 'M20 11a8 8 0 1 0-.7 4.4M20 5.5V11h-5.5',
  download: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15',
  edit: 'M5 19h3l9.5-9.5a2.1 2.1 0 0 0-3-3L5 16z',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6',
  lock: 'M4 10.5h16v10H4zM8 10.5V7a4 4 0 1 1 8 0v3.5',
  info: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17M12 11v5.5M12 7.8v.1',
  inbox: 'M3.5 13.5h4l1.5 3h6l1.5-3h4M3.5 13.5 6 5h12l2.5 8.5v5.5h-17z',
  clock: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17M12 7v5.2l3.2 2',
  send: 'M20.5 3.5 10.5 13.5M20.5 3.5 14 20.5l-3.5-7-7-3.5z',
  note: 'M5 3.5h14v17H5zM8.5 8h7M8.5 12h7M8.5 16h4',
  signOut: 'M15 7.5V5.5a1.5 1.5 0 0 0-1.5-1.5h-7A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h7a1.5 1.5 0 0 0 1.5-1.5v-2M10 12h10M17 9l3 3-3 3',
  chevronDown: 'M6 9.5l6 6 6-6',
  more: 'M12 6.5v.1M12 12v.1M12 17.5v.1',
} as const;

export type IconName = keyof typeof P;

export function Icon({
  name,
  size = 18,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={P[name]} />
    </svg>
  );
}
