import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import { MomentumIcon } from "./Momentum";
import { ROW_HEIGHT, type Column, type Density, type Row, type Sort, type SortKey } from "./model";

// The table grid: a header row that sticks to the top of the page, a horizontally scrolling body with the
// expand + player columns pinned, and its own scrollbar. The page does the vertical scrolling.

/** how long the scrollbar stays after the last scroll or mouse movement over the table */
const SCROLLBAR_IDLE_MS = 1500;

const num = (x: number | null, digits: number) => (x === null || !Number.isFinite(x) ? "—" : x.toFixed(digits).replace("-", "−"));
const signed = (x: number | null, digits: number) =>
  x === null || !Number.isFinite(x) ? "—" : `${x < 0 ? "−" : "+"}${Math.abs(x).toFixed(digits)}`;

/** how big an ice-time change has to be (minutes per game) before it's highlighted */
export type RoleThresholds = { toi: number; ppToi: number };

// ice-time changes big enough to count as a new role are highlighted, with a trend arrow
const Change = ({ value, digits, threshold }: { value: number | null; digits: number; threshold: number }) => {
  const notable = value !== null && Math.abs(value) >= threshold;
  return (
    <span className={notable ? "bl-num bl-num--warn" : "bl-num"}>
      {notable && <Icon name={value! > 0 ? "trending-up" : "trending-down"} size={12} />}
      {signed(value, digits)}
    </span>
  );
};

const Badges = ({ labels }: { labels: string[] }) => (
  <span className="bl-badges">
    {labels.map((label) => (
      <span key={label} className="bl-badge">
        {label}
      </span>
    ))}
  </span>
);

const cell = (column: Column, r: Row, role: RoleThresholds): ReactNode => {
  switch (column.id) {
    case "fpGp":
      return <span className="bl-num">{num(r.fpGp, 2)}</span>;
    case "expFpGp":
      return <span className="bl-num">{num(r.expFpGp, 2)}</span>;
    case "vsExp":
      return <span className="bl-num bl-num--strong">{signed(r.fpVsExp, 2)}</span>;
    case "vs3y":
      return <span className="bl-num">{signed(r.fpVs3y, 2)}</span>;
    case "toi":
      return <Change value={r.toiVs3y} digits={1} threshold={role.toi} />;
    case "ppToi":
      return <Change value={r.ppToiVs3y} digits={2} threshold={role.ppToi} />;
    case "gp":
      return <span className="bl-num">{r.gp}</span>;
    case "expGA":
      return <span className="bl-num">{`${num(r.expG, 1)} / ${num(r.expA, 1)}`}</span>;
    case "sog60":
      return <span className="bl-num">{num(r.sog60, 1)}</span>;
    case "gxg":
      return <span className="bl-num">{r.gxgTrend}</span>;
    case "cautions":
      return <Badges labels={r.cautions} />;
  }
};

const cellStyle = (c: Column): CSSProperties => (c.id === "cautions" ? { flex: `1 0 ${c.width}px` } : { width: c.width });
const cellClass = (c: Column) => (c.id === "cautions" ? "bl-cell" : "bl-cell bl-cell--number");

type Tip = { title: string; text: string; x: number; y: number };

const HeaderCell = ({
  label,
  sortKey,
  sort,
  tooltip,
  className,
  style,
  onSort,
  onTip,
}: {
  label: string;
  sortKey?: SortKey;
  sort: Sort;
  tooltip?: string;
  className: string;
  style?: CSSProperties;
  onSort: (key: SortKey) => void;
  onTip: (tip: Tip | null) => void;
}) => {
  const active = sortKey !== undefined && sort.key === sortKey;
  const show = (el: HTMLElement) => {
    if (!tooltip) return;
    const box = el.getBoundingClientRect();
    onTip({ title: label, text: tooltip, x: box.left + box.width / 2, y: box.bottom });
  };
  const icon = sortKey && <Icon name={active ? (sort.dir === "asc" ? "arrow-up" : "arrow-down") : "sort"} size={12} />;
  const text = <span className={tooltip ? "bl-header-label bl-header-label--tip" : "bl-header-label"}>{label}</span>;
  const numeric = className.includes("bl-cell--number");
  return (
    <div
      role="columnheader"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
      className={`${className} bl-header-cell`}
      style={style}
    >
      <button
        type="button"
        className={active ? "bl-header-button bl-header-button--active" : "bl-header-button"}
        aria-disabled={!sortKey}
        aria-description={tooltip}
        onClick={() => {
          onTip(null);
          if (sortKey) onSort(sortKey);
        }}
        onMouseEnter={(e) => show(e.currentTarget)}
        onMouseLeave={() => onTip(null)}
        onFocus={(e) => show(e.currentTarget)}
        onBlur={() => onTip(null)}
      >
        {numeric ? (
          <>
            {icon}
            {text}
          </>
        ) : (
          <>
            {text}
            {icon}
          </>
        )}
      </button>
    </div>
  );
};

