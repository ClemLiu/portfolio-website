import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icons";
import {
  COLUMNS,
  DEFAULT_COLUMNS,
  DENSITIES,
  MOMENTUM,
  NO_FILTERS,
  POSITIONS,
  RANGES,
  STATS,
  positionSelected,
  toggleMomentum,
  togglePosition,
  type ColumnId,
  type Density,
  type Filters,
} from "./model";
import { YAHOO_DEFAULT, type DateRange, type StatKey, type Weights } from "./rescore.js";

// The two side panels from the design: Filters (with the column picker at the bottom) and FP Settings.

const Panel = ({ title, onReset, children }: { title: string; onReset: () => void; children: ReactNode }) => (
  <aside className="bl-panel" aria-label={title}>
    <div className="bl-panel-head">
      <h2 className="bl-panel-title">{title}</h2>
      <button type="button" className="bl-button bl-button--ghost" onClick={onReset}>
        {title === "FP Settings" ? "Reset to Yahoo" : "Reset"}
      </button>
    </div>
    {children}
  </aside>
);

export const Checkbox = ({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
}) => (
  <label className="bl-check">
    <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange ?? (() => {})} />
    <span className="bl-check-box">{checked && <Icon name="check" size={12} />}</span>
    <span>{label}</span>
  </label>
);

