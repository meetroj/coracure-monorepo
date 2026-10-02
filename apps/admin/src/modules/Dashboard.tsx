import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { dashboardOverview, type Activity, type DashboardOverview } from '../api/dashboardOverview';
import { useResource } from '../lib/useResource';
import { canSee, SECTIONS, type AdminLevel } from '../nav';
import { Async, Button, Card, EmptyState, Icon, PageHeader, humanise, type IconName } from '../ui';

/**
 * The dashboard.
 *
 * *** EVERY CARD IS A LINK. *** A number that does not open the queue behind
 * it is decoration (§14). A card whose section the level cannot reach is not
 * rendered at all rather than navigating into a 403.
 *
 * Three bands, in the order an admin acts on them: what needs attention now,
 * how the platform is doing, and what has just happened.
 */

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const ago = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins || 1} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / (60 * 24))} d ago`;
};

type CardProps = {
  icon: IconName;
  label: string;
  value: string | number;
  sub?: string;
  to: string;
  /** Reads as a problem when set — a red icon, and the sub line is the call to action. */
  alarm?: boolean;
  /** Reads as fine — a green icon. */
  ok?: boolean;
};

function StatCard({ icon, label, value, sub, to, alarm, ok }: CardProps) {
  const navigate = useNavigate();
  const tone = alarm ? 'alarm' : ok ? 'ok' : 'neutral';
  return (
    <button type="button" className={`dcard dcard--${tone}`} onClick={() => navigate(to)}>
      <span className="dcard__top">
        <span className="dcard__icon" aria-hidden="true">
          <Icon name={icon} size={20} />
        </span>
        <span className="dcard__go" aria-hidden="true">
          <Icon name="arrowRight" size={16} />
        </span>
      </span>
      <span className="dcard__value">{value}</span>
      <span className="dcard__label">{label}</span>
      {sub && <span className="dcard__sub">{sub}</span>}
    </button>
  );
}

const STATUS_COLOUR: Record<string, string> = {
  completed: 'var(--c-surfie)',
  scheduled: '#4F8EF7',
  awaiting_doctor: '#4F8EF7',
  in_progress: '#7C5CE0',
  awaiting_documentation: '#E9A93B',
  pending_payment: '#E9A93B',
  cancelled: '#9AA5A1',
  expired: '#9AA5A1',
  no_show: '#E5484D',
};

function Last7Days({ data }: { data: DashboardOverview['consultations'] }) {
  const max = Math.max(1, ...data.last7Days.map((d) => d.count));
  const total = data.last7Days.reduce((s, d) => s + d.count, 0);
  const change = data.previous7Days === 0 ? null : Math.round(((total - data.previous7Days) / data.previous7Days) * 100);
  return (
    <Card title="Consultations, last 7 days">
      <div className="dchart__head">
        <strong className="dchart__total">{total}</strong>
        {change !== null && (
          <span className={`dchart__delta ${change >= 0 ? 'isUp' : 'isDown'}`}>
            {change >= 0 ? '+' : ''}
            {change}% vs the week before
          </span>
        )}
      </div>
      <div className="dchart" role="img" aria-label={`Consultations per day: ${data.last7Days.map((d) => `${d.label} ${d.count}`).join(', ')}`}>
        {data.last7Days.map((d, i) => (
          <div key={d.date} className="dchart__col">
            <span className="dchart__count">{d.count}</span>
            <span
              className={`dchart__bar ${i === 6 ? 'isToday' : ''}`.trim()}
              style={{ height: `${Math.max(6, (d.count / max) * 100)}%` }}
            />
            <span className="dchart__label">{i === 6 ? 'Today' : d.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ByStatus({ data }: { data: DashboardOverview['consultations'] }) {
  const total = data.byStatus.reduce((s, r) => s + r.count, 0) || 1;
  return (
    <Card title="Consultations by status">
      <div className="dsplit" role="img" aria-label="Share of consultations by status">
        {data.byStatus.map((r) => (
          <span
            key={r.status}
            className="dsplit__seg"
            style={{ width: `${(r.count / total) * 100}%`, background: STATUS_COLOUR[r.status] ?? '#9AA5A1' }}
            title={`${humanise(r.status)}: ${r.count}`}
          />
        ))}
      </div>
      <ul className="dlegend">
        {data.byStatus.map((r) => (
          <li key={r.status}>
            <span className="dlegend__dot" style={{ background: STATUS_COLOUR[r.status] ?? '#9AA5A1' }} />
            <span className="dlegend__name">{humanise(r.status)}</span>
            <strong>{r.count}</strong>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const ACTIVITY_ICON: Record<Activity['kind'], IconName> = {
  consultation: 'consultations',
  alert: 'alert',
  complaint: 'note',
  notification: 'bell',
};

function RecentActivity({ rows, reachable }: { rows: Activity[]; reachable: (to: string) => boolean }) {
  const navigate = useNavigate();
  const visible = rows.filter((r) => reachable(r.to));
  return (
    <Card title="Recent activity">
      {visible.length === 0 ? (
        <EmptyState icon="inbox" title="Nothing yet" description="Activity from consultations, alerts and complaints appears here." />
      ) : (
        <ul className="dfeed">
          {visible.map((r) => (
            <li key={r.id}>
              <button type="button" className="dfeed__row" onClick={() => navigate(r.to)}>
                <span className={`dfeed__icon dfeed__icon--${r.kind}`} aria-hidden="true">
                  <Icon name={ACTIVITY_ICON[r.kind]} size={16} />
                </span>
                <span className="dfeed__text">{r.text}</span>
                <span className="dfeed__time">{ago(r.at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function Dashboard({ level }: { level: AdminLevel }) {
  const navigate = useNavigate();
  const fetcher = useCallback(() => dashboardOverview.get(), []);
  const state = useResource<DashboardOverview>(fetcher, []);

  const reachable = (path: string) => {
    const section = SECTIONS.find((s) => s.path === path.split(/[/?]/).filter(Boolean)[0]);
    return section ? canSee(level, section) : true;
  };
  const when = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <PageHeader
        title={`${greeting()}`}
        description={`${when}. What needs you now, how the platform is doing, and what just happened.`}
        actions={
          <>
            {reachable('/providers') && (
              <Button variant="secondary" icon="plus" onClick={() => navigate('/providers/new')}>
                Add doctor
              </Button>
            )}
            {reachable('/notifications') && (
              <Button variant="primary" icon="send" onClick={() => navigate('/notifications?tab=send')}>
                Send notification
              </Button>
            )}
          </>
        }
      />

      <Async state={state} resource="the dashboard" skeletonRows={4}>
        {(d) => {
          const a = d.attention;
          const attention: (CardProps & { section: string })[] = [
            { section: 'safety-alerts', icon: 'alert', label: 'Red flags to acknowledge', value: a.redFlags, to: '/safety-alerts', alarm: a.redFlags > 0, ok: a.redFlags === 0, sub: a.redFlags ? 'Open now' : 'All clear' },
            { section: 'credentials', icon: 'credentials', label: 'Doctors awaiting document review', value: a.documentsAwaiting, to: '/credentials', alarm: a.documentsAwaiting > 0, ok: a.documentsAwaiting === 0, sub: a.documentsAwaiting ? 'Review documents' : 'Queue empty' },
            { section: 'case-summaries', icon: 'clipboard', label: 'Case summaries needing attention', value: a.summariesNeedingAttention, to: '/case-summaries?status=failed', alarm: a.summariesNeedingAttention > 0, ok: a.summariesNeedingAttention === 0, sub: a.summariesNeedingAttention ? 'Regenerate or review' : 'All generated' },
            { section: 'complaints', icon: 'note', label: 'Open complaints', value: a.openComplaints, to: '/complaints', alarm: a.openComplaints > 0, ok: a.openComplaints === 0, sub: a.openComplaints ? 'Respond' : 'None open' },
            { section: 'payments', icon: 'payments', label: 'Payouts waiting', value: inr(a.pendingPayoutsInr), to: '/payments', alarm: a.pendingPayoutCount > 0, ok: a.pendingPayoutCount === 0, sub: `${a.pendingPayoutCount} to process` },
          ];

          const overview: (CardProps & { section: string })[] = [
            { section: 'consultations', icon: 'consultations', label: 'Consultations today', value: d.consultations.today, to: '/consultations', sub: `${d.consultations.upcoming} upcoming · ${d.consultations.inProgress} in progress` },
            { section: 'providers', icon: 'providers', label: 'Verified doctors', value: d.doctors.verified, to: '/providers', sub: `${d.doctors.total} total · ${d.doctors.listed} listed` },
            { section: 'patients', icon: 'users', label: 'Patients', value: d.patients.total, to: '/patients', sub: `${d.patients.active} active · ${d.patients.joinedThisWeek} new this week` },
            { section: 'case-review', icon: 'check', label: 'Completed cases', value: d.consultations.completedAllTime.toLocaleString('en-IN'), to: '/case-review?tab=allocation', sub: 'All time' },
            { section: 'care-hub', icon: 'content', label: 'Care Hub published', value: d.careHub.published, to: '/care-hub', sub: `${d.careHub.inReview} in review · ${d.careHub.drafts} drafts` },
            { section: 'notifications', icon: 'bell', label: 'Notifications sent, 7 days', value: d.notifications.sentLast7Days, to: '/notifications?tab=history', sub: d.notifications.failedLast7Days ? `${d.notifications.failedLast7Days} with delivery problems` : 'All delivered' },
          ];

          const shownAttention = attention.filter((c) => reachable(c.section));
          const shownOverview = overview.filter((c) => reachable(c.section));
          const canSeeConsults = reachable('consultations');

          return (
            <>
              {shownAttention.length > 0 && (
                <section aria-labelledby="dash-attention">
                  <h2 id="dash-attention" className="dsection">Needs attention</h2>
                  <div className="dcards">
                    {shownAttention.map((c) => (
                      <StatCard key={c.label} {...c} />
                    ))}
                  </div>
                </section>
              )}

              {shownOverview.length > 0 && (
                <section aria-labelledby="dash-overview">
                  <h2 id="dash-overview" className="dsection">Platform overview</h2>
                  <div className="dcards">
                    {shownOverview.map((c) => (
                      <StatCard key={c.label} {...c} />
                    ))}
                  </div>
                </section>
              )}

              {canSeeConsults && (
                <div className="dpair">
                  <Last7Days data={d.consultations} />
                  <ByStatus data={d.consultations} />
                </div>
              )}

              <RecentActivity rows={d.activity} reachable={(to) => reachable(to)} />
            </>
          );
        }}
      </Async>
    </>
  );
}
