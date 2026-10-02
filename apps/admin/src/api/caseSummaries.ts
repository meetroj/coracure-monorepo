import { delay } from '../mock/db';
import { caseSummaries, type CaseSummaryRow } from '../mock/caseSummaries';
import { detailFor, type CaseSummaryDetail } from '../mock/caseSummaryDetail';

export type { CaseSummaryDetail } from '../mock/caseSummaryDetail';
export type { CaseSummaryRow, CaseSummaryStatus } from '../mock/caseSummaries';

/**
 * Case summaries — same shape as `api/admin.ts`: async, latency via `delay`,
 * and copies out so a screen can never mutate the store by accident.
 */
export const summaries = {
  list: (): Promise<CaseSummaryRow[]> => delay(caseSummaries.map((r) => ({ ...r }))),

  get: (id: string): Promise<{ row: CaseSummaryRow; detail: CaseSummaryDetail }> => {
    const row = caseSummaries.find((r) => r.id === id);
    const detail = detailFor(id);
    return row && detail ? delay({ row: { ...row }, detail }) : Promise.reject(new Error('Summary not found'));
  },

  /** Retries generation. The mock always succeeds and flips the row to Generated. */
  regenerate: (id: string): Promise<CaseSummaryRow> => {
    const row = caseSummaries.find((r) => r.id === id);
    if (!row) return Promise.reject(new Error('Summary not found'));
    row.status = 'generated';
    row.generatedAt = new Date().toISOString();
    row.failureReason = null;
    row.lines = 14;
    row.words = 154;
    return delay({ ...row });
  },
};
