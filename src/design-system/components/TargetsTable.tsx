import { useEffect, useMemo, useState } from "react";
import type { FocusEvent, PointerEvent } from "react";
import { createPortal } from "react-dom";
import { columns, dividerAfter, rows, SCORE_COL, TOTAL_WIDTH } from "../data/targets";

type SortState = { col: number; dir: "asc" | "desc" };
type Filter = "all" | "Buy" | "Sell";

const TIP_ID = "tt-tip";
const TIP_WIDTH = 280;
const PAGE_SIZE = 20;
// starts sorted by SCORE, highest first (as the Figma prototype starts sorted by TARGET)
const DEFAULT_SORT: SortState = { col: SCORE_COL, dir: "desc" };

type Density = "medium" | "small";
// Row heights from the design: small is the original 32px, medium is 36px. The icons are Google's
// Material Symbols "density_medium" and "density_small" (Outlined, 400 weight, 24px).
const DENSITIES: { value: Density; label: string; rowHeight: number; iconPath: string }[] = [
  { value: "medium", label: "Medium", rowHeight: 36, iconPath: "M120-120v-80h720v80H120Zm0-320v-80h720v80H120Zm0-320v-80h720v80H120Z" },
  { value: "small", label: "Small", rowHeight: 32, iconPath: "M120-80v-80h720v80H120Zm0-240v-80h720v80H120Zm0-240v-80h720v80H120Zm0-240v-80h720v80H120Z" },
];

const countOf = (side: "Buy" | "Sell") => rows.filter((r) => r.side === side).length;
const FILTERS: { value: Filter; label: string; count: number }[] = [
  { value: "all", label: "All", count: rows.length },
  { value: "Buy", label: "Buy Low", count: countOf("Buy") },
  { value: "Sell", label: "Sell High", count: countOf("Sell") },
];

