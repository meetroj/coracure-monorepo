import { useMemo } from 'react';

import { doctorConsultationsApi } from '@coracure/api';
import type { DoctorConsultation } from '@coracure/api';

import { useStore } from '../state/store';
import { selectAppointments } from '../state/selectors';
import { detailFor, previousConsultations, type Appointment, type AppointmentDetail, type IntakeRow } from './doctor';
import { useResource } from './useResource';

/**
 * What the patient told us at booking, and what the backend knows about this
 * doctor and patient together (API_CONTRACT §7.5, `GET /doctor/consultations/:id`).
 *
 * *** INTAKE ANSWERS HAVE NO FIXED SHAPE. *** They are the answers to the
 * specialty's own intake form, which an administrator defines, stored as
 * free-form JSON. So nothing here looks for a "duration" or "allergies" field
 * by contract — every answer given is shown under its own question, and the
 * three summary lines only pick an answer out when its key plainly names it.
 *
 * What DOES have a shape is `doctorContext.patientHealth`: the allergies,
 * conditions, medications, blood group, height and weight the patient put on
 * their own profile. They follow the intake answers.
 *
 * *** CONSENT IS A YES OR NO. *** `doctorContext` says whether a current
 * teleconsultation consent is on file; there is no version or time to show.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "sleepHours" / "sleep_hours" → "Sleep hours". */
export const questionLabel = (key: string) => {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** One answer as a line of text. An empty answer is left out rather than shown blank. */
export const answerText = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(answerText).filter(Boolean).join(', ');
  return JSON.stringify(v);
};

const ICON: { test: RegExp; icon: IntakeRow['icon'] }[] = [
  { test: /medic|drug|dose/i, icon: 'prescription' },
  { test: /allerg|risk|harm|safety/i, icon: 'alertTriangle' },
  { test: /sever|intens|mood|feel/i, icon: 'heart' },
  { test: /durat|since|long|start|week|month/i, icon: 'calendar' },
];

export const intakeRows = (answers: Record<string, unknown> | null): IntakeRow[] =>
  Object.entries(answers ?? {})
    .map(([key, v]) => ({
      key,
      icon: ICON.find((i) => i.test.test(key))?.icon ?? ('document' as const),
      label: questionLabel(key),
      value: answerText(v),
    }))
    .filter((r) => r.value);

const pick = (rows: IntakeRow[], test: RegExp) => rows.find((r) => test.test(r.key))?.value;

type PatientHealth = NonNullable<NonNullable<DoctorConsultation['doctorContext']>['patientHealth']>;

/**
 * What the patient entered on their own profile, as rows beside the intake
 * answers. Labelled as theirs: it is self-reported, not a finding.
 */
export const healthRows = (h: PatientHealth | undefined): IntakeRow[] => {
  if (!h) return [];
  const rows: [string, IntakeRow['icon'], string, string | null][] = [
    ['allergies', 'alertTriangle', 'Allergies (patient-reported)', h.allergies],
    ['medicalConditions', 'heart', 'Medical conditions (patient-reported)', h.medicalConditions],
    ['currentMedications', 'prescription', 'Current medications (patient-reported)', h.currentMedications],
    // `ab_negative` → "AB−"
    ['bloodGroup', 'document', 'Blood group', h.bloodGroup && h.bloodGroup.replace('_positive', '+').replace('_negative', '−').toUpperCase()],
    ['heightCm', 'document', 'Height', h.heightCm === null ? null : `${h.heightCm} cm`],
    ['weightKg', 'document', 'Weight', h.weightKg === null ? null : `${h.weightKg} kg`],
  ];
  return rows.flatMap(([key, icon, label, value]) => (value?.trim() ? [{ key: `health:${key}`, icon, label, value: value.trim() }] : []));
};

export const detailFromConsultation = (a: Appointment, c: DoctorConsultation | undefined, all: Appointment[]): AppointmentDetail => {
  const base = detailFor(a);
  const last = previousConsultations(a, all)[0];
  const rows = intakeRows(c?.intakeAnswers ?? null);
  const ctx = c?.doctorContext;
  const health = ctx?.patientHealth;
  return {
    ...base,
    concernDetail: pick(rows, /concern|complaint|describe|detail|reason/i) ?? a.concern,
    duration: pick(rows, /durat|how long|since/i) ?? 'Not recorded',
    severity: pick(rows, /sever|intens/i) ?? 'Not recorded',
    medication: pick(rows, /medic|drug/i) ?? (health?.currentMedications?.trim() || 'None reported'),
    intake: [...rows, ...healthRows(health)],
    // this consultation plus the past ones the backend counts (cancelled and expired left out)
    totalConsultations: ctx ? ctx.totalPastConsultationsWithDoctor + 1 : base.totalConsultations,
    consent: { status: !ctx ? 'unknown' : ctx.hasCurrentTeleconsultationConsent ? 'onFile' : 'missing' },
    past: last
      ? { appointmentId: last.id, dateLabel: last.dateLabel, time: last.time, title: base.past?.title ?? 'Consultation', note: last.concern }
      : undefined,
  };
};

/**
 * The detail for one appointment. A real consultation (its id is a UUID) is
 * read from the backend; a demo fixture keeps the local detail it was written
 * with. Past visits come from the appointments actually loaded.
 */
export const useConsultationDetail = (a: Appointment): AppointmentDetail => {
  const all = useStore(selectAppointments);
  const real = UUID.test(a.id);
  const { data } = useConsultation(real ? a.id : undefined);
  return useMemo(() => (real ? detailFromConsultation(a, data, all) : detailFor(a)), [a, all, data, real]);
};

/** One consultation as the backend has it. Nothing is asked for without an id. */
export const useConsultation = (id: string | undefined) =>
  useResource(`doctor:consultation:${id}`, () => doctorConsultationsApi.getConsultation(id as string), { enabled: !!id });
