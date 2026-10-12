/** Small display helpers shared by the spec screens. */

export const fmtDate = (iso?: string | null): string => (iso ? new Date(iso).toLocaleDateString('en-IN') : '-');

export const fmtDateTime = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

export const inr = (n?: number | null): string => (n == null ? '-' : `₹${n.toLocaleString('en-IN')}`);

/** `lab_allocation_pending` -> `Lab allocation pending`. */
export const words = (s: string): string => {
  const t = s.replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export const opts = (values: readonly string[]): { value: string; label: string }[] =>
  values.map((v) => ({ value: v, label: words(v) }));
