import { useState } from 'react';

import { careHub, type CareHubItem } from '../../../api/careHub';
import { useMutation } from '../../../lib/useResource';
import { useToast } from '../../../lib/toast';
import type { AdminLevel } from '../../../nav';
import { Button, ConfirmDialog, PermissionGate, may } from '../../../ui';

/**
 * The review-status actions, in one place for the library and the editor.
 *
 * draft -> submit -> in review -> publish -> archived. PUBLISH IS CLINICAL
 * GOVERNANCE ONLY: a `content` admin never sees the button at all (hidden, not
 * disabled). Authors (content + clinical governance) submit and archive.
 */
export function ItemActions({
  item,
  level,
  onDone,
  disabled = false,
}: {
  item: CareHubItem;
  level: AdminLevel;
  onDone: (message: string) => void;
  disabled?: boolean;
}) {
  const toast = useToast();
  const [publishing, setPublishing] = useState(false);
  const run = useMutation((kind: 'submit' | 'publish' | 'archive') => careHub[kind](item.id));
  const canAuthor = may(level, ['content', 'clinical_governance']);

  const go = async (kind: 'submit' | 'publish' | 'archive', message: string) => {
    try {
      await run.mutate(kind);
      onDone(message);
    } catch (e) {
      toast.fromError(e);
    }
  };

  return (
    <>
      {canAuthor && item.status === 'draft' && (
        <Button size="sm" variant="secondary" disabled={disabled} loading={run.busy} onClick={() => go('submit', 'Sent for clinical review.')}>
          Submit for review
        </Button>
      )}

      {/* Only clinical governance sees this, ever. */}
      <PermissionGate level={level} allow={['clinical_governance']}>
        {item.status === 'in_review' && (
          <Button size="sm" variant="success" disabled={disabled} onClick={() => setPublishing(true)}>
            Publish
          </Button>
        )}
      </PermissionGate>

      {canAuthor && item.status === 'published' && (
        <Button size="sm" variant="ghost" disabled={disabled} loading={run.busy} onClick={() => go('archive', 'Archived.')}>
          Archive
        </Button>
      )}

      {publishing && (
        <ConfirmDialog
          open
          busy={run.busy}
          onClose={() => setPublishing(false)}
          variant="success"
          title={`Publish “${item.title}”?`}
          confirmLabel="Publish"
          consequence={
            <>
              This makes the item <strong>visible to every patient</strong> in the app immediately.
              You are signing it off as clinically accurate.
            </>
          }
          onConfirm={async () => {
            await go('publish', 'Published.');
            setPublishing(false);
          }}
        />
      )}
    </>
  );
}