// The tool's one dropdown: a field that opens a menu, closed by picking outside it or pressing Escape.
const Dropdown = ({
  label,
  name,
  className,
  children,
}: {
  label: string;
  /** what it chooses, for screen readers */
  name: string;
  className?: string;
  children: (close: () => void) => ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    // the focused option is about to disappear
    field.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const escape = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className={className ? `bl-select ${className}` : "bl-select"} ref={ref}>
      <button
        ref={field}
        type="button"
        className="bl-select-field"
        aria-expanded={open}
        aria-label={`${name}: ${label}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{label}</span>
        <Icon name="chevron-down" />
      </button>
      {open && <div className="bl-menu">{children(close)}</div>}
    </div>
  );
};

const TeamsSelect = ({ teams, selected, onChange }: { teams: string[]; selected: string[]; onChange: (t: string[]) => void }) => {
  const label = selected.length === 0 ? "All teams" : selected.length <= 3 ? selected.join(", ") : `${selected.length} teams`;

  return (
    <Dropdown name="Teams" label={label}>
      {() => (
        <>
          <Checkbox label="All teams" checked={selected.length === 0} onChange={() => onChange([])} />
          <div className="bl-menu-divider" />
          {teams.map((t) => (
            <Checkbox
              key={t}
              label={t}
              checked={selected.includes(t)}
              onChange={() => onChange(selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t].sort())}
            />
          ))}
        </>
      )}
    </Dropdown>
  );
};

/** rows per page: the same dropdown, picking one value; it opens upward because it sits at the bottom of the table */
export const PerPageSelect = ({ options, value, onChange }: { options: number[]; value: number; onChange: (n: number) => void }) => (
  <Dropdown name="Rows per page" label={`${value} per page`} className="bl-per-page">
    {(close) =>
      options.map((n) => (
        <button
          key={n}
          type="button"
          className="bl-menu-item"
          aria-pressed={n === value}
          onClick={() => {
            onChange(n);
            close();
          }}
        >
          <span>{n} per page</span>
          {n === value && <Icon name="check" />}
        </button>
      ))
    }
  </Dropdown>
);

// The bottom of the Filters panel: which columns the table shows, and how tall its rows are.
const ColumnsSection = ({
  columns,
  density,
  onChange,
}: {
  columns: ColumnId[];
  density: Density;
  onChange: (next: { columns?: ColumnId[]; density?: Density }) => void;
}) => {
  const box = (id: ColumnId, label: string) => (
    <Checkbox
      key={id}
      label={label}
      checked={columns.includes(id)}
      onChange={() => onChange({ columns: COLUMNS.map((c) => c.id).filter((c) => (c === id ? !columns.includes(id) : columns.includes(c))) })}
    />
  );
  // the "Shown" / "More" labels only matter when there are optional columns to set apart
  const hasMore = COLUMNS.some((c) => !c.standard);
  return (
    <>
      <div className="bl-panel-divider" />
      <h2 className="bl-panel-title">Columns</h2>
      {hasMore && <h3 className="bl-overline">Shown</h3>}
      <Checkbox label="Player" checked disabled />
      {COLUMNS.filter((c) => c.standard).map((c) => box(c.id, c.label))}
      {hasMore && (
        <>
          <h3 className="bl-overline">More</h3>
          {COLUMNS.filter((c) => !c.standard).map((c) => box(c.id, c.label))}
        </>
      )}
      <div className="bl-panel-divider" />
      <h2 className="bl-panel-title">Table Density</h2>
      <div className="bl-segmented" role="group" aria-label="Row density">
        {DENSITIES.map((d) => (
          <button key={d} type="button" aria-pressed={density === d} onClick={() => onChange({ density: d })}>
            {d === "default" ? "Default" : d === "compact" ? "Compact" : "Roomy"}
          </button>
        ))}
      </div>
    </>
  );
};

/** a data date (YYYYMMDD) as "Nov 24"; formatted in UTC so the day can't shift */
const shortDate = (date: string) =>
  new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

// Season, or the last N days, with the dates the stats cover underneath.
const TimeRange = ({
  value,
  ranges,
  through,
  onChange,
}: {
  value: number | null;
  /** the ranges the data offers; undefined while it's still loading */
  ranges?: DateRange[];
  /** date of the latest game, YYYYMMDD */
  through?: string;
  onChange: (days: number | null) => void;
}) => {
  const selected = ranges?.find((r) => r.days === value);
  const caption = selected ? `${shortDate(selected.start)} – ${shortDate(selected.end)}` : value === null && through ? `Through ${shortDate(through)}` : "";
  return (
    <div className="bl-field">
      <span className="bl-field-label">Time range</span>
      <div className="bl-segmented" role="group" aria-label="Time range">
        {[null, ...RANGES].map((days) => {
          const range = ranges?.find((r) => r.days === days);
          const missing = days !== null && ranges !== undefined && !range;
          return (
            <button
              key={days ?? "season"}
              type="button"
              aria-pressed={value === days}
              disabled={missing}
              title={
                missing
                  ? "Not enough games played yet"
                  : days === null
                    ? "The whole season"
                    : range && `The last ${days} days: players with ${range.minGp} or more games in them`
              }
              onClick={() => onChange(days)}
            >
              {days === null ? "Season" : `${days}D`}
            </button>
          );
        })}
      </div>
      {caption && <span className="bl-caption">{caption}</span>}
    </div>
  );
};

export const FiltersPanel = ({
  filters,
  teams,
  ranges,
  through,
  columns,
  density,
  onChange,
}: {
  filters: Filters;
  teams: string[];
  ranges?: DateRange[];
  through?: string;
  columns: ColumnId[];
  density: Density;
  onChange: (next: { filters?: Filters; columns?: ColumnId[]; density?: Density }) => void;
}) => {
  const setFilters = (next: Partial<Filters>) => onChange({ filters: { ...filters, ...next } });
  return (
    // Reset covers the whole panel: filters, columns and density
    <Panel title="Filters" onReset={() => onChange({ filters: NO_FILTERS, columns: DEFAULT_COLUMNS, density: "default" })}>
      <label className="bl-search">
        <Icon name="search" />
        <input
          type="search"
          value={filters.q}
          placeholder="Search players…"
          aria-label="Search players"
          onChange={(e) => setFilters({ q: e.target.value })}
        />
      </label>

      <TimeRange value={filters.days} ranges={ranges} through={through} onChange={(days) => setFilters({ days })} />

      <div className="bl-field">
        <span className="bl-field-label">Position</span>
        <div className="bl-chips bl-chips--even" role="group" aria-label="Position">
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              className="bl-chip"
              aria-pressed={positionSelected(filters.pos, p)}
              onClick={() => setFilters({ pos: togglePosition(filters.pos, p) })}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="bl-field">
        <span className="bl-field-label">Teams</span>
        <TeamsSelect teams={teams} selected={filters.teams} onChange={(t) => setFilters({ teams: t })} />
      </div>

      <div className="bl-field">
        <span className="bl-field-label">Momentum</span>
        <div className="bl-chips" role="group" aria-label="Momentum">
          <button type="button" className="bl-chip" aria-pressed={!filters.momentum.length} onClick={() => setFilters({ momentum: [] })}>
            All
          </button>
          {MOMENTUM.map((m) => (
            <button
              key={m}
              type="button"
              className="bl-chip"
              // "All" lights up every level with it
              aria-pressed={!filters.momentum.length || filters.momentum.includes(m)}
              onClick={() => setFilters({ momentum: toggleMomentum(filters.momentum, m) })}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <ColumnsSection columns={columns} density={density} onChange={onChange} />
    </Panel>
  );
};

// Keeps what's typed ("", "-", "0.") while only passing complete numbers on.
const PointsInput = ({ value, label, onChange }: { value: number; label: string; onChange: (n: number) => void }) => {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((t) => (t.trim() !== "" && Number(t) === value ? t : String(value)));
  }, [value]);
  return (
    <input
      className="bl-points"
      type="text"
      inputMode="decimal"
      value={text}
      aria-label={`${label} points`}
      onChange={(e) => {
        const next = e.target.value.replace(",", ".");
        if (!/^-?\d*\.?\d*$/.test(next)) return;
        setText(next);
        if (next !== "" && Number.isFinite(Number(next))) onChange(Number(next));
      }}
      // an empty field counts as 0
      onBlur={() => {
        const n = Number.isFinite(Number(text)) ? Number(text) : 0;
        setText(String(n));
        onChange(n);
      }}
    />
  );
};

/** in the design, but the data doesn't carry them yet */
const UPCOMING = [
  { label: "Shorthanded pts", abbr: "SHP" },
  { label: "Plus/minus", abbr: "+/-" },
  { label: "Faceoffs won", abbr: "FW" },
  { label: "Faceoffs lost", abbr: "FL" },
];

export const ScoringPanel = ({ weights, onChange }: { weights: Weights; onChange: (w: Weights) => void }) => {
  const row = (key: StatKey) => {
    const stat = STATS.find((s) => s.key === key)!;
    return (
      <div className="bl-stat-weight" key={key}>
        <span className="bl-stat-name">{stat.label}</span>
        <span className="bl-stat-abbr">{stat.abbr}</span>
        <PointsInput value={weights[key]} label={stat.label} onChange={(n) => n !== weights[key] && onChange({ ...weights, [key]: n })} />
      </div>
    );
  };
  return (
    <Panel title="FP Settings" onReset={() => onChange({ ...YAHOO_DEFAULT })}>
      <p className="bl-panel-intro">Points per stat, preset to Yahoo's default scoring. Use 0 for stats you don't score.</p>
      <h3 className="bl-overline">Scoring</h3>
      {(["g", "a", "ppp"] as StatKey[]).map(row)}
      <h3 className="bl-overline">Peripherals</h3>
      {(["sog", "hit", "blk", "pim"] as StatKey[]).map(row)}
      <h3 className="bl-overline">Coming soon</h3>
      <p className="bl-panel-intro">These aren't in the data yet, so they don't count.</p>
      {UPCOMING.map((s) => (
        <div className="bl-stat-weight bl-stat-weight--off" key={s.abbr}>
          <span className="bl-stat-name">{s.label}</span>
          <span className="bl-stat-abbr">{s.abbr}</span>
          <input className="bl-points" disabled value="—" aria-label={`${s.label} points (not available yet)`} />
        </div>
      ))}
    </Panel>
  );
};
