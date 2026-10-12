import { useState } from 'react';

import { patients, type PatientDetailRecord } from '../../api/patients';
import { useMutation } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { Button, ConfirmDialog, may } from '../../ui';

/**
 * Suspend and reinstate a patient (live only).
 *
 * Suspending blocks sign-in; it does not cancel anything already booked, and the
 * reason is written to the audit log and never shown to the patient. Operations
 * and care coordinators, the same pair the backend allows.
 */
export function PatientAccount({
  patient,
  level,
  onChanged,
}: {
  patient: PatientDetailRecord;
  level: AdminLevel;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [asking, setAsking] = useState(false);
  const suspend = useMutation(patients.suspend);
  const reinstate = useMutation(patients.reinstate);

  if (!may(level, ['operations', 'care_coordinator'])) return null;
  const suspended = patient.status === 'suspended';

  return (
    <>
      {suspended ? (
        <Button
          variant="secondary"
          loading={reinstate.busy}
          onClick={async () => {
            try {
              await reinstate.mutate(patient.id);
              toast.success(`${patient.fullName} can sign in again.`);
              onChanged();
            } catch (e) {
              toast.fromError(e);
            }
          }}
        >
          Reinstate
        </Button>
      ) : (
        <Button variant="danger" onClick={() => setAsking(true)}>
          Suspend
        </Button>
      )}

      <ConfirmDialog
        open={asking}
        busy={suspend.busy}
        onClose={() => setAsking(false)}
        title={`Suspend ${patient.fullName}?`}
        confirmLabel="Suspend patient"
        consequence={
          <>
            They are blocked from signing in. <strong>Anything already booked is not cancelled.</strong>{' '}
            The reason is kept in the audit log and is never shown to the patient.
          </>
        }
        reason={{ label: 'Reason', maxLength: 200 }}
        onConfirm={async (reason) => {
          try {
            await suspend.mutate(patient.id, reason);
            toast.success(`${patient.fullName} is suspended.`);
            setAsking(false);
            onChanged();
          } catch (e) {
            toast.fromError(e);
          }
        }}
      />
    </>
  );
}
