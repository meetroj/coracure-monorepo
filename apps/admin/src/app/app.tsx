import { useEffect, useState, type ComponentType } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';

import { getSession, hydrateSession, onSignedOut, type Session } from '../api/http';
import { LIVE } from '../api/live';
import { ToastProvider } from '../lib/toast';
import { SECTIONS, canSee, landingFor, type AdminLevel, type Section } from '../nav';
import { Button, EmptyState, PageHeader } from '../ui';
import { SectionPlaceholder } from './Section';
import { Shell } from './Shell';
import { SignIn } from './SignIn';

/* ----------------------------- module registry ---------------------------- */

import { Dashboard } from '../modules/Dashboard';
import { ProvidersList, providerList } from '../modules/providers/ProvidersList';
import { ProviderCreate } from '../modules/providers/ProviderCreate';
import { ProviderDetail } from '../modules/providers/ProviderDetail';
import { CredentialQueue } from '../modules/CredentialQueue';
import { Patients } from '../modules/patients/Patients';
import { PatientDetail } from '../modules/patients/PatientDetail';
import { SafetyAlerts } from '../modules/SafetyAlerts';
import { CaseSummaries } from '../modules/CaseSummaries';
import { CaseSummaryDetail } from '../modules/CaseSummaryDetail';
import { Availability } from '../modules/availability/Availability';
import { ConsultationDetail } from '../modules/consultations/ConsultationDetail';
import { ComplaintDetail } from '../modules/complaints/ComplaintDetail';
import { Notifications } from '../modules/support/Notifications';
import { Inbox } from '../modules/Inbox';
import { Appointments } from '../modules/care/Appointments';
import { CaseRecordDetail, CaseRecords } from '../modules/care/CaseRecords';
import { Clarifications } from '../modules/care/Clarifications';
import { FollowUps } from '../modules/care/FollowUps';
import { LabOrders } from '../modules/lab/LabOrders';
import { LabPartners } from '../modules/lab/LabPartners';
import { LabTests } from '../modules/lab/LabTests';
import { LabPackages } from '../modules/lab/LabPackages';
import { LabAllocation } from '../modules/lab/LabAllocation';
import { LabReports } from '../modules/lab/LabReports';
import { analyticsPage } from '../modules/analytics/Analytics';
import { PatientPayments, ProviderPayouts, Refunds } from '../modules/finance/Finance';
import { Feedback, SupportTickets } from '../modules/support/SupportTickets';
import { Users } from '../modules/admin/Users';
import { Roles } from '../modules/admin/Roles';
import { MasterData } from '../modules/admin/MasterData';
import { AdminSettings, AppSettings, WebsiteSettings } from '../modules/admin/SettingsHubs';
import { NotConnected } from '../modules/kit/NotConnected';
import { TabHub } from '../modules/kit/TabHub';
import { CaseSummariesLive } from '../modules/care/CaseRecordsLive';

/** Case Records, with the auto-generated case summaries as the second tab. */
const CaseRecordsHub = ({ level }: { level: AdminLevel }) => (
  <TabHub
    title="Case Records"
    level={level}
    tabs={[
      { id: 'records', label: 'Case records', Component: CaseRecords, live: true },
      { id: 'summaries', label: 'Case summaries', Component: LIVE ? CaseSummariesLive : CaseSummaries, live: true },
    ]}
  />
);

/**
 * Every section's screen, keyed by its `nav.ts` path.
 *
 * A path with no entry falls back to the worklist placeholder rather than a
 * blank route, so the registry can never produce a dead end (§19, §60).
 */
const SCREENS: Record<string, ComponentType<{ level: AdminLevel }>> = {
  dashboard: Dashboard,
  providers: ProvidersList,
  specialists: providerList('specialists'),
  'super-specialists': providerList('super'),
  paramedical: providerList('paramedical'),
  veterinary: providerList('veterinary'),
  verification: CredentialQueue,
  availability: Availability,
  patients: Patients,
  appointments: Appointments,
  'case-records': CaseRecordsHub,
  clarifications: Clarifications,
  'follow-ups': FollowUps,
  'safety-alerts': SafetyAlerts,
  'lab-orders': LabOrders,
  'lab-partners': LabPartners,
  'lab-tests': LabTests,
  'lab-packages': LabPackages,
  'lab-allocation': LabAllocation,
  'lab-reports': LabReports,
  analytics: analyticsPage('overview'),
  'analytics-consultations': analyticsPage('consultations'),
  'analytics-providers': analyticsPage('providers'),
  'analytics-patients': analyticsPage('patients'),
  'analytics-lab': analyticsPage('lab'),
  'analytics-financial': analyticsPage('financial'),
  'patient-payments': PatientPayments,
  'provider-payouts': ProviderPayouts,
  refunds: Refunds,
  'support-tickets': SupportTickets,
  feedback: Feedback,
  notifications: Notifications,
  users: Users,
  roles: Roles,
  'master-data': MasterData,
  'admin-settings': AdminSettings,
  'app-settings': AppSettings,
  'website-settings': WebsiteSettings,
};