const RowDetail = ({ row }: { row: Row }) => (
  <div className="bl-detail">
    <span className="bl-detail-title">Highlights</span>
    <div>
      <dl className="bl-stats">
        {row.highlights.map((h) => (
          <div className={`bl-stat bl-stat--${h.trend.toLowerCase()}`} key={h.label}>
            <dt>{h.label}</dt>
            <dd className="bl-stat-value">
              {h.value}
              {h.trend !== "Neutral" && (
                <span className="bl-stat-arrow" aria-label={h.trend === "Up" ? "above" : "below"}>
                  <Icon name={h.trend === "Up" ? "arrow-up" : "arrow-down"} size={12} />
                </span>
              )}
            </dd>
            <dt>{h.refLabel}</dt>
            <dd className="bl-stat-ref">{h.refValue}</dd>
          </div>
        ))}
      </dl>
      {/* shown here even when the Cautions column is turned off */}
      {row.cautions.length > 0 && (
        <div className="bl-detail-cautions">
          <span className="bl-detail-label">Cautions</span>
          <Badges labels={row.cautions} />
        </div>
      )}
      <p className="bl-detail-note">
        Data from{" "}
        <a href="https://moneypuck.com" target="_blank" rel="noopener noreferrer">
          moneypuck.com
        </a>
      </p>
    </div>
  </div>
);

