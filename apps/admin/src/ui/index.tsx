import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { ApiError } from '@coracure/api/errors';

import { canSee, SECTIONS, SETTINGS_TABS, type AdminLevel, type Section } from '../nav';
import { Icon, type IconName } from './Icon';

export { Icon } from './Icon';
export type { IconName } from './Icon';

/**
 * The panel's component kit (§90).
 *
 * One definition per pattern, so a status pill, a table or a confirm dialog
 * looks and behaves the same on every screen. Anything that renders colour
 * reads a `var(--…)` token — no component holds a hex.
 */

/* --------------------------------- Button -------------------------------- */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** Shows a spinner AND blocks the click, so double-submits are impossible. */
  loading?: boolean;
  icon?: IconName;
  size?: 'md' | 'sm';
};

export function Button({
  variant = 'secondary',
  loading = false,
  icon,
  size = 'md',
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      // `loading` disables as well as spins — the guard is not left to the caller.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`btn btn--${variant} btn--${size} ${className}`.trim()}
    >
      {loading ? (
        <span className="spinner" aria-hidden="true" />
      ) : (
        icon && <Icon name={icon} size={16} />
      )}
      {children}
    </button>
  );
}

/** Icon-only button. Always takes a label — never a bare glyph (§70). */
export function IconButton({
  icon,
  label,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button {...rest} className={`iconBtn ${className}`.trim()} aria-label={label} title={label}>
      <Icon name={icon} size={18} />
    </button>
  );
}

/* --------------------------------- Fields -------------------------------- */

type FieldShell = {
  label: string;
  /** Rendered beneath the control, in red, and wired via aria-describedby. */
  error?: string | null;
  hint?: ReactNode;
  required?: boolean;
};

export function TextField({
  label,
  error,
  hint,
  required,
  className = '',
  ...rest
}: FieldShell & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`formRow ${className}`.trim()}>
      <label htmlFor={id}>
        {label}
        {required && <span className="req" aria-hidden="true"> *</span>}
      </label>
      <input
        {...rest}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={error ? 'isInvalid' : undefined}
      />
      {hint && !error && (
        <p className="fieldHint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="fieldError" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  error,
  hint,
  required,
  className = '',
  ...rest
}: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`formRow ${className}`.trim()}>
      <label htmlFor={id}>
        {label}
        {required && <span className="req" aria-hidden="true"> *</span>}
      </label>
      <textarea
        {...rest}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={error ? 'isInvalid' : undefined}
      />
      {hint && !error && (
        <p className="fieldHint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="fieldError" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  error,
  hint,
  required,
  options,
  className = '',
  ...rest
}: FieldShell &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: readonly { value: string; label: string }[];
  }) {
  const id = useId();
  // The browser draws the list, so "open" is tracked from the events that open
  // and close it: a press toggles, a choice, Escape or leaving closes.
  const [open, setOpen] = useState(false);
  return (
    <div className={`formRow ${className}`.trim()}>
      <label htmlFor={id}>
        {label}
        {required && <span className="req" aria-hidden="true"> *</span>}
      </label>
      <div className={`selectWrap ${open ? 'isOpen' : ''}`.trim()}>
        <select
          {...rest}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          onMouseDown={(e) => {
            rest.onMouseDown?.(e);
            setOpen((o) => !o);
          }}
          onChange={(e) => {
            rest.onChange?.(e);
            setOpen(false);
          }}
          onBlur={(e) => {
            rest.onBlur?.(e);
            setOpen(false);
          }}
          onKeyDown={(e) => {
            rest.onKeyDown?.(e);
            if (e.key === 'Escape') setOpen(false);
            else if (e.key === ' ' || e.key === 'Enter' || (e.altKey && e.key === 'ArrowDown')) setOpen(true);
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="selectWrap__chev" aria-hidden="true">
          <Icon name="chevronDown" size={16} />
        </span>
      </div>
      {hint && !error && <p className="fieldHint">{hint}</p>}
      {error && <p className="fieldError">{error}</p>}
    </div>
  );
}

/** Debounced search box with a clear button (§58). */
export function SearchField({
  value,
  onSearch,
  placeholder = 'Search…',
  delay = 350,
}: {
  value: string;
  onSearch: (next: string) => void;
  placeholder?: string;
  delay?: number;
}) {
  const [local, setLocal] = useState(value);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  // Keeps in step when the URL changes underneath (back button, reset).
  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    if (local === value) return;
    const timer = setTimeout(() => onSearchRef.current(local), delay);
    return () => clearTimeout(timer);
  }, [local, value, delay]);

  const id = useId();
  return (
    <div className="formRow searchRow">
      <label htmlFor={id}>Search</label>
      <div className="search">
      <span className="search__icon" aria-hidden="true">
        <Icon name="search" size={16} />
      </span>
      <input
        id={id}
        type="search"
        value={local}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setLocal(e.target.value)}
      />
      {local && (
        <button
          type="button"
          className="search__clear"
          aria-label="Clear search"
          onClick={() => setLocal('')}
        >
          ×
        </button>
      )}
      </div>
    </div>
  );
}

