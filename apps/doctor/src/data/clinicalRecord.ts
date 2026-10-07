import { useEffect, useRef } from 'react';

import { doctorClinicalRecordApi } from '@coracure/api';
import type { ClinicalMedicineInput, ClinicalOutstanding, ClinicalRecordView, SaveClinicalRecordRequest } from '@coracure/api';
import { ApiError, PlatformCode } from '@coracure/api/errors';

import { getState } from '../state/store';
import { hydrateClinicalRecord } from '../state/actions';
import { emptyRecord, type ConsultationRecord, type Medicine } from './clinical';
import { seedResource, useResource } from './useResource';

/**
 * The write-up against the real clinical record (API_CONTRACT §7.6).
 *
 * Every function here takes `appointmentId` — which IS the real consultation
 * id (`Appointment.id`); `Appointment.consultationId` is the human reference
 * code and must never reach a URL.
 *
 * *** EVERY SAVE SENDS THE WHOLE RECORD. *** The backend's PUT is a full
 * replace, so the request is always built from the complete local record —
 * saving from the prescription screen still carries the notes, and the notes
 * screen still carries the medicines.
 *
 * *** ONE LOCK, AT THE END. *** The backend has a single `finalisedAt` for the
 * whole record. The local notes → prescription → summary checkpoints are UI
 * milestones; only submitting the case summary calls `finalise`. Finalising
 * from the prescription screen would lock the record before a summary exists,
 * and the summary submit would then be refused with `RECORD_FINALISED`.
 *
 * Shapes that do not line up, and what this does about each:
 *
 *  - `observations` has no backend field. It is folded into `clinicalHistory`
 *    under its own heading, so it reaches the record; on reload it comes back
 *    as part of the history (ponytail: one-way fold — add an `observations`
 *    column to split it back out).
 *  - `advice` and `donts` are bullet lists here; the backend has four flat
 *    strings. Advice rides in `adviceCovered`, don'ts in `adviceWarningSigns`,
 *    one item per line, and split back by line on reload. `adviceHomePractice`
 *    and `adviceNextFocus` have no screen yet and are not sent (ponytail: add
 *    two fields to the advice section to use them).
 *  - `allergies` has no backend field and stays local.
 *  - A local medicine id (`med_001`) is not a UUID and is refused by the DTO,
 *    so only an id that came from the server is sent back.
 */

export const KEYS = { record: (consultationId: string) => `doctor:clinical-record:${consultationId}` };

const OBSERVATIONS_HEADING = 'Observations:';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const lines = (items: string[]) =>
  items
    .map((x) => x.trim())
    .filter(Boolean)
    .join('\n');

const splitLines = (text: string | null) =>
  (text ?? '')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

const opt = (s: string) => {
  const t = s.trim();
  return t ? t : undefined;
};

const toMedicineInput = (m: Medicine): ClinicalMedicineInput => ({
  ...(UUID.test(m.id) ? { id: m.id } : {}),
  name: m.name.trim(),
  dose: m.dose.trim(),
  frequency: m.frequency.trim(),
  duration: m.duration.trim(),
  ...(opt(m.instruction) ? { instructions: opt(m.instruction) } : {}),
  ...(opt(m.generic) ? { genericName: opt(m.generic) } : {}),
  ...(opt(m.route) ? { route: opt(m.route) } : {}),
  ...(opt(m.quantity) ? { quantity: opt(m.quantity) } : {}),
});

/**
 * The full request, or null when the two fields the backend requires on EVERY
 * save — chief complaint and risk category — are not written yet.
 */
export const toSaveRequest = (r: ConsultationRecord, prescriber: boolean): SaveClinicalRecordRequest | null => {
  const chiefComplaint = r.notes.complaint.trim();
  if (!chiefComplaint || !r.risk.category) return null;

  const history = r.notes.history.trim();
  const observations = r.notes.observations.trim();
  const clinicalHistory = [history, observations ? `${OBSERVATIONS_HEADING}\n${observations}` : '']
    .filter(Boolean)
    .join('\n\n');

  return {
    chiefComplaint,
    riskCategory: r.risk.category,
    ...(clinicalHistory ? { clinicalHistory } : {}),
    // A non-prescriber's form has no diagnosis field; never send a stale one.
    ...(prescriber && opt(r.notes.diagnosis) ? { diagnosis: opt(r.notes.diagnosis) } : {}),
    // Sending medicines from a non-prescriber is a 403 even when empty-handed
    // ones are filtered out later, so the key is left off entirely.
    ...(prescriber ? { medicines: r.medicines.map(toMedicineInput) } : {}),
    ...(lines(r.advice) ? { adviceCovered: lines(r.advice) } : {}),
    ...(lines(r.donts) ? { adviceWarningSigns: lines(r.donts) } : {}),
    ...(opt(r.summary) ? { caseSummary: r.summary.trim() } : {}),
    recommendedContentIds: r.recommendations.ids.filter((id) => UUID.test(id)),
  };
};

