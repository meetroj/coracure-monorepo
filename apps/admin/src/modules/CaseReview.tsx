import { useSearchParams } from 'react-router-dom';

import type { AdminLevel } from '../nav';
import { PageHeader, Tabs } from '../ui';
import { Clarification } from './Clarification';
import { AllocationDecisions } from './AllocationDecisions';

/**
 * Case clarification and allocation decisions, in one place: the two queues a
 * clinical lead works through together - who an expert case goes to, and who
 * every consultation was assigned to and why.
 */
const TABS = [
  { id: 'clarification', label: 'Clarification cases' },
  { id: 'allocation', label: 'Allocation decisions' },
] as const;

export function CaseReview({ level }: { level: AdminLevel }) {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'allocation' ? 'allocation' : 'clarification';
  return (
    <>
      <PageHeader
        title="Clarification & allocation"
        description="Assign experts to de-identified cases, and review who was assigned to each consultation and on what basis."
      />
      <Tabs tabs={TABS} active={tab} onChange={(id) => setParams(id === 'clarification' ? {} : { tab: id })} />
      {tab === 'clarification' ? <Clarification level={level} /> : <AllocationDecisions level={level} />}
    </>
  );
}
