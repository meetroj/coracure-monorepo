import { useCallback } from 'react';

import { clarification, type ClarificationCase } from '../../api/admin';
import { PANEL_STATUSES } from '../../api/liveClarification';
import { useResource } from '../../lib/useResource';
import type { AdminLevel } from '../../nav';
import { Async, Notice, StatusBadge, type Column } from '../../ui';
import { fmtDateTime, words } from '../kit/format';
import { ListScreen, type ListTab } from '../kit/ListScreen';

/**
 * The clarification cases by where they stand (requirements section 44).
 *
 * *** AN ADMIN SEES THE CASE, NOT THE CONVERSATION. *** The thread belongs to
 * the doctor who posted it and the one expert it is shared with; the backend
 * gives the panel the case and how many messages it holds, and nothing else.
 */

const TABS: ListTab<ClarificationCase>[] = PANEL_STATUSES.map((s) => ({
  id: s,
  label: words(s),
  test: (c) => c.status === s,
}));

export function ThreadsLive({ level: _level }: { level: AdminLevel }) {
  const fetcher = useCallback(() => clarification.list(), []);
  const state = useResource<ClarificationCase[]>(fetcher, []);

  const columns: Column<ClarificationCase>[] = [
    {
      key: 'case',
      header: 'Case',
      render: (c) => (
        <span className="cellStack">
          <strong>{c.title ?? c.specialtyName ?? 'Untitled case'}</strong>
          {c.question && (
            <small>
              {c.question.slice(0, 90)}
              {c.question.length > 90 ? '…' : ''}
            </small>
          )}
        </span>
      ),
    },
    { key: 'urgency', header: 'Urgency', render: (c) => (c.urgency ? <StatusBadge status={c.urgency} /> : '-') },
    { key: 'posted', header: 'Posted', render: (c) => (c.postedAt ? fmtDateTime(c.postedAt) : '-') },
    {
      key: 'expert',
      header: 'With',
      render: (c) =>
        c.assignedExpertId ? c.assignedExpertName ?? 'An expert' : <span className="muted">Nobody yet</span>,
    },
    { key: 'messages', header: 'Messages', align: 'end', render: (c) => c.messagesTotal ?? 0 },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status ?? 'new'} label={words(c.status ?? 'new')} /> },
  ];

  return (
    <Async state={state} resource="clarification cases" skeletonRows={6}>
      {(rows) => (
        <ListScreen
          caption="Clarification cases"
          leading={
            <Notice tone="info">
              Cases are de-identified, and only the doctor who posted one and the expert it is shared with can read
              the conversation. Assign an expert from the Expert assignment tab.
            </Notice>
          }
          rows={rows}
          columns={columns}
          rowKey={(c) => c.id}
          tabs={TABS}
          search={(c) => `${c.title ?? ''} ${c.specialtyName ?? ''} ${c.question ?? ''} ${c.assignedExpertName ?? ''}`}
          searchPlaceholder="Case, topic or expert"
          emptyIcon="clarify"
          empty={{ title: 'No clarification cases' }}
        />
      )}
    </Async>
  );
}
