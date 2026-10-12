import { useState } from 'react';

import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { labMappings, labPackages, labPartners, labTests, partnerName, testName, type LabPackage } from '../../mock/ops/lab';
import { Button, StatusBadge, type Column } from '../../ui';
import { inr } from '../kit/format';
import { ListScreen, type ListFilter } from '../kit/ListScreen';
import { RecordForm, type FieldDef, type Values } from '../kit/RecordForm';
import { newId, useStore } from '../kit/store';

/**
 * Lab Test Packages (requirements §62, §63, §95-§98).
 *
 * A package belongs to exactly one partner and is a fixed battery of tests at
 * a set price. The form only accepts tests that partner actually runs, so a
 * package can never promise a test its partner cannot perform.
 */

export function LabPackages({ level: _level }: { level: AdminLevel }) {
  const toast = useToast();
  const rows = useStore(labPackages);
  const partners = useStore(labPartners);
  const tests = useStore(labTests);
  const mappings = useStore(labMappings);
  const [editing, setEditing] = useState<LabPackage | 'new' | null>(null);

  const partnerOptions = partners.map((p) => ({ value: p.id, label: p.name }));

  const fields: FieldDef[] = [
    { key: 'partnerId', label: 'Lab Partner', type: 'select', required: true, options: partnerOptions },
    { key: 'name', label: 'Package name', required: true },
    {
      key: 'testIds',
      label: 'Included tests',
      type: 'multi',
      required: true,
      options: tests.filter((t) => t.active).map((t) => ({ value: t.id, label: `${t.code} ${t.name}` })),
      validate: (v, all) => {
        const partnerId = String(all.partnerId ?? '');
        const missing = (v as string[]).filter((id) => !mappings.some((m) => m.partnerId === partnerId && m.testId === id));
        return missing.length ? `${partnerName(partnerId)} does not run: ${missing.map(testName).join(', ')}. Map the test to that partner first.` : null;
      },
    },
    { key: 'priceInr', label: 'Package price (₹)', type: 'number', required: true, validate: (v) => (Number(v) > 0 ? null : 'Enter a price above zero.') },
    { key: 'active', label: 'Active', type: 'bool' },
  ];

  const save = (v: Values) => {
    const base = editing && editing !== 'new' ? editing : null;
    const next: LabPackage = {
      id: base?.id ?? newId('pk'),
      code: base?.code ?? `PKG-${String(rows.length + 1).padStart(3, '0')}`,
      partnerId: String(v.partnerId),
      name: String(v.name).trim(),
      testIds: v.testIds as string[],
      priceInr: Number(v.priceInr),
      active: Boolean(v.active),
    };
    labPackages.upsert(next);
    toast.success(base ? `${next.name} updated.` : `${next.name} added.`);
    setEditing(null);
  };

  const filters: ListFilter<LabPackage>[] = [
    { key: 'partner', label: 'Lab partner', options: partnerOptions, test: (p, v) => p.partnerId === v },
  ];

  const columns: Column<LabPackage>[] = [
    {
      key: 'name',
      header: 'Package',
      render: (p) => (
        <span className="cellStack">
          <strong>{p.name}</strong>
          <small>{p.code}</small>
        </span>
      ),
    },
    { key: 'partner', header: 'Lab Partner', render: (p) => partnerName(p.partnerId) },
    { key: 'tests', header: 'Included tests', render: (p) => p.testIds.map(testName).join(', ') },
    { key: 'count', header: 'Tests', align: 'end', render: (p) => p.testIds.length },
    { key: 'price', header: 'Price', align: 'end', render: (p) => inr(p.priceInr) },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.active ? 'active' : 'inactive'} /> },
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
              labPackages.patch(p.id, { active: !p.active });
              toast.success(`${p.name} ${p.active ? 'deactivated' : 'activated'}.`);
            }}
          >
            {p.active ? 'Deactivate' : 'Activate'}
          </Button>
        </span>
      ),
    },
  ];

  const initial: Values = editing && editing !== 'new'
    ? { partnerId: editing.partnerId, name: editing.name, testIds: editing.testIds, priceInr: String(editing.priceInr), active: editing.active }
    : { active: true };

  return (
    <>
      <ListScreen
        caption="Lab test packages"
        rows={rows}
        columns={columns}
        rowKey={(p) => p.id}
        search={(p) => `${p.name} ${p.code}`}
        searchPlaceholder="Package name or ID"
        filters={filters}
        tabs={[
          { id: 'active', label: 'Active', test: (p) => p.active },
          { id: 'inactive', label: 'Inactive', test: (p) => !p.active },
        ]}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setEditing('new')}>
            Add package
          </Button>
        }
        emptyIcon="lab"
        empty={{ title: 'No packages yet' }}
      />
      <RecordForm
        open={editing !== null}
        title={editing === 'new' ? 'Add package' : 'Edit package'}
        fields={fields}
        initial={initial}
        onClose={() => setEditing(null)}
        onSubmit={save}
        width={620}
      />
    </>
  );
}
