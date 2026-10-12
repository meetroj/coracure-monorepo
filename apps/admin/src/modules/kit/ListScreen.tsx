import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';

import {
  Button,
  EmptyState,
  SearchField,
  SelectField,
  SkeletonRegion,
  Table,
  TableSkeleton,
  Tabs,
  skeletonColumns,
  useSkeletonGate,
  type Column,
  type IconName,
} from '../../ui';

/**
 * One list screen for the spec's operational lists: status tabs, a search box
 * and any number of select filters, all kept in the URL so Back, refresh and a
 * pasted link keep the working view (the same rule the Doctors list follows).
 *
 * It filters rows it is handed, so it works for fixtures today and for a
 * server-filtered list later (pass the already-filtered rows and no `test`s).
 *
 * `loading` is for a list whose rows are still on their way: the tabs, search
 * and filters stay real and usable, the tab counts are left off (they would be
 * a number nobody has counted), and only the table body is a skeleton. Pass
 * `skeleton` to say which columns the rows have; omitted, the real columns
 * are used. Rows arriving with `loading` false is the ordinary path.
 */
export type ListFilter<T> = {
  key: string;
  label: string;
  options: readonly { value: string; label: string }[];
  test: (row: T, value: string) => boolean;
};

export type ListTab<T> = { id: string; label: string; test: (row: T) => boolean };

export function ListScreen<T>({
  rows,
  columns,
  rowKey,
  caption,
  search,
  searchPlaceholder = 'Search',
  filters = [],
  tabs,
  onOpen,
  actions,
  leading,
  empty,
  emptyIcon = 'inbox',
  loading = false,
  skeleton,
}: {
  rows: readonly T[];
  columns: readonly Column<T>[];
  rowKey: (row: T) => string;
  caption: string;
  /** What the search box matches against. Omit for no search box. */
  search?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: readonly ListFilter<T>[];
  tabs?: readonly ListTab<T>[];
  onOpen?: (row: T) => void;
  /** Sits on the right of the tab row (e.g. an Add button). */
  actions?: ReactNode;
  /** Rendered above the filters (e.g. a notice). */
  leading?: ReactNode;
  empty?: { title: string; description?: string };
  emptyIcon?: IconName;
  /** The rows are still loading: the body is a skeleton, the chrome stays. */
  loading?: boolean;
  skeleton?: ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const phase = useSkeletonGate(loading);
  // Counts are only honest once the rows are in.
  const counted = phase === 'ready';
  // The search box lives in the top bar when there is one; otherwise it sits above the filters.
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => setSlot(document.getElementById('header-search')), []);
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const activeTab = tabs?.find((t) => t.id === status);
    return rows.filter((row) => {
      if (activeTab && !activeTab.test(row)) return false;
      for (const f of filters) {
        const v = params.get(f.key);
        if (v && !f.test(row, v)) return false;
      }
      return !term || !search || search(row).toLowerCase().includes(term);
    });
  }, [rows, tabs, status, filters, params, q, search]);

  // With no tabs, the primary action shares the filter line instead of floating on a row of its own.
  const inFilters = !tabs && filters.length > 0;
  const filtered = Boolean(q || status || filters.some((f) => params.get(f.key)));
  const clear = () => {
    const next = new URLSearchParams(params);
    ['q', 'status', ...filters.map((f) => f.key)].forEach((k) => next.delete(k));
    setParams(next, { replace: true });
  };

  return (
    <>
      {(tabs || (actions && !inFilters)) && (
        <div className="tabsRow">
          {tabs ? (
            <Tabs
              tabs={[
                { id: '', label: counted ? `All (${rows.length})` : 'All' },
                ...tabs.map((t) => ({ id: t.id, label: counted ? `${t.label} (${rows.filter(t.test).length})` : t.label })),
              ]}
              active={status}
              onChange={(id) => setParam('status', id)}
            />
          ) : (
            <span />
          )}
          {actions && !inFilters && <span className="tabsRow__action">{actions}</span>}
        </div>
      )}

      {leading}

      {search &&
        (slot ? (
          createPortal(<SearchField value={q} onSearch={(v) => setParam('q', v)} placeholder={searchPlaceholder} />, slot)
        ) : (
          <div className="filterBar filterBar--search">
            <SearchField value={q} onSearch={(v) => setParam('q', v)} placeholder={searchPlaceholder} />
          </div>
        ))}

      {(filters.length > 0 || (filtered && !search)) && (
        <div className="filterBar">
          {filters.map((f) => (
            <SelectField
              key={f.key}
              label={f.label}
              options={[{ value: '', label: `Any ${f.label.toLowerCase()}` }, ...f.options]}
              value={params.get(f.key) ?? ''}
              onChange={(e) => setParam(f.key, e.target.value)}
            />
          ))}
          {filtered && (
            <Button variant="ghost" icon="close" onClick={clear}>
              Clear
            </Button>
          )}
          {inFilters && <span className="filterBar__action">{actions}</span>}
        </div>
      )}

      <div key={status} className="fadeIn">
      {phase === 'skeleton' ? (
        <SkeletonRegion label={`Loading ${caption.toLowerCase()}`}>
          {skeleton ?? <TableSkeleton columns={skeletonColumns(columns)} />}
        </SkeletonRegion>
      ) : phase === 'hold' ? null : shown.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={filtered ? 'Nothing matches these filters' : (empty?.title ?? 'Nothing here yet')}
          description={filtered ? 'Widen the filters or clear the search.' : empty?.description}
          action={
            filtered ? (
              <Button variant="secondary" onClick={clear}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Table
          caption={caption}
          columns={columns as Column<T>[]}
          rows={shown as T[]}
          rowKey={rowKey}
          onRowClick={onOpen}
          hideChevron
        />
      )}
      </div>
    </>
  );
}
