import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import type { Everything } from '../../api/liveList';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  feedback,
  requesterLabel,
  tickets,
  type FeedbackKind,
  type FeedbackPage,
  type FeedbackRow,
  type TicketDetail,
  type TicketPriority,
  type TicketRow,
} from '../../api/liveSupport';
import { useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import { LAB_SERVICES_ENABLED, type AdminLevel } from '../../nav';
import {
  Async,
  Button,
  ConfirmDialog,
  DefinitionList,
  Modal,
  Notice,
  SelectField,
  StatusBadge,
  Tabs,
  TextArea,
  type Column,
} from '../../ui';
import { fmtDateTime, opts, words } from '../kit/format';
import { ListScreen, type ListFilter, type ListTab } from '../kit/ListScreen';
import { Truncated } from '../kit/Truncated';

/**
 * Support Tickets and Feedback against the real backend (requirements section
 * 83-84). The backend's ticket has five statuses, with no `new`: a ticket is
 * open from the moment it is raised. A reply to the requester moves it to
 * "awaiting user response"; an internal note changes nothing.
 */

const TABS: ListTab<TicketRow>[] = TICKET_STATUSES.map((s) => ({ id: s, label: words(s), test: (t) => t.status === s }));

/* --------------------------------- tickets --------------------------------- */

export function TicketsLive({ level: _level }: { level: AdminLevel }) {
  const fetcher = useCallback(() => tickets.list(), []);
  const state = useResource<Everything<TicketRow>>(fetcher, []);
  const [openId, setOpenId] = useState<string | null>(null);

  const columns: Column<TicketRow>[] = [
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
          <span>{t.requesterName}</span>
          <small>{requesterLabel(t.requesterType)}</small>
        </span>
      ),
    },
    { key: 'assignee', header: 'Assigned to', render: (t) => t.assignee ?? <span className="muted">Unassigned</span> },
    { key: 'created', header: 'Created', render: (t) => fmtDateTime(t.createdAt) },
  ];

  return (
    <Async state={state} resource="tickets" skeletonRows={6}>
      {({ items, total }) => {
        const filters: ListFilter<TicketRow>[] = [
          {
            key: 'category',
            label: 'Category',
            options: opts([...new Set(items.map((t) => t.category))].sort()),
            test: (t, v) => t.category === v,
          },
          { key: 'priority', label: 'Priority', options: opts(TICKET_PRIORITIES), test: (t, v) => t.priority === v },
          {
            key: 'requester',
            label: 'Raised by',
            options: [
              { value: 'patient', label: 'Patient' },
              { value: 'provider', label: 'Provider' },
              { value: 'lab', label: 'Lab partner' },
            ],
            test: (t, v) => t.requesterType === v,
          },
        ];
        return (
          <>
            <ListScreen
              caption="Support tickets"
              leading={<Truncated shown={items.length} total={total} />}
              rows={items}
              columns={columns}
              rowKey={(t) => t.id}
              tabs={TABS}
              onOpen={(t) => setOpenId(t.id)}
              search={(t) => `${t.code} ${t.subject} ${t.requesterName}`}
              searchPlaceholder="Ticket, subject or requester"
              filters={filters}
              emptyIcon="note"
              empty={{ title: 'No tickets' }}
            />
            <TicketModal id={openId} onClose={() => setOpenId(null)} onChanged={state.reload} />
          </>
        );
      }}
    </Async>
  );
}

