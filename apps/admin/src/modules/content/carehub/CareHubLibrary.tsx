import { useMemo, useState } from 'react';

import {
  CONCERNS,
  ITEM_TYPES,
  typeLabel,
  type CareHubItem,
} from '../../../api/careHub';
import type { ResourceState } from '../../../lib/useResource';
import type { AdminLevel } from '../../../nav';
import {
  Async,
  Button,
  Column,
  EmptyState,
  SearchField,
  SelectField,
  StatusBadge,
  Table,
  may,
} from '../../../ui';
import { ItemActions } from './ItemActions';
import { Thumb } from './Thumb';

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In review' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const date = (iso: string) => (iso ? new Date(iso).toLocaleDateString() : '—');

/** Thumbnail, type, status, concern and text filters, then the chosen sort. */
function useVisible(rows: CareHubItem[], f: { type: string; status: string; concern: string; q: string; sort: string }) {
  return useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return rows
      .filter(
        (i) =>
          (!f.type || i.type === f.type) &&
          (!f.status || i.status === f.status) &&
          (!f.concern || i.concern === f.concern) &&
          (!q || `${i.title} ${i.summary} ${i.slug}`.toLowerCase().includes(q)),
      )
      .sort((a, b) =>
        f.sort === 'updated'
          ? b.updatedAt.localeCompare(a.updatedAt)
          : a.sortOrder - b.sortOrder || b.updatedAt.localeCompare(a.updatedAt),
      );
  }, [rows, f.type, f.status, f.concern, f.q, f.sort]);
}

export function CareHubLibrary({
  state,
  level,
  onEdit,
  onNew,
  onChanged,
}: {
  state: ResourceState<CareHubItem[]>;
  level: AdminLevel;
  onEdit: (id: string) => void;
  onNew: () => void;
  onChanged: (message: string) => void;
}) {
  const [view, setView] = useState('cards');
  const [filters, setFilters] = useState({ type: '', status: '', concern: '', q: '', sort: 'order' });
  const set = (k: keyof typeof filters) => (v: string) => setFilters((f) => ({ ...f, [k]: v }));
  const canAuthor = may(level, ['content', 'clinical_governance']);
  const filtering = Boolean(filters.type || filters.status || filters.concern || filters.q);

  return (
    <>
      <div className="filterBar chToolbar">
        <SearchField value={filters.q} onSearch={set('q')} placeholder="Search title, summary or slug" delay={150} />
        <SelectField label="Type" value={filters.type} onChange={(e) => set('type')(e.target.value)}
          options={[{ value: '', label: 'All types' }, ...ITEM_TYPES]} />
        <SelectField label="Status" value={filters.status} onChange={(e) => set('status')(e.target.value)} options={STATUSES} />
        <SelectField label="Concern" value={filters.concern} onChange={(e) => set('concern')(e.target.value)}
          options={[{ value: '', label: 'All concerns' }, ...CONCERNS.map((c) => ({ value: c, label: c }))]} />
        <SelectField label="Sort by" value={filters.sort} onChange={(e) => set('sort')(e.target.value)}
          options={[{ value: 'order', label: 'Shelf order' }, { value: 'updated', label: 'Recently updated' }]} />
        {/* The three buttons at the top: the two views, then New item. */}
        <span className="chTop" role="group" aria-label="Care Hub actions">
          <Button variant={view === 'cards' ? 'primary' : 'secondary'} aria-pressed={view === 'cards'} onClick={() => setView('cards')}>
            Cards
          </Button>
          <Button variant={view === 'table' ? 'primary' : 'secondary'} aria-pressed={view === 'table'} onClick={() => setView('table')}>
            Table
          </Button>
          {canAuthor && (
            <Button variant="primary" icon="plus" onClick={onNew}>New item</Button>
          )}
        </span>
      </div>

      <Async
        state={state}
        resource="Care Hub items"
        empty={
          <EmptyState
            icon="content"
            title="No Care Hub items yet"
            description="Nothing has been authored for the patient app."
          />
        }
      >
        {(rows) => (
          <Visible rows={rows} filters={filters} view={view} level={level} filtering={filtering}
            onEdit={onEdit} onChanged={onChanged}
            onClear={() => setFilters((f) => ({ ...f, type: '', status: '', concern: '', q: '' }))} />
        )}
      </Async>
    </>
  );
}

function Visible({
  rows, filters, view, level, filtering, onEdit, onChanged, onClear,
}: {
  rows: CareHubItem[];
  filters: { type: string; status: string; concern: string; q: string; sort: string };
  view: string;
  level: AdminLevel;
  filtering: boolean;
  onEdit: (id: string) => void;
  onChanged: (message: string) => void;
  onClear: () => void;
}) {
  const shown = useVisible(rows, filters);

  if (shown.length === 0)
    return (
      <EmptyState
        icon="search"
        title="No items match"
        description={filtering ? 'Try a different search or clear the filters.' : undefined}
        action={filtering ? <Button variant="secondary" onClick={onClear}>Clear filters</Button> : undefined}
      />
    );

  const actions = (i: CareHubItem) => (
    <span className="rowActions">
      {may(level, ['content', 'clinical_governance']) && (
        <Button size="sm" variant="ghost" icon="edit" aria-label={`Edit ${i.title}`} onClick={() => onEdit(i.id)}>Edit</Button>
      )}
      <ItemActions item={i} level={level} onDone={onChanged} />
    </span>
  );

  if (view === 'table') {
    const columns: Column<CareHubItem>[] = [
      { key: 'thumb', header: 'Thumbnail', width: '96px', render: (i) => <Thumb className="chThumb--sm" title={i.title} coverUrl={i.coverUrl} videoId={i.videoId} /> },
      {
        key: 'title',
        header: 'Item',
        render: (i) => (
          <span className="cellStack">
            <strong>{i.title}</strong>
            <small>{[typeLabel(i.type), i.concern].filter(Boolean).join(' · ')}</small>
          </span>
        ),
      },
      { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
      { key: 'updated', header: 'Updated', render: (i) => date(i.updatedAt) },
      { key: 'actions', header: '', align: 'end', width: '300px', render: actions },
    ];
    return <Table caption="Care Hub" columns={columns} rows={shown} rowKey={(i) => i.id} />;
  }

  return (
    <ul className="chGrid" aria-label="Care Hub items">
      {shown.map((i) => (
        <li key={i.id} className="chCard">
          <Thumb title={i.title} coverUrl={i.coverUrl} videoId={i.videoId} />
          <div className="chCard__body">
            <div className="row">
              <span className="badge badge--info">{typeLabel(i.type)}</span>
              <StatusBadge status={i.status} />
              {i.videoId && <span className="badge badge--neutral">Video</span>}
            </div>
            <h3>{i.title}</h3>
            <p className="chClamp muted">{i.summary || 'No summary yet.'}</p>
            <small className="muted">Updated {date(i.updatedAt)}</small>
          </div>
          <div className="chCard__foot">{actions(i)}</div>
        </li>
      ))}
    </ul>
  );
}
