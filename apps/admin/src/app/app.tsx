import { useEffect, useState, type ComponentType } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { getSession, hydrateSession, onSignedOut, type Session } from '../api/http';
import { ToastProvider } from '../lib/toast';
import { SECTIONS, canSee, landingFor, type AdminLevel, type Section } from '../nav';
import { Button, EmptyState, PageHeader } from '../ui';
import { SectionPlaceholder } from './Section';
import { Shell } from './Shell';
import { SignIn } from './SignIn';

/* ----------------------------- module registry ---------------------------- */

import { Dashboard } from '../modules/Dashboard';
import { ProvidersList } from '../modules/providers/ProvidersList';
import { ProviderCreate } from '../modules/providers/ProviderCreate';
import { ProviderDetail } from '../modules/providers/ProviderDetail';
import { CredentialQueue } from '../modules/CredentialQueue';
import { Patients } from '../modules/patients/Patients';
import { PatientDetail } from '../modules/patients/PatientDetail';
import { CaseReview } from '../modules/CaseReview';
import { SettingsHub } from '../modules/settings/SettingsHub';
import { SafetyAlerts } from '../modules/SafetyAlerts';
import { CaseSummaryDetail } from '../modules/CaseSummaryDetail';
import { PendingSummaries } from '../modules/PendingSummaries';
import { Availability } from '../modules/availability/Availability';
import { Consultations } from '../modules/consultations/Consultations';
import { ConsultationDetail } from '../modules/consultations/ConsultationDetail';
import { Complaints } from '../modules/complaints/Complaints';
import { ComplaintDetail } from '../modules/complaints/ComplaintDetail';
import { Payments } from '../modules/Payments';
import { Catalogue } from '../modules/content/Catalogue';
import { CareHub } from '../modules/content/CareHub';
import { NotificationTemplates } from '../modules/content/NotificationTemplates';
import { Pathways } from '../modules/content/Pathways';
import { Inbox } from '../modules/Inbox';

/**
 * Every section's screen, keyed by its `nav.ts` path.
 *
 * A path with no entry falls back to the worklist placeholder rather than a
 * blank route, so the registry can never produce a dead end (§19, §60).
 */
const SCREENS: Record<string, ComponentType<{ level: AdminLevel }>> = {
  dashboard: Dashboard,
  providers: ProvidersList,
  credentials: CredentialQueue,
  patients: Patients,
  consultations: Consultations,
  'safety-alerts': SafetyAlerts,
  'case-summaries': PendingSummaries,
  'case-review': CaseReview,
  availability: Availability,
  payments: Payments,
  catalogue: Catalogue,
  'care-hub': CareHub,
  notifications: NotificationTemplates,
  pathways: Pathways,
  complaints: Complaints,
  settings: SettingsHub,
};

/**
 * Old sidebar paths that moved. A bookmark or a link in an audit note still
 * lands in the right place instead of on "page not found".
 */
const MOVED: Record<string, string> = {
  'pending-summaries': '/case-summaries',
  clarification: '/case-review',
  'allocation-decisions': '/case-review?tab=allocation',
  legal: '/settings/legal',
  audit: '/settings/audit',
  'deletion-requests': '/settings/deletion-requests',
  retention: '/settings/retention',
  'admin-accounts': '/settings/admin-accounts',
};

/** Detail routes that live under a section but are not sidebar entries. */
const CHILDREN: Record<string, { path: string; Component: ComponentType<{ level: AdminLevel }> }[]> =
  {
    patients: [{ path: ':patientId', Component: PatientDetail }],
    settings: [{ path: ':tab', Component: SettingsHub }],
    providers: [
      { path: 'new', Component: ProviderCreate },
      { path: ':doctorId', Component: ProviderDetail },
    ],
    // Reviewing a doctor's documents stays inside Document verification: the
    // sidebar and the top bar keep naming that section, and Back returns to the queue.
    credentials: [{ path: ':doctorId', Component: ProviderDetail }],
    consultations: [{ path: ':consultationId', Component: ConsultationDetail }],
    'case-summaries': [{ path: ':summaryId', Component: CaseSummaryDetail }],
    complaints: [{ path: ':complaintId', Component: ComplaintDetail }],
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

        {SECTIONS.map((section) => {
          const Screen = SCREENS[section.path] ?? SectionPlaceholder(section);
          const children = CHILDREN[section.path] ?? [];
          return (
            <Route key={section.path} path={section.path}>
              <Route index element={<Guarded section={section} level={level} Component={Screen} />} />
              {children.map((child) => (
                <Route
                  key={child.path}
                  path={child.path}
                  element={<Guarded section={section} level={level} Component={child.Component} />}
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
