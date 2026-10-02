import { useEffect } from 'react';

/**
 * The header bell and the notifications page both show this admin's inbox. When
 * either marks something read, the other has to notice without a reload, so
 * they share one tiny event rather than a store.
 */
const NAME = 'admin-inbox-changed';

export const inboxChanged = () => window.dispatchEvent(new Event(NAME));

/** Runs `onChange` whenever the inbox changed somewhere else on the page. */
export function useInboxChanged(onChange: () => void) {
  useEffect(() => {
    window.addEventListener(NAME, onChange);
    return () => window.removeEventListener(NAME, onChange);
  }, [onChange]);
}

/** "5 min ago", "3 h ago", "2 d ago" — short enough for a dropdown row. */
export const timeAgo = (iso?: string | null): string => {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  const days = Math.round(mins / (60 * 24));
  return days < 30 ? `${days} d ago` : new Date(iso).toLocaleDateString();
};
