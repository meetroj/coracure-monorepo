import { createStore, useStore } from '../../modules/kit/store';

/**
 * Master data (requirements §10, §90-§92).
 *
 * *** NOTHING ELSE IN THE PANEL HARD-CODES A SPECIALTY. *** The Specialists,
 * Super-specialists, Paramedical and Veterinary screens, their filters, the
 * provider forms and the analytics filters all read this store, so adding a
 * specialty here is enough for it to appear everywhere (§10, last paragraph).
 */

export type MasterList =
  | 'medical'
  | 'super'
  | 'paramedical'
  | 'veterinary'
  | 'language'
  | 'consultation_type'
  | 'ticket_category'
  | 'document_type';

export type MasterItem = { id: string; list: MasterList; name: string; active: boolean; order: number };

export const MASTER_LISTS: { id: MasterList; label: string; group: 'Provider' | 'Other'; hint: string }[] = [
  { id: 'medical', label: 'Medical Specialties', group: 'Provider', hint: 'Shown under Specialists.' },
  { id: 'super', label: 'Super-specialties', group: 'Provider', hint: 'Shown under Super-specialists.' },
  { id: 'paramedical', label: 'Paramedical Specialties', group: 'Provider', hint: 'Shown under Paramedical Professionals.' },
  { id: 'veterinary', label: 'Veterinary Specialties', group: 'Provider', hint: 'Shown under Veterinary Specialists.' },
  { id: 'language', label: 'Languages', group: 'Other', hint: 'Consultation and app languages.' },
  { id: 'consultation_type', label: 'Consultation types', group: 'Other', hint: 'How a consultation is held.' },
  { id: 'ticket_category', label: 'Support-ticket categories', group: 'Other', hint: 'Used by Support Tickets.' },
  { id: 'document_type', label: 'Provider document types', group: 'Other', hint: 'What a provider is asked to upload.' },
];

const seed = (list: MasterList, names: string[]): MasterItem[] =>
  names.map((name, i) => ({ id: `md-${list}-${i + 1}`, list, name, active: true, order: i + 1 }));

export const masterStore = createStore<MasterItem>([
  ...seed('medical', ['General Medicine', 'Family Medicine', 'Psychiatry', 'Paediatrics', 'Dermatology', 'Obstetrics & Gynaecology', 'ENT', 'Ophthalmology']),
  ...seed('super', ['Cardiology', 'Neurology', 'Gastroenterology', 'Nephrology', 'Endocrinology', 'Oncology']),
  ...seed('paramedical', ['Dietitian / Nutritionist', 'Physiotherapist', 'Psychologist', 'Occupational Therapist', 'Speech Therapist', 'Other approved professionals']),
  ...seed('veterinary', ['Companion Animal Medicine', 'Livestock Medicine', 'Veterinary Surgery', 'Veterinary Dermatology']),
  ...seed('language', ['English', 'Hindi', 'Marathi', 'Tamil', 'Kannada', 'Bengali', 'Malayalam', 'Gujarati']),
  ...seed('consultation_type', ['Video', 'Audio', 'Instant', 'Follow-up']),
  ...seed('ticket_category', ['Patient', 'Provider', 'Lab', 'Payment', 'Technical', 'Other']),
  ...seed('document_type', ['Government ID', 'Degree Certificate', 'Registration Certificate', 'Experience Certificate', 'Digital Signature']),
]);

/** A list's items in the order the admin arranged them. */
export const itemsOf = (all: MasterItem[], list: MasterList, activeOnly = false): MasterItem[] =>
  all
    .filter((i) => i.list === list && (!activeOnly || i.active))
    .sort((a, b) => a.order - b.order);

/** Active names of a list - what a filter dropdown or a form select offers. */
export const useMasterNames = (list: MasterList): string[] =>
  itemsOf(useStore(masterStore), list, true).map((i) => i.name);

/** The same, as `{ value, label }` options. */
export const useMasterOptions = (list: MasterList): { value: string; label: string }[] =>
  useMasterNames(list).map((n) => ({ value: n, label: n }));
