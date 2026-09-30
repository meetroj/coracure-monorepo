import { useCallback, useState } from 'react';

import { doctors, type DoctorDocument } from '../../api/admin';
import { useMutation, useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Card,
  Column,
  ConfirmDialog,
  EmptyState,
  Notice,
  StatusBadge,
  Table,
  humanise,
  may,
} from '../../ui';

/**
 * One provider's credentials, reviewed a document at a time (§17).
 *
 * *** THE REJECTION REASON IS SHOWN TO THE DOCTOR, VERBATIM. *** It is not an
 * internal note, and the dialog says so — a reviewer who thinks otherwise
 * writes the wrong thing. Maximum 255 characters, enforced by the backend's
 * `ReviewCredentialDto`.
 *
 * Rejecting a document does NOT reject the provider. Those are separate
 * actions at different levels, so Approve and Reject sit here and the
 * provider-level decision stays in the page header.
 */
export function CredentialReview({
  doctorId,
  level,
  onReviewed,
}: {
  doctorId: string;
  level: AdminLevel;
  onReviewed: () => void;
}) {
  const toast = useToast();
  const fetcher = useCallback(() => doctors.credentials(doctorId), [doctorId]);
  const state = useResource<DoctorDocument[]>(fetcher, [doctorId]);
  const review = useMutation(doctors.reviewCredential);
  const [rejecting, setRejecting] = useState<DoctorDocument | null>(null);

  const canReview = may(level, ['clinical_governance', 'operations']);

  const after = (message: string) => {
    toast.success(message);
    state.reload();
    onReviewed();
  };

  const columns: Column<DoctorDocument>[] = [
    {
      key: 'type',
      header: 'Document',
      render: (d) => (
        <span className="cellStack">
          <strong>{humanise(d.documentType)}</strong>
          {d.rejectionReason && <small>Rejected: {d.rejectionReason}</small>}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '210px',
      render: (d) =>
        canReview && d.status === 'pending' ? (
          <span className="rowActions">
            {/* Approve and Reject are visually separate (§17). */}
            <Button
              size="sm"
              variant="success"
              icon="check"
              loading={review.busy}
              onClick={async () => {
                try {
                  await review.mutate(d.id, true);
                  after(`${humanise(d.documentType)} approved.`);
                } catch (e) {
                  toast.fromError(e);
                }
              }}
            >
              Approve
            </Button>
            <Button size="sm" variant="danger" onClick={() => setRejecting(d)}>
              Reject
            </Button>
          </span>
        ) : (
          <span className="muted small">
            {d.reviewedAt ? 'Reviewed' : canReview ? '—' : 'View only'}
          </span>
        ),
    },
  ];

  return (
    <>
      <Card title="Credentials">
        <Notice tone="info">
          Reviewing a document does not verify the provider. Verification is a separate clinical
          decision, taken from the buttons at the top of this page.
        </Notice>

        <Async
          state={state}
          resource="credentials"
          skeletonRows={3}
          empty={
            <EmptyState
              icon="credentials"
              title="No documents uploaded yet"
              description="The provider uploads these from their own app once they sign in."
            />
          }
        >
          {(rows) => (
            <Table caption="Credentials" columns={columns} rows={rows} rowKey={(d) => d.id} />
          )}
        </Async>
      </Card>

      <ConfirmDialog
        open={rejecting !== null}
        busy={review.busy}
        onClose={() => setRejecting(null)}
        title={rejecting ? `Reject ${humanise(rejecting.documentType)}?` : 'Reject document'}
        confirmLabel="Reject document"
        consequence={
          <>
            The provider can re-upload this document. Only this document is rejected —{' '}
            <strong>the provider’s own status does not change</strong>.
          </>
        }
        reason={{
          label: 'What the provider must fix',
          hint: (
            <>
              <strong>Shown to the provider word for word.</strong> Write instructions they can act
              on, e.g. “the registration certificate is cropped — re-upload the full page”.
            </>
          ),
          maxLength: 255,
        }}
        onConfirm={async (reason) => {
          if (!rejecting) return;
          try {
            await review.mutate(rejecting.id, false, reason);
            after(`${humanise(rejecting.documentType)} rejected.`);
          } catch (e) {
            toast.fromError(e);
          }
          setRejecting(null);
        }}
      />
    </>
  );
}
