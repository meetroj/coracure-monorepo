import { api } from '../http';

/** The doctor's own clinical templates (`/doctor/clinical-templates`). */

export type TemplateKind = 'medication' | 'advice' | 'therapy' | 'followUp';

/** The same shape the clinical record's medicine line accepts, minus its id. */
export type TemplateMedicine = {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions?: string;
  genericName?: string;
  route?: string;
  quantity?: string;
};

export type TemplateContent = { meds: TemplateMedicine[]; advice: string[]; donts: string[] };

export type TemplateInput = {
  name: string;
  description?: string;
  kind: TemplateKind;
  specialty?: string;
  content: TemplateContent;
};

export type TemplateRecord = Required<Omit<TemplateInput, 'content'>> & {
  id: string;
  content: TemplateContent;
  createdAt: string;
  updatedAt: string;
};

export const list = (): Promise<TemplateRecord[]> => api.get<TemplateRecord[]>('/doctor/clinical-templates');

export const create = (input: TemplateInput): Promise<TemplateRecord> =>
  api.post<TemplateRecord>('/doctor/clinical-templates', input);

export const update = (id: string, patch: Partial<TemplateInput>): Promise<TemplateRecord> =>
  api.patch<TemplateRecord>(`/doctor/clinical-templates/${id}`, patch);

export const remove = (id: string): Promise<void> => api.delete<void>(`/doctor/clinical-templates/${id}`);
