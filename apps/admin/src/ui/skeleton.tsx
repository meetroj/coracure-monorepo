import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * The admin portal's skeleton kit.
 *
 * - A skeleton reserves the space its content will take, so nothing shifts
 *   when data lands: it reuses the real `.table`, `.card` and `.dcards` markup
 *   and only swaps the content for neutral blocks.
 * - It is neutral. One pale mint-grey; no status colours, no numbers, no
 *   labels that could read as data (a skeleton must never look "paid" or "urgent").
 * - Static chrome (sidebar, title, tabs, filters, known column headers) stays
 *   real; only dynamic content is skeletonised.
 *
 * Share the compositions below rather than hand-rolling `.sk` markup per screen.
 */

/** A response faster than this is a flash of layout, not a loading cue. */
export const SKELETON_DELAY_MS = 150;
/** Once shown, a skeleton stays at least this long so it never blinks. */
export const SKELETON_MIN_MS = 300;

export type GatePhase = 'ready' | 'hold' | 'skeleton';

/**
 * Decides when a skeleton is honest: `hold` while a request is inside the
 * delay (render nothing for the content area), `skeleton` once it has run
 * longer, `ready` when loading stops. A shown skeleton stays SKELETON_MIN_MS.
 *
 * Pass "no data yet AND a request is running": a refetch over data on screen
 * must pass `false` so existing content is never covered.
 */
export function useSkeletonGate(
  loading: boolean,
  delay: number = SKELETON_DELAY_MS,
  min: number = SKELETON_MIN_MS,
): GatePhase {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (loading) {
      if (!visible) {
        timer = setTimeout(() => {
          shownAt.current = Date.now();
          setVisible(true);
        }, delay);
      }
    } else if (visible) {
      const wait = Math.max(0, min - (Date.now() - shownAt.current));
      if (wait === 0) setVisible(false);
      else timer = setTimeout(() => setVisible(false), wait);
    }
    return () => clearTimeout(timer);
  }, [loading, visible, delay, min]);

  // Also decided here, so the frame after data arrives never paints one more
  // skeleton that the effect has not yet cleared.
  const spent = visible && !loading && Date.now() - shownAt.current >= min;
  if (visible && !spent) return 'skeleton';
  return loading ? 'hold' : 'ready';
}

/* --------------------------------- region --------------------------------- */

/**
 * The loading region: busy and labelled once, so a screen reader hears
 * "Loading patients" a single time rather than every block. The blocks inside
 * are `aria-hidden`.
 */
export function SkeletonRegion({
  label = 'Loading',
  children,
  className = '',
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`skeleton ${className}`.trim()} aria-busy="true" aria-label={label}>
      {children}
    </section>
  );
}

/**
 * `loading` -> skeleton -> `children`, with the delay and minimum display
 * handled. Use it where a screen is not behind `<Async>`.
 */
export function SkeletonGate({
  loading,
  skeleton,
  label,
  children,
}: {
  loading: boolean;
  skeleton: ReactNode;
  label?: string;
  children: ReactNode;
}) {
  const phase = useSkeletonGate(loading);
  if (phase === 'hold') return null;
  if (phase === 'skeleton') return <SkeletonRegion label={label}>{skeleton}</SkeletonRegion>;
  return <>{children}</>;
}

/* ------------------------------- primitives -------------------------------- */

export function SkeletonBlock({
  w = '100%',
  h = 12,
  r,
  circle = false,
  style,
}: {
  w?: number | string;
  h?: number | string;
  /** Radius override; the default 8px suits fields and cards. */
  r?: number | string;
  circle?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`sk${circle ? ' sk--circle' : ''}`}
      style={{ width: w, height: h, borderRadius: circle ? undefined : r, ...style }}
      aria-hidden="true"
    />
  );
}

/** Line widths vary a little, and a multi-line run ends short, as prose does. */
const LINE_WIDTHS = ['94%', '82%', '90%', '72%'];

