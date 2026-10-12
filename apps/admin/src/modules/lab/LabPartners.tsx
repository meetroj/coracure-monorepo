import { useState } from 'react';

import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { labMappings, labPackages, labPartners, type LabPartner } from '../../mock/ops/lab';
import { Button, StatusBadge, type Column } from '../../ui';
import { ListScreen } from '../kit/ListScreen';
import { RecordForm, type FieldDef, type Values } from '../kit/RecordForm';
import { newId, useStore } from '../kit/store';

/**
 * Lab Partners (requirements §58, §59): add, edit, activate, deactivate, and
 * the PIN codes each one services. Serviceability is what first-acceptance
 * allocation reads, so a typo in a PIN code changes who is offered an order.
 */

const pinList = (v: unknown): string | null => {
  const bad = (Array.isArray(v) ? v : []).filter((p) => !/^\d{6}$/.test(String(p)));
  return bad.length ? `Not a 6-digit PIN code: ${bad.join(', ')}` : null;
};

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Lab Partner name', required: true },
  { key: 'contactPerson', label: 'Contact person', required: true },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'cities', label: 'Service cities', type: 'tags', required: true },
  { key: 'pinCodes', label: 'Service PIN codes', type: 'tags', required: true, hint: 'Six-digit PIN codes, separated with commas.', validate: pinList },
  { key: 'homeCollection', label: 'Home collection available', type: 'bool' },
  { key: 'active', label: 'Active', type: 'bool' },
];

const toValues = (p?: LabPartner): Values =>
  p
    ? { name: p.name, contactPerson: p.contactPerson, phone: p.phone, email: p.email, cities: p.cities, pinCodes: p.pinCodes, homeCollection: p.homeCollection, active: p.active }
    : { homeCollection: true, active: true };

export function LabPartners({ level: _level }: { level: AdminLevel }) {
  const toast = useToast();
  const rows = useStore(labPartners);
  const mappings = useStore(labMappings);
  const packages = useStore(labPackages);
  const [editing, setEditing] = useState<LabPartner | 'new' | null>(null);

  const save = (v: Values) => {
    const base = editing && editing !== 'new' ? editing : null;
    const next: LabPartner = {
      id: base?.id ?? newId('lp'),
      code: base?.code ?? `LP-${String(rows.length + 1).padStart(3, '0')}`,
      name: String(v.name).trim(),
      contactPerson: String(v.contactPerson).trim(),
      phone: String(v.phone).trim(),
      email: String(v.email).trim(),
      cities: v.cities as string[],
      pinCodes: v.pinCodes as string[],
      homeCollection: Boolean(v.homeCollection),
      active: Boolean(v.active),
    };
    labPartners.upsert(next);
    toast.success(base ? `${next.name} updated.` : `${next.name} added.`);
    setEditing(null);
  };

  const columns: Column<LabPartner>[] = [
    {
      key: 'name',
      header: 'Lab Partner',
      render: (p) => (
        <span className="cellStack">
          <strong>{p.name}</strong>
          <small>{p.code}</small>
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (p) => (
        <span className="cellStack">
          <span>{p.contactPerson}</span>
          <small>{p.phone}</small>
        </span>
      ),
    },
    { key: 'cities', header: 'Service cities', render: (p) => p.cities.join(', ') },
    {
      key: 'pins',
      header: 'Service PIN codes',
      render: (p) => (
        <span className="cellStack">
          <span>{p.pinCodes.slice(0, 3).join(', ')}</span>
          {p.pinCodes.length > 3 && <small>+{p.pinCodes.length - 3} more</small>}
        </span>
      ),
    },
    {
      key: 'home',
      header: 'Home collection',
      render: (p) => <StatusBadge status={p.homeCollection ? 'available' : 'unavailable'} label={p.homeCollection ? 'Yes' : 'No'} />,
    },
    { key: 'tests', header: 'Tests', align: 'end', render: (p) => mappings.filter((m) => m.partnerId === p.id).length },
    { key: 'packages', header: 'Packages', align: 'end', render: (p) => packages.filter((k) => k.partnerId === p.id).length },
    { key: 'active', header: 'Status', render: (p) => <StatusBadge status={p.active ? 'active' : 'inactive'} /> },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '220px',
      render: (p) => (
        <span className="rowActions">
          <Button size="sm" variant="secondary" onClick={() => setEditing(p)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant={p.active ? 'ghost' : 'success'}
            onClick={() => {
              labPartners.patch(p.id, { active: !p.active });
              toast.success(`${p.name} ${p.active ? 'deactivated' : 'activated'}.`);
            }}
          >
            {p.active ? 'Deactivate' : 'Activate'}
          </Button>
        </span>
      ),
    },
  ];

  return (
    <>
      <ListScreen
        caption="Lab partners"
        rows={rows}
        columns={columns}
        rowKey={(p) => p.id}
        search={(p) => `${p.name} ${p.code} ${p.cities.join(' ')} ${p.pinCodes.join(' ')}`}
        searchPlaceholder="Partner, city or PIN code"
        tabs={[
          { id: 'active', label: 'Active', test: (p) => p.active },
          { id: 'inactive', label: 'Inactive', test: (p) => !p.active },
        ]}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setEditing('new')}>
            Add Lab Partner
          </Button>
        }
        emptyIcon="lab"
        empty={{ title: 'No lab partners yet' }}
      />
      <RecordForm
        open={editing !== null}
        title={editing === 'new' ? 'Add Lab Partner' : 'Edit Lab Partner'}
        fields={FIELDS}
        initial={toValues(editing && editing !== 'new' ? editing : undefined)}
        onClose={() => setEditing(null)}
        onSubmit={save}
      />
    </>
  );
}
