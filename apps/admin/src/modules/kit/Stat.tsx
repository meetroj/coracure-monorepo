import { useNavigate } from 'react-router-dom';

import { Icon, type IconName } from '../../ui';

/**
 * A dashboard stat card: icon, big number, what it is, one line of context.
 * Every card is a link - a number that does not open the queue behind it is
 * decoration.
 */
export type StatProps = {
  icon: IconName;
  label: string;
  value: string | number;
  sub?: string;
  to: string;
  /** Reads as a problem when set - a red icon, and the sub line is the call to action. */
  alarm?: boolean;
  /** Reads as fine - a green icon. */
  ok?: boolean;
};

/**
 * A stat card shows a NUMBER at figure size. A word where the number should be ("Not reported",
 * "Not available", a dash) is not a figure: at figure size it shouts, and a row of tiles stops
 * lining up. It is set as plain secondary text instead. A value with any digit in it is a figure.
 */
export const valueClass = (value: string | number): string =>
  typeof value === 'string' && !/\d/.test(value) ? 'dcard__value dcard__value--text' : 'dcard__value';

export function StatCard({ icon, label, value, sub, to, alarm, ok }: StatProps) {
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
      <span className={valueClass(value)}>{value}</span>
      <span className="dcard__label">{label}</span>
      {sub && <span className="dcard__sub">{sub}</span>}
    </button>
  );
}

/** A figure that is not a link, for the analytics pages. */
export function Figure({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="dcard dcard--static">
      <span className={valueClass(value)}>{value}</span>
      <span className="dcard__label">{label}</span>
      {sub && <span className="dcard__sub">{sub}</span>}
    </div>
  );
}

/** Horizontal bars for a ranked list, no chart library needed. */
export function Bars({ rows, unit = '' }: { rows: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.label}>
          <span className="bars__label">{r.label}</span>
          <span className="bars__track">
            <span className="bars__fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <strong className="bars__value">
            {r.value.toLocaleString('en-IN')}
            {unit}
          </strong>
        </li>
      ))}
    </ul>
  );
}
