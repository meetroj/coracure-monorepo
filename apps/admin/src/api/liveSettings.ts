import { request } from './http';

/**
 * Settings against the backend: `GET /admin/settings`, `GET /admin/settings/:group`
 * and `PUT /admin/settings/:group`.
 *
 * Source of truth: `SettingFieldView`, `SettingsGroupView`, `SaveSettingsDto`.
 *
 * *** THE BACKEND DESCRIBES ITS OWN FORM. *** Each field arrives with its label,
 * type, limits, current value and whether THIS admin may change it, so the panel
 * holds no list of settings of its own: a field the backend adds appears, and a
 * field a role does not own is read-only for that role. A save names only the
 * keys that changed, because every key written is audited with its before and
 * after.
 */

export type SettingsGroup = 'business_rules' | 'service_availability' | 'app_settings' | 'website_settings';

export type FieldType =
  | 'integer'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'object'
  | 'string_list'
  | 'string_map'
  | 'boolean_map'
  | 'link_list';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type SettingFieldView = {
  key: string;
  label: string;
  description: string;
  type: FieldType;
  unit: string | null;
  min: number | null;
  max: number | null;
  options: readonly string[] | null;
  default: Json;
  value: Json;
  editable: boolean;
  /** Where the value is obeyed; null means it is stored and nothing applies it yet. */
  enforcedBy: string | null;
};

export type SettingsGroupView = {
  group: SettingsGroup;
  fields: SettingFieldView[];
  related: { key: string; description: string | null; value: Json | undefined; editable: boolean }[];
};

export const GROUP_LABEL: Record<SettingsGroup, string> = {
  business_rules: 'Business rules',
  service_availability: 'Service availability',
  app_settings: 'App settings',
  website_settings: 'Website settings',
};

/** Whether two values are the same, whatever order an object listed its keys in. */
export function sameValue(a: Json | undefined, b: Json | undefined): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => sameValue(x, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    return ka.length === kb.length && ka.every((k, i) => k === kb[i] && sameValue(a[k], b[k]));
  }
  return false;
}

/**
 * The values to send: only the editable fields whose draft differs from what
 * was loaded. Nothing changed is an empty object, and the screen does not call.
 */
export function changedValues(fields: readonly SettingFieldView[], draft: Record<string, Json>): Record<string, Json> {
  const out: Record<string, Json> = {};
  for (const f of fields) {
    if (!f.editable) continue;
    if (f.key in draft && !sameValue(draft[f.key], f.value)) out[f.key] = draft[f.key];
  }
  return out;
}

/** What the form can check before the request: the limits the backend states. */
export function fieldProblem(f: SettingFieldView, value: Json): string | null {
  if (f.type === 'integer' || f.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return `${f.label}: enter a number.`;
    if (f.type === 'integer' && !Number.isInteger(value)) return `${f.label}: enter a whole number.`;
    if (f.min !== null && value < f.min) return `${f.label}: at least ${f.min}.`;
    if (f.max !== null && value > f.max) return `${f.label}: at most ${f.max}.`;
  }
  if (f.type === 'enum' && f.options && !f.options.includes(String(value))) return `${f.label}: choose one of the options.`;
  if (f.type === 'string_list' && Array.isArray(value) && value.length === 0 && f.options) return `${f.label}: keep at least one.`;
  return null;
}

export const settings = {
  group: (group: SettingsGroup) => request<SettingsGroupView>(`/admin/settings/${group}`),

  save: (group: SettingsGroup, values: Record<string, Json>) => {
    if (Object.keys(values).length === 0) return Promise.reject(new Error('Nothing has changed.'));
    return request<SettingsGroupView>(`/admin/settings/${group}`, { method: 'PUT', body: { values } });
  },
};