export function SkeletonText({ lines = 1, lineHeight = 12, last = '60%' }: { lines?: number; lineHeight?: number; last?: string }) {
  return (
    <span className="skStack">
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonBlock
          key={i}
          h={lineHeight}
          r={lineHeight / 2}
          w={lines > 1 && i === lines - 1 ? last : LINE_WIDTHS[i % LINE_WIDTHS.length]}
        />
      ))}
    </span>
  );
}

/* ---------------------------------- table ---------------------------------- */

export type SkeletonColumn = {
  /** What the cell holds, so the placeholder has the right shape. */
  kind?: 'avatar' | 'person' | 'stack' | 'id' | 'name' | 'email' | 'status' | 'date' | 'amount' | 'action' | 'button' | 'thumb' | 'text';
  /** Pass the real header when it is known, so the table keeps its columns. */
  header?: string;
  width?: string;
  align?: 'start' | 'end';
};

/** Shape (width x height, circle) per kind. A status is a compact neutral pill. */
const CELL: Record<NonNullable<SkeletonColumn['kind']>, { w: number; h: number; r?: number | string; circle?: boolean }> = {
  avatar: { w: 34, h: 34, circle: true },
  // An avatar beside a name and a small line, and a name over a small line.
  person: { w: 130, h: 14 },
  stack: { w: 130, h: 14 },
  id: { w: 64, h: 13 },
  name: { w: 140, h: 14 },
  email: { w: 190, h: 13 },
  status: { w: 76, h: 22, r: 999 },
  date: { w: 104, h: 13 },
  amount: { w: 68, h: 13 },
  action: { w: 28, h: 28, circle: true },
  // A row's own button (Review, Open, Edit): the size of a small one.
  button: { w: 76, h: 32, r: 8 },
  // A 16:9 thumbnail, as the Care Hub table draws it.
  thumb: { w: 80, h: 45, r: 6 },
  text: { w: 120, h: 13 },
};

/** Row-to-row width factor, so a column is not a uniform bar. */
const VARY = [1, 0.86, 0.94, 0.78];

/**
 * The skeleton's columns from the screen's own `Column[]`, so headers, widths
 * and alignment cannot drift from the real table. `kinds` names the cell shape
 * by column key; a key it does not name is plain text.
 */
export function skeletonColumns(
  columns: readonly { key: string; header: string; align?: 'start' | 'end'; width?: string }[],
  kinds: Record<string, SkeletonColumn['kind']> = {},
): SkeletonColumn[] {
  return columns.map((c) => ({ kind: kinds[c.key] ?? 'text', header: c.header, width: c.width, align: c.align }));
}

/**
 * A table body in the real table's markup. `rows`: about 5 for a short table,
 * 8 to 10 for a full page. Columns come from the real table so widths and
 * alignment survive the swap. `footer` reserves the "Showing x of y" line a
 * paged list carries under its table.
 */
export function TableSkeleton({
  columns,
  rows = 8,
  chevron = false,
  footer = false,
}: {
  columns: readonly SkeletonColumn[];
  rows?: number;
  chevron?: boolean;
  footer?: boolean;
}) {
  const table = (
    <div className="tableWrap">
      <table className={`table ${chevron ? 'hasChevron' : ''}`.trim()} aria-hidden="true">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={i}
                className={c.align === 'end' ? 'colEnd' : undefined}
                style={{ width: c.width, textAlign: c.align === 'end' ? 'right' : 'left' }}
              >
                {c.header ?? <SkeletonBlock w={56} h={10} />}
              </th>
            ))}
            {chevron && <th className="colChev" />}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              {columns.map((c, i) => {
                const cell = CELL[c.kind ?? 'text'];
                const end = c.align === 'end' || c.kind === 'action' || c.kind === 'button' || c.kind === 'amount';
                const w = cell.circle || cell.h > 20 ? cell.w : Math.round(cell.w * VARY[(row + i) % VARY.length]);
                return (
                  <td key={i} className={end ? 'colEnd' : undefined} style={{ textAlign: end ? 'right' : 'left' }}>
                    <span className={`skCell${end ? ' skCell--end' : ''}`}>
                      {c.kind === 'person' || c.kind === 'stack' ? (
                        <span className="skPerson">
                          {c.kind === 'person' && <SkeletonBlock w={34} h={34} circle />}
                          <span className="skStack">
                            <SkeletonBlock w={w} h={14} />
                            <SkeletonBlock w={Math.round(w * 0.6)} h={11} />
                          </span>
                        </span>
                      ) : (
                        <SkeletonBlock w={w} h={cell.h} r={cell.r} circle={cell.circle} />
                      )}
                    </span>
                  </td>
                );
              })}
              {chevron && <td className="colChev" />}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  if (!footer) return table;
  return (
    <>
      {table}
      <div className="listFooter" aria-hidden="true">
        <SkeletonBlock w={150} h={14} />
      </div>
    </>
  );
}