function TicketModal({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const fetcher = useCallback(() => tickets.get(id ?? ''), [id]);
  const state = useResource<TicketDetail>(fetcher, [id], id !== null);
  const [text, setText] = useState('');
  const [toRequester, setToRequester] = useState(true);
  const [ending, setEnding] = useState<'resolve' | 'close' | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (work: () => Promise<unknown>, ok: string, then?: () => void) => {
    setBusy(true);
    try {
      await work();
      toast.success(ok);
      then?.();
      state.reload();
      onChanged();
    } catch (e) {
      toast.fromError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={id !== null} onClose={onClose} title={state.data ? `${state.data.code} ${state.data.subject}` : 'Ticket'} width={680}>
      <Async state={state} resource="this ticket" skeletonRows={4}>
        {(t) => {
          const live = t.status !== 'resolved' && t.status !== 'closed';
          return (
            <div className="stack">
              <DefinitionList
                items={[
                  { label: 'Raised by', value: `${t.requesterName} (${requesterLabel(t.requesterType)})` },
                  {
                    label: 'Consultation',
                    value: t.consultationId ? <Link to={`/appointments/${t.consultationId}`}>Open the consultation</Link> : null,
                  },
                  { label: 'Created', value: fmtDateTime(t.createdAt) },
                  { label: 'Status', value: <StatusBadge status={t.status} /> },
                  { label: 'Assigned to', value: t.assignee ?? 'Unassigned' },
                  { label: 'Message', value: t.description },
                  ...(t.resolutionNote ? [{ label: 'Resolution note', value: t.resolutionNote }] : []),
                ]}
              />

              <div className="formGrid">
                <SelectField
                  label="Priority"
                  value={t.priority}
                  disabled={!live || busy}
                  options={opts(TICKET_PRIORITIES)}
                  onChange={(e) =>
                    run(() => tickets.setPriority(t.id, e.target.value as TicketPriority), 'Priority updated.')
                  }
                />
              </div>

              {t.messages.length > 0 && (
                <ul className="thread">
                  {t.messages.map((m) => (
                    <li key={m.seq}>
                      <strong>{m.by}</strong> <small>{fmtDateTime(m.at)}</small>
                      {m.internal && <StatusBadge status="pending" label="Internal note" />}
                      <br />
                      {m.body}
                    </li>
                  ))}
                </ul>
              )}

              {live && (
                <>
                  <TextArea label="Reply or note" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={toRequester}
                      onChange={(e) => setToRequester(e.target.checked)}
                    />
                    Send to the requester (untick for an internal note)
                  </label>
                </>
              )}

              <div className="formActions">
                {t.status === 'resolved' && (
                  <Button variant="secondary" loading={busy} onClick={() => run(() => tickets.reopen(t.id), 'Ticket reopened.')}>
                    Reopen
                  </Button>
                )}
                {live && (
                  <>
                    {!t.assignee && (
                      <Button variant="secondary" disabled={busy} onClick={() => run(() => tickets.assignToMe(t.id), 'Assigned to you.')}>
                        Assign to me
                      </Button>
                    )}
                    <Button variant="ghost" disabled={busy} onClick={() => setEnding('close')}>
                      Close
                    </Button>
                    <Button variant="success" disabled={busy} onClick={() => setEnding('resolve')}>
                      Resolve
                    </Button>
                    <Button
                      variant="primary"
                      loading={busy}
                      disabled={!text.trim()}
                      onClick={() => run(() => tickets.reply(t.id, text, toRequester), toRequester ? 'Reply sent.' : 'Note added.', () => setText(''))}
                    >
                      {toRequester ? 'Send reply' : 'Add note'}
                    </Button>
                  </>
                )}
              </div>

              <ConfirmDialog
                open={ending !== null}
                busy={busy}
                onClose={() => setEnding(null)}
                variant="primary"
                title={ending === 'resolve' ? `Resolve ${t.code}?` : `Close ${t.code}?`}
                confirmLabel={ending === 'resolve' ? 'Resolve' : 'Close ticket'}
                consequence={
                  ending === 'resolve'
                    ? 'Something was done. The requester is told, and reads your note.'
                    : 'It is over, with or without a fix. The requester is told, and reads your note.'
                }
                reason={{ label: 'Note', hint: 'Required. The requester reads it.', maxLength: 4000 }}
                onConfirm={async (note) => {
                  await run(
                    () => (ending === 'resolve' ? tickets.resolve(t.id, note) : tickets.close(t.id, note)),
                    ending === 'resolve' ? 'Ticket resolved.' : 'Ticket closed.',
                    () => setEnding(null),
                  );
                }}
              />
            </div>
          );
        }}
      </Async>
    </Modal>
  );
}

/* --------------------------------- feedback -------------------------------- */

const STARS = (n: number) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));

const KINDS: { id: FeedbackKind; label: string }[] = [
  { id: 'patient', label: 'Patient feedback' },
  { id: 'provider', label: 'Provider feedback' },
  { id: 'app', label: 'App feedback' },
  ...(LAB_SERVICES_ENABLED ? [{ id: 'lab_service' as const, label: 'Lab service feedback' }] : []),
];

export function FeedbackLive({ level: _level }: { level: AdminLevel }) {
  const [kind, setKind] = useState<FeedbackKind>('patient');
  const fetcher = useCallback(() => feedback.list(kind), [kind]);
  const state = useResource<FeedbackPage>(fetcher, [kind]);

  const columns: Column<FeedbackRow>[] = [
    { key: 'from', header: 'From', render: (f) => f.from },
    { key: 'about', header: kind === 'patient' ? 'Consultation' : 'About', render: (f) => (f.to ? <Link to={f.to}>{f.about}</Link> : f.about) },
    {
      key: 'rating',
      header: 'Rating',
      render: (f) => <StatusBadge status={f.rating >= 4 ? 'verified' : f.rating >= 3 ? 'pending' : 'rejected'} label={STARS(f.rating)} />,
    },
    { key: 'comment', header: 'Comment', render: (f) => f.comment || <span className="muted">No comment</span> },
    { key: 'at', header: kind === 'patient' ? 'Consultation date' : 'Submitted', render: (f) => (f.at ? fmtDateTime(f.at) : '-') },
  ];

  return (
    <>
      <Tabs tabs={KINDS} active={kind} onChange={(id) => setKind(id as FeedbackKind)} />
      <Async state={state} resource="feedback" skeletonRows={5}>
        {({ items, total, truncated, average }) => (
          <ListScreen
            caption="Feedback"
            leading={
              <>
                {average !== null && (
                  <Notice tone="info">
                    Average rating {average} across {items.length} shown.
                  </Notice>
                )}
                {truncated && <Truncated shown={items.length} total={Math.max(total, items.length + 1)} />}
              </>
            }
            rows={items}
            columns={columns}
            rowKey={(f) => f.id}
            search={(f) => `${f.from} ${f.about} ${f.comment}`}
            searchPlaceholder="Name, subject or comment"
            emptyIcon="note"
            empty={{ title: 'No feedback yet' }}
          />
        )}
      </Async>
    </>
  );
}