/** The backend's record as the local record's fields. Local-only fields are left alone. */
export const fromView = (view: ClinicalRecordView): Partial<ConsultationRecord> => {
  // History may be empty, in which case the fold starts with the heading itself.
  const [history, observations] = (view.clinicalHistory ?? '').split(new RegExp(`(?:^|\\n\\n)${OBSERVATIONS_HEADING}\\n`));
  const finalised = !!view.finalisedAt;
  const medicines: Medicine[] = view.medicines.map((m) => ({
    id: m.id,
    name: m.name,
    generic: m.genericName ?? '',
    dose: m.dose,
    frequency: m.frequency,
    duration: m.duration,
    route: m.route ?? '',
    quantity: m.quantity ?? '',
    instruction: m.instructions ?? '',
  }));
  const advice = splitLines(view.advice.covered);
  const donts = splitLines(view.advice.warningSigns);
  return {
    notes: {
      complaint: view.chiefComplaint,
      history: history ?? '',
      observations: observations ?? '',
      diagnosis: view.diagnosis ?? '',
    },
    risk: { ...emptyRecord('').risk, category: view.riskCategory, referralAdvised: view.referralAdvised },
    medicines,
    advice,
    donts,
    summary: view.caseSummary ?? '',
    recommendations: { ids: view.recommendedContentIds, note: '' },
    // The backend has one lock; the three local checkpoints are derived from it.
    notesStatus: finalised || view.chiefComplaint ? 'saved' : 'empty',
    rxStatus: finalised ? 'finalised' : 'draft',
    summaryStatus: finalised ? 'submitted' : 'draft',
  };
};

/** What a save would carry — two snapshots differ only when the doctor edited the write-up. */
const content = (r: ConsultationRecord | undefined) =>
  r && JSON.stringify([r.notes, r.risk.category, r.medicines, r.advice, r.donts, r.summary, r.recommendations.ids]);

/**
 * Fetches the real record and lays it over the local one — ONCE per
 * consultation per session (`record.synced`), never again.
 *
 * Every write-up screen calls this, and the cached first GET would otherwise
 * be laid back over newer local edits on every re-open. After the first
 * hydrate or the first successful save the local record is the newer copy,
 * so it wins. An edit made while the GET was in flight wins too: the server
 * copy is dropped rather than overwrite what the doctor is typing.
 *
 * A demo fixture id is not a real consultation and is never fetched. A 404
 * (`RECORD_NOT_FOUND` — nothing saved yet) or a network failure leaves the
 * local record as it is.
 */
export const useClinicalRecordSync = (appointmentId: string) => {
  const resource = useResource(KEYS.record(appointmentId), () => doctorClinicalRecordApi.getClinicalRecord(appointmentId), {
    enabled: UUID.test(appointmentId),
  });
  const atMount = useRef(content(getState().records[appointmentId]));
  useEffect(() => {
    const local = getState().records[appointmentId];
    if (!resource.data || local?.synced) return;
    const editedMeanwhile = content(local) !== atMount.current;
    hydrateClinicalRecord(appointmentId, editedMeanwhile ? { synced: true } : { ...fromView(resource.data), synced: true });
  }, [resource.data, appointmentId]);
  return resource;
};

/** The server now holds this copy: cache its answer and never hydrate over the local record again. */
const keep = (appointmentId: string, view: ClinicalRecordView) => {
  seedResource(KEYS.record(appointmentId), view);
  hydrateClinicalRecord(appointmentId, { synced: true });
  return view;
};

/** Persists the whole local record. Throws a plain-language error when notes are not far enough along to save at all. */
export const saveWriteUp = async (appointmentId: string, prescriber: boolean): Promise<ClinicalRecordView> => {
  const record = getState().records[appointmentId] ?? emptyRecord(appointmentId);
  const body = toSaveRequest(record, prescriber);
  if (!body) {
    throw new ApiError({
      statusCode: 0,
      code: PlatformCode.VALIDATION_FAILED,
      message:
        'Write the chief complaint and choose a risk category in clinical notes first — the record cannot be saved without them.',
    });
  }
  return keep(appointmentId, await doctorClinicalRecordApi.saveClinicalRecord(appointmentId, body));
};

/** What finalising still needs, when the backend refused it for that reason. */
export const outstandingFrom = (e: unknown): ClinicalOutstanding[] | null => {
  if (!ApiError.is(e) || e.code !== 'RECORD_INCOMPLETE') return null;
  const details = e.details as { outstanding?: ClinicalOutstanding[] } | null;
  return details?.outstanding ?? [];
};

/** Saves, then locks the whole record. The only caller is the case summary submit. */
export const finaliseWriteUp = async (appointmentId: string, prescriber: boolean): Promise<ClinicalRecordView> => {
  await saveWriteUp(appointmentId, prescriber);
  return keep(appointmentId, await doctorClinicalRecordApi.finaliseClinicalRecord(appointmentId));
};
