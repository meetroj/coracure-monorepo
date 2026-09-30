import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { support, type Complaint } from '../../api/admin';
import { useMutation, useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Card,
  ConfirmDialog,
  DefinitionList,
  Notice,
  PageHeader,
  StatusBadge,
  TextArea,
  humanise,
} from '../../ui';

/**
 * One complaint, with the FULL thread (§40).
 *
 * *** A REPLY HAS TWO AUDIENCES AND THE DIFFERENCE MUST BE UNMISSABLE. ***
 * A patient-visible reply reaches their app; an internal note does not. The
 * admin sees every message; the patient sees only what was shared. Getting
 * this wrong sends an internal remark about a doctor to the patient who
 * complained about them, so the composer makes the audience an explicit,
 * two-option choice with the send button restating it.
 *
 * *** RESOLVED AND REJECTED ARE BOTH TERMINAL AND THEY ARE DIFFERENT. ***
 * "We looked and disagreed" is not "we fixed it", and the patient is owed the
 * distinction — two buttons, each demanding an outcome note.
 */
export function ComplaintDetail({ level }: { level: AdminLevel }) {
  const { complaintId = '' } = useParams();
  const fetcher = useCallback(() => support.complaint(complaintId), [complaintId]);
  const state = useResource<Complaint>(fetcher, [complaintId]);

  return (
    <Async state={state} resource="this complaint">
      {(complaint) => <Detail complaint={complaint} onChanged={state.reload} />}
    </Async>
  );
}

