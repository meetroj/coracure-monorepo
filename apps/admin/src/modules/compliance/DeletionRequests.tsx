import { useCallback, useState } from 'react';

import { compliance, type DeletionRequest } from '../../api/admin';
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
  PageHeader,
  StatusBadge,
  Table,
  may,
} from '../../ui';

/**
 * Patient deletion requests (§42).
 *
 * *** TWO DECISIONS, TWO LEVELS, TWO QUEUES. *** Operations REVIEWS a request;
 * super_admin alone EXECUTES it. They are deliberately not on one screen -
 * approving a deletion and destroying the data are separate acts, and putting
 * them behind one button would collapse the control that makes the separation
 * meaningful.
 *
 * `failed` is a real state, so it is shown as one with a retry rather than
 * hidden among the executed.
 */
export function DeletionRequests({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const fetcher = useCallback(() => compliance.deletionRequests(), []);
  const state = useResource<DeletionRequest[]>(fetcher, []);
  const [reviewing, setReviewing] = useState<{ row: DeletionRequest; decision: 'approved' | 'rejected' } | null>(null);
  const [executing, setExecuting] = useState<DeletionRequest | null>(null);

  const review = useMutation(compliance.reviewDeletion);
  const execute = useMutation(compliance.executeDeletion);

  const canReview = may(level, ['operations']);
  // `assertPermission(actor, 'super_admin')` on the backend - nobody else.
  const canExecute = level === 'super_admin';

  const columns: Column<DeletionRequest>[] = [
    {
      key: 'requested',
      header: 'Requested',
      render: (r) => (r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '-'),
    },
    {
      key: 'patient',
      header: 'Patient',
      // The id and nothing more - this screen does not need a name, and a
      // deletion queue is the last place to widen what is on display.
      render: (r) => (r.patientId ? `${r.patientId.slice(0, 8)}…` : '-'),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'note',
      header: 'Review note',
      render: (r) => r.reviewNote ?? <span className="muted">-</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '230px',
      render: (r) => (
        <span className="rowActions">
          {canReview && (r.status === 'requested' || r.status === 'in_review') && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setReviewing({ row: r, decision: 'approved' })}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setReviewing({ row: r, decision: 'rejected' })}
              >
                Reject
              </Button>
            </>
          )}

          {/* Execution appears only for super_admin, and only once approved. */}
          {canExecute && (r.status === 'approved' || r.status === 'failed') && (
            <Button size="sm" variant="danger" onClick={() => setExecuting(r)}>
              {r.status === 'failed' ? 'Retry deletion' : 'Execute'}
            </Button>
          )}
        </span>
      ),
    },
  ];

  const approved = (rows: DeletionRequest[]) =>
    rows.filter((r) => r.status === 'approved' || r.status === 'failed');
  const pending = (rows: DeletionRequest[]) =>
    rows.filter((r) => r.status === 'requested' || r.status === 'in_review');
  const done = (rows: DeletionRequest[]) =>
    rows.filter((r) => r.status === 'executed' || r.status === 'rejected');

  return (
    <>
      <PageHeader
        title="Deletion requests"
        description="Patients exercising their right to erasure. Reviewing and executing are separate decisions by different roles."
      />

      <Notice tone="warning">
        Operations reviews a request; <strong>a super admin alone executes it</strong>. Approval
        does not delete anything - it moves the request into the execution queue below.
      </Notice>

      <Async
        state={state}
        resource="deletion requests"
        empty={
          <EmptyState
            icon="trash"
            title="No deletion requests"
            description="No patient has asked for their data to be erased."
          />
        }
      >
        {(rows) => (
          <>
            <Card title="Awaiting review">
              {pending(rows).length === 0 ? (
                <p className="muted">Nothing awaiting review.</p>
              ) : (
                <Table
                  caption="Awaiting review"
                  columns={columns}
                  rows={pending(rows)}
                  rowKey={(r) => r.id}
                />
              )}
            </Card>

            {/* The execution queue is its own card - a different decision. */}
            <Card title="Approved - awaiting execution">
              {approved(rows).length === 0 ? (
                <p className="muted">Nothing approved and waiting.</p>
              ) : (
                <>
                  {!canExecute && (
                    <p className="muted">
                      These are approved and waiting for a super admin to execute them.
                    </p>
                  )}
                  <Table
                    caption="Awaiting execution"
                    columns={columns}
                    rows={approved(rows)}
                    rowKey={(r) => r.id}
                  />
                </>
              )}
            </Card>

            <Card title="Closed">
              {done(rows).length === 0 ? (
                <p className="muted">Nothing closed yet.</p>
              ) : (
                <Table
                  caption="Closed"
                  columns={columns}
                  rows={done(rows)}
                  rowKey={(r) => r.id}
                />
              )}
            </Card>
          </>
        )}
      </Async>

      <ConfirmDialog
        open={reviewing !== null}
        busy={review.busy}
        onClose={() => setReviewing(null)}
        variant={reviewing?.decision === 'approved' ? 'primary' : 'secondary'}
        title={
          reviewing?.decision === 'approved' ? 'Approve this deletion request?' : 'Reject this request?'
        }
        confirmLabel={reviewing?.decision === 'approved' ? 'Approve' : 'Reject'}
        consequence={
          reviewing?.decision === 'approved' ? (
            <>
              Approving does <strong>not</strong> delete anything. It moves the request into the
              super admin&apos;s execution queue.
            </>
          ) : (
            <>The patient is told the request was declined. Record why below.</>
          )
        }
        reason={{ label: 'Review note' }}
        onConfirm={async (note) => {
          if (!reviewing) return;
          try {
            await review.mutate(reviewing.row.id, reviewing.decision, note);
            toast.success(
              reviewing.decision === 'approved' ? 'Request approved.' : 'Request rejected.',
            );
            state.reload();
          } catch (e) {
            toast.fromError(e);
          }
          setReviewing(null);
        }}
      />

      <ConfirmDialog
        open={executing !== null}
        busy={execute.busy}
        onClose={() => setExecuting(null)}
        variant="danger"
        title="Execute this deletion?"
        confirmLabel="Delete this patient's data"
        consequence={
          <>
            This <strong>permanently destroys the patient&apos;s data</strong>. It cannot be undone
            and it cannot be recovered from a backup once retention has run.
          </>
        }
        typeToConfirm="DELETE"
        onConfirm={async () => {
          if (!executing) return;
          try {
            await execute.mutate(executing.id);
            toast.success('Deletion executed.');
            state.reload();
          } catch (e) {
            toast.fromError(e);
          }
          setExecuting(null);
        }}
      />
    </>
  );
}
