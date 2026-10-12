/**
 * Whether the panel is talking to a real backend.
 *
 * True in a production build, always, and in development when `VITE_API_URL` is
 * set (in `.env.local`). A production build therefore cannot fall back to
 * fixtures: it has no mock sign-in and no sample rows, whatever the build
 * environment forgot to set.
 *
 * Unset in development - a plain `vite` run - and in every test, the panel keeps
 * running on fixtures, so a screen that has not been wired yet still works while
 * the ones that have are live.
 *
 * `MODE !== 'test'` is deliberate: Vite loads `.env.local` under vitest too, and
 * a developer who points the panel at a backend must not silently turn the unit
 * tests into network tests.
 */
export const LIVE: boolean =
  import.meta.env.MODE !== 'test' && (Boolean(import.meta.env.VITE_API_URL) || import.meta.env.PROD);
