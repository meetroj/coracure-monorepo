import * as db from '../mock/db';
import { baseExtras, extraConsultations, type ListedConsultation } from '../mock/moreConsultations';
import { ownerOf } from '../mock/patients';
import { appointmentStatus } from '../mock/ops/appointment';
import { request } from './http';
import { LIVE } from './live';
import { fromLiveRow, liveQuery, type LivePage } from './liveAppointments';

export type { ListedConsultation };

/**
 * The consultation list (§23) - UI-only, like the rest of `api/admin.ts`.
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

export const allListed = (): ListedConsultation[] =>
  [
    ...db.consultations.map((c) => ({
      ...c,
      ...(baseExtras[c.id] ?? { patientName: '-', channel: 'video' as const, paymentStatus: 'paid' as const }),
    })),
    ...extraConsultations,
  ].map(withPatient);

/**
 * The live list: the page itself, the unfiltered count (only when something is
 * filtered, so "N in total" is the real number and not a copy of the match count),
 * and the providers for the filter dropdown. A failed provider lookup empties the
 * dropdown; it never fails the list.
 */
async function liveList(q: ConsultationsQuery): Promise<ConsultationsPage> {
  const filtered = Boolean(q.search || q.status || q.mode || q.doctorId || q.from || q.to);
  const [page, everything, providers] = await Promise.all([
    request<LivePage>('/admin/consultations', { query: liveQuery(q) }),
    filtered
      ? request<LivePage>('/admin/consultations', { query: { limit: 1 } })
      : Promise.resolve<LivePage | null>(null),
    request<{ items: { id: string; fullName: string }[] }>('/admin/doctors', { query: { limit: 100 } }).catch(
      () => ({ items: [] as { id: string; fullName: string }[] }),
    ),
  ]);
  return {
    items: page.items.map(fromLiveRow),
    matched: page.total,
    total: everything ? everything.total : page.total,
    doctors: providers.items.map((d) => ({ id: d.id, name: d.fullName })),
  };
}

export const consultationsList = {
  list: (q: ConsultationsQuery = {}): Promise<ConsultationsPage> => {
    if (LIVE) return liveList(q);
    return mockList(q);
  },
};

const mockList = (q: ConsultationsQuery = {}) => {
    const rows = allListed();
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
          (!q.status || appointmentStatus(c.status, c.id) === q.status) &&
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
};
