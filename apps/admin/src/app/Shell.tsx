import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { getSession, signOut, type Session } from '../api/http';
import { inbox } from '../api/admin';
import { useResource } from '../lib/useResource';
import logo from '../assets/brand/coracure-wide-twotone.svg';
import { LIVE } from '../api/live';
import { switchLevel } from '../mock/auth';
import { GROUPS, LEVELS, LEVEL_LABEL, SECTIONS, SUB_GROUPS, sectionsFor, type AdminLevel, type Group, type Section } from '../nav';
import { Button, ConfirmDialog, Icon, SelectField, type IconName } from '../ui';
import { NotificationBell } from './NotificationBell';

/**
 * The admin shell: left navigation by module, compact top header, content
 * below (§6, §7).
 *
 * The sidebar is built from `sectionsFor(level)` so a level never sees a link
 * it cannot use - hidden, not disabled. The server gate is still the real one.
 */
export function Shell({
  session,
  onLevelChange,
}: {
  session: Session;
  onLevelChange: () => void;
}) {
  const { level } = session;
  const visible = sectionsFor(level);
  const location = useLocation();
  // Below 860px the sidebar is an off-canvas drawer; this is its open state.
  const [navOpen, setNavOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Picking a page (or the browser Back button) closes the drawer; so does ESC.
  useEffect(() => setNavOpen(false), [location.pathname]);
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  // The header title comes from the same map as the nav, so the two can never
  // disagree about what the current page is called.
  const current = SECTIONS.find(
    (s) => location.pathname === `/${s.path}` || location.pathname.startsWith(`/${s.path}/`),
  );

  return (
    <div className="shell">
      <div className={`scrim ${navOpen ? 'isOpen' : ''}`.trim()} onClick={() => setNavOpen(false)} />
      <aside className={`sidebar ${navOpen ? 'isOpen' : ''}`.trim()}>
        <Link className="sidebar__brand" to="/">
          <img src={logo} alt="Coracure admin" width={150} />
        </Link>
        <button
          type="button"
          className="sidebar__close"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        >
          <Icon name="close" size={20} />
        </button>

        <SideNav visible={visible} pathname={location.pathname} />

        <div className="sidebar__foot">
          <button type="button" className="sidebar__logout" onClick={() => setSigningOut(true)}>
            <Icon name="signOut" size={18} />
            <span>Log out</span>
          </button>
        </div>
        <SignOutDialog open={signingOut} onClose={() => setSigningOut(false)} />
      </aside>

      <div className="main">
        <Header
          title={current?.label ?? (location.pathname.startsWith('/inbox') ? 'Notifications' : 'Admin')}
          session={session}
          onLevelChange={onLevelChange}
          onMenu={() => setNavOpen(true)}
        />
        <main className="content">
          {/* Keyed by the path, so every page change fades in rather than snapping. */}
          <div key={location.pathname} className="fadeIn">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

/** Sections whose second URL segment is a tab, not a detail record. */
const TAB_HUBS = new Set(['admin-settings', 'app-settings', 'website-settings', 'master-data']);

/* -------------------------------- sidebar --------------------------------- */

const GROUP_ICON: Record<Group, IconName> = {
  Dashboard: 'dashboard',
  'Healthcare Providers': 'providers',
  Patients: 'users',
  Services: 'consultations',
  Analytics: 'chart',
  Finances: 'payments',
  Support: 'note',
  Admin: 'settings',
};

const isOn = (pathname: string, s: Section) =>
  pathname === `/${s.path}` || pathname.startsWith(`/${s.path}/`);

/**
 * The §2 sidebar: Dashboard is a plain link; every other group, Patients
 * included, is a collapsible section. The group holding the current page is
 * always open; the rest stay closed until clicked.
 */
function SideNav({ visible, pathname }: { visible: Section[]; pathname: string }) {
  const activeGroup = visible.find((s) => isOn(pathname, s))?.group;
  const [open, setOpen] = useState<Set<Group>>(() => new Set(activeGroup ? [activeGroup] : []));

  // Landing on a page in a closed group (a card, a link, Back) opens it.
  useEffect(() => {
    if (activeGroup) setOpen((prev) => (prev.has(activeGroup) ? prev : new Set(prev).add(activeGroup)));
  }, [activeGroup]);

  const toggle = (g: Group) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });

  const link = (s: Section, nested = false) => (
    <NavLink
      key={s.path}
      to={`/${s.path}`}
      className={`sidebar__link ${nested ? 'sidebar__link--nested' : ''}`.trim()}
    >
      <Icon name={s.icon} size={18} />
      <span>{s.label}</span>
    </NavLink>
  );

  return (
    <nav className="sidebar__nav" aria-label="Sections">
      {GROUPS.map((group) => {
        const items = visible.filter((s) => s.group === group);
        if (items.length === 0) return null;
        if (items.length === 1 && group === 'Dashboard') {
          return (
            <div className="sidebar__group" key={group}>
              {link(items[0])}
            </div>
          );
        }
        const isOpen = open.has(group);
        return (
          <div className="sidebar__group" key={group}>
            <button
              type="button"
              className="sidebar__toggle"
              aria-expanded={isOpen}
              onClick={() => toggle(group)}
            >
              <Icon name={GROUP_ICON[group]} size={18} />
              <span>{group}</span>
              <Icon name="chevronDown" size={14} className="sidebar__chev" />
            </button>
            {isOpen &&
              (group === 'Services'
                ? SUB_GROUPS.map((sub) => {
                    const rows = items.filter((s) => s.sub === sub);
                    return rows.length === 0 ? null : (
                      <div key={sub} className="sidebar__sub">
                        <h3>{sub}</h3>
                        {rows.map((s) => link(s, true))}
                      </div>
                    );
                  })
                : items.map((s) => link(s)))}
          </div>
        );
      })}
    </nav>
  );
}

/* --------------------------------- header --------------------------------- */

function Header({
  title,
  session,
  onLevelChange,
  onMenu,
}: {
  title: string;
  session: Session;
  onLevelChange: () => void;
  onMenu: () => void;
}) {
  const navigate = useNavigate();
  const parts = useLocation().pathname.split('/').filter(Boolean);
  // A detail page (/doctors/:id, /consultations/:id, ...) gets Back, here beside the section name.
  const isDetail = parts.length >= 2 && !TAB_HUBS.has(parts[0]);
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    // Back keeps the list's filters; a deep link with no history falls back to the list itself.
    if (idx > 0) navigate(-1);
    else navigate(`/${parts[0]}`);
  };

  return (
    <header className="header">
      <button type="button" className="header__menu" aria-label="Open menu" onClick={onMenu}>
        <Icon name="menu" size={22} />
      </button>
      {isDetail && (
        <button type="button" className="header__back" aria-label="Back" onClick={goBack}>
          <Icon name="arrowLeft" size={18} />
        </button>
      )}
      <h1 className="header__title">{title}</h1>

      {/* A list screen portals its search box in here (see ListScreen). */}
      <div id="header-search" className="header__search" />

      <div className="header__right">
        <NotificationBell />
        <AccountMenu session={session} onLevelChange={onLevelChange} />
      </div>
    </header>
  );
}

