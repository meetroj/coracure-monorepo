import { useState } from 'react';

import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { labMappings, labPartners, labTests, type LabMapping, type LabTest } from '../../mock/ops/lab';
import { Button, Modal, StatusBadge, type Column } from '../../ui';
import { inr } from '../kit/format';
import { ListScreen } from '../kit/ListScreen';
import { RecordForm, type FieldDef, type Values } from '../kit/RecordForm';
import { newId, useStore } from '../kit/store';

/**
 * Individual Lab Tests (requirements §60, §61). Every test carries a unique
 * CoraCure Test ID - the key prescription extraction, package matching, search
 * and analytics all hang off - so the ID is assigned here and never edited.
 */

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Test name', required: true },
  { key: 'aliases', label: 'Search aliases / alternate names', type: 'tags', hint: 'e.g. HbA1c, HBA1C, Glycated Haemoglobin' },
  { key: 'priceInr', label: 'Customer-facing price (₹)', type: 'number', required: true, validate: (v) => (Number(v) > 0 ? null : 'Enter a price above zero.') },
  { key: 'turnaroundHours', label: 'Expected turnaround (hours)', type: 'number' },
  { key: 'active', label: 'Active', type: 'bool' },
];

const nextCode = (tests: LabTest[]) =>
  `LAB-${String(Math.max(0, ...tests.map((t) => Number(t.code.replace(/\D/g, '')))) + 1).padStart(3, '0')}`;

export function LabTests({ level: _level }: { level: AdminLevel }) {
  const toast = useToast();
  const rows = useStore(labTests);
  const partners = useStore(labPartners);
  const mappings = useStore(labMappings);
  const [editing, setEditing] = useState<LabTest | 'new' | null>(null);
  const [mapping, setMapping] = useState<LabTest | null>(null);

  const save = (v: Values) => {
    const base = editing && editing !== 'new' ? editing : null;
    const name = String(v.name).trim();
    if (rows.some((t) => t.id !== base?.id && t.name.toLowerCase() === name.toLowerCase())) {
      toast.error('A test with that name already exists.');
      return;
    }
    const next: LabTest = {
      id: base?.id ?? newId('lt'),
      code: base?.code ?? nextCode(rows),
      name,
      aliases: v.aliases as string[],
      priceInr: Number(v.priceInr),
      turnaroundHours: Number(v.turnaroundHours) || 24,
      active: Boolean(v.active),
    };
    labTests.upsert(next);
    toast.success(base ? `${name} updated.` : `${name} added as ${next.code}.`);
    setEditing(null);
  };

  const columns: Column<LabTest>[] = [
    { key: 'code', header: 'CoraCure Test ID', render: (t) => <strong>{t.code}</strong> },
    { key: 'name', header: 'Test', render: (t) => t.name },
    { key: 'aliases', header: 'Aliases', render: (t) => (t.aliases.length ? t.aliases.join(', ') : <span className="muted">None</span>) },
    { key: 'price', header: 'Price', align: 'end', render: (t) => inr(t.priceInr) },
    {
      key: 'partners',
      header: 'Lab partners',
      render: (t) => {
        const names = mappings.filter((m) => m.testId === t.id).map((m) => partners.find((p) => p.id === m.partnerId)?.name).filter(Boolean);
        return names.length ? names.join(', ') : <span className="muted">Not mapped</span>;
      },
    },
    { key: 'tat', header: 'Turnaround', render: (t) => `${t.turnaroundHours} h` },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.active ? 'active' : 'inactive'} /> },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '300px',
      render: (t) => (
        <span className="rowActions">
          <Button size="sm" variant="secondary" onClick={() => setEditing(t)}>
            Edit
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setMapping(t)}>
            Map to partners
          </Button>
          <Button
            size="sm"
            variant={t.active ? 'ghost' : 'success'}
            onClick={() => {
              labTests.patch(t.id, { active: !t.active });
              toast.success(`${t.name} ${t.active ? 'deactivated' : 'activated'}.`);
            }}
          >
            {t.active ? 'Deactivate' : 'Activate'}
          </Button>
        </span>
      ),
    },
  ];

  const initial: Values = editing && editing !== 'new'
    ? { name: editing.name, aliases: editing.aliases, priceInr: String(editing.priceInr), turnaroundHours: String(editing.turnaroundHours), active: editing.active }
    : { active: true, turnaroundHours: '24' };

  return (
    <>
      <ListScreen
        caption="Individual lab tests"
        rows={rows}
        columns={columns}
        rowKey={(t) => t.id}
        search={(t) => `${t.code} ${t.name} ${t.aliases.join(' ')}`}
        searchPlaceholder="Test ID, name or alias"
        tabs={[
          { id: 'active', label: 'Active', test: (t) => t.active },
          { id: 'inactive', label: 'Inactive', test: (t) => !t.active },
        ]}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setEditing('new')}>
            Add test
          </Button>
        }
        emptyIcon="lab"
        empty={{ title: 'No tests yet' }}
      />
      <RecordForm
        open={editing !== null}
        title={editing === 'new' ? 'Add test' : `Edit ${(editing as LabTest | null)?.code ?? ''}`}
        fields={FIELDS}
        initial={initial}
        onClose={() => setEditing(null)}
        onSubmit={save}
      />
      {mapping && <MappingModal test={mapping} onClose={() => setMapping(null)} />}
    </>
  );
}