/**
 * The sections (and detail routes) that read the real backend.
 *
 * In a live build anything NOT listed here renders "Not connected" instead of
 * its fixtures, so a screen added to `SCREENS` is dark in production until it
 * is wired and named here. Add it when the screen stops importing `mock/`.
 */
const LIVE_SECTIONS = new Set([
  'dashboard',
  'providers',
  'specialists',
  'super-specialists',
  'paramedical',
  'veterinary',
  'verification',
  'availability',
  'patients',
  'appointments',
  'users',
  'patient-payments',
  'provider-payouts',
  'refunds',
  'support-tickets',
  'feedback',
  'notifications',
  'clarifications',
  'follow-ups',
  'safety-alerts',
  'case-records',
  'roles',
  'master-data',
  'analytics',
  'analytics-consultations',
  'analytics-providers',
  'analytics-patients',
  'analytics-lab',
  'analytics-financial',
  'admin-settings',
  'app-settings',
  'website-settings',
]);

/** `<section>/<child path>` of the detail routes that are live. */
const LIVE_CHILDREN = new Set([
  'providers/new',
  'providers/:doctorId',
  'verification/:doctorId',
  'patients/:patientId',
  'appointments/:consultationId',
  'support-tickets/:complaintId',
  'case-records/:caseId',
]);

/**
 * Old paths that moved. A bookmark or a link in an audit note still lands in
 * the right place instead of on "page not found".
 */
const MOVED: Record<string, string> = {
  consultations: '/appointments',
  credentials: '/verification',
  complaints: '/support-tickets?tab=complaints',
  payments: '/provider-payouts',
  catalogue: '/master-data?view=catalogue',
  'care-hub': '/app-settings?tab=care-hub',
  pathways: '/app-settings?tab=pathways',
  settings: '/admin-settings',
  'pending-summaries': '/case-records?tab=summaries',
  'case-summaries': '/case-records?tab=summaries',
  'case-review': '/clarifications',
  clarification: '/clarifications',
  'allocation-decisions': '/appointments?tab=allocation',
  legal: '/website-settings?tab=legal',
  audit: '/admin-settings?tab=audit',
  'deletion-requests': '/admin-settings?tab=deletion-requests',
  retention: '/admin-settings?tab=retention',
  'admin-accounts': '/users',
};

/** Old detail paths (`/consultations/:id`) that map onto a new one. */
const MOVED_DETAIL: { from: string; to: (p: Record<string, string | undefined>) => string }[] = [
  { from: 'consultations/:id', to: (p) => `/appointments/${p.id}` },
  { from: 'credentials/:id', to: (p) => `/verification/${p.id}` },
  { from: 'complaints/:id', to: (p) => `/support-tickets/${p.id}` },
  { from: 'case-summaries/:id', to: (p) => `/case-records/summary/${p.id}` },
  { from: 'settings/:tab', to: (p) => `/admin-settings?tab=${p.tab}` },
];

function RedirectWithParams({ to }: { to: (p: Record<string, string | undefined>) => string }) {
  return <Navigate to={to(useParams())} replace />;
}

/** Detail routes that live under a section but are not sidebar entries. */
const CHILDREN: Record<string, { path: string; Component: ComponentType<{ level: AdminLevel }> }[]> =
  {
    patients: [{ path: ':patientId', Component: PatientDetail }],
    providers: [
      { path: 'new', Component: ProviderCreate },
      { path: ':doctorId', Component: ProviderDetail },
    ],
    // Reviewing a provider stays inside Verification: the sidebar and the top
    // bar keep naming that section, and Back returns to the list.
    verification: [{ path: ':doctorId', Component: ProviderDetail }],
    appointments: [{ path: ':consultationId', Component: ConsultationDetail }],
    'case-records': [
      { path: ':caseId', Component: CaseRecordDetail },
      { path: 'summary/:summaryId', Component: CaseSummaryDetail },
    ],
    'support-tickets': [{ path: ':complaintId', Component: ComplaintDetail }],
  };

