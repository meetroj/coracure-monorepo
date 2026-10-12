import type { AdminLevel } from '../../nav';
import { AllocationDecisions } from '../AllocationDecisions';
import { Consultations } from '../consultations/Consultations';
import { TabHub } from '../kit/TabHub';

/**
 * Appointments (requirements §33): the list, plus the allocation decisions
 * behind each assignment - the workflow strip says how a request becomes an
 * appointment, and Allocation decisions says who was picked and why.
 */
function List({ level }: { level: AdminLevel }) {
  return (
    <>
      <Consultations level={level} />
    </>
  );
}

export function Appointments({ level }: { level: AdminLevel }) {
  return (
    <TabHub
      title="Appointments"
      level={level}
      tabs={[
        { id: 'appointments', label: 'Appointments', Component: List, live: true },
        { id: 'allocation', label: 'Allocation decisions', Component: AllocationDecisions, levels: ['clinical_governance', 'operations'], live: true },
      ]}
    />
  );
}