function Detail({ complaint, onChanged }: { complaint: Complaint; onChanged: () => void }) {
  const toast = useToast();
  const [body, setBody] = useState('');
  const [visibleToPatient, setVisibleToPatient] = useState(true);
  const [closing, setClosing] = useState<'resolved' | 'rejected' | null>(null);

  const assign = useMutation(support.assign);
  const reply = useMutation(support.reply);
  const close = useMutation(support.close);

  const terminal = complaint.status === 'resolved' || complaint.status === 'rejected';

  return (
    <>
      <PageHeader
        title={complaint.subject ?? humanise(complaint.category)}
        back={{ to: '/complaints', label: 'Complaints' }}
        crumbs={[{ label: 'Complaints', to: '/complaints' }, { label: 'Detail' }]}
        description={
          <span className="row">
            <StatusBadge status={complaint.status} />
            <StatusBadge status={complaint.category} tone="neutral" />
          </span>
        }
        actions={
          !terminal && (
            <>
              {/* Assign is the first action on an open ticket — it stops two
                  admins answering the same complaint. */}
              {!complaint.assignedAdminId && (
                <Button
                  variant="primary"
                  loading={assign.busy}
                  onClick={async () => {
                    try {
                      await assign.mutate(complaint.id);
                      toast.success('Assigned to you.');
                      onChanged();
                    } catch (e) {
                      toast.fromError(e);
                    }
                  }}
                >
                  Pick this up
                </Button>
              )}
              <Button variant="success" onClick={() => setClosing('resolved')}>
                Resolve
              </Button>
              <Button variant="danger" onClick={() => setClosing('rejected')}>
                Reject
              </Button>
            </>
          )
        }
      />

      <Card title="Complaint">
        <DefinitionList
          items={[
            { label: 'Category', value: humanise(complaint.category) },
            { label: 'Status', value: <StatusBadge status={complaint.status} /> },
            {
              label: 'Raised',
              value: complaint.raisedAt ? new Date(complaint.raisedAt).toLocaleString() : null,
            },
            {
              label: 'Consultation',
              value: complaint.consultationId ? (
                <Link to={`/consultations/${complaint.consultationId}`}>
                  Open the consultation
                </Link>
              ) : null,
            },
          ]}
        />
      </Card>

      <Card title="Thread">
        <Notice tone="info">
          You are seeing the full thread. The patient sees only the messages marked as shared with
          them.
        </Notice>

        {(complaint.messages ?? []).length === 0 ? (
          <p className="muted">No messages yet.</p>
        ) : (
          <ul className="thread">
            {(complaint.messages ?? []).map((m) => (
              <li
                key={m.id}
                className={m.visibleToPatient ? 'thread__msg' : 'thread__msg thread__msg--internal'}
              >
                <div className="thread__meta">
                  <StatusBadge
                    status={m.visibleToPatient ? 'published' : 'draft'}
                    label={m.visibleToPatient ? 'Sent to patient' : 'Internal note'}
                    tone={m.visibleToPatient ? 'positive' : 'neutral'}
                  />
                  <span className="muted small">
                    {m.authorType ? humanise(m.authorType) : 'Admin'}
                    {m.createdAt ? ` · ${new Date(m.createdAt).toLocaleString()}` : ''}
                  </span>
                </div>
                <p>{m.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {!terminal && (
        <Card title="Reply">
          {/*
            The audience picker. Two explicit radio options rather than a
            checkbox, because a checkbox has a default the writer can miss, and
            the cost of missing it is an internal note reaching the patient.
          */}
          <fieldset className="audience">
            <legend>Who will see this?</legend>

            <label className={visibleToPatient ? 'audience__opt isActive' : 'audience__opt'}>
              <input
                type="radio"
                name="audience"
                checked={visibleToPatient}
                onChange={() => setVisibleToPatient(true)}
              />
              <span>
                <strong>Reply to the patient</strong>
                <small>Appears in their app. Write it to be read by them.</small>
              </span>
            </label>

            <label className={!visibleToPatient ? 'audience__opt isActive' : 'audience__opt'}>
              <input
                type="radio"
                name="audience"
                checked={!visibleToPatient}
                onChange={() => setVisibleToPatient(false)}
              />
              <span>
                <strong>Internal note</strong>
                <small>Stays on the file. The patient never sees it.</small>
              </span>
            </label>
          </fieldset>

          <TextArea
            label={visibleToPatient ? 'Message to the patient' : 'Internal note'}
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <div className="formActions">
            <Button
              variant={visibleToPatient ? 'primary' : 'secondary'}
              icon={visibleToPatient ? 'send' : 'note'}
              loading={reply.busy}
              disabled={!body.trim()}
              onClick={async () => {
                try {
                  await reply.mutate(complaint.id, body.trim(), visibleToPatient);
                  toast.success(
                    visibleToPatient ? 'Reply sent to the patient.' : 'Internal note saved.',
                  );
                  setBody('');
                  onChanged();
                } catch (e) {
                  toast.fromError(e);
                }
              }}
            >
              {/* The button restates the audience — the last chance to catch it. */}
              {visibleToPatient ? 'Send to patient' : 'Save internal note'}
            </Button>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={closing !== null}
        busy={close.busy}
        onClose={() => setClosing(null)}
        variant={closing === 'rejected' ? 'danger' : 'success'}
        title={closing === 'rejected' ? 'Reject this complaint?' : 'Resolve this complaint?'}
        confirmLabel={closing === 'rejected' ? 'Reject complaint' : 'Resolve complaint'}
        consequence={
          closing === 'rejected' ? (
            <>
              Rejecting records that the complaint was <strong>considered and declined</strong> —
              which is a different outcome from being fixed, and the patient is owed that
              distinction.
            </>
          ) : (
            <>Resolving records that something was actually done about the complaint.</>
          )
        }
        reason={{
          label: 'Outcome note',
          hint: 'What was decided and why. Recorded against the complaint.',
        }}
        onConfirm={async (note) => {
          if (!closing) return;
          try {
            await close.mutate(complaint.id, closing, note);
            toast.success(closing === 'rejected' ? 'Complaint rejected.' : 'Complaint resolved.');
            onChanged();
          } catch (e) {
            toast.fromError(e);
          }
          setClosing(null);
        }}
      />
    </>
  );
}
