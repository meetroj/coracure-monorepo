import { request } from './http';
import type { ClarificationCase, Expert } from './types';

/**
 * Case clarification against the backend (`/admin/clarification-cases`).
 *
 * Source of truth: `AdminCaseRow`, `EligibleExpert`, `AssignExpertDto`,
 * `panel-status.ts`. An admin sees the case and who holds it, never the
 * conversation: only the author and the assigned expert can read that, so the
 * panel has a case list and an assignment, and no thread.
 */

export const PANEL_STATUSES = ['new', 'awaiting', 'responded', 'closed'] as const;
export type PanelStatus = (typeof PANEL_STATUSES)[number];

type LiveCase = {
  id: string;
  title: string;
  topic: string | null;
  specificDoubt: string;
  urgency: string;
  status: string;
  panelStatus: PanelStatus;
  expertDoctorId: string | null;
  postedAt: string | null;
  assignedAt: string | null;
  closedAt: string | null;
  messagesTotal: number;
  createdAt: string;
};

type LiveExpert = { id: string; fullName: string; specialtyId: string | null; openCases: number };

export const expertFrom = (e: LiveExpert): Expert => ({
  doctorId: e.id,
  fullName: e.fullName,
  specialtyName: null,
  openCases: e.openCases,
});

export function caseFrom(c: LiveCase, expertNames: ReadonlyMap<string, string> = new Map()): ClarificationCase {
  return {
    id: c.id,
    title: c.title,
    // The case's own topic when it has one, else the title: there is no specialty on the row.
    specialtyName: c.topic ?? c.title,
    status: c.panelStatus,
    postedAt: c.postedAt ?? c.createdAt,
    assignedExpertId: c.expertDoctorId,
    assignedExpertName: c.expertDoctorId ? (expertNames.get(c.expertDoctorId) ?? null) : null,
    question: c.specificDoubt,
    urgency: c.urgency,
    messagesTotal: c.messagesTotal,
    closedAt: c.closedAt,
  };
}

const casePath = (id: string) => `/admin/clarification-cases/${encodeURIComponent(id)}`;

export const liveClarification = {
  experts: async () => (await request<LiveExpert[]>('/admin/clarification-cases/experts')).map(expertFrom),

  /** Every panel status, newest activity first within each; the backend lists one status per call. */
  list: async (): Promise<ClarificationCase[]> => {
    const [groups, experts] = await Promise.all([
      Promise.all(
        PANEL_STATUSES.map((panelStatus) =>
          request<LiveCase[]>('/admin/clarification-cases', { query: { panelStatus } }),
        ),
      ),
      request<LiveExpert[]>('/admin/clarification-cases/experts').catch(() => [] as LiveExpert[]),
    ]);
    const names = new Map(experts.map((e) => [e.id, e.fullName]));
    return groups.flat().map((c) => caseFrom(c, names));
  },

  assign: async (caseId: string, doctorId: string) =>
    caseFrom(await request<LiveCase>(`${casePath(caseId)}/assign`, { method: 'POST', body: { expertDoctorId: doctorId } })),

  close: async (caseId: string) => caseFrom(await request<LiveCase>(`${casePath(caseId)}/close`, { method: 'POST', body: {} })),
};
