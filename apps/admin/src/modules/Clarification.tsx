import { useCallback, useState } from 'react';

import { clarification, type ClarificationCase, type Expert } from '../api/admin';
import { useMutation, useResource } from '../lib/useResource';
import { useToast } from '../lib/toast';
import type { AdminLevel } from '../nav';
import {
  Async,
  Button,
  Column,
  EmptyState,
  Modal,
  Notice,
  PageHeader,
  StatusBadge,
  Table,
} from '../ui';

/**
 * The case-clarification tracker (§30).
 *
 * *** CASES ARE DE-IDENTIFIED AND MUST STAY THAT WAY. *** Nothing on this
 * screen renders a patient name, a consultation reference or anything else
 * re-identifying, even if a payload happens to carry it — de-identification is
 * the module's whole premise.
 *
 * *** ASSIGNMENT IS THE GRANT. *** Expert seniority alone reveals nothing; it
 * only makes a provider eligible to be asked. Assigning ONE expert to ONE case
 * is what gives them sight of that case, which is why the dialog says so.
 */
export function Clarification({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const fetcher = useCallback(() => clarification.list(), []);
  const state = useResource<ClarificationCase[]>(fetcher, []);
  const [assigning, setAssigning] = useState<ClarificationCase | null>(null);

  const close = useMutation(clarification.close);
  const [closingId, setClosingId] = useState<string | null>(null);

  const columns: Column<ClarificationCase>[] = [
    {
      key: 'case',
      header: 'Case',
      render: (c) => (
        <span className="cellStack">
          {/* The question is clinical text the posting doctor de-identified. */}
          <strong>{c.specialtyName ?? 'Unspecified specialty'}</strong>
          {c.question && <small>{c.question.slice(0, 90)}{c.question.length > 90 ? '…' : ''}</small>}
        </span>
      ),
    },
    {
      key: 'posted',
      header: 'Posted',
      render: (c) => (c.postedAt ? new Date(c.postedAt).toLocaleDateString() : '—'),
    },
    {
      key: 'expert',
      header: 'Assigned expert',
      render: (c) =>
        c.assignedExpertName ?? c.assignedExpertId ? (
          <span>{c.assignedExpertName ?? c.assignedExpertId}</span>
        ) : (
          <span className="muted">Unassigned</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <StatusBadge status={c.status ?? 'open'} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '180px',
      render: (c) => (
        <span className="rowActions">
          {!c.assignedExpertId && (
            <Button size="sm" variant="secondary" onClick={() => setAssigning(c)}>
              Assign expert
            </Button>
          )}
          {c.assignedExpertId && c.status !== 'closed' && (
            <Button
              size="sm"
              variant="secondary"
              loading={closingId === c.id}
              disabled={close.busy && closingId !== c.id}
              onClick={async () => {
                setClosingId(c.id);
                try {
                  await close.mutate(c.id);
                  toast.success('Case closed.');
                  state.reload();
                } catch (e) {
                  toast.fromError(e);
                } finally {
                  setClosingId(null);
                }
              }}
            >
              Close
            </Button>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Clarification cases"
        description="A treating doctor has asked for a second opinion on a de-identified case. Assign one expert."
      />

      <Notice tone="info">
        These cases carry no patient identity by design. Assigning an expert is what grants sight of
        that one case — expert seniority on its own reveals nothing.
      </Notice>

      <Async
        state={state}
        resource="clarification cases"
        empty={
          <EmptyState
            icon="clarify"
            title="No clarification cases"
            description="Nothing has been posted for a second opinion."
          />
        }
      >
        {(rows) => (
          <Table
            caption="Clarification cases"
            columns={columns}
            rows={rows}
            rowKey={(c) => c.id}
          />
        )}
      </Async>

      {assigning && (
        <AssignExpert
          caseRow={assigning}
          onClose={() => setAssigning(null)}
          onAssigned={() => {
            setAssigning(null);
            state.reload();
          }}
        />
      )}
    </>
  );
}

function AssignExpert({
  caseRow,
  onClose,
  onAssigned,
}: {
  caseRow: ClarificationCase;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const toast = useToast();
  const fetcher = useCallback(() => clarification.experts(), []);
  const state = useResource<Expert[]>(fetcher, []);
  const assign = useMutation(clarification.assign);

  const columns: Column<Expert>[] = [
    { key: 'name', header: 'Expert', render: (e) => e.fullName },
    { key: 'specialty', header: 'Specialty', render: (e) => e.specialtyName ?? '—' },
    {
      key: 'pick',
      header: '',
      align: 'end',
      width: '110px',
      render: (e) => (
        <Button
          size="sm"
          variant="secondary"
          loading={assign.busy}
          onClick={async () => {
            try {
              await assign.mutate(caseRow.id, e.doctorId);
              toast.success(`Assigned to ${e.fullName}.`);
              onAssigned();
            } catch (err) {
              toast.fromError(err);
            }
          }}
        >
          Assign
        </Button>
      ),
    },
  ];

  return (
    <Modal open onClose={onClose} title="Assign an expert" width={560}>
      <Notice tone="warning">
        Assigning grants this one expert sight of this one case. It is not a general data grant.
      </Notice>
      <Async
        state={state}
        resource="experts"
        skeletonRows={3}
        empty={
          <EmptyState
            icon="users"
            title="No experts available"
            description="Expert level is granted per doctor from their Regions & seniority tab."
          />
        }
      >
        {(rows) => (
          <Table caption="Experts" columns={columns} rows={rows} rowKey={(e) => e.doctorId} />
        )}
      </Async>
    </Modal>
  );
}
