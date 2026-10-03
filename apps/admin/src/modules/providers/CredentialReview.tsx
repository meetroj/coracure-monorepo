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
  Modal,
  Notice,
  StatusBadge,
  Table,
  humanise,
  may,
} from '../../ui';

/** The review is grouped the way the doctor's registration form is. */
export const SECTIONS: { id: string; title: string; types: string[] }[] = [
  // Nothing to approve here: the profile photo is not a reviewed document.
  { id: 'basic', title: 'Basic details', types: [] },
  { id: 'identity', title: 'Proof of identity', types: ['identity_proof', 'address_proof'] },
  // Two uploads cover the whole qualification section - never one per degree.
  {
    id: 'qualification',
    title: 'Professional qualifications',
    types: ['degree_certificate', 'registration_certificate'],
  },
  { id: 'experience', title: 'Experience', types: ['experience_letter'] },
  {
    id: 'signature',
    title: 'Digital signature',
    types: ['signature', 'prescription_signature', 'digital_signature'],
  },
];

/**
 * One provider's credentials, reviewed a document at a time (§17).
 *
 * *** THE REJECTION REASON IS SHOWN TO THE DOCTOR, VERBATIM. *** It is not an
 * internal note, and the dialog says so - a reviewer who thinks otherwise
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
  section,
}: {
  doctorId: string;
  level: AdminLevel;
  onReviewed: () => void;
  /** A SECTIONS id: show only that group. Omitted, every group is shown. */
  section?: string;
}) {
  const toast = useToast();
  const fetcher = useCallback(() => doctors.credentials(doctorId), [doctorId]);
  const state = useResource<DoctorDocument[]>(fetcher, [doctorId]);
  const review = useMutation(doctors.reviewCredential);
  const [rejecting, setRejecting] = useState<DoctorDocument | null>(null);
  const [viewing, setViewing] = useState<DoctorDocument | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

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
      width: '280px',
      render: (d) => (
        <span className="rowActions">
          <Button size="sm" variant="ghost" icon="eye" aria-label={`View ${humanise(d.documentType)}`} onClick={() => setViewing(d)}>
            View
          </Button>
          {canReview && d.status === 'pending' ? (
          <>
            {/* Approve and Reject are visually separate (§17). */}
            <Button
              size="sm"
              variant="success"
              icon="check"
              loading={approvingId === d.id}
              disabled={review.busy && approvingId !== d.id}
              onClick={async () => {
                setApprovingId(d.id);
                try {
                  await review.mutate(d.id, true);
                  after(`${humanise(d.documentType)} approved.`);
                } catch (e) {
                  toast.fromError(e);
                } finally {
                  setApprovingId(null);
                }
              }}
            >
              Approve
            </Button>
            <Button size="sm" variant="danger" onClick={() => setRejecting(d)}>
              Reject
            </Button>
          </>
          ) : (
            <span className="muted small">{d.reviewedAt ? 'Reviewed' : canReview ? '-' : 'View only'}</span>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <Card title={section ? 'Documents' : 'Credentials'}>
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
              description="The doctor uploads these from their own app once they sign in."
            />
          }
        >
          {(rows) => {
            const known = new Set(SECTIONS.flatMap((s) => s.types));
            const other = rows.filter((d) => !known.has(d.documentType));
            const groups = [
              ...SECTIONS.filter((s) => !section || s.id === section).map((s) => ({
                title: s.title,
                docs: rows.filter((d) => s.types.includes(d.documentType)),
              })),
              ...(!section && other.length > 0 ? [{ title: 'Other documents', docs: other }] : []),
            ];
            return groups.map((g) => (
              <section key={g.title} className="credGroup">
                {!section && <h3>{g.title}</h3>}
                {g.docs.length === 0 ? (
                  <p className="muted">Not uploaded yet.</p>
                ) : (
                  <Table caption={g.title} columns={columns} rows={g.docs} rowKey={(d) => d.id} />
                )}
              </section>
            ));
          }}
        </Async>
      </Card>

      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing ? humanise(viewing.documentType) : 'Document'}
        width={560}
      >
        {/* ponytail: the mock holds no file bytes; live needs a signed download-url endpoint. */}
        <p className="muted">
          Preview of {viewing ? humanise(viewing.documentType) : 'document'} (file {viewing?.fileId ?? 'on record'}).
        </p>
      </Modal>

      <ConfirmDialog
        open={rejecting !== null}
        busy={review.busy}
        onClose={() => setRejecting(null)}
        title={rejecting ? `Reject ${humanise(rejecting.documentType)}?` : 'Reject document'}
        confirmLabel="Reject document"
        consequence={
          <>
            The provider can re-upload this document. Only this document is rejected -{' '}
            <strong>the provider’s own status does not change</strong>.
          </>
        }
        reason={{
          label: 'What the doctor must fix',
          hint: (
            <>
              <strong>Shown to the doctor word for word.</strong> Write instructions they can act
              on, e.g. “the registration certificate is cropped - re-upload the full page”.
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
