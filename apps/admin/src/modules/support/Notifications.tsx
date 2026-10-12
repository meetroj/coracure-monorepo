import type { AdminLevel } from '../../nav';
import { NotificationTemplates } from '../content/NotificationTemplates';

/**
 * Notifications (requirements §85): the four channels and the eleven
 * notification types sit above the existing templates, manual send and history.
 *
 * *** A LAB REPORT OR PRESCRIPTION IS NEVER SENT THROUGH A NOTIFICATION. ***
 * "Lab report available" only tells the patient it is ready; the file stays in
 * the Patient App (§69).
 */
export function Notifications({ level }: { level: AdminLevel }) {
  return (
    <>
      <NotificationTemplates level={level} />
    </>
  );
}