/* --------------------------- cards, metrics, charts ------------------------ */

/**
 * A dashboard card in the real `.dcard` markup: icon, value, label, context
 * line. Never a number or a trend, and never an alarm or ok tone.
 */
export function MetricSkeleton() {
  return (
    <div className="dcard dcard--static" aria-hidden="true">
      <span className="dcard__top">
        <SkeletonBlock w={40} h={40} r={12} />
      </span>
      <SkeletonBlock w="42%" h={32} r={8} style={{ marginTop: 'var(--space-sm)' }} />
      <SkeletonBlock w="64%" h={14} />
      <SkeletonBlock w="34%" h={12} />
    </div>
  );
}

export function MetricGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="dcards">
      {Array.from({ length: count }, (_, i) => (
        <MetricSkeleton key={i} />
      ))}
    </div>
  );
}

/** Neutral chart shapes: varied bars, a muted plot area, or a ring. */
const BARS = [0.45, 0.7, 0.55, 0.9, 0.62, 0.8, 0.5, 0.74, 0.58, 0.86, 0.66, 0.78];

export function ChartSkeleton({ kind = 'bars', height = 220 }: { kind?: 'bars' | 'line' | 'donut'; height?: number }) {
  if (kind === 'donut') {
    return (
      <div className="skCenter" style={{ height }} aria-hidden="true">
        <SkeletonBlock w={Math.min(height, 160)} h={Math.min(height, 160)} circle />
      </div>
    );
  }
  if (kind === 'line') {
    return (
      <div className="skStack" style={{ height }} aria-hidden="true">
        <SkeletonBlock w="100%" h={height - 22} />
        <SkeletonBlock w="100%" h={10} r={5} />
      </div>
    );
  }
  return (
    <div className="skBars" style={{ height }} aria-hidden="true">
      {BARS.map((f, i) => (
        <SkeletonBlock key={i} w="100%" h={Math.round((height - 4) * f)} r={6} />
      ))}
    </div>
  );
}

/**
 * A card with a real title and a skeleton body: the title is static, so it
 * stays. `children` replace the default lines (a table, a definition list).
 */
export function CardSkeleton({ title, lines = 3, children }: { title?: string; lines?: number; children?: ReactNode }) {
  return (
    <section className="card" aria-hidden="true">
      {title && (
        <div className="card__head">
          <h2>{title}</h2>
        </div>
      )}
      {children ?? <SkeletonText lines={lines} />}
    </section>
  );
}

/** The page title block of a screen whose title is the record's own name. */
export function PageHeaderSkeleton({ description = false, actions = 0 }: { description?: boolean; actions?: number }) {
  return (
    <header className="pageHeader" aria-hidden="true">
      <div className="pageHeader__row">
        <span className="skStack">
          <SkeletonBlock w={260} h={32} />
          {description && <SkeletonBlock w={360} h={16} />}
        </span>
        {actions > 0 && (
          <span className="pageHeader__actions">
            {Array.from({ length: actions }, (_, i) => (
              <SkeletonBlock key={i} w={104} h={36} r={10} />
            ))}
          </span>
        )}
      </div>
    </header>
  );
}

/** A tab row whose labels are not known yet (they depend on the record). */
export function TabsSkeleton({ count = 5 }: { count?: number }) {
  const widths = [84, 112, 96, 128, 90, 76];
  return (
    <div className="tabs" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span className="tabs__tab" key={i}>
          <SkeletonBlock w={widths[i % widths.length]} h={18} />
        </span>
      ))}
    </div>
  );
}

