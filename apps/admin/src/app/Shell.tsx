import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { getSession, signOut, type Session } from '../api/http';
import { inbox } from '../api/admin';
import { useResource } from '../lib/useResource';
import logo from '../assets/brand/coracure-wide-twotone.svg';
import { switchLevel } from '../mock/auth';
import { GROUPS, LEVELS, LEVEL_LABEL, SECTIONS, sectionsFor, type AdminLevel } from '../nav';
import { Button, ConfirmDialog, Icon, SelectField } from '../ui';
import { NotificationBell } from './NotificationBell';

/**
 * The admin shell: left navigation by module, compact top header, content
 * below (§6, §7).
 *
 * The sidebar is built from `sectionsFor(level)` so a level never sees a link
 * it cannot use — hidden, not disabled. The server gate is still the real one.
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

        <nav className="sidebar__nav" aria-label="Sections">
          {GROUPS.map((group) => {
            const inGroup = visible.filter((s) => s.group === group);
            if (inGroup.length === 0) return null;
            // Settings sits alone at the foot: a rule above it says "system", no label needed.
            const isSystem = group === 'System';
            return (
              <div
                className={`sidebar__group ${isSystem ? 'sidebar__group--system' : ''}`.trim()}
                key={group}
                {...(isSystem ? { role: 'group', 'aria-label': group } : {})}
              >
                {!isSystem && <h2>{group}</h2>}
                {inGroup.map((section) => (
                  <NavLink key={section.path} to={`/${section.path}`} className="sidebar__link">
                    <Icon name={section.icon} size={18} />
                    <span>{section.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="main">
        <Header
          title={current?.label ?? (location.pathname.startsWith('/inbox') ? 'Notifications' : 'Admin')}
          session={session}
          onLevelChange={onLevelChange}
          onMenu={() => setNavOpen(true)}
        />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
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
  const isDetail = parts.length >= 2 && parts[0] !== 'settings';
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

      <div className="header__right">
        <NotificationBell />
        <AccountMenu session={session} onLevelChange={onLevelChange} />
      </div>
    </header>
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
  const [busy, setBusy] = useState(false);
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
          {/* No display name exists to show — gap A-4. The address the admin
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

      <ConfirmDialog
        open={confirming}
        busy={busy}
        onClose={() => setConfirming(false)}
        title="Sign out of every device?"
        variant="primary"
        confirmLabel="Sign out everywhere"
        consequence={
          <>
            Signing out revokes this account&apos;s token entirely, so{' '}
            <strong>every browser and device signed in as you is signed out</strong>. The backend
            has no way to end one session and keep the others.
          </>
        }
        onConfirm={async () => {
          setBusy(true);
          // `signOut` clears local state even if the call fails, so this always
          // ends at the sign-in screen rather than a half-signed-out panel.
          await signOut();
          setBusy(false);
          setConfirming(false);
        }}
      />
    </div>
  );
}

/** Re-reads the session after a sign-in without threading it through props. */
export const currentSession = getSession;
