import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import type { Everything } from '../../api/liveList';
import { FOLLOWUP_STATES, followups, type FollowupDetail, type FollowupRow } from '../../api/liveCare';
import { useResource } from '../../lib/useResource';
import type { AdminLevel } from '../../nav';
import { Async, DefinitionList, Modal, Notice, StatusBadge, type Column } from '../../ui';
import { fmtDate, fmtDateTime, words } from '../kit/format';
import { ListScreen, type ListTab } from '../kit/ListScreen';
import { Truncated } from '../kit/Truncated';

/**
 * Follow-ups against the backend (requirements section 28, 46, 49).
 *
 * *** READ-ONLY, BECAUSE THE BACKEND IS. *** The treating provider reviews each
 * check-in and recommends a consultation; an admin sees whose turn it is, the
 * check-ins day by day and the alerts they raised. The status tabs are the
 * backend's `followupState`: whose turn it is.
 */

const TABS: ListTab<FollowupRow>[] = FOLLOWUP_STATES.map((s) => ({ id: s, label: words(s), test: (f) => f.state === s }));

const CHECKIN_TONE = { green: 'positive', amber: 'warning', red: 'danger' } as const;

export function FollowUpsLive({ level: _level }: { level: AdminLevel }) {
  const fetcher = useCallback(() => followups.list(), []);
  const state = useResource<Everything<FollowupRow>>(fetcher, []);
  const [openId, setOpenId] = useState<string | null>(null);

  const columns: Column<FollowupRow>[] = [
    {
      key: 'plan',
      header: 'Follow-up',
      render: (f) => (
        <span className="cellStack">
          <strong>{f.pathwayName}</strong>
          <small>{f.patientName}</small>
        </span>
      ),
    },
    {
      key: 'consultation',
      header: 'Consultation',
      render: (f) => (
        <Link to={`/appointments/${f.id}`} onClick={(e) => e.stopPropagation()}>
          {f.referenceCode}
        </Link>
      ),
    },
    { key: 'pro', header: 'Consulting professional', render: (f) => f.providerName },
    { key: 'status', header: 'Follow-up status', render: (f) => <StatusBadge status={f.state} label={words(f.state)} /> },
    {
      key: 'checkin',
      header: 'Latest check-in',
      render: (f) =>
        f.latestCheckin ? (
          <span className="cellStack">
            <StatusBadge status={f.latestCheckin.status} tone={CHECKIN_TONE[f.latestCheckin.status]} />
            <small>{fmtDate(f.latestCheckin.date)}</small>
          </span>
        ) : (
          <span className="muted">None yet</span>
        ),
    },
    {
      key: 'alerts',
      header: 'Open alerts',
      align: 'end',
      render: (f) => (f.openAlerts > 0 ? <StatusBadge status="open" label={String(f.openAlerts)} /> : <span className="muted">0</span>),
    },
  ];

  return (
    <>
      <Async state={state} resource="follow-ups" skeletonRows={6}>
        {({ items, total }) => (
          <ListScreen
            caption="Follow-ups"
            leading={<Truncated shown={items.length} total={total} />}
            rows={items}
            columns={columns}
            rowKey={(f) => f.id}
            tabs={TABS}
            onOpen={(f) => setOpenId(f.id)}
            search={(f) => `${f.pathwayName} ${f.patientName} ${f.providerName} ${f.referenceCode}`}
            searchPlaceholder="Plan, patient, professional or reference"
            emptyIcon="pathway"
            empty={{ title: 'No follow-ups' }}
          />
        )}
      </Async>
      <FollowupModal id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

function FollowupModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const fetcher = useCallback(() => followups.get(id ?? ''), [id]);
  const state = useResource<FollowupDetail>(fetcher, [id], id !== null);

  return (
    <Modal open={id !== null} onClose={onClose} title={state.data?.pathwayName ?? 'Follow-up'} width={680}>
      <Async state={state} resource="this follow-up" skeletonRows={4}>
        {(f) => (
          <div className="stack">
            <DefinitionList
              items={[
                { label: 'Patient', value: <Link to={`/patients/${f.patientId}`}>{f.patientName}</Link> },
                { label: 'Consultation', value: <Link to={`/appointments/${f.id}`}>{f.referenceCode}</Link> },
                { label: 'Consulting professional', value: f.providerName },
                { label: 'Follow-up status', value: <StatusBadge status={f.state} label={words(f.state)} /> },
                { label: 'Window', value: f.startsOn ? `${fmtDate(f.startsOn)} to ${fmtDate(f.endsOn)}` : null },
                { label: 'Today', value: f.todayIsDay != null && f.durationDays ? `Day ${f.todayIsDay} of ${f.durationDays}` : null },
              ]}
            />
            {f.state === 'provider_review_pending' && (
              <Notice tone="warning">
                The patient has responded. The treating provider reviews it, then marks it reviewed or recommends a
                follow-up consultation.
              </Notice>
            )}

            <h3 className="subhead">Check-ins</h3>
            {f.checkins.length === 0 ? (
              <p className="muted">No check-ins yet.</p>
            ) : (
              <ul className="thread">
                {f.checkins.map((c) => (
                  <li key={c.id}>
                    <StatusBadge status={c.status} tone={CHECKIN_TONE[c.status]} /> <strong>{fmtDate(c.date)}</strong>{' '}
                    <small>submitted {fmtDateTime(c.submittedAt)}</small>
                    <br />
                    {c.reviewed
                      ? `Reviewed${c.reviewedBy ? ` by ${c.reviewedBy.fullName}` : ''}${c.consultationRecommended ? ' - consultation recommended' : ''}${c.reviewNote ? `: ${c.reviewNote}` : ''}`
                      : 'Not reviewed yet'}
                  </li>
                ))}
              </ul>
            )}

            {f.alerts.length > 0 && (
              <>
                <h3 className="subhead">Alerts</h3>
                <ul className="thread">
                  {f.alerts.map((a) => (
                    <li key={a.id}>
                      <StatusBadge status={a.alertType} /> <StatusBadge status={a.state} />
                      <br />
                      {a.reason ?? 'No reason recorded'}
                      {a.closingNote ? ` - ${a.closingNote}` : ''}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Async>
    </Modal>
  );
}
