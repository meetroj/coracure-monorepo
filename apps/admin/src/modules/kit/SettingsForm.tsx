import { useEffect, useState } from 'react';

import { useToast } from '../../lib/toast';
import { settingsDocs, settingsDoc, type SettingsDoc } from '../../mock/ops/admin';
import { Button, Card, SelectField, TextArea, TextField } from '../../ui';
import { useStore } from './store';

/**
 * A settings page built from a field list: Admin Settings, App Settings and
 * Website Settings (requirements §93-§95) are all "a few named values an admin
 * edits and saves", so they share this one form.
 *
 * ponytail: values persist in the in-memory store only. A real build saves the
 * whole page as one `PUT /admin/config/:key` per field, or one document.
 */
export type SettingField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'bool' | 'select' | 'tags' | 'time' | 'url';
  options?: readonly { value: string; label: string }[];
  hint?: string;
};

export type SettingGroup = { id: string; title: string; description?: string; fields: SettingField[] };

type Draft = SettingsDoc['values'];

function GroupCard({ group, canEdit }: { group: SettingGroup; canEdit: boolean }) {
  const toast = useToast();
  const docs = useStore(settingsDocs);
  const saved = settingsDoc(docs, group.id);
  const [draft, setDraft] = useState<Draft>(saved);
  useEffect(() => setDraft(saved), [saved]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = (key: string, value: string | boolean | string[]) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <Card title={group.title}>
      {group.description && <p className="muted">{group.description}</p>}
      <div className="formGrid">
        {group.fields.map((f) => {
          const v = draft[f.key];
          switch (f.type) {
            case 'bool':
              return (
                <label key={f.key} className="checkbox settingToggle">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={Boolean(v)}
                    onChange={(e) => set(f.key, e.target.checked)}
                  />
                  <span>
                    {f.label}
                    {f.hint && <small className="muted"> {f.hint}</small>}
                  </span>
                </label>
              );
            case 'textarea':
              return (
                <TextArea key={f.key} label={f.label} hint={f.hint} rows={3} disabled={!canEdit}
                  value={String(v ?? '')} onChange={(e) => set(f.key, e.target.value)} />
              );
            case 'select':
              return (
                <SelectField key={f.key} label={f.label} hint={f.hint} disabled={!canEdit}
                  options={f.options ?? []} value={String(v ?? '')} onChange={(e) => set(f.key, e.target.value)} />
              );
            case 'tags':
              return (
                <TextField key={f.key} label={f.label} hint={f.hint ?? 'Separate with commas.'} disabled={!canEdit}
                  value={Array.isArray(v) ? v.join(', ') : ''}
                  onChange={(e) => set(f.key, e.target.value.split(',').map((x) => x.trim()))} />
              );
            default:
              return (
                <TextField key={f.key} label={f.label} hint={f.hint} disabled={!canEdit}
                  type={f.type === 'number' ? 'number' : f.type === 'time' ? 'time' : f.type === 'url' ? 'url' : 'text'}
                  value={String(v ?? '')} onChange={(e) => set(f.key, e.target.value)} />
              );
          }
        })}
      </div>
      {canEdit && (
        <div className="formActions">
          <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(saved)}>
            Discard
          </Button>
          <Button
            variant="primary"
            disabled={!dirty}
            onClick={() => {
              const cleaned: Draft = Object.fromEntries(
                Object.entries(draft).map(([k, val]) => [k, Array.isArray(val) ? val.filter(Boolean) : val]),
              );
              settingsDocs.upsert({ id: group.id, values: cleaned });
              toast.success(`${group.title} saved.`);
            }}
          >
            Save
          </Button>
        </div>
      )}
    </Card>
  );
}

export function SettingsForm({ groups, canEdit = true }: { groups: SettingGroup[]; canEdit?: boolean }) {
  return (
    <div className="stack">
      {groups.map((g) => (
        <GroupCard key={g.id} group={g} canEdit={canEdit} />
      ))}
    </div>
  );
}
