import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { inbox, type AdminNotification } from '../api/admin';
import { inboxChanged, timeAgo, useInboxChanged } from '../lib/inboxEvents';
import { useToast } from '../lib/toast';
import { useResource } from '../lib/useResource';
import { Button, Icon } from '../ui';

/** How many rows the dropdown shows; the page behind "View all" has the rest. */
const PREVIEW = 5;

/**
 * The header bell.
 *
 * *** IT OPENS A SHORT LIST, NOT A PAGE. *** Pressing it drops down the latest
 * few notifications; only "View all notifications" opens the full page. The
 * count is real (`GET /me/notifications/unread-count`) — SRS 2.3 gives admins no
 * push, so this is where they find out.
 *
 * Closes on an outside press, Escape, or choosing something, and returns focus
 * to the bell, so a dropdown is never a trap.
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  const countFetcher = useCallback(() => inbox.unreadCount(), []);
  const unread = useResource<{ count: number }>(countFetcher, []);
  const listFetcher = useCallback(() => inbox.list(), []);
  const list = useResource<AdminNotification[]>(listFetcher, [], open);
  const count = unread.data?.count ?? 0;

  // The page marked something read, or this did: both numbers move together.
  const refresh = useCallback(() => {
    unread.reload();
    if (open) list.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unread.reload, list.reload]);
  useInboxChanged(refresh);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const rows = [...(list.data ?? [])]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, PREVIEW);

  const read = async (n: AdminNotification) => {
    if (n.readAt) return;
    try {
      await inbox.markRead(n.id);
      inboxChanged();
    } catch (e) {
      toast.fromError(e);
    }
  };

  const readAll = async () => {
    try {
      await inbox.markAllRead();
      inboxChanged();
    } catch (e) {
      toast.fromError(e);
    }
  };

  return (
    <div className="notifWrap" ref={wrap}>
      <button
        ref={button}
        type="button"
        className="bell"
        aria-label={`Notifications${count ? `, ${count} unread` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="bell" size={19} />
        {count > 0 && <span className="bell__dot">{count > 99 ? '99+' : count}</span>}
      </button>

      {open && (
        <div className="notifPop" role="dialog" aria-label="Notifications">
          <div className="notifPop__head">
            <strong>Notifications</strong>
            {count > 0 && (
              <button type="button" className="notifPop__link" onClick={readAll}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notifPop__body">
            {list.loading && list.initial ? (
              <p className="notifPop__empty">Loading…</p>
            ) : list.error ? (
              <p className="notifPop__empty">
                Could not load notifications.{' '}
                <button type="button" className="notifPop__link" onClick={list.reload}>
                  Retry
                </button>
              </p>
            ) : rows.length === 0 ? (
              <p className="notifPop__empty">You are all caught up.</p>
            ) : (
              <ul className="notifList">
                {rows.map((n) => (
                  <li key={n.id}>
                    <button type="button" className={`notifItem ${n.readAt ? '' : 'isUnread'}`.trim()} onClick={() => read(n)}>
                      <span className="notifItem__dot" aria-hidden="true" />
                      <span className="notifItem__text">
                        <strong>{n.title ?? 'Notification'}</strong>
                        {n.body && <span>{n.body}</span>}
                      </span>
                      <span className="notifItem__time">{timeAgo(n.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="notifPop__foot">
            <Button
              variant="secondary"
              icon="arrowRight"
              onClick={() => {
                setOpen(false);
                navigate('/inbox');
              }}
            >
              View all notifications
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
