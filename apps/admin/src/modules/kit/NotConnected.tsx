import { EmptyState, PageHeader } from '../../ui';

/**
 * What a screen shows in a live build when it has not been wired to the backend.
 *
 * It exists so a live panel never fills a table with sample rows: the fixtures
 * are a development and test seam, and an admin who sees a provider list in
 * production must be looking at real providers. Pass `title` for a whole
 * section, omit it inside a tab.
 */
export function NotConnected({ title }: { title?: string }) {
  return (
    <>
      {title && <PageHeader title={title} />}
      <EmptyState
        icon="inbox"
        title="Not connected to the backend yet"
        description="This screen has not been wired to the live backend, so it shows nothing rather than sample data."
      />
    </>
  );
}
