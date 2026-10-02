import * as db from '../mock/db';
import { baseExtras, extraConsultations, type ListedConsultation } from '../mock/moreConsultations';
import { ownerOf } from '../mock/patients';

export type { ListedConsultation };

/**
 * The consultation list (§23) — UI-only, like the rest of `api/admin.ts`.
 *
 * Same async / `db.delay` / copy style. A wired-up version would be one
 * `request('/admin/consultations', { query })` call with these same arguments.
 */

export type ConsultationsQuery = {
  search?: string;
  status?: string;
  mode?: string;
  doctorId?: string;
  /** Inclusive local dates, `YYYY-MM-DD`. */
  from?: string;
  to?: string;
  /** Page size; the screen grows it for "Show more". */
  limit?: number;
};

export type ConsultationsPage = {
  items: ListedConsultation[];
  /** Rows matching the filters, before `limit`. */
  matched: number;
  /** Every consultation, ignoring filters. */
  total: number;
  doctors: { id: string; name: string }[];
};

const dayStart = (d: string) => new Date(`${d}T00:00:00`).getTime();
const dayEnd = (d: string) => new Date(`${d}T23:59:59.999`).getTime();

/** The list shows the patient's full name, the same one the case page opens. */
const withPatient = (c: ListedConsultation): ListedConsultation => ({
  ...c,
  patientId: ownerOf(c.id).id,
  patientName: ownerOf(c.id).fullName,
});

const all = (): ListedConsultation[] =>
  [
    ...db.consultations.map((c) => ({
      ...c,
      ...(baseExtras[c.id] ?? { patientName: '—', channel: 'video' as const, paymentStatus: 'paid' as const }),
    })),
    ...extraConsultations,
  ].map(withPatient);

export const consultationsList = {
  list: (q: ConsultationsQuery = {}) => {
    const rows = all();
    const needle = (q.search ?? '').trim().toLowerCase();
    const from = q.from ? dayStart(q.from) : null;
    const to = q.to ? dayEnd(q.to) : null;

    const matched = rows
      .filter((c) => {
        const at = c.startsAt ? new Date(c.startsAt).getTime() : 0;
        return (
          (!needle ||
            [c.referenceCode, c.patientName, c.doctorName].some((v) =>
              v?.toLowerCase().includes(needle),
            )) &&
          (!q.status || c.status === q.status) &&
          (!q.mode || c.mode === q.mode) &&
          (!q.doctorId || c.doctorId === q.doctorId) &&
          (from === null || at >= from) &&
          (to === null || at <= to)
        );
      })
      // Newest first.
      .sort((a, b) => (b.startsAt ?? '').localeCompare(a.startsAt ?? ''));

    const page: ConsultationsPage = {
      items: matched.slice(0, q.limit ?? matched.length).map((c) => ({ ...c })),
      matched: matched.length,
      total: rows.length,
      doctors: db.doctors.map((d) => ({ id: d.id, name: d.fullName })),
    };
    return db.delay(page);
  },
};