/* ------------------------------ Status badge ------------------------------ */

export type BadgeTone = 'positive' | 'neutral' | 'warning' | 'danger' | 'info';

/**
 * One badge component for every status in the platform (§48).
 *
 * The map is keyed on the backend's own enum values, so a status the backend
 * adds shows as neutral rather than crashing or rendering an empty pill.
 */
const TONES: Record<string, BadgeTone> = {
  // Doctor verification
  verified: 'positive',
  pending: 'warning',
  under_review: 'info',
  rejected: 'danger',
  suspended: 'danger',
  // Documents / content
  approved: 'positive',
  draft: 'neutral',
  in_review: 'info',
  published: 'positive',
  archived: 'neutral',
  // Consultations
  pending_payment: 'warning',
  scheduled: 'info',
  awaiting_doctor: 'warning',
  in_progress: 'info',
  awaiting_documentation: 'warning',
  completed: 'positive',
  cancelled: 'danger',
  no_show: 'danger',
  expired: 'neutral',
  // Payments
  created: 'neutral',
  paid: 'positive',
  failed: 'danger',
  refunded: 'info',
  // Complaints
  open: 'warning',
  resolved: 'positive',
  // Deletion requests
  requested: 'warning',
  executed: 'positive',
  // Safety alerts
  red_flag: 'danger',
  amber: 'warning',
  missed_checkin: 'warning',
  medication_side_effect: 'warning',
  followup_due: 'info',
  // Listing
  listed: 'positive',
  unlisted: 'neutral',
  // Seniority
  expert: 'info',
  standard: 'neutral',
};

