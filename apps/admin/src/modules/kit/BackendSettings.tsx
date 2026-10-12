import { useCallback, useEffect, useState } from 'react';

import {
  GROUP_LABEL,
  changedValues,
  fieldProblem,
  settings,
  type Json,
  type SettingFieldView,
  type SettingsGroup,
  type SettingsGroupView,
} from '../../api/liveSettings';
import { useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import { Async, Button, Card, Notice, SelectField, TextArea, TextField } from '../../ui';
import { languageName } from '../../api/livePatients';

/**
 * One settings group, drawn from what the backend says about it.
 *
 * Every field arrives with its label, type, limits and whether this admin may
 * change it, so there is no list of settings in the panel to fall out of step.
 * A field the admin's role does not own is shown read-only with the value that
 * is in force; the rest save together, and only what changed is sent.
 */

type Obj = { [key: string]: Json };

const asObj = (v: Json): Obj => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {});

/* -------------------------------- editors ---------------------------------- */

type EditorProps = { field: SettingFieldView; value: Json; onChange: (v: Json) => void; disabled: boolean };

/** `2026-10-12T09:30:00+05:30` into what a `datetime-local` input shows, in the browser's clock. */
const toLocalInput = (iso: Json): string => {
  if (typeof iso !== 'string' || !iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function ObjectEditor({ field, value, onChange, disabled }: EditorProps) {
  const obj = asObj(value);
  const shape = asObj(field.default);
  const set = (key: string, v: Json) => onChange({ ...obj, [key]: v });
  return (
    <fieldset className="checkGroup">
      <legend>{field.label}</legend>
      <div className="formGrid">
        {Object.keys(shape).map((key) => {
          const sample = shape[key];
          const current = obj[key] ?? sample;
          if (typeof sample === 'boolean') {
            return (
              <label key={key} className="checkbox">
                <input type="checkbox" disabled={disabled} checked={Boolean(current)} onChange={(e) => set(key, e.target.checked)} />
                {key}
              </label>
            );
          }
          if (typeof sample === 'number') {
            return (
              <TextField
                key={key}
                label={key}
                type="number"
                disabled={disabled}
                value={current === null ? '' : String(current)}
                onChange={(e) => set(key, e.target.value === '' ? 0 : Number(e.target.value))}
              />
            );
          }
          // Strings and nullable strings: a blank is null, which the backend reads as "not set".
          const isTime = /At$/.test(key);
          return (
            <TextField
              key={key}
              label={key}
              type={isTime ? 'datetime-local' : 'text'}
              disabled={disabled}
              value={isTime ? toLocalInput(current) : typeof current === 'string' ? current : ''}
              onChange={(e) => {
                const text = e.target.value;
                if (text === '') return set(key, null);
                set(key, isTime ? new Date(text).toISOString() : text);
              }}
            />
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * An option is stored as a code (`en`, `hi`), and a person reads the name. Codes that are not
 * languages (`sms`, `email`, ...) come back unchanged.
 */
const optionLabel = (code: string): string => languageName(code);

function StringListEditor({ field, value, onChange, disabled }: EditorProps) {
  const list = Array.isArray(value) ? value.map(String) : [];
  if (field.options) {
    return (
      <fieldset className="checkGroup">
        <legend>{field.label}</legend>
        {field.options.map((o) => (
          <label key={o} className="checkOption">
            <input
              type="checkbox"
              disabled={disabled}
              checked={list.includes(o)}
              onChange={(e) => onChange(e.target.checked ? [...list, o] : list.filter((x) => x !== o))}
            />
            {optionLabel(o)}
          </label>
        ))}
      </fieldset>
    );
  }
  return (
    <TextField
      label={field.label}
      hint="Separate with commas."
      disabled={disabled}
      value={list.join(', ')}
      onChange={(e) => onChange(e.target.value.split(',').map((x) => x.trim()).filter(Boolean))}
    />
  );
}

function BooleanMapEditor({ field, value, onChange, disabled }: EditorProps) {
  const map = asObj(value);
  const [name, setName] = useState('');
  const valid = /^[a-z][a-z0-9_]{0,39}$/.test(name) && !(name in map);
  return (
    <fieldset className="checkGroup">
      <legend>{field.label}</legend>
      {Object.keys(map).length === 0 && <p className="muted">None yet.</p>}
      {Object.keys(map).sort().map((k) => (
        <label key={k} className="checkOption">
          <input type="checkbox" disabled={disabled} checked={Boolean(map[k])} onChange={(e) => onChange({ ...map, [k]: e.target.checked })} />
          <code>{k}</code>
        </label>
      ))}
      {!disabled && (
        <div className="formGrid">
          <TextField
            label="New switch"
            value={name}
            hint="Lower-case words joined by underscores."
            onChange={(e) => setName(e.target.value.trim())}
          />
          <Button
            variant="secondary"
            disabled={!valid}
            onClick={() => {
              onChange({ ...map, [name]: true });
              setName('');
            }}
          >
            Add switch
          </Button>
        </div>
      )}
    </fieldset>
  );
}

function StringMapEditor({ field, value, onChange, disabled }: EditorProps) {
  const map = asObj(value);
  const [key, setKey] = useState('');
  const keyOk = /^[a-z][a-z0-9_.]{0,59}$/.test(key) && !(key in map);
  return (
    <fieldset className="checkGroup">
      <legend>{field.label}</legend>
      {Object.keys(map).length === 0 && <p className="muted">None yet.</p>}
      {Object.keys(map).sort().map((k) => (
        <div key={k} className="formGrid">
          <TextArea
            label={k}
            rows={2}
            disabled={disabled}
            value={String(map[k] ?? '')}
            onChange={(e) => onChange({ ...map, [k]: e.target.value })}
          />
          {!disabled && (
            <Button
              variant="ghost"
              onClick={() => {
                const { [k]: _gone, ...rest } = map;
                onChange(rest);
              }}
            >
              Remove {k}
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <div className="formGrid">
          <TextField label="New key" value={key} hint="Lower-case words joined by underscores or dots." onChange={(e) => setKey(e.target.value.trim())} />
          <Button
            variant="secondary"
            disabled={!keyOk}
            onClick={() => {
              onChange({ ...map, [key]: '' });
              setKey('');
            }}
          >
            Add
          </Button>
        </div>
      )}
    </fieldset>
  );
}

function LinkListEditor({ field, value, onChange, disabled }: EditorProps) {
  const links = Array.isArray(value) ? value.map((l) => asObj(l)) : [];
  const set = (i: number, patch: Obj) => onChange(links.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <fieldset className="checkGroup">
      <legend>{field.label}</legend>
      {links.length === 0 && <p className="muted">No links yet.</p>}
      {links.map((l, i) => (
        <div key={i} className="formGrid">
          <TextField label="Label" disabled={disabled} value={String(l.label ?? '')} onChange={(e) => set(i, { label: e.target.value })} />
          <TextField
            label="Address"
            type="url"
            disabled={disabled}
            value={String(l.url ?? '')}
            hint="Must start with https://"
            onChange={(e) => set(i, { url: e.target.value })}
          />
          <SelectField
            label="Where"
            disabled={disabled}
            value={String(l.group ?? 'footer')}
            onChange={(e) => set(i, { group: e.target.value })}
            options={[
              { value: 'header', label: 'Header' },
              { value: 'footer', label: 'Footer' },
              { value: 'social', label: 'Social' },
            ]}
          />
          {!disabled && (
            <Button variant="ghost" onClick={() => onChange(links.filter((_, j) => j !== i))}>
              Remove
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button variant="secondary" icon="plus" onClick={() => onChange([...links, { label: '', url: 'https://', group: 'footer' }])}>
          Add a link
        </Button>
      )}
    </fieldset>
  );
}

function Editor(props: EditorProps) {
  const { field, value, onChange, disabled } = props;
  const hint = [field.description, field.unit ? `In ${field.unit}.` : null].filter(Boolean).join(' ');
  switch (field.type) {
    case 'boolean':
      return (
        <label className="checkbox settingToggle">
          <input type="checkbox" disabled={disabled} checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <span>
            {field.label}
            <small className="muted"> {field.description}</small>
          </span>
        </label>
      );
    case 'integer':
    case 'number':
      return (
        <TextField
          label={field.label}
          type="number"
          hint={hint}
          disabled={disabled}
          min={field.min ?? undefined}
          max={field.max ?? undefined}
          value={typeof value === 'number' ? String(value) : ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      );
    case 'enum':
      return (
        <SelectField
          label={field.label}
          hint={hint}
          disabled={disabled}
          value={String(value ?? '')}
          options={(field.options ?? []).map((o) => ({ value: o, label: optionLabel(o) }))}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'object':
      return <ObjectEditor {...props} />;
    case 'string_list':
      return <StringListEditor {...props} />;
    case 'boolean_map':
      return <BooleanMapEditor {...props} />;
    case 'string_map':
      return <StringMapEditor {...props} />;
    case 'link_list':
      return <LinkListEditor {...props} />;
    default:
      return null;
  }
}

/* --------------------------------- screen ---------------------------------- */

function GroupCard({ view, onSaved }: { view: SettingsGroupView; onSaved: () => void }) {
  const toast = useToast();
  const initial = Object.fromEntries(view.fields.map((f) => [f.key, f.value])) as Record<string, Json>;
  const [draft, setDraft] = useState<Record<string, Json>>(initial);
  const [busy, setBusy] = useState(false);
  // A reload after a save, or a refresh from elsewhere, replaces the draft.
  useEffect(() => setDraft(initial), [JSON.stringify(initial)]); // eslint-disable-line react-hooks/exhaustive-deps

  const changed = changedValues(view.fields, draft);
  const dirty = Object.keys(changed).length > 0;
  const anyEditable = view.fields.some((f) => f.editable);

  const save = async () => {
    for (const f of view.fields) {
      if (!(f.key in changed)) continue;
      const problem = fieldProblem(f, changed[f.key]);
      if (problem) {
        toast.error(problem);
        return;
      }
    }
    setBusy(true);
    try {
      await settings.save(view.group, changed);
      toast.success('Settings saved.');
      onSaved();
    } catch (e) {
      toast.fromError(e, 'Could not save these settings.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={GROUP_LABEL[view.group]}>
      {!anyEditable && <Notice tone="info">Your role can read these settings and not change them.</Notice>}
      <div className="stack">
        {view.fields.map((f) => (
          <div key={f.key}>
            <Editor
              field={f}
              value={draft[f.key] ?? f.value}
              disabled={!f.editable}
              onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
            />
            {f.enforcedBy === null && (
              <p className="muted small">Stored, and nothing in the platform applies it yet.</p>
            )}
            {!f.editable && anyEditable && <p className="muted small">Owned by another role.</p>}
          </div>
        ))}
      </div>
      {anyEditable && (
        <div className="formActions">
          <Button variant="ghost" disabled={!dirty || busy} onClick={() => setDraft(initial)}>
            Discard
          </Button>
          <Button variant="primary" loading={busy} disabled={!dirty} onClick={save}>
            Save
          </Button>
        </div>
      )}
    </Card>
  );
}

function Group({ group }: { group: SettingsGroup }) {
  const fetcher = useCallback(() => settings.group(group), [group]);
  const state = useResource<SettingsGroupView>(fetcher, [group]);
  return (
    <Async state={state} resource="settings" skeletonRows={4}>
      {(view) => <GroupCard view={view} onSaved={state.reload} />}
    </Async>
  );
}

export function BackendSettings({ groups }: { groups: readonly SettingsGroup[] }) {
  return (
    <div className="stack">
      {groups.map((g) => (
        <Group key={g} group={g} />
      ))}
    </div>
  );
}

