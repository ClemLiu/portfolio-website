// Types for rescore.js, which is copied unchanged from the data repo.

export type StatKey = "g" | "a" | "pim" | "ppp" | "sog" | "hit" | "blk";
export type Weights = Record<StatKey, number>;

export type Highlight = {
  label: string;
  value: string;
  delta: string;
  caption: string;
  refLabel: string;
  refValue: string;
  trend: "Up" | "Down" | "Neutral";
};

export type ListedRow = {
  id: number;
  name: string;
  team: string;
  pos: "C" | "L" | "R" | "D";
  age: number;
  gp: number;
  side: "Buy" | "Sell";
  verdict: string;
  momentum: string;
  cautions: string[];
  driver: string;
  score: number;
  fpGp: number;
  expFpGp: number;
  fpVsExp: number;
  fpVs3y: number | null;
  fp3y: number | null;
  toiVs3y: number | null;
  ppToiVs3y: number | null;
  highlights: Highlight[];
};

export type Skater = {
  id: number;
  name: string;
  team: string;
  exp: { g: number; a: number; ppp: number };
  sog60: number;
  gxgTrend: string;
};

/** `start` and `end` are dates, YYYYMMDD; players need `minGp` games in the range to be listed */
export type DateRange = { days: number; minGp: number; start: string; end: string };

export type PlayersData = {
  generatedAt: string;
  season: number;
  seasonLabel: string;
  sources: { name: string; url: string; used: string }[];
  defaultScoring: { name: string; weights: Weights };
  model: { role: { toi: number; ppToi: number } };
  /** the date ranges the data offers (last N days); early in a season some are missing */
  ranges?: DateRange[];
  /** date of the latest game, YYYYMMDD */
  gamesThrough?: string;
  players: Skater[];
};

export function rescore(
  data: PlayersData,
  weights?: Partial<Weights>,
  /** days: score the games in the last N days (one of data.ranges) instead of the season */
  options?: { all?: boolean; days?: number | null },
): { weights: Weights; rows: ListedRow[]; players?: Skater[] };

export const YAHOO_DEFAULT: Readonly<Weights>;
export function normaliseWeights(weights: Partial<Weights>): Weights;
