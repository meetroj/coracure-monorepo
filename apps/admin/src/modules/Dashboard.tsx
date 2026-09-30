import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { governance, type GovernanceDashboard } from '../api/admin';
import { useResource } from '../lib/useResource';
import { canSee, SECTIONS, type AdminLevel } from '../nav';
import { Async, Icon, PageHeader, type IconName } from '../ui';

/**
 * The quality dashboard (§14, §27).
 *
 * *** EVERY TILE IS A LINK. *** A number that does not open the queue behind
 * it is decoration, and §14 rules it out. A tile whose section the level
 * cannot reach is not rendered at all rather than navigating into a 403.
 */

type Tile = {
  key: keyof GovernanceDashboard | string;
  label: string;
  icon: IconName;
  /** The section this tile opens — also what gates its visibility. */
  section: string;
  /** A count that should read as a problem when it is non-zero. */
  alarming?: boolean;
};

const TILES: Tile[] = [
  { key: 'completedCases', label: 'Completed cases', icon: 'check', section: 'allocation-decisions' },
  {
    key: 'pendingSummaries',
    label: 'Pending summaries',
    icon: 'clipboard',
    section: 'pending-summaries',
    alarming: true,
  },
  { key: 'redFlags', label: 'Red flags', icon: 'alert', section: 'safety-alerts', alarming: true },
  {
    key: 'followUpAlerts',
    label: 'Follow-up alerts',
    icon: 'bell',
    section: 'safety-alerts',
    alarming: true,
  },
  { key: 'complaints', label: 'Open complaints', icon: 'note', section: 'complaints', alarming: true },
];

export function Dashboard({ level }: { level: AdminLevel }) {
  const navigate = useNavigate();
  const fetcher = useCallback(() => governance.dashboard(), []);
  const state = useResource<GovernanceDashboard>(fetcher, []);

  const reachable = (path: string) => {
    const section = SECTIONS.find((s) => s.path === path);
    return section ? canSee(level, section) : false;
  };

  return (
    <>
      <PageHeader
        title="Quality dashboard"
        description="Completed cases, documentation still outstanding, safety alerts and complaints. Every tile opens the queue behind it."
      />

      <Async state={state} resource="the dashboard" skeletonRows={3}>
        {(data) => (
          <div className="tiles">
            {TILES.filter((tile) => reachable(tile.section)).map((tile) => {
              const raw = data[tile.key];
              const value = typeof raw === 'number' ? raw : null;
              return (
                <button
                  key={`${tile.key}-${tile.section}`}
                  type="button"
                  className="tile"
                  onClick={() => navigate(`/${tile.section}`)}
                >
                  <span
                    className={`tile__icon ${tile.alarming && value ? 'tile__icon--alarm' : ''}`.trim()}
                    aria-hidden="true"
                  >
                    <Icon name={tile.icon} size={20} />
                  </span>
                  <span className="tile__value">
                    {/* A missing count reads as unknown, never as zero. */}
                    {value === null ? <span className="muted">—</span> : value}
                  </span>
                  <span className="tile__label">{tile.label}</span>
                  <span className="tile__go">
                    Open <Icon name="arrowRight" size={14} />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Async>
    </>
  );
}
