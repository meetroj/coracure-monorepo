import { useEffect, useState } from 'react';

import { Button, Modal, SelectField, TextArea, TextField } from '../../ui';

/**
 * A modal form built from a field list, for the many small add/edit dialogs
 * the spec asks for (lab partner, test, user, master-data item, ...).
 *
 * Values are plain strings / booleans / string arrays; the caller maps them
 * to its own row type. Never spread the values into a request body - pick the
 * fields you mean (the backend runs `forbidNonWhitelisted`).
 */
export type Opt = { value: string; label: string };

export type Value = string | boolean | string[];
export type Values = Record<string, Value>;

export type FieldDef = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'date' | 'textarea' | 'select' | 'multi' | 'tags' | 'bool';
  options?: readonly Opt[];
  required?: boolean;
  hint?: string;
  placeholder?: string;
  /** Rejects a value the field's own rules cannot catch, e.g. a PIN code pattern. */
  validate?: (value: Value, all: Values) => string | null;
};

const emptyOf = (f: FieldDef): Value =>
  f.type === 'bool' ? false : f.type === 'multi' ? [] : '';

export function RecordForm({
  open,
  title,
  fields,
  initial,
  submitLabel = 'Save',
  onClose,
  onSubmit,
  width = 560,
}: {
  open: boolean;
  title: string;
  fields: readonly FieldDef[];
  initial?: Values;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: Values) => void;
  width?: number;
}) {
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // A fresh form every time it opens - never carry the last record's values over.
  useEffect(() => {
    if (!open) return;
    setValues(
      Object.fromEntries(
        fields.map((f) => {
          const v = initial?.[f.key];
          // Tags are edited as raw text so a trailing comma survives typing.
          return [f.key, f.type === 'tags' ? (Array.isArray(v) ? v.join(', ') : '') : (v ?? emptyOf(f))];
        }),
      ),
    );
    setErrors({});
  }, [open]);

  const set = (key: string, value: Value) => setValues((v) => ({ ...v, [key]: value }));

  const submit = () => {
    const next: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.key] ?? emptyOf(f);
      const blank = Array.isArray(v) ? v.length === 0 : typeof v === 'string' ? v.trim() === '' : false;
      if (f.required && blank) next[f.key] = `${f.label} is required.`;
      else if (f.validate) {
        const msg = f.validate(v, values);
        if (msg) next[f.key] = msg;
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const out: Values = { ...values };
    for (const f of fields) {
      if (f.type === 'tags') out[f.key] = String(values[f.key] ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    }
    onSubmit(out);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={width}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            {submitLabel}
          </Button>
        </>
      }
    >
      {fields.map((f) => {
        const v = values[f.key] ?? emptyOf(f);
        const error = errors[f.key];
        switch (f.type) {
          case 'textarea':
            return (
              <TextArea key={f.key} label={f.label} required={f.required} hint={f.hint} error={error} rows={3}
                value={v as string} onChange={(e) => set(f.key, e.target.value)} />
            );
          case 'select':
            return (
              <SelectField key={f.key} label={f.label} required={f.required} hint={f.hint} error={error}
                options={[{ value: '', label: 'Select…' }, ...(f.options ?? [])]}
                value={v as string} onChange={(e) => set(f.key, e.target.value)} />
            );
          case 'bool':
            return (
              <label key={f.key} className="checkbox" style={{ marginBottom: 'var(--space-md)' }}>
                <input type="checkbox" checked={Boolean(v)} onChange={(e) => set(f.key, e.target.checked)} />
                {f.label}
              </label>
            );
          case 'multi':
            return (
              <fieldset key={f.key} className="formRow" style={{ border: 0, padding: 0 }}>
                <legend style={{ fontWeight: 'var(--weight-strong)', marginBottom: 4 }}>{f.label}</legend>
                <div className="checkGroup">
                  {(f.options ?? []).map((o) => {
                    const list = v as string[];
                    return (
                      <label key={o.value} className="checkbox">
                        <input
                          type="checkbox"
                          checked={list.includes(o.value)}
                          onChange={(e) =>
                            set(f.key, e.target.checked ? [...list, o.value] : list.filter((x) => x !== o.value))
                          }
                        />
                        {o.label}
                      </label>
                    );
                  })}
                </div>
                {error && <p className="fieldError">{error}</p>}
              </fieldset>
            );
          case 'tags':
            return (
              <TextField key={f.key} label={f.label} required={f.required} error={error}
                hint={f.hint ?? 'Separate with commas.'} placeholder={f.placeholder}
                value={v as string} onChange={(e) => set(f.key, e.target.value)} />
            );
          default:
            return (
              <TextField key={f.key} label={f.label} required={f.required} hint={f.hint} error={error}
                type={f.type ?? 'text'} placeholder={f.placeholder}
                value={v as string} onChange={(e) => set(f.key, e.target.value)} />
            );
        }
      })}
    </Modal>
  );
}