/** Which partners run this test, with each partner's own code and price (§60). */
function MappingModal({ test, onClose }: { test: LabTest; onClose: () => void }) {
  const toast = useToast();
  const partners = useStore(labPartners);
  const all = useStore(labMappings);
  const [draft, setDraft] = useState<Record<string, { on: boolean; code: string; price: string }>>(() =>
    Object.fromEntries(
      partners.map((p) => {
        const m = all.find((x) => x.partnerId === p.id && x.testId === test.id);
        return [p.id, { on: Boolean(m), code: m?.partnerCode ?? '', price: String(m?.partnerPriceInr ?? test.priceInr) }];
      }),
    ),
  );
  const set = (id: string, patch: Partial<{ on: boolean; code: string; price: string }>) =>
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const save = () => {
    const kept = all.filter((m) => m.testId !== test.id);
    const added: LabMapping[] = partners
      .filter((p) => draft[p.id].on)
      .map((p) => ({
        id: `${p.id}:${test.id}`,
        partnerId: p.id,
        testId: test.id,
        partnerCode: draft[p.id].code.trim() || `${p.code}-${test.code}`,
        partnerPriceInr: Number(draft[p.id].price) || test.priceInr,
      }));
    labMappings.replace([...kept, ...added]);
    toast.success(`${test.name} mapped to ${added.length} partner(s).`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Map ${test.code} ${test.name}`}
      width={720}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            Save mapping
          </Button>
        </>
      }
    >
      <p className="muted">A partner can only be offered an order for this test while it is ticked here.</p>
      <div className="stack">
        {partners.map((p) => (
          <div key={p.id} className="formGrid">
            <label className="checkbox">
              <input type="checkbox" checked={draft[p.id].on} onChange={(e) => set(p.id, { on: e.target.checked })} />
              <span>
                <strong>{p.name}</strong> <small className="muted">{p.active ? '' : '(inactive)'}</small>
              </span>
            </label>
            <label className="formRow">
              <span>Partner test code</span>
              <input disabled={!draft[p.id].on} value={draft[p.id].code} placeholder={`${p.code}-${test.code}`} onChange={(e) => set(p.id, { code: e.target.value })} />
            </label>
            <label className="formRow">
              <span>Partner price (₹)</span>
              <input disabled={!draft[p.id].on} type="number" value={draft[p.id].price} onChange={(e) => set(p.id, { price: e.target.value })} />
            </label>
          </div>
        ))}
      </div>
    </Modal>
  );
}