/** Turns `awaiting_documentation` into `Awaiting documentation`. */
export const humanise = (value: string): string => {
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

export function StatusBadge({
  status,
  tone,
  label,
}: {
  status: string;
  /** Override when the same word means different things in two modules. */
  tone?: BadgeTone;
  label?: string;
}) {
  const resolved = tone ?? TONES[status] ?? 'neutral';
  return <span className={`badge badge--${resolved}`}>{label ?? humanise(status)}</span>;
}

/* ------------------------------ Page scaffold ----------------------------- */

export type Crumb = { label: string; to?: string };

/**
 * Page title, breadcrumbs and actions, aligned to the content grid (§67).
 *
 * `back` is always an explicit parent route, never `navigate(-1)` — §61. A
 * deep link opened cold must still land somewhere sensible rather than leaving
 * the app.
 */
/**
 * Titles the top bar already shows. A page heading that repeats one of these
 * is dropped (with its description) so the screen does not say the same thing
 * twice; the actions below it stay. Detail pages (a doctor's name, a patient)
 * are not in this set and keep their heading.
 */
const SHELL_TITLES = new Set<string>([
  ...SECTIONS.map((s) => s.label),
  ...SETTINGS_TABS.map((t) => t.label),
  'Settings',
  'Clarification cases',
  'Allocation decisions',
]);

export function PageHeader({
  title,
  description,
  crumbs,
  back,
  actions,
  titleAside,
}: {
  title: string;
  /** Sits on the same line as the title, e.g. a status badge. */
  titleAside?: ReactNode;
  description?: ReactNode;
  crumbs?: Crumb[];
  back?: { to: string; label: string };
  actions?: ReactNode;
}) {
  // Only on a route the top bar names; a title elsewhere is never hidden.
  const { pathname } = useLocation();
  const first = pathname.split('/').filter(Boolean)[0];
  const onSection = SECTIONS.some((s) => s.path === first);
  const showTitle = !(onSection && SHELL_TITLES.has(title));
  // `back` is no longer drawn here — the top bar owns the Back button — but it still means
  // "this page has somewhere to go back to", so crumbs stay hidden when it is passed.
  if (!showTitle && !actions && !(!back && crumbs && crumbs.length > 0)) return null;
  return (
    <header className="pageHeader">
      {/* A back link already says where you came from; crumbs only when there is none. */}
      {!back && crumbs && crumbs.length > 0 && (
        <nav className="crumbs" aria-label="Breadcrumb">
          {crumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`}>
              {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span>{crumb.label}</span>}
              {i < crumbs.length - 1 && <span className="crumbs__sep" aria-hidden="true">/</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="pageHeader__row">
        {showTitle && (
          <div>
            {titleAside ? (
              <div className="pageHeader__titleRow">
                <h1>{title}</h1>
                {titleAside}
              </div>
            ) : (
              <h1>{title}</h1>
            )}
            {description && <p className="muted pageHeader__desc">{description}</p>}
          </div>
        )}
        {actions && <div className={`pageHeader__actions ${showTitle ? '' : 'isAlone'}`.trim()}>{actions}</div>}
      </div>
    </header>
  );
}

export function Card({
  children,
  className = '',
  title,
  actions,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={`card ${className}`.trim()}>
      {(title || actions) && (
        <div className="card__head">
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/* ------------------------------- Data states ------------------------------ */

export function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton__row" key={i} />
      ))}
    </div>
  );
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="state">
      <span className="state__icon" aria-hidden="true">
        <Icon name={icon} size={22} />
      </span>
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
      {action && <div className="state__action">{action}</div>}
    </div>
  );
}

/**
 * The failure state for a screen that could not load (§78).
 *
 * Reads `error.code`, never the message. Shows the request id so a screenshot
 * is enough for support, and offers one manual retry rather than looping.
 */
export function ErrorState({
  error,
  onRetry,
  resource = 'this page',
}: {
  error: ApiError;
  onRetry?: () => void;
  resource?: string;
}) {
  const forbidden = error.code === 'INSUFFICIENT_PERMISSION' || error.code === 'FORBIDDEN';
  const missing = error.code === 'NOT_FOUND';

  const title = forbidden
    ? 'You do not have permission to view this'
    : missing
      ? `We could not find ${resource}`
      : `Unable to load ${resource}`;

  const description = forbidden
    ? 'Your admin role does not include this. A super admin can change your permission level.'
    : missing
      ? 'It may have been removed, or the link may be out of date.'
      : error.message;

  return (
    <div className="state state--error">
      <span className="state__icon state__icon--danger" aria-hidden="true">
        <Icon name={forbidden ? 'lock' : 'alert'} size={22} />
      </span>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {error.requestId && <p className="state__meta">Request ID: {error.requestId}</p>}
      {onRetry && !forbidden && !missing && (
        <div className="state__action">
          <Button variant="secondary" icon="refresh" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Loading → error → empty → content, in the one order every screen needs
 * (§56, §57). Takes the `useResource` result straight through.
 */
export function Async<T>({
  state,
  children,
  resource,
  empty,
  skeletonRows,
}: {
  state: {
    data: T | null;
    loading: boolean;
    error: ApiError | null;
    initial: boolean;
    reload: () => void;
  };
  children: (data: T) => ReactNode;
  resource?: string;
  empty?: ReactNode;
  skeletonRows?: number;
}) {
  // Only the FIRST load blanks the screen; a refetch keeps the old data up.
  if (state.loading && state.initial) return <Skeleton rows={skeletonRows} />;
  if (state.error && !state.data)
    return <ErrorState error={state.error} onRetry={state.reload} resource={resource} />;
  if (!state.data) return <>{empty ?? <EmptyState title="Nothing to show" />}</>;

  const isEmptyList = Array.isArray(state.data) && state.data.length === 0;
  if (isEmptyList && empty) return <>{empty}</>;

  return <>{children(state.data)}</>;
}

/* --------------------------------- Table ---------------------------------- */

export type Column<Row> = {
  key: string;
  header: string;
  /** Right-align numbers and the action column. */
  align?: 'start' | 'end';
  width?: string;
  render: (row: Row) => ReactNode;
};

export function Table<Row>({
  columns,
  rows,
  rowKey,
  onRowClick,
  hideChevron,
  caption,
}: {
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  /** The row stays clickable, but no arrow is drawn - for tables that already carry their own button. */
  hideChevron?: boolean;
  caption?: string;
}) {
  const chevron = Boolean(onRowClick) && !hideChevron;
  return (
    // Wide tables scroll inside their own box rather than the page (§8).
    <div className="tableWrap">
      <table className={`table ${chevron ? 'hasChevron' : ''}`.trim()}>
        {caption && <caption className="visuallyHidden">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.align === 'end' ? 'colEnd' : undefined}
                style={{ width: col.width, textAlign: col.align === 'end' ? 'right' : 'left' }}
              >
                {col.header}
              </th>
            ))}
            {chevron && <th className="colChev" aria-hidden="true" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? 'isClickable' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={col.align === 'end' ? 'colEnd' : undefined}
                  style={{ textAlign: col.align === 'end' ? 'right' : 'left' }}
                >
                  {col.render(row)}
                </td>
              ))}
              {chevron && (
                <td className="colChev" aria-hidden="true">
                  <Icon name="arrowRight" size={16} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Label/value pairs for read-only detail panes, visually distinct from forms. */
export function DefinitionList({
  items,
}: {
  items: readonly { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="defList">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value ?? <span className="muted">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

/* --------------------------------- Modal ---------------------------------- */

/**
 * Dialog built on `<dialog>` — the browser gives focus trapping, ESC and the
 * top layer for free, which is most of §51 without a focus-management library.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // The page behind must not scroll while a dialog is up.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      style={{ maxWidth: width }}
      // ESC fires `cancel`; route it through the same close path as the button
      // so a parent's state cannot drift out of step with the dialog's.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="modal__head">
        <h2>{title}</h2>
        <IconButton icon="close" label="Close" onClick={onClose} />
      </div>
      <div className="modal__body">{children}</div>
      {footer && <div className="modal__foot">{footer}</div>}
    </dialog>
  );
}

/**
 * Destructive confirmation (§51, §73): title, consequence, an optional required
 * reason, and an optional typed phrase for the genuinely irreversible ones.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  consequence,
  confirmLabel = 'Confirm',
  variant = 'danger',
  busy = false,
  reason,
  typeToConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  consequence: ReactNode;
  confirmLabel?: string;
  variant?: ButtonVariant;
  busy?: boolean;
  /** When set, the action cannot proceed without a typed reason. */
  reason?: { label: string; hint?: ReactNode; maxLength?: number };
  /** When set, the admin must type this exact phrase. */
  typeToConfirm?: string;
}) {
  const [text, setText] = useState('');
  const [typed, setTyped] = useState('');

  // Never carry a previous reason into the next confirmation.
  useEffect(() => {
    if (open) {
      setText('');
      setTyped('');
    }
  }, [open]);

  const reasonOk = !reason || text.trim().length > 0;
  const typedOk = !typeToConfirm || typed.trim() === typeToConfirm;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={variant}
            loading={busy}
            disabled={!reasonOk || !typedOk}
            onClick={() => onConfirm(text.trim())}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="consequence">{consequence}</div>

      {reason && (
        <TextArea
          label={reason.label}
          hint={reason.hint}
          required
          rows={3}
          maxLength={reason.maxLength}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}

      {typeToConfirm && (
        <TextField
          label={`Type “${typeToConfirm}” to confirm`}
          required
          value={typed}
          autoComplete="off"
          onChange={(e) => setTyped(e.target.value)}
        />
      )}
    </Modal>
  );
}

/* ------------------------------ Permissions ------------------------------- */

/**
 * Hides an action the level cannot use (§18, §34, §76).
 *
 * Hides — never renders a disabled control with a tooltip, which advertises a
 * capability the admin does not have. The server is still the authority.
 */
export function PermissionGate({
  level,
  allow,
  children,
  fallback = null,
}: {
  level: AdminLevel;
  allow: readonly AdminLevel[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const permitted = level === 'super_admin' || allow.includes(level);
  return <>{permitted ? children : fallback}</>;
}

export const may = (level: AdminLevel, allow: readonly AdminLevel[]): boolean =>
  level === 'super_admin' || allow.includes(level);

export const maySee = (level: AdminLevel, section: Section): boolean => canSee(level, section);

/* --------------------------------- Tabs ----------------------------------- */

/** Tabs whose selection lives in the URL, so refresh and Back keep it (§62). */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={tab.id === active}
          className={`tabs__tab ${tab.id === active ? 'isActive' : ''}`.trim()}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** An inline notice — a product rule or a consequence, stated where it applies. */
export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warning' | 'danger';
  children: ReactNode;
}) {
  return (
    <p className={`notice notice--${tone}`}>
      <Icon name={tone === 'info' ? 'info' : 'alert'} size={16} />
      <span>{children}</span>
    </p>
  );
}
