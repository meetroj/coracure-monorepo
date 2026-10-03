import * as db from './db';
import { extraConsultations } from './moreConsultations';

/**
 * Fixtures for the Case summaries screen.
 *
 * Summaries are written automatically after a consultation, so this is a
 * list of what the generator produced - not a backlog of missing write-ups.
 * Kept out of `db.ts` so the screen can change without touching the shared store.
 *
 * *** NO CLINICAL CONTENT IS HELD HERE. *** The patient is initials plus a
 * city only (the platform's de-identification rule), and `body` is present only
 * on the rows the mock marks `sharedWithAdmin`.
 */

export type CaseSummaryStatus = 'generated' | 'reviewed' | 'failed' | 'awaiting';

export type CaseSummaryRow = {
  id: string;
  consultationId: string;
  referenceCode: string;
  doctorId: string | null;
  doctorName: string | null;
  /** Initials and city only - never a name or anything clinical. */
  patientLabel: string;
  serviceName: string;
  consultationAt: string;
  /** Null while the summary has not been generated yet. */
  generatedAt: string | null;
  reviewedAt: string | null;
  status: CaseSummaryStatus;
  lines: number | null;
  words: number | null;
  /** True when the doctor edited the text after it was generated. */
  editedAfterGeneration: boolean;
  failureReason: string | null;
  sharedWithAdmin: boolean;
  /** Only ever set when `sharedWithAdmin` is true. */
  body: string | null;
};

const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

const PATIENTS = ['A.K. · Pune', 'R.S. · Chennai', 'M.D. · Mumbai', 'S.P. · Bengaluru', 'V.N. · Hyderabad', 'T.J. · Kochi'];
const SERVICES = ['Psychiatry', 'Psychology', 'Therapy', 'De-addiction'];
const STATUS_CYCLE: CaseSummaryStatus[] = [
  'generated', 'reviewed', 'generated', 'reviewed', 'failed', 'generated',
  'awaiting', 'reviewed', 'generated', 'failed',
];
const SHARED_BODY =
  'Session overview prepared for operational review.\nFollow-up scheduled per the care plan.\nNo escalation was raised during the session.';

const build = (): CaseSummaryRow[] => {
  const doctors = db.doctors.filter((d) => d.verificationStatus === 'verified');
  const rows: CaseSummaryRow[] = [];

  for (let i = 0; i < 36; i++) {
    // Every row points at a consultation the mock list can open, so
    // "Open consultation" always resolves; past the base fixtures it falls
    // through to the extra rows the Consultations list uses.
    const real = db.consultations[i] ?? extraConsultations[i - db.consultations.length];
    const doctor = real?.doctorId
      ? db.doctors.find((d) => d.id === real.doctorId)
      : doctors[i % doctors.length];
    const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
    const consultedHoursAgo = 3 + i * 13;
    const generatedAt = status === 'awaiting' ? null : hoursAgo(consultedHoursAgo - 1);
    const edited = status === 'reviewed' && i % 3 === 0;
    const shared = status !== 'failed' && status !== 'awaiting' && i % 4 === 0;
    const lines = generatedAt ? 8 + ((i * 5) % 22) : null;

    rows.push({
      id: `csum-${3001 + i}`,
      consultationId: real?.id ?? `cs-${2001 + i}`,
      referenceCode: real?.referenceCode ?? `CC-2026-0${2001 + i}`,
      doctorId: doctor?.id ?? null,
      doctorName: doctor?.fullName ?? null,
      patientLabel: PATIENTS[i % PATIENTS.length],
      serviceName: real?.serviceName ?? SERVICES[i % SERVICES.length],
      consultationAt: hoursAgo(consultedHoursAgo),
      generatedAt,
      reviewedAt: status === 'reviewed' ? hoursAgo(Math.max(consultedHoursAgo - 5, 1)) : null,
      status,
      lines,
      words: lines ? lines * 11 : null,
      editedAfterGeneration: edited,
      failureReason: status === 'failed' ? 'Transcript was too short to summarise.' : null,
      sharedWithAdmin: shared,
      body: shared ? SHARED_BODY : null,
    });
  }
  return rows;
};

export const caseSummaries: CaseSummaryRow[] = build();
