import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { dashboardOverview, type Activity, type DashboardOverview } from '../api/dashboardOverview';
import { useResource } from '../lib/useResource';
import { doctors } from '../mock/db';
import { labOrders } from '../mock/ops/lab';
import { clarifications, followUps } from '../mock/ops/care';
import { allListed } from '../api/consultationsList';
import { appointmentStatus } from '../mock/ops/appointment';
import { patientPayments, payouts, refunds } from '../mock/ops/money';
import { tickets } from '../mock/ops/support';
import { patientRecords } from '../mock/patients';
import { canSee, LAB_SERVICES_ENABLED, SECTIONS, type AdminLevel } from '../nav';
import {
  Async,
  Button,
  Card,
  CardSkeleton,
  ChartSkeleton,
  EmptyState,
  Icon,
  ListSkeleton,
  MetricGridSkeleton,
  Notice,
  PageHeader,
  SkeletonBlock,
  SkeletonText,
  humanise,
  type IconName,
} from '../ui';
import { request } from '../api/http';
import { LIVE } from '../api/live';
import { bandsFromSummary, trendFromSummary, videoHealth, type LiveExtras, type LiveSummary } from '../api/liveDashboard';
import { inr } from './kit/format';
import { StatCard, type StatProps } from './kit/Stat';
import { useStore } from './kit/store';
import { accountOf } from './providers/provider';