// marks header labels that have a description (shown in the tooltip)
const DOTTED_UNDERLINE = {
  textDecoration: "underline dotted",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

const DIVIDER = "1px dashed #e0e0e0";

// Cell padding, from the design's auto-layout: every cell has 8px either side. The extra 4px "start padding" is
// visible on the first column and on each column right after a dashed divider, the extra 4px "end padding" on the
// last column, and right-aligned header cells use 4px on the right (the sort icon sits there).
const START_PADDED = new Set([0, ...dividerAfter.map((i) => i + 1)]);
const LAST_COL = columns.length - 1;
const cellPadding = (i: number, align: "left" | "right", header: boolean) => {
  const left = 8 + (START_PADDED.has(i) ? 4 : 0);
  const right = header && align === "right" ? 4 : 8 + (i === LAST_COL ? 4 : 0);
  return `0 ${right}px 0 ${left}px`;
};
// the design's "State=Selected" row: a #242424 fill (with the dashed lines on top when also hovered)
const SELECTED_FILL = "#242424";
const ROW_BORDER = "1px solid #242424";

// "—" (no data) and anything unparseable sorts last, in either direction
const toNumber = (s: string) => {
  const n = parseFloat(s.replace("+", ""));
  return Number.isNaN(n) ? null : n;
};

const heatBackground = (level: number | undefined) => {
  if (!level) return undefined;
  const alpha = Math.abs(level) / 200;
  return level > 0 ? `rgba(0, 110, 196, ${alpha})` : `rgba(244, 63, 94, ${alpha})`;
};

const SortCaret = ({ dir }: { dir: "asc" | "desc" }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {dir === "desc" ? <path d="M3 4.5 6 7.5 9 4.5" /> : <path d="M3 7.5 6 4.5 9 7.5" />}
  </svg>
);

const pageButtonStyle = (state: "idle" | "active" | "disabled") =>
  ({
    boxSizing: "border-box",
    minWidth: 28,
    height: 28,
    padding: "0 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    border: "1px solid #242424",
    background: state === "active" ? "#e0e0e0" : "transparent",
    color: state === "active" ? "#171717" : "#e0e0e0",
    opacity: state === "disabled" ? 0.4 : 1,
    cursor: state === "disabled" ? "default" : "pointer",
    fontSize: 12,
    fontFamily: "inherit",
    fontVariantNumeric: "tabular-nums",
  }) as const;

// The PLAYER column stays pinned while the rest scrolls sideways. It needs an
// opaque background so scrolled cells don't show through, and an edge line +
// shadow (only once something has scrolled under it) to separate it.
const stickyFirst = (i: number, scrolled: boolean, selected = false) =>
  i === 0
    ? ({
        position: "sticky",
        left: 0,
        background: selected ? SELECTED_FILL : "#171717",
        borderRight: scrolled ? "1px solid #333333" : undefined,
        boxShadow: scrolled ? "4px 0 8px -4px rgba(0, 0, 0, 0.7)" : undefined,
      } as const)
    : undefined;

// Native rebuild of the "Buy-low targets" Figma prototype, showing the buy-low
// and sell-high lists together: filter by side at the top, click a numeric
// column header to sort (descending first, then toggles), hover a row for the
// dashed highlight, hover or click a dotted header for its description.
export const TargetsTable = () => {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(0);
  const [density, setDensity] = useState<Density>("small");
  // clicked rows, by player name; kept across sorting, filtering and paging
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [scrolled, setScrolled] = useState(false);
  // header tooltip: opens on hover and keyboard focus, and on click/tap (which
  // is the only way to get it on touch); `left`/`top` are viewport coordinates
  const [tip, setTip] = useState<{ col: number; left: number; top: number } | null>(null);

  const openTip = (col: number, trigger: HTMLElement) => {
    const label = trigger.getBoundingClientRect();
    const cell = (trigger.closest("[role=columnheader]") ?? trigger).getBoundingClientRect();
    setTip({ col, left: label.left, top: cell.bottom + 4 });
  };
  const closeTip = () => setTip(null);

  useEffect(() => {
    if (!tip) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTip(null);
    };
    // iOS doesn't blur buttons on outside taps, so also close on any press elsewhere
    const onPress = (e: Event) => {
      if (!(e.target as HTMLElement).closest?.("[data-tt-tip-trigger]")) setTip(null);
    };
    // the tooltip is position: fixed, so it would detach from its header if anything scrolled
    const onScroll = () => setTip(null);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPress);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPress);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [tip]);

  const sorted = useMemo(() => {
    const { col, dir } = sort;
    const factor = dir === "desc" ? -1 : 1;
    return rows.filter((r) => filter === "all" || r.side === filter).sort((a, b) => {
      const x = toNumber(a.cells[col]);
      const y = toNumber(b.cells[col]);
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return (x - y) * factor;
    });
  }, [filter, sort]);

  const handleSort = (col: number) => {
    setSort((s) => (s.col === col ? { col, dir: s.dir === "desc" ? "asc" : "desc" } : { col, dir: "desc" }));
    // a new order means the top of the list is what you want to see
    setPage(0);
  };

  const toggleRow = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(name)) next.add(name);
      return next;
    });
  };

  const switchFilter = (next: Filter) => {
    if (next === filter) return;
    setFilter(next);
    setPage(0);
    setTip(null);
  };

  const rowHeight = DENSITIES.find((d) => d.value === density)!.rowHeight;
  const pageCount = Math.ceil(sorted.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const visible = sorted.slice(start, start + PAGE_SIZE);

  return (
    <div style={{ background: "#171717", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px", borderBottom: ROW_BORDER }}>
        <div role="group" aria-label="Show" style={{ display: "inline-flex", gap: 2, padding: 2, border: "1px solid #242424", borderRadius: 8 }}>
          {FILTERS.map((f) => {
            const on = f.value === filter;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => switchFilter(f.value)}
                aria-pressed={on}
                className="focus-visible:outline-2 focus-visible:outline-accent"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 36,
                  padding: "0 12px",
                  border: 0,
                  borderRadius: 6,
                  background: on ? "#e0e0e0" : "transparent",
                  color: on ? "#171717" : "#e0e0e0",
                  cursor: on ? "default" : "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {f.label}
                <span style={{ fontWeight: 400, opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>{f.count}</span>
              </button>
            );
          })}
        </div>

        <div role="group" aria-label="Row density" style={{ display: "inline-flex", gap: 2, padding: 2, border: "1px solid #242424", borderRadius: 8 }}>
          {DENSITIES.map((d) => {
            const on = d.value === density;
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => setDensity(d.value)}
                aria-pressed={on}
                aria-label={`${d.label} density, ${d.rowHeight}px rows`}
                title={`${d.label} density (${d.rowHeight}px rows)`}
                className="focus-visible:outline-2 focus-visible:outline-accent"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  padding: 0,
                  border: 0,
                  borderRadius: 6,
                  background: on ? "#e0e0e0" : "transparent",
                  color: on ? "#171717" : "#e0e0e0",
                  cursor: on ? "default" : "pointer",
                }}
              >
                <svg width="12" height="12" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
                  <path d={d.iconPath} />
                </svg>
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="region"
        aria-label="Buy low and sell high targets table, scrollable"
        tabIndex={0}
        style={{ overflowX: "auto" }}
        onScroll={(e) => setScrolled(e.currentTarget.scrollLeft > 0)}
      >
        <div role="table" aria-label="Buy low and sell high targets" style={{ width: TOTAL_WIDTH }}>
          <div role="rowgroup" style={{ position: "sticky", top: 0, zIndex: 2, background: "#171717" }}>
            <div role="row" style={{ display: "flex", height: rowHeight }}>
              {columns.map((c, i) => {
                const active = sort.col === i;
                const labelStyle = {
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  color: active ? "#e0e0e0" : "#888888",
                } as const;
                return (
                  <div
                    key={c.label}
                    role="columnheader"
                    aria-sort={active ? (sort.dir === "desc" ? "descending" : "ascending") : c.sortable ? "none" : undefined}
                    style={{
                      boxSizing: "border-box",
                      width: c.width,
                      flexShrink: 0,
                      borderBottom: ROW_BORDER,
                      borderRight: dividerAfter.includes(i) ? DIVIDER : undefined,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: c.align === "right" ? "flex-end" : "flex-start",
                      padding: cellPadding(i, c.align, true),
                      ...stickyFirst(i, scrolled),
                    }}
                  >
                    {c.sortable || c.description ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          if (c.sortable) handleSort(i);
                          if (c.description) openTip(i, e.currentTarget);
                        }}
                        className="focus-visible:outline-2 focus-visible:outline-accent"
                        style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: 0, padding: 0, cursor: c.sortable ? "pointer" : "help", whiteSpace: "nowrap", ...labelStyle }}
                        {...(c.description
                          ? {
                              "data-tt-tip-trigger": "",
                              "aria-describedby": tip?.col === i ? TIP_ID : undefined,
                              onPointerEnter: (e: PointerEvent<HTMLButtonElement>) => e.pointerType === "mouse" && openTip(i, e.currentTarget),
                              onPointerLeave: (e: PointerEvent<HTMLButtonElement>) => e.pointerType === "mouse" && closeTip(),
                              onFocus: (e: FocusEvent<HTMLButtonElement>) => openTip(i, e.currentTarget),
                              onBlur: closeTip,
                            }
                          : {})}
                      >
                        <span style={c.description ? DOTTED_UNDERLINE : undefined}>{c.label}</span>
                        {active && <SortCaret dir={sort.dir} />}
                      </button>
                    ) : (
                      <span style={{ whiteSpace: "nowrap", ...labelStyle }}>{c.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div role="rowgroup">
            {visible.map((row) => {
              const isSelected = selected.has(row.cells[0]);
              return (
                <div
                  key={row.cells[0]}
                  role="row"
                  className="tt-row focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={() => toggleRow(row.cells[0])}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleRow(row.cells[0]);
                    }
                  }}
                  style={{ position: "relative", display: "flex", height: rowHeight, cursor: "pointer", background: isSelected ? SELECTED_FILL : undefined }}
                >
                  {row.cells.map((text, i) => {
                    const c = columns[i];
                    return (
                      <div
                        key={c.label}
                        role="cell"
                        style={{
                          boxSizing: "border-box",
                          width: c.width,
                          flexShrink: 0,
                          borderBottom: ROW_BORDER,
                          borderRight: dividerAfter.includes(i) ? DIVIDER : undefined,
                          background: heatBackground(row.heat[i]),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: c.align === "right" ? "flex-end" : "flex-start",
                          padding: cellPadding(i, c.align, false),
                          color: "#e0e0e0",
                          fontSize: 12,
                          fontVariantNumeric: "tabular-nums",
                          whiteSpace: "nowrap",
                          ...stickyFirst(i, scrolled, isSelected),
                        }}
                      >
                        {text}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <nav
        aria-label="Table pages"
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px", borderTop: ROW_BORDER }}
      >
        <span style={{ fontSize: 12, color: "#888888", fontVariantNumeric: "tabular-nums" }}>
          Showing {start + 1}–{start + visible.length} of {sorted.length}
          {selected.size > 0 && ` · ${selected.size} selected`}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Previous page"
            style={pageButtonStyle(page === 0 ? "disabled" : "idle")}
          >
            ‹
          </button>
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              aria-label={`Page ${i + 1}`}
              aria-current={i === page ? "page" : undefined}
              style={pageButtonStyle(i === page ? "active" : "idle")}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page === pageCount - 1}
            aria-label="Next page"
            style={pageButtonStyle(page === pageCount - 1 ? "disabled" : "idle")}
          >
            ›
          </button>
        </div>
      </nav>

      {tip &&
        createPortal(
          <div
            id={TIP_ID}
            role="tooltip"
            style={{
              position: "fixed",
              top: tip.top,
              left: Math.max(8, Math.min(tip.left, window.innerWidth - TIP_WIDTH - 8)),
              width: TIP_WIDTH,
              zIndex: 60,
              boxSizing: "border-box",
              padding: "10px 12px",
              background: "#0f0f0f",
              border: "1px solid #333333",
              borderRadius: 6,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
              color: "#e0e0e0",
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              fontSize: 12,
              lineHeight: 1.5,
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.5px", color: "#888888", marginBottom: 4 }}>
              {columns[tip.col].label}
            </div>
            {columns[tip.col].description}
          </div>,
          document.body,
        )}
    </div>
  );
};
