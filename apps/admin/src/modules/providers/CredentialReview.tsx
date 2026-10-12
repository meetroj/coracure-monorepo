import { useCallback, useEffect, useState } from 'react';

import { doctors, type DoctorDocument } from '../../api/admin';
import { LIVE } from '../../api/live';
import { isWebUrl } from '../../api/liveProviders';
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
  TableSkeleton,
  humanise,
  may,
} from '../../ui';

/** The review is grouped the way the doctor's registration form is. */
export const SECTIONS: { id: string; title: string; profileTitle: string; types: string[] }[] = [
  // Nothing to approve under Basic details: the profile photo is not a credential, and the
  // backend approves it itself the moment it is uploaded (see AUTOMATIC below).
  { id: 'basic', title: 'Basic details', profileTitle: 'Basic details', types: [] },
  { id: 'identity', title: 'Identity', profileTitle: 'Proof of identity', types: ['identity_proof', 'address_proof'] },
  { id: 'qualification', title: 'Qualifications', profileTitle: 'Qualifications', types: ['degree_certificate'] },
  { id: 'registration', title: 'Professional registration', profileTitle: 'Professional registration', types: ['registration_certificate'] },
  { id: 'experience', title: 'Experience', profileTitle: 'Experience', types: ['experience_letter'] },
  {
    id: 'signature',
    title: 'Signature',
    profileTitle: 'Digital signature',
    types: ['signature', 'prescription_signature', 'digital_signature'],
  },
];

/** Fires once when it first appears: used to say "the list is on screen now", not merely "fetched". */
function Shown({ onShown }: { onShown?: () => void }) {
  useEffect(() => {
    onShown?.();
  }, [onShown]);
  return null;
}

/** The document table's shape, so the card keeps its columns while the list loads. */
export const DocumentTableSkeleton = () => (
  <TableSkeleton
    columns={[
      { kind: 'stack', header: 'Document' },
      { kind: 'status', header: 'Status' },
      { kind: 'button', header: '', align: 'end', width: '280px' },
    ]}
    rows={3}
  />
);

/**
 * Document types nobody reviews: the backend approves them on upload. They are
 * not listed in any section and not under "Other documents" either.
 */
export const AUTOMATIC: readonly string[] = ['profile_photo'];

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
  onLoaded,
  section,
}: {
  doctorId: string;
  level: AdminLevel;
  onReviewed: () => void;
  /**
   * Called when the document list is on screen (documents, or the empty state),
   * so the page can hold its decision until then. A failed load never calls it.
   */
  onLoaded?: () => void;
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
  const [openingId, setOpeningId] = useState<string | null>(null);

  const canReview = may(level, ['clinical_governance', 'operations']);

  const after = (message: string) => {
    toast.success(message);
    state.reload();
    onReviewed();
  };

  /**
   * Live: a short-lived signed link, opened in its own tab. The tab is opened
   * first, inside the click, so a pop-up blocker lets it through; the link
   * is read after. Fixtures hold no file, so they keep the placeholder modal.
   */
  const view = async (d: DoctorDocument) => {
    if (!LIVE) {
      setViewing(d);
      return;
    }
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    setOpeningId(d.id);
    try {
      const { url } = await doctors.downloadUrl(d.id);
      if (!isWebUrl(url)) throw new Error('The backend returned a link that is not a web address.');
      if (tab) tab.location.href = url;
      else window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      tab?.close();
      toast.fromError(e);
    } finally {
      setOpeningId(null);
    }
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
          <Button
            size="sm"
            variant="ghost"
            icon="eye"
            loading={openingId === d.id}
            aria-label={`View ${humanise(d.documentType)}`}
            onClick={() => view(d)}
          >
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
          skeleton={<DocumentTableSkeleton />}
          empty={
            <>
              <EmptyState
                icon="credentials"
                title="No documents uploaded yet"
                description="The doctor uploads these from their own app once they sign in."
              />
              <Shown onShown={onLoaded} />
            </>
          }
        >
          {(rows) => {
            const known = new Set(SECTIONS.flatMap((s) => s.types));
            const other = rows.filter((d) => !known.has(d.documentType) && !AUTOMATIC.includes(d.documentType));
            const groups = [
              ...SECTIONS.filter((s) => !section || s.id === section).map((s) => ({
                title: s.title,
                docs: rows.filter((d) => s.types.includes(d.documentType)),
              })),
              ...(!section && other.length > 0 ? [{ title: 'Other documents', docs: other }] : []),
            ];
            return (
              <>
                {groups.map((g) => (
                  <section key={g.title} className="credGroup">
                    {!section && <h3>{g.title}</h3>}
                    {g.docs.length === 0 ? (
                      <p className="muted">Not uploaded yet.</p>
                    ) : (
                      <Table caption={g.title} columns={columns} rows={g.docs} rowKey={(d) => d.id} />
                    )}
                  </section>
                ))}
                <Shown onShown={onLoaded} />
              </>
            );
          }}
        </Async>
      </Card>

      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing ? humanise(viewing.documentType) : 'Document'}
        width={560}
      >
        {/* Fixtures only: a live build opens the signed link in a tab instead. */}
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
