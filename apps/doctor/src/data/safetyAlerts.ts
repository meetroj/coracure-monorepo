import { doctorConsultationsApi } from '@coracure/api';
import type { SafetyAlert } from '@coracure/api';

import { fmtAgo, fmtElapsed } from './calendar';
import { useResource } from './useResource';

/**
 * Follow-up check-in safety alerts (API_CONTRACT.md §7.7).
 *
 * The real alert carries a `reason` in the patient's own words and nothing
 * more structured — no per-question breakdown, no multi-day trend. Inventing
 * either would be guessing at a shape the backend does not expose.
 */

export const KEYS = { list: 'doctor:safetyAlerts' };

export const fetchSafetyAlerts = (): Promise<SafetyAlert[]> =>
  doctorConsultationsApi.listSafetyAlerts({ limit: 200 });

export const useSafetyAlerts = () => useResource(KEYS.list, fetchSafetyAlerts);

/**
 * One alert by id, whatever its state. The list is open alerts only, so a
 * closed one — opened from a notification, or just closed — is only here.
 */
export const useSafetyAlert = (alertId: string | undefined) =>
  useResource(`doctor:safetyAlert:${alertId}`, () => doctorConsultationsApi.getSafetyAlert(alertId as string), {
    enabled: !!alertId,
  });

export const acknowledgeAlert = (alertId: string): Promise<SafetyAlert> =>
  doctorConsultationsApi.acknowledgeSafetyAlert(alertId);

export const closeAlert = (alertId: string, closingNote: string): Promise<SafetyAlert> =>
  doctorConsultationsApi.closeSafetyAlert(alertId, closingNote);

export const ALERT_TYPE_LABEL: Record<SafetyAlert['alertType'], string> = {
  red_flag: 'Red Flag',
  amber: 'Amber Alert',
  medication_side_effect: 'Medication Side Effect',
  missed_checkin: 'Missed Check-in',
  followup_due: 'Follow-up Due',
};

export const ALERT_STATE_LABEL: Record<SafetyAlert['state'], string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  closed: 'Closed',
};

/** Red first, then amber/side-effect, then routine — severity drives order. */
const TYPE_RANK: Record<SafetyAlert['alertType'], number> = {
  red_flag: 0,
  amber: 1,
  medication_side_effect: 2,
  missed_checkin: 3,
  followup_due: 4,
};

export const sortedAlerts = (list: SafetyAlert[]) =>
  [...list].sort((a, b) => TYPE_RANK[a.alertType] - TYPE_RANK[b.alertType]);

const minutesAgo = (iso: string) => Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);

export const alertReceivedLabel = (a: SafetyAlert) => fmtAgo(minutesAgo(a.createdAt));
export const alertPendingFor = (a: SafetyAlert) => fmtElapsed(minutesAgo(a.createdAt));

export const NOTE_LIMIT = 2000;
