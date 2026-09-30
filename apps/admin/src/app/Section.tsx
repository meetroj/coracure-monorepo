import type { ComponentType } from 'react';

import type { AdminLevel, Section } from '../nav';
import { Card, Notice, PageHeader } from '../ui';

/**
 * The screen for a section whose module has not been written yet.
 *
 * It is a worklist, not a stub: the section's purpose, the endpoints it
 * consumes and the flow-doc reference that specifies it. A route that lands
 * here still renders something truthful rather than a blank page, which is the
 * §19 "no dead ends" rule applied to work in progress.
 */
export function SectionPlaceholder(meta: Section): ComponentType<{ level: AdminLevel }> {
  const Placeholder = () => {
    const blocked = meta.blurb.startsWith('BLOCKED');
    return (
      <>
        <PageHeader title={meta.label} description={blocked ? undefined : meta.blurb} />

        {blocked && <Notice tone="warning">{meta.blurb.replace(/^BLOCKED by /, '')}</Notice>}

        <Card title="Not built yet">
          <p className="muted">
            This section is specified but its screen has not been implemented. Nothing here
            simulates the backend — the endpoints below are what it will call.
          </p>
          <ul className="endpoints">
            {meta.endpoints.map((e) => (
              <li key={e}>
                <code>{e}</code>
              </li>
            ))}
          </ul>
          <p className="muted small">
            Specified in <code>docs/ADMIN_PANEL_USER_FLOW.md</code> {meta.spec}
          </p>
        </Card>
      </>
    );
  };
  Placeholder.displayName = `SectionPlaceholder(${meta.path})`;
  return Placeholder;
}