export const PlayerTable = ({
  rows,
  columns,
  sort,
  density,
  role,
  loading,
  updating,
  onSort,
  empty,
  footer,
}: {
  rows: Row[];
  columns: Column[];
  sort: Sort;
  density: Density;
  role: RoleThresholds;
  loading: boolean;
  updating: boolean;
  onSort: (key: SortKey) => void;
  /** shown in place of the rows when there are none */
  empty: ReactNode;
  footer: ReactNode;
}) => {
  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; scroll: number } | null>(null);
  const [scroll, setScroll] = useState({ left: 0, view: 0, total: 0 });
  const [open, setOpen] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [barVisible, setBarVisible] = useState(false);
  const idleTimer = useRef<number | undefined>(undefined);

  // shows the scrollbar and restarts the countdown to fading it out again
  const wakeScrollbar = useCallback(() => {
    setBarVisible(true);
    window.clearTimeout(idleTimer.current);
    const rest = () => {
      // holding the thumb still isn't inactivity
      if (drag.current) idleTimer.current = window.setTimeout(rest, SCROLLBAR_IDLE_MS);
      else setBarVisible(false);
    };
    idleTimer.current = window.setTimeout(rest, SCROLLBAR_IDLE_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(idleTimer.current), []);

  const measure = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;
    const next = { left: body.scrollLeft, view: body.clientWidth, total: body.scrollWidth };
    if (headRef.current && headRef.current.scrollLeft !== next.left) headRef.current.scrollLeft = next.left;
    setScroll((s) => (s.left === next.left && s.view === next.view && s.total === next.total ? s : next));
  }, []);

  useLayoutEffect(measure);
  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (bodyRef.current) observer.observe(bodyRef.current);
    return () => observer.disconnect();
  }, [measure]);

  // the tooltip is pinned to the viewport, so it has to go when the page moves under it
  useEffect(() => {
    if (!tip) return;
    const hide = () => setTip(null);
    window.addEventListener("scroll", hide, { passive: true, once: true });
    return () => window.removeEventListener("scroll", hide);
  }, [tip]);

  const narrow = scroll.view > 0 && scroll.view < 560;
  const expandWidth = narrow ? 40 : 48;
  const playerWidth = narrow ? 168 : 200;
  const pinned = expandWidth + playerWidth;
  const width = pinned + columns.reduce((t, c) => t + c.width, 0);
  const max = Math.max(0, scroll.total - scroll.view);
  // show it briefly when there first turns out to be something to scroll
  const scrollable = max > 0;
  useEffect(() => {
    if (scrollable) wakeScrollbar();
  }, [scrollable, wakeScrollbar]);

  const scrollBy = (direction: 1 | -1) =>
    bodyRef.current?.scrollBy({ left: direction * Math.max(144, (scroll.view - pinned) * 0.8), behavior: "smooth" });

  // thumb position and size, as percentages of the track
  const thumb = scroll.total > 0 ? Math.max(10, (scroll.view / scroll.total) * 100) : 100;
  const thumbLeft = max > 0 ? (scroll.left / max) * (100 - thumb) : 0;

  const startDrag = (e: PointerEvent<HTMLDivElement>) => {
    const body = bodyRef.current;
    const bar = barRef.current;
    if (!body || !bar) return;
    // pressing the track outside the thumb jumps there first
    const box = bar.getBoundingClientRect();
    const at = ((e.clientX - box.left) / box.width) * 100;
    if (at < thumbLeft || at > thumbLeft + thumb) body.scrollLeft = ((at - thumb / 2) / (100 - thumb)) * max;
    drag.current = { x: e.clientX, scroll: body.scrollLeft };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveDrag = (e: PointerEvent<HTMLDivElement>) => {
    const body = bodyRef.current;
    const bar = barRef.current;
    if (!drag.current || !body || !bar) return;
    const travel = bar.clientWidth * (1 - thumb / 100);
    if (travel > 0) body.scrollLeft = drag.current.scroll + ((e.clientX - drag.current.x) / travel) * max;
  };

  const style = {
    "--bl-row": `${ROW_HEIGHT[density]}px`,
    "--bl-expand": `${expandWidth}px`,
    "--bl-player": `${playerWidth}px`,
    "--bl-view": scroll.view ? `${scroll.view}px` : "100%",
  } as CSSProperties;

  const skeleton = Array.from({ length: 12 }, (_, i) => (
    <div className="bl-row bl-row--skeleton" key={i} style={{ minWidth: width }} aria-hidden="true">
      <div className="bl-cell bl-cell--expand bl-pin" />
      <div className="bl-cell bl-cell--player bl-pin">
        <span className="bl-skeleton bl-skeleton--icon" />
        <span className="bl-skeleton-stack">
          <span className="bl-skeleton" style={{ width: 82 }} />
          <span className="bl-skeleton" style={{ width: 48 }} />
        </span>
      </div>
      {columns.map((c) => (
        <div className={cellClass(c)} style={cellStyle(c)} key={c.id}>
          <span className="bl-skeleton" style={{ width: 42 }} />
        </div>
      ))}
    </div>
  ));

  return (
    <div
      className={`bl-grid bl-grid--${density}`}
      style={style}
      role="table"
      aria-label="Buy low and sell high players"
      aria-busy={loading || updating}
      onPointerMove={wakeScrollbar}
    >
      <div className="bl-head">
        <div
          className="bl-head-scroller"
          ref={headRef}
          // tabbing to an off-screen header scrolls the header alone; bring the body along
          onScroll={(e) => {
            const body = bodyRef.current;
            if (body && Math.abs(body.scrollLeft - e.currentTarget.scrollLeft) > 1) body.scrollLeft = e.currentTarget.scrollLeft;
          }}
        >
          <div className="bl-row bl-row--head" role="row" style={{ minWidth: width }}>
            <div className="bl-cell bl-cell--expand bl-pin" role="columnheader" aria-label="Details" />
            <HeaderCell label="Player" sortKey="name" sort={sort} className="bl-cell bl-cell--player bl-pin" onSort={onSort} onTip={setTip} />
            {columns.map((c) => (
              <HeaderCell
                key={c.id}
                label={c.label}
                sortKey={c.sort ? c.id : undefined}
                sort={sort}
                tooltip={c.tooltip}
                className={cellClass(c)}
                style={cellStyle(c)}
                onSort={onSort}
                onTip={setTip}
              />
            ))}
          </div>
        </div>
        {scroll.left > 1 && (
          <button type="button" className="bl-hint bl-hint--left" aria-label="Scroll columns left" onClick={() => scrollBy(-1)}>
            <Icon name="chevron-left" />
          </button>
        )}
        {scroll.left < max - 1 && (
          <button type="button" className="bl-hint bl-hint--right" aria-label="Scroll columns right" onClick={() => scrollBy(1)}>
            <Icon name="chevron-right" />
          </button>
        )}
        {(loading || updating) && <div className="bl-progress" role="progressbar" aria-label="Loading" />}
      </div>

      <div className="bl-body-wrap">
        <div
          className="bl-body"
          ref={bodyRef}
          onScroll={() => {
            measure();
            wakeScrollbar();
          }}
        >
          <div className={updating ? "bl-rows bl-rows--updating" : "bl-rows"} style={{ minWidth: rows.length || loading ? width : undefined }} role="rowgroup">
            {loading
              ? skeleton
              : rows.map((r) => {
                  const expanded = open.includes(r.key);
                  return (
                    <div key={r.key} role="presentation">
                      <div
                        role="row"
                        aria-selected={selected === r.key}
                        className={selected === r.key ? "bl-row bl-row--body bl-row--selected" : "bl-row bl-row--body"}
                        onClick={() => setSelected((s) => (s === r.key ? null : r.key))}
                      >
                        <div className="bl-cell bl-cell--expand bl-pin" role="cell">
                          <button
                            type="button"
                            className="bl-expand"
                            aria-expanded={expanded}
                            aria-label={`${expanded ? "Hide" : "Show"} highlights for ${r.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpen((o) => (expanded ? o.filter((k) => k !== r.key) : [...o, r.key]));
                            }}
                          >
                            <Icon name={expanded ? "chevron-down" : "chevron-right"} />
                          </button>
                        </div>
                        <div className="bl-cell bl-cell--player bl-pin" role="rowheader">
                          <MomentumIcon momentum={r.momentum} label={`${r.momentum} · ${r.verdict}`} />
                          <span className="bl-name">
                            <span className="bl-name-main">{r.name}</span>
                            <span className="bl-name-meta">
                              {r.team} · {r.pos} · {r.age}
                            </span>
                          </span>
                        </div>
                        {columns.map((c) => (
                          <div className={cellClass(c)} style={cellStyle(c)} key={c.id} role="cell">
                            {cell(c, r, role)}
                          </div>
                        ))}
                      </div>
                      {expanded && <RowDetail row={r} />}
                    </div>
                  );
                })}
          </div>
          {!loading && rows.length === 0 && empty}
        </div>
        {scroll.left > 1 && <div className="bl-fade bl-fade--left" aria-hidden="true" />}
        {scroll.left < max - 1 && <div className="bl-fade bl-fade--right" aria-hidden="true" />}
      </div>

      {max > 0 && (
        <div
          className={barVisible ? "bl-scrollbar bl-scrollbar--visible" : "bl-scrollbar"}
          ref={barRef}
          aria-hidden="true"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          <div className="bl-scrollbar-thumb" style={{ width: `${thumb}%`, left: `${thumbLeft}%` }} />
        </div>
      )}

      {footer}

      {tip &&
        createPortal(
          <div className="bl-tokens bl-tooltip" role="tooltip" style={{ left: Math.min(Math.max(tip.x, 132), window.innerWidth - 132), top: tip.y }}>
            <strong>{tip.title}</strong>
            <span>{tip.text}</span>
          </div>,
          document.body,
        )}
    </div>
  );
};
