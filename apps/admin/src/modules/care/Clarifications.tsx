import { useState } from 'react';
import { Link } from 'react-router-dom';

import { LIVE } from '../../api/live';
import { useToast } from '../../lib/toast';
import { CLARIFICATION_STATUSES, clarifications, type ClarificationThread } from '../../mock/ops/care';
import type { AdminLevel } from '../../nav';
import { Button, Modal, StatusBadge, TextArea, type Column } from '../../ui';
import { Clarification as ExpertAssignment } from '../Clarification';
import { fmtDateTime, words } from '../kit/format';
import { ListScreen, type ListTab } from '../kit/ListScreen';
import { TabHub } from '../kit/TabHub';
import { useStore } from '../kit/store';
import { ThreadsLive } from './ClarificationsLive';

/**
 * Clarifications (requirements §44, §48): the threads, each linked to its Case
 * Record, with the four spec statuses. Expert assignment - which de-identified
 * case goes to which expert - is the second tab.
 */

const TABS: ListTab<ClarificationThread>[] = CLARIFICATION_STATUSES.map((s) => ({
  id: s,
  label: words(s),
  test: (c) => c.status === s,
}));

function Threads({ level: _level }: { level: AdminLevel }) {
  const toast = useToast();
  const rows = useStore(clarifications);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const open = rows.find((c) => c.id === openId) ?? null;

  const columns: Column<ClarificationThread>[] = [
    {
      key: 'subject',
      header: 'Clarification',
      render: (c) => (
        <span className="cellStack">
          <strong>{c.subject}</strong>
          <small>{c.thread.length} message(s)</small>
        </span>
      ),
    },
    { key: 'case', header: 'Case Record', render: (c) => <Link to={`/case-records/${c.caseId}`} onClick={(e) => e.stopPropagation()}>{c.referenceCode}</Link> },
    { key: 'pro', header: 'Consulting Professional', render: (c) => c.professional },
    { key: 'raised', header: 'Raised', render: (c) => fmtDateTime(c.raisedAt) },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
  ];

  return (
    <>
      <ListScreen
        caption="Clarifications"
        rows={rows}
        columns={columns}
        rowKey={(c) => c.id}
        tabs={TABS}
        onOpen={(c) => {
          setOpenId(c.id);
          setReply('');
        }}
        search={(c) => `${c.subject} ${c.referenceCode} ${c.patientName} ${c.professional}`}
        searchPlaceholder="Subject, case or professional"
        emptyIcon="clarify"
        empty={{ title: 'No clarifications' }}
      />
      <Modal
        open={open !== null}
        onClose={() => setOpenId(null)}
        title={open?.subject ?? 'Clarification'}
        width={600}
        footer={
          open && (
            <>
              <Button variant="ghost" onClick={() => setOpenId(null)}>
                Close window
              </Button>
              {open.status !== 'closed' && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    clarifications.patch(open.id, { status: 'closed' });
                    toast.success('Clarification closed.');
                  }}
                >
                  Close clarification
                </Button>
              )}
              {open.status !== 'closed' && (
                <Button
                  variant="primary"
                  disabled={!reply.trim()}
                  onClick={() => {
                    clarifications.patch(open.id, {
                      status: 'awaiting_response',
                      thread: [...open.thread, { from: 'Clarification desk', text: reply.trim(), at: new Date().toISOString() }],
                    });
                    setReply('');
                    toast.success('Sent. Waiting for a response.');
                  }}
                >
                  Send
                </Button>
              )}
            </>
          )
        }
      >
        {open && (
          <>
            <p className="muted">
              <StatusBadge status={open.status} /> on case <Link to={`/case-records/${open.caseId}`}>{open.referenceCode}</Link>, {open.professional}
            </p>
            <ul className="thread">
              {open.thread.map((m, i) => (
                <li key={i}>
                  <strong>{m.from}</strong> <small>{fmtDateTime(m.at)}</small>
                  <br />
                  {m.text}
                </li>
              ))}
            </ul>
            {open.status !== 'closed' && (
              <TextArea label="Message" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
            )}
          </>
        )}
      </Modal>
    </>
  );
}

export function Clarifications({ level }: { level: AdminLevel }) {
  return (
    <TabHub
      title="Clarifications"
      level={level}
      tabs={[
        { id: 'threads', label: LIVE ? 'Cases' : 'Clarification threads', Component: LIVE ? ThreadsLive : Threads, live: true },
        { id: 'experts', label: 'Expert assignment', Component: ExpertAssignment, live: true },
      ]}
    />
  );
}
