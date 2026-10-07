import { useEffect } from 'react';

import { doctorTemplatesApi } from '@coracure/api';
import type { ClinicalTemplateContent, ClinicalTemplateRecord } from '@coracure/api';
import { ApiError, messageFor } from '@coracure/api/errors';

import { getState } from '../state/store';
import { selectDoctor } from '../state/selectors';
import { setTemplates } from '../state/actions';
import type { ClinicalTemplate, Medicine, ProfessionalType } from './clinical';
import { seedResource, useResource } from './useResource';

/**
 * The doctor's own templates against the real backend (`/doctor/clinical-templates`).
 *
 * The screen reads `state.templates`; the list loads into it, and every change
 * goes through the API first, then lands in the store AND the cache (so the next
 * mount does not lay the list from before the change over it). Applying a
 * template stays a local merge into the draft - it never touches the server.
 */

export const KEYS = { list: 'doctor:clinical-templates' };

const SPECIALTY: Record<ProfessionalType, string> = {
  psychiatrist: 'Psychiatry',
  psychologist: 'Psychology',
  therapist: 'Counselling',
  counsellor: 'Counselling',
};

type Med = Omit<Medicine, 'id'>;

const fromServerMed = (m: ClinicalTemplateContent['meds'][number]): Med => ({
  name: m.name,
  generic: m.genericName ?? '',
  dose: m.dose,
  frequency: m.frequency,
  duration: m.duration,
  route: m.route ?? '',
  quantity: m.quantity ?? '',
  instruction: m.instructions ?? '',
});

const opt = (s: string) => s.trim() || undefined;

const toServerMed = (m: Med): ClinicalTemplateContent['meds'][number] => ({
  name: m.name.trim(),
  dose: m.dose.trim(),
  frequency: m.frequency.trim(),
  duration: m.duration.trim(),
  ...(opt(m.instruction) ? { instructions: opt(m.instruction) } : {}),
  ...(opt(m.generic) ? { genericName: opt(m.generic) } : {}),
  ...(opt(m.route) ? { route: opt(m.route) } : {}),
  ...(opt(m.quantity) ? { quantity: opt(m.quantity) } : {}),
});

/** Counts come from the content, so a card can never overstate it. */
export const toTemplate = (r: ClinicalTemplateRecord, professionalType: ProfessionalType): ClinicalTemplate => {
  const meds = (r.content?.meds ?? []).map(fromServerMed);
  const advice = r.content?.advice ?? [];
  const donts = r.content?.donts ?? [];
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    professionalType,
    specialty: r.specialty,
    description: r.description,
    medicines: meds.length,
    adviceItems: advice.length,
    warningSigns: donts.length,
    notes: 0,
    mine: true,
    content: { meds, advice, donts },
  };
};

const doctorType = () => selectDoctor(getState()).professionalType;

/** The server's list, laid into the store once it loads. A failure keeps what is shown. */
export const useTemplates = () => {
  const resource = useResource(KEYS.list, async () => {
    const type = doctorType();
    return (await doctorTemplatesApi.list()).map((r) => toTemplate(r, type));
  });
  useEffect(() => {
    if (resource.data) setTemplates(resource.data);
  }, [resource.data]);
  return resource;
};

const keep = (list: ClinicalTemplate[]) => {
  seedResource(KEYS.list, list);
  setTemplates(list);
};

/** One change at a time: a second tap while one is in flight is ignored, not queued. */
let busy = false;
const once = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
  if (busy) return undefined;
  busy = true;
  try {
    return await fn();
  } finally {
    busy = false;
  }
};

export type TemplateDraft = {
  name: string;
  description?: string;
  kind: ClinicalTemplate['kind'];
  content: ClinicalTemplate['content'];
};

const bodyFor = (d: TemplateDraft) => ({
  name: d.name.trim().slice(0, 80),
  description: (d.description ?? '').trim().slice(0, 300),
  kind: d.kind,
  specialty: SPECIALTY[doctorType()],
  content: { meds: d.content.meds.map(toServerMed), advice: d.content.advice, donts: d.content.donts },
});

/** Saves a new template. Resolves to it, or undefined if another change was in flight. */
export const createTemplate = (d: TemplateDraft) =>
  once(async () => {
    const made = toTemplate(await doctorTemplatesApi.create(bodyFor(d)), doctorType());
    keep([...getState().templates, made]);
    return made;
  });

export const duplicateTemplate = (t: ClinicalTemplate) =>
  createTemplate({ name: `${t.name.slice(0, 73)} (Copy)`, description: t.description, kind: t.kind, content: t.content });

export const updateTemplate = (id: string, d: TemplateDraft) =>
  once(async () => {
    const saved = toTemplate(await doctorTemplatesApi.update(id, bodyFor(d)), doctorType());
    keep(getState().templates.map((t) => (t.id === id ? saved : t)));
    return saved;
  });

export const deleteTemplate = (id: string) =>
  once(async () => {
    await doctorTemplatesApi.remove(id);
    keep(getState().templates.filter((t) => t.id !== id));
    return true;
  });

/** Branches on the code, never the message; everything else falls through to the shared copy. */
export const templateMessage = (e: unknown) =>
  ApiError.is(e) && e.code === 'TEMPLATE_LIMIT_REACHED'
    ? 'You can keep up to 50 templates. Delete one to save another.'
    : messageFor(e);
