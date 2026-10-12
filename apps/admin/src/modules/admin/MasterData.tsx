import { useState } from 'react';
import { Link } from 'react-router-dom';

import { doctors } from '../../mock/db';
import { LIVE } from '../../api/live';
import { MasterDataLive } from './MasterDataLive';
import { MASTER_LISTS, itemsOf, masterStore, type MasterItem } from '../../mock/ops/master';
import { useToast } from '../../lib/toast';
import { LAB_SERVICES_ENABLED, type AdminLevel } from '../../nav';
import { Button, Card, EmptyState, IconButton, StatusBadge } from '../../ui';
import { Catalogue } from '../content/Catalogue';
import { TabHub } from '../kit/TabHub';
import { RecordForm, type FieldDef } from '../kit/RecordForm';
import { newId, useStore } from '../kit/store';

/**
 * Master Data (requirements §10, §90-§92).
 *
 * Every list can be added to, renamed, activated, deactivated and reordered.
 * Deactivating hides a value from new selections and filters; it never
 * rewrites a provider who already carries it. Qualifications are free text on
 * the provider and are not mapped here - this is the CoraCure service-specialty
 * list only (§10).
 */

const NAME: FieldDef[] = [{ key: 'name', label: 'Name', required: true }];

function ListEditor({ list }: { list: (typeof MASTER_LISTS)[number] }) {
  const toast = useToast();
  const all = useStore(masterStore);
  const items = itemsOf(all, list.id);
  const [editing, setEditing] = useState<MasterItem | 'new' | null>(null);

  const used = (name: string) => doctors.filter((d) => d.specialtyName === name || d.superSpecialtyName === name).length;

  const move = (item: MasterItem, dir: -1 | 1) => {
    const i = items.findIndex((x) => x.id === item.id);
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    // Swap the two order values; every other item keeps its place.
    masterStore.patch(items[i].id, { order: items[j].order });
    masterStore.patch(items[j].id, { order: items[i].order });
  };

  const save = (name: string) => {
    const clean = name.trim();
    const base = editing && editing !== 'new' ? editing : null;
    if (items.some((x) => x.id !== base?.id && x.name.toLowerCase() === clean.toLowerCase())) {
      toast.error(`${clean} is already in ${list.label}.`);
      return;
    }
    if (base) masterStore.patch(base.id, { name: clean });
    else masterStore.upsert({ id: newId('md'), list: list.id, name: clean, active: true, order: Math.max(0, ...items.map((x) => x.order)) + 1 });
    toast.success(base ? 'Renamed.' : `${clean} added to ${list.label}.`);
    setEditing(null);
  };

  return (
    <Card
      title={list.label}
      actions={
        <Button size="sm" variant="primary" icon="plus" onClick={() => setEditing('new')}>
          Add
        </Button>
      }
    >
      <p className="muted">{list.hint}</p>
      {items.length === 0 ? (
        <EmptyState icon="catalogue" title="Nothing in this list yet" />
      ) : (
        <ul className="masterList">
          {items.map((it, i) => (
            <li key={it.id} className={it.active ? '' : 'isOff'}>
              <span className="masterList__name">
                {it.name} {!it.active && <StatusBadge status="inactive" />}
                {list.group === 'Provider' && <small className="muted"> {used(it.name)} provider(s)</small>}
              </span>
              <span className="rowActions">
                <IconButton icon="arrowLeft" label={`Move ${it.name} up`} disabled={i === 0} onClick={() => move(it, -1)} style={{ transform: 'rotate(90deg)' }} />
                <IconButton icon="arrowRight" label={`Move ${it.name} down`} disabled={i === items.length - 1} onClick={() => move(it, 1)} style={{ transform: 'rotate(90deg)' }} />
                <Button size="sm" variant="secondary" onClick={() => setEditing(it)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant={it.active ? 'ghost' : 'success'}
                  onClick={() => {
                    masterStore.patch(it.id, { active: !it.active });
                    toast.success(`${it.name} ${it.active ? 'deactivated' : 'activated'}.`);
                  }}
                >
                  {it.active ? 'Deactivate' : 'Activate'}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <RecordForm
        open={editing !== null}
        title={editing === 'new' ? `Add to ${list.label}` : 'Edit'}
        fields={NAME}
        initial={{ name: editing && editing !== 'new' ? editing.name : '' }}
        onClose={() => setEditing(null)}
        onSubmit={(v) => save(String(v.name))}
      />
    </Card>
  );
}

const group = (g: 'Provider' | 'Other') =>
  function MasterGroup({ level: _level }: { level: AdminLevel }) {
    return (
      <div className="stack">
        {MASTER_LISTS.filter((l) => l.group === g).map((l) => (
          <ListEditor key={l.id} list={l} />
        ))}
        {g === 'Other' && (
          <Card title="Notification templates">
            <p className="muted">The wording of every automatic notification lives with Notifications.</p>
            <Link to="/notifications">Open notification templates</Link>
          </Card>
        )}
      </div>
    );
  };

function LabMaster({ level: _level }: { level: AdminLevel }) {
  const items: [string, string, string][] = [
    ['CoraCure Individual Test master', '/lab-tests', 'Test IDs, names, prices and turnaround.'],
    ['Test aliases', '/lab-tests', 'Alternate names used by search and prescription extraction.'],
    ['Lab Partner mappings', '/lab-tests', 'Which partner runs which test, at which code and price.'],
    ['Package definitions', '/lab-packages', 'Predefined batteries, each owned by one partner.'],
    ['Package-test composition', '/lab-packages', 'Which tests sit inside each package.'],
    ['Service PIN codes', '/lab-partners', 'The PIN codes each partner services.'],
  ];
  return (
    <Card title="Lab master data">
      <p className="muted">Day-to-day management happens on the lab screens themselves. Open the one that owns the data.</p>
      <ul className="plainList">
        {items.map(([label, to, hint]) => (
          <li key={label}>
            <Link to={to}>{label}</Link> <span className="muted">{hint}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function FixtureMasterData({ level }: { level: AdminLevel }) {
  return (
    <TabHub
      title="Master Data"
      level={level}
      param="view"
      tabs={[
        { id: 'provider', label: 'Provider master data', Component: group('Provider'), levels: ['operations', 'content', 'clinical_governance'] },
        ...(LAB_SERVICES_ENABLED ? [{ id: 'lab', label: 'Lab master data', Component: LabMaster, levels: ['lab', 'operations'] as AdminLevel[] }] : []),
        { id: 'other', label: 'Other master data', Component: group('Other'), levels: ['operations', 'content'] },
        { id: 'catalogue', label: 'Service catalogue', Component: Catalogue, levels: ['content', 'operations', 'clinical_governance'] },
      ]}
    />
  );
}

/** Live against a configured backend, fixtures otherwise. */
export const MasterData = LIVE ? MasterDataLive : FixtureMasterData;
