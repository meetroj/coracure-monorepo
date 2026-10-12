import { useState } from 'react';
import { Link } from 'react-router-dom';

import { LIVE } from '../../api/live';
import { useToast } from '../../lib/toast';
import { FOLLOW_UP_STATUSES, followUps, type FollowUp, type FollowUpStatus } from '../../mock/ops/care';
import type { AdminLevel } from '../../nav';
import { Button, DefinitionList, Modal, Notice, StatusBadge, type Column } from '../../ui';
import { fmtDateTime, words } from '../kit/format';
import { ListScreen, type ListTab } from '../kit/ListScreen';
import { useStore } from '../kit/store';
import { FollowUpsLive } from './FollowUpsLive';

/**
 * Follow-ups (requirements §28, §46, §49): the one place follow-up is managed.
 * A follow-up is its own consultation workflow, so the Case Record links here
 * instead of carrying a second plan of its own.
 */

const TABS: ListTab<FollowUp>[] = FOLLOW_UP_STATUSES.map((s) => ({ id: s, label: words(s), test: (f) => f.status === s }));

function FixtureFollowUps({ level: _level }: { level: AdminLevel }) {
  const toast = useToast();
  const rows = useStore(followUps);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = rows.find((f) => f.id === openId) ?? null;

  const move = (f: FollowUp, status: FollowUpStatus, message: string) => {
    followUps.patch(f.id, { status, updatedAt: new Date().toISOString() });
    toast.success(message);
  };

  const columns: Column<FollowUp>[] = [
    {
      key: 'plan',
      header: 'Follow-up',
      render: (f) => (
        <span className="cellStack">
          <strong>{f.planName}</strong>
          <small>{f.patientName}</small>
        </span>
      ),
    },
    { key: 'case', header: 'Case Record', render: (f) => <Link to={`/case-records/${f.caseId}`} onClick={(e) => e.stopPropagation()}>{f.caseId}</Link> },
    { key: 'pro', header: 'Consulting Professional', render: (f) => f.professional },
    { key: 'status', header: 'Follow-up status', render: (f) => <StatusBadge status={f.status} /> },
    { key: 'updated', header: 'Updated', render: (f) => fmtDateTime(f.updatedAt) },
  ];

  return (
    <>
      <ListScreen
        caption="Follow-ups"
        rows={rows}
        columns={columns}
        rowKey={(f) => f.id}
        tabs={TABS}
        onOpen={(f) => setOpenId(f.id)}
        search={(f) => `${f.planName} ${f.patientName} ${f.professional}`}
        searchPlaceholder="Plan, patient or professional"
        emptyIcon="pathway"
        empty={{ title: 'No follow-ups' }}
      />
      <Modal open={open !== null} onClose={() => setOpenId(null)} title={open?.planName ?? 'Follow-up'} width={600}>
        {open && (
          <div className="stack">
            <DefinitionList
              items={[
                { label: 'Patient', value: <Link to={`/patients/${open.patientId}`}>{open.patientName}</Link> },
                { label: 'Case Record', value: <Link to={`/case-records/${open.caseId}`}>{open.caseId}</Link> },
                { label: 'Consulting Professional', value: open.professional },
                { label: 'Follow-up status', value: <StatusBadge status={open.status} /> },
                { label: 'Patient response', value: open.patientResponse ?? 'Not received yet' },
                { label: 'Provider review', value: open.providerReview ?? 'Not reviewed yet' },
                { label: 'Follow-up recommendation', value: open.recommendation ?? 'None' },
              ]}
            />
            {open.status === 'provider_review_pending' && (
              <Notice tone="warning">The patient has responded. The provider reviews it, then marks it reviewed or recommends a follow-up consultation.</Notice>
            )}
            <div className="formActions">
              {open.status === 'provider_review_pending' && (
                <>
                  <Button variant="secondary" onClick={() => move(open, 'follow_up_consultation_recommended', 'Follow-up consultation recommended.')}>
                    Recommend follow-up consultation
                  </Button>
                  <Button variant="primary" onClick={() => move(open, 'reviewed', 'Marked as reviewed.')}>
                    Mark reviewed
                  </Button>
                </>
              )}
              {(open.status === 'reviewed' || open.status === 'follow_up_consultation_recommended') && (
                <Button variant="primary" onClick={() => move(open, 'completed', 'Follow-up completed.')}>
                  Mark completed
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/** Live against a configured backend, fixtures otherwise. */
export const FollowUps = LIVE ? FollowUpsLive : FixtureFollowUps;
