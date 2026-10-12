import { type ComponentType, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

import { LIVE } from '../../api/live';
import { canSee, type AdminLevel } from '../../nav';
import { EmptyState, PageHeader, Tabs } from '../../ui';
import { NotConnected } from './NotConnected';

/**
 * A section whose screens are tabs (`?tab=`), so refresh, Back and a pasted
 * link keep the tab. A tab the level may not use is not listed, and a typed
 * `?tab=` for one gets the same "not available" answer the sidebar gives.
 */
export type HubTab = {
  id: string;
  label: string;
  Component: ComponentType<{ level: AdminLevel }>;
  /** Omit for every level that reached the section. */
  levels?: readonly AdminLevel[];
  /**
   * True when this tab reads the real backend. In a live build a tab that does
   * not say so shows "Not connected" instead of its fixtures.
   */
  live?: boolean;
};

export function TabHub({
  title,
  description,
  tabs,
  level,
  extra,
  param = 'tab',
}: {
  title: string;
  description?: string;
  tabs: readonly HubTab[];
  level: AdminLevel;
  extra?: ReactNode;
  /** The URL parameter that holds the tab. Use another when a tab owns `?tab=` itself. */
  param?: string;
}) {
  const [params, setParams] = useSearchParams();
  const allowed = tabs.filter((t) => !t.levels || canSee(level, { levels: t.levels }));
  const wanted = params.get(param);
  const requested = tabs.find((t) => t.id === wanted);
  const active = requested ?? allowed[0];

  return (
    <>
      <PageHeader title={title} description={description} />
      {extra}
      <Tabs
        tabs={allowed.map((t) => ({ id: t.id, label: t.label }))}
        active={active?.id ?? ''}
        onChange={(id) => setParams({ [param]: id }, { replace: true })}
      />
      {!active ? (
        <EmptyState icon="lock" title="Nothing here for your role" />
      ) : active.levels && !canSee(level, { levels: active.levels }) ? (
        <EmptyState
          icon="lock"
          title="You do not have permission to view this tab"
          description="Your admin role does not include it. A super admin can change your permission level."
        />
      ) : (
        <div key={active.id} className="fadeIn">
          {LIVE && !active.live ? <NotConnected /> : <active.Component level={level} />}
        </div>
      )}
    </>
  );
}