/* --------------------------------- guards --------------------------------- */

/**
 * A URL the level cannot reach (§76).
 *
 * The sidebar already hides the link; this is for a typed URL, a stale
 * bookmark or a link pasted between admins on different levels. It never
 * renders the screen, so no forbidden request is even issued.
 */
function NoAccess() {
  return (
    <>
      <PageHeader title="Not available to your role" />
      <EmptyState
        icon="lock"
        title="You do not have permission to view this section"
        description="Your admin role does not include it. A super admin can change your permission level."
        action={
          <Button variant="secondary" icon="arrowLeft" onClick={() => window.history.back()}>
            Go back
          </Button>
        }
      />
    </>
  );
}

/** A URL that matches nothing (§77). Always offers a way back into the app. */
function NotFound({ level }: { level: AdminLevel }) {
  return (
    <>
      <PageHeader title="Page not found" />
      <EmptyState
        icon="search"
        title="That page does not exist"
        description="The link may be out of date, or the address may have a typo."
        action={
          <Link to={`/${landingFor(level)}`}>
            <Button variant="primary">Back to {landingFor(level).replace(/-/g, ' ')}</Button>
          </Link>
        }
      />
    </>
  );
}

/** Renders the screen only if the level may see the section. */
function Guarded({
  section,
  level,
  Component,
}: {
  section: Section;
  level: AdminLevel;
  Component: ComponentType<{ level: AdminLevel }>;
}) {
  if (!canSee(level, section)) return <NoAccess />;
  return <Component level={level} />;
}

/* ---------------------------------- app ----------------------------------- */

export function App() {
  const [session, setSession] = useState<Session | null>(() => hydrateSession());

  // Every route that ends a session - a failed refresh, TOKEN_INVALID, the
  // idle timeout, the sign-out button - comes back through this one listener,
  // so there is a single path from "no session" to the sign-in screen.
  useEffect(() => onSignedOut(() => setSession(null)), []);

  return (
    <ToastProvider>
      {session ? (
        <SignedIn session={session} onSession={setSession} />
      ) : (
        <SignIn onSignedIn={() => setSession(getSession())} />
      )}
    </ToastProvider>
  );
}

function SignedIn({
  session,
  onSession,
}: {
  session: Session;
  onSession: (s: Session | null) => void;
}) {
  const { level } = session;
  const location = useLocation();

  /*
   * After sign-out the browser Back button returns to the previous URL. There
   * is no session then, so `App` renders the sign-in screen for it - the
   * protected screen is never reachable again without signing in (§12).
   * This effect only keeps the in-memory copy in step when a refresh rotates
   * the tokens, which changes the object identity but not the level.
   */
  useEffect(() => {
    const current = getSession();
    if (current && current.accessToken !== session.accessToken) onSession(current);
  }, [location.pathname, session.accessToken, onSession]);

  return (
    <Routes>
      <Route element={<Shell session={session} onLevelChange={() => onSession(getSession())} />}>
        <Route index element={<Navigate to={`/${landingFor(level)}`} replace />} />

        {Object.entries(MOVED).map(([from, to]) => (
          <Route key={from} path={from} element={<Navigate to={to} replace />} />
        ))}
        {MOVED_DETAIL.map((m) => (
          <Route key={m.from} path={m.from} element={<RedirectWithParams to={m.to} />} />
        ))}

        {SECTIONS.map((section) => {
          const Screen =
            LIVE && SCREENS[section.path] && !LIVE_SECTIONS.has(section.path)
              ? () => <NotConnected title={section.label} />
              : (SCREENS[section.path] ?? SectionPlaceholder(section));
          const children = CHILDREN[section.path] ?? [];
          return (
            <Route key={section.path} path={section.path}>
              <Route index element={<Guarded section={section} level={level} Component={Screen} />} />
              {children.map((child) => (
                <Route
                  key={child.path}
                  path={child.path}
                  element={
                    <Guarded
                      section={section}
                      level={level}
                      Component={
                        LIVE && !LIVE_CHILDREN.has(`${section.path}/${child.path}`)
                          ? () => <NotConnected title={section.label} />
                          : child.Component
                      }
                    />
                  }
                />
              ))}
            </Route>
          );
        })}

        {/* The admin's own alerts, reached from the header bell rather than
            the sidebar - it is not a module, it is this account's inbox. */}
        <Route path="inbox" element={<Inbox level={level} />} />

        <Route path="*" element={<NotFound level={level} />} />
      </Route>
    </Routes>
  );
}

export default App;
