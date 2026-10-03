import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import { safety, type SafetyAlert } from '../api/admin';
import { useMutation, usePoll, useResource } from '../lib/useResource';
import { useToast } from '../lib/toast';
import type { AdminLevel } from '../nav';
import {
  Async,
  Button,
  Column,
  ConfirmDialog,
  EmptyState,
  Icon,
  Notice,
  PageHeader,
  StatusBadge,
  Table,
  humanise,
} from '../ui';

/**
 * The safety-alert queue (§29) - care coordination's whole job.
 *
 * *** ACKNOWLEDGE AND CLOSE ARE TWO ACTIONS AND MUST STAY TWO. ***
 * Acknowledge puts your admin id on the row: someone has taken responsibility.
 * Close records what was actually done about it. Collapsing them into one
 * button loses the distinction the audit depends on.
 *
 * The screen polls while the tab is visible, because an alert arriving is the
 * one thing here that must not wait for a manual refresh.
 */

const POLL_MS = 45_000;

export function SafetyAlerts({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const fetcher = useCallback(() => safety.list(), []);
  const state = useResource<SafetyAlert[]>(fetcher, []);
  const [closing, setClosing] = useState<SafetyAlert | null>(null);
  const [ackingId, setAckingId] = useState<string | null>(null);

  // Polls only while the tab is in front - a backgrounded tab stops.
  usePoll(state.reload, POLL_MS);

  const acknowledge = useMutation(safety.acknowledge);
  const close = useMutation(safety.close);

  const columns: Column<SafetyAlert>[] = [
    {
      key: 'type',
      header: 'Alert',
      render: (a) => (
        <span className="cellStack">
          <StatusBadge status={a.alertType} />
          {a.summary && <small>{a.summary}</small>}
        </span>
      ),
    },
    {
      key: 'raised',
      header: 'Raised',
      render: (a) => (a.raisedAt ? new Date(a.raisedAt).toLocaleString() : '-'),
    },
    {
      key: 'consultation',
      header: 'Consultation',
      render: (a) =>
        a.consultationId ? (
          <Link to={`/consultations/${a.consultationId}`}>{a.consultationId}</Link>
        ) : (
          <span className="muted">-</span>
        ),
    },
    {
      key: 'state',
      header: 'Handling',
      render: (a) =>
        a.closedAt ? (
          <StatusBadge status="resolved" label="Closed" />
        ) : a.acknowledgedAt ? (
          <StatusBadge status="in_progress" label="Acknowledged" />
        ) : (
          <StatusBadge status="open" label="Unacknowledged" />
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '220px',
      render: (a) => (
        <span className="rowActions">
          {/* Two steps, deliberately. Acknowledge first, close when done. */}
          {!a.acknowledgedAt && (
            <Button
              size="sm"
              variant="secondary"
              className="btn--fixed"
              // Only the clicked row spins; the rest wait (the mutation allows one at a time).
              loading={ackingId === a.id}
              disabled={acknowledge.busy && ackingId !== a.id}
              onClick={async () => {
                setAckingId(a.id);
                try {
                  await acknowledge.mutate(a.id);
                  toast.success('Acknowledged - this alert is now yours.');
                  state.reload();
                } catch (e) {
                  toast.fromError(e);
                } finally {
                  setAckingId(null);
                }
              }}
            >
              Acknowledge
            </Button>
          )}
          {a.acknowledgedAt && !a.closedAt && (
            <Button size="sm" variant="primary" className="btn--fixed" onClick={() => setClosing(a)}>
              Close
            </Button>
          )}
          {a.closedAt && (
            <span className="doneTag">
              <Icon name="check" size={14} />
              Done
            </span>
          )}
        </span>
      ),
    },
  ];

  /** Unhandled first, then oldest - the order a coordinator works in. */
  const ordered = (rows: SafetyAlert[]) =>
    [...rows].sort((a, b) => {
      const rank = (x: SafetyAlert) => (x.closedAt ? 2 : x.acknowledgedAt ? 1 : 0);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return new Date(a.raisedAt ?? 0).getTime() - new Date(b.raisedAt ?? 0).getTime();
    });

  return (
    <>
      <PageHeader
        title="Safety alerts"
        description="Raised by the follow-up check-in rules, not by a person. Acknowledge takes responsibility; closing records what was done."
      />

      <Notice tone="info">
        This queue refreshes itself every {POLL_MS / 1000} seconds while the tab is open.
      </Notice>

      <Async
        state={state}
        resource="safety alerts"
        empty={
          <EmptyState
            icon="check"
            title="No safety alerts"
            description="Nothing has tripped a red-flag or follow-up rule."
          />
        }
      >
        {(rows) => (
          <Table
            caption="Safety alerts"
            columns={columns}
            rows={ordered(rows)}
            rowKey={(a) => a.id}
          />
        )}
      </Async>

      <ConfirmDialog
        open={closing !== null}
        busy={close.busy}
        onClose={() => setClosing(null)}
        variant="primary"
        title={closing ? `Close this ${humanise(closing.alertType).toLowerCase()} alert?` : 'Close alert'}
        confirmLabel="Close alert"
        consequence="Closing records the outcome against this alert. It does not notify the patient."
        reason={{
          label: 'What was done',
          hint: 'The action taken - a call made, a consultation booked, an escalation. This is the audit answer.',
        }}
        onConfirm={async (what) => {
          if (!closing) return;
          try {
            await close.mutate(closing.id, what);
            toast.success('Alert closed.');
            state.reload();
          } catch (e) {
            toast.fromError(e);
          }
          setClosing(null);
        }}
      />
    </>
  );
}
