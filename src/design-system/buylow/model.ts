import { YAHOO_DEFAULT, type ListedRow, type PlayersData, type StatKey, type Weights } from "./rescore.js";

// Everything the visitor can change, how it's kept in the page URL, and how rows are filtered and sorted.

/** a listed player plus the extra values behind the optional columns */
export type Row = ListedRow & { key: string; expG: number; expA: number; sog60: number; gxgTrend: string };

export const POSITIONS = ["F", "C", "L", "R", "D"] as const;
/** F is a shortcut for the three forward positions; it's never stored in the filters itself */
export const FORWARDS = ["C", "L", "R"];
export const MOMENTUM = ["Frozen", "Very cold", "Cold", "Hot", "Very hot", "On fire"];
/** the Last N games choices, besides "All" */
export const GAMES = [5, 10, 15, 20];
export const DENSITIES = ["compact", "default", "comfortable"] as const;
export type Density = (typeof DENSITIES)[number];
export const ROW_HEIGHT: Record<Density, number> = { compact: 32, default: 40, comfortable: 48 };

export type ColumnId = "fpGp" | "expFpGp" | "vsExp" | "vs3y" | "toi" | "ppToi" | "gp" | "expGA" | "sog60" | "gxg" | "cautions";

export type Column = {
  id: ColumnId;
  label: string;
  width: number;
  /** shown unless the visitor turns it off ("Shown" in the panel's Columns section); the rest are under "More" */
  standard: boolean;
  /** what it sorts by; columns without it aren't sortable */
  sort?: (r: Row) => number | null;
  /** explains the column; gives its header a dotted underline */
  tooltip?: string;
};

/** the optional ("More") columns are switched off for now; set this to true to offer them again */
const OFFER_MORE_COLUMNS = false;

/** in table order; cautions stays last because it stretches to fill the row */
const ALL_COLUMNS: Column[] = [
  { id: "gp", label: "GP", width: 64, standard: true, sort: (r) => r.gp },
  { id: "fpGp", label: "FP/GP", width: 96, standard: true, sort: (r) => r.fpGp },
  { id: "expFpGp", label: "Exp FP/GP", width: 128, standard: true, sort: (r) => r.expFpGp },
  {
    id: "vsExp",
    label: "FP/GP vs exp",
    width: 152,
    standard: true,
    sort: (r) => r.fpVsExp,
    tooltip: "FP/GP minus expected FP/GP. Negative means he's scoring below what his play supports; positive means above it.",
  },
  {
    id: "vs3y",
    label: "FP/GP vs 3Y",
    width: 144,
    standard: true,
    sort: (r) => r.fpVs3y,
    tooltip: "FP/GP in the selected games minus his FP/GP over the last 3 seasons, with your scoring.",
  },
  {
    id: "toi",
    label: "TOI vs 3Y",
    width: 120,
    standard: true,
    sort: (r) => r.toiVs3y,
    tooltip: "Change in minutes per game compared with his 3-year average.",
  },
  {
    id: "ppToi",
    label: "PP TOI vs 3Y",
    width: 144,
    standard: true,
    sort: (r) => r.ppToiVs3y,
    tooltip: "Change in power-play minutes per game compared with his 3-year average.",
  },
  { id: "expGA", label: "Exp G / Exp A", width: 152, standard: false, sort: (r) => r.expG, tooltip: "Expected goals and expected assists in the selected games. Sorts by expected goals." },
  { id: "sog60", label: "SOG/60", width: 112, standard: false, sort: (r) => r.sog60, tooltip: "Shots on goal per 60 minutes." },
  { id: "gxg", label: "G/xG trend", width: 200, standard: false, tooltip: "Goals compared with expected goals in each of the last 3 seasons, oldest first." },
  { id: "cautions", label: "Cautions", width: 328, standard: true },
];

/** the columns the table and the Columns section know about */
export const COLUMNS = ALL_COLUMNS.filter((c) => c.standard || OFFER_MORE_COLUMNS);

export const DEFAULT_COLUMNS: ColumnId[] = COLUMNS.filter((c) => c.standard).map((c) => c.id);

export type SortKey = "name" | ColumnId;
export type Sort = { key: SortKey; dir: "asc" | "desc" };

/** an empty list means no filter, which shows as every chip selected */
export type Filters = {
  /** null is the whole season; otherwise each player's own last N games (re-scored, not just filtered) */
  games: number | null;
  q: string;
  pos: string[];
  teams: string[];
  momentum: string[];
};

export type Settings = {
  weights: Weights;
  filters: Filters;
  sort: Sort;
  columns: ColumnId[];
  density: Density;
};

export const NO_FILTERS: Filters = { games: null, q: "", pos: [], teams: [], momentum: [] };
/** strongest buys first */
export const DEFAULT_SORT: Sort = { key: "vsExp", dir: "asc" };

export const STATS: { key: StatKey; label: string; abbr: string }[] = [
  { key: "g", label: "Goals", abbr: "G" },
  { key: "a", label: "Assists", abbr: "A" },
  { key: "ppp", label: "Power-play pts", abbr: "PPP" },
  { key: "sog", label: "Shots on goal", abbr: "SOG" },
  { key: "hit", label: "Hits", abbr: "HIT" },
  { key: "blk", label: "Blocks", abbr: "BLK" },
  { key: "pim", label: "Penalty minutes", abbr: "PIM" },
];

/** every position there is to pick (F is only a shortcut) */
const EVERY_POSITION: string[] = POSITIONS.filter((p) => p !== "F");