/** Label/value pairs in the real `.defList` markup, for a card whose title stays real. */
export function DefinitionListSkeleton({ items = 6 }: { items?: number }) {
  return (
    <dl className="defList" aria-hidden="true">
      {Array.from({ length: items }, (_, i) => (
        <div key={i}>
          <dt>
            <SkeletonBlock w={i % 2 ? '44%' : '58%'} h={12} />
          </dt>
          <dd>
            <SkeletonBlock w={i % 3 ? '70%' : '52%'} h={16} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Media cards (thumbnail, badges, title, summary, actions): the Care Hub shelf. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="chGrid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li className="chCard" key={i}>
          <div className="chThumb">
            <SkeletonBlock w="100%" h="100%" r={0} />
          </div>
          <div className="chCard__body">
            <span className="row" style={{ gap: 'var(--space-sm)' }}>
              <SkeletonBlock w={64} h={22} r={999} />
              <SkeletonBlock w={72} h={22} r={999} />
            </span>
            <SkeletonBlock w="78%" h={16} />
            <SkeletonText lines={2} lineHeight={12} />
            <SkeletonBlock w="36%" h={12} />
          </div>
          <div className="chCard__foot">
            <SkeletonBlock w={140} h={32} r={8} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ----------------------------- lists and detail ---------------------------- */

/** Avatar + two lines + a trailing pill: activity feeds, queues, short lists. */
export function ListSkeleton({ rows = 5, avatar = true, trailing = true }: { rows?: number; avatar?: boolean; trailing?: boolean }) {
  return (
    <div className="skList" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skListRow" key={i}>
          {avatar && <SkeletonBlock w={36} h={36} circle />}
          <span className="skStack skGrow">
            <SkeletonBlock w={i % 2 ? '48%' : '58%'} h={14} />
            <SkeletonBlock w="36%" h={11} />
          </span>
          {trailing && <SkeletonBlock w={72} h={22} r={999} />}
        </div>
      ))}
    </div>
  );
}

/** File rows: icon tile, name, meta, action. */
export function DocumentListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skList" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skListRow" key={i}>
          <SkeletonBlock w={36} h={44} r={6} />
          <span className="skStack skGrow">
            <SkeletonBlock w="52%" h={14} />
            <SkeletonBlock w="30%" h={11} />
          </span>
          <SkeletonBlock w={30} h={30} circle />
        </div>
      ))}
    </div>
  );
}

/**
 * A detail page: an identity header, then `sections` cards of label/value
 * pairs. The shape of a doctor, patient or consultation record.
 */
export function DetailSkeleton({
  sections = 2,
  pairs = 6,
  identity = true,
}: {
  sections?: number;
  pairs?: number;
  /** False when the page header above is already a `PageHeaderSkeleton`. */
  identity?: boolean;
}) {
  return (
    <div className="skDetail" aria-hidden="true">
      {identity && (
        <div className="card skIdentity">
          <SkeletonBlock w={64} h={64} circle />
          <span className="skStack skGrow">
            <SkeletonBlock w="34%" h={20} />
            <SkeletonBlock w="22%" h={12} />
          </span>
          <SkeletonBlock w={92} h={28} r={999} />
        </div>
      )}
      {Array.from({ length: sections }, (_, s) => (
        <section className="card" key={s}>
          <SkeletonBlock w={160} h={16} style={{ marginBottom: 'var(--space-lg)' }} />
          <div className="skPairs">
            {Array.from({ length: pairs }, (_, i) => (
              <span className="skStack" key={i}>
                <SkeletonBlock w="38%" h={10} />
                <SkeletonBlock w={i % 3 ? '62%' : '48%'} h={14} />
              </span>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Values behind real labels. Static labels belong in the screen's own markup. */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="skStack skForm" aria-hidden="true">
      {Array.from({ length: fields }, (_, i) => (
        <span className="skStack" key={i}>
          <SkeletonBlock w="26%" h={10} />
          <SkeletonBlock w="100%" h={40} />
        </span>
      ))}
    </div>
  );
}