/** Shared by the sidebar's Log out button and the account menu. */
function SignOutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <ConfirmDialog
      open={open}
      busy={busy}
      onClose={onClose}
      title="Sign out of every device?"
      variant="primary"
      confirmLabel="Sign out everywhere"
      consequence={
        <>
          Signing out revokes this account&apos;s token entirely, so{' '}
          <strong>every browser and device signed in as you is signed out</strong>. The backend has
          no way to end one session and keep the others.
        </>
      }
      onConfirm={async () => {
        setBusy(true);
        // `signOut` clears local state even if the call fails, so this always
        // ends at the sign-in screen rather than a half-signed-out panel.
        await signOut();
        setBusy(false);
        onClose();
      }}
    />
  );
}

/* ------------------------------ account menu ------------------------------ */

function AccountMenu({
  session,
  onLevelChange,
}: {
  session: Session;
  onLevelChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // A dropdown that does not close on outside click or ESC is a trap.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const initials = (session.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="account" ref={wrap}>
      <button
        className="profile"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="profile__avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="profile__text">
          {/* No display name exists to show - gap A-4. The address the admin
              signed in with is what the panel actually knows. */}
          <strong>{session.email || 'Signed in'}</strong>
          <small>{LEVEL_LABEL[session.level]}</small>
        </span>
        <Icon name="chevronDown" size={15} />
      </button>

      {open && (
        <div className="profile__menu" role="menu">
          {/*
            A DEMO AFFORDANCE, NOT A FEATURE. A real admin's level comes from
            their token and is set by a super admin; there is no endpoint
            behind this. It is here so the role-gated navigation and hidden
            actions can be reviewed without six accounts, and it goes when the
            backend is wired in.
          */}
          {!LIVE && (
          <SelectField
            label="View as (demo only)"
            value={session.level}
            options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))}
            onChange={(e) => {
              switchLevel(e.target.value as AdminLevel, session.email);
              setOpen(false);
              // The session object changed identity; re-read it at the root.
              onLevelChange();
            }}
          />
          )}

          <Button
            variant="ghost"
            icon="signOut"
            onClick={() => {
              setOpen(false);
              setConfirming(true);
            }}
          >
            Sign out
          </Button>
        </div>
      )}

      <SignOutDialog open={confirming} onClose={() => setConfirming(false)} />
    </div>
  );
}

/** Re-reads the session after a sign-in without threading it through props. */
export const currentSession = getSession;