// A list of positions in button order, with F spelled out as the three forwards. Every position and none at all
// both mean "no filter", which is kept as an empty list.
const positions = (picked: string[]) => {
  const next = EVERY_POSITION.filter((p) => picked.includes(p) || (picked.includes("F") && FORWARDS.includes(p)));
  return next.length === EVERY_POSITION.length ? [] : next;
};

/** whether a position's chip is on; with no filter they all are */
export const positionSelected = (pos: string[], p: string) => !pos.length || (p === "F" ? allForwards(pos) : pos.includes(p));

const allForwards = (pos: string[]) => FORWARDS.every((p) => pos.includes(p));

// Chips switch on and off from what's showing: all of them to start with. F switches C, L and R together, and
// switching off the last one brings them all back.
export const togglePosition = (pos: string[], p: string): string[] => {
  const on = pos.length ? pos : EVERY_POSITION;
  if (p !== "F") return positions(on.includes(p) ? on.filter((x) => x !== p) : [...on, p]);
  return positions(allForwards(on) ? on.filter((x) => !FORWARDS.includes(x)) : [...on, "F"]);
};

/** a selection of every level, or of none, is the same as "All" */
const levels = (picked: string[]) => {
  const next = MOMENTUM.filter((m) => picked.includes(m));
  return next.length === MOMENTUM.length ? [] : next;
};

// From "All" (every chip on), picking a level narrows to just that one; after that chips add and remove.
export const toggleMomentum = (momentum: string[], level: string): string[] => {
  if (!momentum.length) return [level];
  return levels(momentum.includes(level) ? momentum.filter((m) => m !== level) : [...momentum, level]);
};

// The URL only carries what differs from the defaults, so shared links stay short.
export const toQuery = (s: Settings): string => {
  const p = new URLSearchParams();
  for (const { key } of STATS) if (s.weights[key] !== YAHOO_DEFAULT[key]) p.set(key, String(s.weights[key]));
  const { games, q, pos, teams, momentum } = s.filters;
  if (games) p.set("games", String(games));
  if (q) p.set("q", q);
  if (pos.length) p.set("pos", pos.join(","));
  if (teams.length) p.set("team", teams.join(","));
  if (momentum.length) p.set("momentum", momentum.join(","));
  if (s.sort.key !== DEFAULT_SORT.key || s.sort.dir !== DEFAULT_SORT.dir) {
    p.set("sort", s.sort.key);
    p.set("dir", s.sort.dir);
  }
  if (s.columns.join(",") !== DEFAULT_COLUMNS.join(",")) p.set("cols", s.columns.join(","));
  if (s.density !== "default") p.set("density", s.density);
  // commas are legal in a query string, and far easier to read than %2C
  return p.toString().replace(/%2C/g, ",");
};

const list = (value: string | null) => (value ? value.split(",").filter(Boolean) : []);

// Anything unrecognised in a link (hand-edited, or from an older version) falls back to the default.
export const fromQuery = (search: string): Settings => {
  const p = new URLSearchParams(search);
  const weights: Weights = { ...YAHOO_DEFAULT };
  for (const { key } of STATS) {
    const raw = p.get(key);
    if (raw !== null && raw.trim() !== "" && Number.isFinite(Number(raw))) weights[key] = Number(raw);
  }
  const sortKey = p.get("sort");
  const sortable = sortKey === "name" || COLUMNS.some((c) => c.id === sortKey && c.sort);
  const games = Number(p.get("games"));
  const cols = p.get("cols");
  const density = p.get("density") as Density;
  return {
    weights,
    filters: {
      games: GAMES.includes(games) ? games : null,
      q: p.get("q") ?? "",
      pos: positions(list(p.get("pos"))),
      teams: list(p.get("team")).filter((x) => /^[A-Z]{3}$/.test(x)),
      momentum: levels(list(p.get("momentum"))),
    },
    sort: sortable ? { key: sortKey as SortKey, dir: p.get("dir") === "desc" ? "desc" : "asc" } : DEFAULT_SORT,
    columns: cols === null ? DEFAULT_COLUMNS : COLUMNS.map((c) => c.id).filter((id) => list(cols).includes(id)),
    density: DENSITIES.includes(density) ? density : "default",
  };
};

export const toRows = (listed: ListedRow[], skaters: PlayersData["players"]): Row[] => {
  const byId = new Map(skaters.map((p) => [p.id, p]));
  return listed.map((r) => {
    const p = byId.get(r.id)!;
    // a player can be listed once as a buy and once as a sell, so the side is part of the key
    return { ...r, key: `${r.id}-${r.side}`, expG: p.exp.g, expA: p.exp.a, sog60: p.sog60, gxgTrend: p.gxgTrend };
  });
};

// accents are ignored, so "stutzle" finds "Stützle"
const plain = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export const filterRows = (rows: Row[], { q, pos, teams, momentum }: Filters): Row[] => {
  const needle = plain(q.trim());
  return rows.filter(
    (r) =>
      (!needle || plain(r.name).includes(needle)) &&
      (!pos.length || pos.includes(r.pos)) &&
      (!teams.length || teams.includes(r.team)) &&
      (!momentum.length || momentum.includes(r.momentum)),
  );
};

export const sortRows = (rows: Row[], { key, dir }: Sort): Row[] => {
  const sign = dir === "asc" ? 1 : -1;
  if (key === "name") return [...rows].sort((a, b) => sign * a.name.localeCompare(b.name));
  const value = COLUMNS.find((c) => c.id === key)?.sort;
  if (!value) return rows;
  // players with no value (no 3-year history) go last either way
  return [...rows].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
    return sign * (x - y);
  });
};
