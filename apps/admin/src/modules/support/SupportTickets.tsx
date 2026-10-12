import { useState } from 'react';
import { Link } from 'react-router-dom';

import { LIVE } from '../../api/live';
import { useToast } from '../../lib/toast';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  tickets,
  feedbackItems,
  FEEDBACK_TYPES,
  type FeedbackItem,
  type Ticket,
} from '../../mock/ops/support';
import { useMasterOptions } from '../../mock/ops/master';
import type { AdminLevel } from '../../nav';
import { Button, DefinitionList, Modal, SelectField, StatusBadge, TextArea, type Column } from '../../ui';
import { Complaints } from '../complaints/Complaints';
import { fmtDateTime, opts, words } from '../kit/format';
import { ListScreen, type ListFilter, type ListTab } from '../kit/ListScreen';
import { TabHub } from '../kit/TabHub';
import { useStore } from '../kit/store';
import { FeedbackLive, TicketsLive } from './SupportLive';

/**
 * Support Tickets (requirements §83): status, category and priority, plus the
 * patient complaints queue as its own tab. Feedback (§84) is a separate screen.
 */

const TABS: ListTab<Ticket>[] = TICKET_STATUSES.map((s) => ({ id: s, label: words(s), test: (t) => t.status === s }));

function Tickets({ level: _level }: { level: AdminLevel }) {
  const toast = useToast();
  const rows = useStore(tickets);
  const categoryOptions = useMasterOptions('ticket_category');
  const [openId, setOpenId] = useState<string | null>(null);
  const open = rows.find((t) => t.id === openId) ?? null;
  const [note, setNote] = useState('');

  const filters: ListFilter<Ticket>[] = [
    // Categories come from Master Data; fall back to the spec six if a list is empty.
    {
      key: 'category',
      label: 'Category',
      options: categoryOptions.length ? categoryOptions.map((o) => ({ value: o.value.toLowerCase(), label: o.label })) : opts(TICKET_CATEGORIES),
      test: (t, v) => t.category === v,
    },
    { key: 'priority', label: 'Priority', options: opts(TICKET_PRIORITIES), test: (t, v) => t.priority === v },
  ];

  const columns: Column<Ticket>[] = [
    {
      key: 'ticket',
      header: 'Ticket',
      render: (t) => (
        <span className="cellStack">
          <strong>{t.subject}</strong>
          <small>{t.code}</small>
        </span>
      ),
    },
    { key: 'category', header: 'Category', render: (t) => words(t.category) },
    { key: 'priority', header: 'Priority', render: (t) => <StatusBadge status={t.priority} /> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    {
      key: 'by',
      header: 'Raised by',
      render: (t) => (
        <span className="cellStack">
          <span>{t.raisedBy}</span>
          <small>{t.raisedByType}</small>
        </span>
      ),
    },
    { key: 'assignee', header: 'Assigned to', render: (t) => t.assignee ?? <span className="muted">Unassigned</span> },
    { key: 'created', header: 'Created', render: (t) => fmtDateTime(t.createdAt) },
  ];

  return (
    <>
      <ListScreen
        caption="Support tickets"
        rows={rows}
        columns={columns}
        rowKey={(t) => t.id}
        tabs={TABS}
        onOpen={(t) => {
          setOpenId(t.id);
          setNote('');
        }}
        search={(t) => `${t.code} ${t.subject} ${t.raisedBy}`}
        searchPlaceholder="Ticket, subject or requester"
        filters={filters}
        emptyIcon="note"
        empty={{ title: 'No tickets' }}
      />
      <Modal open={open !== null} onClose={() => setOpenId(null)} title={open ? `${open.code} ${open.subject}` : 'Ticket'} width={640}>
        {open && (
          <div className="stack">
            <DefinitionList
              items={[
                { label: 'Raised by', value: `${open.raisedBy} (${open.raisedByType})` },
                { label: 'Patient record', value: open.patientId ? <Link to={`/patients/${open.patientId}?tab=support`}>{open.patientId}</Link> : null },
                { label: 'Created', value: fmtDateTime(open.createdAt) },
                { label: 'Message', value: open.body },
              ]}
            />
            <div className="formGrid">
              <SelectField
                label="Status"
                options={opts(TICKET_STATUSES)}
                value={open.status}
                onChange={(e) => tickets.patch(open.id, { status: e.target.value as Ticket['status'] })}
              />
              <SelectField
                label="Priority"
                options={opts(TICKET_PRIORITIES)}
                value={open.priority}
                onChange={(e) => tickets.patch(open.id, { priority: e.target.value as Ticket['priority'] })}
              />
              <SelectField
                label="Assigned to"
                options={[{ value: '', label: 'Unassigned' }, { value: 'Support Admin', label: 'Support Admin' }, { value: 'Operations Admin', label: 'Operations Admin' }]}
                value={open.assignee ?? ''}
                onChange={(e) => tickets.patch(open.id, { assignee: e.target.value || null })}
              />
            </div>
            {open.notes.length > 0 && (
              <ul className="thread">
                {open.notes.map((n, i) => (
                  <li key={i}>
                    <strong>{n.by}</strong> <small>{fmtDateTime(n.at)}</small>
                    <br />
                    {n.text}
                  </li>
                ))}
              </ul>
            )}
            <TextArea label="Internal note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="formActions">
              <Button
                variant="primary"
                disabled={!note.trim()}
                onClick={() => {
                  tickets.patch(open.id, { notes: [...open.notes, { by: 'You', text: note.trim(), at: new Date().toISOString() }] });
                  setNote('');
                  toast.success('Note added.');
                }}
              >
                Add note
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export function SupportTickets({ level }: { level: AdminLevel }) {
  return (
    <TabHub
      title="Support Tickets"
      level={level}
      tabs={[
        { id: 'tickets', label: 'Tickets', Component: LIVE ? TicketsLive : Tickets, live: true },
        { id: 'complaints', label: 'Patient complaints', Component: Complaints, live: true },
      ]}
    />
  );
}

/* --------------------------------- feedback -------------------------------- */

const STARS = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

function FixtureFeedback({ level: _level }: { level: AdminLevel }) {
  const rows = useStore(feedbackItems);

  const columns: Column<FeedbackItem>[] = [
    { key: 'type', header: 'Type', render: (f) => words(f.type) + ' feedback' },
    { key: 'from', header: 'From', render: (f) => f.from },
    { key: 'about', header: 'About', render: (f) => f.about },
    { key: 'rating', header: 'Rating', render: (f) => <StatusBadge status={f.rating >= 4 ? 'verified' : f.rating >= 3 ? 'pending' : 'rejected'} label={STARS(f.rating)} /> },
    { key: 'comment', header: 'Comment', render: (f) => f.comment },
    { key: 'at', header: 'Submitted', render: (f) => fmtDateTime(f.at) },
  ];

  return (
    <ListScreen
      caption="Feedback"
      rows={rows}
      columns={columns}
      rowKey={(f) => f.id}
      tabs={FEEDBACK_TYPES.map((t) => ({ id: t, label: `${words(t)} feedback`, test: (f: FeedbackItem) => f.type === t }))}
      search={(f) => `${f.from} ${f.about} ${f.comment}`}
      searchPlaceholder="Name, subject or comment"
      emptyIcon="note"
      empty={{ title: 'No feedback yet' }}
    />
  );
}

/** Live against a configured backend, fixtures otherwise. */
export const Feedback = LIVE ? FeedbackLive : FixtureFeedback;
