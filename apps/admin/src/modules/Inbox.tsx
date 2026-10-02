import { memo, useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { inbox, type AdminNotification } from '../api/admin';
import { inboxChanged, timeAgo, useInboxChanged } from '../lib/inboxEvents';
import { useMutation, useResource } from '../lib/useResource';
import { useToast } from '../lib/toast';
import type { AdminLevel } from '../nav';
import { Async, Button, EmptyState, Icon, Tabs } from '../ui';

/**
 * This admin's own notifications — the page behind "View all notifications" in
 * the header bell.
 *
 * SRS 2.3 gives admins no push device, so in-panel is the only place these are
 * read. It is this account's inbox rather than a module, which is why it has
 * no sidebar entry.
 *
 * Built to stay quick with a long history: rows are compact and memoised, the
 * list is filtered and grouped once per change, and only a page of them is in
 * the DOM at a time ("Show more" adds the next).
 */

const PAGE = 20;
const DAY = 86_400_000;

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
];

type Group = { label: string; rows: AdminNotification[] };

/** Today / Yesterday / This week / Earlier, newest first inside each. */
const group = (rows: AdminNotification[]): Group[] => {
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const buckets: Group[] = [
    { label: 'Today', rows: [] },
    { label: 'Yesterday', rows: [] },
    { label: 'This week', rows: [] },
    { label: 'Earlier', rows: [] },
  ];
  for (const n of rows) {
    const t = n.createdAt ? new Date(n.createdAt).getTime() : 0;
    const bucket = t >= startOfToday ? 0 : t >= startOfToday - DAY ? 1 : t >= startOfToday - 6 * DAY ? 2 : 3;
    buckets[bucket].rows.push(n);
  }
  return buckets.filter((b) => b.rows.length > 0);
};

const Row = memo(function Row({ n, onRead }: { n: AdminNotification; onRead: (n: AdminNotification) => void }) {
  const unread = !n.readAt;
  return (
    <li>
      <button type="button" className={`inboxRow ${unread ? 'isUnread' : ''}`.trim()} onClick={() => unread && onRead(n)}>
        <span className="inboxRow__icon" aria-hidden="true">
          <Icon name="bell" size={16} />
        </span>
        <span className="inboxRow__text">
          <strong>{n.title ?? 'Notification'}</strong>
          {n.body && <span>{n.body}</span>}
        </span>
        <span className="inboxRow__meta">
          <span>{timeAgo(n.createdAt)}</span>
          {unread && <span className="inboxRow__badge">New</span>}
        </span>
      </button>
    </li>
  );
});

export function Inbox(_props: { level: AdminLevel }) {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'unread' ? 'unread' : 'all';
  const [limit, setLimit] = useState(PAGE);

  const fetcher = useCallback(() => inbox.list(), []);
  const state = useResource<AdminNotification[]>(fetcher, []);
  useInboxChanged(state.reload);

  const markRead = useMutation(inbox.markRead);
  const markAll = useMutation(inbox.markAllRead);

  const sorted = useMemo(
    () => [...(state.data ?? [])].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
    [state.data],
  );
  const unreadCount = useMemo(() => sorted.filter((n) => !n.readAt).length, [sorted]);
  const shown = useMemo(() => (tab === 'unread' ? sorted.filter((n) => !n.readAt) : sorted), [sorted, tab]);
  const page = useMemo(() => shown.slice(0, limit), [shown, limit]);
  const groups = useMemo(() => group(page), [page]);

  const onRead = useCallback(
    async (n: AdminNotification) => {
      try {
        await markRead.mutate(n.id);
        inboxChanged();
      } catch (e) {
        toast.fromError(e);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markRead.mutate, toast],
  );

  const readAll = async () => {
    try {
      await markAll.mutate();
      toast.success('All marked as read.');
      inboxChanged();
    } catch (e) {
      toast.fromError(e);
    }
  };

  return (
    <>
      <div className="inboxHead">
        <Link className="backLink" to="/">
          <Icon name="arrowLeft" size={16} />
          Back to the panel
        </Link>
        {unreadCount > 0 && (
          <Button variant="secondary" icon="check" loading={markAll.busy} onClick={readAll}>
            Mark all read
          </Button>
        )}
      </div>

      <Tabs
        tabs={TABS.map((t) => ({ ...t, label: t.id === 'unread' ? `Unread${unreadCount ? ` (${unreadCount})` : ''}` : t.label }))}
        active={tab}
        onChange={(id) => {
          setLimit(PAGE);
          setParams(id === 'all' ? {} : { tab: id }, { replace: true });
        }}
      />

      <Async state={state} resource="your notifications" empty={<EmptyState icon="bell" title="Nothing here yet" description="Alerts addressed to your admin account appear here." />}>
        {() =>
          shown.length === 0 ? (
            <EmptyState
              icon="check"
              title={tab === 'unread' ? 'You are all caught up' : 'Nothing here yet'}
              description={tab === 'unread' ? 'No unread notifications.' : 'Alerts addressed to your admin account appear here.'}
              action={
                tab === 'unread' ? (
                  <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>
                    Show all
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {groups.map((g) => (
                <section key={g.label} aria-label={g.label} className="inboxGroup">
                  <h2 className="inboxGroup__label">{g.label}</h2>
                  <ul className="inboxList">
                    {g.rows.map((n) => (
                      <Row key={n.id} n={n} onRead={onRead} />
                    ))}
                  </ul>
                </section>
              ))}
              <div className="listFooter">
                <p className="muted">
                  Showing {page.length} of {shown.length}
                </p>
                {page.length < shown.length && (
                  <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                    Show more
                  </Button>
                )}
              </div>
            </>
          )
        }
      </Async>
    </>
  );
}