/**
 * The dashboard (requirements §3).
 *
 * *** EVERY CARD IS A LINK. *** A number that does not open the queue behind it
 * is decoration. A card whose section the level cannot reach is not rendered at
 * all rather than navigating into a 403.
 *
 * Six bands in the spec's order: Healthcare Providers, Patients, Consultations,
 * Lab Services, Finances, Support - then the week's trend and recent activity.
 */

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const ago = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins || 1} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / (60 * 24))} d ago`;
};

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

function Last7Days({ data }: { data: Pick<DashboardOverview['consultations'], 'last7Days' | 'previous7Days'> }) {
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

function ByStatus({ data }: { data: Pick<DashboardOverview['consultations'], 'byStatus'> }) {
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

/**
 * The week's two panels as they will stand: the total over seven day bars, and
 * the status split over its legend. Neutral - no counts, no trend, no colours.
 */
function TrendSkeleton() {
  return (
    <div className="dpair">
      <CardSkeleton title="Consultations, last 7 days">
        <SkeletonBlock w={72} h={32} style={{ marginBottom: 'var(--space-md)' }} />
        <ChartSkeleton kind="bars" height={180} />
      </CardSkeleton>
      <CardSkeleton title="Consultations by status">
        <SkeletonBlock w="100%" h={14} r={999} />
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <SkeletonText lines={5} lineHeight={14} last="48%" />
        </div>
      </CardSkeleton>
    </div>
  );
}

const ActivitySkeleton = () => (
  <CardSkeleton title="Recent activity">
    <ListSkeleton rows={5} trailing={false} />
  </CardSkeleton>
);

/**
 * What the live bands hold, by the section each card belongs to, so the skeleton
 * reserves exactly the cards this level will see (the same filter the real
 * bands apply).
 */
const BAND_SHAPE: { id: string; title: string; sections: string[] }[] = [
  { id: 'providers', title: 'Healthcare Providers', sections: ['providers', 'providers', 'verification', 'verification', 'providers', 'providers'] },
  { id: 'patients', title: 'Patients', sections: ['patients', 'patients', 'patients'] },
  {
    id: 'consultations',
    title: 'Consultations',
    sections: ['appointments', 'appointments', 'appointments', 'appointments', 'appointments', 'clarifications', 'follow-ups'],
  },
  { id: 'finances', title: 'Finances', sections: ['patient-payments', 'provider-payouts', 'refunds', 'analytics-financial'] },
  { id: 'support', title: 'Support', sections: ['support-tickets', 'support-tickets', 'support-tickets', 'support-tickets', 'safety-alerts'] },
];

type Card_ = StatProps & { section: string };
type Band = { id: string; title: string; cards: Card_[] };

/** The sections that read the live fixture stores re-render when those change. */
function useBands(): Band[] {
  const orders = useStore(labOrders);
  const threads = useStore(clarifications);
  const plans = useStore(followUps);
  const pays = useStore(patientPayments);
  const pos = useStore(payouts);
  const refs = useStore(refunds);
  const tix = useStore(tickets);

  const n = <T,>(rows: readonly T[], fn: (r: T) => boolean) => rows.filter(fn).length;

  const providers = doctors;
  const people = patientRecords();
  const appts = allListed().map((c) => ({ at: c.startsAt, status: appointmentStatus(c.status, c.id) }));
  const today = new Date().toDateString();
  const pendingPay = pos.filter((p) => p.status !== 'paid');
  const paid = pays.filter((p) => p.status === 'paid');

  return [
    {
      id: 'providers',
      title: 'Healthcare Providers',
      cards: [
        { section: 'providers', icon: 'providers', label: 'Total providers', value: providers.length, to: '/providers' },
        { section: 'providers', icon: 'check', label: 'Active providers', value: n(providers, (d) => accountOf(d) === 'active'), to: '/providers?account=active', ok: true },
        { section: 'verification', icon: 'credentials', label: 'Pending verification', value: n(providers, (d) => d.verificationStatus === 'pending' || d.verificationStatus === 'under_review'), to: '/verification?status=pending', alarm: n(providers, (d) => d.verificationStatus === 'pending') > 0 },
        { section: 'verification', icon: 'edit', label: 'Changes required', value: n(providers, (d) => d.verificationStatus === 'changes_required'), to: '/verification?status=changes_required' },
        { section: 'providers', icon: 'clock', label: 'Inactive providers', value: n(providers, (d) => accountOf(d) === 'inactive'), to: '/providers?account=inactive' },
        { section: 'providers', icon: 'alert', label: 'Suspended providers', value: n(providers, (d) => accountOf(d) === 'suspended'), to: '/providers?account=suspended' },
      ],
    },
    {
      id: 'patients',
      title: 'Patients',
      cards: [
        { section: 'patients', icon: 'users', label: 'Total registered patients', value: people.length, to: '/patients' },
        { section: 'patients', icon: 'plus', label: 'New registrations', value: n(people, (p) => Date.now() - new Date(p.joinedAt).getTime() < 30 * 86_400_000), sub: 'Last 30 days', to: '/patients' },
        { section: 'patients', icon: 'refresh', label: 'Returning patients', value: n(people, (p) => p.consultationCount > 1), to: '/patients' },
      ],
    },
    {
      id: 'consultations',
      title: 'Consultations',
      cards: [
        { section: 'appointments', icon: 'inbox', label: 'Appointment requests', value: n(appts, (a) => a.status === 'requested'), to: '/appointments?status=requested' },
        { section: 'appointments', icon: 'calendar', label: 'Appointments today', value: n(appts, (a) => a.at != null && new Date(a.at).toDateString() === today), to: '/appointments' },
        { section: 'appointments', icon: 'clock', label: 'Upcoming appointments', value: n(appts, (a) => ['accepted', 'upcoming', 'allocated', 'rescheduled'].includes(a.status)), to: '/appointments?status=upcoming' },
        { section: 'appointments', icon: 'check', label: 'Completed consultations', value: n(appts, (a) => a.status === 'completed'), to: '/appointments?status=completed', ok: true },
        { section: 'appointments', icon: 'close', label: 'Cancelled consultations', value: n(appts, (a) => a.status === 'cancelled'), to: '/appointments?status=cancelled' },
        { section: 'clarifications', icon: 'clarify', label: 'Pending clarifications', value: n(threads, (c) => c.status === 'new' || c.status === 'awaiting_response'), to: '/clarifications', alarm: n(threads, (c) => c.status === 'new') > 0 },
        { section: 'follow-ups', icon: 'pathway', label: 'Pending follow-ups', value: n(plans, (f) => f.status === 'patient_response_pending' || f.status === 'provider_review_pending'), to: '/follow-ups' },
      ],
    },
    {
      id: 'lab',
      title: 'Lab Services',
      cards: [
        { section: 'lab-orders', icon: 'lab', label: 'New lab orders', value: n(orders, (o) => Date.now() - new Date(o.orderedAt).getTime() < 86_400_000), sub: 'Last 24 hours', to: '/lab-orders' },
        { section: 'lab-orders', icon: 'alert', label: 'Lab allocation pending', value: n(orders, (o) => o.status === 'lab_allocation_pending'), to: '/lab-orders?status=lab_allocation_pending', alarm: n(orders, (o) => o.status === 'lab_allocation_pending') > 0 },
        { section: 'lab-orders', icon: 'calendar', label: 'Collection scheduled', value: n(orders, (o) => o.collection === 'collection_scheduled'), to: '/lab-orders?collection=collection_scheduled' },
        { section: 'lab-orders', icon: 'refresh', label: 'Sample processing', value: n(orders, (o) => o.status === 'sample_processing'), to: '/lab-orders?status=sample_processing' },
        { section: 'lab-reports', icon: 'note', label: 'Reports ready', value: n(orders, (o) => o.reportStatus === 'report_ready'), to: '/lab-reports?status=report_ready' },
        { section: 'lab-orders', icon: 'check', label: 'Completed orders', value: n(orders, (o) => o.status === 'completed'), to: '/lab-orders?status=completed', ok: true },
        { section: 'lab-orders', icon: 'close', label: 'Cancelled / refunded orders', value: n(orders, (o) => ['cancellation_requested', 'refund_initiated', 'refunded'].includes(o.status)), to: '/lab-orders?status=refund_initiated' },
      ],
    },
    {
      id: 'finances',
      title: 'Finances',
      cards: [
        { section: 'patient-payments', icon: 'payments', label: 'Patient payments', value: inr(paid.reduce((s, p) => s + p.amountInr, 0)), sub: `${paid.length} paid`, to: '/patient-payments' },
        { section: 'provider-payouts', icon: 'clock', label: 'Provider payouts pending', value: inr(pendingPay.reduce((s, p) => s + p.netInr, 0)), sub: `${pendingPay.length} to settle`, to: '/provider-payouts?status=pending', alarm: pendingPay.length > 0 },
        { section: 'refunds', icon: 'refresh', label: 'Refunds pending', value: n(refs, (r) => r.status === 'requested' || r.status === 'initiated'), to: '/refunds?status=requested' },
        { section: 'analytics-financial', icon: 'chart', label: 'Revenue summary', value: inr(pos.reduce((s, p) => s + p.commissionInr, 0)), sub: 'Platform commission', to: '/analytics-financial' },
      ],
    },
    {
      id: 'support',
      title: 'Support',
      cards: [
        { section: 'support-tickets', icon: 'inbox', label: 'New support tickets', value: n(tix, (t) => t.status === 'new'), to: '/support-tickets?status=new', alarm: n(tix, (t) => t.status === 'new') > 0 },
        { section: 'support-tickets', icon: 'note', label: 'Open tickets', value: n(tix, (t) => t.status === 'open'), to: '/support-tickets?status=open' },
        { section: 'support-tickets', icon: 'refresh', label: 'In-progress tickets', value: n(tix, (t) => t.status === 'in_progress'), to: '/support-tickets?status=in_progress' },
        { section: 'support-tickets', icon: 'check', label: 'Resolved tickets', value: n(tix, (t) => t.status === 'resolved'), to: '/support-tickets?status=resolved', ok: true },
      ],
    },
  ];
}

function FixtureDashboard({ level }: { level: AdminLevel }) {
  const navigate = useNavigate();
  const fetcher = useCallback(() => dashboardOverview.get(), []);
  const state = useResource<DashboardOverview>(fetcher, []);
  const bands = useBands();

  const reachable = (path: string) => {
    const section = SECTIONS.find((s) => s.path === path.split(/[/?]/).filter(Boolean)[0]);
    return section ? canSee(level, section) : true;
  };
  const when = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <PageHeader
        title={`${greeting()}`}
        description={`${when}. Providers, patients, consultations, lab, finances and support at a glance.`}
        actions={
          <>
            {reachable('/providers') && (
              <Button variant="secondary" icon="plus" onClick={() => navigate('/providers/new')}>
                Add provider
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

      {bands.filter((b) => LAB_SERVICES_ENABLED || b.id !== 'lab').map((band) => {
        const shown = band.cards.filter((c) => reachable(c.section));
        if (shown.length === 0) return null;
        return (
          <section key={band.id} aria-labelledby={`dash-${band.id}`}>
            <h2 id={`dash-${band.id}`} className="dsection">
              {band.title}
            </h2>
            <div className="dcards">
              {shown.map((c) => (
                <StatCard key={c.label} {...c} />
              ))}
            </div>
          </section>
        );
      })}

      {reachable('appointments') && (
        <Async state={state} resource="the dashboard" skeleton={<TrendSkeleton />}>
          {(d) => (
            <div className="dpair">
              <Last7Days data={d.consultations} />
              <ByStatus data={d.consultations} />
            </div>
          )}
        </Async>
      )}

      <Async state={state} resource="recent activity" skeleton={<ActivitySkeleton />}>
        {(d) => <RecentActivity rows={d.activity} reachable={(to) => reachable(to)} />}
      </Async>
    </>
  );
}

/**
 * The dashboard against the real backend: one summary read, plus the two figures
 * the summary does not carry (clarifications waiting, follow-ups waiting).
 *
 * The figures that could not be read are left out rather than shown as zero.
 * Recent activity is not drawn live: the summary has no feed, and an invented one
 * would be worse than none.
 */
function LiveDashboard({ level }: { level: AdminLevel }) {
  const navigate = useNavigate();
  const fetcher = useCallback(async () => {
    const [summary, quality, patientTurn, providerTurn] = await Promise.all([
      request<LiveSummary>('/admin/dashboard/summary'),
      request<{ clarifications?: { awaitingAssignment?: number } }>('/admin/governance/dashboard').catch(() => null),
      request<{ total: number }>('/admin/followups', { query: { state: 'patient_response_pending', limit: 1 } }).catch(() => null),
      request<{ total: number }>('/admin/followups', { query: { state: 'provider_review_pending', limit: 1 } }).catch(() => null),
    ]);
    const extras: LiveExtras = {
      clarificationsAwaiting: quality?.clarifications?.awaitingAssignment ?? null,
      followupsPending: patientTurn && providerTurn ? patientTurn.total + providerTurn.total : null,
    };
    return { summary, extras };
  }, []);
  const state = useResource(fetcher, []);

  const reachable = (path: string) => {
    const section = SECTIONS.find((s) => s.path === path.split(/[/?]/).filter(Boolean)[0]);
    return section ? canSee(level, section) : true;
  };
  const when = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <PageHeader
        title={`${greeting()}`}
        description={`${when}. Providers, patients, consultations, finances and support at a glance.`}
        actions={
          <>
            {reachable('/providers') && (
              <Button variant="secondary" icon="plus" onClick={() => navigate('/providers/new')}>
                Add provider
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

      <Async
        state={state}
        resource="the dashboard"
        skeleton={
          <>
            {BAND_SHAPE.map((band) => {
              const cards = band.sections.filter((s) => reachable(s)).length;
              if (cards === 0) return null;
              return (
                <section key={band.id}>
                  <h2 className="dsection">{band.title}</h2>
                  <MetricGridSkeleton count={cards} />
                </section>
              );
            })}
            {reachable('appointments') && <TrendSkeleton />}
          </>
        }
      >
        {({ summary, extras }) => {
          const bands = bandsFromSummary(summary, extras);
          const trend = trendFromSummary(summary);
          const video = videoHealth(summary.video);
          return (
            <>
              {video && <Notice tone={video.stale ? 'warning' : 'info'}>{video.text}</Notice>}

              {bands.map((band) => {
                const shown = band.cards.filter((c) => reachable(c.section));
                if (shown.length === 0) return null;
                return (
                  <section key={band.id} aria-labelledby={`dash-${band.id}`}>
                    <h2 id={`dash-${band.id}`} className="dsection">
                      {band.title}
                    </h2>
                    <div className="dcards">
                      {shown.map((c) => (
                        <StatCard key={c.label} {...c} />
                      ))}
                    </div>
                  </section>
                );
              })}

              {bands.length === 0 && (
                <EmptyState
                  icon="lock"
                  title="Nothing on the dashboard for your role"
                  description="The dashboard sections are limited by admin level. A super admin can change your level."
                />
              )}

              {trend && (
                <div className="dpair">
                  <Last7Days data={trend} />
                  <ByStatus data={trend} />
                </div>
              )}
            </>
          );
        }}
      </Async>
    </>
  );
}

/** Live against a configured backend, fixtures otherwise. Chosen once, at load. */
export const Dashboard = LIVE ? LiveDashboard : FixtureDashboard;
