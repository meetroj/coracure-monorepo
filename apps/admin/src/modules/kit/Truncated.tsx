import { Notice } from '../../ui';

/**
 * Said above a live list that holds fewer rows than the backend has. The lists
 * read up to twenty pages of a hundred, then stop, so a screen that silently
 * showed a slice would look complete when it was not.
 */
export function Truncated({ shown, total }: { shown: number; total: number }) {
  if (total <= shown) return null;
  return (
    <Notice tone="warning">
      Showing the newest {shown.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}. Older rows are not loaded
      on this screen.
    </Notice>
  );
}
