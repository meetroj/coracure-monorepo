import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import { masterData, movedCodes, type MasterEntry, type MasterKind, type MasterList } from '../../api/liveMasterData';
import { useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { Async, Button, Card, EmptyState, IconButton, Notice, SelectField, StatusBadge, may } from '../../ui';
import { Catalogue } from '../content/Catalogue';
import { RecordForm, type FieldDef } from '../kit/RecordForm';
import { TabHub } from '../kit/TabHub';

/**
 * Master Data against the real backend (requirements section 10, 90-92).
 *
 * The backend says which lists can be changed. Those are edited here: added to,
 * renamed, switched off and reordered. The others are defined by the platform
 * and are listed so nobody looks for them elsewhere. Specialties, concerns and
 * regions are the service catalogue, the second tab.
 *
 * Switching an entry off hides it from new use; whatever already carries its
 * code keeps it.
 */

const NAME: FieldDef[] = [{ key: 'name', label: 'Name', required: true }];

function Lists({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const kindsFetcher = useCallback(() => masterData.kinds(), []);
  const kinds = useResource<MasterKind[]>(kindsFetcher, []);
  const [picked, setPicked] = useState('');

  return (
    <Async state={kinds} resource="master data" skeletonRows={4}>
      {(all) => {
        const kind = all.find((k) => k.kind === picked) ?? all[0];
        return (
          <div className="stack">
            <SelectField
              label="List"
              value={kind?.kind ?? ''}
              onChange={(e) => setPicked(e.target.value)}
              options={all.map((k) => ({ value: k.kind, label: `${k.label}${k.editable ? '' : ' (platform)'}` }))}
            />
            {kind && <ListEditor key={kind.kind} kind={kind} level={level} onToast={toast} />}
          </div>
        );
      }}
    </Async>
  );
}

function ListEditor({
  kind,
  level,
  onToast,
}: {
  kind: MasterKind;
  level: AdminLevel;
  onToast: ReturnType<typeof useToast>;
}) {
  const fetcher = useCallback(() => masterData.list(kind.kind), [kind.kind]);
  const state = useResource<MasterList>(fetcher, [kind.kind]);
  const [editing, setEditing] = useState<MasterEntry | 'new' | null>(null);
  const canEdit = kind.editable && may(level, ['operations', 'care_coordinator', 'content']);

  const run = async (work: () => Promise<unknown>, ok: string) => {
    try {
      await work();
      onToast.success(ok);
      state.reload();
    } catch (e) {
      onToast.fromError(e);
    }
  };

  return (
    <Card
      title={kind.label}
      actions={
        canEdit ? (
          <Button size="sm" variant="primary" icon="plus" onClick={() => setEditing('new')}>
            Add
          </Button>
        ) : undefined
      }
    >
      {!kind.editable && (
        <Notice tone="info">
          {kind.managedBy === 'app_settings' ? (
            <>
              Which languages are on is set under <Link to="/app-settings">App settings</Link>.
            </>
          ) : (
            <>This list is defined by the platform. It is shown so nobody looks for it elsewhere; it cannot be edited here.</>
          )}
        </Notice>
      )}
      <Async state={state} resource="this list" skeletonRows={3}>
        {({ items }) =>
          items.length === 0 ? (
            <EmptyState icon="catalogue" title="Nothing in this list yet" />
          ) : (
            <ul className="masterList">
              {items.map((it, i) => (
                <li key={it.code} className={it.isActive ? '' : 'isOff'}>
                  <span className="masterList__name">
                    {it.label} {!it.isActive && <StatusBadge status="inactive" />}
                    <small className="muted"> {it.code}</small>
                  </span>
                  {canEdit && (
                    <span className="rowActions">
                      <IconButton
                        icon="arrowLeft"
                        label={`Move ${it.label} up`}
                        disabled={i === 0}
                        onClick={() => {
                          const codes = movedCodes(items, it.code, -1);
                          if (codes) run(() => masterData.reorder(kind.kind, codes), 'Order saved.');
                        }}
                        style={{ transform: 'rotate(90deg)' }}
                      />
                      <IconButton
                        icon="arrowRight"
                        label={`Move ${it.label} down`}
                        disabled={i === items.length - 1}
                        onClick={() => {
                          const codes = movedCodes(items, it.code, 1);
                          if (codes) run(() => masterData.reorder(kind.kind, codes), 'Order saved.');
                        }}
                        style={{ transform: 'rotate(90deg)' }}
                      />
                      <Button size="sm" variant="secondary" onClick={() => setEditing(it)}>
                        Rename
                      </Button>
                      <Button
                        size="sm"
                        variant={it.isActive ? 'ghost' : 'success'}
                        onClick={() =>
                          run(
                            () => masterData.setActive(kind.kind, it.code, !it.isActive),
                            `${it.label} ${it.isActive ? 'switched off' : 'switched on'}.`,
                          )
                        }
                      >
                        {it.isActive ? 'Switch off' : 'Switch on'}
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )
        }
      </Async>
      <RecordForm
        open={editing !== null}
        title={editing === 'new' ? `Add to ${kind.label}` : 'Rename'}
        fields={NAME}
        initial={{ name: editing && editing !== 'new' ? editing.label : '' }}
        onClose={() => setEditing(null)}
        onSubmit={async (v) => {
          const name = String(v.name);
          await run(
            () => (editing && editing !== 'new' ? masterData.rename(kind.kind, editing.code, name) : masterData.create(kind.kind, name)),
            editing === 'new' ? `${name.trim()} added.` : 'Renamed.',
          );
          setEditing(null);
        }}
      />
    </Card>
  );
}

export function MasterDataLive({ level }: { level: AdminLevel }) {
  return (
    <TabHub
      title="Master Data"
      level={level}
      param="view"
      tabs={[
        { id: 'lists', label: 'Lists', Component: Lists, levels: ['operations', 'care_coordinator', 'content', 'clinical_governance'], live: true },
        {
          id: 'catalogue',
          label: 'Service catalogue',
          Component: Catalogue,
          levels: ['content', 'operations', 'clinical_governance'],
          live: true,
        },
      ]}
    />
  );
}
